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
  assert.equal(MediMapDomain.inferDetectedSpecialty("motif inconnu"), "");
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

test("Montpellier address helpers resolve local address forms and geocoded candidates", () => {
  assert.equal(
    MediMapDomain.looksLikeMontpellierAddress("12 rue de la Pompignane, 34000 Montpellier"),
    true,
  );
  assert.equal(MediMapDomain.looksLikeMontpellierAddress("Juvignac"), false);

  const localAddress = MediMapDomain.resolveCitySelection("10 rue Joffre");
  assert.equal(localAddress.matched, true);
  assert.equal(localAddress.cityValue, "Montpellier");
  assert.equal(localAddress.subzoneValue, "mtp_centre_historique");
  assert.equal(localAddress.resolvedPoint !== null, true);
  assert.equal(localAddress.isAddressSelection, true);
  assert.equal(localAddress.resolvedPoint.precision, "address");

  const joffre = MediMapDomain.resolveCitySelection("rue Joffre");
  assert.equal(joffre.matched, true);
  assert.equal(joffre.cityValue, "Montpellier");
  assert.equal(joffre.subzoneValue, "mtp_centre_historique");
  assert.equal(joffre.resolvedPoint !== null, true);
  assert.equal(joffre.resolvedPoint.precision, "street");

  const byLabel = MediMapDomain.resolveMontpellierGeocodeCandidate({
    address: {
      city: "Montpellier",
      suburb: "Antigone",
    },
  });
  assert.equal(byLabel.matched, true);
  assert.equal(byLabel.subzoneValue, "mtp_port_marianne");

  const byCoordinates = MediMapDomain.resolveMontpellierGeocodeCandidate({
    lat: "43.5865",
    lon: "3.858",
    address: {
      city: "Montpellier",
    },
  });
  assert.equal(byCoordinates.matched, true);
  assert.equal(byCoordinates.subzoneValue, "mtp_croix_argent");
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
    MediMapDomain.resolveOrientationHospital(boirargues, "traumatisme du poignet"),
    "saint_roch",
  );

  const travel = MediMapDomain.estimateTheoreticalTravel(
    juvignac,
    "beausoleil",
  );
  assert.ok(travel.directDistanceKm > 0);
  assert.ok(travel.theoreticalDurationMin > 0);
});

test("une commune du secteur Beziers est resolue et orientee vers la bonne structure", () => {
  const beziers = MediMapDomain.resolveAreaFromSelection("Béziers", "");
  assert.ok(beziers);
  assert.equal(beziers.type, "beziers_commune");
  assert.equal(
    MediMapDomain.resolveOrientationHospital(beziers, "douleur thoracique"),
    "ch_beziers",
  );
});

test("Mauguio en traumatologie oriente vers la Clinique du Parc", () => {
  const mauguio = MediMapDomain.resolveAreaFromSelection("Mauguio", "");

  assert.equal(mauguio.id, "mauguio");
  assert.equal(
    MediMapDomain.resolveOrientationHospital(mauguio, "entorse de cheville"),
    "parc",
  );
});

test("un motif saisi mais non reconnu ne declenche pas d'orientation", () => {
  const mauguio = MediMapDomain.resolveAreaFromSelection("Mauguio", "");

  assert.equal(mauguio.id, "mauguio");
  assert.equal(
    MediMapDomain.resolveOrientationHospital(mauguio, "motif hors catalogue"),
    "",
  );
  assert.equal(
    MediMapDomain.resolveOrientationHospital(mauguio, ""),
    "millenaire",
  );
});

test("city suggestions expose both communes and quartier aliases", () => {
  const suggestions = MediMapDomain.getCitySuggestions();
  assert.ok(suggestions.some((item) => item.label === "Juvignac"));
  assert.ok(suggestions.some((item) => item.label === "Antigone"));
  assert.ok(
    suggestions.some(
      (item) =>
        item.label === "Béziers" && item.category === "Commune Béziers",
    ),
  );
  assert.ok(
    suggestions.some(
      (item) =>
        item.label === "Agde" && item.category === "Commune Béziers",
    ),
  );
  assert.ok(
    suggestions.some(
      (item) =>
        item.label === "EHPAD Le Mas du Moulin" &&
        item.category === "EHPAD Béziers",
    ),
  );
  assert.ok(
    suggestions.some(
      (item) =>
        item.label === "Lattes - Boirargues" &&
        item.category === "Secteur Lattes",
    ),
  );
});

test("city suggestions match Beziers EHPAD short alias without EHPAD prefix", () => {
  const suggestions = MediMapDomain.getCitySuggestions();
  const matches = MediMapDomain.getRankedMatches(
    suggestions,
    "Mas du Moulin",
    (item) => [item.label, ...(item.aliases || [])],
  );

  assert.ok(
    matches.some((item) => item.label === "EHPAD Le Mas du Moulin"),
  );
});

test("un EHPAD Beziers peut etre saisi comme localisation et resolu sur sa commune", () => {
  const selection = MediMapDomain.resolveCitySelection("Mas du Moulin");
  assert.equal(selection.matched, true);
  assert.equal(selection.cityValue, "Cers");
});

test("resolveBeziersEhpadOrientation handles exact match, normalized variant and Agde exception", () => {
  const exact = MediMapDomain.resolveBeziersEhpadOrientation(
    "EHPAD Les Jardins de Brescou",
    { commune: "Agde" },
  );
  assert.ok(exact);
  assert.equal(exact.structureId, "pasteur");

  const normalized = MediMapDomain.resolveBeziersEhpadOrientation(
    "ehpad les jardins de brescou",
    { commune: "agde" },
  );
  assert.ok(normalized);
  assert.equal(normalized.structureId, "pasteur");

  const fallback = MediMapDomain.resolveBeziersEhpadOrientation(
    "EHPAD Les Acacias",
  );
  assert.ok(fallback);
  assert.equal(fallback.structureId, "saint_privat");
});
