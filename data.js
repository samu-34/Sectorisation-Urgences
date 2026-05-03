/**
 * MediMap — data.js
 * Données métier : hôpitaux, filières, zones, règles de sectorisation
 * Séparé de la logique applicative pour maintenabilité
 */

// ─────────────────────────────────────────────
// ÉTABLISSEMENTS DE SANTÉ
// ─────────────────────────────────────────────
const HOSPITAL_RECORDS = [
  {
    id: "beausoleil",
    name: "Clinique Beausoleil",
    color: "#ff7b00",
    location: {
      lat: 43.609371,
      lng: 3.848698,
      city: "Montpellier",
      address: "149 Rue de la Taillade, 34070 Montpellier",
    },
    phones: {
      urgences: "04 67 75 97 19",
      specialites: "04 67 75 97 00",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur le géocodage de l'adresse",
    },
    verified_at: "2026-03-24",
    verification_status: "reviewed",
  },
  {
    id: "millenaire",
    name: "Clinique du Millénaire",
    color: "#0079FF",
    location: {
      lat: 43.601962,
      lng: 3.913786,
      city: "Montpellier",
      address: "220 boulevard Pénélope, 34960 Montpellier",
    },
    phones: {
      urgences: "04 99 53 63 73",
      specialites: "04 99 75 60 00",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur le géocodage de l'adresse",
    },
    verified_at: "2026-03-24",
    verification_status: "reviewed",
  },
  {
    id: "parc",
    name: "Clinique du Parc",
    color: "#8A8635",
    location: {
      lat: 43.633842,
      lng: 3.893407,
      city: "Castelnau-le-Lez",
      address: "50 rue Émile Combes, 34170 Castelnau-le-Lez",
    },
    phones: {
      urgences: "04 67 75 97 19",
      specialites: "04 67 33 05 00",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur le géocodage de l'adresse",
    },
    verified_at: "2026-03-24",
    verification_status: "reviewed",
  },
  {
    id: "saint_roch",
    name: "Clinique Saint-Roch",
    color: "#FF2DD1",
    location: {
      lat: 43.582811,
      lng: 3.861684,
      city: "Montpellier",
      address:
        "560 Av. du Colonel André Pavelet dit Villars, 34000 Montpellier",
    },
    phones: {
      urgences: "04 67 61 27 27",
      specialites: "04 67 61 48 00",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur le géocodage de l'adresse",
    },
    verified_at: "2026-03-24",
    verification_status: "reviewed",
  },
  {
    id: "saint_jean",
    name: "Clinique Saint-Jean",
    color: "#8C00FF",
    location: {
      lat: 43.570217,
      lng: 3.835075,
      city: "Saint-Jean-de-Védas",
      address: "1 place de l'Europe, 34430 Saint-Jean-de-Védas",
    },
    phones: {
      urgences: "04 67 61 20 04",
      specialites: "04 67 61 44 00",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur le géocodage de l'adresse",
    },
    verified_at: "2026-03-24",
    verification_status: "reviewed",
  },
  {
    id: "lapeyronie",
    name: "CHU Lapeyronie",
    color: "#d81159",
    location: {
      lat: 43.629886,
      lng: 3.851481,
      city: "Montpellier",
      address: "371 avenue du Doyen Gaston Giraud, 34090 Montpellier",
    },
    phones: {
      urgences: "04 67 33 95 02",
      specialites: "04 67 33 67 33",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur le géocodage de l'adresse",
    },
    verified_at: "2026-03-24",
    verification_status: "reviewed",
  },
  {
    id: "trois_vallees",
    name: "Clinique des 3 Vallées",
    color: "#8338ec",
    location: {
      lat: 43.6081013,
      lng: 3.1503237,
      city: "Bédarieux",
      address: "4 Route de Saint-Pons, 34600 Bédarieux",
    },
    phones: {
      urgences: "Non communiqué",
      specialites: "Non communiqué",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur géocodage établissement",
    },
    verified_at: "2026-05-01",
    verification_status: "reviewed",
  },
  {
    id: "pasteur",
    name: "Clinique Pasteur",
    color: "#F67D31",
    location: {
      lat: 43.4564227,
      lng: 3.4233371,
      city: "Pézenas",
      address: "3 Rue Pasteur, 34120 Pézenas",
    },
    phones: {
      urgences: "Non communiqué",
      specialites: "Non communiqué",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur géocodage établissement",
    },
    verified_at: "2026-05-01",
    verification_status: "reviewed",
  },
  {
    id: "saint_privat",
    name: "Clinique Saint-Privat",
    color: "#008BFF",
    location: {
      lat: 43.3672413,
      lng: 3.2547578,
      city: "Boujan-sur-Libron",
      address: "Rue de la Margeride, 34760 Boujan-sur-Libron",
    },
    phones: {
      urgences: "Non communiqué",
      specialites: "Non communiqué",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur géocodage établissement",
    },
    verified_at: "2026-05-01",
    verification_status: "reviewed",
  },
  {
    id: "ch_beziers",
    name: "CH Béziers",
    color: "#DE1A58",
    location: {
      lat: 43.3399156,
      lng: 3.2546494,
      city: "Béziers",
      address: "2 Rue Valentin Haüy, 34500 Béziers",
    },
    phones: {
      urgences: "Non communiqué",
      specialites: "Non communiqué",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées recalées sur géocodage établissement",
    },
    verified_at: "2026-05-01",
    verification_status: "reviewed",
  },
];

function assertHospitalRecord(record, index) {
  const requiredStrings = [
    ["id", record.id],
    ["name", record.name],
    ["color", record.color],
    ["location.city", record.location && record.location.city],
    ["location.address", record.location && record.location.address],
    ["phones.urgences", record.phones && record.phones.urgences],
    ["phones.specialites", record.phones && record.phones.specialites],
    ["source.label", record.source && record.source.label],
    ["verified_at", record.verified_at],
    ["verification_status", record.verification_status],
  ];

  requiredStrings.forEach(([field, value]) => {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Hospital record #${index + 1} is missing ${field}`);
    }
  });

  const lat = record.location && record.location.lat;
  const lng = record.location && record.location.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Hospital ${record.id} has invalid coordinates`);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`Hospital ${record.id} has out-of-range coordinates`);
  }
}

function createHospitalRegistry(records) {
  const seenIds = new Set();
  const entries = records.map((record, index) => {
    assertHospitalRecord(record, index);
    if (seenIds.has(record.id)) {
      throw new Error(`Duplicate hospital id: ${record.id}`);
    }
    seenIds.add(record.id);

    const normalized = {
      id: record.id,
      name: record.name,
      color: record.color,
      lat: record.location.lat,
      lng: record.location.lng,
      city: record.location.city,
      address: record.location.address,
      phone_urgences: record.phones.urgences,
      phone_specialites: record.phones.specialites,
      source: record.source,
      verified_at: record.verified_at,
      verification_status: record.verification_status,
    };

    return [record.id, Object.freeze(normalized)];
  });

  return Object.freeze(Object.fromEntries(entries));
}

const HOSPITALS = createHospitalRegistry(HOSPITAL_RECORDS);

// ─────────────────────────────────────────────
// FILIÈRES DE SPÉCIALITÉ
// ─────────────────────────────────────────────
const SPECIALTIES = [
  { id: "divers", label: "Classique" },
  { id: "cardio_pneumo", label: "Cardiologie / Pneumologie" },
  { id: "gastro_uro", label: "Gastro / Viscéral / Urologie" },
  { id: "trauma", label: "Traumatologie" },
];

// ─────────────────────────────────────────────
// CATALOGUE MOTIFS / SYMPTÔMES
// ─────────────────────────────────────────────
const MOTIF_CATALOG = [
  {
    label: "Malaise",
    filiere: "divers",
    aliases: ["Perte de connaissance"],
  },
  {
    label: "Altération de l'état général",
    filiere: "divers",
    aliases: ["AEG", "Asthénie", "Fatigue intense"],
  },
  {
    label: "Douleurs diffuses",
    filiere: "divers",
    aliases: ["Polyalgies", "Douleurs multiples"],
  },
  {
    label: "Fièvre isolée",
    filiere: "divers",
    aliases: ["Hyperthermie", "Syndrome grippal", "Syndrome fébrile"],
  },
  {
    label: "Crise d'angoisse",
    filiere: "divers",
    aliases: ["Attaque de panique", "Anxiété aiguë", "Crise d'anxiété"],
  },
  {
    label: "Éruption cutanée",
    filiere: "divers",
    aliases: ["Rash", "Urticaire", "Allergie cutanée"],
  },
  {
    label: "Réaction allergique",
    filiere: "divers",
    aliases: ["Allergie", "Œdème", "Oedeme", "Gonflement"],
  },
  {
    label: "Dorsalgie / lombalgie",
    filiere: "divers",
    aliases: ["Mal de dos", "Lumbago", "Douleur lombaire non traumatique"],
  },
  {
    label: "Trouble glycémique",
    filiere: "divers",
    aliases: ["Hypoglycémie", "Malaise diabétique"],
  },
  { label: "Douleur thoracique", filiere: "cardio_pneumo" },
  { label: "Dyspnée", filiere: "cardio_pneumo" },
  { label: "Toux", filiere: "cardio_pneumo" },
  { label: "Hémoptysie", filiere: "cardio_pneumo" },
  {
    label: "Désaturation",
    filiere: "cardio_pneumo",
    aliases: ["Desaturation"],
  },
  { label: "Palpitations", filiere: "cardio_pneumo" },
  { label: "Tachycardie", filiere: "cardio_pneumo" },
  { label: "Bradycardie", filiere: "cardio_pneumo" },
  { label: "Lipothymie", filiere: "cardio_pneumo" },
  {
    label: "HTA",
    filiere: "cardio_pneumo",
    aliases: ["Poussée hypertensive", "Pic tensionnel"],
  },
  { label: "Douleur abdominale", filiere: "gastro_uro" },
  { label: "Vomissements", filiere: "gastro_uro" },
  {
    label: "Diarrhées",
    filiere: "gastro_uro",
    aliases: ["Diarrhée", "Diarrhee"],
  },
  { label: "Hématémèse", filiere: "gastro_uro" },
  { label: "Hémorragie digestive", filiere: "gastro_uro" },
  { label: "Rectorragies", filiere: "gastro_uro" },
  { label: "Méléna", filiere: "gastro_uro" },
  { label: "Occlusion", filiere: "gastro_uro" },
  { label: "Colique néphrétique", filiere: "gastro_uro" },
  {
    label: "Rétention urinaire",
    filiere: "gastro_uro",
    aliases: ["Globe vésical", "Globe urinaire"],
  },
  { label: "Hématurie", filiere: "gastro_uro" },
  { label: "Chute", filiere: "trauma" },
  {
    label: "Traumatisme",
    filiere: "trauma",
    aliases: ["TC", "Trauma", "Traumatisme crânien", "Traumatisme cranien"],
  },
  { label: "Entorse", filiere: "trauma" },
  { label: "Luxation", filiere: "trauma" },
  {
    label: "Fracture",
    filiere: "trauma",
    aliases: ["Déformation", "Deformation"],
  },
  { label: "Plaie simple", filiere: "trauma" },
  {
    label: "Brûlure",
    filiere: "trauma",
    aliases: ["Brulure"],
  },
];

// ─────────────────────────────────────────────
// SECTORISATION — source de données externe
// ─────────────────────────────────────────────
const SECTORIZATION_DATA = globalThis.MEDIMAP_SECTORIZATION_DATA;

if (!SECTORIZATION_DATA) {
  throw new Error(
    "Missing MEDIMAP_SECTORIZATION_DATA. Load generated/sectorization-data.js before data.js.",
  );
}

const CITY_AREAS = Object.freeze(SECTORIZATION_DATA.cityAreas || []);
const MTP_SUBAREAS = Object.freeze(SECTORIZATION_DATA.mtpSubareas || []);
const MAP_CLOUD_AREA_IDS = Object.freeze(
  SECTORIZATION_DATA.mapCloudAreaIds || {},
);
const CLOUDS = Object.freeze(SECTORIZATION_DATA.clouds || {});
const CLOUD_STYLE = Object.freeze(SECTORIZATION_DATA.cloudStyle || {});
const CLOUD_ANCHORS = Object.freeze(SECTORIZATION_DATA.cloudAnchors || {});
const RULES = Object.freeze(SECTORIZATION_DATA.rules || {});
const MTP_RULES = Object.freeze(SECTORIZATION_DATA.mtpRules || {});
const AREA_SPECIALTY_RULES = Object.freeze(
  SECTORIZATION_DATA.areaSpecialtyRules || {},
);
const SECTORIZATION_REFERENCES = Object.freeze(
  SECTORIZATION_DATA.references || {},
);
const BEZIERS_SECTORIZATION = Object.freeze(
  SECTORIZATION_REFERENCES.beziers_ouest_herault || {},
);

const ALL_AREAS = Object.freeze([...CITY_AREAS, ...MTP_SUBAREAS]);

const AREA_BY_ID = Object.freeze(
  Object.fromEntries(ALL_AREAS.map((area) => [area.id, area])),
);

function pickAreaRulesForSpecialty(specialty, areaFilter) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(AREA_SPECIALTY_RULES)
        .filter(([areaId]) => areaFilter(areaId))
        .map(([areaId, rules]) => [areaId, rules[specialty]])
        .filter(([, hospitalId]) => Boolean(hospitalId)),
    ),
  );
}

const MTP_AREA_RULES = Object.freeze({
  cardio_pneumo: pickAreaRulesForSpecialty("cardio_pneumo", (areaId) =>
    areaId.startsWith("mtp_"),
  ),
  gastro_uro: pickAreaRulesForSpecialty("gastro_uro", (areaId) =>
    areaId.startsWith("mtp_"),
  ),
  trauma: pickAreaRulesForSpecialty("trauma", (areaId) =>
    areaId.startsWith("mtp_"),
  ),
});

const DIVERS_MTP_RULES = pickAreaRulesForSpecialty("divers", (areaId) =>
  areaId.startsWith("mtp_"),
);

const DIVERS_AREA_RULES = pickAreaRulesForSpecialty("divers", (areaId) =>
  areaId.startsWith("lattes-"),
);

const DIVERS_CITY_RULES = {
  lapeyronie: [
    "Grabels",
    "Montarnaud",
    "Combaillaux",
    "Vailhauquès",
    "Murles",
    "Saint-Gély-du-Fesc",
    "Saint-Clément-de-Rivière",
    "Montferrier-sur-Lez",
    "Prades-le-Lez",
    "Assas",
    "Les Matelles",
    "Le Triadou",
    "Saint-Jean-de-Cuculles",
    "Saint-Vincent-de-Barbeyrargues",
    "Saint-Mathieu-de-Tréviers",
  ],
  saint_roch: ["Palavas-les-Flots"],
  beausoleil: ["Murviel-lès-Montpellier", "Saint-Georges-d'Orques", "Juvignac"],
  millenaire: [],
  parc: [
    "Castelnau-le-Lez",
    "Vendargues",
    "Clapiers",
    "Jacou",
    "Teyran",
    "Le Crès",
    "Castries",
    "Guzargues",
    "Sussargues",
    "Saint-Drézéry",
    "Beaulieu",
    "Restinclières",
    "Saint-Geniès-des-Mourgues",
    "Montaud",
  ],
  saint_jean: [
    "Saint-Jean-de-Védas",
    "Villeneuve-lès-Maguelone",
    "Vic-la-Gardiole",
    "Gigean",
    "Fabrègues",
    "Montbazin",
    "Cournonsec",
    "Cournonterral",
    "Pignan",
    "Saussan",
    "Lavérune",
    "Mireval",
  ],
};

const SPECIAL_AREA_RULES = Object.freeze(
  Object.fromEntries(
    Object.entries(AREA_SPECIALTY_RULES)
      .filter(
        ([areaId]) =>
          !areaId.startsWith("mtp_") && !areaId.startsWith("lattes-"),
      )
      .map(([areaId, rules]) => [
        areaId,
        Object.freeze(
          Object.fromEntries(
            Object.entries(rules).filter(
              ([specialty]) => specialty !== "divers",
            ),
          ),
        ),
      ]),
  ),
);

const CITY_RULES_BY_SPECIALTY = Object.freeze({
  divers: DIVERS_CITY_RULES,
  cardio_pneumo: RULES.cardio_pneumo,
  gastro_uro: RULES.gastro_uro,
  trauma: RULES.trauma,
});

function resolveHospitalForArea(area, specialty) {
  if (!area || !specialty) return "lapeyronie";

  const explicitAreaRules = AREA_SPECIALTY_RULES[area.id];
  if (explicitAreaRules && explicitAreaRules[specialty]) {
    return explicitAreaRules[specialty];
  }

  if (area.id.startsWith("mtp_")) {
    return (MTP_RULES[specialty] || {})[area.bucket] || "lapeyronie";
  }

  for (const [hospitalId, list] of Object.entries(
    CITY_RULES_BY_SPECIALTY[specialty] || {},
  )) {
    if (list.includes(area.city)) return hospitalId;
  }

  const beziersHospitalId =
    BEZIERS_STRUCTURE_ID_BY_CITY[simplifySectorizationText(area.city)];
  if (beziersHospitalId) {
    return beziersHospitalId;
  }

  return "lapeyronie";
}

function simplifySectorizationText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[œ]/g, "oe")
    .replace(/[æ]/g, "ae")
    .replace(/[’‘`´]/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createBeziersStructureMap() {
  const structures = Array.isArray(BEZIERS_SECTORIZATION.structures)
    ? BEZIERS_SECTORIZATION.structures
    : [];
  return Object.freeze(
    Object.fromEntries(
      structures
        .filter((item) => item && typeof item.id === "string")
        .map((item) => [item.id, Object.freeze({ ...item })]),
    ),
  );
}

const BEZIERS_STRUCTURES_BY_ID = createBeziersStructureMap();

function createBeziersEhpadLookup() {
  const ehpadByStructure = BEZIERS_SECTORIZATION.ehpad || {};
  const entries = [];

  Object.entries(ehpadByStructure).forEach(([structureId, ehpadList]) => {
    if (!Array.isArray(ehpadList)) return;

    ehpadList.forEach((rawLabel) => {
      if (typeof rawLabel !== "string") return;
      const [namePart, communePart = ""] = rawLabel
        .split("—")
        .map((part) => part.trim());
      const key = `${simplifySectorizationText(namePart)}|${simplifySectorizationText(communePart)}`;
      if (!key || key === "|") return;
      entries.push([
        key,
        Object.freeze({
          ehpadName: namePart,
          commune: communePart,
          structureId,
        }),
      ]);
    });
  });

  const exceptionList =
    (BEZIERS_SECTORIZATION.perimetre || {}).exceptionEhpad || [];
  exceptionList.forEach((exceptionItem) => {
    const ehpadName = exceptionItem && exceptionItem.ehpad;
    const commune = exceptionItem && exceptionItem.commune;
    const structureName = exceptionItem && exceptionItem.structure;
    if (!ehpadName || !structureName) return;
    const structure = Object.values(BEZIERS_STRUCTURES_BY_ID).find(
      (item) =>
        simplifySectorizationText(item.nom) ===
        simplifySectorizationText(structureName),
    );
    if (!structure) return;
    const key = `${simplifySectorizationText(ehpadName)}|${simplifySectorizationText(commune)}`;
    entries.push([
      key,
      Object.freeze({
        ehpadName,
        commune: String(commune || ""),
        structureId: structure.id,
        isException: true,
      }),
    ]);
  });

  return Object.freeze(Object.fromEntries(entries));
}

const BEZIERS_EHPAD_LOOKUP = createBeziersEhpadLookup();

const BEZIERS_GEOCODING = Object.freeze(BEZIERS_SECTORIZATION.geocoding || {});
const BEZIERS_COLORS = Object.freeze(
  (BEZIERS_SECTORIZATION.affichageCarte || {}).couleursSuggerees || {},
);
const BEZIERS_GEOCODING_NORMALIZED_INDEX = Object.freeze(
  Object.fromEntries(
    Object.entries(BEZIERS_GEOCODING).map(([rawKey, value]) => {
      const [kind = "", label = "", commune = ""] = rawKey.split(":");
      const normalizedKey = [
        simplifySectorizationText(kind),
        simplifySectorizationText(label),
        simplifySectorizationText(commune),
      ].join(":");
      return [normalizedKey, value];
    }),
  ),
);

function getBeziersGeocodedEntry(kind, label, commune = "") {
  const key = [
    simplifySectorizationText(kind),
    simplifySectorizationText(label),
    simplifySectorizationText(commune),
  ].join(":");
  const entry = BEZIERS_GEOCODING_NORMALIZED_INDEX[key];
  if (!entry) return null;
  if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lng)) return null;
  return Object.freeze({
    lat: entry.lat,
    lng: entry.lng,
    precision: entry.precision || "",
    display_name: entry.display_name || "",
  });
}

function getBeziersStructureColor(structureId, fallback = "#1d4e6a") {
  const hospital = HOSPITALS[structureId];
  if (hospital && typeof hospital.color === "string" && hospital.color.trim()) {
    return hospital.color;
  }
  return BEZIERS_COLORS[structureId] || fallback;
}

function createBeziersStructuresWithCoordinates() {
  const structures = Array.isArray(BEZIERS_SECTORIZATION.structures)
    ? BEZIERS_SECTORIZATION.structures
    : [];
  return Object.freeze(
    structures.map((item) =>
      Object.freeze({
        ...item,
        color: getBeziersStructureColor(item.id, "#1d4e6a"),
        coordinates: getBeziersGeocodedEntry(
          "structure",
          item.nom,
          item.commune,
        ),
      }),
    ),
  );
}

function createBeziersCommunesWithCoordinates() {
  const sectorisationCommunes =
    BEZIERS_SECTORIZATION.sectorisationCommunes || {};
  const structureById = BEZIERS_STRUCTURES_BY_ID;
  const seen = new Set();
  const communes = [];

  Object.entries(sectorisationCommunes).forEach(
    ([structureId, communeNames]) => {
      (communeNames || []).forEach((communeName) => {
        const key = simplifySectorizationText(communeName);
        if (!key || seen.has(key)) return;
        seen.add(key);
        communes.push(
          Object.freeze({
            commune: communeName,
            structureId,
            structureName: (structureById[structureId] || {}).nom || "",
            color: getBeziersStructureColor(structureId, "#9ca3af"),
            coordinates: getBeziersGeocodedEntry("commune", communeName),
          }),
        );
      });
    },
  );

  return Object.freeze(communes);
}

function createBeziersEhpadWithCoordinates() {
  return Object.freeze(
    Object.values(BEZIERS_EHPAD_LOOKUP).map((item) =>
      Object.freeze({
        ...item,
        coordinates: getBeziersGeocodedEntry(
          "ehpad",
          item.ehpadName,
          item.commune,
        ),
      }),
    ),
  );
}

const BEZIERS_STRUCTURES = createBeziersStructuresWithCoordinates();
const BEZIERS_COMMUNES = createBeziersCommunesWithCoordinates();
const BEZIERS_EHPAD = createBeziersEhpadWithCoordinates();
const BEZIERS_STRUCTURE_ID_BY_CITY = Object.freeze(
  Object.fromEntries(
    BEZIERS_COMMUNES.map((item) => [
      simplifySectorizationText(item.commune),
      item.structureId,
    ]),
  ),
);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createBeziersCloudDatasets() {
  const groups = {};
  BEZIERS_COMMUNES.forEach((item) => {
    if (!item.coordinates || !item.structureId) return;
    if (!groups[item.structureId]) groups[item.structureId] = [];
    groups[item.structureId].push(item);
  });

  const clouds = {};
  const cloudStyle = {};
  const cloudAnchors = {};

  Object.entries(groups).forEach(([structureId, communes]) => {
    const key = `beziers_${structureId}`;
    const lats = communes.map((item) => item.coordinates.lat);
    const lngs = communes.map((item) => item.coordinates.lng);
    const meanLat = lats.reduce((sum, value) => sum + value, 0) / lats.length;
    const meanLng = lngs.reduce((sum, value) => sum + value, 0) / lngs.length;
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);

    clouds[key] = {
      center: [meanLat, meanLng],
      rx: clamp(Math.max(0.035, lngSpread * 0.72), 0.035, 0.14),
      ry: clamp(Math.max(0.026, latSpread * 0.72), 0.026, 0.11),
      angle: 0,
    };

    cloudStyle[key] = {
      density: clamp(90 + communes.length * 4, 120, 240),
      spread: 0.72,
      opacity: 0.58,
      halo: 0.72,
    };

    cloudAnchors[key] = communes
      .slice()
      .sort((a, b) => a.commune.localeCompare(b.commune, "fr"))
      .map((item) => ({
        lat: item.coordinates.lat,
        lng: item.coordinates.lng,
        w: 1,
      }));
  });

  return {
    clouds: Object.freeze(clouds),
    cloudStyle: Object.freeze(cloudStyle),
    cloudAnchors: Object.freeze(cloudAnchors),
  };
}

const BEZIERS_CLOUD_DATASETS = createBeziersCloudDatasets();
const BEZIERS_CLOUDS = BEZIERS_CLOUD_DATASETS.clouds;
const BEZIERS_CLOUD_STYLE = BEZIERS_CLOUD_DATASETS.cloudStyle;
const BEZIERS_CLOUD_ANCHORS = BEZIERS_CLOUD_DATASETS.cloudAnchors;
