import { t } from './i18n.js';

/**
 * @typedef {import('./format.js').PatchReport} PatchReport
 */

/**
 * @param {PatchReport} report
 * @returns {string[]}
 */
export function buildSummaryLines(report) {
  const lines = [];
  const newBranchSet = new Set(report.newBranchCountries ?? []);

  for (const country of report.newBranchCountries ?? []) {
    lines.push(`${country} · ${t('summaryBranch')}`);
  }

  for (const [country, data] of Object.entries(report.countries)) {
    if (newBranchSet.has(country)) continue;

    const parts = [];
    let additions = 0;
    for (const vehicles of Object.values(data.additions.ranks)) {
      additions += vehicles.length;
    }
    additions += data.additions.packDrafts.length;

    if (additions) parts.push(`${additions} ${t('summaryAdditions')}`);
    if (data.additions.packDrafts.length) {
      parts.push(`${data.additions.packDrafts.length} ${t('summaryPack')}`);
    }

    const brCount = report.brChanges[country]?.length ?? 0;
    if (brCount) parts.push(`${brCount} ${t('summaryBr')}`);

    const rankCount = report.rankChanges?.[country]?.length ?? 0;
    if (rankCount) parts.push(`${rankCount} ${t('summaryRank')}`);

    const renameCount = report.renames?.[country]?.length ?? 0;
    if (renameCount) parts.push(`${renameCount} ${t('summaryRename')}`);

    const moveCount = report.moves?.[country]?.length ?? 0;
    if (moveCount) parts.push(`${moveCount} ${t('summaryMove')}`);

    if (parts.length) lines.push(`${country} · ${parts.join(', ')}`);
  }

  for (const [country, vehicles] of Object.entries(report.removed ?? {})) {
    if (vehicles.length) {
      lines.push(`${country} · ${vehicles.length} ${t('summaryRemoved')}`);
    }
  }

  return lines;
}

/**
 * @param {PatchReport} report
 * @returns {string}
 */
export function formatSummary(report) {
  const lines = buildSummaryLines(report);
  return lines.length ? lines.join(' · ') : '';
}
