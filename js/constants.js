/** @typedef {import('./tree.js').Vehicle} Vehicle */

export const CLASS_SORT_ORDER = ['spaa', 'lt', 'mt', 'ht', 'td', 'fighter', 'bomber'];

/** @type {Record<string, string>} */
export const PREMIUM_PRICE_BY_RANK = {
  1: '500',
  2: '1000',
  3: '1500',
  4: '3000',
  5: '4600',
  6: '8000',
};

export const PREMIUM_PRICE_HIGH_RANK = '9500';

export const SQUADRON_PRICE_LOW = '3800';
export const SQUADRON_PRICE_HIGH = '6000';
export const SQUADRON_HIGH_RANK_THRESHOLD = 6;

export const PACK_PRICE_BY_MAX_RANK = {
  5: '7500',
  6: '9500',
  7: '11500',
};

export const PACK_DEFAULTS = {
  name: 'Nom du Pack',
  ge: '2000',
  days: '15',
};
