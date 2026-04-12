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

  function createPreparedSearchLabels(rawLabels) {
    const labels = Array.isArray(rawLabels) ? rawLabels : [rawLabels];
    return labels
      .filter(Boolean)
      .map((label) => {
        const normalizedLabel = simplify(label);
        return {
          label,
          normalizedLabel,
          words: normalizedLabel.split(/[\s-]+/),
        };
      });
  }

  const PREPARED_SEARCH_LABEL_CACHE = new WeakMap();

  function getPreparedSearchLabels(item, rawLabels) {
    if (!item || (typeof item !== "object" && typeof item !== "function")) {
      return createPreparedSearchLabels(rawLabels);
    }

    const labels = Array.isArray(rawLabels) ? rawLabels : [rawLabels];
    const cacheSignature = labels.filter(Boolean).join("\u0001");
    const cached = PREPARED_SEARCH_LABEL_CACHE.get(item);

    if (cached && cached.signature === cacheSignature) {
      return cached.preparedLabels;
    }

    const preparedLabels = createPreparedSearchLabels(labels);
    PREPARED_SEARCH_LABEL_CACHE.set(item, {
      signature: cacheSignature,
      preparedLabels,
    });
    return preparedLabels;
  }

  function getMatchRank(preparedLabel, normalizedQuery) {
    const normalizedLabel = preparedLabel.normalizedLabel;

    if (!normalizedQuery || !normalizedLabel.includes(normalizedQuery)) {
      return null;
    }

    if (normalizedLabel === normalizedQuery) {
      return { score: 0, index: 0, length: normalizedLabel.length };
    }

    if (normalizedLabel.startsWith(normalizedQuery)) {
      return { score: 1, index: 0, length: normalizedLabel.length };
    }

    const wordIndex = preparedLabel.words.findIndex((word) =>
      word.startsWith(normalizedQuery),
    );

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
    const normalizedQuery = simplify(query);
    if (!normalizedQuery) {
      return [];
    }

    return items
      .map((item, sourceIndex) => {
        const rawLabels = getLabel(item);
        const preparedLabels = getPreparedSearchLabels(item, rawLabels);
        const rankedLabels = preparedLabels
          .map((preparedLabel) => ({
            label: preparedLabel.label,
            rank: getMatchRank(preparedLabel, normalizedQuery),
          }))
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

  const DETECTION_SPECIALTY_ORDER = Object.freeze([
    "trauma",
    "gastro_uro",
    "cardio_pneumo",
    "divers",
  ]);
  const DETECTION_TERMS_BY_SPECIALTY = Object.freeze(
    Object.fromEntries(
      DETECTION_SPECIALTY_ORDER.map((specialty) => [
        specialty,
        Object.freeze(
          [
            ...new Set(
              MOTIF_CATALOG.filter((item) => item.filiere === specialty)
                .flatMap((item) => [item.label, ...(item.aliases || [])])
                .map((term) => simplify(term))
                .filter(Boolean),
            ),
          ],
        ),
      ]),
    ),
  );

  function detectSpecialty(text) {
    const normalizedText = simplify(text);
    if (!normalizedText) return "cardio_pneumo";

    for (const specialty of DETECTION_SPECIALTY_ORDER) {
      if (
        DETECTION_TERMS_BY_SPECIALTY[specialty].some((term) =>
          normalizedText.includes(term),
        )
      ) {
        return specialty;
      }
    }
    return "";
  }

  function inferDetectedSpecialty(text) {
    return simplify(text) ? detectSpecialty(text) : "";
  }

  const RAW_MTP_ADDRESS_POINT_INDEX = Object.freeze(global.MTP_ADDRESS_POINT_INDEX || {});
  const RAW_MTP_STREET_INDEX = Object.freeze(global.MTP_STREET_INDEX || {});
  const MTP_STREET_SUGGESTIONS = Object.freeze(
    Object.values(RAW_MTP_STREET_INDEX).map((entry) => ({
      label: entry.label,
      category: "Rue Montpellier",
    })),
  );

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
          ...MTP_STREET_SUGGESTIONS,
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

  const STREET_PREFIX_PATTERN =
    /^(?:\d+[a-z]?(?:\s+(?:bis|ter|quater))?\s+)?(?:rue|avenue|av|boulevard|bd|impasse|allee|all[ée]e|chemin|route|place|pl|quai|cours|esplanade|mail|passage|square|promenade|faubourg)\s+/;

  const LEADING_CONNECTOR_PATTERN = /^(?:de la|de l'|de|du|des|d'|la|le|les|l')\s+/;

  const STREET_TYPE_TOKENS = Object.freeze([
    "rue",
    "avenue",
    "av",
    "boulevard",
    "bd",
    "impasse",
    "allee",
    "chemin",
    "route",
    "place",
    "pl",
    "quai",
    "cours",
    "esplanade",
    "mail",
    "passage",
    "square",
    "promenade",
    "faubourg",
  ]);

  function createEmptySelection() {
    return {
      matched: false,
      cityValue: "",
      subzoneValue: "",
      displayValue: "",
      resolvedPoint: null,
      isAddressSelection: false,
    };
  }

  function createResolvedPoint({
    lat,
    lng,
    label = "",
    precision = "area",
  } = {}) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return {
      lat,
      lng,
      label: String(label || ""),
      precision,
    };
  }

  function createAreaSelection(area, {
    displayValue,
    resolvedPoint = null,
    isAddressSelection = false,
  } = {}) {
    return {
      matched: true,
      cityValue: "Montpellier",
      subzoneValue: area.id,
      displayValue: displayValue || area.label,
      resolvedPoint,
      isAddressSelection,
    };
  }

  function normalizeAddressKey(text) {
    return simplify(text)
      .replace(/\b\d{5}\b/g, " ")
      .replace(/\bmontpellier\b/g, " ")
      .replace(/\bfrance\b/g, " ")
      .replace(STREET_PREFIX_PATTERN, "")
      .replace(LEADING_CONNECTOR_PATTERN, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const MTP_SUBAREA_BY_ADDRESS_KEY = new Map(
    MTP_SUBAREAS.flatMap((area) =>
      [area.label, ...(area.aliases || []), ...((area.addressHints || []).filter(Boolean))]
        .map((name) => [normalizeAddressKey(name), area])
        .filter(([key]) => key),
    ),
  );
  const MTP_ADDRESS_POINT_INDEX_BY_KEY = new Map(
    Object.entries(RAW_MTP_ADDRESS_POINT_INDEX),
  );
  const MTP_STREET_INDEX_BY_KEY = new Map(Object.entries(RAW_MTP_STREET_INDEX));

  function extractLeadingHouseNumber(rawValue) {
    const normalized = simplify(rawValue)
      .replace(/\b340\d{2}\b/g, " ")
      .replace(/\bmontpellier\b/g, " ")
      .replace(/\bfrance\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const match = normalized.match(/^(\d+[a-z]?(?:\s+(?:bis|ter|quater))?)\b/);
    return match ? match[1].trim() : "";
  }

  function buildAddressPointLookupCandidates(rawValue) {
    const houseNumber = extractLeadingHouseNumber(rawValue);
    if (!houseNumber) return [];

    const addressCandidates = splitAddressCandidates(rawValue);
    return addressCandidates
      .map((candidate) => `${houseNumber}|${candidate}`)
      .filter(Boolean);
  }

  function splitAddressCandidates(rawValue) {
    const normalized = simplify(rawValue);
    if (!normalized) return [];

    const commaParts = normalized
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const candidates = new Set([
      normalized,
      ...commaParts,
      commaParts[0] || "",
      normalized.replace(/\b340\d{2}\b/g, " ").trim(),
      normalized.replace(/\bmontpellier\b/g, " ").trim(),
    ]);

    return [...candidates]
      .map((value) => normalizeAddressKey(value))
      .filter(Boolean);
  }

  function looksLikeMontpellierAddress(rawValue) {
    const normalized = simplify(rawValue);
    if (!normalized) return false;
    if (MTP_SUBAREA_BY_KEY.has(normalized)) return false;
    if (LATTES_AREA_BY_KEY.has(normalized)) return false;
    if (CITY_NAME_BY_KEY.has(normalized)) return false;

    const hasStreetType = STREET_TYPE_TOKENS.some(
      (token) =>
        normalized === token ||
        normalized.startsWith(`${token} `) ||
        normalized.includes(` ${token} `),
    );
    const hasLeadingNumber = /^\d/.test(normalized);
    const mentionsMontpellier =
      normalized.includes("montpellier") || /\b340\d{2}\b/.test(normalized);

    return (
      (hasStreetType && (hasLeadingNumber || mentionsMontpellier || normalized.length >= 12)) ||
      (hasLeadingNumber && mentionsMontpellier)
    );
  }

  function resolveMontpellierAddressSelection(rawValue) {
    const exactAddressCandidates = buildAddressPointLookupCandidates(rawValue);

    for (const candidate of exactAddressCandidates) {
      const addressEntry = MTP_ADDRESS_POINT_INDEX_BY_KEY.get(candidate);
      if (!addressEntry || !addressEntry.subzoneId) continue;
      const addressArea = AREA_BY_ID[addressEntry.subzoneId];
      if (!addressArea) continue;
      return createAreaSelection(addressArea, {
        displayValue: addressEntry.label || addressArea.label,
        resolvedPoint: createResolvedPoint({
          lat: Number(addressEntry.lat),
          lng: Number(addressEntry.lng),
          label: addressEntry.label || addressArea.label,
          precision: "address",
        }),
        isAddressSelection: true,
      });
    }

    const candidates = splitAddressCandidates(rawValue);

    for (const candidate of candidates) {
      const exactMatch = MTP_SUBAREA_BY_KEY.get(candidate);
      if (exactMatch) {
        return createAreaSelection(exactMatch);
      }
    }

    for (const candidate of candidates) {
      const addressMatch = MTP_SUBAREA_BY_ADDRESS_KEY.get(candidate);
      if (addressMatch) {
        return createAreaSelection(addressMatch);
      }
    }

    for (const candidate of candidates) {
      const streetEntry = MTP_STREET_INDEX_BY_KEY.get(candidate);
      if (!streetEntry || !streetEntry.subzoneId) continue;
      if (streetEntry.isAmbiguous && Number(streetEntry.confidence || 0) < 0.75) {
        continue;
      }
      const streetArea = AREA_BY_ID[streetEntry.subzoneId];
      if (streetArea) {
        return createAreaSelection(streetArea, {
          displayValue: streetEntry.label || streetArea.label,
          resolvedPoint: createResolvedPoint({
            lat: Number(streetEntry.lat),
            lng: Number(streetEntry.lng),
            label: streetEntry.label || streetArea.label,
            precision: "street",
          }),
          isAddressSelection: true,
        });
      }
    }

    return createEmptySelection();
  }

  function pointInsideBounds(lat, lng, bounds) {
    const [[southLat, westLng], [northLat, eastLng]] = bounds;
    return lat >= southLat && lat <= northLat && lng >= westLng && lng <= eastLng;
  }

  function getCloudDistanceScore(lat, lng, cloud) {
    const [centerLat, centerLng] = cloud.center;
    const angleRad = (cloud.angle * Math.PI) / 180;
    const dx = lng - centerLng;
    const dy = lat - centerLat;
    const cos = Math.cos(-angleRad);
    const sin = Math.sin(-angleRad);
    const xr = dx * cos - dy * sin;
    const yr = dx * sin + dy * cos;

    return (xr / cloud.rx) ** 2 + (yr / cloud.ry) ** 2;
  }

  function resolveMontpellierSubareaByCoordinates(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    const insideBounds = MTP_SUBAREAS.filter((area) => pointInsideBounds(lat, lng, area.bounds));
    if (insideBounds.length) {
      return insideBounds.sort(
        (a, b) => distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng),
      )[0];
    }

    const insideCloud = MTP_SUBAREAS.map((area) => ({
      area,
      score: getCloudDistanceScore(lat, lng, CLOUDS[area.cloud]),
    }))
      .filter((entry) => entry.score <= 1)
      .sort((a, b) => a.score - b.score);

    return insideCloud[0] ? insideCloud[0].area : null;
  }

  function candidateMentionsMontpellier(candidate) {
    if (!candidate || typeof candidate !== "object") return false;

    const address = candidate.address || {};
    const localityCandidates = [
      address.city,
      address.town,
      address.village,
      address.municipality,
      address.city_district,
      candidate.display_name,
      candidate.name,
    ].filter(Boolean);

    return localityCandidates.some((value) => simplify(value).includes("montpellier"));
  }

  function resolveMontpellierGeocodeCandidate(candidate) {
    if (!candidateMentionsMontpellier(candidate)) {
      return createEmptySelection();
    }

    const address = candidate.address || {};
    const textualCandidates = [
      address.suburb,
      address.neighbourhood,
      address.neighborhood,
      address.quarter,
      address.city_district,
      address.borough,
      address.residential,
      address.hamlet,
      address.road,
      address.pedestrian,
      address.footway,
      address.cycleway,
      address.path,
      candidate.name,
    ].filter(Boolean);

    for (const value of textualCandidates) {
      const selection = resolveMontpellierAddressSelection(value);
      if (selection.matched) {
        return selection;
      }
    }

    const lat = Number(candidate.lat);
    const lng = Number(candidate.lon ?? candidate.lng);
    const area = resolveMontpellierSubareaByCoordinates(lat, lng);
    return area
      ? createAreaSelection(area, {
          displayValue: String(candidate.display_name || area.label || "").trim() || area.label,
          resolvedPoint: createResolvedPoint({
            lat,
            lng,
            label: String(candidate.display_name || area.label || "").trim() || area.label,
            precision: "address",
          }),
          isAddressSelection: true,
        })
      : createEmptySelection();
  }

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
      return createEmptySelection();
    }

    const mtpArea = MTP_SUBAREA_BY_KEY.get(normalized);
    if (mtpArea) {
      return createAreaSelection(mtpArea);
    }

    const lattesArea = LATTES_AREA_BY_KEY.get(normalized);
    if (lattesArea) {
      return {
        matched: true,
        cityValue: "Lattes",
        subzoneValue: lattesArea.id,
        displayValue: lattesArea.label,
        resolvedPoint: null,
        isAddressSelection: false,
      };
    }

    const city = CITY_NAME_BY_KEY.get(normalized);
    if (city) {
      return {
        matched: true,
        cityValue: city,
        subzoneValue: "",
        displayValue: city,
        resolvedPoint: null,
        isAddressSelection: false,
      };
    }

    const addressSelection = resolveMontpellierAddressSelection(rawValue);
    if (addressSelection.matched) {
      return addressSelection;
    }

    return createEmptySelection();
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
      assignments[area.id] = resolveHospitalForArea(area, "divers");
    });
    return assignments;
  }

  function resolveMapHospital(area, specialty) {
    return resolveHospitalForArea(area, specialty);
  }

  function resolveOrientationHospital(area, symptomText) {
    const normalizedSymptom = simplify(symptomText);
    const detectedSpecialty = inferDetectedSpecialty(symptomText);

    if (normalizedSymptom && !detectedSpecialty) {
      return "";
    }

    return resolveHospitalForArea(area, detectedSpecialty || "divers");
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
    return estimateTheoreticalTravelFromPoint(area, hospitalId);
  }

  function estimateTheoreticalTravelFromPoint(point, hospitalId) {
    const hospital = HOSPITALS[hospitalId];
    const km = distanceKm(point.lat, point.lng, hospital.lat, hospital.lng);
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
    looksLikeMontpellierAddress,
    resolveCitySelection,
    resolveMontpellierAddressSelection,
    resolveMontpellierGeocodeCandidate,
    resolveMontpellierSubareaByCoordinates,
    resolveAreaFromSelection,
    estimateTheoreticalTravelFromPoint,
    computeDiversAssignments,
    resolveMapHospital,
    resolveOrientationHospital,
    estimateTheoreticalTravel,
  });
})(globalThis);
