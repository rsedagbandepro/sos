/*
# Create Nearby Mechanics Function

Creates a database function `nearby_mechanics` that returns all available
mechanics within a given radius of a point, sorted by distance.

Parameters:
- p_latitude (double precision) — search center latitude
- p_longitude (double precision) — search center longitude  
- p_radius_km (double precision, default 50) — search radius in kilometers

Returns: all columns from mechanics table plus distance_km (distance in km)

Uses PostGIS ST_DWithin for efficient spatial lookup with GIST index.
*/

CREATE OR REPLACE FUNCTION nearby_mechanics(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km double precision DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  business_name text,
  phone text,
  specializations text[],
  latitude double precision,
  longitude double precision,
  is_available boolean,
  is_verified boolean,
  rating_avg double precision,
  rating_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  distance_km double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.user_id,
    m.business_name,
    m.phone,
    m.specializations,
    m.latitude,
    m.longitude,
    m.is_available,
    m.is_verified,
    m.rating_avg,
    m.rating_count,
    m.created_at,
    m.updated_at,
    ST_Distance(
      m.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) / 1000.0 AS distance_km
  FROM mechanics m
  WHERE m.is_available = true
    AND ST_DWithin(
      m.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY distance_km ASC;
$$;
