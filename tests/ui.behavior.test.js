const test = require("node:test");
const assert = require("node:assert/strict");

const { createAppHarness } = require("./load-app");

test("la saisie d'une commune exacte synchronise la selection interne et produit une orientation", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Juvignac";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Juvignac");
  assert.equal(exports.DOM.subzoneSelect.value, "");
  assert.equal(exports.getCurrentArea().id, "juvignac");
  assert.match(exports.DOM.decisionCard.textContent, /Clinique Beausoleil/);
  assert.match(exports.DOM.toolbar.textContent, /Juvignac/);
  assert.notEqual(exports.getInternalState().routeLayer, null);
});

test("la saisie d'un quartier de Montpellier selectionne la bonne sous-zone", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Montpellier - Mosson";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Montpellier");
  assert.equal(exports.DOM.subzoneSelect.value, "mtp_mosson");
  assert.equal(exports.getCurrentArea().id, "mtp_mosson");
  assert.match(exports.DOM.decisionCard.textContent, /Hôpital Lapeyronie/);
  assert.match(exports.DOM.toolbar.textContent, /Montpellier - Mosson/);
});

test("un alias de quartier intramuros selectionne la sous-zone la plus pertinente", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Antigone";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Montpellier");
  assert.equal(exports.DOM.subzoneSelect.value, "mtp_port_marianne");
  assert.equal(exports.getCurrentArea().id, "mtp_port_marianne");
  assert.match(exports.DOM.decisionCard.textContent, /Clinique du Millénaire/);
  assert.match(exports.DOM.toolbar.textContent, /Montpellier - Port Marianne/);
});

test("la saisie d'un secteur de Lattes selectionne la bonne sous-zone", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Lattes - Boirargues";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Lattes");
  assert.equal(exports.DOM.subzoneSelect.value, "lattes-boirargues");
  assert.equal(exports.getCurrentArea().id, "lattes-boirargues");
  assert.match(exports.DOM.decisionCard.textContent, /Clinique du Millénaire/);
  assert.match(exports.DOM.toolbar.textContent, /Lattes - Boirargues/);
});

test("le bouton Effacer reinitialise la selection, la decision et la carte", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Juvignac";
  exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();
  assert.notEqual(exports.getInternalState().routeLayer, null);

  exports.DOM.focusBtn.dispatchEvent("click");

  assert.equal(exports.DOM.cityInput.value, "");
  assert.equal(exports.DOM.citySelect.value, "");
  assert.equal(exports.DOM.subzoneSelect.value, "");
  assert.equal(exports.DOM.detectedSpecialty.value, "");
  assert.equal(exports.getInternalState().routeLayer, null);
  assert.equal(exports.getInternalState().focusLayer, null);
  assert.match(exports.DOM.decisionCard.textContent, /Aucune décision disponible/);
  assert.equal(exports.DOM.toolbar.textContent, "Carte interactive chargée.");
});
