const test = require("node:test");
const assert = require("node:assert/strict");

const { loadApplicationExports } = require("./load-application");

const { MediMapApplication } = loadApplicationExports();

test("les cas d'usage de selection et d'orientation restent coherents", () => {
  const controller = MediMapApplication.createAppController();

  const cityResult = controller.selectCityInput("Mauguio");
  assert.equal(cityResult.selection.matched, true);
  assert.equal(cityResult.state.cityValue, "Mauguio");
  assert.equal(cityResult.state.currentArea.id, "mauguio");

  controller.setSymptomInput("entorse de cheville", { syncMapSpecialty: false });
  const orientationResult = controller.computeOrientation();

  assert.equal(orientationResult.mapSpecialtyChanged, true);
  assert.equal(orientationResult.state.mapSpecialty, "trauma");
  assert.equal(orientationResult.orientation.hospitalId, "parc");
});

test("un motif non reconnu bloque l'orientation sans casser la selection de zone", () => {
  const controller = MediMapApplication.createAppController();

  const cityResult = controller.selectCityInput("Mauguio");
  assert.equal(cityResult.selection.matched, true);
  assert.equal(cityResult.state.currentArea.id, "mauguio");

  controller.setSymptomInput("motif hors catalogue", { syncMapSpecialty: false });
  const orientationResult = controller.computeOrientation();

  assert.equal(orientationResult.mapSpecialtyChanged, false);
  assert.equal(orientationResult.orientation, null);
  assert.equal(orientationResult.state.detectedSpecialty, "");
});

test("refreshSectorisationMap s'appuie sur la configuration declarative des nuages", () => {
  const controller = MediMapApplication.createAppController();

  controller.selectMapSpecialty("trauma");
  const mapResult = controller.refreshSectorisationMap();

  assert.equal(mapResult.specialtyId, "trauma");
  assert.equal(mapResult.cloudHospitalMap.mauguio_only, "parc");
  assert.equal(mapResult.cloudHospitalMap.mtp_hf, "lapeyronie");
});

test("resetSession nettoie la selection et conserve la filiere cartographique courante", () => {
  const controller = MediMapApplication.createAppController();

  controller.selectMapSpecialty("gastro_uro");
  controller.selectCityInput("Montpellier - Mosson");
  controller.setSymptomInput("colique nephretique", { syncMapSpecialty: false });

  const resetResult = controller.resetSession();

  assert.equal(resetResult.state.cityInputValue, "");
  assert.equal(resetResult.state.cityValue, "");
  assert.equal(resetResult.state.subzoneValue, "");
  assert.equal(resetResult.state.symptomInputValue, "");
  assert.equal(resetResult.state.detectedSpecialty, "");
  assert.equal(resetResult.state.mapSpecialty, "gastro_uro");
});
