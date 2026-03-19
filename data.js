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
    color: "#06d6a0",
    location: {
      lat: 43.5846,
      lng: 3.8507,
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
      note: "Adresse ajustée sur validation manuelle",
    },
    verified_at: "2026-03-19",
    verification_status: "reviewed",
  },
  {
    id: "saint_jean",
    name: "Clinique Saint - Jean Sud de France",
    color: "#fd5901",
    location: {
      lat: 43.5747,
      lng: 3.8258,
      city: "Saint-Jean-de-Védas",
      address: "1 place de l'Europe, 34430 Saint-Jean-de-Védas",
    },
    phones: {
      urgences: "04 67 61 20 04",
      specialites: "04 67 61 44 00",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées historiques à confirmer",
    },
    verified_at: "2026-03-19",
    verification_status: "needs_review",
  },
  {
    id: "beausoleil",
    name: "Clinique Beausoleil",
    color: "#f5a201",
    location: {
      lat: 43.61148,
      lng: 3.85074,
      city: "Montpellier",
      address: "149 Rue de la Taillade, 34070 Montpellier",
    },
    phones: {
      urgences: "04 67 75 97 19",
      specialites: "04 67 75 97 00",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Adresse validee par l'utilisateur, position cartographique encore a confirmer",
    },
    verified_at: "2026-03-19",
    verification_status: "needs_review",
  },
  {
    id: "lapeyronie",
    name: "Hôpital Lapeyronie",
    color: "#ff0054",
    location: {
      lat: 43.6349,
      lng: 3.8624,
      city: "Montpellier",
      address: "371 avenue du Doyen Gaston Giraud, 34090 Montpellier",
    },
    phones: {
      urgences: "04 67 33 95 02",
      specialites: "04 67 33 67 33",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées historiques à confirmer",
    },
    verified_at: "2026-03-19",
    verification_status: "needs_review",
  },
  {
    id: "parc",
    name: "Clinique du Parc",
    color: "#4361ee",
    location: {
      lat: 43.6339,
      lng: 3.8988,
      city: "Castelnau-le-Lez",
      address: "50 rue Émile Combes, 34170 Castelnau-le-Lez",
    },
    phones: {
      urgences: "04 67 75 97 19",
      specialites: "04 67 33 05 00",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées historiques à confirmer",
    },
    verified_at: "2026-03-19",
    verification_status: "needs_review",
  },
  {
    id: "millenaire",
    name: "Clinique du Millénaire",
    color: "#d7263d",
    location: {
      lat: 43.6049,
      lng: 3.9189,
      city: "Montpellier",
      address: "220 boulevard Pénélope, 34960 Montpellier",
    },
    phones: {
      urgences: "04 99 53 63 73",
      specialites: "04 99 75 60 00",
    },
    source: {
      label: "Référentiel MediMap",
      note: "Coordonnées historiques à confirmer",
    },
    verified_at: "2026-03-19",
    verification_status: "needs_review",
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
    aliases: ["TC", "Traumatisme crânien", "Traumatisme cranien"],
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
// ZONES GÉOGRAPHIQUES (communes)
// ─────────────────────────────────────────────
const CITY_AREAS = [
  {
    id: "carnon",
    city: "Carnon",
    lat: 43.5468,
    lng: 3.9796,
    type: "commune",
    cloud: "sud_est",
  },
  {
    id: "palavas",
    city: "Palavas-les-Flots",
    lat: 43.5294,
    lng: 3.9346,
    type: "commune",
    cloud: "sud_est",
  },
  {
    id: "saint_jean_de_vedas",
    city: "Saint-Jean-de-Védas",
    lat: 43.5735,
    lng: 3.8286,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "villeneuve",
    city: "Villeneuve-lès-Maguelone",
    lat: 43.5343,
    lng: 3.8625,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "vic",
    city: "Vic-la-Gardiole",
    lat: 43.4906,
    lng: 3.7982,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "gigean",
    city: "Gigean",
    lat: 43.5,
    lng: 3.712,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "fabregues",
    city: "Fabrègues",
    lat: 43.5517,
    lng: 3.7779,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "montbazin",
    city: "Montbazin",
    lat: 43.5166,
    lng: 3.6975,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "cournonsec",
    city: "Cournonsec",
    lat: 43.5482,
    lng: 3.7067,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "cournonterral",
    city: "Cournonterral",
    lat: 43.5591,
    lng: 3.7198,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "pignan",
    city: "Pignan",
    lat: 43.5828,
    lng: 3.7647,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "saussan",
    city: "Saussan",
    lat: 43.5726,
    lng: 3.775,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "laverune",
    city: "Lavérune",
    lat: 43.5843,
    lng: 3.8051,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "murviel",
    city: "Murviel-lès-Montpellier",
    lat: 43.6053,
    lng: 3.7377,
    type: "commune",
    cloud: "ouest",
  },
  {
    id: "saint_georges",
    city: "Saint-Georges-d'Orques",
    lat: 43.6119,
    lng: 3.7815,
    type: "commune",
    cloud: "ouest",
  },
  {
    id: "juvignac",
    city: "Juvignac",
    lat: 43.6138,
    lng: 3.8106,
    type: "commune",
    cloud: "ouest",
  },
  {
    id: "grabels",
    city: "Grabels",
    lat: 43.6487,
    lng: 3.7981,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "montarnaud",
    city: "Montarnaud",
    lat: 43.6467,
    lng: 3.697,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "combaillaux",
    city: "Combaillaux",
    lat: 43.6685,
    lng: 3.8041,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "vailhauques",
    city: "Vailhauquès",
    lat: 43.6727,
    lng: 3.721,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "murles",
    city: "Murles",
    lat: 43.6916,
    lng: 3.7548,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "saint_gely",
    city: "Saint-Gély-du-Fesc",
    lat: 43.6943,
    lng: 3.8041,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "saint_clement",
    city: "Saint-Clément-de-Rivière",
    lat: 43.6836,
    lng: 3.8428,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "montferrier",
    city: "Montferrier-sur-Lez",
    lat: 43.6674,
    lng: 3.8598,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "prades",
    city: "Prades-le-Lez",
    lat: 43.6983,
    lng: 3.8736,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "assas",
    city: "Assas",
    lat: 43.702,
    lng: 3.9,
    type: "commune",
    cloud: "nord",
  },
  {
    id: "clapiers",
    city: "Clapiers",
    lat: 43.6598,
    lng: 3.8875,
    type: "commune",
    cloud: "est",
  },
  {
    id: "jacou",
    city: "Jacou",
    lat: 43.6612,
    lng: 3.9108,
    type: "commune",
    cloud: "est",
  },
  {
    id: "teyran",
    city: "Teyran",
    lat: 43.6856,
    lng: 3.929,
    type: "commune",
    cloud: "est",
  },
  {
    id: "lecres",
    city: "Le Crès",
    lat: 43.6472,
    lng: 3.9391,
    type: "commune",
    cloud: "est",
  },
  {
    id: "castelnau",
    city: "Castelnau-le-Lez",
    lat: 43.6335,
    lng: 3.9016,
    type: "commune",
    cloud: "est",
  },
  {
    id: "castries",
    city: "Castries",
    lat: 43.679,
    lng: 3.982,
    type: "commune",
    cloud: "est",
  },
  {
    id: "sussargues",
    city: "Sussargues",
    lat: 43.7133,
    lng: 4.003,
    type: "commune",
    cloud: "est",
  },
  {
    id: "saint_drezery",
    city: "Saint-Drézéry",
    lat: 43.7318,
    lng: 3.9788,
    type: "commune",
    cloud: "est",
  },
  {
    id: "beaulieu",
    city: "Beaulieu",
    lat: 43.7287,
    lng: 3.9964,
    type: "commune",
    cloud: "est",
  },
  {
    id: "restinclieres",
    city: "Restinclières",
    lat: 43.7228,
    lng: 4.0382,
    type: "commune",
    cloud: "est",
  },
  {
    id: "mauguio",
    city: "Mauguio",
    lat: 43.6168,
    lng: 4.0091,
    type: "commune",
    cloud: "sud_est",
  },
  {
    id: "saint_aunes",
    city: "Saint-Aunès",
    lat: 43.6408,
    lng: 4.0088,
    type: "commune",
    cloud: "est",
  },
  {
    id: "saint_bres",
    city: "Saint-Brès",
    lat: 43.6683,
    lng: 4.03,
    type: "commune",
    cloud: "est",
  },
  {
    id: "perols",
    city: "Pérols",
    lat: 43.5622,
    lng: 3.9536,
    type: "commune",
    cloud: "sud_est",
  },
  {
    id: "baillargues",
    city: "Baillargues",
    lat: 43.6635,
    lng: 4.0078,
    type: "commune",
    cloud: "est",
  },
  {
    id: "vendargues",
    city: "Vendargues",
    lat: 43.6569,
    lng: 3.9696,
    type: "commune",
    cloud: "est",
  },
  {
    id: "saint_genies_des_mourgues",
    city: "Saint-Geniès-des-Mourgues",
    lat: 43.697,
    lng: 4.034,
    type: "commune",
    cloud: "est",
  },
  {
    id: "montaud",
    city: "Montaud",
    lat: 43.7519,
    lng: 3.9564,
    type: "commune",
    cloud: "est",
  },
  {
    id: "mireval",
    city: "Mireval",
    lat: 43.5086,
    lng: 3.8017,
    type: "commune",
    cloud: "sud_ouest",
  },
  {
    id: "lattes-maurin",
    city: "Lattes",
    label: "Lattes - Maurin",
    lat: 43.571,
    lng: 3.864,
    type: "lattes",
    cloud: "lattes_maurin",
  },
  {
    id: "lattes-centre",
    city: "Lattes",
    label: "Lattes - Centre",
    lat: 43.565,
    lng: 3.901,
    type: "lattes",
    cloud: "lattes_centre",
  },
  {
    id: "lattes-boirargues",
    city: "Lattes",
    label: "Lattes - Boirargues",
    lat: 43.566,
    lng: 3.936,
    type: "lattes",
    cloud: "lattes_boirargues",
  },
];

// ─────────────────────────────────────────────
// QUARTIERS DE MONTPELLIER
// ─────────────────────────────────────────────
const MTP_SUBAREAS = [
  {
    id: "mtp_hf",
    label: "Montpellier - Hôpitaux facultés",
    lat: 43.633,
    lng: 3.862,
    cloud: "mtp_hf",
    bucket: "hopitaux-facultes",
    bounds: [
      [43.618, 3.844],
      [43.648, 3.884],
    ],
    aliases: [
      "Hôpitaux-Facultés",
      "Aiguelongue",
      "Les Beaux-Arts",
      "Euromédecine",
      "Malbosc",
      "Plan des 4 Seigneurs",
      "Plan des Quatre Seigneurs",
      "Hauts de Saint-Priest",
      "Vert-Bois",
      "Boutonnet",
    ],
  },
  {
    id: "mtp_mosson",
    label: "Montpellier - Mosson",
    lat: 43.62,
    lng: 3.816,
    cloud: "mtp_mosson",
    bucket: "mosson",
    bounds: [
      [43.608, 3.793],
      [43.632, 3.831],
    ],
    aliases: ["Mosson", "La Paillade", "Hauts de Massane"],
  },
  {
    id: "mtp_cevennes",
    label: "Montpellier - Cévennes",
    lat: 43.603,
    lng: 3.839,
    cloud: "mtp_cevennes",
    bucket: "cevennes",
    bounds: [
      [43.59, 3.816],
      [43.615, 3.854],
    ],
    aliases: [
      "Cévennes",
      "Les Cévennes",
      "Alco",
      "La Chamberte",
      "Pergola",
      "Petit-Bard",
      "La Martelle",
      "Montpellier Village",
      "Saint-Clément",
    ],
  },
  {
    id: "mtp_pres_arenes",
    label: "Montpellier - Près d'Arènes",
    lat: 43.592,
    lng: 3.882,
    cloud: "mtp_pres_arenes",
    bucket: "pres-darenes",
    bounds: [
      [43.58, 3.862],
      [43.598, 3.902],
    ],
    aliases: [
      "Près d'Arènes",
      "Pres d'Arenes",
      "Aiguerelles",
      "Cité Mion",
      "La Rauze",
      "Montpellier Sud",
      "Saint-Martin",
      "Tournezy",
      "La Restanque",
    ],
  },
  {
    id: "mtp_croix_argent",
    label: "Montpellier - Croix d'Argent",
    lat: 43.585,
    lng: 3.865,
    cloud: "mtp_croix_argent",
    bucket: "croix-dargent",
    bounds: [
      [43.574, 3.842],
      [43.592, 3.874],
    ],
    aliases: [
      "Croix d'Argent",
      "Pas du Loup",
      "Estanove",
      "Lepic",
      "Mas Drevon",
      "Ovalie",
      "Les Grisettes",
      "Bagatelle",
      "Tastavin",
      "Lemasson",
    ],
  },
  {
    id: "mtp_millenaire",
    label: "Montpellier - Millénaire",
    lat: 43.614,
    lng: 3.928,
    cloud: "mtp_millenaire",
    bucket: "millenaire",
    bounds: [
      [43.603, 3.91],
      [43.625, 3.948],
    ],
    aliases: ["Millénaire", "Le Millénaire", "Grammont", "Odysseum"],
  },
  {
    id: "mtp_port_marianne",
    label: "Montpellier - Port Marianne",
    lat: 43.6,
    lng: 3.898,
    cloud: "mtp_port_marianne",
    bucket: "port-marianne",
    bounds: [
      [43.59, 3.883],
      [43.611, 3.914],
    ],
    aliases: [
      "Port Marianne",
      "Antigone",
      "Jacques Cœur",
      "Richter",
      "Rive Gauche",
      "Parc Marianne",
      "Lironde",
      "La Pompignane",
      "Pompignane",
    ],
  },
  {
    id: "mtp_centre_historique",
    label: "Montpellier - Centre historique",
    lat: 43.61,
    lng: 3.877,
    cloud: "mtp_centre_historique",
    bucket: "centre",
    bounds: [
      [43.601, 3.866],
      [43.617, 3.886],
    ],
    aliases: [
      "Centre historique",
      "Centre",
      "Écusson",
      "Ecusson",
      "Les Aubes",
      "Aubes",
      "Comédie",
      "Gares",
      "Figuerolles",
    ],
  },
  {
    id: "mtp_arceaux_gambetta",
    label: "Montpellier - Arceaux / Gambetta",
    lat: 43.606,
    lng: 3.86,
    cloud: "mtp_arceaux_gambetta",
    bucket: "centre",
    bounds: [
      [43.597, 3.848],
      [43.614, 3.87],
    ],
    aliases: ["Arceaux", "Les Arceaux", "Gambetta"],
  },
];

// ─────────────────────────────────────────────
// NUAGES DE POINTS — configuration géométrique
// ─────────────────────────────────────────────
const CLOUDS = {
  sud_ouest: { center: [43.546, 3.776], rx: 0.09, ry: 0.07, angle: -18 },
  ouest: { center: [43.607, 3.778], rx: 0.05, ry: 0.03, angle: 6 },
  nord: { center: [43.688, 3.795], rx: 0.11, ry: 0.055, angle: 8 },
  est: { center: [43.681, 3.95], rx: 0.105, ry: 0.06, angle: 12 },
  sud_est: { center: [43.548, 3.96], rx: 0.055, ry: 0.04, angle: 12 },
  mauguio_only: { center: [43.6168, 4.0091], rx: 0.04, ry: 0.03, angle: 16 },
  carnon_only: { center: [43.5468, 3.9796], rx: 0.03, ry: 0.021, angle: 8 },
  perols_only: { center: [43.5622, 3.9536], rx: 0.034, ry: 0.024, angle: 8 },
  saint_aunes_only: {
    center: [43.6408, 4.0088],
    rx: 0.03,
    ry: 0.022,
    angle: 12,
  },
  saint_bres_only: {
    center: [43.6683, 4.03],
    rx: 0.03,
    ry: 0.022,
    angle: 12,
  },
  baillargues_only: {
    center: [43.6635, 4.0078],
    rx: 0.03,
    ry: 0.022,
    angle: 12,
  },
  lattes_maurin: { center: [43.571, 3.864], rx: 0.022, ry: 0.017, angle: -10 },
  lattes_centre: { center: [43.565, 3.901], rx: 0.022, ry: 0.017, angle: 0 },
  lattes_boirargues: {
    center: [43.566, 3.936],
    rx: 0.024,
    ry: 0.018,
    angle: 8,
  },
  mtp_hf: { center: [43.633, 3.862], rx: 0.036, ry: 0.022, angle: 18 },
  mtp_mosson: { center: [43.62, 3.816], rx: 0.034, ry: 0.022, angle: -8 },
  mtp_cevennes: { center: [43.603, 3.839], rx: 0.03, ry: 0.02, angle: 4 },
  mtp_pres_arenes: { center: [43.592, 3.882], rx: 0.028, ry: 0.019, angle: 10 },
  mtp_croix_argent: {
    center: [43.585, 3.865],
    rx: 0.028,
    ry: 0.019,
    angle: -6,
  },
  mtp_millenaire: { center: [43.614, 3.928], rx: 0.03, ry: 0.018, angle: 18 },
  mtp_port_marianne: { center: [43.6, 3.898], rx: 0.026, ry: 0.018, angle: 14 },
  mtp_centre_historique: {
    center: [43.61, 3.877],
    rx: 0.018,
    ry: 0.013,
    angle: 0,
  },
  mtp_arceaux_gambetta: {
    center: [43.606, 3.86],
    rx: 0.02,
    ry: 0.014,
    angle: -12,
  },
};

// ─────────────────────────────────────────────
// NUAGES — style visuel
// ─────────────────────────────────────────────
const CLOUD_STYLE = {
  sud_ouest: { density: 240, spread: 0.75, opacity: 0.58, halo: 0.78 },
  ouest: { density: 150, spread: 0.65, opacity: 0.58, halo: 0.68 },
  nord: { density: 210, spread: 0.78, opacity: 0.58, halo: 0.8 },
  est: { density: 240, spread: 0.8, opacity: 0.58, halo: 0.82 },
  sud_est: { density: 150, spread: 0.62, opacity: 0.58, halo: 0.66 },
  mauguio_only: { density: 120, spread: 0.46, opacity: 0.6, halo: 0.54 },
  carnon_only: { density: 90, spread: 0.42, opacity: 0.6, halo: 0.5 },
  perols_only: { density: 100, spread: 0.43, opacity: 0.6, halo: 0.5 },
  saint_aunes_only: { density: 92, spread: 0.4, opacity: 0.6, halo: 0.46 },
  saint_bres_only: { density: 92, spread: 0.4, opacity: 0.6, halo: 0.46 },
  baillargues_only: { density: 92, spread: 0.4, opacity: 0.6, halo: 0.46 },
  lattes_maurin: { density: 72, spread: 0.42, opacity: 0.62, halo: 0.4 },
  lattes_centre: { density: 86, spread: 0.43, opacity: 0.62, halo: 0.42 },
  lattes_boirargues: { density: 84, spread: 0.44, opacity: 0.62, halo: 0.42 },
  mtp_hf: { density: 158, spread: 0.48, opacity: 0.6, halo: 0.48 },
  mtp_mosson: { density: 145, spread: 0.5, opacity: 0.6, halo: 0.48 },
  mtp_cevennes: { density: 116, spread: 0.45, opacity: 0.62, halo: 0.44 },
  mtp_pres_arenes: { density: 120, spread: 0.44, opacity: 0.6, halo: 0.44 },
  mtp_croix_argent: { density: 125, spread: 0.46, opacity: 0.6, halo: 0.44 },
  mtp_millenaire: { density: 102, spread: 0.4, opacity: 0.6, halo: 0.4 },
  mtp_port_marianne: { density: 118, spread: 0.42, opacity: 0.6, halo: 0.42 },
  mtp_centre_historique: {
    density: 92,
    spread: 0.32,
    opacity: 0.64,
    halo: 0.3,
  },
  mtp_arceaux_gambetta: {
    density: 98,
    spread: 0.34,
    opacity: 0.64,
    halo: 0.32,
  },
};

// ─────────────────────────────────────────────
// NUAGES — ancres géographiques
// ─────────────────────────────────────────────
const CLOUD_ANCHORS = {
  sud_ouest: [
    { lat: 43.5735, lng: 3.8286, w: 1.2 },
    { lat: 43.5343, lng: 3.8625, w: 1.0 },
    { lat: 43.4906, lng: 3.7982, w: 0.7 },
    { lat: 43.5, lng: 3.712, w: 0.7 },
    { lat: 43.5517, lng: 3.7779, w: 1.0 },
    { lat: 43.5166, lng: 3.6975, w: 0.7 },
    { lat: 43.5482, lng: 3.7067, w: 0.8 },
    { lat: 43.5591, lng: 3.7198, w: 0.9 },
    { lat: 43.5828, lng: 3.7647, w: 0.9 },
    { lat: 43.5726, lng: 3.775, w: 0.6 },
    { lat: 43.5843, lng: 3.8051, w: 0.8 },
    { lat: 43.5086, lng: 3.8017, w: 0.8 },
  ],
  ouest: [
    { lat: 43.6053, lng: 3.7377, w: 0.8 },
    { lat: 43.6119, lng: 3.7815, w: 1.0 },
    { lat: 43.6138, lng: 3.8106, w: 1.2 },
  ],
  nord: [
    { lat: 43.6487, lng: 3.7981, w: 1.0 },
    { lat: 43.6467, lng: 3.697, w: 0.8 },
    { lat: 43.6685, lng: 3.8041, w: 0.8 },
    { lat: 43.6727, lng: 3.721, w: 0.8 },
    { lat: 43.6916, lng: 3.7548, w: 0.7 },
    { lat: 43.6943, lng: 3.8041, w: 1.1 },
    { lat: 43.6836, lng: 3.8428, w: 1.0 },
    { lat: 43.6674, lng: 3.8598, w: 0.9 },
    { lat: 43.6983, lng: 3.8736, w: 0.9 },
    { lat: 43.702, lng: 3.9, w: 0.8 },
  ],
  est: [
    { lat: 43.6598, lng: 3.8875, w: 0.9 },
    { lat: 43.6612, lng: 3.9108, w: 0.9 },
    { lat: 43.6856, lng: 3.929, w: 0.8 },
    { lat: 43.6472, lng: 3.9391, w: 1.1 },
    { lat: 43.6335, lng: 3.9016, w: 1.25 },
    { lat: 43.679, lng: 3.982, w: 0.8 },
    { lat: 43.7133, lng: 4.003, w: 0.7 },
    { lat: 43.7318, lng: 3.9788, w: 0.7 },
    { lat: 43.7287, lng: 3.9964, w: 0.6 },
    { lat: 43.7228, lng: 4.0382, w: 0.6 },
    { lat: 43.6408, lng: 4.0088, w: 0.85 },
    { lat: 43.6635, lng: 4.0078, w: 0.9 },
    { lat: 43.6683, lng: 4.03, w: 0.85 },
    { lat: 43.6569, lng: 3.9696, w: 0.95 },
    { lat: 43.697, lng: 4.034, w: 0.75 },
    { lat: 43.7519, lng: 3.9564, w: 0.7 },
  ],
  sud_est: [{ lat: 43.5294, lng: 3.9346, w: 0.9 }],
  mauguio_only: [{ lat: 43.6168, lng: 4.0091, w: 1.25 }],
  carnon_only: [{ lat: 43.5468, lng: 3.9796, w: 1.1 }],
  perols_only: [{ lat: 43.5622, lng: 3.9536, w: 1.1 }],
  saint_aunes_only: [{ lat: 43.6408, lng: 4.0088, w: 1.0 }],
  saint_bres_only: [{ lat: 43.6683, lng: 4.03, w: 1.0 }],
  baillargues_only: [{ lat: 43.6635, lng: 4.0078, w: 1.0 }],
  lattes_maurin: [
    { lat: 43.571, lng: 3.864, w: 1.2 },
    { lat: 43.567, lng: 3.874, w: 0.9 },
  ],
  lattes_centre: [
    { lat: 43.565, lng: 3.901, w: 1.2 },
    { lat: 43.561, lng: 3.91, w: 0.9 },
  ],
  lattes_boirargues: [
    { lat: 43.566, lng: 3.936, w: 1.1 },
    { lat: 43.563, lng: 3.947, w: 1.0 },
  ],
  mtp_hf: [
    { lat: 43.633, lng: 3.862, w: 1.2 },
    { lat: 43.639, lng: 3.851, w: 1.0 },
    { lat: 43.625, lng: 3.876, w: 0.9 },
  ],
  mtp_mosson: [
    { lat: 43.62, lng: 3.816, w: 1.2 },
    { lat: 43.623, lng: 3.804, w: 1.0 },
    { lat: 43.612, lng: 3.828, w: 0.9 },
  ],
  mtp_cevennes: [
    { lat: 43.603, lng: 3.839, w: 1.2 },
    { lat: 43.607, lng: 3.828, w: 1.0 },
    { lat: 43.596, lng: 3.849, w: 0.9 },
  ],
  mtp_pres_arenes: [
    { lat: 43.592, lng: 3.882, w: 1.2 },
    { lat: 43.594, lng: 3.891, w: 1.0 },
    { lat: 43.588, lng: 3.871, w: 0.9 },
  ],
  mtp_croix_argent: [
    { lat: 43.585, lng: 3.865, w: 1.2 },
    { lat: 43.582, lng: 3.854, w: 1.0 },
    { lat: 43.589, lng: 3.846, w: 0.9 },
  ],
  mtp_millenaire: [
    { lat: 43.614, lng: 3.928, w: 1.2 },
    { lat: 43.618, lng: 3.941, w: 1.0 },
    { lat: 43.607, lng: 3.916, w: 0.8 },
  ],
  mtp_port_marianne: [
    { lat: 43.6, lng: 3.898, w: 1.2 },
    { lat: 43.604, lng: 3.908, w: 1.0 },
    { lat: 43.594, lng: 3.889, w: 0.9 },
  ],
  mtp_centre_historique: [
    { lat: 43.61, lng: 3.877, w: 1.3 },
    { lat: 43.606, lng: 3.882, w: 1.0 },
    { lat: 43.612, lng: 3.871, w: 0.9 },
  ],
  mtp_arceaux_gambetta: [
    { lat: 43.606, lng: 3.86, w: 1.2 },
    { lat: 43.602, lng: 3.852, w: 1.0 },
    { lat: 43.609, lng: 3.866, w: 0.8 },
  ],
};

// ─────────────────────────────────────────────
// RÈGLES DE SECTORISATION — par filière
// ─────────────────────────────────────────────
const RULES = {
  cardio_pneumo: {
    saint_roch: [],
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
    beausoleil: [
      "Murviel-lès-Montpellier",
      "Saint-Georges-d'Orques",
      "Juvignac",
    ],
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
    parc: [
      "Clapiers",
      "Jacou",
      "Teyran",
      "Le Crès",
      "Castelnau-le-Lez",
      "Castries",
      "Sussargues",
      "Saint-Drézéry",
      "Beaulieu",
      "Restinclières",
      "Vendargues",
      "Saint-Geniès-des-Mourgues",
      "Montaud",
    ],
    millenaire: [
      "Carnon",
      "Mauguio",
      "Saint-Aunès",
      "Pérols",
      "Saint-Brès",
      "Baillargues",
      "Palavas-les-Flots",
    ],
  },
  gastro_uro: {
    saint_roch: [],
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
      "Palavas-les-Flots",
      "Saussan",
      "Lavérune",
      "Mireval",
    ],
    beausoleil: [
      "Murviel-lès-Montpellier",
      "Saint-Georges-d'Orques",
      "Juvignac",
    ],
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
    parc: [
      "Baillargues",
      "Vendargues",
      "Saint-Brès",
      "Clapiers",
      "Jacou",
      "Teyran",
      "Le Crès",
      "Castelnau-le-Lez",
      "Castries",
      "Sussargues",
      "Saint-Drézéry",
      "Beaulieu",
      "Restinclières",
      "Saint-Geniès-des-Mourgues",
      "Montaud",
    ],
    millenaire: ["Carnon", "Mauguio", "Saint-Aunès", "Pérols"],
  },
  trauma: {
    saint_roch: ["Palavas-les-Flots", "Carnon", "Pérols"],
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
    beausoleil: [
      "Murviel-lès-Montpellier",
      "Saint-Georges-d'Orques",
      "Juvignac",
    ],
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
    parc: [
      "Clapiers",
      "Jacou",
      "Teyran",
      "Le Crès",
      "Castelnau-le-Lez",
      "Castries",
      "Sussargues",
      "Saint-Drézéry",
      "Beaulieu",
      "Restinclières",
      "Vendargues",
      "Saint-Geniès-des-Mourgues",
      "Montaud",
      "Mauguio",
      "Saint-Aunès",
      "Saint-Brès",
      "Baillargues",
    ],
    millenaire: [],
  },
};

// Règles spécifiques Montpellier intra-muros
const MTP_RULES = {
  cardio_pneumo: {
    "hopitaux-facultes": "lapeyronie",
    mosson: "lapeyronie",
    cevennes: "beausoleil",
    centre: "saint_roch",
    "pres-darenes": "saint_roch",
    "croix-dargent": "saint_roch",
    "port-marianne": "millenaire",
    millenaire: "millenaire",
  },
  gastro_uro: {
    "hopitaux-facultes": "lapeyronie",
    mosson: "lapeyronie",
    cevennes: "beausoleil",
    centre: "saint_roch",
    "pres-darenes": "saint_roch",
    "croix-dargent": "beausoleil",
    "port-marianne": "millenaire",
    millenaire: "millenaire",
  },
  trauma: {
    "hopitaux-facultes": "lapeyronie",
    mosson: "lapeyronie",
    cevennes: "beausoleil",
    centre: "saint_roch",
    "pres-darenes": "saint_roch",
    "croix-dargent": "saint_roch",
    "port-marianne": "saint_roch",
    millenaire: "saint_roch",
  },
};

const MTP_AREA_RULES = {
  cardio_pneumo: {
    mtp_centre_historique: "lapeyronie",
    mtp_hf: "lapeyronie",
    mtp_mosson: "lapeyronie",
    mtp_pres_arenes: "saint_roch",
    mtp_croix_argent: "saint_roch",
    mtp_cevennes: "beausoleil",
    mtp_arceaux_gambetta: "beausoleil",
    mtp_port_marianne: "millenaire",
    mtp_millenaire: "millenaire",
  },
  gastro_uro: {
    mtp_centre_historique: "lapeyronie",
    mtp_hf: "lapeyronie",
    mtp_mosson: "lapeyronie",
    mtp_pres_arenes: "beausoleil",
    mtp_croix_argent: "saint_roch",
    mtp_cevennes: "beausoleil",
    mtp_arceaux_gambetta: "beausoleil",
    mtp_port_marianne: "millenaire",
    mtp_millenaire: "millenaire",
  },
  trauma: {
    mtp_centre_historique: "lapeyronie",
    mtp_hf: "lapeyronie",
    mtp_mosson: "lapeyronie",
    mtp_pres_arenes: "saint_roch",
    mtp_croix_argent: "saint_roch",
    mtp_cevennes: "beausoleil",
    mtp_arceaux_gambetta: "beausoleil",
    mtp_port_marianne: "saint_roch",
    mtp_millenaire: "saint_roch",
  },
};

const DIVERS_MTP_RULES = {
  mtp_centre_historique: "lapeyronie",
  mtp_hf: "lapeyronie",
  mtp_mosson: "lapeyronie",
  mtp_pres_arenes: "saint_roch",
  mtp_croix_argent: "saint_roch",
  mtp_cevennes: "beausoleil",
  mtp_arceaux_gambetta: "beausoleil",
  mtp_port_marianne: "millenaire",
  mtp_millenaire: "millenaire",
};

const DIVERS_AREA_RULES = {
  "lattes-centre": "saint_roch",
  "lattes-boirargues": "millenaire",
  "lattes-maurin": "saint_roch",
};

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
  millenaire: ["Carnon", "Mauguio", "Saint-Aunès", "Pérols"],
  parc: [
    "Castelnau-le-Lez",
    "Baillargues",
    "Vendargues",
    "Saint-Brès",
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

const SPECIAL_AREA_RULES = {
  mauguio: { cardio_pneumo: "millenaire", gastro_uro: "millenaire" },
  perols: {
    cardio_pneumo: "millenaire",
    gastro_uro: "millenaire",
    trauma: "saint_roch",
  },
  saint_aunes: {
    cardio_pneumo: "millenaire",
    gastro_uro: "millenaire",
    trauma: "parc",
  },
  saint_bres: {
    cardio_pneumo: "millenaire",
    gastro_uro: "parc",
    trauma: "parc",
  },
  carnon: {
    cardio_pneumo: "millenaire",
    gastro_uro: "millenaire",
    trauma: "saint_roch",
  },
  baillargues: {
    cardio_pneumo: "millenaire",
    gastro_uro: "parc",
    trauma: "parc",
  },
};

function resolveHospitalForArea(area, specialty, diversAssignments = {}) {
  if (!area || !specialty) return "lapeyronie";

  if (specialty === "divers") {
    if (DIVERS_MTP_RULES[area.id]) return DIVERS_MTP_RULES[area.id];
    if (DIVERS_AREA_RULES[area.id]) return DIVERS_AREA_RULES[area.id];

    for (const [hospitalId, cities] of Object.entries(DIVERS_CITY_RULES)) {
      if (cities.includes(area.city)) return hospitalId;
    }

    return "lapeyronie";
  }

  if (area.id.startsWith("mtp_")) {
    if (MTP_AREA_RULES[specialty] && MTP_AREA_RULES[specialty][area.id]) {
      return MTP_AREA_RULES[specialty][area.id];
    }
    return (MTP_RULES[specialty] || {})[area.bucket] || "lapeyronie";
  }

  if (SPECIAL_AREA_RULES[area.id] && SPECIAL_AREA_RULES[area.id][specialty]) {
    return SPECIAL_AREA_RULES[area.id][specialty];
  }

  if (area.id === "lattes-maurin") {
    return specialty === "gastro_uro" ? "saint_jean" : "saint_roch";
  }

  if (area.id === "lattes-centre") {
    return ["cardio_pneumo", "gastro_uro"].includes(specialty)
      ? "millenaire"
      : "saint_roch";
  }

  if (area.id === "lattes-boirargues") {
    return specialty === "trauma" ? "saint_roch" : "millenaire";
  }

  for (const [hospitalId, list] of Object.entries(RULES[specialty] || {})) {
    if (list.includes(area.city)) return hospitalId;
  }

  return "lapeyronie";
}
