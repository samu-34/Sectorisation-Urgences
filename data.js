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
    id: "saint_roch",
    name: "Clinique Saint-Roch",
    color: "#00a6fb",
    location: {
      lat: 43.5846,
      lng: 3.8507,
      city: "Montpellier",
      address: "560 Av. du Colonel André Pavelet dit Villars, 34000 Montpellier"
    },
    phones: {
      urgences: "04 67 61 48 48",
      specialites: "04 67 61 48 00"
    },
    source: {
      label: "Référentiel MediMap",
      note: "Adresse ajustée sur validation manuelle"
    },
    verified_at: "2026-03-19",
    verification_status: "reviewed"
  },
  {
    id: "saint_jean",
    name: "Clinique Saint Jean Sud de France",
    color: "#ff5400",
    location: {
      lat: 43.5747,
      lng: 3.8258,
      city: "Saint-Jean-de-Védas",
      address: "1 place de l'Europe, 34430 Saint-Jean-de-Védas"
    },
    phones: {
      urgences: "04 67 61 44 44",
      specialites: "04 67 61 44 00"
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées historiques à confirmer"
    },
    verified_at: "2026-03-19",
    verification_status: "reviewed"
  },
  {
    id: "beausoleil",
    name: "Clinique Beausoleil",
    color: "#f6bd60",
    location: {
      lat: 43.61148,
      lng: 3.85074,
      city: "Montpellier",
      address: "149 Rue de la Taillade, 34070 Montpellier"
    },
    phones: {
      urgences: "04 67 75 97 97",
      specialites: "04 67 75 97 00"
    },
    source: {
      label: "Référentiel MediMap",
      note: "Adresse validee par l'utilisateur, position cartographique encore a confirmer"
    },
    verified_at: "2026-03-19",
    verification_status: "needs_review"
  },
  {
    id: "lapeyronie",
    name: "CHU Montpellier – Hôpital Lapeyronie",
    color: "#ff0054",
    location: {
      lat: 43.6349,
      lng: 3.8624,
      city: "Montpellier",
      address: "371 avenue du Doyen Gaston Giraud, 34090 Montpellier"
    },
    phones: {
      urgences: "04 67 33 67 33",
      specialites: "04 67 33 67 33"
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées historiques à confirmer"
    },
    verified_at: "2026-03-19",
    verification_status: "reviewed"
  },
  {
    id: "parc",
    name: "Clinique du Parc",
    color: "#29bf12",
    location: {
      lat: 43.6339,
      lng: 3.8988,
      city: "Castelnau-le-Lez",
      address: "50 rue Émile Combes, 34170 Castelnau-le-Lez"
    },
    phones: {
      urgences: "04 67 33 05 05",
      specialites: "04 67 33 05 00"
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées historiques à confirmer"
    },
    verified_at: "2026-03-19",
    verification_status: "reviewed"
  },
  {
    id: "millenaire",
    name: "Clinique du Millénaire",
    color: "#dc2626",
    location: {
      lat: 43.6049,
      lng: 3.9189,
      city: "Montpellier",
      address: "220 boulevard Pénélope, 34960 Montpellier"
    },
    phones: {
      urgences: "04 99 75 60 60",
      specialites: "04 99 75 60 00"
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées historiques à confirmer"
    },
    verified_at: "2026-03-19",
    verification_status: "reviewed"
  }
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
    ["verification_status", record.verification_status]
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
      verification_status: record.verification_status
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
  { id: "cardio_pneumo", label: "Cardiologie / Pneumologie" },
  { id: "gastro_uro", label: "Gastro / Viscéral / Urologie" },
  { id: "trauma", label: "Traumatologie" },
  { id: "divers", label: "Circonstanciel" }
];

// ─────────────────────────────────────────────
// CATALOGUE MOTIFS / SYMPTÔMES
// ─────────────────────────────────────────────
const MOTIF_CATALOG = [
  { label: "Douleur thoracique", filiere: "cardio_pneumo" },
  { label: "Dyspnée", filiere: "cardio_pneumo" },
  { label: "Palpitations", filiere: "cardio_pneumo" },
  { label: "Tachycardie", filiere: "cardio_pneumo" },
  { label: "Bradycardie", filiere: "cardio_pneumo" },
  { label: "Malaise", filiere: "divers" },
  { label: "Lipothymie", filiere: "cardio_pneumo" },
  { label: "Douleur abdominale", filiere: "gastro_uro" },
  { label: "Vomissements", filiere: "gastro_uro" },
  { label: "Diarrhée", filiere: "gastro_uro" },
  { label: "Rectorragies", filiere: "gastro_uro" },
  { label: "Méléna", filiere: "gastro_uro" },
  { label: "Colique néphrétique", filiere: "gastro_uro" },
  { label: "Rétention urinaire", filiere: "gastro_uro" },
  { label: "Chute", filiere: "trauma" },
  { label: "Traumatisme", filiere: "trauma" },
  { label: "Entorse", filiere: "trauma" },
  { label: "Plaie simple", filiere: "trauma" },
  { label: "Altération de l'état général", filiere: "divers" },
  { label: "Douleurs diffuses", filiere: "divers" },
  { label: "Fièvre isolée", filiere: "divers" },
  { label: "Crise d'angoisse", filiere: "divers" }
];

// ─────────────────────────────────────────────
// ZONES GÉOGRAPHIQUES (communes)
// ─────────────────────────────────────────────
const CITY_AREAS = [
  { id: "carnon", city: "Carnon", lat: 43.5498, lng: 4.0381, type: "commune", cloud: "sud_est" },
  { id: "palavas", city: "Palavas-les-Flots", lat: 43.5284, lng: 3.9304, type: "commune", cloud: "sud_est" },
  { id: "saint_jean_de_vedas", city: "Saint-Jean-de-Védas", lat: 43.5735, lng: 3.8286, type: "commune", cloud: "sud_ouest" },
  { id: "villeneuve", city: "Villeneuve-lès-Maguelone", lat: 43.5343, lng: 3.8625, type: "commune", cloud: "sud_ouest" },
  { id: "vic", city: "Vic-la-Gardiole", lat: 43.4906, lng: 3.7982, type: "commune", cloud: "sud_ouest" },
  { id: "gigean", city: "Gigean", lat: 43.5000, lng: 3.7120, type: "commune", cloud: "sud_ouest" },
  { id: "fabregues", city: "Fabrègues", lat: 43.5517, lng: 3.7779, type: "commune", cloud: "sud_ouest" },
  { id: "montbazin", city: "Montbazin", lat: 43.5166, lng: 3.6975, type: "commune", cloud: "sud_ouest" },
  { id: "cournonsec", city: "Cournonsec", lat: 43.5482, lng: 3.7067, type: "commune", cloud: "sud_ouest" },
  { id: "cournonterral", city: "Cournonterral", lat: 43.5591, lng: 3.7198, type: "commune", cloud: "sud_ouest" },
  { id: "pignan", city: "Pignan", lat: 43.5828, lng: 3.7647, type: "commune", cloud: "sud_ouest" },
  { id: "saussan", city: "Saussan", lat: 43.5726, lng: 3.7750, type: "commune", cloud: "sud_ouest" },
  { id: "laverune", city: "Lavérune", lat: 43.5843, lng: 3.8051, type: "commune", cloud: "sud_ouest" },
  { id: "murviel", city: "Murviel-lès-Montpellier", lat: 43.6053, lng: 3.7377, type: "commune", cloud: "ouest" },
  { id: "saint_georges", city: "Saint-Georges-d'Orques", lat: 43.6119, lng: 3.7815, type: "commune", cloud: "ouest" },
  { id: "juvignac", city: "Juvignac", lat: 43.6138, lng: 3.8106, type: "commune", cloud: "ouest" },
  { id: "grabels", city: "Grabels", lat: 43.6487, lng: 3.7981, type: "commune", cloud: "nord" },
  { id: "montarnaud", city: "Montarnaud", lat: 43.6467, lng: 3.6970, type: "commune", cloud: "nord" },
  { id: "combaillaux", city: "Combaillaux", lat: 43.6685, lng: 3.8041, type: "commune", cloud: "nord" },
  { id: "vailhauques", city: "Vailhauquès", lat: 43.6727, lng: 3.7210, type: "commune", cloud: "nord" },
  { id: "murles", city: "Murles", lat: 43.6916, lng: 3.7548, type: "commune", cloud: "nord" },
  { id: "saint_gely", city: "Saint-Gély-du-Fesc", lat: 43.6943, lng: 3.8041, type: "commune", cloud: "nord" },
  { id: "saint_clement", city: "Saint-Clément-de-Rivière", lat: 43.6836, lng: 3.8428, type: "commune", cloud: "nord" },
  { id: "montferrier", city: "Montferrier-sur-Lez", lat: 43.6674, lng: 3.8598, type: "commune", cloud: "nord" },
  { id: "prades", city: "Prades-le-Lez", lat: 43.6983, lng: 3.8736, type: "commune", cloud: "nord" },
  { id: "clapiers", city: "Clapiers", lat: 43.6598, lng: 3.8875, type: "commune", cloud: "est" },
  { id: "jacou", city: "Jacou", lat: 43.6612, lng: 3.9108, type: "commune", cloud: "est" },
  { id: "teyran", city: "Teyran", lat: 43.6856, lng: 3.9290, type: "commune", cloud: "est" },
  { id: "lecres", city: "Le Crès", lat: 43.6472, lng: 3.9391, type: "commune", cloud: "est" },
  { id: "castelnau", city: "Castelnau-le-Lez", lat: 43.6335, lng: 3.9016, type: "commune", cloud: "est" },
  { id: "castries", city: "Castries", lat: 43.6790, lng: 3.9820, type: "commune", cloud: "est" },
  { id: "sussargues", city: "Sussargues", lat: 43.7133, lng: 4.0030, type: "commune", cloud: "est" },
  { id: "saint_drezery", city: "Saint-Drézéry", lat: 43.7318, lng: 3.9788, type: "commune", cloud: "est" },
  { id: "beaulieu", city: "Beaulieu", lat: 43.7287, lng: 3.9964, type: "commune", cloud: "est" },
  { id: "restinclieres", city: "Restinclières", lat: 43.7228, lng: 4.0382, type: "commune", cloud: "est" },
  { id: "mauguio", city: "Mauguio", lat: 43.6168, lng: 4.0073, type: "commune", cloud: "sud_est" },
  { id: "saint_aunes", city: "Saint-Aunès", lat: 43.6408, lng: 4.0088, type: "commune", cloud: "est" },
  { id: "perols", city: "Pérols", lat: 43.5641, lng: 3.9530, type: "commune", cloud: "sud_est" },
  { id: "baillargues", city: "Baillargues", lat: 43.6635, lng: 4.0078, type: "commune", cloud: "est" },
  { id: "lattes-west", city: "Lattes", label: "Lattes — secteur Ouest", lat: 43.561, lng: 3.895, type: "lattes", cloud: "lattes_west" },
  { id: "lattes-east", city: "Lattes", label: "Lattes — secteur Est", lat: 43.561, lng: 3.955, type: "lattes", cloud: "lattes_east" }
];

// ─────────────────────────────────────────────
// QUARTIERS DE MONTPELLIER
// ─────────────────────────────────────────────
const MTP_SUBAREAS = [
  { id: "mtp_hf", label: "Montpellier - Hôpitaux facultés", lat: 43.629, lng: 3.874, cloud: "mtp_hf", bucket: "hopitaux-facultes" },
  { id: "mtp_mosson", label: "Montpellier - Mosson", lat: 43.620, lng: 3.816, cloud: "mtp_mosson", bucket: "mosson" },
  { id: "mtp_cevennes", label: "Montpellier - Cévennes", lat: 43.600, lng: 3.846, cloud: "mtp_cevennes", bucket: "cevennes" },
  { id: "mtp_pres_arenes", label: "Montpellier - Près d'Arènes", lat: 43.588, lng: 3.872, cloud: "mtp_pres_arenes", bucket: "pres-darenes" },
  { id: "mtp_croix_argent", label: "Montpellier - Croix d'Argent", lat: 43.579, lng: 3.832, cloud: "mtp_croix_argent", bucket: "croix-dargent" },
  { id: "mtp_millenaire", label: "Montpellier - Millénaire", lat: 43.603, lng: 3.921, cloud: "mtp_millenaire", bucket: "millenaire" },
  { id: "mtp_port_marianne", label: "Montpellier - Port Marianne", lat: 43.603, lng: 3.905, cloud: "mtp_millenaire", bucket: "millenaire" },
  { id: "mtp_centre_historique", label: "Montpellier - Centre historique", lat: 43.600, lng: 3.875, cloud: "mtp_centre_historique", bucket: "pres-darenes" },
  { id: "mtp_arceaux_gambetta", label: "Montpellier - Arceaux / Gambetta", lat: 43.602, lng: 3.853, cloud: "mtp_arceaux_gambetta", bucket: "pres-darenes" }
];

// ─────────────────────────────────────────────
// NUAGES DE POINTS — configuration géométrique
// ─────────────────────────────────────────────
const CLOUDS = {
  sud_ouest: { center: [43.546, 3.776], rx: 0.090, ry: 0.070, angle: -18 },
  ouest: { center: [43.607, 3.778], rx: 0.050, ry: 0.030, angle: 6 },
  nord: { center: [43.688, 3.795], rx: 0.110, ry: 0.055, angle: 8 },
  est: { center: [43.681, 3.950], rx: 0.105, ry: 0.060, angle: 12 },
  sud_est: { center: [43.548, 3.960], rx: 0.055, ry: 0.040, angle: 12 },
  mauguio_only: { center: [43.6168, 4.0073], rx: 0.040, ry: 0.030, angle: 16 },
  carnon_only: { center: [43.5498, 4.0381], rx: 0.035, ry: 0.025, angle: 10 },
  perols_only: { center: [43.5641, 3.9530], rx: 0.034, ry: 0.024, angle: 8 },
  saint_aunes_only: { center: [43.6408, 4.0088], rx: 0.030, ry: 0.022, angle: 12 },
  baillargues_only: { center: [43.6635, 4.0078], rx: 0.030, ry: 0.022, angle: 12 },
  lattes_west: { center: [43.561, 3.896], rx: 0.028, ry: 0.020, angle: 0 },
  lattes_east: { center: [43.561, 3.955], rx: 0.026, ry: 0.019, angle: 0 },
  mtp_hf: { center: [43.629, 3.874], rx: 0.040, ry: 0.024, angle: 18 },
  mtp_mosson: { center: [43.620, 3.816], rx: 0.034, ry: 0.022, angle: -8 },
  mtp_cevennes: { center: [43.600, 3.846], rx: 0.026, ry: 0.018, angle: 5 },
  mtp_pres_arenes: { center: [43.588, 3.872], rx: 0.032, ry: 0.022, angle: 8 },
  mtp_croix_argent: { center: [43.579, 3.832], rx: 0.034, ry: 0.022, angle: -10 },
  mtp_millenaire: { center: [43.603, 3.921], rx: 0.036, ry: 0.022, angle: 16 },
  mtp_centre_historique: { center: [43.600, 3.875], rx: 0.020, ry: 0.015, angle: 0 },
  mtp_arceaux_gambetta: { center: [43.602, 3.853], rx: 0.022, ry: 0.015, angle: -10 }
};

// ─────────────────────────────────────────────
// NUAGES — style visuel
// ─────────────────────────────────────────────
const CLOUD_STYLE = {
  sud_ouest: { density: 240, spread: 0.75, opacity: 0.58, halo: 0.78 },
  ouest: { density: 150, spread: 0.65, opacity: 0.58, halo: 0.68 },
  nord: { density: 210, spread: 0.78, opacity: 0.58, halo: 0.80 },
  est: { density: 240, spread: 0.80, opacity: 0.58, halo: 0.82 },
  sud_est: { density: 150, spread: 0.62, opacity: 0.58, halo: 0.66 },
  mauguio_only: { density: 120, spread: 0.46, opacity: 0.60, halo: 0.54 },
  carnon_only: { density: 90, spread: 0.42, opacity: 0.60, halo: 0.50 },
  perols_only: { density: 100, spread: 0.43, opacity: 0.60, halo: 0.50 },
  saint_aunes_only: { density: 92, spread: 0.40, opacity: 0.60, halo: 0.46 },
  baillargues_only: { density: 92, spread: 0.40, opacity: 0.60, halo: 0.46 },
  lattes_west: { density: 90, spread: 0.45, opacity: 0.62, halo: 0.46 },
  lattes_east: { density: 90, spread: 0.45, opacity: 0.62, halo: 0.46 },
  mtp_hf: { density: 165, spread: 0.48, opacity: 0.60, halo: 0.50 },
  mtp_mosson: { density: 145, spread: 0.50, opacity: 0.60, halo: 0.48 },
  mtp_cevennes: { density: 100, spread: 0.42, opacity: 0.62, halo: 0.42 },
  mtp_pres_arenes: { density: 120, spread: 0.44, opacity: 0.60, halo: 0.44 },
  mtp_croix_argent: { density: 125, spread: 0.46, opacity: 0.60, halo: 0.44 },
  mtp_millenaire: { density: 120, spread: 0.44, opacity: 0.60, halo: 0.44 },
  mtp_centre_historique: { density: 88, spread: 0.34, opacity: 0.64, halo: 0.32 },
  mtp_arceaux_gambetta: { density: 92, spread: 0.35, opacity: 0.64, halo: 0.34 }
};

// ─────────────────────────────────────────────
// NUAGES — ancres géographiques
// ─────────────────────────────────────────────
const CLOUD_ANCHORS = {
  sud_ouest: [
    { lat: 43.5735, lng: 3.8286, w: 1.2 }, { lat: 43.5343, lng: 3.8625, w: 1.0 }, { lat: 43.4906, lng: 3.7982, w: 0.7 },
    { lat: 43.5000, lng: 3.7120, w: 0.7 }, { lat: 43.5517, lng: 3.7779, w: 1.0 }, { lat: 43.5166, lng: 3.6975, w: 0.7 },
    { lat: 43.5482, lng: 3.7067, w: 0.8 }, { lat: 43.5591, lng: 3.7198, w: 0.9 }, { lat: 43.5828, lng: 3.7647, w: 0.9 },
    { lat: 43.5726, lng: 3.7750, w: 0.6 }, { lat: 43.5843, lng: 3.8051, w: 0.8 }
  ],
  ouest: [
    { lat: 43.6053, lng: 3.7377, w: 0.8 }, { lat: 43.6119, lng: 3.7815, w: 1.0 }, { lat: 43.6138, lng: 3.8106, w: 1.2 }
  ],
  nord: [
    { lat: 43.6487, lng: 3.7981, w: 1.0 }, { lat: 43.6467, lng: 3.6970, w: 0.8 }, { lat: 43.6685, lng: 3.8041, w: 0.8 },
    { lat: 43.6727, lng: 3.7210, w: 0.8 }, { lat: 43.6916, lng: 3.7548, w: 0.7 }, { lat: 43.6943, lng: 3.8041, w: 1.1 },
    { lat: 43.6836, lng: 3.8428, w: 1.0 }, { lat: 43.6674, lng: 3.8598, w: 0.9 }, { lat: 43.6983, lng: 3.8736, w: 0.9 }
  ],
  est: [
    { lat: 43.6598, lng: 3.8875, w: 0.9 }, { lat: 43.6612, lng: 3.9108, w: 0.9 }, { lat: 43.6856, lng: 3.9290, w: 0.8 },
    { lat: 43.6472, lng: 3.9391, w: 1.1 }, { lat: 43.6335, lng: 3.9016, w: 1.25 }, { lat: 43.6790, lng: 3.9820, w: 0.8 },
    { lat: 43.7133, lng: 4.0030, w: 0.7 }, { lat: 43.7318, lng: 3.9788, w: 0.7 }, { lat: 43.7287, lng: 3.9964, w: 0.6 },
    { lat: 43.7228, lng: 4.0382, w: 0.6 }, { lat: 43.6408, lng: 4.0088, w: 0.85 }, { lat: 43.6635, lng: 4.0078, w: 0.9 }
  ],
  sud_est: [{ lat: 43.5284, lng: 3.9304, w: 0.9 }],
  mauguio_only: [{ lat: 43.6168, lng: 4.0073, w: 1.25 }],
  carnon_only: [{ lat: 43.5498, lng: 4.0381, w: 1.1 }],
  perols_only: [{ lat: 43.5641, lng: 3.9530, w: 1.1 }],
  saint_aunes_only: [{ lat: 43.6408, lng: 4.0088, w: 1.0 }],
  baillargues_only: [{ lat: 43.6635, lng: 4.0078, w: 1.0 }],
  lattes_west: [{ lat: 43.561, lng: 3.890, w: 1.1 }, { lat: 43.557, lng: 3.902, w: 1.0 }],
  lattes_east: [{ lat: 43.562, lng: 3.944, w: 1.0 }, { lat: 43.559, lng: 3.960, w: 1.1 }],
  mtp_hf: [{ lat: 43.629, lng: 3.874, w: 1.2 }, { lat: 43.633, lng: 3.858, w: 1.0 }, { lat: 43.622, lng: 3.890, w: 0.9 }],
  mtp_mosson: [{ lat: 43.620, lng: 3.816, w: 1.2 }, { lat: 43.623, lng: 3.804, w: 1.0 }, { lat: 43.612, lng: 3.828, w: 0.9 }],
  mtp_cevennes: [{ lat: 43.600, lng: 3.846, w: 1.2 }, { lat: 43.602, lng: 3.834, w: 1.0 }],
  mtp_pres_arenes: [{ lat: 43.588, lng: 3.872, w: 1.1 }, { lat: 43.583, lng: 3.884, w: 1.0 }, { lat: 43.590, lng: 3.858, w: 0.9 }],
  mtp_croix_argent: [{ lat: 43.579, lng: 3.832, w: 1.2 }, { lat: 43.573, lng: 3.842, w: 1.0 }],
  mtp_millenaire: [{ lat: 43.603, lng: 3.921, w: 1.2 }, { lat: 43.606, lng: 3.936, w: 1.0 }, { lat: 43.597, lng: 3.910, w: 0.9 }],
  mtp_centre_historique: [{ lat: 43.600, lng: 3.875, w: 1.3 }, { lat: 43.603, lng: 3.870, w: 1.0 }],
  mtp_arceaux_gambetta: [{ lat: 43.602, lng: 3.853, w: 1.2 }, { lat: 43.597, lng: 3.860, w: 1.0 }]
};

// ─────────────────────────────────────────────
// RÈGLES DE SECTORISATION — par filière
// ─────────────────────────────────────────────
const RULES = {
  cardio_pneumo: {
    saint_roch: ["Palavas-les-Flots"],
    saint_jean: ["Saint-Jean-de-Védas", "Villeneuve-lès-Maguelone", "Vic-la-Gardiole", "Gigean", "Fabrègues", "Montbazin", "Cournonsec", "Cournonterral", "Pignan", "Saussan", "Lavérune"],
    beausoleil: ["Murviel-lès-Montpellier", "Saint-Georges-d'Orques", "Juvignac"],
    lapeyronie: ["Grabels", "Montarnaud", "Combaillaux", "Vailhauquès", "Murles", "Saint-Gély-du-Fesc", "Saint-Clément-de-Rivière", "Montferrier-sur-Lez", "Prades-le-Lez"],
    parc: ["Clapiers", "Jacou", "Teyran", "Le Crès", "Castelnau-le-Lez", "Castries", "Sussargues", "Saint-Drézéry", "Beaulieu", "Restinclières"],
    millenaire: []
  },
  gastro_uro: {
    saint_roch: ["Palavas-les-Flots"],
    saint_jean: ["Saint-Jean-de-Védas", "Villeneuve-lès-Maguelone", "Vic-la-Gardiole", "Gigean", "Fabrègues", "Montbazin", "Cournonsec", "Cournonterral", "Pignan", "Saussan", "Lavérune"],
    beausoleil: ["Murviel-lès-Montpellier", "Saint-Georges-d'Orques", "Juvignac"],
    lapeyronie: ["Grabels", "Montarnaud", "Combaillaux", "Vailhauquès", "Murles", "Saint-Gély-du-Fesc", "Saint-Clément-de-Rivière", "Montferrier-sur-Lez", "Prades-le-Lez", "Clapiers", "Jacou", "Teyran"],
    parc: ["Le Crès", "Castelnau-le-Lez", "Castries", "Sussargues", "Saint-Drézéry", "Beaulieu", "Restinclières"],
    millenaire: []
  },
  trauma: {
    saint_roch: ["Palavas-les-Flots"],
    saint_jean: ["Saint-Jean-de-Védas", "Villeneuve-lès-Maguelone", "Vic-la-Gardiole", "Gigean", "Fabrègues", "Montbazin", "Cournonsec", "Cournonterral", "Pignan", "Saussan", "Lavérune"],
    beausoleil: ["Murviel-lès-Montpellier", "Saint-Georges-d'Orques", "Juvignac"],
    lapeyronie: ["Grabels", "Montarnaud", "Combaillaux", "Vailhauquès", "Murles", "Saint-Gély-du-Fesc", "Saint-Clément-de-Rivière", "Montferrier-sur-Lez", "Prades-le-Lez", "Clapiers", "Jacou", "Teyran"],
    parc: ["Le Crès", "Castelnau-le-Lez", "Castries", "Sussargues", "Saint-Drézéry", "Beaulieu", "Restinclières"],
    millenaire: []
  }
};

// Règles spécifiques Montpellier intra-muros
const MTP_RULES = {
  cardio_pneumo: { "hopitaux-facultes": "lapeyronie", "mosson": "lapeyronie", "pres-darenes": "saint_roch", "croix-dargent": "saint_roch", "cevennes": "beausoleil", "millenaire": "millenaire" },
  gastro_uro: { "hopitaux-facultes": "lapeyronie", "mosson": "lapeyronie", "pres-darenes": "saint_roch", "croix-dargent": "beausoleil", "cevennes": "beausoleil", "millenaire": "millenaire" },
  trauma: { "hopitaux-facultes": "lapeyronie", "mosson": "lapeyronie", "pres-darenes": "saint_roch", "croix-dargent": "saint_roch", "cevennes": "beausoleil", "millenaire": "saint_roch" }
};

const SPECIAL_AREA_RULES = {
  mauguio: { cardio_pneumo: "millenaire", gastro_uro: "millenaire" },
  perols: { cardio_pneumo: "millenaire", gastro_uro: "millenaire", trauma: "saint_roch" },
  saint_aunes: { cardio_pneumo: "millenaire", gastro_uro: "millenaire", trauma: "parc" },
  baillargues: { cardio_pneumo: "millenaire", gastro_uro: "millenaire", trauma: "parc" },
  carnon: { cardio_pneumo: "millenaire", gastro_uro: "millenaire", trauma: "saint_roch" }
};

function resolveHospitalForArea(area, specialty, diversAssignments = {}) {
  if (!area || !specialty) return "lapeyronie";

  if (area.id.startsWith("mtp_")) {
    if (specialty === "divers") return diversAssignments[area.id] || "lapeyronie";
    return (MTP_RULES[specialty] || {})[area.bucket] || "lapeyronie";
  }

  if (SPECIAL_AREA_RULES[area.id] && SPECIAL_AREA_RULES[area.id][specialty]) {
    return SPECIAL_AREA_RULES[area.id][specialty];
  }

  if (area.id === "lattes-west") {
    return specialty === "divers" ? (diversAssignments[area.id] || "saint_roch") : "saint_roch";
  }

  if (area.id === "lattes-east") {
    if (specialty === "divers") return diversAssignments[area.id] || "millenaire";
    return specialty === "trauma" ? "saint_roch" : "millenaire";
  }

  if (specialty === "divers") return diversAssignments[area.id] || "lapeyronie";

  for (const [hospitalId, list] of Object.entries(RULES[specialty] || {})) {
    if (list.includes(area.city)) return hospitalId;
  }

  return "lapeyronie";
}
