/**
 * MediMap — app.js
 * Logique applicative : carte, orientation, interactions
 * Dépend de data.js (chargé avant) et Leaflet
 */

// ─────────────────────────────────────────────
// INITIALISATION CARTE
// ─────────────────────────────────────────────
const map = L.map("map", { zoomControl: true }).setView([43.61, 3.87], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

// ─────────────────────────────────────────────
// RÉFÉRENCES DOM
// ─────────────────────────────────────────────
const DOM = {
  chips: document.getElementById("chips"),
  citySelect: document.getElementById("citySelect"),
  cityInput: document.getElementById("cityInput"),
  subzoneSelect: document.getElementById("subzoneSelect"),
  subzoneWrap: document.getElementById("subzoneWrap"),
  detectedSpecialty: document.getElementById("detectedSpecialty"),
  decisionCard: document.getElementById("decisionCard"),
  legend: document.getElementById("legend"),
  toolbar: document.getElementById("toolbarText"),
  symptomInput: document.getElementById("symptomInput"),
  suggestBox: document.getElementById("suggestBox"),
  citySuggestBox: document.getElementById("citySuggestBox"),
  quickBadges: document.getElementById("quickBadges"),
  regulateBtn: document.getElementById("regulateBtn"),
  focusBtn: document.getElementById("focusBtn")
};

// ─────────────────────────────────────────────
// ÉTAT APPLICATIF
// ─────────────────────────────────────────────
let activeSpecialty = "cardio_pneumo";
let diversAssignments = {};
let cloudLayers = [];
let haloLayers = [];
let heatLayers = [];
let hospitalLayers = [];
let labelLayers = [];
let focusLayer = null;
let routeLayer = null;
let suggestionIndex = -1;

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────
function simplify(text) {
  return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['']/g, "'").replace(/\s+/g, " ").trim();
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDensityWeight(name) {
  const dense = ["Castelnau-le-Lez", "Le Crès", "Mauguio", "Pérols", "Juvignac", "Saint-Jean-de-Védas", "Baillargues", "Clapiers", "Jacou", "Palavas-les-Flots", "Lattes", "Montpellier"];
  const medium = ["Villeneuve-lès-Maguelone", "Fabrègues", "Pignan", "Saint-Gély-du-Fesc", "Prades-le-Lez", "Montferrier-sur-Lez", "Castries"];
  if (dense.includes(name)) return 1.7;
  if (medium.includes(name)) return 1.35;
  return 1.0;
}

function seededRand(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function clearLayers(arr) {
  arr.forEach(l => map.removeLayer(l));
  arr.length = 0;
}

function filiereLabelById(id) {
  const found = SPECIALTIES.find(s => s.id === id);
  return found ? found.label : id;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePhoneHref(value) {
  return String(value ?? "").replace(/[^\d+]/g, "");
}

function appendTextLine(container, parts = []) {
  parts.forEach((part, index) => {
    if (part instanceof Node) {
      container.appendChild(part);
    } else if (part !== null && part !== undefined) {
      container.appendChild(document.createTextNode(String(part)));
    }
    if (index < parts.length - 1) {
      container.appendChild(document.createElement("br"));
    }
  });
}

function buildPhoneLink(label, value) {
  const link = document.createElement("a");
  link.href = `tel:${normalizePhoneHref(value)}`;
  link.textContent = value;

  const row = document.createElement("span");
  row.appendChild(document.createElement("strong")).textContent = label;
  row.appendChild(document.createTextNode(" "));
  row.appendChild(link);
  return row;
}

function buildInfoRow(label, value) {
  const row = document.createElement("div");
  row.className = "small";
  const strong = document.createElement("strong");
  strong.textContent = label;
  row.append(strong, document.createTextNode(` ${value}`));
  return row;
}

function buildEmptyDecisionMessage(message) {
  const row = document.createElement("div");
  row.className = "small";
  row.textContent = message;
  return row;
}

function buildDecisionCard(areaLabel, hospitalId, symptom, travelEstimate) {
  const h = HOSPITALS[hospitalId];
  const card = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "card-flex";

  const headerText = document.createElement("div");
  const pill = document.createElement("div");
  pill.className = "pill";
  pill.textContent = "Destination prioritaire";
  const title = document.createElement("h3");
  title.textContent = h.name;
  headerText.append(pill, title);

  const dot = document.createElement("span");
  dot.className = "dot-color";
  dot.style.background = h.color;

  header.append(headerText, dot);
  card.appendChild(header);

  card.appendChild(buildInfoRow("Motif :", symptom || "Non precise"));
  card.appendChild(buildInfoRow("Zone analysée :", areaLabel));
  card.appendChild(buildInfoRow("Filière :", SPECIALTIES.find(s => s.id === activeSpecialty).label));
  card.appendChild(buildInfoRow("Règle :", "sectorisation territoriale appliquée"));

  const establishmentRow = buildInfoRow("Établissement :", `${h.city} · ${h.address}`);
  establishmentRow.style.marginTop = "8px";
  card.appendChild(establishmentRow);

  const contactBlock = document.createElement("div");
  contactBlock.className = "contact-block small";
  appendTextLine(contactBlock, [
    buildPhoneLink("📞 Urgences :", h.phone_urgences),
    buildPhoneLink("📞 Spécialités :", h.phone_specialites)
  ]);
  card.appendChild(contactBlock);

  if (travelEstimate) {
    const routeInfo = document.createElement("div");
    routeInfo.className = "route-info small";
    appendTextLine(routeInfo, [
      (() => {
        const span = document.createElement("span");
        span.append(
          Object.assign(document.createElement("strong"), { textContent: "⏱ Temps theorique :" }),
          document.createTextNode(` ${Math.round(travelEstimate.theoreticalDurationMin)} min`)
        );
        return span;
      })(),
      (() => {
        const span = document.createElement("span");
        span.append(
          Object.assign(document.createElement("strong"), { textContent: "📏 Distance a vol d'oiseau :" }),
          document.createTextNode(` ${travelEstimate.directDistanceKm.toFixed(1)} km`)
        );
        return span;
      })()
    ]);
    card.appendChild(routeInfo);
  }

  return card;
}

function renderToolbar(areaLabel, hospitalId, travelEstimate) {
  DOM.toolbar.replaceChildren();

  const specialtyStrong = document.createElement("strong");
  specialtyStrong.textContent = SPECIALTIES.find(s => s.id === activeSpecialty).label;
  DOM.toolbar.appendChild(specialtyStrong);
  DOM.toolbar.appendChild(document.createElement("br"));
  DOM.toolbar.appendChild(document.createTextNode(areaLabel));
  DOM.toolbar.appendChild(document.createElement("br"));

  const hospitalSpan = document.createElement("span");
  hospitalSpan.style.color = HOSPITALS[hospitalId].color;
  hospitalSpan.style.fontWeight = "700";
  hospitalSpan.textContent = HOSPITALS[hospitalId].name;
  DOM.toolbar.appendChild(hospitalSpan);
  DOM.toolbar.appendChild(document.createElement("br"));
  DOM.toolbar.appendChild(
    document.createTextNode(`Temps theorique ${Math.round(travelEstimate.theoreticalDurationMin)} min · ${travelEstimate.directDistanceKm.toFixed(1)} km a vol d'oiseau`)
  );
}

function clearSelectionVisuals() {
  if (focusLayer) {
    map.removeLayer(focusLayer);
    focusLayer = null;
  }
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
}

// ─────────────────────────────────────────────
// DÉTECTION FILIÈRE
// ─────────────────────────────────────────────
function detectSpecialty(text) {
  const t = simplify(text);
  if (!t) return "cardio_pneumo";
  const cardio = ["douleur thoracique", "thoracique", "palpitation", "arythmie", "dyspnee", "dyspnée", "desaturation", "désaturation", "toux", "asthme", "bpco", "pneumo", "syncope"];
  const gastro = ["abdomen", "abdominale", "colique nephretique", "colique néphrétique", "hematurie", "hématurie", "retention", "rétention", "dysurie", "digestif", "melena", "méléna", "hematemese", "hématémèse", "colique", "urologie", "gastro"];
  const trauma = ["trauma", "traumatisme", "entorse", "cheville", "poignet", "genou", "epaule", "épaule", "chute", "contusion", "fracture", "plaie", "doigt"];
  if (trauma.some(k => t.includes(simplify(k)))) return "trauma";
  if (gastro.some(k => t.includes(simplify(k)))) return "gastro_uro";
  if (cardio.some(k => t.includes(simplify(k)))) return "cardio_pneumo";
  return "divers";
}

// ─────────────────────────────────────────────
// GÉNÉRATION NUAGES DE POINTS
// ─────────────────────────────────────────────
function generateCloudPoints(key, n) {
  const c = CLOUDS[key];
  const style = CLOUD_STYLE[key] || { spread: 0.7 };
  const spread = style.spread || 0.7;
  const anchors = CLOUD_ANCHORS[key] || [{ lat: c.center[0], lng: c.center[1], w: 1 }];
  const totalW = anchors.reduce((s, a) => s + a.w, 0);
  const cumulative = [];
  let acc = 0;
  anchors.forEach(a => { acc += a.w / totalW; cumulative.push(acc); });
  const angle = c.angle * Math.PI / 180;

  function pickAnchor(r) {
    for (let i = 0; i < cumulative.length; i++) { if (r <= cumulative[i]) return anchors[i]; }
    return anchors[anchors.length - 1];
  }

  const pts = [];
  for (let i = 0; i < n; i++) {
    const rPick = seededRand(i * 29 + key.length * 17);
    const a = pickAnchor(rPick);
    const r1 = seededRand(i * 31 + key.length * 7);
    const r2 = seededRand(i * 47 + key.length * 11);
    const radius = Math.pow(r1, 0.82) * spread;
    const theta = r2 * Math.PI * 2;
    const localRx = c.rx * (0.34 + 0.32 * spread);
    const localRy = c.ry * (0.34 + 0.32 * spread);
    const x = radius * Math.cos(theta) * localRx;
    const y = radius * Math.sin(theta) * localRy;
    const xr = x * Math.cos(angle) - y * Math.sin(angle);
    const yr = x * Math.sin(angle) + y * Math.cos(angle);
    const jitterLat = (seededRand(i * 53 + key.length * 13) - 0.5) * c.ry * 0.10;
    const jitterLng = (seededRand(i * 61 + key.length * 19) - 0.5) * c.rx * 0.10;
    pts.push([a.lat + yr + jitterLat, a.lng + xr + jitterLng]);
  }
  return pts;
}

// ─────────────────────────────────────────────
// HEATMAP BLOBS
// ─────────────────────────────────────────────
function addHeatBlob(lat, lng, color, baseRadius, opacity) {
  const layers = [
    { r: 1.9, o: 0.16 },
    { r: 1.25, o: 0.22 },
    { r: 0.72, o: 0.28 }
  ];
  layers.forEach(({ r, o }) => {
    heatLayers.push(L.circle([lat, lng], {
      radius: baseRadius * r, stroke: false, fillColor: color, fillOpacity: opacity * o, interactive: false
    }).addTo(map));
  });
}

function addComboHeat(key, hospitalId) {
  const h = HOSPITALS[hospitalId];
  const anchors = CLOUD_ANCHORS[key] || [{ lat: CLOUDS[key].center[0], lng: CLOUDS[key].center[1], w: 1 }];
  const style = CLOUD_STYLE[key] || { halo: 0.7 };
  const isMtp = key.startsWith("mtp_");
  const isLattes = key.startsWith("lattes");
  const baseRadius = isMtp ? 260 : isLattes ? 210 : 340;
  const opacity = isMtp ? 0.9 : 1.0;

  anchors.forEach(a => {
    const weightFactor = 0.75 + (a.w || 1) * 0.35;
    const radius = baseRadius * weightFactor * (style.halo || 0.7);
    addHeatBlob(a.lat, a.lng, h.color, radius, opacity);
  });

  const c = CLOUDS[key];
  addHeatBlob(c.center[0], c.center[1], h.color, baseRadius * 0.92 * (style.halo || 0.7), opacity * 0.95);
}

// ─────────────────────────────────────────────
// NUAGES DE POINTS SUR LA CARTE
// ─────────────────────────────────────────────
function addCloud(key, hospitalId, density) {
  const h = HOSPITALS[hospitalId];
  const c = CLOUDS[key];
  const style = CLOUD_STYLE[key] || { density: density, halo: 0.7 };
  const haloRadius = Math.max(c.rx * 62000, c.ry * 82000) * (style.halo || 0.7);

  haloLayers.push(L.circle([c.center[0], c.center[1]], {
    radius: haloRadius, stroke: false, fillColor: h.color, fillOpacity: 0.09, interactive: false
  }).addTo(map));

  generateCloudPoints(key, style.density || density).forEach((pt, idx) => {
    const mod = idx % 12;
    const r = mod === 0 ? 3.4 : mod < 4 ? 2.8 : 2.2;
    // Glow
    cloudLayers.push(L.circleMarker(pt, { radius: r + 3, stroke: false, fillColor: h.color, fillOpacity: 0.12, interactive: false }).addTo(map));
    // Point
    cloudLayers.push(L.circleMarker(pt, { radius: r, stroke: false, fillColor: h.color, fillOpacity: mod === 0 ? 0.65 : 0.85, interactive: false }).addTo(map));
  });
}

// ─────────────────────────────────────────────
// HÔPITAUX SUR LA CARTE (avec popups enrichis)
// ─────────────────────────────────────────────
function buildHospitalPopup(h) {
  const root = document.createElement("div");

  const title = document.createElement("div");
  title.className = "popup-hospital-name";
  title.textContent = h.name;

  const meta = document.createElement("div");
  meta.style.fontSize = "12px";
  meta.style.color = "#5d7680";
  meta.style.marginBottom = "4px";
  meta.textContent = `${h.city} · ${h.address}`;

  const phones = document.createElement("div");
  phones.className = "popup-phone";
  appendTextLine(phones, [
    buildPhoneLink("📞 Urgences :", h.phone_urgences),
    buildPhoneLink("📞 Spécialités :", h.phone_specialites)
  ]);

  root.append(title, meta, phones);
  return root;
}

function buildHospitals() {
  clearLayers(hospitalLayers);
  Object.values(HOSPITALS).forEach(h => {
    const halo = L.circle([h.lat, h.lng], { radius: 700, stroke: false, fillColor: h.color, fillOpacity: 0.14, interactive: false }).addTo(map);
    const marker = L.circleMarker([h.lat, h.lng], { radius: 8.5, color: "#fff", weight: 2.5, fillColor: h.color, fillOpacity: 1 })
      .addTo(map)
      .bindPopup(buildHospitalPopup(h), { maxWidth: 320 });
    hospitalLayers.push(halo, marker);
  });
}

// ─────────────────────────────────────────────
// LABELS CARTE
// ─────────────────────────────────────────────
function updateLabelVisibility() {
  const z = map.getZoom();
  document.querySelectorAll('.quarter-label').forEach(el => { el.style.opacity = z >= 12 ? '0.65' : '0'; });
  document.querySelectorAll('.city-label').forEach(el => { el.style.opacity = z >= 11 ? '0.55' : '0.28'; });
}

function buildLabels() {
  clearLayers(labelLayers);
  CITY_AREAS.filter(a => a.type === "commune").forEach(a => {
    labelLayers.push(L.marker([a.lat, a.lng], { interactive: false, icon: L.divIcon({ className: "city-label", html: a.city }) }).addTo(map));
  });
  MTP_SUBAREAS.forEach(a => {
    labelLayers.push(L.marker([a.lat, a.lng], { interactive: false, icon: L.divIcon({ className: "quarter-label", html: a.label.replace("Montpellier - ", "") }) }).addTo(map));
  });
  updateLabelVisibility();
}

// ─────────────────────────────────────────────
// SECTORISATION — calcul d'orientation
// ─────────────────────────────────────────────
function computeDiversAssignments() {
  const hospitals = Object.keys(HOSPITALS);
  const areas = [
    ...CITY_AREAS.map(a => ({ id: a.id, city: a.city, lat: a.lat, lng: a.lng, weight: estimateDensityWeight(a.city) })),
    ...MTP_SUBAREAS.map(a => ({ id: a.id, city: "Montpellier", lat: a.lat, lng: a.lng, weight: 2.4 }))
  ];
  const total = areas.reduce((s, a) => s + a.weight, 0);
  const target = {}, current = {};
  hospitals.forEach(h => { target[h] = total / hospitals.length; current[h] = 0; });
  diversAssignments = {};
  areas.sort((a, b) => b.weight - a.weight).forEach(area => {
    let best = hospitals[0], scoreBest = Infinity;
    hospitals.forEach(hid => {
      const h = HOSPITALS[hid];
      const d = distanceKm(area.lat, area.lng, h.lat, h.lng);
      const overload = Math.max(0, current[hid] - target[hid]);
      const under = Math.max(0, target[hid] - current[hid]);
      const score = d + overload * 7.5 - under * 1.6;
      if (score < scoreBest) { scoreBest = score; best = hid; }
    });
    diversAssignments[area.id] = best;
    current[best] += area.weight;
  });
}

function getAreaHospital(area) {
  return resolveHospitalForArea(area, activeSpecialty, diversAssignments);
}

function estimateTheoreticalTravel(area, hospitalId) {
  const h = HOSPITALS[hospitalId];
  const km = distanceKm(area.lat, area.lng, h.lat, h.lng);
  const durationMin = km < 8 ? km * 2.2 : km < 20 ? km * 1.8 : km * 1.45;
  return { directDistanceKm: km, theoreticalDurationMin: durationMin };
}

// ─────────────────────────────────────────────
// CARTE — focus & route
// ─────────────────────────────────────────────
function highlightCurrentArea(area) {
  if (focusLayer) map.removeLayer(focusLayer);
  focusLayer = null;
}

function drawRoute(area, hospitalId) {
  if (routeLayer) map.removeLayer(routeLayer);
  const h = HOSPITALS[hospitalId];
  routeLayer = L.polyline([[area.lat, area.lng], [h.lat, h.lng]], {
    color: "#0f172a", weight: 4, opacity: 0.7, dashArray: "10,8"
  }).addTo(map);
}

/**
 * Zoom la carte pour montrer à la fois la zone patient et l'hôpital orienté
 */
function zoomToBounds(area, hospitalId) {
  const h = HOSPITALS[hospitalId];
  const c = CLOUDS[area.cloud];
  const bounds = L.latLngBounds(
    [c.center[0], c.center[1]],
    [h.lat, h.lng]
  );
  // Ajouter aussi le point patient
  bounds.extend([area.lat, area.lng]);
  if (Array.isArray(area.bounds)) {
    area.bounds.forEach(point => bounds.extend(point));
  }
  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
}

// ─────────────────────────────────────────────
// CARTE DECISION — HTML enrichi
// ─────────────────────────────────────────────
function getSelectionPrompt() {
  if (!DOM.cityInput.value.trim() && !DOM.citySelect.value) {
    return "Carte interactive chargée.";
  }
  if (DOM.citySelect.value === "Montpellier" && !DOM.subzoneSelect.value) {
    return "Sélectionnez un quartier de Montpellier.";
  }
  if (DOM.citySelect.value === "Lattes" && !DOM.subzoneSelect.value) {
    return "Sélectionnez un secteur de Lattes.";
  }
  return "Sélectionnez une commune ou un quartier valide.";
}

function resetDecisionState(toolbarText = "Carte interactive chargée.") {
  clearSelectionVisuals();
  DOM.decisionCard.replaceChildren(buildEmptyDecisionMessage("Aucune décision disponible."));
  DOM.toolbar.textContent = toolbarText;
}

// ─────────────────────────────────────────────
// MISE À JOUR DÉCISION & CARTE
// ─────────────────────────────────────────────
function updateDecision() {
  const area = getCurrentArea();
  if (!area) {
    resetDecisionState(getSelectionPrompt());
    return;
  }
  const hid = getAreaHospital(area);
  const travelEstimate = estimateTheoreticalTravel(area, hid);
  DOM.decisionCard.replaceChildren(buildDecisionCard(area.label || area.city, hid, DOM.symptomInput.value.trim(), travelEstimate));
  renderToolbar(area.label || area.city, hid, travelEstimate);

  highlightCurrentArea(area);
  drawRoute(area, hid);
  // Zoom entre zone patient et hôpital
  zoomToBounds(area, hid);
}

function getCurrentArea() {
  if (!DOM.citySelect.value) return null;
  if (DOM.citySelect.value === "Montpellier") {
    if (!DOM.subzoneSelect.value) return null;
    return MTP_SUBAREAS.find(a => a.id === DOM.subzoneSelect.value);
  }
  if (DOM.citySelect.value === "Lattes") {
    if (!DOM.subzoneSelect.value) return null;
    return CITY_AREAS.find(a => a.id === DOM.subzoneSelect.value);
  }
  return CITY_AREAS.find(a => a.city === DOM.citySelect.value && a.type === "commune");
}

function focusArea() {
  const area = getCurrentArea();
  if (!area) return;
  const hid = getAreaHospital(area);
  zoomToBounds(area, hid);
}

// ─────────────────────────────────────────────
// REFRESH MAP (nuages + hôpitaux + légende)
// ─────────────────────────────────────────────
function refreshMap() {
  clearLayers(cloudLayers);
  clearLayers(haloLayers);
  clearLayers(heatLayers);
  computeDiversAssignments();

  const cloudHospitalMap = {
    sud_ouest: getAreaHospital(CITY_AREAS.find(a => a.id === "saint_jean_de_vedas")),
    ouest: getAreaHospital(CITY_AREAS.find(a => a.id === "murviel")),
    nord: getAreaHospital(CITY_AREAS.find(a => a.id === "grabels")),
    est: getAreaHospital(CITY_AREAS.find(a => a.id === "clapiers")),
    sud_est: getAreaHospital(CITY_AREAS.find(a => a.id === "palavas")),
    mauguio_only: getAreaHospital(CITY_AREAS.find(a => a.id === "mauguio")),
    carnon_only: getAreaHospital(CITY_AREAS.find(a => a.id === "carnon")),
    perols_only: getAreaHospital(CITY_AREAS.find(a => a.id === "perols")),
    saint_aunes_only: getAreaHospital(CITY_AREAS.find(a => a.id === "saint_aunes")),
    baillargues_only: getAreaHospital(CITY_AREAS.find(a => a.id === "baillargues")),
    lattes_maurin: getAreaHospital(CITY_AREAS.find(a => a.id === "lattes-maurin")),
    lattes_centre: getAreaHospital(CITY_AREAS.find(a => a.id === "lattes-centre")),
    lattes_boirargues: getAreaHospital(CITY_AREAS.find(a => a.id === "lattes-boirargues")),
    mtp_hf: getAreaHospital(MTP_SUBAREAS.find(a => a.id === "mtp_hf")),
    mtp_mosson: getAreaHospital(MTP_SUBAREAS.find(a => a.id === "mtp_mosson")),
    mtp_cevennes: getAreaHospital(MTP_SUBAREAS.find(a => a.id === "mtp_cevennes")),
    mtp_pres_arenes: getAreaHospital(MTP_SUBAREAS.find(a => a.id === "mtp_pres_arenes")),
    mtp_croix_argent: getAreaHospital(MTP_SUBAREAS.find(a => a.id === "mtp_croix_argent")),
    mtp_millenaire: getAreaHospital(MTP_SUBAREAS.find(a => a.id === "mtp_millenaire")),
    mtp_port_marianne: getAreaHospital(MTP_SUBAREAS.find(a => a.id === "mtp_port_marianne")),
    mtp_centre_historique: getAreaHospital(MTP_SUBAREAS.find(a => a.id === "mtp_centre_historique")),
    mtp_arceaux_gambetta: getAreaHospital(MTP_SUBAREAS.find(a => a.id === "mtp_arceaux_gambetta"))
  };

  Object.entries(cloudHospitalMap).forEach(([cloud, hid]) => {
    addComboHeat(cloud, hid);
    addCloud(cloud, hid, 140);
  });

  buildHospitals();
  buildLabels();
  renderLegend();
}

// ─────────────────────────────────────────────
// UI — légende, badges, chips, selects
// ─────────────────────────────────────────────
function renderLegend() {
  DOM.legend.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${SPECIALTIES.find(s => s.id === activeSpecialty).label}</div>`;
  Object.values(HOSPITALS).forEach(h => {
    DOM.legend.innerHTML += `<div class="legend-item"><span class="legend-swatch" style="background:${h.color}"></span><span>${h.name}</span></div>`;
  });
}

function renderQuickBadges() {
  if (!DOM.quickBadges) return;
  const rows = [
    ['Stable', '#16a34a'],
    ['Non grave', '#2563eb'],
    ['Territorial', '#7c3aed'],
    ['Régulation', '#ea580c']
  ];
  DOM.quickBadges.innerHTML = rows.map(([t, c]) => `<span class="badge"><span class="dot-mini" style="background:${c}"></span>${t}</span>`).join("");
}

function renderChips() {
  DOM.chips.innerHTML = "";
  SPECIALTIES.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "chip" + (s.id === activeSpecialty ? " active" : "");
    btn.textContent = s.label;
    btn.onclick = () => {
      activeSpecialty = s.id;
      DOM.detectedSpecialty.value = s.id;
      renderChips();
      refreshMap();
      updateDecision();
    };
    DOM.chips.appendChild(btn);
  });
}

function populateSpecialtySelect() {
  DOM.detectedSpecialty.innerHTML = `<option value="" selected>— Sélectionner une filière —</option>` +
    SPECIALTIES.map(s => `<option value="${s.id}">${s.label}</option>`).join("");
}

function populateCitySelect() {
  const cities = ["Montpellier", "Lattes", ...CITY_AREAS.filter(a => a.type === "commune").map(a => a.city)];
  DOM.citySelect.innerHTML = `<option value="" selected>— Sélectionner —</option>` +
    [...new Set(cities)].sort((a, b) => a.localeCompare(b, "fr")).map(c => `<option value="${c}">${c}</option>`).join("");
}

function updateSubzoneOptions() {
  if (DOM.citySelect.value === "Montpellier") {
    DOM.subzoneWrap.classList.remove("hidden");
    DOM.subzoneSelect.innerHTML = `<option value="" selected>— Sélectionner un quartier —</option>` +
      MTP_SUBAREAS.map(a => `<option value="${a.id}">${a.label}</option>`).join("");
  } else if (DOM.citySelect.value === "Lattes") {
    DOM.subzoneWrap.classList.remove("hidden");
    DOM.subzoneSelect.innerHTML = `<option value="" selected>— Sélectionner un secteur —</option>` +
      CITY_AREAS
        .filter(area => area.type === "lattes")
        .map(area => `<option value="${area.id}">${area.label}</option>`)
        .join("");
  } else {
    DOM.subzoneWrap.classList.add("hidden");
    DOM.subzoneSelect.innerHTML = "";
  }
}

// ─────────────────────────────────────────────
// AUTOCOMPLETE — Symptômes
// ─────────────────────────────────────────────
function renderSuggestions(query) {
  const q = simplify(query);
  if (!q) { DOM.suggestBox.innerHTML = ""; DOM.suggestBox.classList.add("hidden"); suggestionIndex = -1; return; }
  const matches = MOTIF_CATALOG.filter(item => simplify(item.label).includes(q)).slice(0, 8);
  if (!matches.length) { DOM.suggestBox.innerHTML = ""; DOM.suggestBox.classList.add("hidden"); suggestionIndex = -1; return; }

  DOM.suggestBox.innerHTML = matches.map((item, idx) =>
    `<div class="suggest-item${idx === 0 ? ' active' : ''}" data-idx="${idx}" data-label="${item.label}" data-filiere="${item.filiere}">
      ${item.label}<span class="suggest-cat">${filiereLabelById(item.filiere)}</span>
    </div>`
  ).join("");
  DOM.suggestBox.classList.remove("hidden");
  suggestionIndex = 0;
  DOM.suggestBox.querySelectorAll(".suggest-item").forEach(el => {
    el.addEventListener("click", () => applySuggestion(el.dataset.label, el.dataset.filiere));
  });
}

function applySuggestion(label, filiere) {
  DOM.symptomInput.value = label;
  DOM.detectedSpecialty.value = filiere;
  DOM.suggestBox.innerHTML = "";
  DOM.suggestBox.classList.add("hidden");
  suggestionIndex = -1;
}

// ─────────────────────────────────────────────
// AUTOCOMPLETE — Communes
// ─────────────────────────────────────────────
const CITY_LIST = [
  ...new Set([
    ...CITY_AREAS.map(a => a.city),
    ...CITY_AREAS.filter(a => a.label).map(a => a.label),
    ...MTP_SUBAREAS.flatMap(a => [a.label, ...(a.aliases || [])])
  ])
];

const CITY_NAME_BY_KEY = new Map(
  [...new Set(CITY_AREAS.map(a => a.city)), "Montpellier", "Lattes"].map(city => [simplify(city), city])
);

const MTP_SUBAREA_BY_KEY = new Map(
  MTP_SUBAREAS.flatMap(area => [area.label, ...(area.aliases || [])].map(name => [simplify(name), area]))
);

const LATTES_AREA_BY_KEY = new Map(
  CITY_AREAS.filter(area => area.type === "lattes" && area.label).map(area => [simplify(area.label), area])
);

function syncSelectionFromCityInput(rawValue) {
  const normalized = simplify(rawValue);

  if (!normalized) {
    DOM.citySelect.value = "";
    DOM.subzoneSelect.value = "";
    updateSubzoneOptions();
    return false;
  }

  const mtpArea = MTP_SUBAREA_BY_KEY.get(normalized);
  if (mtpArea) {
    DOM.citySelect.value = "Montpellier";
    updateSubzoneOptions();
    DOM.subzoneSelect.value = mtpArea.id;
    DOM.cityInput.value = mtpArea.label;
    return true;
  }

  const lattesArea = LATTES_AREA_BY_KEY.get(normalized);
  if (lattesArea) {
    DOM.citySelect.value = "Lattes";
    updateSubzoneOptions();
    DOM.subzoneSelect.value = lattesArea.id;
    DOM.cityInput.value = lattesArea.label;
    return true;
  }

  const city = CITY_NAME_BY_KEY.get(normalized);
  if (city) {
    DOM.citySelect.value = city;
    updateSubzoneOptions();
    DOM.subzoneSelect.value = "";
    DOM.cityInput.value = city;
    return true;
  }

  DOM.citySelect.value = "";
  DOM.subzoneSelect.value = "";
  updateSubzoneOptions();
  return false;
}

function applyCitySelection(picked) {
  DOM.cityInput.value = picked;
  syncSelectionFromCityInput(picked);
  DOM.citySuggestBox.classList.add("hidden");
  updateDecision();
}

function renderCitySuggestions(query) {
  const q = simplify(query);
  if (!q) { DOM.citySuggestBox.classList.add("hidden"); DOM.citySuggestBox.innerHTML = ""; return; }
  const matches = CITY_LIST.filter(c => simplify(c).includes(q)).slice(0, 10);
  if (!matches.length) { DOM.citySuggestBox.classList.add("hidden"); DOM.citySuggestBox.innerHTML = ""; return; }

  DOM.citySuggestBox.innerHTML = matches.map(c => `<div class="suggest-item" data-city="${c}">${c}</div>`).join("");
  DOM.citySuggestBox.classList.remove("hidden");

  DOM.citySuggestBox.querySelectorAll(".suggest-item").forEach(el => {
    el.addEventListener("click", () => applyCitySelection(el.dataset.city));
  });
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────
DOM.symptomInput.addEventListener("input", () => renderSuggestions(DOM.symptomInput.value));
DOM.cityInput.addEventListener("input", () => {
  renderCitySuggestions(DOM.cityInput.value);
  syncSelectionFromCityInput(DOM.cityInput.value);
  updateDecision();
});

DOM.cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    DOM.citySuggestBox.classList.add("hidden");
    return;
  }
  if (e.key !== "Enter") return;

  const firstSuggestion = DOM.citySuggestBox.querySelector(".suggest-item");
  e.preventDefault();
  if (firstSuggestion && !DOM.citySuggestBox.classList.contains("hidden")) {
    applyCitySelection(firstSuggestion.dataset.city);
    return;
  }

  syncSelectionFromCityInput(DOM.cityInput.value);
  updateDecision();
});

DOM.cityInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    syncSelectionFromCityInput(DOM.cityInput.value);
    updateDecision();
  }, 0);
});

DOM.symptomInput.addEventListener("keydown", (e) => {
  const items = [...DOM.suggestBox.querySelectorAll(".suggest-item")];
  if (!items.length || DOM.suggestBox.classList.contains("hidden")) return;
  if (e.key === "ArrowDown") { e.preventDefault(); suggestionIndex = (suggestionIndex + 1) % items.length; }
  else if (e.key === "ArrowUp") { e.preventDefault(); suggestionIndex = (suggestionIndex - 1 + items.length) % items.length; }
  else if (e.key === "Enter") { e.preventDefault(); const cur = items[Math.max(0, suggestionIndex)]; if (cur) applySuggestion(cur.dataset.label, cur.dataset.filiere); return; }
  else if (e.key === "Escape") { DOM.suggestBox.classList.add("hidden"); return; }
  else return;
  items.forEach((el, idx) => el.classList.toggle("active", idx === suggestionIndex));
});

DOM.regulateBtn.addEventListener("click", () => {
  activeSpecialty = DOM.detectedSpecialty.value || detectSpecialty(DOM.symptomInput.value);
  renderChips();
  refreshMap();
  updateDecision();
});

DOM.focusBtn.addEventListener("click", () => {
  DOM.symptomInput.value = "";
  DOM.cityInput.value = "";
  DOM.citySelect.value = "";
  DOM.subzoneSelect.value = "";
  DOM.detectedSpecialty.value = "";
  updateSubzoneOptions();
  resetDecisionState("Carte interactive chargée.");
  map.fitBounds([[43.47, 3.67], [43.75, 4.08]]);
});

DOM.citySelect.addEventListener("change", () => {
  DOM.cityInput.value = DOM.citySelect.value || "";
  updateSubzoneOptions();
  updateDecision();
});

DOM.subzoneSelect.addEventListener("change", updateDecision);

// Fermer les suggest-box au clic extérieur
document.addEventListener("click", (e) => {
  if (!DOM.symptomInput.parentElement.contains(e.target)) DOM.suggestBox.classList.add("hidden");
  if (!DOM.cityInput.parentElement.contains(e.target)) DOM.citySuggestBox.classList.add("hidden");
});

map.on('zoomend', updateLabelVisibility);

// ─────────────────────────────────────────────
// INITIALISATION AU CHARGEMENT
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  DOM.toolbar.innerHTML = "Carte interactive chargée.";
  renderQuickBadges();
  renderChips();
  populateSpecialtySelect();
  populateCitySelect();
  updateSubzoneOptions();
  refreshMap();
  updateDecision();
  map.fitBounds([[43.47, 3.67], [43.75, 4.08]]);
  setTimeout(() => { try { map.invalidateSize(); } catch (e) { } }, 150);
});

window.addEventListener("load", () => { try { map.invalidateSize(); } catch (e) { } });
window.addEventListener("resize", () => { try { map.invalidateSize(); } catch (e) { } });

// Gestion erreurs globale
window.addEventListener("error", (ev) => {
  const panel = document.querySelector(".panel");
  if (!panel || document.getElementById("appErrorBanner")) return;
  const div = document.createElement("div");
  div.id = "appErrorBanner";
  div.style.cssText = "margin:12px 18px 0;padding:10px 12px;border:1px solid #fecaca;border-radius:12px;background:#fef2f2;color:#991b1b;font-size:12px;";
  div.textContent = "Une erreur JavaScript a été détectée. Vérifie la console du navigateur.";
  panel.insertBefore(div, panel.children[1] || null);
});
