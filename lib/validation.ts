import type { PanneCategorie } from '@/lib/types';

const VALID_CATEGORIES: PanneCategorie[] = [
  'flat_tire', 'dead_battery', 'engine_failure', 'towing', 'locked_out', 'other',
];

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 300;
const MAX_PHONE_LENGTH = 20;
const MIN_PRIX = 100;
const MAX_PRIX = 10_000_000;
const MAX_ETA = 480;

export function sanitizeText(input: string, maxLength: number): string {
  return input.trim().slice(0, maxLength);
}

export function validatePanneInput(params: {
  categorie: PanneCategorie | null;
  description: string;
  phone?: string;
  isGuest: boolean;
  latitude: number;
  longitude: number;
}): string | null {
  const { categorie, description, phone, isGuest, latitude, longitude } = params;

  if (!categorie || !VALID_CATEGORIES.includes(categorie)) {
    return 'Type de panne invalide';
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description trop longue (max ${MAX_DESCRIPTION_LENGTH} caractères)`;
  }

  if (isGuest) {
    if (!phone || phone.trim().length < 8 || phone.trim().length > MAX_PHONE_LENGTH) {
      return 'Numéro de téléphone invalide (8 à 20 chiffres)';
    }
    // Only allow digits, spaces, +, -
    if (!/^[+\d\s\-()]{8,20}$/.test(phone.trim())) {
      return 'Numéro de téléphone invalide';
    }
  }

  if (
    typeof latitude !== 'number' || typeof longitude !== 'number' ||
    isNaN(latitude) || isNaN(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return 'Coordonnées GPS invalides';
  }

  return null;
}

export function validateOffreInput(params: {
  prix: string;
  eta: string;
  message: string;
}): string | null {
  const { prix, eta, message } = params;

  const prixNum = parseFloat(prix);
  if (!prix || isNaN(prixNum) || prixNum < MIN_PRIX || prixNum > MAX_PRIX) {
    return `Prix invalide (entre ${MIN_PRIX} et ${MAX_PRIX.toLocaleString()} FCFA)`;
  }

  const etaNum = parseInt(eta, 10);
  if (!eta || isNaN(etaNum) || etaNum < 1 || etaNum > MAX_ETA) {
    return `Délai invalide (1 à ${MAX_ETA} minutes)`;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return `Message trop long (max ${MAX_MESSAGE_LENGTH} caractères)`;
  }

  return null;
}

export function validateReviewInput(score: number, commentaire: string): string | null {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return 'Note invalide (1 à 5)';
  }
  if (commentaire.length > MAX_DESCRIPTION_LENGTH) {
    return `Commentaire trop long (max ${MAX_DESCRIPTION_LENGTH} caractères)`;
  }
  return null;
}
