# Changelog


## 1.24.0 - 2026-08-17
- `fetchOdasJson()` wirft jetzt bei nicht-JSON-Antworten (CSV, HTML, leerer Body) eine sprechende Konfigurationsfehlermeldung statt der rohen `JSON.parse`-Parserfehlermeldung (F-66)

## 1.23.0 - 2026-08-17
- **CHG:** `instanz-config`-`category`-Vokabular auf Deutsch umgestellt (`allgemein`, `beschreibung`, `datenherkunft`, `kontakt-rechtliches`, `sonstiges`); die entfallenen Kategorien `metrics` und `advanced` wurden auf `beschreibung` bzw. `sonstiges` verteilt

## 1.22.0 - 2026-08-12
- FIX: Laufzeit-Callbacks beim Seitenwechsel freigegeben (F-57): Der aufgerufene Cleanup-Hook gibt `chartInstance` genau einmal per `destroy()` und die Leaflet-Karte genau einmal per `remove()` frei (jeweils Referenz auf `null`). Der Resize-/invalidateSize-Timeout nach Teardown ruft nicht mehr `null.resize()`/`null.invalidateSize()` auf. Die Registry-Instanz wird jetzt vor dem ersten asynchronen Start registriert, sodass ein Seitenwechsel während eines laufenden Daten-/Bibliotheksloads die Instanz sicher abräumt.

## 1.21.0 - 2026-08-12
- FIX: `app/index.html` auf den Template-Stand (F-47): Datei byte-gleich aus `oda-generic` übernommen — gültiges HTML, deutsche ARIA-Labels, Footer im Body; Titel und Fußzeile bleiben Platzhalter und werden zur Laufzeit aus der Instanz-Config überschrieben

## 1.20.0 - 2026-08-11
- FIX: Veraltete Antworten verwerfen (F-44): `fetchOdasResource`/`fetchOdasJson` reichen ein optionales `options.signal` an den tatsächlichen `fetch` (auch Proxy-POST) durch, `fetchBatch` übergibt das AbortSignal, und `fetchData`/`loadAndRender` brechen die Ladeschleife ab bzw. verwerfen die Fortsetzung, sobald ein neuerer Lauf gestartet wurde — nur der aktuellste Lauf schreibt Tabelle, KPIs, Chart, Karte, Ladeanzeige und Zählstellen-Dropdown

## 1.19.0 - 2026-08-11
- FIX: Laufzeitressourcen beim Seitenwechsel freigeben (F-43): neuer `onPageLeave`-Hook entfernt die vier Fullscreen-Listener und bricht einen laufenden Datenladevorgang über `activeLoadController` ab

## 1.18.0 - 2026-08-11
- FIX: XSS- und URL-Vertrag geschlossen (F-35): `escapeHtml` als Top-Level-Helfer geführt und `safeHttpUrl` ergänzt; Tabellenspalten `counter_site`/`domain_name` und die Leaflet-Popup-Inhalte (Name, Stadt) werden escaped

## 1.17.0 - 2026-08-08
- CHG: Bootstrap-Ziele instanzeindeutig (F-32): KPI-Kontext- und Methodik-Accordion-Ziele (`#fz-kpi-kontext-<n>`, `#fz-methodik-acc`/`#fz-methodik-body`) um eine Instanzkennung ergänzt und die Leaflet-Karte containergebunden initialisiert (`L.map(root.querySelector("#fz-map"))` statt `L.map("fz-map")`; die div-ID `fz-map` bleibt unverändert) — mehrere Instanzen derselben App auf einer Seite klappen ihre Panels unabhängig auf, und jede Karte wird im eigenen Container initialisiert

## 1.16.0 - 2026-08-07
- CHG: DOM-Zugriffe auf den App-Container gescopt (F-25, Tranche 4): alle Elemente der App werden über den App-Container (root.querySelector) angesprochen statt über document; unpräfixierte IDs mit `fz-`-Präfix versehen (`kpi-total` → `fz-kpi-total`, `kpi-total-sub` → `fz-kpi-total-sub`, `kpi-top` → `fz-kpi-top`, `kpi-top-sub` → `fz-kpi-top-sub`, `kpi-avg` → `fz-kpi-avg`, `kpi-avg-sub` → `fz-kpi-avg-sub`, `kpi-total-records` → `fz-kpi-total-records`, `kpi-stations-sub` → `fz-kpi-stations-sub`, `chart-badge` → `fz-chart-badge`, `map-badge` → `fz-map-badge`); die Sortier-Buttons (`querySelectorAll(".fz-sort-btn")`) werden über den App-Container gescopt (kein Rename, Klasse)

## 1.15.0 - 2026-08-06
- FIX: Datenschutzangabe beschreibt den tatsaechlichen Stand nach dem Vendoring (Welle G)

## 1.14.0 - 2026-08-06
- FIX: Drittanbietersektion nennt keine Beim-Aufruf-Behauptung mehr (Welle G)

## 1.13.0 - 2026-08-06
- FIX: Base auf Template oda-generic 1.6.0 vereinheitlicht (Hook renderPageOverride)

## 1.12.0 - 2026-08-04
- FIX: Datenschutzhinweis "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Bootstrap/Leaflet/Chart.js) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln, Zusatzbibliotheken) bleiben genannt

## 1.11.0 - 2026-08-04
- FIX: Bootstrap, Leaflet, Chart.js vendored in `app/vendor/` statt von CDN geladen (F-07 Teil 2) — Standalone-Betrieb laedt diese Bibliotheken nicht mehr extern

## 1.10.0 - 2026-08-04
- FIX: Chart.js-Version vereinheitlicht auf 4.4.9 (vorher uneinheitlich gepinnt oder ganz ungepinnt, laedt bei jedem Aufruf die neueste Version) — Voraussetzung fuer das geplante Vendoring (F-07 Teil 2)

## 1.9.0 - 2026-08-04
- FIX: Drittanbieter (CDN, Kartendienste) in `datenschutz`-Default und README dokumentiert (F-07 Teil 1)
- FIX: Bootstrap CSS/JS auf einheitlich 5.3.8 gezogen (vorher gemischt 5.3.0/5.3.1 bzw. 5.3.0/5.3.0) (F-31)

## 1.8.0 - 2026-07-31
- DOC: Standalone-Anleitung individualisiert (F-10) - `proxyAktiv` ist auf `nein` zu
  **setzen** statt zu belassen; Austausch der Datenquelle als eigener Schritt ergaenzt
- DOC: Standalone als eingeschraenkt gekennzeichnet

## 1.7.0 - 2026-07-31
- CHG: Platzhalter-Titel in der lokalen Konfiguration durch den echten App-Titel ersetzt

Alle nennenswerten Aenderungen dieser App werden in dieser Datei dokumentiert.

## 1.6.0 - 2026-07-31
- CHG: toter Konfigurationsschlüssel lizenz entfernt (F-17)
- CHG: brandingCSS und brandingCSSFile als Base-Abhängigkeiten deklariert und lokal gespiegelt (F-17)
- CHG: Groß-/Kleinschreibung der Config-Schlüssel vereinheitlicht, Fallback-Ketten entfernt (F-17)
- CHG: format.typ von "String" auf v1-sicheres "string" korrigiert (F-18)
- CHG: dropdown-Default auf Feldebene verschoben statt in format (F-18)
- CHG: daten.schema auf assets/schema.json gesetzt (F-20)

## 1.5.0 - 2026-07-30

- **FIX:** Laufzeitfehler nach dem Laden der Konfiguration werden jetzt sichtbar gemeldet; `handleRouting()` wird `await`et und besitzt einen Fehlerpfad. Bisher blieb die Seite bei einem Fehler im Seitenaufbau stumm leer
- **FIX:** `getConfigUrl()` schneidet bei einer URL ohne abschliessenden Schraegstrich nicht mehr das letzte Verzeichnis ab; die Konfiguration wird auch unter `.../app` gefunden
- **FIX:** Klick auf einen Hash-Link, der bereits die aktive Seite bezeichnet, rendert die Seite neu (`setupSamePageLinks()`) - das Logo fuehrt damit aus Unteransichten zurueck zur Startseite
- **ENH:** `app/app-base.js` ist wieder byte-identisch zum Template `oda-generic` 1.4.0; app-spezifisches Aufraeumen laeuft ueber den neuen Hook `onPageLeave(page)` in `app/app.js`
- **FIX:** Der Pfad zur Branding-CSS wird jetzt relativ zum App-Verzeichnis aufgeloest (`../assets/branding.css`); bisher wurde die Datei beim lokalen Test unterhalb von `app/` gesucht und deshalb nicht gefunden

## 1.4.0 - 2026-07-24

- **FIX:** Laufzeit-Fehlermeldung wird vor der Anzeige HTML-maskiert (`escapeHtmlForBase`); ein Fehlertext kann kein Markup mehr in die Seite einschleusen (XSS)
- **FIX:** Startseiten-Renderer wird nun `await`et; bei asynchronen Apps erscheint kein kurzzeitiges `[object Promise]` in `#main-content`

## 1.3.0 - 2026-07-23

- **ENH:** Datenabruf auf den Schalter `proxyAktiv` umgestellt; direkte Abrufe sind der Standard, der ODAS-Proxy wird nur noch bei `ja` verwendet
- **ENH:** Einfachen Standalone-Betrieb hinter Traefik mit derselben `odas-config/config.json` wie in der Entwicklung ergänzt
- **ENH:** Traefik-Anbindung auf das externe Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` festgelegt
- **FIX:** Proxy-Basispfad funktioniert jetzt auch bei URLs mit `index.html`; der Ziel-Pfad wird URL-kodiert
- **FIX:** Raten-Schleife über Proxy-Kandidaten und HTTP-Methoden entfernt
- **DOC:** `proxyAktiv` bleibt auf `ja` voreingestellt, weil mobidata-bw.de keinen CORS-Header sendet; Standalone-Betrieb erfordert eine CORS-freigegebene Datenquelle
- **DOC:** Start über `STANDALONE=true make up` dokumentiert

## [1.2.0] - 2026-03-28

### Added

- **Schale 4 – Verständlichkeitskomponenten**: KPI-Kontexttexte (einer pro KPI-Kachel, konfigurierbar), Datenfrische-Anzeige (basierend auf jüngstem Messwert), ausklappbare Methodikbox (Herkunft, Erhebungsmethode, Limitierungen) und Abschnitt „Datenquelle & weiterführende Links" mit automatisch abgeleiteten Quell-Links (Open-Data-Portal, Datensatz, Ressource) plus optionalem Zusatzlink-Bereich.
- **Zählstellen-Dropdown mit Ortsangabe**: Filter-Dropdown zeigt zusätzlich zum Namen der Zählstelle (`counter_site`) den Ort (`domain_name`) an — z.B. `Zählstelle A – Stuttgart`. Die Filterung arbeitet weiterhin mit dem `counter_site`-Wert.

### Changed

- **Beschreibungsseite**: Text ist MobiData-spezifisch: Datensatz-Link verweist korrekt auf die Datensatzseite (statt auf die rohe API-URL), Open-Data-Portal-Link nutzt `{{odp.url}}`, Zielgruppen-Paragraph beschreibt Bürger:innen, Kommunen und Radverkehrsplanung.
- **Impressum**: Um TMG-/MStV-Pflichtangaben erweitert (Vertretungsberechtigte, Registereintrag, USt-IdNr., Verantwortlicher nach § 18 Abs. 2 MStV, Haftungshinweise, Urheberrecht). ODAS-Platzhalter bleiben erhalten.
- **Neue Config-Keys**: `kpiKontext1`–`kpiKontext4`, `datenquelleHinweis`, `datenStand`, `weiterfuehrendeLinks` — alle optional, leer = ausgeblendet.
- **Link-Ableitung**: Portal, Datensatz und Ressource werden aus `urlDaten`/`apiurl`/`resourceid` abgeleitet (kein neuer Config-Key nötig).

## [1.1.0] - 2026-03-27

### Added

- Leaflet-Vollbildsteuerung als integriertes Karten-Control.
- Chart-Vollbildmodus mit Umschalt-Button im Chart-Kopf.
- Auswahl fuer zu ladende Datensatzmenge inkl. Option `Alle`.
- Lade-Statusanzeige mit Fortschritt und Abbrechen-Button fuer lange Ladevorgaenge.
- Auswahl `Eintraege / Seite` in der Tabelle (10/25/50/100), Standardwert 10.

### Changed

- Datenabruf auf robustes Batch-Laden mit Offset/Limit umgestellt, inkl. Proxy-Fallbacks.
- Tabellen-Paginierung auf clientseitiges Paging umgestellt, damit Karte/Chart/KPIs beim Blaettern nicht neu geladen werden.
- Tabellensortierung auf alle relevanten Spalten erweitert, Standard bleibt `Datum absteigend`.
- Chartdarstellung fuer grosse Datenmengen verbessert:
  - adaptive Aggregation (Tag/Woche/Monat)
  - Begrenzung auf Top-Serien plus Sammelserie `Weitere`
  - Decimation fuer bessere Lesbarkeit und Performance
- KPI-Untertitel praezisiert: `Datensaetze geladen` vs. `Datensaetze gesamt`.

### Fixed

- Filterung funktioniert auch nur mit Zaehlstelle ohne Datumsangaben.
- Fehldarstellung am Filter-Button (unerwuenschtes Symbol) entfernt.
- Scroll- und Paging-Verhalten der Tabelle bei Seitenwechsel stabilisiert.

## [1.0.0] - 2026-03-20

### Added

- Initiale Version der App mit KPIs, Zeitreihen-Chart, Leaflet-Karte und Messdatentabelle.
