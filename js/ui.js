import { typeLabelForUi } from './i18n.js';

/**
 * @typedef {'old' | 'new' | 'branch'} ZoneId
 */

/**
 * @param {string} message
 * @param {number} [duration]
 */
export function showToast(message, duration = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    el.classList.remove('show');
    el.hidden = true;
  }, duration);
}

/**
 * @param {HTMLElement} pill
 * @param {string} text
 * @param {'idle' | 'loading' | 'error' | 'success'} state
 */
export function setStatus(pill, text, state = 'idle') {
  pill.textContent = text;
  pill.className = 'status-pill';
  if (state !== 'idle') pill.classList.add(state);
}

/**
 * @param {import('./pricing.js').VehiclePriceEntry[]} vehicleEntries
 * @param {import('./pricing.js').PackPriceEntry[]} packEntries
 * @param {{ vehiclePrices?: Record<string, string>, packDefaults?: Record<string, import('./pricing.js').PackConfig> }} [stored]
 * @returns {Promise<{ vehiclePrices: Record<string, string>, packConfigs: Record<string, import('./pricing.js').PackConfig> } | null>}
 */
export function openPricingDialog(vehicleEntries, packEntries, stored = {}) {
  const dialog = /** @type {HTMLDialogElement} */ (document.getElementById('dialog-pricing'));
  const fields = document.getElementById('pricing-fields');
  const form = document.getElementById('form-pricing');
  const cancelBtn = document.getElementById('btn-pricing-cancel');

  if (!dialog || !fields || !form) {
    return Promise.resolve({ vehiclePrices: {}, packConfigs: {} });
  }

  fields.innerHTML = '';

  if (vehicleEntries.length === 0 && packEntries.length === 0) {
    return Promise.resolve({ vehiclePrices: {}, packConfigs: {} });
  }

  const byCountry = groupByCountry(vehicleEntries, packEntries);

  const storedVehiclePrices = stored.vehiclePrices ?? {};
  const storedPackDefaults = stored.packDefaults ?? {};

  for (const [country, { vehicles, packs }] of Object.entries(byCountry)) {
    if (vehicles.length) {
      fields.appendChild(sectionTitle(`${country} — véhicules`));
      for (const entry of vehicles) {
        const savedPrice = storedVehiclePrices[entry.key];
        fields.appendChild(
          fieldRow(
            entry.key,
            `vehicle-price`,
            `${entry.vehicle.name} (${typeLabelForUi(entry.vehicle.type)}, R${entry.vehicle.rank})`,
            savedPrice || entry.defaultPrice,
            false,
          ),
        );
      }
    }

    if (packs.length) {
      fields.appendChild(sectionTitle(`${country} — packs premium`));
      for (const entry of packs) {
        const saved = storedPackDefaults[entry.key];
        const wrap = document.createElement('div');
        wrap.className = 'pricing-group';
        wrap.dataset.packKey = entry.key;

        const label = entry.chainLabel ?? entry.vehicles.map((v) => v.name).join(' → ');
        wrap.innerHTML = `<p class="pricing-group-title">Pack : ${label}</p>`;

        const grid = document.createElement('div');
        grid.className = 'pricing-pack-grid';

        grid.appendChild(
          fieldRow(`${entry.key}::name`, 'pack-field', 'Nom du pack', saved?.name || entry.defaultName, true),
        );
        grid.appendChild(
          fieldRow(`${entry.key}::price`, 'pack-field', 'Prix pack (GE)', saved?.price || entry.defaultPrice, false),
        );
        grid.appendChild(
          fieldRow(`${entry.key}::ge`, 'pack-field', 'GE inclus', saved?.ge ?? entry.defaultGe, false),
        );
        grid.appendChild(
          fieldRow(`${entry.key}::days`, 'pack-field', 'Jours Premium', saved?.days ?? entry.defaultDays, false),
        );

        wrap.appendChild(grid);
        fields.appendChild(wrap);
      }
    }
  }

  return new Promise((resolve) => {
    const onCancel = () => {
      dialog.close();
      cleanup();
      resolve(null);
    };

    const onSubmit = (e) => {
      e.preventDefault();
      const vehiclePrices = {};
      const packConfigs = {};

      fields.querySelectorAll('[data-input-key]').forEach((row) => {
        const key = row.dataset.inputKey;
        const kind = row.dataset.inputKind;
        const input = row.querySelector('input');
        if (!key || !input) return;

        if (kind === 'vehicle-price') {
          const val = input.value.trim();
          if (val) vehiclePrices[key] = val;
        }
      });

      for (const entry of packEntries) {
        const name = getPackFieldValue(fields, `${entry.key}::name`);
        const price = getPackFieldValue(fields, `${entry.key}::price`);
        const ge = getPackFieldValue(fields, `${entry.key}::ge`);
        const days = getPackFieldValue(fields, `${entry.key}::days`);

        packConfigs[entry.key] = {
          name: name || entry.defaultName,
          price: price || entry.defaultPrice,
          ge: ge || entry.defaultGe,
          days: days || entry.defaultDays,
          vehicles: entry.vehicles,
        };
      }

      dialog.close();
      cleanup();
      resolve({ vehiclePrices, packConfigs });
    };

    const cleanup = () => {
      form.removeEventListener('submit', onSubmit);
      cancelBtn?.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onCancel);
    };

    form.addEventListener('submit', onSubmit);
    cancelBtn?.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel);

    dialog.showModal();
  });
}

/**
 * @param {import('./pricing.js').VehiclePriceEntry[]} vehicleEntries
 * @param {import('./pricing.js').PackPriceEntry[]} packEntries
 */
function groupByCountry(vehicleEntries, packEntries) {
  /** @type {Record<string, { vehicles: typeof vehicleEntries, packs: typeof packEntries }>} */
  const map = {};

  for (const v of vehicleEntries) {
    (map[v.country] ??= { vehicles: [], packs: [] }).vehicles.push(v);
  }
  for (const p of packEntries) {
    (map[p.country] ??= { vehicles: [], packs: [] }).packs.push(p);
  }

  return map;
}

/**
 * @param {string} key
 * @param {string} kind
 * @param {string} label
 * @param {string} defaultValue
 * @param {boolean} wide
 */
function fieldRow(key, kind, label, defaultValue, wide) {
  const row = document.createElement('div');
  row.className = `pricing-field${wide ? ' pricing-field--wide' : ''}`;
  row.dataset.inputKey = key;
  row.dataset.inputKind = kind;

  const lbl = document.createElement('label');
  lbl.htmlFor = `input-${key}`;
  lbl.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.id = `input-${key}`;
  input.name = key;
  input.value = defaultValue;
  input.autocomplete = 'off';

  row.append(lbl, input);
  return row;
}

function sectionTitle(text) {
  const h = document.createElement('h3');
  h.className = 'pricing-group-title';
  h.textContent = text;
  return h;
}

/**
 * @param {HTMLElement} container
 * @param {string} key
 */
function getPackFieldValue(container, key) {
  const row = container.querySelector(`[data-input-key="${key}"]`);
  const input = row?.querySelector('input');
  return input?.value.trim() ?? '';
}

/**
 * Gestion des fichiers par zone (drag & drop + liste).
 */
export class FileZone {
  /**
   * @param {ZoneId} id
   * @param {() => void} [onChange]
   */
  constructor(id, onChange) {
    this.id = id;
    this.onChange = onChange ?? (() => {});
    /** @type {File[]} */
    this.files = [];

    this.input = /** @type {HTMLInputElement} */ (document.getElementById(`input-${id}`));
    this.list = document.getElementById(`list-${id}`);
    this.zone = document.querySelector(`.dropzone[data-zone="${id}"]`);
    const browse = document.querySelector(`[data-browse="${id}"]`);

    browse?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.input?.click();
    });

    this.zone?.addEventListener('click', () => this.input?.click());
    this.zone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.input?.click();
      }
    });

    this.input?.addEventListener('change', () => {
      if (this.input.files) this.addFiles([...this.input.files]);
      this.input.value = '';
    });

    this.setupDragDrop();
    this.render();
  }

  setupDragDrop() {
    if (!this.zone) return;

    ['dragenter', 'dragover'].forEach((ev) => {
      this.zone.addEventListener(ev, (e) => {
        e.preventDefault();
        this.zone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((ev) => {
      this.zone.addEventListener(ev, (e) => {
        e.preventDefault();
        if (ev === 'drop') {
          const dt = /** @type {DragEvent} */ (e).dataTransfer;
          if (dt?.files.length) this.addFiles([...dt.files].filter(isJsonFile));
        }
        this.zone.classList.remove('dragover');
      });
    });
  }

  /**
   * @param {File[]} incoming
   */
  addFiles(incoming) {
    const valid = incoming.filter(isJsonFile);
    if (!valid.length) {
      showToast('Seuls les fichiers .json sont acceptés');
      return;
    }

    const keys = new Set(this.files.map((f) => f.name));
    for (const f of valid) {
      if (!keys.has(f.name)) {
        this.files.push(f);
        keys.add(f.name);
      }
    }
    this.render();
    this.onChange();
  }

  /**
   * @param {string} name
   */
  removeFile(name) {
    this.files = this.files.filter((f) => f.name !== name);
    this.render();
    this.onChange();
  }

  clear() {
    this.files = [];
    this.render();
    this.onChange();
  }

  render() {
    if (!this.list) return;
    this.list.innerHTML = '';

    for (const file of this.files) {
      const li = document.createElement('li');
      li.className = 'file-item';

      const span = document.createElement('span');
      span.className = 'file-item-name';
      span.textContent = file.name;
      span.title = file.name;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'file-item-remove';
      btn.setAttribute('aria-label', `Retirer ${file.name}`);
      btn.textContent = '×';
      btn.addEventListener('click', () => this.removeFile(file.name));

      li.append(span, btn);
      this.list.appendChild(li);
    }
  }
}

/**
 * @param {File} file
 */
function isJsonFile(file) {
  return file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';
}

/**
 * @param {{ pairs: { country: string, old: File, new: File }[], unmatchedOld: File[], unmatchedNew: File[] }} pairing
 */
export function renderPairingStatus(pairing) {
  const el = document.getElementById('pairing-status');
  if (!el) return;

  const { pairs, unmatchedOld, unmatchedNew } = pairing;
  const hasWarn = unmatchedOld.length > 0 || unmatchedNew.length > 0;

  if (pairs.length === 0 && !hasWarn) {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.className = `pairing-status ${hasWarn ? 'warn' : 'ok'}`;

  let html = `<strong>${pairs.length}</strong> paire(s) appariée(s)`;
  if (pairs.length) {
    html += '<div class="pairing-rows">';
    for (const p of pairs) {
      html += `<div class="pairing-row matched">✓ ${p.country} — ${p.old.name} ↔ ${p.new.name}</div>`;
    }
    html += '</div>';
  }
  for (const f of unmatchedOld) {
    html += `<div class="pairing-row unmatched">⚠ Ancien sans correspondant : ${f.name}</div>`;
  }
  for (const f of unmatchedNew) {
    html += `<div class="pairing-row unmatched">⚠ Nouveau sans correspondant : ${f.name}</div>`;
  }

  el.innerHTML = html;
}

/**
 * @param {string} text
 */
export function renderSummary(text) {
  const el = document.getElementById('summary-bar');
  if (!el) return;

  if (!text.trim()) {
    el.hidden = true;
    el.textContent = '';
    return;
  }

  el.hidden = false;
  el.textContent = text;
}

/** @type {'text' | 'preview'} */
let resultView = 'text';

/** @type {string} */
let lastOutputText = '';

/**
 * @param {string} text
 */
export function setResultOutput(text) {
  lastOutputText = text;
  const pre = document.getElementById('output');
  const preview = document.getElementById('output-preview');
  const isPlaceholder = !text.trim() || text.startsWith('En attente') || text.startsWith('⏳') || text.startsWith('⚠️') || text.startsWith('❌') || text.startsWith('🤷');

  if (pre) {
    pre.textContent = text;
    pre.classList.toggle('empty', isPlaceholder);
  }

  if (preview) {
    preview.textContent = isPlaceholder ? '' : text;
    preview.classList.toggle('empty', isPlaceholder);
  }

  setResultActionsEnabled(!!text.trim() && !isPlaceholder);
  syncResultTabs();
}

/**
 * @param {boolean} on
 */
export function setResultActionsEnabled(on) {
  const copy = document.getElementById('btn-copy');
  const download = document.getElementById('btn-download');
  if (copy) copy.disabled = !on;
  if (download) download.disabled = !on;
}

export function getResultText() {
  return lastOutputText;
}

/**
 * @param {'text' | 'preview'} view
 */
export function setResultView(view) {
  resultView = view;
  syncResultTabs();
}

function syncResultTabs() {
  const pre = document.getElementById('output');
  const preview = document.getElementById('output-preview');
  const tabText = document.getElementById('tab-text');
  const tabPreview = document.getElementById('tab-preview');

  if (pre) pre.hidden = resultView !== 'text';
  if (preview) preview.hidden = resultView !== 'preview';
  tabText?.classList.toggle('active', resultView === 'text');
  tabPreview?.classList.toggle('active', resultView === 'preview');
}

export function initResultTabs() {
  document.getElementById('tab-text')?.addEventListener('click', () => setResultView('text'));
  document.getElementById('tab-preview')?.addEventListener('click', () => setResultView('preview'));
  syncResultTabs();
}
