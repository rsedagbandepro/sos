export type BreakdownType =
  | 'flat_tire'
  | 'dead_battery'
  | 'engine_failure'
  | 'towing'
  | 'locked_out'
  | 'other';

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'resolved'
  | 'cancelled';

export interface BreakdownRequest {
  id: string;
  driver_phone: string;
  driver_name: string | null;
  latitude: number;
  longitude: number;
  breakdown_type: BreakdownType;
  description: string | null;
  status: RequestStatus;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mechanic {
  id: string;
  user_id: string | null;
  business_name: string | null;
  phone: string;
  specializations: string[];
  latitude: number;
  longitude: number;
  is_available: boolean;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  distance_km?: number;
}

export interface Rating {
  id: string;
  request_id: string;
  mechanic_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface BreakdownPhoto {
  id: string;
  request_id: string;
  photo_url: string;
  created_at: string;
}
