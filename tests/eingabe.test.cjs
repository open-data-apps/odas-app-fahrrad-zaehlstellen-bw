const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Lädt die ausgelieferte app/app.js; nur DOM-Grenzen werden gefaked.
const noop = () => {};
const c = vm.createContext({ console, window: { location: { href: "https://fixture.test/app/", pathname: "/app/" }, addEventListener: noop },
  document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [] } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8"), c);

test("Umgekehrter Zeitraum wird erkannt, ein offenes Ende nicht (Live-Befund 27.10.2026)", () => {
  assert.equal(c.fzZeitraumUmgekehrt("2026-10-25", "2026-10-20"), true);
  assert.equal(c.fzZeitraumUmgekehrt("2026-10-23", "2026-10-24"), false);
  assert.equal(c.fzZeitraumUmgekehrt("2026-10-24", "2026-10-24"), false);
  assert.equal(c.fzZeitraumUmgekehrt("", "2026-10-20"), false);
  assert.equal(c.fzZeitraumUmgekehrt("2026-10-25", ""), false);
});

test("Seitenanzeige: leere Tabelle zeigt 0-0 statt 1-0", () => {
  assert.equal(c.fzSeitenInfo(1, 1, 0, 0, 0), "Seite 1 von 1 · 0-0");
  assert.equal(c.fzSeitenInfo(1, 1, 0, 4, 4), "Seite 1 von 1 · 1-4");
  assert.equal(c.fzSeitenInfo(30, 40, 1450, 1500, 2000), "Seite 30 von 40 · 1.451-1.500");
});
