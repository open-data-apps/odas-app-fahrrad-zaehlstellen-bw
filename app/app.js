/*
 * Fahrrad-Zählstellen
 * Visualisiert Fahrradzähldaten über eine CKAN Datastore API.
 * Bootstrap 5.3 | Leaflet (dynamisch) | Chart.js (dynamisch)
 *
 * configdata: { "apiurl": "..." }
 */

function isOdasProxyEnabled(configdata = {}) {
  return String(configdata.proxyAktiv || "").trim().toLowerCase() === "ja";
}

function extractPathFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname + parsedUrl.search;
  } catch (_error) {
    return String(url || "");
  }
}

function getOdasAppBasePath(pathname) {
  let appPath =
    pathname === undefined
      ? typeof window !== "undefined"
        ? window.location.pathname
        : "/"
      : String(pathname || "/");

  if (!appPath.endsWith("/")) {
    const lastSlashIndex = appPath.lastIndexOf("/");
    const lastSegment = appPath.substring(lastSlashIndex + 1);
    if (lastSegment.includes(".")) {
      appPath = appPath.substring(0, lastSlashIndex + 1);
    }
  }

  return appPath.replace(/\/+$/, "");
}

function getOdasProxyEndpoint(targetUrl, pathname) {
  const appPath = getOdasAppBasePath(pathname);
  return `${appPath}/odp-data?path=${encodeURIComponent(
    extractPathFromUrl(targetUrl),
  )}`;
}

async function fetchViaOdasProxy(targetUrl, options = {}) {
  const response = await fetch(getOdasProxyEndpoint(targetUrl), {
    method: "POST",
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`ODAS-Proxy-Fehler: HTTP ${response.status}`);
  }

  const proxyData = await response.json();
  if (!proxyData || typeof proxyData.content !== "string") {
    throw new Error("ODAS-Proxy-Antwort enthält keinen content-String.");
  }

  return proxyData.content;
}

async function fetchOdasResource(targetUrl, configdata = {}, options = {}) {
  if (isOdasProxyEnabled(configdata)) {
    return fetchViaOdasProxy(targetUrl, options);
  }

  try {
    const response = await fetch(targetUrl, { signal: options.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw error;
    }
    throw new Error(
      `Direkter Datenabruf fehlgeschlagen (${error.message}). Bitte prüfen Sie die Daten-URL und die CORS-Freigabe der Datenquelle.`,
    );
  }
}

async function fetchOdasJson(targetUrl, configdata = {}, options = {}) {
  return JSON.parse(await fetchOdasResource(targetUrl, configdata, options));
}

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHttpUrl(value) {
  const s = String(value || "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

let fzInstanzZaehler = 0;

// F-43: Registrierte Instanzen (Container -> Cleanup-Funktion), damit der
// Top-Level-Hook onPageLeave() alle gemounteten Instanzen aufraeumen kann. Die
// Base ruft den Hook global ohne Container-Parameter auf; eine iterierbare Map
// ist daher das zur App passende Muster (Portfolio-Muster aus Task 9.1).
const fahrradInstances = new Map();

function onPageLeave(page) {
  fahrradInstances.forEach((cleanup, container) => {
    // F-57: Jedes Instanz-Cleanup isoliert kapseln. Wirft ein Cleanup, darf das
    // weder onPageLeave selbst zum Werfen bringen noch die übrigen gemounteten
    // Instanzen vom Abräumen abhalten.
    try {
      if (typeof cleanup === "function") cleanup();
    } catch (err) {
      console.warn(
        "[fahrrad-zaehlstellen-bw] Instanz-Cleanup in onPageLeave fehlgeschlagen:",
        err,
      );
    }
  });
  // F-57: Registry immer vollständig leeren, damit ein zweiter Seitenwechsel
  // keinen Cleanup mehr auslöst – auch wenn ein einzelnes Cleanup geworfen hat.
  fahrradInstances.clear();
}

function app(configdata = {}, enclosingHtmlDivElement) {
  const quelle = String(configdata.apiurl || "").trim();
  if (!quelle || /^\{\{.*\}\}$/.test(quelle) || /^<.*>$/.test(quelle)) {
    enclosingHtmlDivElement.innerHTML =
      '<div class="alert alert-info" role="alert">Es ist keine Datenquelle konfiguriert.</div>';
    return null;
  }

  const fzUid = "i" + ++fzInstanzZaehler;
  const API = configdata.apiurl;
  const RES =
    configdata.resourceid || "bbb274af-580d-4228-851e-c8daf32d3c6e";
  const PAGE = 1000;
  const PAGE_STATION = 10000;
  const DEFAULT_TABLE_PAGE_SIZE = 10;
  const root = enclosingHtmlDivElement;

  // ── Styles injizieren ────────────────────────────────────────────────────
  const STYLE_ID = "fz-app-inline-style";
  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
    .fz-app { font-family: system-ui, sans-serif; background: #f4f6fb; min-height: 100vh; }
    .fz-header { background: linear-gradient(135deg, #1a56db 0%, #0e3a8c 100%);
      color: #fff; padding: 1.5rem 2rem; border-radius: 0 0 1.5rem 1.5rem; margin-bottom: 1.5rem; }
    .fz-header h2 { margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -.5px; }
    .fz-header p  { margin: .25rem 0 0; opacity: .8; font-size: .875rem; }
    .fz-header a { color: #dbeafe; text-decoration: underline; }
    .fz-header a:hover { color: #fff; }
    .fz-kpi { background: #fff; border-radius: 1rem; padding: 1.1rem 1rem;
      box-shadow: 0 2px 12px rgba(0,0,0,.07); text-align: center; height: 100%; }
    .fz-kpi .val { font-size: 1.8rem; font-weight: 800; color: #1a56db; line-height: 1.1; }
    .fz-kpi .val.green  { color: #0d9488; }
    .fz-kpi .val.orange { color: #d97706; }
    .fz-kpi .val.purple { color: #7c3aed; }
    .fz-kpi .lbl { font-size: .78rem; color: #6b7280; margin-top: .3rem; font-weight: 500; }
    .fz-kpi .sub { font-size: .7rem; color: #9ca3af; margin-top: .15rem; }
    .fz-card { background: #fff; border-radius: 1rem;
      box-shadow: 0 2px 12px rgba(0,0,0,.07); overflow: hidden; }
    .fz-card-header { padding: .85rem 1.25rem; border-bottom: 1px solid #f3f4f6;
      font-weight: 700; font-size: .95rem; color: #111827;
      display: flex; align-items: center; justify-content: space-between; }
    .fz-card-header .badge { font-size: .7rem; font-weight: 600;
      background: #eff6ff; color: #1a56db; padding: .25rem .6rem; border-radius: 999px; }
    .fz-filter-bar { background: #fff; border-radius: 1rem;
      box-shadow: 0 2px 12px rgba(0,0,0,.07); padding: 1rem 1.25rem; }
    #fz-map { height: 460px; width: 100%; }
    #fz-map-wrap:fullscreen { background: #fff; padding: .75rem; }
    #fz-map-wrap:fullscreen #fz-map { height: calc(100vh - 1.5rem); }
    #fz-map-wrap:-webkit-full-screen { background: #fff; padding: .75rem; }
    #fz-map-wrap:-webkit-full-screen #fz-map { height: calc(100vh - 1.5rem); }
    #fz-chart-wrap:fullscreen { background: #fff; padding: 1rem; }
    #fz-chart-wrap:fullscreen #fz-chart { height: calc(100vh - 7rem) !important; max-height: none !important; }
    #fz-chart-wrap:-webkit-full-screen { background: #fff; padding: 1rem; }
    #fz-chart-wrap:-webkit-full-screen #fz-chart { height: calc(100vh - 7rem) !important; max-height: none !important; }
    .fz-map-tools { display: flex; align-items: center; gap: .5rem; }
    .fz-chart-tools { display: flex; align-items: center; gap: .5rem; }
    .fz-chart-fullscreen-btn { font-size: .72rem; line-height: 1.2; }
    .fz-map-fullscreen-control {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
      background: #fff;
    }
    .fz-map-fullscreen-control button {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      border: 0;
      line-height: 1;
      background: #fff;
      color: #0f172a;
      cursor: pointer;
    }
    .fz-map-fullscreen-control button:hover { background: #f1f5f9; }
    .fz-map-fullscreen-control button:focus {
      outline: 2px solid #2563eb;
      outline-offset: -2px;
    }
    .fz-table-wrap { max-height: none; overflow: visible; }
    .fz-table thead th { background: #1e293b; color: #fff; font-size: .8rem;
      font-weight: 600; padding: .6rem .75rem; border: none; white-space: nowrap; }
    .fz-table thead th { position: sticky; top: 0; z-index: 2; }
    .fz-map-fullscreen-control button svg {
      width: 16px;
      height: 16px;
      display: block;
      margin: 0;
      fill: currentColor;
      pointer-events: none;
    }
    .fz-table tbody tr:hover { background: #eff6ff !important; }
    .fz-table tbody td { font-size: .82rem; padding: .55rem .75rem;
      border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    .fz-table-search-wrap {
      padding: .7rem 1.25rem .6rem;
      border-bottom: 1px solid #f3f4f6;
      background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
    }
    .fz-table-search-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      flex-wrap: wrap;
    }
    .fz-table-search-label {
      margin: 0;
      font-size: .78rem;
      font-weight: 600;
      color: #64748b;
      white-space: nowrap;
    }
    .fz-table-search-input-wrap {
      position: relative;
      flex: 1 1 280px;
      max-width: 460px;
    }
    .fz-table-search-input-wrap svg {
      position: absolute;
      left: .62rem;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: #94a3b8;
      pointer-events: none;
    }
    .fz-table-search {
      height: 32px;
      padding-left: 1.9rem;
      border-color: #d6deeb;
      font-size: .82rem;
    }
    .fz-table-search:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 .14rem rgba(59, 130, 246, .14);
    }
    .fz-badge-city { display: inline-block; background: #f0fdf4; color: #065f46;
      border-radius: 999px; padding: .15rem .6rem; font-size: .72rem; font-weight: 600; }
    .fz-pagination { display: flex; align-items: center;
      justify-content: space-between; padding: .75rem 1.25rem;
      border-top: 1px solid #f3f4f6; background: #fafafa; }
    .fz-pagination-left,
    .fz-pagination-right { display: flex; align-items: center; gap: .5rem; }
    .fz-page-size-label { font-size: .78rem; color: #6b7280; white-space: nowrap; }
    .fz-load-row { display: flex; align-items: center; gap: .5rem; min-height: 1.4rem; }
    .fz-load-status { font-size: .73rem; color: #6b7280; min-height: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fz-load-status.error { color: #b91c1c; }
    .fz-load-cancel { padding: .1rem .45rem; font-size: .72rem; line-height: 1.2; }
    .fz-spinner { display: flex; align-items: center; justify-content: center;
      padding: 3rem; gap: .75rem; color: #6b7280; font-size: .9rem; }
    .fz-empty { text-align: center; padding: 3rem; color: #9ca3af; font-size: .9rem; }
    .fz-error  { text-align: center; padding: 2rem; color: #dc2626; font-size: .85rem; }
    .fz-sort-btn { cursor: pointer; user-select: none; }
    .fz-sort-btn:hover { color: #93c5fd; }
    .fz-sort-ind { font-size: .72rem; opacity: .9; margin-left: .15rem; }
    .leaflet-popup-content b { color: #1a56db; }
    @media (max-width: 768px) {
      #fz-map { height: 300px; }
      .fz-table-wrap { max-height: none; overflow: visible; }
      .fz-table-search-input-wrap { max-width: none; }
      .fz-kpi .val { font-size: 1.4rem; }
      .fz-header { padding: 1rem; }
      .fz-pagination { flex-wrap: wrap; gap: .5rem; }
    }
  `;
    document.head.appendChild(styleEl);
  }

  const kk = (n) => {
    const t = String(configdata["kpiKontext" + n] || "").trim();
    if (!t) return "";
    return (
      '<button class="fz-kpi-info-toggle collapsed" type="button" data-bs-toggle="collapse" ' +
      'data-bs-target="#fz-kpi-kontext-' + n + '-' + fzUid + '" aria-expanded="false" ' +
      'aria-controls="fz-kpi-kontext-' + n + '-' + fzUid + '" aria-label="Erklärung zu diesem Wert">' +
      '<span class="fz-kpi-info-icon" aria-hidden="true">ⓘ</span></button>' +
      '<div id="fz-kpi-kontext-' + n + '-' + fzUid + '" class="collapse">' +
      '<div class="fz-kpi-kontext">' + escapeHtml(t) + "</div></div>"
    );
  };

  // ── HTML ──────────────────────────────────────────────────────────────────
  enclosingHtmlDivElement.innerHTML = `
  <div class="fz-app">
    <div class="fz-header">
      <h2>🚲 Fahrrad-Zählstellen</h2>
      <p>Eco-Counter Messdaten – interaktive Visualisierung von Fahrradzähldaten</p>
      <p>Diese App zeigt Zeitreihen zu Fahrradfahrten an automatischen Zählstellen.</p>
    </div>
    <div class="px-3 px-md-4">
      <div id="fz-datenfrische" class="text-muted small text-end mb-2"></div>

      <!-- KPIs -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="fz-kpi">
            <div class="val" id="fz-kpi-total">–</div>
            <div class="lbl">Fahrten gesamt</div>
            <div class="sub" id="fz-kpi-total-sub">geladene Messungen</div>
            ${kk(1)}
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="fz-kpi">
            <div class="val green" id="fz-kpi-top">–</div>
            <div class="lbl">Aktivste Zählstelle</div>
            <div class="sub" id="fz-kpi-top-sub">&nbsp;</div>
            ${kk(2)}
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="fz-kpi">
            <div class="val orange" id="fz-kpi-avg">–</div>
            <div class="lbl">Ø Fahrten / Messung</div>
            <div class="sub" id="fz-kpi-avg-sub">&nbsp;</div>
            ${kk(3)}
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="fz-kpi">
            <div class="val purple" id="fz-kpi-total-records">–</div>
            <div class="lbl">Datensätze gesamt</div>
            <div class="sub" id="fz-kpi-stations-sub">&nbsp;</div>
            ${kk(4)}
          </div>
        </div>
      </div>

      <!-- Filter -->
      <div class="fz-filter-bar mb-4">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-3">
            <label class="form-label fw-semibold mb-1" style="font-size:.82rem;">Zählstelle</label>
            <select id="fz-filter-station" class="form-select form-select-sm">
              <option value="">Alle Zählstellen</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label fw-semibold mb-1" style="font-size:.82rem;">Von</label>
            <input type="date" id="fz-filter-from" class="form-control form-control-sm">
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label fw-semibold mb-1" style="font-size:.82rem;">Bis</label>
            <input type="date" id="fz-filter-to" class="form-control form-control-sm">
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label fw-semibold mb-1" style="font-size:.82rem;">Zu ladende Datensätze</label>
            <select id="fz-load-limit" class="form-select form-select-sm">
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
              <option value="1000" selected>1000</option>
              <option value="2000">2000</option>
              <option value="5000">5000</option>
              <option value="10000">10000</option>
              <option value="all">Alle</option>
            </select>
          </div>
          <div class="col-6 col-md-2 d-flex gap-2">
            <button id="fz-btn-filter" class="btn btn-primary btn-sm flex-grow-1">Filtern</button>
            <button id="fz-btn-reset" class="btn btn-outline-secondary btn-sm" title="Filter zurücksetzen">✕</button>
          </div>
        </div>
        <div class="row mt-2">
          <div class="col-12">
            <div class="fz-load-row">
              <div id="fz-load-status" class="fz-load-status">Bereit</div>
              <button id="fz-btn-cancel-load" type="button" class="btn btn-outline-danger btn-sm fz-load-cancel" hidden>Abbrechen</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Karte -->
      <div class="fz-card mb-4">
        <div class="fz-card-header">
          <span>📍 Zählstellen-Standorte</span>
          <div class="fz-map-tools">
            <span class="badge" id="fz-map-badge">lädt…</span>
          </div>
        </div>
        <div id="fz-map-wrap">
          <div id="fz-map"></div>
        </div>
      </div>

      <!-- Chart -->
      <div class="fz-card mb-4">
        <div class="fz-card-header">
          <span>📈 Fahrten-Verlauf</span>
          <div class="fz-chart-tools">
            <button id="fz-btn-chart-fullscreen" class="btn btn-outline-primary btn-sm fz-chart-fullscreen-btn" type="button">Vollbild</button>
            <span class="badge" id="fz-chart-badge">&nbsp;</span>
          </div>
        </div>
        <div id="fz-chart-wrap" class="p-3">
          <canvas id="fz-chart" style="max-height:280px;"></canvas>
        </div>
      </div>

      <!-- Tabelle -->
      <div class="fz-card mb-4">
        <div class="fz-card-header">
          <span>📋 Messdaten</span>
          <span class="badge" id="fz-table-info">–</span>
        </div>
        <div class="fz-table-search-wrap">
          <div class="fz-table-search-row">
            <p class="fz-table-search-label">Schnellsuche in Messdaten</p>
            <div class="fz-table-search-input-wrap">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85 1.06-1.06-3.85-3.85h.338zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
              <input type="search" id="fz-filter-search" class="form-control form-control-sm fz-table-search" placeholder="Suche nach Datum, Zählstelle, Stadt oder Zahlenwerten" aria-label="Suche in Messdaten">
            </div>
          </div>
        </div>
        <div id="fz-table-wrap" class="table-responsive fz-table-wrap">
          <table class="table fz-table mb-0">
            <thead>
              <tr>
                <th class="fz-sort-btn" data-col="iso_timestamp">Datum <span class="fz-sort-ind">↕</span></th>
                <th class="fz-sort-btn" data-col="counter_site">Zählstelle <span class="fz-sort-ind">↕</span></th>
                <th class="fz-sort-btn" data-col="domain_name">Stadt <span class="fz-sort-ind">↕</span></th>
                <th class="text-end fz-sort-btn" data-col="channels_all">Gesamt <span class="fz-sort-ind">↕</span></th>
                <th class="text-end fz-sort-btn" data-col="channels_in">Einwärts <span class="fz-sort-ind">↕</span></th>
                <th class="text-end fz-sort-btn" data-col="channels_out">Auswärts <span class="fz-sort-ind">↕</span></th>
              </tr>
            </thead>
            <tbody id="fz-table-body">
              <tr><td colspan="6">
                <div class="fz-spinner">
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                  Lade Daten…
                </div>
              </td></tr>
            </tbody>
          </table>
        </div>
        <div class="fz-pagination">
          <div class="fz-pagination-left">
            <button id="fz-btn-prev" class="btn btn-outline-secondary btn-sm" disabled>‹ Zurück</button>
            <button id="fz-btn-next" class="btn btn-outline-secondary btn-sm">Weiter ›</button>
          </div>
          <span id="fz-page-info" class="text-muted" style="font-size:.82rem;"></span>
          <div class="fz-pagination-right">
            <label for="fz-page-size-${fzUid}" class="fz-page-size-label">Einträge / Seite</label>
            <select id="fz-page-size-${fzUid}" class="form-select form-select-sm" style="width:auto;">
              <option value="10" selected>10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      <div id="fz-methodik"></div>
      <div id="fz-weitere-infos"></div>

    </div>
  </div>`;

  // ── State ─────────────────────────────────────────────────────────────────
  let currentOffset = 0;
  let totalRecords = 0;
  let allRecords = [];
  let leafletMap = null;
  let chartInstance = null;
  let stationsLoaded = false;
  let stationsLoading = false;
  let sortCol = "iso_timestamp";
  let sortDir = "desc"; // FIX: neueste Daten zuerst als Default
  let tablePage = 1;
  let filteredRecords = [];
  let tableViewRecords = [];
  let tablePageSize = DEFAULT_TABLE_PAGE_SIZE;
  let mapFullscreenBtnEl = null;
  let chartFullscreenBtnEl = null;
  let activeLoadController = null;
  let activeLoadId = 0; // F-44: monotone Lauf-ID – nur der aktuellste Lauf schreibt State/UI
  let isLoadCancelled = false;

  // ── Hilfsfunktionen ───────────────────────────────────────────────────────
  function formatNum(n) {
    return n != null && n !== "" ? Number(n).toLocaleString("de-DE") : "–";
  }
  function formatDate(ts) {
    if (!ts) return "–";
    try {
      return new Date(ts).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    } catch (e) {
      return ts.substring(0, 10);
    }
  }

  function setLoadStatus(text, isError = false) {
    const el = root.querySelector("#fz-load-status");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("error", isError);
  }

  function setLoadCancelVisible(visible) {
    const btn = root.querySelector("#fz-btn-cancel-load");
    if (!btn) return;
    btn.hidden = !visible;
    btn.disabled = !visible;
  }

  function cancelActiveLoad() {
    if (!activeLoadController) return;
    isLoadCancelled = true;
    setLoadStatus("Abbrechen...");
    activeLoadController.abort();
  }

  function getFetchLimit() {
    const raw = root.querySelector("#fz-load-limit").value;
    if (raw === "all") return Number.POSITIVE_INFINITY;
    const selected = Number(raw);
    if (!Number.isFinite(selected) || selected <= 0) return PAGE;
    return Math.min(selected, PAGE_STATION);
  }

  function sortRecords(records) {
    const stringCols = new Set(["counter_site", "domain_name"]);
    const sorted = [...records];
    sorted.sort((a, b) => {
      let cmp = 0;

      if (sortCol === "iso_timestamp") {
        const va = a.iso_timestamp || "";
        const vb = b.iso_timestamp || "";
        cmp = String(va).localeCompare(String(vb));
      } else if (stringCols.has(sortCol)) {
        const va = a[sortCol] || "";
        const vb = b[sortCol] || "";
        cmp = String(va).localeCompare(String(vb), "de", {
          sensitivity: "base",
        });
      } else {
        const va = Number(a[sortCol]) || 0;
        const vb = Number(b[sortCol]) || 0;
        cmp = va - vb;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }

  function refreshSortIndicators() {
    root.querySelectorAll(".fz-sort-btn").forEach((th) => {
      const indicator = th.querySelector(".fz-sort-ind");
      if (!indicator) return;
      if (th.dataset.col !== sortCol) {
        indicator.textContent = "↕";
        return;
      }
      indicator.textContent = sortDir === "asc" ? "↑" : "↓";
    });
  }

  // ── URL bauen ─────────────────────────────────────────────────────────────
  function buildUrl(offset, limitOverride) {
    const station = root.querySelector("#fz-filter-station").value;
    const limit =
      Number.isFinite(limitOverride) && limitOverride > 0
        ? limitOverride
        : getFetchLimit();

    const params = new URLSearchParams({
      resource_id: RES,
      limit: String(limit),
      offset: String(offset),
      sort: "iso_timestamp desc",
    });

    if (station) {
      params.set("filters", JSON.stringify({ counter_site: station }));
    }
    return `${API}?${params.toString()}`;
  }

  // ── Clientseitige Filterung (Zählstelle + Datum) ────────────────────────
  function applyClientFilters(records) {
    const station = root.querySelector("#fz-filter-station").value;
    const from = root.querySelector("#fz-filter-from").value;
    const to = root.querySelector("#fz-filter-to").value;

    if (!station && !from && !to) return records;

    return records.filter((r) => {
      if (station && (r.counter_site || "") !== station) return false;
      if (!r.iso_timestamp) return true;
      const day = r.iso_timestamp.substring(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }

  // ── Tabellen-Suche (nur Tabelle, nicht KPI/Chart/Karte) ────────────────
  function applyTableSearch(records) {
    const input = root.querySelector("#fz-filter-search");
    const query = (input?.value || "").trim().toLowerCase();
    if (!query) return records;

    return records.filter((r) => {
      const values = [
        formatDate(r.iso_timestamp),
        r.counter_site || "",
        r.domain_name || "",
        formatNum(r.channels_all),
        formatNum(r.channels_in),
        formatNum(r.channels_out),
        String(r.channels_all ?? ""),
        String(r.channels_in ?? ""),
        String(r.channels_out ?? ""),
      ];
      return values.join(" ").toLowerCase().includes(query);
    });
  }

  // ── Datenabruf: direkt oder ueber den ODAS-Proxy (proxyAktiv) ─────────────
  async function fetchBatch(offset, limit, signal) {
    const url = buildUrl(offset, limit);

    try {
      const json = await fetchOdasJson(url, configdata, { signal });
      if (!json.success) {
        return { result: null, errors: ["API-Fehler"], aborted: false };
      }
      return { result: json.result, errors: [] };
    } catch (e) {
      if (e && e.name === "AbortError") {
        return { result: null, errors: [], aborted: true };
      }
      return { result: null, errors: [e.message], aborted: false };
    }
  }

  // ── Daten laden ───────────────────────────────────────────────────────────
  async function fetchData(offset, controller, loadId) {
    const requestedLimit = getFetchLimit();
    const loadAll = !Number.isFinite(requestedLimit);
    const records = [];
    let currentOffset = offset;
    let total = 0;
    const allErrors = [];
    let safetyCounter = 0;

    isLoadCancelled = false;
    setLoadCancelVisible(true);

    setLoadStatus("Lade Datensätze...");

    while (
      (loadAll || records.length < requestedLimit) &&
      safetyCounter < 1000
    ) {
      safetyCounter += 1;
      const remaining = loadAll
        ? PAGE_STATION
        : requestedLimit - records.length;
      const batchLimit = Math.min(PAGE_STATION, Math.max(1, remaining));
      const { result, errors, aborted } = await fetchBatch(
        currentOffset,
        batchLimit,
        controller.signal,
      );
      // F-44: Wurde dieser Lauf durch einen neueren Lauf (oder den Teardown)
      // überholt, die Schleife beenden und kein weiteres Fetch starten.
      if (activeLoadController !== controller || loadId !== activeLoadId) {
        return null;
      }
      if (aborted) {
        if (activeLoadController === controller && loadId === activeLoadId) {
          setLoadCancelVisible(false);
          if (isLoadCancelled) {
            setLoadStatus("Ladevorgang abgebrochen");
            root.querySelector("#fz-table-body").innerHTML =
              `<tr><td colspan="6"><div class="fz-empty">Ladevorgang abgebrochen.</div></td></tr>`;
          }
        }
        return null;
      }
      if (!result) {
        allErrors.push(...errors);
        break;
      }

      total = Number(result.total) || total;
      const batchRecords = Array.isArray(result.records) ? result.records : [];
      if (batchRecords.length === 0) break;

      records.push(...batchRecords);
      currentOffset += batchRecords.length;

      if (activeLoadController === controller && loadId === activeLoadId) {
        if (loadAll && total > 0) {
          setLoadStatus(
            `Lade Datensätze... ${formatNum(records.length)} von ${formatNum(total)}`,
          );
        } else if (!loadAll) {
          setLoadStatus(
            `Lade Datensätze... ${formatNum(records.length)} von ${formatNum(requestedLimit)}`,
          );
        }
      }

      if (currentOffset >= total) break;
    }

    if (records.length > 0) {
      const finalRecords = loadAll ? records : records.slice(0, requestedLimit);
      if (activeLoadController === controller && loadId === activeLoadId) {
        setLoadCancelVisible(false);
        if (total > 0) {
          setLoadStatus(
            `Geladen: ${formatNum(finalRecords.length)} von ${formatNum(total)} Datensätzen`,
          );
        } else {
          setLoadStatus(
            `Geladen: ${formatNum(finalRecords.length)} Datensätze`,
          );
        }
      }
      return {
        total,
        records: finalRecords,
      };
    }

    if (activeLoadController === controller && loadId === activeLoadId) {
      setLoadCancelVisible(false);
      setLoadStatus("Fehler beim Laden der Datensätze", true);
      root.querySelector("#fz-table-body").innerHTML = `
        <tr><td colspan="6">
          <div class="fz-error">
            ⚠️ Fehler beim Laden der Daten:<br>
            <small>${allErrors.join(" | ")}</small>
          </div>
        </td></tr>`;
    }
    return null;
  }

  // ── Alle Zählstellen laden (für Dropdown) ────────────────────────────────
  async function loadAllStations() {
    const stationMap = new Map();
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    let safetyCounter = 0;

    while (offset < total && safetyCounter < 400) {
      safetyCounter += 1;
      const params = new URLSearchParams({
        resource_id: RES,
        limit: String(PAGE_STATION),
        offset: String(offset),
        fields: "counter_site,domain_name",
      });
      const url = `${API}?${params.toString()}`;
      let batchResult = null;
      try {
        const json = await fetchOdasJson(url, configdata);
        if (json.success) batchResult = json.result;
      } catch (e) {
        /* weiter */
      }

      if (!batchResult) break;
      const batchRecords = Array.isArray(batchResult.records)
        ? batchResult.records
        : [];
      if (batchRecords.length === 0) break;

      batchRecords.forEach((r) => {
        const name = (r.counter_site || "").trim();
        if (!name || stationMap.has(name)) return;
        stationMap.set(name, r.domain_name || "");
      });

      total = Number(batchResult.total) || offset + batchRecords.length;
      offset += batchRecords.length;
      if (batchRecords.length < PAGE_STATION) break;
    }

    return Array.from(stationMap.entries()).map(
      ([counter_site, domain_name]) => ({
        counter_site,
        domain_name,
      }),
    );
  }

  // ── Dropdown befüllen ─────────────────────────────────────────────────────
  function appendStationOptions(records) {
    const sel = root.querySelector("#fz-filter-station");
    if (!sel || !Array.isArray(records) || records.length === 0) return;

    const existing = new Set(
      Array.from(sel.options)
        .map((opt) => (opt.value || "").trim())
        .filter(Boolean),
    );

    const cityByName = new Map();
    records.forEach((r) => {
      const name = (r.counter_site || "").trim();
      if (!name) return;
      const city = (r.domain_name || "").trim();
      if (city && !cityByName.get(name)) cityByName.set(name, city);
    });

    const names = [
      ...new Set(records.map((r) => (r.counter_site || "").trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));

    names.forEach((name) => {
      if (existing.has(name)) return;
      existing.add(name);
      const city = cityByName.get(name);
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = city ? `${name} – ${city}` : name;
      sel.appendChild(opt);
    });
  }

  async function populateStationFilter() {
    if (stationsLoaded || stationsLoading) return;
    stationsLoading = true;
    try {
      const records = await loadAllStations();
      if (records.length > 0) {
        appendStationOptions(records);
        stationsLoaded = true;
        // Sicherstellen, dass beim Initialisieren kein alter Browserwert aktiv bleibt.
        root.querySelector("#fz-filter-station").value = "";
      }
    } finally {
      stationsLoading = false;
    }
  }

  // ── Tabelle rendern ───────────────────────────────────────────────────────
  function renderTable(records) {
    const tbody = root.querySelector("#fz-table-body");
    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="fz-empty">Keine Daten gefunden.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = records
      .map(
        (r) => `
      <tr>
        <td>${formatDate(r.iso_timestamp)}</td>
        <td><strong>${escapeHtml(r.counter_site || "–")}</strong></td>
        <td><span class="fz-badge-city">${escapeHtml(r.domain_name || "–")}</span></td>
        <td class="text-end fw-semibold">${formatNum(r.channels_all)}</td>
        <td class="text-end text-muted">${formatNum(r.channels_in)}</td>
        <td class="text-end text-muted">${formatNum(r.channels_out)}</td>
      </tr>`,
      )
      .join("");
  }

  function renderTablePage() {
    const total = tableViewRecords.length;
    const hasSearch = Boolean(
      (root.querySelector("#fz-filter-search")?.value || "").trim(),
    );
    const baseTotal = filteredRecords.length;
    const pages = Math.max(1, Math.ceil(total / tablePageSize));
    if (tablePage > pages) tablePage = pages;

    const start = (tablePage - 1) * tablePageSize;
    const end = Math.min(start + tablePageSize, total);
    const slice = tableViewRecords.slice(start, end);

    renderTable(slice);
    const tableWrap = root.querySelector("#fz-table-wrap");
    if (tableWrap) tableWrap.scrollTop = 0;

    root.querySelector("#fz-page-info").textContent =
      `Seite ${tablePage} von ${pages} · ${formatNum(start + 1)}-${formatNum(end)}`;
    root.querySelector("#fz-btn-prev").disabled = tablePage <= 1;
    root.querySelector("#fz-btn-next").disabled = tablePage >= pages;

    if (total === 0) {
      root.querySelector("#fz-table-info").textContent = hasSearch
        ? `0 Treffer (von ${formatNum(baseTotal)} gefilterten Einträgen)`
        : `0 von ${formatNum(baseTotal)} Einträgen`;
      return;
    }

    root.querySelector("#fz-table-info").textContent = hasSearch
      ? `${formatNum(start + 1)}-${formatNum(end)} von ${formatNum(total)} Treffern`
      : `${formatNum(start + 1)}-${formatNum(end)} von ${formatNum(total)} geladenen Einträgen`;
  }

  // ── KPIs berechnen ────────────────────────────────────────────────────────
  function renderKPIs(filtered, total) {
    const totSum = filtered.reduce(
      (s, r) => s + (Number(r.channels_all) || 0),
      0,
    );
    const avg = filtered.length ? Math.round(totSum / filtered.length) : 0;

    const topMap = {};
    filtered.forEach((r) => {
      const key = r.counter_site || "Unbekannt";
      topMap[key] = (topMap[key] || 0) + (Number(r.channels_all) || 0);
    });
    const topStation = Object.entries(topMap).sort((a, b) => b[1] - a[1])[0];
    const stationCount = new Set(filtered.map((r) => r.counter_site)).size;

    root.querySelector("#fz-kpi-total").textContent = formatNum(totSum);
    root.querySelector("#fz-kpi-total-sub").textContent =
      `${formatNum(filtered.length)} Datensätze geladen · ${formatNum(total)} Datensätze gesamt`;
    root.querySelector("#fz-kpi-top").textContent = topStation
      ? topStation[0]
      : "–";
    root.querySelector("#fz-kpi-top-sub").textContent = topStation
      ? formatNum(topStation[1]) + " Fahrten"
      : "";
    root.querySelector("#fz-kpi-avg").textContent = formatNum(avg);
    root.querySelector("#fz-kpi-avg-sub").textContent =
      `über ${stationCount} Zählstelle(n)`;
    root.querySelector("#fz-kpi-total-records").textContent = formatNum(total);
    root.querySelector("#fz-kpi-stations-sub").textContent = "im Datensatz";
  }



  function renderDatenfrische(records) {
    const el = root.querySelector("#fz-datenfrische");
    if (!el) return;
    let newest = null;
    (records || []).forEach((r) => {
      const ts = r.iso_timestamp;
      if (ts && (!newest || ts > newest)) newest = ts;
    });
    el.innerHTML = newest ? "Daten aktuell bis: " + escapeHtml(formatDate(newest)) : "";
  }

  function renderMethodik(configdata) {
    const wrap = root.querySelector("#fz-methodik");
    if (!wrap) return;
    const hinweis = (configdata.datenquelleHinweis || "").trim();
    const stand = (configdata.datenStand || "").trim();
    if (!hinweis && !stand) {
      wrap.innerHTML = "";
      return;
    }
    const standZeile = stand
      ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
      : "";
    wrap.innerHTML =
      '<div class="accordion mb-4" id="fz-methodik-acc-' + fzUid + '">' +
      '<div class="accordion-item">' +
      '<h2 class="accordion-header">' +
      '<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" ' +
      'data-bs-target="#fz-methodik-body-' + fzUid + '" aria-expanded="false" aria-controls="fz-methodik-body-' + fzUid + '">' +
      "Methodik &amp; Datenquelle</button></h2>" +
      '<div id="fz-methodik-body-' + fzUid + '" class="accordion-collapse collapse" data-bs-parent="#fz-methodik-acc-' + fzUid + '">' +
      '<div class="accordion-body">' +
      standZeile +
      hinweis +
      "</div></div></div></div>";
  }

  function buildSourceLinks(configdata) {
    const links = [];
    const datensatz = (configdata.urlDaten || "").trim();
    const apiurl = (configdata.apiurl || "").trim();
    const resourceid = (configdata.resourceid || "").trim();

    let portal = "";
    try {
      portal = new URL(datensatz || apiurl).origin;
    } catch (e) {
      portal = "";
    }

    if (portal) links.push(["Open-Data-Portal", portal]);
    if (datensatz) links.push(["Datensatz", datensatz]);
    if (datensatz && resourceid) {
      links.push(["Ressource", datensatz.replace(/\/$/, "") + "/resource/" + resourceid]);
    }
    return links;
  }

  function renderWeitereInfos(configdata) {
    const wrap = root.querySelector("#fz-weitere-infos");
    if (!wrap) return;
    const sourceLinks = buildSourceLinks(configdata);
    const extra = (configdata.weiterfuehrendeLinks || "").trim();
    if (sourceLinks.length === 0 && !extra) {
      wrap.innerHTML = "";
      return;
    }
    const linkItems = sourceLinks
      .map(
        ([label, url]) =>
          '<li><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
          escapeHtml(label) + "</a></li>",
      )
      .join("");
    wrap.innerHTML =
      '<div class="fz-card mb-4">' +
      '<div class="fz-card-header"><span>🔗 Datenquelle &amp; weiterführende Links</span></div>' +
      '<div class="p-3">' +
      (linkItems ? '<ul class="mb-' + (extra ? "3" : "0") + '">' + linkItems + "</ul>" : "") +
      (extra ? "<div>" + extra + "</div>" : "") +
      "</div></div>";
  }

  // ── Chart rendern ─────────────────────────────────────────────────────────
  function renderChart(records) {
    if (!window.Chart) return;

    const stationDays = {};
    records.forEach((r) => {
      if (!r.iso_timestamp) return;
      const day = r.iso_timestamp.substring(0, 10);
      const site = r.counter_site || "Unbekannt";
      if (!stationDays[site]) stationDays[site] = {};
      stationDays[site][day] =
        (stationDays[site][day] || 0) + (Number(r.channels_all) || 0);
    });

    const baseDays = [
      ...new Set(Object.values(stationDays).flatMap((d) => Object.keys(d))),
    ].sort();

    let aggregation = "day";
    if (baseDays.length > 365) {
      aggregation = "month";
    } else if (baseDays.length > 120) {
      aggregation = "week";
    }

    function toIsoDate(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    function toBucket(day) {
      if (aggregation === "month") {
        return day.slice(0, 7);
      }
      if (aggregation === "week") {
        const d = new Date(`${day}T00:00:00`);
        if (Number.isNaN(d.getTime())) return day;
        const shift = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - shift);
        return toIsoDate(d);
      }
      return day;
    }

    function formatBucketLabel(bucket) {
      if (aggregation === "month") {
        const [y, m] = bucket.split("-");
        return `${m}/${String(y).slice(2)}`;
      }
      if (aggregation === "week") {
        return `ab ${formatDate(bucket)}`;
      }
      return formatDate(bucket);
    }

    const stationBuckets = {};
    Object.entries(stationDays).forEach(([site, days]) => {
      stationBuckets[site] = {};
      Object.entries(days).forEach(([day, val]) => {
        const bucket = toBucket(day);
        stationBuckets[site][bucket] =
          (stationBuckets[site][bucket] || 0) + (Number(val) || 0);
      });
    });

    const sortedStations = Object.entries(stationBuckets).sort((a, b) => {
      const sa = Object.values(a[1]).reduce(
        (sum, v) => sum + (Number(v) || 0),
        0,
      );
      const sb = Object.values(b[1]).reduce(
        (sum, v) => sum + (Number(v) || 0),
        0,
      );
      return sb - sa;
    });

    const MAX_SERIES = 7;
    const keepCount =
      sortedStations.length > MAX_SERIES
        ? MAX_SERIES - 1
        : sortedStations.length;
    const keptSeries = sortedStations.slice(0, keepCount);
    const hiddenSeries = sortedStations.slice(keepCount);

    const combinedOthers = {};
    hiddenSeries.forEach(([, buckets]) => {
      Object.entries(buckets).forEach(([bucket, val]) => {
        combinedOthers[bucket] =
          (combinedOthers[bucket] || 0) + (Number(val) || 0);
      });
    });

    const seriesEntries = [...keptSeries];
    if (hiddenSeries.length > 0) {
      seriesEntries.push([`Weitere (${hiddenSeries.length})`, combinedOthers]);
    }

    const allBuckets = [
      ...new Set(seriesEntries.flatMap(([, b]) => Object.keys(b))),
    ].sort();
    const labels = allBuckets.map((bucket) => formatBucketLabel(bucket));

    if (allBuckets.length === 0 || seriesEntries.length === 0) {
      root.querySelector("#fz-chart-badge").textContent = "Keine Daten";
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      return;
    }

    const colors = [
      "#1a56db",
      "#0d9488",
      "#d97706",
      "#7c3aed",
      "#dc2626",
      "#0891b2",
    ];
    const datasets = seriesEntries.map(([site, buckets], i) => ({
      label: site,
      data: allBuckets.map((d) => buckets[d] || 0),
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length] + "22",
      fill: false,
      tension: 0.3,
      pointRadius: allBuckets.length < 50 ? 2 : 0,
      borderWidth: 2,
    }));

    const bucketLabel =
      aggregation === "month"
        ? "Monate"
        : aggregation === "week"
          ? "Wochen"
          : "Tage";
    const aggregationLabel =
      aggregation === "month"
        ? "monatlich"
        : aggregation === "week"
          ? "wöchentlich"
          : "täglich";
    root.querySelector("#fz-chart-badge").textContent =
      `${allBuckets.length} ${bucketLabel} · ${datasets.length} Linien · ${aggregationLabel}`;

    const ctx = root.querySelector("#fz-chart").getContext("2d");
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          decimation: {
            enabled: true,
            algorithm: "lttb",
            samples: 220,
          },
          legend: {
            display: datasets.length > 1,
            position: "bottom",
            labels: { boxWidth: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString("de-DE")}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { maxTicksLimit: 12, font: { size: 11 } },
            grid: { color: "#f3f4f6" },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 11 },
              callback: (v) => v.toLocaleString("de-DE"),
            },
            grid: { color: "#f3f4f6" },
          },
        },
      },
    });
  }

  function isChartFullscreen() {
    const wrap = root.querySelector("#fz-chart-wrap");
    return (
      document.fullscreenElement === wrap ||
      document.webkitFullscreenElement === wrap
    );
  }

  function syncChartFullscreenUi() {
    if (!chartFullscreenBtnEl) {
      chartFullscreenBtnEl = root.querySelector("#fz-btn-chart-fullscreen");
    }
    const btn = chartFullscreenBtnEl;
    if (!btn) return;

    btn.textContent = isChartFullscreen() ? "Vollbild beenden" : "Vollbild";
    if (chartInstance) {
      // F-57: nach dem Teardown ist chartInstance null – der Timeout darf
      // dann nicht null.resize() aufrufen, sondern muss die aktuelle Referenz
      // erneut prüfen.
      setTimeout(() => {
        if (chartInstance) chartInstance.resize();
      }, 120);
    }
  }

  function toggleChartFullscreen() {
    const wrap = root.querySelector("#fz-chart-wrap");
    if (!wrap) return;

    if (isChartFullscreen()) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      return;
    }

    if (wrap.requestFullscreen) {
      wrap.requestFullscreen();
    } else if (wrap.webkitRequestFullscreen) {
      wrap.webkitRequestFullscreen();
    }
  }

  // ── Karte rendern ─────────────────────────────────────────────────────────
  function renderMap(records) {
    if (!window.L) return;
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }

    leafletMap = L.map(root.querySelector("#fz-map"), { zoomControl: true }).setView([48.7, 9.1], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(leafletMap);

    const stations = {};
    records.forEach((r) => {
      if (!r.latitude || !r.longitude) return;
      const key = r.counter_site || "Unbekannt";
      if (!stations[key]) {
        stations[key] = {
          lat: r.latitude,
          lon: r.longitude,
          city: r.domain_name || "",
          total: 0,
          count: 0,
        };
      }
      stations[key].total += Number(r.channels_all) || 0;
      stations[key].count += 1;
    });

    const entries = Object.entries(stations);
    const maxVal = Math.max(...entries.map(([, s]) => s.total), 1);
    const bounds = [];

    entries.forEach(([name, s]) => {
      const radius = 8 + Math.round((s.total / maxVal) * 18);
      L.circleMarker([s.lat, s.lon], {
        radius,
        color: "#1a56db",
        fillColor: "#3b82f6",
        fillOpacity: 0.75,
        weight: 2,
      })
        .bindPopup(
          `
        <div style="min-width:160px;">
          <b style="color:#1a56db;font-size:.95rem;">${escapeHtml(name)}</b><br>
          <span style="color:#6b7280;font-size:.8rem;">${escapeHtml(s.city)}</span>
          <hr style="margin:.4rem 0;">
          🚲 <b>${s.total.toLocaleString("de-DE")}</b> Fahrten<br>
          📅 ${s.count} Messungen
        </div>
      `,
        )
        .addTo(leafletMap);
      bounds.push([s.lat, s.lon]);
    });

    if (bounds.length > 0) leafletMap.fitBounds(bounds, { padding: [40, 40] });
    addMapFullscreenControl();
    root.querySelector("#fz-map-badge").textContent =
      `${entries.length} Zählstellen`;
  }

  // ── Haupt-Render-Funktion ─────────────────────────────────────────────────
  async function loadAndRender(offset) {
    if (activeLoadController) {
      isLoadCancelled = false;
      activeLoadController.abort();
    }

    // F-44: Jeder Lauf bekommt einen eigenen Controller + eine monotone
    // Lauf-ID; nur der aktuellste Lauf darf State und UI schreiben.
    const controller = new AbortController();
    const loadId = ++activeLoadId;
    activeLoadController = controller;

    root.querySelector("#fz-table-body").innerHTML = `
      <tr><td colspan="6">
        <div class="fz-spinner">
          <div class="spinner-border spinner-border-sm text-primary"></div>
          Lade Daten…
        </div>
      </td></tr>`;

    const result = await fetchData(offset, controller, loadId);
    // F-44: Fortsetzung nur, wenn dieser Lauf noch der aktuellste ist.
    if (activeLoadController !== controller || loadId !== activeLoadId) return;

    activeLoadController = null;
    if (!result) return;

    totalRecords = result.total;
    allRecords = result.records;

    renderDatenfrische(allRecords);

    // Dropdown sofort mit bereits geladenen Datensätzen nutzbar machen.
    appendStationOptions(allRecords);

    filteredRecords = applyClientFilters(allRecords);
    tableViewRecords = sortRecords(applyTableSearch(filteredRecords));
    tablePage = 1;

    renderTablePage();
    renderKPIs(filteredRecords, totalRecords);

    refreshSortIndicators();
    loadChartJs(() => {
      if (loadId !== activeLoadId) return;
      renderChart(filteredRecords);
    });
    loadLeaflet(() => {
      if (loadId !== activeLoadId) return;
      renderMap(filteredRecords);
    });
  }

  function isMapFullscreen() {
    const wrap = root.querySelector("#fz-map-wrap");
    return (
      document.fullscreenElement === wrap ||
      document.webkitFullscreenElement === wrap
    );
  }

  function syncMapFullscreenUi() {
    const btn = mapFullscreenBtnEl;
    if (!btn) return;
    const fullscreen = isMapFullscreen();
    btn.title = isMapFullscreen()
      ? "Vollbild beenden"
      : "Karte im Vollbild anzeigen";
    btn.innerHTML = fullscreen
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 0v2h3v3h2V0h-5zM1 2h3V0H0v5h2V2zm12 12h-3v2h5v-5h-2v3zM2 11H0v5h5v-2H2v-3z"/></svg>'
      : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1h5v2H3v3H1V1zm9 0h5v5h-2V3h-3V1zM1 10h2v3h3v2H1v-5zm12 3v-3h2v5h-5v-2h3z"/></svg>';
    btn.setAttribute("aria-label", btn.title);
    if (leafletMap) {
      // F-57: nach dem Teardown ist leafletMap null – der Timeout darf dann
      // nicht null.invalidateSize() aufrufen, sondern muss die aktuelle
      // Referenz erneut prüfen.
      setTimeout(() => {
        if (leafletMap) leafletMap.invalidateSize();
      }, 120);
    }
  }

  function toggleMapFullscreen() {
    const wrap = root.querySelector("#fz-map-wrap");
    if (!wrap) return;

    if (isMapFullscreen()) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      return;
    }

    if (wrap.requestFullscreen) {
      wrap.requestFullscreen();
    } else if (wrap.webkitRequestFullscreen) {
      wrap.webkitRequestFullscreen();
    }
  }

  function addMapFullscreenControl() {
    if (!window.L || !leafletMap) return;

    const FullscreenControl = L.Control.extend({
      options: { position: "topright" },
      onAdd() {
        const container = L.DomUtil.create(
          "div",
          "leaflet-control fz-map-fullscreen-control",
        );
        const btn = L.DomUtil.create("button", "", container);
        btn.type = "button";
        mapFullscreenBtnEl = btn;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(btn, "click", L.DomEvent.stop);
        L.DomEvent.on(btn, "click", toggleMapFullscreen);

        syncMapFullscreenUi();
        return container;
      },
    });

    leafletMap.addControl(new FullscreenControl());
  }

  // ── Bibliotheken dynamisch laden ──────────────────────────────────────────
  function loadChartJs(cb) {
    if (window.Chart) {
      cb();
      return;
    }
    const s = document.createElement("script");
    s.src = "vendor/chartjs/chart.umd.min.js";
    s.onload = cb;
    document.head.appendChild(s);
  }

  function loadLeaflet(cb) {
    if (window.L) {
      cb();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "vendor/leaflet/leaflet.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "vendor/leaflet/leaflet.js";
    s.onload = cb;
    document.head.appendChild(s);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  root.querySelector("#fz-btn-filter").addEventListener("click", () => {
    currentOffset = 0;
    loadAndRender(0);
  });

  // FIX: kein stationsLoaded = false → keine Race Condition
  root.querySelector("#fz-btn-reset").addEventListener("click", () => {
    root.querySelector("#fz-filter-station").value = "";
    root.querySelector("#fz-filter-from").value = "";
    root.querySelector("#fz-filter-to").value = "";
    root.querySelector("#fz-filter-search").value = "";
    currentOffset = 0;
    loadAndRender(0);
  });

  root.querySelector("#fz-btn-prev").addEventListener("click", () => {
    if (tablePage <= 1) return;
    tablePage -= 1;
    renderTablePage();
  });

  root.querySelector("#fz-btn-next").addEventListener("click", () => {
    const totalPages = Math.max(
      1,
      Math.ceil(tableViewRecords.length / tablePageSize),
    );
    if (tablePage >= totalPages) return;
    tablePage += 1;
    renderTablePage();
  });

  root.querySelector(`#fz-page-size-${fzUid}`).addEventListener("change", (e) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value) || value <= 0) return;
    tablePageSize = value;
    tablePage = 1;
    renderTablePage();
  });

  root.querySelector("#fz-load-limit").addEventListener("change", () => {
    currentOffset = 0;
    loadAndRender(0);
  });

  root.querySelector("#fz-filter-search").addEventListener("input", () => {
    tablePage = 1;
    tableViewRecords = sortRecords(applyTableSearch(filteredRecords));
    renderTablePage();
  });

  root
    .querySelector("#fz-btn-chart-fullscreen")
    .addEventListener("click", toggleChartFullscreen);

  root
    .querySelector("#fz-btn-cancel-load")
    .addEventListener("click", cancelActiveLoad);

  // Fullscreen-Listener-Referenzen im Instanz-Scope sammeln, damit der
  // onPageLeave-Teardown (F-43) sie wieder entfernen kann.
  const fullscreenListeners = [
    ["fullscreenchange", syncMapFullscreenUi],
    ["webkitfullscreenchange", syncMapFullscreenUi],
    ["fullscreenchange", syncChartFullscreenUi],
    ["webkitfullscreenchange", syncChartFullscreenUi],
  ];
  fullscreenListeners.forEach(([type, fn]) => {
    document.addEventListener(type, fn);
  });

  // Spalten-Sortierung
  root.querySelectorAll(".fz-sort-btn").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortCol = col || "iso_timestamp";
        sortDir = col === "iso_timestamp" ? "desc" : "asc";
      }
      tableViewRecords = sortRecords(applyTableSearch(filteredRecords));
      tablePage = 1;
      renderTablePage();
      refreshSortIndicators();
    });
  });

  // F-43/F-57: Instanz-Cleanup früh in der Registry ablegen – vor dem ersten
  // asynchronen Start (populateStationFilter/loadAndRender), damit ein
  // Seitenwechsel während eines laufenden Daten-/Bibliotheksloads die Instanz
  // sicher über onPageLeave abräumen kann. Der Hook bricht einen laufenden
  // Ladevorgang ab (Token-/Controller-Mechanik aus F-44), entfernt die
  // Fullscreen-Listener und gibt Chart (destroy) sowie Leaflet-Karte (remove)
  // genau einmal frei.
  fahrradInstances.set(enclosingHtmlDivElement, () => {
    isLoadCancelled = true;
    activeLoadId += 1; // F-44: Lauf-Token invalidieren – späte Fortsetzungen sind wirkungslos
    if (activeLoadController) activeLoadController.abort();
    fullscreenListeners.forEach(([type, fn]) => {
      document.removeEventListener(type, fn);
    });
    // F-57: Chart genau einmal via destroy() freigeben.
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    // F-57: Leaflet-Karte genau einmal via remove() freigeben.
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  root.querySelector("#fz-filter-station").value = "";
  root.querySelector("#fz-filter-from").value = "";
  root.querySelector("#fz-filter-to").value = "";
  root.querySelector("#fz-filter-search").value = "";
  populateStationFilter();
  renderMethodik(configdata);
  renderWeitereInfos(configdata);
  refreshSortIndicators();
  syncChartFullscreenUi();
  loadAndRender(0);

  return null;
}

// AUSSERHALB von app() – PFLICHT
function addToHead() {
  return;
}
