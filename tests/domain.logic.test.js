const test = require("node:test");
const assert = require("node:assert/strict");

const { loadDomainExports } = require("./load-domain");

const { MediMapDomain, CITY_AREAS } = loadDomainExports();

test("simplify normalizes accents, abbreviations and punctuation consistently", () => {
  assert.equal(MediMapDomain.simplify("  St.-Jean-de-Védas  "), "saint jean de vedas");
  assert.equal(MediMapDomain.simplify("Œdème"), "oedeme");
  assert.equal(MediMapDomain.simplify("Près d’Arènes"), "pres d'arenes");
});

test("inferDetectedSpecialty and detectSpecialty resolve expected filieres", () => {
  assert.equal(MediMapDomain.inferDetectedSpecialty("douleur thoracique"), "cardio_pneumo");
  assert.equal(MediMapDomain.inferDetectedSpecialty("colique nephretique"), "gastro_uro");
  assert.equal(MediMapDomain.inferDetectedSpecialty("traumatisme cranien"), "trauma");
  assert.equal(MediMapDomain.inferDetectedSpecialty(""), "");
  assert.equal(MediMapDomain.detectSpecialty(""), "cardio_pneumo");
});

test("resolveCitySelection handles commune, alias and unknown inputs", () => {
  const commune = MediMapDomain.resolveCitySelection("Juvignac");
  assert.equal(commune.matched, true);
  assert.equal(commune.cityValue, "Juvignac");
  assert.equal(commune.subzoneValue, "");
  assert.equal(commune.displayValue, "Juvignac");

  const alias = MediMapDomain.resolveCitySelection("Antigone");
  assert.equal(alias.matched, true);
  assert.equal(alias.cityValue, "Montpellier");
  assert.equal(alias.subzoneValue, "mtp_port_marianne");
  assert.equal(alias.displayValue, "Montpellier - Port Marianne");

  const unknown = MediMapDomain.resolveCitySelection("inconnu");
  assert.equal(unknown.matched, false);
  assert.equal(unknown.cityValue, "");
  assert.equal(unknown.subzoneValue, "");
  assert.equal(unknown.displayValue, "");
});

test("resolveAreaFromSelection and orientation helpers stay coherent", () => {
  const juvignac = MediMapDomain.resolveAreaFromSelection("Juvignac", "");
  assert.equal(juvignac.id, "juvignac");

  const boirargues = MediMapDomain.resolveAreaFromSelection(
    "Lattes",
    "lattes-boirargues",
  );
  assert.equal(boirargues.id, "lattes-boirargues");

  const diversAssignments = MediMapDomain.computeDiversAssignments();
  assert.equal(diversAssignments.saint_bres, "parc");
  assert.equal(
    MediMapDomain.resolveOrientationHospital(
      boirargues,
      "traumatisme du poignet",
      diversAssignments,
    ),
    "saint_roch",
  );

  const travel = MediMapDomain.estimateTheoreticalTravel(
    juvignac,
    "beausoleil",
  );
  assert.ok(travel.directDistanceKm > 0);
  assert.ok(travel.theoreticalDurationMin > 0);
});

test("Mauguio en traumatologie oriente vers la Clinique du Parc", () => {
  const mauguio = MediMapDomain.resolveAreaFromSelection("Mauguio", "");
  const diversAssignments = MediMapDomain.computeDiversAssignments();

  assert.equal(mauguio.id, "mauguio");
  assert.equal(
    MediMapDomain.resolveOrientationHospital(
      mauguio,
      "entorse de cheville",
      diversAssignments,
    ),
    "parc",
  );
});

test("city suggestions expose both communes and quartier aliases", () => {
  const suggestions = MediMapDomain.getCitySuggestions();
  assert.ok(suggestions.some((item) => item.label === "Juvignac"));
  assert.ok(suggestions.some((item) => item.label === "Antigone"));
  assert.ok(
    suggestions.some(
      (item) =>
        item.label === "Lattes - Boirargues" &&
        item.category === "Secteur Lattes",
    ),
  );
});
