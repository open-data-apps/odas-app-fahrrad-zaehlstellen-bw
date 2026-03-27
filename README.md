# Fahrrad-Zaehlstellen BW - App fuer den Open Data App-Store (ODAS)

Interaktive Visualisierung von Eco-Counter Fahrradzaehldaten fuer den [Open Data App Store](https://open-data-app-store.de/).
Die App entspricht der [Open Data App-Spezifikation](https://open-data-apps.github.io/open-data-app-docs/open-data-app-spezifikation/).

---

## Funktionen

![Desktop Screenshot 1](assets/Desktop_Screenshot_1.png)

![Desktop Screenshot 2](assets/Desktop_Screenshot_2.png)

![Desktop Screenshot 3](assets/Desktop_Screenshot_3.png)

Single Page Application mit Fokus auf performanter Analyse und einfacher Bedienung:

- **Kennzahlen (KPIs)**: Fahrten gesamt, aktivste Zaehlstelle, Durchschnitt je Messung, Datensaetze gesamt
- **Filterung**: nach Zaehlstelle und Zeitraum (von/bis), auch nur mit Zaehlstelle nutzbar
- **Ladesteuerung**: Auswahl der zu ladenden Datensaetze (100 bis 10000 oder `Alle`), Fortschrittsanzeige und Abbrechen-Button
- **Kartenansicht**: Leaflet-Karte mit aggregierten Zaehlstellenpunkten, Popups und Vollbild-Button als Karten-Control
- **Fahrten-Verlauf**: Chart.js-Zeitreihe mit Vollbildmodus, adaptiver Aggregation (Tag/Woche/Monat), Serienbuendelung fuer grosse Datenmengen und Decimation
- **Messdaten-Tabelle**: Sortierung auf allen relevanten Spalten, clientseitige Pagination ohne Neuladen von Karte/Chart, Eintraege-pro-Seite-Auswahl (10/25/50/100)
- **Robuster Datenabruf**: CKAN-Requests ueber ODAS-Proxy mit Fallback-Strategie und Batch-Ladevorgaengen

---

## Datenformat

Unterstuetzt **CKAN Datastore JSON** (Endpoint `datastore_search`) mit `result.total` und `result.records`.

---

## Kompatible Datensaetze

Datensaetze mit folgenden Kernfeldern (Feldnamen koennen im Quellsystem variieren, die App erwartet diese Inhalte):

| Feld            | Beschreibung                    |
| --------------- | ------------------------------- |
| `iso_timestamp` | Zeitstempel der Messung         |
| `counter_site`  | Name der Zaehlstelle            |
| `domain_name`   | Stadt/Kommune                   |
| `channels_all`  | Gesamtzahl Fahrten je Messpunkt |
| `channels_in`   | Fahrten Einwaerts               |
| `channels_out`  | Fahrten Auswaerts               |
| `latitude`      | Breitengrad der Zaehlstelle     |
| `longitude`     | Laengengrad der Zaehlstelle     |

---

## Entwicklung

**Voraussetzungen:** Docker / Docker Compose, Make

```bash
make build up
```

App laeuft auf http://localhost:8089 (Konfiguration wird lokal geladen).

### Wichtige Dateien

| Datei                      | Beschreibung                                                             |
| -------------------------- | ------------------------------------------------------------------------ |
| `app/app.js`               | Hauptlogik: Datenabruf, Filterung, KPIs, Tabelle, Chart, Karte, Vollbild |
| `app/index.html`           | Einstiegspunkt der App im ODAS-Container                                 |
| `app-package.json`         | App-Metadaten und Instanz-Konfigurationsparameter fuer ODAS              |
| `odas-config/config.json`  | Lokale Konfiguration fuer die Entwicklung                                |
| `assets/odas-app-icon.svg` | App-Icon                                                                 |
| `CHANGELOG.md`             | Versionshistorie                                                         |

---

## Konfiguration (Instanz)

| Parameter      | Beschreibung                                                        | Pflicht |
| -------------- | ------------------------------------------------------------------- | ------- |
| `apiurl`       | Basis-URL zur CKAN Datastore API (`/api/3/action/datastore_search`) | ja      |
| `resourceid`   | Resource-ID des Datensatzes                                         | ja      |
| `urlDaten`     | URL zur Datensatzseite im Open Data Portal                          | ja      |
| `titel`        | Titel innerhalb der App                                             | ja      |
| `seitentitel`  | Browser-Tab-Titel                                                   | ja      |
| `icon`         | Logo/Icon in der Kopfzeile                                          | ja      |
| `beschreibung` | Inhalt fuer den Menuepunkt "Ueber diese App"                        | ja      |
| `kontakt`      | Kontakttext fuer den Menuepunkt "Kontakt"                           | ja      |
| `impressum`    | Impressumstext                                                      | ja      |
| `datenschutz`  | Datenschutztext                                                     | ja      |
| `fusszeile`    | Footer-Text                                                         | ja      |
| `lizenz`       | Lizenzangabe fuer die App                                           | ja      |
| `sprache`      | Sprache der App (aktuell `de`)                                      | ja      |

---

## Autor

(C) 2026, Ondics GmbH
