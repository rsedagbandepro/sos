import type { BreakdownType } from '@/lib/types';

export interface BreakdownTypeConfig {
  key: BreakdownType;
  label: string;
  description: string;
}

export const BREAKDOWN_TYPES: BreakdownTypeConfig[] = [
  {
    key: 'flat_tire',
    label: 'Crevaison',
    description: 'Pneu crevé ou endommagé',
  },
  {
    key: 'dead_battery',
    label: 'Batterie à plat',
    description: 'Batterie vide ou déchargée',
  },
  {
    key: 'engine_failure',
    label: 'Panne moteur',
    description: 'Problème moteur ou démarrage',
  },
  {
    key: 'towing',
    label: 'Remorquage',
    description: 'Besoin de remorquage',
  },
  {
    key: 'locked_out',
    label: 'Clés perdues',
    description: 'Clés locked-in ou perdues',
  },
  {
    key: 'other',
    label: 'Autre',
    description: 'Autre type de panne',
  },
];

export const DEFAULT_LOCATION = {
  latitude: 6.3654,
  longitude: 2.4183,
  city: 'Cotonou',
  country: 'Bénin',
};

export const COUNTRY_CODE = '+229';

export const SEARCH_RADIUS_KM = 50;

export const REQUEST_TIMEOUT_MS = 10000;
