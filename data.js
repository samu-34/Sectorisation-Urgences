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
    color: "#f5a201",
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
    color: "#e70e02",
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
    color: "#4361ee",
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
    color: "#06d6a0",
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
    color: "#ff4800",
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
    name: "Hôpital Lapeyronie",
    color: "#ff0054",
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
const MAP_CLOUD_AREA_IDS = Object.freeze(SECTORIZATION_DATA.mapCloudAreaIds || {});
const CLOUDS = Object.freeze(SECTORIZATION_DATA.clouds || {});
const CLOUD_STYLE = Object.freeze(SECTORIZATION_DATA.cloudStyle || {});
const CLOUD_ANCHORS = Object.freeze(SECTORIZATION_DATA.cloudAnchors || {});
const RULES = Object.freeze(SECTORIZATION_DATA.rules || {});
const MTP_RULES = Object.freeze(SECTORIZATION_DATA.mtpRules || {});
const AREA_SPECIALTY_RULES = Object.freeze(
  SECTORIZATION_DATA.areaSpecialtyRules || {},
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

  return "lapeyronie";
}
