/** @typedef {'fr' | 'en'} Locale */

const STORAGE_KEY = 'wtt-locale';

/** @type {Record<Locale, Record<string, string>>} */
const STRINGS = {
  fr: {
    rank: 'Rang',
    br: 'BR',
    vehicle: 'Véhicule',
    ge: 'GE',
    packPremium: 'Pack Premium',
    content: 'Contenu',
    premiumDays: 'jours Premium',
    newBranches: 'Nouvelle(s) branche(s) technologique(s)',
    existingUpdates: 'Mises à jour des nations existantes',
    brChanges: 'Changements de BR',
    rankChanges: 'Changements de rang',
    renames: 'Renommages',
    moves: 'Déplacements dans l\'arbre',
    removed: 'Véhicules retirés du jeu',
    noChanges: 'Aucun changement détecté entre les fichiers fournis.',
    renamed: 'renommé',
    followChanged: 'nouvelle position dans l\'arbre',
    classChanged: 'changement de rôle',
    summaryAdditions: 'ajout(s)',
    summaryBr: 'BR',
    summaryRank: 'rang',
    summaryRename: 'renommage(s)',
    summaryMove: 'déplacement(s)',
    summaryRemoved: 'retrait(s)',
    summaryPack: 'pack(s)',
    summaryBranch: 'nouvelle branche',
  },
  en: {
    rank: 'Rank',
    br: 'BR',
    vehicle: 'Vehicle',
    ge: 'GE',
    packPremium: 'Premium Pack',
    content: 'Contents',
    premiumDays: 'days Premium',
    newBranches: 'New tech tree branch(es)',
    existingUpdates: 'Updates to existing nations',
    brChanges: 'BR changes',
    rankChanges: 'Rank changes',
    renames: 'Renames',
    moves: 'Tree repositioning',
    removed: 'Vehicles removed from the game',
    noChanges: 'No changes detected between the provided files.',
    renamed: 'renamed',
    followChanged: 'new position in tree',
    classChanged: 'role change',
    summaryAdditions: 'addition(s)',
    summaryBr: 'BR',
    summaryRank: 'rank',
    summaryRename: 'rename(s)',
    summaryMove: 'move(s)',
    summaryRemoved: 'removal(s)',
    summaryPack: 'pack(s)',
    summaryBranch: 'new branch',
  },
};

/** @type {Record<Locale, Record<string, string>>} */
export const CLASS_LABELS = {
  fr: {
    lt: 'Char Léger',
    mt: 'Char Moyen',
    ht: 'Char Lourd',
    td: 'Chasseur de Chars',
    spaa: 'Anti-Aérien',
    fighter: 'Chasseur',
    bomber: 'Bombardier',
  },
  en: {
    lt: 'Light Tank',
    mt: 'Medium Tank',
    ht: 'Heavy Tank',
    td: 'Tank Destroyer',
    spaa: 'SPAA',
    fighter: 'Fighter',
    bomber: 'Bomber',
  },
};

/** Types affichés dans le patch note — researchable = défaut, on ne le mentionne pas */
const VISIBLE_TYPES = new Set(['premium', 'event', 'squadron', 'reserve']);

/** @type {Record<Locale, Record<string, string>>} */
export const TYPE_LABELS = {
  fr: {
    premium: 'Premium',
    event: 'Event',
    squadron: 'Escadron',
    reserve: 'Réserve',
  },
  en: {
    premium: 'Premium',
    event: 'Event',
    squadron: 'Squadron',
    reserve: 'Reserve',
  },
};

/** @type {Locale} */
let currentLocale = 'fr';

/**
 * @returns {Locale}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {Locale} locale
 */
export function setLocale(locale) {
  currentLocale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}

export function initLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'fr') {
    currentLocale = stored;
  }
  document.documentElement.lang = currentLocale;
}

/**
 * @param {string} key
 */
export function t(key) {
  return STRINGS[currentLocale][key] ?? STRINGS.fr[key] ?? key;
}

/**
 * @param {string} [classIcon]
 */
export function classLabel(classIcon) {
  return CLASS_LABELS[currentLocale][classIcon] ?? t('vehicle');
}

/**
 * @param {string} [type]
 */
export function typeLabel(type) {
  if (!type || !VISIBLE_TYPES.has(type)) return '';
  return TYPE_LABELS[currentLocale][type] ?? type;
}

/**
 * Libellé localisé pour l'UI (modale tarification, etc.)
 * @param {string} [type]
 */
export function typeLabelForUi(type) {
  if (!type) return 'standard';
  if (type === 'researchable') return currentLocale === 'fr' ? 'recherchable' : 'researchable';
  return TYPE_LABELS[currentLocale][type] ?? type;
}
