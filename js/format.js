import { CLASS_SORT_ORDER } from './constants.js';
import { t, classLabel, typeLabel } from './i18n.js';

/**
 * @typedef {import('./tree.js').Vehicle} Vehicle
 * @typedef {import('./pricing.js').PackConfig} PackConfig
 * @typedef {import('./tree.js').CountryAdditions} CountryAdditions
 */

/**
 * @typedef {Object} CountryReport
 * @property {CountryAdditions} additions
 * @property {PackConfig[]} packs
 * @property {Record<string, string>} [vehiclePrices]
 */

/**
 * @typedef {Object} PatchReport
 * @property {string[]} newBranchCountries
 * @property {Record<string, CountryReport>} countries
 * @property {Record<string, { name: string, old: number|string, new: number|string }[]>} brChanges
 * @property {Record<string, Vehicle[]>} removed
 * @property {Record<string, { id: string|number, oldName: string, newName: string }[]>} [renames]
 * @property {Record<string, { name: string, old: number|string, new: number|string, br: number|string }[]>} [rankChanges]
 * @property {Record<string, { name: string, oldFollow: string|number|null, newFollow: string|number|null, oldClass: string|null, newClass: string|null }[]>} [moves]
 * @property {string} [header]
 */

const LINE = '\n';
const GAP = '\n\n';

/**
 * @param {number|string} br
 */
function parseBr(br) {
  const n = Number(br);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {Vehicle[]} vehicles
 * @returns {Vehicle[]}
 */
export function sortVehiclesByClassAndBr(vehicles) {
  const orderIndex = new Map(CLASS_SORT_ORDER.map((c, i) => [c, i]));

  return [...vehicles].sort((a, b) => {
    const oa = orderIndex.get(a.classIcon) ?? 99;
    const ob = orderIndex.get(b.classIcon) ?? 99;
    if (oa !== ob) return oa - ob;
    return parseBr(a.br) - parseBr(b.br);
  });
}

/**
 * @param {string[]} lines
 */
function joinWithGaps(lines) {
  return lines.filter(Boolean).join(GAP);
}

/**
 * @param {Vehicle} vehicle
 * @param {string} [price]
 */
function vehicleLine(vehicle, price) {
  const tags = [`${t('br')} : ${vehicle.br}`, classLabel(vehicle.classIcon)];
  const label = typeLabel(vehicle.type);
  if (label) tags.push(label);
  if (price) tags.push(`${price} ${t('ge')}`);
  return `- ${vehicle.name} (${tags.join(', ')})`;
}

/**
 * @param {string} country
 * @param {CountryReport} report
 */
function formatCountryBlock(country, report) {
  const { additions, packs, vehiclePrices = {} } = report;
  const hasRanks = Object.keys(additions.ranks).length > 0;
  const hasPacks = packs.length > 0;

  if (!hasRanks && !hasPacks) return '';

  const sections = [];
  sections.push(`${country} :`);

  const sortedRanks = Object.keys(additions.ranks).sort((a, b) => Number(a) - Number(b));

  for (const rank of sortedRanks) {
    const vehicles = sortVehiclesByClassAndBr(additions.ranks[rank]);
    const lines = vehicles.map((v) => {
      const priceKey = `${country}::${v.id}`;
      return vehicleLine(v, vehiclePrices[priceKey]);
    });

    sections.push(`${t('rank')} ${rank} :`);
    sections.push(joinWithGaps(lines));
  }

  if (hasPacks) {
    const packBlocks = packs.map((pack) => {
      const packLines = [
        `- ${pack.name} (${t('packPremium')}, ${pack.price} ${t('ge')})`,
        `  ${t('content')} :`,
      ];

      if (pack.ge && pack.ge !== '0') packLines.push(`    - ${pack.ge} ${t('ge')}`);
      if (pack.days && pack.days !== '0') {
        packLines.push(`    - ${pack.days} ${t('premiumDays')}`);
      }

      for (const v of pack.vehicles) {
        packLines.push(`    - ${v.name} (${t('br')} : ${v.br}, ${t('rank')} : ${v.rank})`);
      }

      return packLines.join(LINE);
    });

    sections.push(`${t('packPremium')} :`);
    sections.push(packBlocks.join(GAP));
  }

  return `${sections.join(GAP)}${GAP}`;
}

/**
 * @param {{ name: string, oldFollow: string|number|null, newFollow: string|number|null, oldClass: string|null, newClass: string|null }} move
 */
function formatMoveLine(move) {
  const parts = [];
  const followChanged = String(move.oldFollow ?? '') !== String(move.newFollow ?? '');
  const classChanged = (move.oldClass ?? '') !== (move.newClass ?? '');

  if (followChanged) parts.push(t('followChanged'));
  if (classChanged) {
    const from = classLabel(move.oldClass ?? undefined);
    const to = classLabel(move.newClass ?? undefined);
    parts.push(`${t('classChanged')} : ${from} → ${to}`);
  }

  return `- ${move.name} (${parts.join(', ')})`;
}

/**
 * @param {PatchReport} report
 * @returns {string}
 */
export function formatPatchReport(report) {
  const parts = [];
  const newBranchSet = new Set(report.newBranchCountries ?? []);

  if (report.header?.trim()) {
    parts.push(report.header.trim());
    parts.push('---');
  }

  const compareCountries = Object.keys(report.countries).filter((c) => !newBranchSet.has(c));
  const branchCountries = Object.keys(report.countries).filter((c) => newBranchSet.has(c));

  for (const country of branchCountries) {
    const block = formatCountryBlock(country, report.countries[country]);
    if (block) parts.push(block.trimEnd());
  }

  for (const country of compareCountries) {
    const block = formatCountryBlock(country, report.countries[country]);
    if (block) parts.push(block.trimEnd());
  }

  if (Object.keys(report.brChanges).length > 0) {
    const brSections = [`${t('brChanges')} :`];
    for (const [country, changes] of Object.entries(report.brChanges)) {
      const lines = changes.map((c) => `- ${c.name} : ${c.old} → ${c.new}`);
      brSections.push(`${country} :`);
      brSections.push(joinWithGaps(lines));
    }
    parts.push(brSections.join(GAP));
  }

  if (report.rankChanges && Object.keys(report.rankChanges).length > 0) {
    const rankSections = [`${t('rankChanges')} :`];
    for (const [country, changes] of Object.entries(report.rankChanges)) {
      const lines = changes.map(
        (c) => `- ${c.name} : ${t('rank')} ${c.old} → ${c.new} (${t('br')} : ${c.br})`,
      );
      rankSections.push(`${country} :`);
      rankSections.push(joinWithGaps(lines));
    }
    parts.push(rankSections.join(GAP));
  }

  if (report.renames && Object.keys(report.renames).length > 0) {
    const renameSections = [`${t('renames')} :`];
    for (const [country, changes] of Object.entries(report.renames)) {
      const lines = changes.map(
        (c) => `- ${c.oldName} → ${c.newName} (${t('renamed')})`,
      );
      renameSections.push(`${country} :`);
      renameSections.push(joinWithGaps(lines));
    }
    parts.push(renameSections.join(GAP));
  }

  if (report.moves && Object.keys(report.moves).length > 0) {
    const moveSections = [`${t('moves')} :`];
    for (const [country, changes] of Object.entries(report.moves)) {
      const lines = changes.map(formatMoveLine);
      moveSections.push(`${country} :`);
      moveSections.push(joinWithGaps(lines));
    }
    parts.push(moveSections.join(GAP));
  }

  if (Object.keys(report.removed).length > 0) {
    const removedLines = [];
    for (const [country, vehicles] of Object.entries(report.removed)) {
      for (const v of sortVehiclesByClassAndBr(vehicles)) {
        removedLines.push(`- ${v.name} (${country})`);
      }
    }
    parts.push([`${t('removed')} :`, joinWithGaps(removedLines)].join(GAP));
  }

  const result = parts.join(GAP).trim();
  return result || t('noChanges');
}
