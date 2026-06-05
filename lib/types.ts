export type UserRole = 'driver' | 'mechanic' | 'admin';

export type PanneCategorie =
  | 'flat_tire'
  | 'dead_battery'
  | 'engine_failure'
  | 'towing'
  | 'locked_out'
  | 'other';

export type PanneStatut = 'ouverte' | 'offre_acceptee' | 'en_cours' | 'terminee' | 'annulee';
export type OffreStatut = 'pending' | 'accepted' | 'rejected' | 'expired';
export type InterventionStatut = 'acceptee' | 'en_route' | 'arrivee' | 'en_cours' | 'terminee' | 'annulee';
export type PaiementStatut = 'en_attente' | 'paye' | 'echec' | 'rembourse';
export type PaiementMethode = 'especes' | 'mobile_money' | 'carte';
export type DocType = 'identity' | 'certification' | 'address_proof';
export type DocStatut = 'pending' | 'approved' | 'rejected';
export type VerificationStatus = 'incomplete' | 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
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
  avatar_url: string | null;
  experience_years: number;
  intervention_radius_km: number;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  total_revenue: number;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
  distance_km?: number;
}

export interface Panne {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  categorie: PanneCategorie;
  description: string | null;
  statut: PanneStatut;
  created_at: string;
  updated_at: string;
  distance_km?: number;
  photos?: PannePhoto[];
  driver?: Profile;
}

export interface PannePhoto {
  id: string;
  panne_id: string;
  photo_url: string;
  created_at: string;
}

export interface Offre {
  id: string;
  panne_id: string;
  mechanic_id: string;
  prix: number;
  eta_minutes: number;
  message: string | null;
  statut: OffreStatut;
  created_at: string;
  updated_at: string;
  mechanic?: Mechanic;
}

export interface Intervention {
  id: string;
  panne_id: string;
  offre_id: string;
  mechanic_id: string;
  driver_id: string;
  statut: InterventionStatut;
  montant: number;
  started_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  mechanic?: Mechanic;
  panne?: Panne;
  paiement?: Paiement;
}

export interface Paiement {
  id: string;
  intervention_id: string;
  driver_id: string;
  montant: number;
  methode: PaiementMethode;
  statut: PaiementStatut;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  intervention_id: string;
  reviewer_id: string;
  mechanic_id: string;
  score: number;
  commentaire: string | null;
  created_at: string;
}

export interface MechanicDocument {
  id: string;
  mechanic_id: string;
  type_doc: DocType;
  file_url: string;
  statut: DocStatut;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Legacy types kept for backwards compatibility
export type BreakdownType = PanneCategorie;
export type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'resolved' | 'cancelled';

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
