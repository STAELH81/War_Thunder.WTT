/**
 * @typedef {Object} Vehicle
 * @property {string|number} id
 * @property {string} name
 * @property {number|string} br
 * @property {number} rank
 * @property {string} [type]
 * @property {string} [classIcon]
 * @property {string|number} [follow]
 */

/**
 * @typedef {Object} TreeData
 * @property {Vehicle[]} vehicleList
 */

/**
 * @typedef {Object} TreeDiff
 * @property {Vehicle[]} added
 * @property {Vehicle[]} removed
 * @property {{ name: string, old: number|string, new: number|string }[]} br
 * @property {{ id: string|number, oldName: string, newName: string }[]} renames
 * @property {{ name: string, old: number|string, new: number|string, br: number|string }[]} rankChanges
 * @property {{ name: string, oldFollow: string|number|null, newFollow: string|number|null, oldClass: string|null, newClass: string|null }[]} moves
 */

/**
 * @typedef {Object} PackDraft
 * @property {string} followId — id racine de la chaîne (clé stable du pack)
 * @property {Vehicle[]} vehicles — véhicules ordonnés racine → suite
 */

/**
 * @typedef {Object} CountryAdditions
 * @property {Record<string, Vehicle[]>} ranks
 * @property {PackDraft[]} packDrafts
 */

/**
 * @param {File} file
 * @returns {Promise<TreeData>}
 */
export async function parseTreeFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error(`JSON invalide : ${file.name}`);
  }

  if (!data || !Array.isArray(data.vehicleList)) {
    throw new Error(`Structure invalide (${file.name}) : "vehicleList" attendu`);
  }

  return data;
}

/**
 * @param {TreeData} data
 * @returns {Map<string|number, Vehicle>}
 */
export function vehicleMap(data) {
  return new Map(data.vehicleList.map((v) => [v.id, v]));
}

/**
 * @param {TreeData} oldData
 * @param {TreeData} newData
 * @returns {TreeDiff}
 */
export function diffTrees(oldData, newData) {
  const oldV = vehicleMap(oldData);
  const newV = vehicleMap(newData);

  /** @type {TreeDiff} */
  const result = {
    added: [],
    removed: [],
    br: [],
    renames: [],
    rankChanges: [],
    moves: [],
  };

  for (const [id, vehicle] of newV) {
    if (!oldV.has(id)) {
      result.added.push(vehicle);
    } else {
      const prev = oldV.get(id);
      if (!prev) continue;

      if (vehicle.name !== prev.name) {
        result.renames.push({
          id,
          oldName: prev.name,
          newName: vehicle.name,
        });
      }

      if (Number(vehicle.rank) !== Number(prev.rank)) {
        result.rankChanges.push({
          name: vehicle.name,
          old: prev.rank,
          new: vehicle.rank,
          br: vehicle.br,
        });
      }

      if (vehicle.br !== prev.br) {
        result.br.push({ name: vehicle.name, old: prev.br, new: vehicle.br });
      }

      const followChanged = idKey(vehicle.follow ?? '') !== idKey(prev.follow ?? '');
      const classChanged = (vehicle.classIcon ?? '') !== (prev.classIcon ?? '');
      if (followChanged || classChanged) {
        result.moves.push({
          name: vehicle.name,
          oldFollow: prev.follow ?? null,
          newFollow: vehicle.follow ?? null,
          oldClass: prev.classIcon ?? null,
          newClass: vehicle.classIcon ?? null,
        });
      }
    }
  }

  for (const [id, vehicle] of oldV) {
    if (!newV.has(id)) result.removed.push(vehicle);
  }

  return result;
}

/**
 * @param {string|number} id
 */
function idKey(id) {
  return String(id);
}

/**
 * Détecte les packs premium WTT : chaînes liées par follow (ex. Strv 151B → C → D).
 * @param {Vehicle[]} vehicles
 */
function extractPremiumPackChains(vehicles) {
  const premiums = vehicles.filter((v) => v.type === 'premium');
  if (premiums.length < 2) {
    return { chainIds: new Set(), chains: [] };
  }

  const byId = new Map(premiums.map((v) => [idKey(v.id), v]));
  /** @type {Map<string, string>} */
  const parent = new Map();

  const find = (id) => {
    const s = idKey(id);
    if (!parent.has(s)) parent.set(s, s);
    if (parent.get(s) !== s) parent.set(s, find(parent.get(s)));
    return parent.get(s);
  };

  const union = (a, b) => {
    parent.set(find(a), find(b));
  };

  for (const v of premiums) {
    if (v.follow == null || v.follow === '') continue;
    const followKey = idKey(v.follow);
    if (byId.has(followKey)) union(v.id, v.follow);
  }

  /** @type {Map<string, Vehicle[]>} */
  const components = new Map();
  for (const v of premiums) {
    const root = find(v.id);
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(v);
  }

  /** @type {Set<string>} */
  const chainIds = new Set();
  /** @type {PackDraft[]} */
  const chains = [];

  for (const group of components.values()) {
    if (group.length < 2) continue;

    for (const v of group) chainIds.add(idKey(v.id));

    const ordered = orderPackChain(group);
    chains.push({
      followId: idKey(ordered[0].id),
      vehicles: ordered,
    });
  }

  return { chainIds, chains };
}

/**
 * Ordonne les véhicules d'un pack : racine (sans follow interne) puis suites.
 * @param {Vehicle[]} group
 */
function orderPackChain(group) {
  const ids = new Set(group.map((v) => idKey(v.id)));
  /** @type {Map<string, Vehicle>} */
  const childOf = new Map();

  for (const v of group) {
    if (v.follow == null || v.follow === '') continue;
    const fk = idKey(v.follow);
    if (ids.has(fk)) childOf.set(fk, v);
  }

  const root =
    group.find((v) => {
      if (v.follow == null || v.follow === '') return true;
      return !ids.has(idKey(v.follow));
    }) ?? group[0];

  /** @type {Vehicle[]} */
  const ordered = [root];
  let current = root;
  while (childOf.has(idKey(current.id))) {
    current = childOf.get(idKey(current.id));
    ordered.push(current);
  }

  return ordered;
}

/**
 * @param {Vehicle[]} vehicles
 * @returns {CountryAdditions}
 */
export function organizeAdditions(vehicles) {
  const { chainIds, chains } = extractPremiumPackChains(vehicles);

  /** @type {Record<string, Vehicle[]>} */
  const ranks = {};

  for (const v of vehicles) {
    if (chainIds.has(idKey(v.id))) continue;
    const rank = String(v.rank);
    (ranks[rank] ??= []).push(v);
  }

  return { ranks, packDrafts: chains };
}

/**
 * Tous les véhicules d'un nouvel arbre = ajouts.
 * @param {TreeData} data
 * @returns {CountryAdditions}
 */
export function additionsFromFullTree(data) {
  return organizeAdditions(data.vehicleList);
}

/**
 * @param {TreeDiff} diff
 * @returns {boolean}
 */
export function diffHasChanges(diff) {
  return (
    diff.added.length > 0
    || diff.removed.length > 0
    || diff.br.length > 0
    || diff.renames.length > 0
    || diff.rankChanges.length > 0
    || diff.moves.length > 0
  );
}
