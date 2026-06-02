import { pairCompareFiles, mapBranchFiles } from './files.js';
import {
  parseTreeFile,
  diffTrees,
  diffHasChanges,
  organizeAdditions,
  additionsFromFullTree,
} from './tree.js';
import { collectPricingNeeds, needsPricingDialog } from './pricing.js';
import { formatPatchReport } from './format.js';
import { formatSummary } from './summary.js';
import { mergeStoredPricing, savePricing } from './storage.js';
import { initLocale, getLocale, setLocale } from './i18n.js';
import {
  FileZone,
  openPricingDialog,
  renderPairingStatus,
  renderSummary,
  setStatus,
  showToast,
  setResultOutput,
  setResultActionsEnabled,
  getResultText,
  initResultTabs,
} from './ui.js';
import { initThemeToggle } from './theme.js';

/** @typedef {import('./format.js').PatchReport} PatchReport */

const zoneOld = new FileZone('old', updatePairingPreview);
const zoneNew = new FileZone('new', updatePairingPreview);
const zoneBranch = new FileZone('branch', () => {});

const els = {
  btnGenerate: document.getElementById('btn-generate'),
  btnCopy: document.getElementById('btn-copy'),
  btnDownload: document.getElementById('btn-download'),
  btnClear: document.getElementById('btn-clear'),
  statusPill: document.getElementById('status-pill'),
  inputVersion: document.getElementById('input-patch-version'),
  inputTitle: document.getElementById('input-patch-title'),
  localeSelect: document.getElementById('locale-select'),
};

init();

function init() {
  initLocale();
  initThemeToggle();
  initResultTabs();
  els.btnGenerate?.addEventListener('click', onGenerate);
  els.btnCopy?.addEventListener('click', onCopy);
  els.btnDownload?.addEventListener('click', onDownload);
  els.btnClear?.addEventListener('click', onClear);
  els.localeSelect?.addEventListener('change', onLocaleChange);
  if (els.localeSelect) els.localeSelect.value = getLocale();
  updatePairingPreview();
}

function onLocaleChange() {
  const value = els.localeSelect?.value;
  if (value === 'fr' || value === 'en') {
    setLocale(value);
    showToast(value === 'fr' ? 'Langue : français' : 'Language: English');
  }
}

function updatePairingPreview() {
  const pairing = pairCompareFiles(zoneOld.files, zoneNew.files);
  renderPairingStatus(pairing);
}

function buildPatchHeader() {
  const version = els.inputVersion?.value.trim() ?? '';
  const title = els.inputTitle?.value.trim() ?? '';
  if (version && title) return `Update ${version} / ${title}`;
  if (version) return `Update ${version}`;
  if (title) return title;
  return '';
}

function setOutputPlaceholder() {
  renderSummary('');
  setResultOutput('En attente des fichiers…');
  setResultActionsEnabled(false);
}

async function onGenerate() {
  const pill = els.statusPill;
  if (!pill) return;

  try {
    setStatus(pill, 'Analyse en cours…', 'loading');
    renderSummary('');
    setResultOutput('⏳ Analyse et formatage en cours…');

    const draft = await buildUnifiedDraft();
    if (!draft) {
      setStatus(pill, '', 'idle');
      return;
    }

    const { report, vehicleEntries, packEntries } = draft;
    report.header = buildPatchHeader();

    if (!hasReportContent(report)) {
      setResultOutput('🤷 Aucun changement détecté entre les fichiers fournis.');
      setStatus(pill, 'Aucun changement', 'idle');
      setResultActionsEnabled(false);
      return;
    }

    renderSummary(formatSummary(report));

    let vehiclePrices = {};
    let packConfigs = {};

    if (needsPricingDialog(vehicleEntries, packEntries)) {
      setStatus(pill, 'Tarification…', 'loading');
      const stored = mergeStoredPricing(vehicleEntries, packEntries);
      const pricing = await openPricingDialog(vehicleEntries, packEntries, stored);
      if (!pricing) {
        setResultOutput('Génération annulée.');
        setStatus(pill, 'Annulé', 'idle');
        setResultActionsEnabled(false);
        return;
      }
      vehiclePrices = pricing.vehiclePrices;
      packConfigs = pricing.packConfigs;
      savePricing(vehiclePrices, packConfigs);
    }

    applyPricingToReport(report, vehiclePrices, packConfigs);

    const text = formatPatchReport(report);
    setResultOutput(text);
    setStatus(pill, 'Patch note prêt', 'success');
    showToast('Patch note généré');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    renderSummary('');
    setResultOutput(`❌ ${msg}`);
    setStatus(pill, 'Erreur', 'error');
    setResultActionsEnabled(false);
    console.error(err);
  }
}

/**
 * @returns {Promise<{ report: PatchReport, vehicleEntries: import('./pricing.js').VehiclePriceEntry[], packEntries: import('./pricing.js').PackPriceEntry[] } | null>}
 */
async function buildUnifiedDraft() {
  const hasCompare = zoneOld.files.length > 0 && zoneNew.files.length > 0;
  const hasBranch = zoneBranch.files.length > 0;

  if (!hasCompare && !hasBranch) {
    showToast('Ajoute des JSON en comparaison et/ou en nouvelle branche');
    setResultOutput('⚠️ Remplis au moins une zone : comparaison (ancien + nouveau) ou nouvelle branche.');
    return null;
  }

  /** @type {PatchReport} */
  const report = {
    newBranchCountries: [],
    countries: {},
    brChanges: {},
    removed: {},
    renames: {},
    rankChanges: {},
    moves: {},
  };

  const vehicleEntries = [];
  const packEntries = [];
  const errors = [];

  if (hasCompare) {
    const comparePart = await buildComparePart();
    if (comparePart.errors.length) errors.push(...comparePart.errors);
    mergeDraftIntoReport(report, comparePart);
    vehicleEntries.push(...comparePart.vehicleEntries);
    packEntries.push(...comparePart.packEntries);
  } else if (zoneOld.files.length || zoneNew.files.length) {
    showToast('Comparaison incomplète — il faut ancien ET nouveau, ou vide les deux');
  }

  if (hasBranch) {
    const branchPart = await buildBranchPart(report.countries);
    if (branchPart.errors.length) errors.push(...branchPart.errors);
    mergeDraftIntoReport(report, branchPart);
    vehicleEntries.push(...branchPart.vehicleEntries);
    packEntries.push(...branchPart.packEntries);
  }

  if (errors.length) throw new Error(errors.join('\n'));

  return { report, vehicleEntries, packEntries };
}

/**
 * @param {PatchReport} report
 * @param {Partial<PatchReport> & { vehicleEntries?: import('./pricing.js').VehiclePriceEntry[], packEntries?: import('./pricing.js').PackPriceEntry[] }} part
 */
function mergeDraftIntoReport(report, part) {
  Object.assign(report.countries, part.countries);
  Object.assign(report.brChanges, part.brChanges);
  Object.assign(report.removed, part.removed);
  if (part.renames) Object.assign(report.renames, part.renames);
  if (part.rankChanges) Object.assign(report.rankChanges, part.rankChanges);
  if (part.moves) Object.assign(report.moves, part.moves);
  for (const c of part.newBranchCountries ?? []) {
    if (!report.newBranchCountries.includes(c)) report.newBranchCountries.push(c);
  }
}

async function buildComparePart() {
  const { pairs, unmatchedOld } = pairCompareFiles(zoneOld.files, zoneNew.files);

  if (!pairs.length) {
    throw new Error('Impossible d\'apparier les fichiers de comparaison. Vérifie que les noms correspondent (ex. usa.json).');
  }

  if (unmatchedOld.length) {
    showToast(`${unmatchedOld.length} fichier(s) ancien(s) sans paire — ignorés`);
  }

  /** @type {PatchReport['countries']} */
  const countries = {};
  /** @type {PatchReport['brChanges']} */
  const brChanges = {};
  /** @type {PatchReport['removed']} */
  const removed = {};
  /** @type {PatchReport['renames']} */
  const renames = {};
  /** @type {PatchReport['rankChanges']} */
  const rankChanges = {};
  /** @type {PatchReport['moves']} */
  const moves = {};
  const vehicleEntries = [];
  const packEntries = [];
  const errors = [];

  await Promise.all(
    pairs.map(async ({ old, new: newFile, country }) => {
      try {
        const [oldData, newData] = await Promise.all([
          parseTreeFile(old),
          parseTreeFile(newFile),
        ]);

        const diff = diffTrees(oldData, newData);
        if (!diffHasChanges(diff)) return;

        const additions = organizeAdditions(diff.added);
        const pricing = collectPricingNeeds(country, additions);

        vehicleEntries.push(...pricing.vehicles);
        packEntries.push(...pricing.packs);

        countries[country] = { additions, packs: [], vehiclePrices: {} };
        if (diff.br.length) brChanges[country] = diff.br;
        if (diff.removed.length) removed[country] = diff.removed;
        if (diff.renames.length) renames[country] = diff.renames;
        if (diff.rankChanges.length) rankChanges[country] = diff.rankChanges;
        if (diff.moves.length) moves[country] = diff.moves;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }),
  );

  return {
    countries,
    brChanges,
    removed,
    renames,
    rankChanges,
    moves,
    newBranchCountries: [],
    vehicleEntries,
    packEntries,
    errors,
  };
}

async function buildBranchPart(existingCountries) {
  const vehicleEntries = [];
  const packEntries = [];
  const errors = [];
  /** @type {PatchReport['countries']} */
  const countries = {};
  const newBranchCountries = [];

  const branchCountriesFromFiles = new Set(
    mapBranchFiles(zoneBranch.files).map((x) => x.country),
  );

  for (const country of branchCountriesFromFiles) {
    if (existingCountries[country]) {
      showToast(`${country} déjà traité en comparaison — branche ignorée`);
    }
  }

  await Promise.all(
    mapBranchFiles(zoneBranch.files).map(async ({ file, country }) => {
      if (existingCountries[country]) return;

      try {
        const data = await parseTreeFile(file);
        const additions = additionsFromFullTree(data);

        if (
          !Object.keys(additions.ranks).length &&
          !additions.packDrafts.length
        ) {
          return;
        }

        const pricing = collectPricingNeeds(country, additions);
        vehicleEntries.push(...pricing.vehicles);
        packEntries.push(...pricing.packs);

        countries[country] = { additions, packs: [], vehiclePrices: {} };
        newBranchCountries.push(country);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }),
  );

  return {
    countries,
    brChanges: {},
    removed: {},
    renames: {},
    rankChanges: {},
    moves: {},
    newBranchCountries,
    vehicleEntries,
    packEntries,
    errors,
  };
}

/**
 * @param {PatchReport} report
 */
function hasReportContent(report) {
  return (
    Object.keys(report.countries).length > 0
    || Object.keys(report.brChanges).length > 0
    || Object.keys(report.removed).length > 0
    || Object.keys(report.renames ?? {}).length > 0
    || Object.keys(report.rankChanges ?? {}).length > 0
    || Object.keys(report.moves ?? {}).length > 0
  );
}

/**
 * @param {PatchReport} report
 * @param {Record<string, string>} vehiclePrices
 * @param {Record<string, import('./pricing.js').PackConfig>} packConfigs
 */
function applyPricingToReport(report, vehiclePrices, packConfigs) {
  for (const [country, data] of Object.entries(report.countries)) {
    /** @type {Record<string, string>} */
    const prices = {};

    for (const vehicles of Object.values(data.additions.ranks)) {
      for (const v of vehicles) {
        const key = `${country}::${v.id}`;
        if (vehiclePrices[key]) prices[key] = vehiclePrices[key];
      }
    }

    data.vehiclePrices = prices;
    data.packs = data.additions.packDrafts
      .map((draft) => packConfigs[`${country}::pack::${draft.followId}`])
      .filter(Boolean);
  }
}

async function onCopy() {
  const text = getResultText();
  if (!text || text.startsWith('En attente') || text.startsWith('⏳')) return;

  try {
    await navigator.clipboard.writeText(text);
    const btn = els.btnCopy;
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = 'Copié !';
      setTimeout(() => { btn.textContent = prev ?? 'Copier'; }, 2000);
    }
    showToast('Copié dans le presse-papiers');
  } catch {
    showToast('Impossible de copier — sélectionne le texte manuellement');
  }
}

function onDownload() {
  const text = getResultText();
  if (!text || text.startsWith('En attente') || text.startsWith('⏳')) return;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `patch-note-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Fichier téléchargé');
}

function onClear() {
  zoneOld.clear();
  zoneNew.clear();
  zoneBranch.clear();
  if (els.inputVersion) els.inputVersion.value = '';
  if (els.inputTitle) els.inputTitle.value = '';
  setOutputPlaceholder();
  setStatus(els.statusPill, '', 'idle');
  updatePairingPreview();
  showToast('Réinitialisé');
}
