const test = require("node:test");
const assert = require("node:assert/strict");

const { loadDataExports } = require("./load-data");

const {
  HOSPITAL_RECORDS,
  HOSPITALS,
  SPECIALTIES,
  CITY_AREAS,
  MTP_SUBAREAS,
  CLOUDS,
  CLOUD_ANCHORS,
  RULES,
  MTP_RULES,
  SPECIAL_AREA_RULES,
  resolveHospitalForArea
} = loadDataExports();

const STATIC_SPECIALTIES = SPECIALTIES.map((item) => item.id).filter((id) => id !== "divers");
const KNOWN_HOSPITAL_IDS = new Set(Object.keys(HOSPITALS));
const COMMUNE_CITIES = new Set(CITY_AREAS.filter((area) => area.type === "commune").map((area) => area.city));
const AREA_IDS = new Set([...CITY_AREAS, ...MTP_SUBAREAS].map((area) => area.id));
const ALLOWED_VERIFICATION_STATUSES = new Set(["reviewed", "needs_review"]);

function simplify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

test("hospital records expose coherent metadata, addresses and coordinates", () => {
  const seenAddresses = new Set();
  const seenCoordinates = new Set();

  HOSPITAL_RECORDS.forEach((record) => {
    assert.ok(ALLOWED_VERIFICATION_STATUSES.has(record.verification_status), `Unexpected verification_status for ${record.id}`);
    assert.match(record.verified_at, /^\d{4}-\d{2}-\d{2}$/, `Invalid verified_at format for ${record.id}`);
    assert.match(record.location.address, /\b\d{5}\b/, `Missing postal code in address for ${record.id}`);
    assert.ok(
      record.location.address.includes(record.location.city),
      `Address/city mismatch for ${record.id}: ${record.location.address} / ${record.location.city}`
    );

    assert.ok(record.location.lat >= 43.45 && record.location.lat <= 43.75, `Latitude out of expected bounds for ${record.id}`);
    assert.ok(record.location.lng >= 3.65 && record.location.lng <= 4.05, `Longitude out of expected bounds for ${record.id}`);

    const addressKey = record.location.address.toLowerCase();
    assert.ok(!seenAddresses.has(addressKey), `Duplicate address detected for ${record.id}`);
    seenAddresses.add(addressKey);

    const coordinateKey = `${record.location.lat.toFixed(5)},${record.location.lng.toFixed(5)}`;
    assert.ok(!seenCoordinates.has(coordinateKey), `Duplicate coordinates detected for ${record.id}`);
    seenCoordinates.add(coordinateKey);

    const normalized = HOSPITALS[record.id];
    assert.ok(normalized, `Missing normalized hospital for ${record.id}`);
    assert.equal(normalized.address, record.location.address, `Normalized address mismatch for ${record.id}`);
    assert.equal(normalized.city, record.location.city, `Normalized city mismatch for ${record.id}`);
    assert.equal(normalized.lat, record.location.lat, `Normalized latitude mismatch for ${record.id}`);
    assert.equal(normalized.lng, record.location.lng, `Normalized longitude mismatch for ${record.id}`);
  });
});

test("static rules only reference known hospitals and known commune cities without duplicates", () => {
  STATIC_SPECIALTIES.forEach((specialty) => {
    const seenCities = new Map();
    const specialtyRules = RULES[specialty];
    assert.ok(specialtyRules, `Missing rules for specialty ${specialty}`);

    Object.entries(specialtyRules).forEach(([hospitalId, cities]) => {
      assert.ok(KNOWN_HOSPITAL_IDS.has(hospitalId), `Unknown hospital ${hospitalId} in RULES.${specialty}`);

      cities.forEach((city) => {
        assert.ok(COMMUNE_CITIES.has(city), `Unknown commune city "${city}" in RULES.${specialty}.${hospitalId}`);
        assert.ok(!seenCities.has(city), `City "${city}" assigned twice in specialty ${specialty}`);
        seenCities.set(city, hospitalId);
      });
    });
  });
});

test("special overrides and Montpellier rules only reference known entities", () => {
  Object.entries(SPECIAL_AREA_RULES).forEach(([areaId, specialties]) => {
    assert.ok(AREA_IDS.has(areaId), `Unknown area id ${areaId} in SPECIAL_AREA_RULES`);
    const area = CITY_AREAS.find((item) => item.id === areaId);
    Object.entries(specialties).forEach(([specialty, hospitalId]) => {
      assert.ok(STATIC_SPECIALTIES.includes(specialty), `Unknown specialty ${specialty} in SPECIAL_AREA_RULES.${areaId}`);
      assert.ok(KNOWN_HOSPITAL_IDS.has(hospitalId), `Unknown hospital ${hospitalId} in SPECIAL_AREA_RULES.${areaId}.${specialty}`);
      Object.entries(RULES[specialty] || {}).forEach(([ruleHospitalId, cities]) => {
        assert.ok(
          !cities.includes(area.city),
          `City "${area.city}" should not appear in RULES.${specialty}.${ruleHospitalId} because it is handled by SPECIAL_AREA_RULES.${areaId}`
        );
      });
    });
  });

  Object.entries(MTP_RULES).forEach(([specialty, bucketRules]) => {
    assert.ok(STATIC_SPECIALTIES.includes(specialty), `Unknown specialty ${specialty} in MTP_RULES`);
    Object.entries(bucketRules).forEach(([bucket, hospitalId]) => {
      assert.ok(bucket, `Empty bucket in MTP_RULES.${specialty}`);
      assert.ok(KNOWN_HOSPITAL_IDS.has(hospitalId), `Unknown hospital ${hospitalId} in MTP_RULES.${specialty}.${bucket}`);
    });
  });
});

test("Montpellier intramuros areas expose coherent geographic hints and unique search keys", () => {
  const seenSearchKeys = new Map();

  MTP_SUBAREAS.forEach((area) => {
    assert.ok(Array.isArray(area.aliases) && area.aliases.length >= 1, `Missing aliases for ${area.id}`);
    assert.ok(Array.isArray(area.bounds) && area.bounds.length === 2, `Missing bounds for ${area.id}`);
    assert.ok(CLOUDS[area.cloud], `Unknown cloud ${area.cloud} for ${area.id}`);

    const [[southLat, westLng], [northLat, eastLng]] = area.bounds;
    assert.ok(southLat < northLat, `Invalid latitude bounds for ${area.id}`);
    assert.ok(westLng < eastLng, `Invalid longitude bounds for ${area.id}`);
    assert.ok(area.lat >= southLat && area.lat <= northLat, `Center latitude outside bounds for ${area.id}`);
    assert.ok(area.lng >= westLng && area.lng <= eastLng, `Center longitude outside bounds for ${area.id}`);

    [area.label, ...area.aliases].forEach((name) => {
      const key = simplify(name);
      assert.ok(key, `Empty search key for ${area.id}`);
      const previousAreaId = seenSearchKeys.get(key);
      assert.ok(!previousAreaId || previousAreaId === area.id, `Duplicate Montpellier search key "${name}" for ${area.id} and ${previousAreaId}`);
      seenSearchKeys.set(key, area.id);
    });
  });

  const portMarianne = MTP_SUBAREAS.find((area) => area.id === "mtp_port_marianne");
  assert.ok(portMarianne, "Missing Port Marianne area");
  assert.equal(portMarianne.cloud, "mtp_port_marianne");
  assert.equal(portMarianne.bucket, "port-marianne");
});

test("dedicated coastal clouds stay aligned with their commune reference points", () => {
  const cases = [
    ["carnon", "carnon_only"],
    ["perols", "perols_only"],
    ["mauguio", "mauguio_only"]
  ];

  cases.forEach(([areaId, cloudKey]) => {
    const area = CITY_AREAS.find((item) => item.id === areaId);
    assert.ok(area, `Missing area ${areaId}`);
    assert.ok(CLOUDS[cloudKey], `Missing cloud ${cloudKey}`);
    assert.ok(Array.isArray(CLOUD_ANCHORS[cloudKey]) && CLOUD_ANCHORS[cloudKey].length >= 1, `Missing anchors for ${cloudKey}`);

    const [centerLat, centerLng] = CLOUDS[cloudKey].center;
    assert.ok(Math.abs(centerLat - area.lat) < 0.02, `Cloud ${cloudKey} latitude drifts too far from ${areaId}`);
    assert.ok(Math.abs(centerLng - area.lng) < 0.02, `Cloud ${cloudKey} longitude drifts too far from ${areaId}`);

    const anchor = CLOUD_ANCHORS[cloudKey][0];
    assert.ok(Math.abs(anchor.lat - area.lat) < 0.02, `Anchor ${cloudKey} latitude drifts too far from ${areaId}`);
    assert.ok(Math.abs(anchor.lng - area.lng) < 0.02, `Anchor ${cloudKey} longitude drifts too far from ${areaId}`);
  });
});

test("circonstanciel follows the configured territorial sectorisation", () => {
  const areaById = new Map([...CITY_AREAS, ...MTP_SUBAREAS].map((area) => [area.id, area]));

  const expectedAssignments = {
    mtp_centre_historique: "lapeyronie",
    mtp_hf: "lapeyronie",
    mtp_mosson: "lapeyronie",
    assas: "lapeyronie",
    mtp_pres_arenes: "saint_roch",
    mtp_croix_argent: "saint_roch",
    "lattes-centre": "saint_roch",
    "lattes-maurin": "saint_roch",
    mtp_cevennes: "beausoleil",
    mtp_arceaux_gambetta: "beausoleil",
    mtp_port_marianne: "millenaire",
    mtp_millenaire: "millenaire",
    carnon: "millenaire",
    saint_bres: "millenaire",
    "lattes-boirargues": "millenaire",
    baillargues: "parc",
    vendargues: "parc",
    saint_genies_des_mourgues: "parc",
    montaud: "parc",
    mireval: "saint_jean"
  };

  Object.entries(expectedAssignments).forEach(([areaId, hospitalId]) => {
    const area = areaById.get(areaId);
    assert.ok(area, `Missing area ${areaId}`);
    assert.equal(resolveHospitalForArea(area, "divers", {}), hospitalId, `Unexpected divers hospital for ${areaId}`);
  });
});

test("every configured area resolves to a valid hospital for every specialty", () => {
  const allAreas = [...CITY_AREAS, ...MTP_SUBAREAS];

  allAreas.forEach((area) => {
    SPECIALTIES.forEach(({ id: specialty }) => {
      const hospitalId = resolveHospitalForArea(area, specialty, { [area.id]: "lapeyronie" });
      assert.ok(KNOWN_HOSPITAL_IDS.has(hospitalId), `Area ${area.id} resolves to unknown hospital ${hospitalId} for ${specialty}`);
    });
  });
});
