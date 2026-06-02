/**
 * Normalise un nom de fichier pour l'appariement (minuscules, sans suffixe navigateur).
 * @param {string} filename
 */
export function cleanFilename(filename) {
  return filename.toLowerCase().replace(/\s\(\d+\)/g, '');
}

/**
 * Extrait le nom affiché du pays depuis le nom de fichier JSON.
 * @param {string} filename
 */
export function countryFromFilename(filename) {
  const base = cleanFilename(filename)
    .replace(/\.json$/i, '')
    .replace(/_backup$/i, '')
    .replace(/-backup$/i, '');

  if (base.length <= 3) return base.toUpperCase();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * @param {File[]} oldFiles
 * @param {File[]} newFiles
 * @returns {{ pairs: { old: File, new: File, country: string }[], unmatchedOld: File[], unmatchedNew: File[] }}
 */
export function pairCompareFiles(oldFiles, newFiles) {
  const singlePair =
    oldFiles.length === 1 && newFiles.length === 1
      ? [{ old: oldFiles[0], new: newFiles[0], country: countryFromFilename(oldFiles[0].name) }]
      : null;

  if (singlePair) {
    const usedNew = new Set([newFiles[0].name]);
    const unmatchedNew = newFiles.slice(1);
    return { pairs: singlePair, unmatchedOld: [], unmatchedNew };
  }

  const newByClean = new Map(newFiles.map((f) => [cleanFilename(f.name), f]));
  const usedNewKeys = new Set();
  const pairs = [];
  const unmatchedOld = [];

  for (const old of oldFiles) {
    const key = cleanFilename(old.name);
    const matched = newByClean.get(key);
    if (matched) {
      pairs.push({ old, new: matched, country: countryFromFilename(old.name) });
      usedNewKeys.add(key);
    } else {
      unmatchedOld.push(old);
    }
  }

  const unmatchedNew = newFiles.filter((f) => !usedNewKeys.has(cleanFilename(f.name)));

  return { pairs, unmatchedOld, unmatchedNew };
}

/**
 * @param {File[]} files
 * @returns {{ file: File, country: string }[]}
 */
export function mapBranchFiles(files) {
  return files.map((file) => ({
    file,
    country: countryFromFilename(file.name),
  }));
}
