import {
  PACK_DEFAULTS,
  PACK_PRICE_BY_MAX_RANK,
  PREMIUM_PRICE_BY_RANK,
  PREMIUM_PRICE_HIGH_RANK,
  SQUADRON_HIGH_RANK_THRESHOLD,
  SQUADRON_PRICE_HIGH,
  SQUADRON_PRICE_LOW,
} from './constants.js';

/**
 * @typedef {Object} VehiclePriceEntry
 * @property {string} key
 * @property {string} country
 * @property {import('./tree.js').Vehicle} vehicle
 * @property {string} defaultPrice
 */

/**
 * @typedef {Object} PackPriceEntry
 * @property {string} key
 * @property {string} country
 * @property {string} followId
 * @property {import('./tree.js').Vehicle[]} vehicles
 * @property {string} defaultPrice
 * @property {string} defaultName
 * @property {string} defaultGe
 * @property {string} defaultDays
 * @property {string} [chainLabel]
 */

/**
 * @typedef {Object} PackConfig
 * @property {string} name
 * @property {string} price
 * @property {string} ge
 * @property {string} days
 * @property {import('./tree.js').Vehicle[]} vehicles
 */

/**
 * @param {import('./tree.js').Vehicle} vehicle
 */
export function defaultVehiclePrice(vehicle) {
  const rank = Number(vehicle.rank);

  if (vehicle.type === 'squadron') {
    return rank >= SQUADRON_HIGH_RANK_THRESHOLD ? SQUADRON_PRICE_HIGH : SQUADRON_PRICE_LOW;
  }

  if (vehicle.type === 'event') {
    return '';
  }

  if (rank >= 7) return PREMIUM_PRICE_HIGH_RANK;
  return PREMIUM_PRICE_BY_RANK[rank] ?? PREMIUM_PRICE_BY_RANK[1];
}

/**
 * @param {import('./tree.js').Vehicle[]} vehicles
 */
export function defaultPackPrice(vehicles) {
  const maxRank = Math.max(...vehicles.map((v) => Number(v.rank)));
  if (maxRank >= 7) return PACK_PRICE_BY_MAX_RANK[7];
  if (maxRank === 6) return PACK_PRICE_BY_MAX_RANK[6];
  return PACK_PRICE_BY_MAX_RANK[5];
}

/**
 * @param {string} country
 * @param {import('./tree.js').CountryAdditions} additions
 * @returns {{ vehicles: VehiclePriceEntry[], packs: PackPriceEntry[] }}
 */
export function collectPricingNeeds(country, additions) {
  /** @type {VehiclePriceEntry[]} */
  const vehicles = [];
  /** @type {PackPriceEntry[]} */
  const packs = [];

  for (const rank of Object.keys(additions.ranks)) {
    for (const v of additions.ranks[rank]) {
      if (v.type === 'premium' || v.type === 'squadron' || v.type === 'event') {
        vehicles.push({
          key: `${country}::${v.id}`,
          country,
          vehicle: v,
          defaultPrice: defaultVehiclePrice(v),
        });
      }
    }
  }

  for (const draft of additions.packDrafts) {
    const chainLabel = draft.vehicles.map((v) => v.name).join(' → ');
    packs.push({
      key: `${country}::pack::${draft.followId}`,
      country,
      followId: draft.followId,
      vehicles: draft.vehicles,
      defaultPrice: defaultPackPrice(draft.vehicles),
      defaultName: draft.vehicles[0]?.name ?? PACK_DEFAULTS.name,
      defaultGe: PACK_DEFAULTS.ge,
      defaultDays: PACK_DEFAULTS.days,
      chainLabel,
    });
  }

  return { vehicles, packs };
}

/**
 * @param {VehiclePriceEntry[]} vehicleEntries
 * @param {PackPriceEntry[]} packEntries
 */
export function needsPricingDialog(vehicleEntries, packEntries) {
  return vehicleEntries.length > 0 || packEntries.length > 0;
}
