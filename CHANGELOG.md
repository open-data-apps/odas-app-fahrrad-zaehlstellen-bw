# Changelog

Alle nennenswerten Aenderungen dieser App werden in dieser Datei dokumentiert.

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
