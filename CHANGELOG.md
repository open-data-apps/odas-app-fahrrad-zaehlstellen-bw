# Changelog

Alle nennenswerten Aenderungen dieser App werden in dieser Datei dokumentiert.

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
