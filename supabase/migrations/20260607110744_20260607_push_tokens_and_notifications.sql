-- Push tokens table for storing device tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mechanic_id, token)
);

CREATE INDEX idx_push_tokens_mechanic ON push_tokens(mechanic_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mechanic_manage_own_tokens" ON push_tokens
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
  );

-- Function to notify nearby mechanics when a new panne is created
CREATE OR REPLACE FUNCTION notify_nearby_mechanics_on_panne()
RETURNS TRIGGER AS $$
DECLARE
  nearby_mechanic RECORD;
  notification_payload jsonb;
BEGIN
  -- Only process new open pannes
  IF NEW.statut != 'ouverte' THEN
    RETURN NEW;
  END IF;

  -- Find all available mechanics within 5km
  FOR nearby_mechanic IN
    SELECT 
      m.id AS mechanic_id,
      m.user_id,
      m.business_name,
      m.latitude,
      m.longitude,
      ST_Distance(
        m.location,
        ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography
      ) / 1000.0 AS distance_km
    FROM mechanics m
    WHERE m.is_available = true
      AND m.verification_status = 'approved'
      AND ST_DWithin(
        m.location,
        ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography,
        5000
      )
    ORDER BY distance_km ASC
  LOOP
    -- Insert notification into a queue table for edge function to process
    INSERT INTO notification_queue (mechanic_id, panne_id, distance_km, created_at)
    VALUES (nearby_mechanic.mechanic_id, NEW.id, nearby_mechanic.distance_km, now())
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  panne_id uuid NOT NULL REFERENCES pannes(id) ON DELETE CASCADE,
  distance_km double precision NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mechanic_id, panne_id)
);

CREATE INDEX idx_notification_queue_pending ON notification_queue(mechanic_id) WHERE sent_at IS NULL;
CREATE INDEX idx_notification_queue_created ON notification_queue(created_at DESC);

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mechanic_read_own_notifications" ON notification_queue
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
  );

-- Trigger for new pannes
DROP TRIGGER IF EXISTS trg_notify_nearby_mechanics ON pannes;
CREATE TRIGGER trg_notify_nearby_mechanics
  AFTER INSERT ON pannes
  FOR EACH ROW EXECUTE FUNCTION notify_nearby_mechanics_on_panne();

-- Update intervention_radius_km default to 5km
ALTER TABLE mechanics ALTER COLUMN intervention_radius_km SET DEFAULT 5;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notification_queue TO authenticated;
GRANT SELECT, INSERT, DELETE ON push_tokens TO authenticated;
