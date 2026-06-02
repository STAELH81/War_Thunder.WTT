const STORAGE_KEY = 'wtt-pricing-v1';

/**
 * @typedef {Object} StoredPricing
 * @property {Record<string, string>} vehicles
 * @property {Record<string, import('./pricing.js').PackConfig>} packs
 */

/**
 * @returns {StoredPricing}
 */
function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { vehicles: {}, packs: {} };
    const data = JSON.parse(raw);
    return {
      vehicles: data.vehicles ?? {},
      packs: data.packs ?? {},
    };
  } catch {
    return { vehicles: {}, packs: {} };
  }
}

/**
 * @param {StoredPricing} data
 */
function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * @param {string} key
 */
export function getStoredVehiclePrice(key) {
  return loadAll().vehicles[key];
}

/**
 * @param {string} key
 */
export function getStoredPackConfig(key) {
  return loadAll().packs[key];
}

/**
 * @param {Record<string, string>} vehiclePrices
 * @param {Record<string, import('./pricing.js').PackConfig>} packConfigs
 */
export function savePricing(vehiclePrices, packConfigs) {
  const data = loadAll();
  Object.assign(data.vehicles, vehiclePrices);
  Object.assign(data.packs, packConfigs);
  saveAll(data);
}

/**
 * @param {import('./pricing.js').VehiclePriceEntry[]} vehicleEntries
 * @param {import('./pricing.js').PackPriceEntry[]} packEntries
 * @returns {{ vehiclePrices: Record<string, string>, packDefaults: Record<string, import('./pricing.js').PackConfig> }}
 */
export function mergeStoredPricing(vehicleEntries, packEntries) {
  const stored = loadAll();
  /** @type {Record<string, string>} */
  const vehiclePrices = {};
  /** @type {Record<string, import('./pricing.js').PackConfig>} */
  const packDefaults = {};

  for (const entry of vehicleEntries) {
    const saved = stored.vehicles[entry.key];
    if (saved) vehiclePrices[entry.key] = saved;
  }

  for (const entry of packEntries) {
    const saved = stored.packs[entry.key];
    if (saved) {
      packDefaults[entry.key] = {
        name: saved.name || entry.defaultName,
        price: saved.price || entry.defaultPrice,
        ge: saved.ge ?? entry.defaultGe,
        days: saved.days ?? entry.defaultDays,
        vehicles: entry.vehicles,
      };
    }
  }

  return { vehiclePrices, packDefaults };
}
