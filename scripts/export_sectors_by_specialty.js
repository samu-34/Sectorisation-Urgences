#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const INPUT = path.join(ROOT, 'generated', 'sectorization-data.js');
const OUTPUT = path.join(ROOT, 'generated', 'secteurs-par-filiere.json');

function simplify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[œ]/g, 'oe')
    .replace(/[æ]/g, 'ae')
    .replace(/[’‘`´]/g, "'")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadSectorizationData(inputPath) {
  const source = fs.readFileSync(inputPath, 'utf8');
  const context = { globalThis: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: inputPath });
  const data = context.globalThis.MEDIMAP_SECTORIZATION_DATA;
  if (!data) {
    throw new Error('MEDIMAP_SECTORIZATION_DATA introuvable dans generated/sectorization-data.js');
  }
  return data;
}

function createBeziersStructureIdByCity(references = {}) {
  const beziers = (references || {}).beziers_ouest_herault || {};
  const sectorisationCommunes = beziers.sectorisationCommunes || {};
  const map = {};
  Object.entries(sectorisationCommunes).forEach(([structureId, communes]) => {
    (communes || []).forEach((commune) => {
      map[simplify(commune)] = structureId;
    });
  });
  return map;
}

function main() {
  const data = loadSectorizationData(INPUT);

  const specialties = ['divers', 'cardio_pneumo', 'gastro_uro', 'trauma'];
  const cityAreas = Array.isArray(data.cityAreas) ? data.cityAreas : [];
  const mtpSubareas = Array.isArray(data.mtpSubareas) ? data.mtpSubareas : [];
  const allAreas = [...cityAreas, ...mtpSubareas];

  const rules = data.rules || {};
  const mtpRules = data.mtpRules || {};
  const areaSpecialtyRules = data.areaSpecialtyRules || {};

  const DIVERS_CITY_RULES = {
    lapeyronie: [
      'Grabels',
      'Montarnaud',
      'Combaillaux',
      'Vailhauquès',
      'Murles',
      'Saint-Gély-du-Fesc',
      'Saint-Clément-de-Rivière',
      'Montferrier-sur-Lez',
      'Prades-le-Lez',
      'Assas',
    ],
    saint_roch: ['Palavas-les-Flots'],
    beausoleil: ['Murviel-lès-Montpellier', "Saint-Georges-d'Orques", 'Juvignac'],
    millenaire: [],
    parc: [
      'Castelnau-le-Lez',
      'Vendargues',
      'Clapiers',
      'Jacou',
      'Teyran',
      'Le Crès',
      'Castries',
      'Sussargues',
      'Saint-Drézéry',
      'Beaulieu',
      'Restinclières',
      'Saint-Geniès-des-Mourgues',
      'Montaud',
    ],
    saint_jean: [
      'Saint-Jean-de-Védas',
      'Villeneuve-lès-Maguelone',
      'Vic-la-Gardiole',
      'Gigean',
      'Fabrègues',
      'Montbazin',
      'Cournonsec',
      'Cournonterral',
      'Pignan',
      'Saussan',
      'Lavérune',
      'Mireval',
    ],
  };

  const cityRulesBySpecialty = {
    divers: DIVERS_CITY_RULES,
    cardio_pneumo: rules.cardio_pneumo || {},
    gastro_uro: rules.gastro_uro || {},
    trauma: rules.trauma || {},
  };

  const beziersByCity = createBeziersStructureIdByCity(data.references || {});

  function resolveHospitalForArea(area, specialty) {
    if (!area || !specialty) return 'lapeyronie';

    const explicitAreaRules = areaSpecialtyRules[area.id];
    if (explicitAreaRules && explicitAreaRules[specialty]) {
      return explicitAreaRules[specialty];
    }

    if (String(area.id || '').startsWith('mtp_')) {
      return ((mtpRules[specialty] || {})[area.bucket]) || 'lapeyronie';
    }

    for (const [hospitalId, list] of Object.entries(cityRulesBySpecialty[specialty] || {})) {
      if ((list || []).includes(area.city)) return hospitalId;
    }

    const beziersHospitalId = beziersByCity[simplify(area.city)];
    if (beziersHospitalId) return beziersHospitalId;

    return 'lapeyronie';
  }

  const payload = {
    generated_at: new Date().toISOString(),
    source: {
      sectorization_bundle: 'generated/sectorization-data.js',
      resolver: 'Equivalent logique resolveHospitalForArea(data.js)'
    },
    specialties,
    sectors_by_specialty: Object.fromEntries(
      specialties.map((specialtyId) => {
        const sectors = allAreas
          .map((area) => ({
            specialty_id: specialtyId,
            area_id: area.id,
            area_label: area.label || area.city || area.id,
            area_type: area.type || '',
            city: area.city || '',
            bucket: area.bucket || '',
            hospital_id: resolveHospitalForArea(area, specialtyId),
          }))
          .sort((a, b) => a.area_label.localeCompare(b.area_label, 'fr'));
        return [specialtyId, sectors];
      }),
    ),
  };

  fs.writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`OK: ${path.relative(ROOT, OUTPUT)}`);
}

main();
