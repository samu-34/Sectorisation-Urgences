/**
 * MediMap — domain.js
 * Logique métier pure : normalisation, détection, sélection et orientation
 * Dépend de data.js (chargé avant)
 */

(function attachDomain(global) {
  "use strict";

  function simplify(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[œ]/g, "oe")
      .replace(/[æ]/g, "ae")
      .replace(/[’‘`´]/g, "'")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[-/]+/g, " ")
      .replace(/\bste\.?(?=\s|$)/g, "sainte")
      .replace(/\bst\.?(?=\s|$)/g, "saint")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getMatchRank(label, query) {
    const normalizedLabel = simplify(label);
    const normalizedQuery = simplify(query);

    if (!normalizedQuery || !normalizedLabel.includes(normalizedQuery)) {
      return null;
    }

    if (normalizedLabel === normalizedQuery) {
      return { score: 0, index: 0, length: normalizedLabel.length };
    }

    if (normalizedLabel.startsWith(normalizedQuery)) {
      return { score: 1, index: 0, length: normalizedLabel.length };
    }

    const wordIndex = normalizedLabel
      .split(/[\s-]+/)
      .findIndex((word) => word.startsWith(normalizedQuery));

    if (wordIndex >= 0) {
      return {
        score: 2,
        index: normalizedLabel.indexOf(normalizedQuery),
        length: normalizedLabel.length,
      };
    }

    return {
      score: 3,
      index: normalizedLabel.indexOf(normalizedQuery),
      length: normalizedLabel.length,
    };
  }

  function getRankedMatches(items, query, getLabel) {
    return items
      .map((item, sourceIndex) => {
        const rawLabels = getLabel(item);
        const labels = Array.isArray(rawLabels) ? rawLabels : [rawLabels];
        const rankedLabels = labels
          .filter(Boolean)
          .map((label) => ({ label, rank: getMatchRank(label, query) }))
          .filter((entry) => entry.rank !== null)
          .sort((a, b) => {
            if (a.rank.score !== b.rank.score) return a.rank.score - b.rank.score;
            if (a.rank.index !== b.rank.index) return a.rank.index - b.rank.index;
            if (a.rank.length !== b.rank.length) {
              return a.rank.length - b.rank.length;
            }
            return 0;
          });

        const bestMatch = rankedLabels[0];
        if (!bestMatch) return null;

        return { item, rank: bestMatch.rank, sourceIndex };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.rank.score !== b.rank.score) return a.rank.score - b.rank.score;
        if (a.rank.index !== b.rank.index) return a.rank.index - b.rank.index;
        if (a.rank.length !== b.rank.length) return a.rank.length - b.rank.length;
        return a.sourceIndex - b.sourceIndex;
      })
      .map((entry) => entry.item);
  }

  function filiereLabelById(id) {
    const found = SPECIALTIES.find((specialty) => specialty.id === id);
    return found ? found.label : id;
  }

  function detectSpecialty(text) {
    const normalizedText = simplify(text);
    if (!normalizedText) return "cardio_pneumo";

    function getTermsByFiliere(filiere) {
      return MOTIF_CATALOG.filter((item) => item.filiere === filiere).flatMap(
        (item) => [item.label, ...(item.aliases || [])],
      );
    }

    const trauma = getTermsByFiliere("trauma");
    const gastro = getTermsByFiliere("gastro_uro");
    const cardio = getTermsByFiliere("cardio_pneumo");
    const divers = getTermsByFiliere("divers");

    if (trauma.some((term) => normalizedText.includes(simplify(term)))) {
      return "trauma";
    }
    if (gastro.some((term) => normalizedText.includes(simplify(term)))) {
      return "gastro_uro";
    }
    if (cardio.some((term) => normalizedText.includes(simplify(term)))) {
      return "cardio_pneumo";
    }
    if (divers.some((term) => normalizedText.includes(simplify(term)))) {
      return "divers";
    }
    return "divers";
  }

  function inferDetectedSpecialty(text) {
    return simplify(text) ? detectSpecialty(text) : "";
  }

  const CITY_SUGGESTIONS = Object.freeze(
    Array.from(
      new Map(
        [
          { label: "Montpellier", category: "Commune" },
          ...[...new Set(CITY_AREAS.map((area) => area.city))].map((city) => ({
            label: city,
            category: "Commune",
          })),
          ...CITY_AREAS.filter((area) => area.type === "lattes" && area.label).map(
            (area) => ({
              label: area.label,
              category: "Secteur Lattes",
            }),
          ),
          ...MTP_SUBAREAS.flatMap((area) => [
            {
              label: area.label,
              category: "Quartier Montpellier",
            },
            ...(area.aliases || []).map((name) => ({
              label: name,
              category: "Quartier Montpellier",
            })),
          ]),
        ].map((entry) => [simplify(entry.label), entry]),
      ).values(),
    ),
  );

  const CITY_NAME_BY_KEY = new Map(
    [...new Set(CITY_AREAS.map((area) => area.city)), "Montpellier", "Lattes"].map(
      (city) => [simplify(city), city],
    ),
  );

  const COMMUNE_AREA_BY_CITY = new Map(
    CITY_AREAS.filter((area) => area.type === "commune").map((area) => [
      area.city,
      area,
    ]),
  );

  const MTP_SUBAREA_BY_KEY = new Map(
    MTP_SUBAREAS.flatMap((area) =>
      [area.label, ...(area.aliases || [])].map((name) => [simplify(name), area]),
    ),
  );

  const LATTES_AREA_BY_KEY = new Map(
    CITY_AREAS.filter((area) => area.type === "lattes" && area.label).map(
      (area) => [simplify(area.label), area],
    ),
  );

  function getCitySuggestions() {
    return CITY_SUGGESTIONS.slice();
  }

  function resolveCitySelection(rawValue) {
    const normalized = simplify(rawValue);

    if (!normalized) {
      return {
        matched: false,
        cityValue: "",
        subzoneValue: "",
        displayValue: "",
      };
    }

    const mtpArea = MTP_SUBAREA_BY_KEY.get(normalized);
    if (mtpArea) {
      return {
        matched: true,
        cityValue: "Montpellier",
        subzoneValue: mtpArea.id,
        displayValue: mtpArea.label,
      };
    }

    const lattesArea = LATTES_AREA_BY_KEY.get(normalized);
    if (lattesArea) {
      return {
        matched: true,
        cityValue: "Lattes",
        subzoneValue: lattesArea.id,
        displayValue: lattesArea.label,
      };
    }

    const city = CITY_NAME_BY_KEY.get(normalized);
    if (city) {
      return {
        matched: true,
        cityValue: city,
        subzoneValue: "",
        displayValue: city,
      };
    }

    return {
      matched: false,
      cityValue: "",
      subzoneValue: "",
      displayValue: "",
    };
  }

  function resolveAreaFromSelection(cityValue, subzoneValue) {
    if (!cityValue) return null;

    if (cityValue === "Montpellier") {
      if (!subzoneValue) return null;
      return AREA_BY_ID[subzoneValue] || null;
    }

    if (cityValue === "Lattes") {
      if (!subzoneValue) return null;
      return AREA_BY_ID[subzoneValue] || null;
    }

    return COMMUNE_AREA_BY_CITY.get(cityValue) || null;
  }

  function computeDiversAssignments() {
    const assignments = {};
    ALL_AREAS.forEach((area) => {
      assignments[area.id] = resolveHospitalForArea(area, "divers", {});
    });
    return assignments;
  }

  function resolveMapHospital(area, specialty, diversAssignments = {}) {
    return resolveHospitalForArea(area, specialty, diversAssignments);
  }

  function resolveOrientationHospital(area, symptomText, diversAssignments = {}) {
    return resolveHospitalForArea(
      area,
      inferDetectedSpecialty(symptomText) || "divers",
      diversAssignments,
    );
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function estimateTheoreticalTravel(area, hospitalId) {
    const hospital = HOSPITALS[hospitalId];
    const km = distanceKm(area.lat, area.lng, hospital.lat, hospital.lng);
    const durationMin = km < 8 ? km * 2.2 : km < 20 ? km * 1.8 : km * 1.45;
    return { directDistanceKm: km, theoreticalDurationMin: durationMin };
  }

  global.MediMapDomain = Object.freeze({
    simplify,
    getRankedMatches,
    filiereLabelById,
    detectSpecialty,
    inferDetectedSpecialty,
    getCitySuggestions,
    resolveCitySelection,
    resolveAreaFromSelection,
    computeDiversAssignments,
    resolveMapHospital,
    resolveOrientationHospital,
    estimateTheoreticalTravel,
  });
})(globalThis);
