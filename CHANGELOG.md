# Changelog

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
