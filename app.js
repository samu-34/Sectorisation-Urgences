/**
 * MediMap — app.js
 * Logique applicative : carte, orientation, interactions
 * Dépend de data.js (chargé avant) et Leaflet
 */

// ─────────────────────────────────────────────
// INITIALISATION CARTE
// ─────────────────────────────────────────────
const map = L.map("map", { zoomControl: true }).setView([43.61, 3.87], 10);
const AGGLO_BOUNDS = [[43.47, 3.67], [43.75, 4.08]];

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

function fitAggloBounds() {
  map.fitBounds(AGGLO_BOUNDS, { padding: [24, 24] });
}

const AggloControl = L.Control.extend({
  options: { position: "topleft" },
  onAdd() {
    const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
    const button = L.DomUtil.create("button", "", container);
    button.type = "button";
    button.title = "Adapter le zoom sur l'agglomération";
    button.setAttribute("aria-label", "Adapter le zoom sur l'agglomération");
    button.innerHTML = `
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="8 3 3 3 3 8"></polyline>
        <line x1="3" y1="3" x2="9" y2="9"></line>
        <polyline points="16 3 21 3 21 8"></polyline>
        <line x1="15" y1="9" x2="21" y2="3"></line>
        <polyline points="3 16 3 21 8 21"></polyline>
        <line x1="3" y1="21" x2="9" y2="15"></line>
        <polyline points="16 21 21 21 21 16"></polyline>
        <line x1="15" y1="15" x2="21" y2="21"></line>
      </svg>
    `;
    button.style.width = "34px";
    button.style.height = "34px";
    button.style.padding = "0";
    button.style.border = "0";
    button.style.borderRadius = "0";
    button.style.background = "#ffffff";
    button.style.color = "#17313b";
    button.style.display = "grid";
    button.style.placeItems = "center";
    button.style.cursor = "pointer";
    button.style.boxShadow = "none";

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    L.DomEvent.on(button, "click", (event) => {
      L.DomEvent.stop(event);
      fitAggloBounds();
    });

    return container;
  }
});

map.addControl(new AggloControl());

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
  symptomInput: document.getElementById("symptomInput"),
  suggestBox: document.getElementById("suggestBox"),
  citySuggestBox: document.getElementById("citySuggestBox"),
  regulateBtn: document.getElementById("regulateBtn"),
  focusBtn: document.getElementById("focusBtn")
};

// ─────────────────────────────────────────────
// ÉTAT APPLICATIF
// ─────────────────────────────────────────────
let activeSpecialty = "divers";
let diversAssignments = {};
let cloudLayers = [];
let haloLayers = [];
let heatLayers = [];
let hospitalLayers = [];
let labelLayers = [];
let focusLayer = null;
let routeLayer = null;
let orientationPopup = null;
let symptomSuggestionIndex = -1;
let citySuggestionIndex = -1;

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

function getSuggestItems(box) {
  return [...box.querySelectorAll(".suggest-item")];
}

function setSuggestBoxState(input, box, isOpen) {
  box.classList.toggle("hidden", !isOpen);
  input.setAttribute("aria-expanded", isOpen ? "true" : "false");
  if (!isOpen) {
    input.removeAttribute("aria-activedescendant");
  }
}

function setActiveSuggestion(input, box, index) {
  const items = getSuggestItems(box);
  items.forEach((item, itemIndex) => {
    const isActive = itemIndex === index;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  if (index >= 0 && items[index]) {
    input.setAttribute("aria-activedescendant", items[index].id);
  } else {
    input.removeAttribute("aria-activedescendant");
  }
}

function closeSymptomSuggestions() {
  DOM.suggestBox.innerHTML = "";
  symptomSuggestionIndex = -1;
  setSuggestBoxState(DOM.symptomInput, DOM.suggestBox, false);
}

function closeCitySuggestions() {
  DOM.citySuggestBox.innerHTML = "";
  citySuggestionIndex = -1;
  setSuggestBoxState(DOM.cityInput, DOM.citySuggestBox, false);
}

function moveActiveSuggestion(input, box, currentIndex, delta) {
  const items = getSuggestItems(box);
  if (!items.length || box.classList.contains("hidden")) return -1;

  let nextIndex = currentIndex;
  if (nextIndex < 0) {
    nextIndex = delta > 0 ? 0 : items.length - 1;
  } else {
    nextIndex = (nextIndex + delta + items.length) % items.length;
  }

  setActiveSuggestion(input, box, nextIndex);
  return nextIndex;
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
    .findIndex(word => word.startsWith(normalizedQuery));

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
      const label = getLabel(item);
      const rank = getMatchRank(label, query);

      if (!rank) return null;

      return { item, rank, sourceIndex };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.rank.score !== b.rank.score) return a.rank.score - b.rank.score;
      if (a.rank.index !== b.rank.index) return a.rank.index - b.rank.index;
      if (a.rank.length !== b.rank.length) return a.rank.length - b.rank.length;
      return a.sourceIndex - b.sourceIndex;
    })
    .map(entry => entry.item);
}

function filiereLabelById(id) {
  const found = SPECIALTIES.find(s => s.id === id);
  return found ? found.label : id;
}

function inferDetectedSpecialty(text) {
  return simplify(text) ? detectSpecialty(text) : "";
}

function setDetectedSpecialtyIndicator(specialtyId = "") {
  DOM.detectedSpecialty.value = specialtyId ? filiereLabelById(specialtyId) : "";
}

function syncDetectedSpecialtyIndicator(text = DOM.symptomInput.value) {
  setDetectedSpecialtyIndicator(inferDetectedSpecialty(text));
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

function getPopupAddress(hospital) {
  const city = String(hospital?.city || "").trim();
  const address = String(hospital?.address || "").trim();
  const cityPrefix = `${city} · `;

  if (city && address.startsWith(cityPrefix)) {
    return address.slice(cityPrefix.length);
  }

  return address;
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex || "").replace("#", "").trim();
  if (!/^[\da-fA-F]{6}$/.test(normalized)) return `rgba(15, 23, 42, ${alpha})`;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyPopupCardTint(element, color, backgroundAlpha = 0.1, borderAlpha = 0.2) {
  element.style.background = hexToRgba(color, backgroundAlpha);
  element.style.border = `1px solid ${hexToRgba(color, borderAlpha)}`;
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

function buildPopupHeader(hospital, pillText) {
  const header = document.createElement("div");
  header.className = "card-flex";
  header.style.marginBottom = "8px";

  const dot = document.createElement("span");
  dot.className = "dot-color";
  dot.style.background = hospital.color;
  dot.style.marginTop = "0";

  const headerText = document.createElement("div");
  const pillRow = document.createElement("div");
  pillRow.style.display = "flex";
  pillRow.style.alignItems = "center";
  pillRow.style.gap = "8px";

  const pill = document.createElement("div");
  pill.className = "pill";
  pill.textContent = pillText;
  pill.style.background = hexToRgba(hospital.color, 0.14);
  pill.style.color = hospital.color;
  pill.style.border = `1px solid ${hexToRgba(hospital.color, 0.28)}`;

  const title = document.createElement("div");
  title.className = "popup-hospital-name";
  title.textContent = hospital.name;

  pillRow.append(dot, pill);
  headerText.append(pillRow, title);
  header.append(headerText);

  return header;
}

function buildPopupAddressBlock(hospital) {
  const details = document.createElement("div");
  const addressRow = buildInfoRow("Adresse :", getPopupAddress(hospital));
  addressRow.style.marginTop = "8px";
  details.append(addressRow);
  return details;
}

function buildPopupPhoneCard(hospital) {
  const phones = document.createElement("div");
  phones.className = "contact-block popup-phone";
  applyPopupCardTint(phones, hospital.color, 0.1, 0.18);
  appendTextLine(phones, [
    buildPhoneLink("Urgences :", hospital.phone_urgences),
    buildPhoneLink("Spécialités :", hospital.phone_specialites)
  ]);
  return phones;
}

function buildPopupRouteCard(hospital, travelEstimate) {
  const routeInfo = document.createElement("div");
  routeInfo.className = "route-info small";
  applyPopupCardTint(routeInfo, hospital.color, 0.05, 0.16);
  appendTextLine(routeInfo, [
    (() => {
      const span = document.createElement("span");
      span.append(
        Object.assign(document.createElement("strong"), { textContent: "Temps de trajet :" }),
        document.createTextNode(` ${Math.round(travelEstimate.theoreticalDurationMin)} min`)
      );
      return span;
    })(),
    (() => {
      const span = document.createElement("span");
      span.append(
        Object.assign(document.createElement("strong"), { textContent: "Distance :" }),
        document.createTextNode(` ${travelEstimate.directDistanceKm.toFixed(1)} km`)
      );
      return span;
    })()
  ]);
  return routeInfo;
}

function clearSelectionVisuals() {
  if (focusLayer) {
    (Array.isArray(focusLayer) ? focusLayer : [focusLayer]).forEach(layer => map.removeLayer(layer));
    focusLayer = null;
  }
  if (routeLayer) {
    (Array.isArray(routeLayer) ? routeLayer : [routeLayer]).forEach(layer => map.removeLayer(layer));
    routeLayer = null;
  }
}

function closeOrientationPopup() {
  if (!orientationPopup) return;
  map.closePopup(orientationPopup);
  orientationPopup = null;
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
  root.append(
    buildPopupHeader(h, "Établissement"),
    buildPopupAddressBlock(h),
    buildPopupPhoneCard(h)
  );
  return root;
}

function buildOrientationPopupContent(areaLabel, hospitalId, symptom, travelEstimate) {
  const h = HOSPITALS[hospitalId];
  const root = document.createElement("div");
  root.append(
    buildPopupHeader(h, "Destination prioritaire"),
    buildPopupAddressBlock(h),
    buildPopupPhoneCard(h),
    buildPopupRouteCard(h, travelEstimate)
  );
  return root;
}

function openOrientationPopup(areaLabel, hospitalId, symptom, travelEstimate) {
  closeOrientationPopup();
  const h = HOSPITALS[hospitalId];
  const viewportPadding = getOrientationViewportPadding();
  orientationPopup = L.popup({
    closeButton: true,
    autoClose: false,
    closeOnClick: false,
    autoPan: true,
    keepInView: true,
    autoPanPaddingTopLeft: viewportPadding.paddingTopLeft,
    autoPanPaddingBottomRight: viewportPadding.paddingBottomRight,
    offset: [0, -14],
    maxWidth: 360,
  })
    .setLatLng([h.lat, h.lng])
    .setContent(buildOrientationPopupContent(areaLabel, hospitalId, symptom, travelEstimate))
    .openOn(map);
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
  diversAssignments = {};
  [...CITY_AREAS, ...MTP_SUBAREAS].forEach(area => {
    diversAssignments[area.id] = resolveHospitalForArea(area, "divers", {});
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
  if (focusLayer) {
    (Array.isArray(focusLayer) ? focusLayer : [focusLayer]).forEach(layer => map.removeLayer(layer));
  }
  focusLayer = L.circleMarker([area.lat, area.lng], {
    radius: 9,
    color: "#ffffff",
    weight: 3,
    fillColor: "#0f172a",
    fillOpacity: 0.9
  }).addTo(map);
}

function buildRoutePath(area, hospital) {
  const start = [area.lat, area.lng];
  const end = [hospital.lat, hospital.lng];
  const dLat = end[0] - start[0];
  const dLng = end[1] - start[1];
  const distance = Math.hypot(dLat, dLng);

  if (distance < 0.01) return [start, end];

  const midLat = (start[0] + end[0]) / 2;
  const midLng = (start[1] + end[1]) / 2;
  const normalLat = -dLng / distance;
  const normalLng = dLat / distance;
  const curvature = Math.min(0.012, distance * 0.18);
  const control = [midLat + normalLat * curvature, midLng + normalLng * curvature];

  return [start, control, end];
}

function getOrientationViewportPadding() {
  const size = map.getSize();
  return {
    paddingTopLeft: [
      70,
      Math.max(220, Math.min(340, Math.round(size.y * 0.28))),
    ],
    paddingBottomRight: [
      Math.max(200, Math.min(460, Math.round(size.x * 0.26))),
      Math.max(120, Math.min(240, Math.round(size.y * 0.16))),
    ],
  };
}

function drawRoute(area, hospitalId) {
  if (routeLayer) {
    (Array.isArray(routeLayer) ? routeLayer : [routeLayer]).forEach(layer => map.removeLayer(layer));
  }
  const h = HOSPITALS[hospitalId];
  const path = buildRoutePath(area, h);
  const shadow = L.polyline(path, {
    color: "#ffffff",
    weight: 8,
    opacity: 0.7,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(map);
  const main = L.polyline(path, {
    color: h.color,
    weight: 4,
    opacity: 0.92,
    dashArray: "12,8",
    lineCap: "round",
    lineJoin: "round"
  }).addTo(map);
  const startMarker = L.circleMarker([area.lat, area.lng], {
    radius: 5,
    color: "#ffffff",
    weight: 2,
    fillColor: "#0f172a",
    fillOpacity: 1
  }).addTo(map);
  const endMarker = L.circleMarker([h.lat, h.lng], {
    radius: 6,
    color: "#ffffff",
    weight: 2,
    fillColor: h.color,
    fillOpacity: 1
  }).addTo(map);
  routeLayer = [shadow, main, startMarker, endMarker];
}

/**
 * Zoom la carte pour montrer à la fois la zone patient et l'hôpital orienté
 */
function zoomToBounds(area, hospitalId) {
  const h = HOSPITALS[hospitalId];
  const routePath = buildRoutePath(area, h);
  const bounds = L.latLngBounds(routePath);
  bounds.extend([area.lat, area.lng]);
  bounds.extend([h.lat, h.lng]);
  if (area.lat === h.lat && area.lng === h.lng) {
    bounds.extend([area.lat + 0.005, area.lng + 0.005]);
  }
  map.fitBounds(bounds, {
    ...getOrientationViewportPadding(),
    maxZoom: 14,
  });
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

function resetDecisionState() {
  closeOrientationPopup();
  clearSelectionVisuals();
}

// ─────────────────────────────────────────────
// MISE À JOUR DÉCISION & CARTE
// ─────────────────────────────────────────────
function updateDecision() {
  const area = getCurrentArea();
  if (!area) {
    resetDecisionState();
    return;
  }

  closeOrientationPopup();
  const hid = getAreaHospital(area);
  const areaLabel = area.label || area.city;
  const symptom = DOM.symptomInput.value.trim();
  const travelEstimate = estimateTheoreticalTravel(area, hid);

  highlightCurrentArea(area);
  drawRoute(area, hid);
  zoomToBounds(area, hid);
  openOrientationPopup(areaLabel, hid, symptom, travelEstimate);
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
// UI — légende, chips, selects
// ─────────────────────────────────────────────
function renderLegend() {
  DOM.legend.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${SPECIALTIES.find(s => s.id === activeSpecialty).label}</div>`;
  Object.values(HOSPITALS).forEach(h => {
    DOM.legend.innerHTML += `<div class="legend-item"><span class="legend-swatch" style="background:${h.color}"></span><span>${h.name}</span></div>`;
  });
}

function renderChips() {
  DOM.chips.innerHTML = "";
  SPECIALTIES.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "chip" + (s.id === activeSpecialty ? " active" : "");
    btn.textContent = s.label;
    btn.onclick = () => {
      activeSpecialty = s.id;
      renderChips();
      refreshMap();
      updateDecision();
    };
    DOM.chips.appendChild(btn);
  });
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
  if (!q) {
    closeSymptomSuggestions();
    return;
  }

  const matches = getRankedMatches(MOTIF_CATALOG, q, item => item.label).slice(0, 8);
  if (!matches.length) {
    closeSymptomSuggestions();
    return;
  }

  DOM.suggestBox.innerHTML = matches.map((item, idx) =>
    `<div id="symptom-option-${idx}" class="suggest-item" role="option" aria-selected="false" data-idx="${idx}" data-label="${item.label}" data-filiere="${item.filiere}">
      ${item.label}<span class="suggest-cat">${filiereLabelById(item.filiere)}</span>
    </div>`
  ).join("");
  symptomSuggestionIndex = -1;
  setSuggestBoxState(DOM.symptomInput, DOM.suggestBox, true);
  setActiveSuggestion(DOM.symptomInput, DOM.suggestBox, symptomSuggestionIndex);
  DOM.suggestBox.querySelectorAll(".suggest-item").forEach(el => {
    el.addEventListener("click", () => applySuggestion(el.dataset.label, el.dataset.filiere));
  });
}

function applySuggestion(label, filiere) {
  DOM.symptomInput.value = label;
  setDetectedSpecialtyIndicator(filiere);
  closeSymptomSuggestions();
}

// ─────────────────────────────────────────────
// AUTOCOMPLETE — Communes
// ─────────────────────────────────────────────
const CITY_SUGGESTIONS = Array.from(
  new Map(
    [
      { label: "Montpellier", category: "Commune" },
      ...[...new Set(CITY_AREAS.map(a => a.city))].map(city => ({
        label: city,
        category: "Commune",
      })),
      ...CITY_AREAS
        .filter(area => area.type === "lattes" && area.label)
        .map(area => ({
          label: area.label,
          category: "Secteur Lattes",
        })),
      ...MTP_SUBAREAS.flatMap(area => [
        {
          label: area.label,
          category: "Quartier Montpellier",
        },
        ...(area.aliases || []).map(name => ({
          label: name,
          category: "Quartier Montpellier",
        })),
      ]),
    ].map(entry => [simplify(entry.label), entry])
  ).values()
);

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
  closeCitySuggestions();
  updateDecision();
}

function renderCitySuggestions(query) {
  const q = simplify(query);
  if (!q) {
    closeCitySuggestions();
    return;
  }

  const matches = getRankedMatches(
    CITY_SUGGESTIONS,
    q,
    suggestion => suggestion.label
  ).slice(0, 10);

  if (!matches.length) {
    closeCitySuggestions();
    return;
  }

  DOM.citySuggestBox.innerHTML = matches.map((suggestion, idx) => (
    `<div id="city-option-${idx}" class="suggest-item" role="option" aria-selected="false" data-city="${escapeHtml(suggestion.label)}">${escapeHtml(suggestion.label)}<span class="suggest-cat">${escapeHtml(suggestion.category)}</span></div>`
  )).join("");
  citySuggestionIndex = -1;
  setSuggestBoxState(DOM.cityInput, DOM.citySuggestBox, true);
  setActiveSuggestion(DOM.cityInput, DOM.citySuggestBox, citySuggestionIndex);

  DOM.citySuggestBox.querySelectorAll(".suggest-item").forEach(el => {
    el.addEventListener("click", () => applyCitySelection(el.dataset.city));
  });
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────
DOM.symptomInput.addEventListener("input", () => {
  syncDetectedSpecialtyIndicator(DOM.symptomInput.value);
  renderSuggestions(DOM.symptomInput.value);
});
DOM.cityInput.addEventListener("input", () => {
  renderCitySuggestions(DOM.cityInput.value);
  syncSelectionFromCityInput(DOM.cityInput.value);
  updateDecision();
});

DOM.cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCitySuggestions();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    citySuggestionIndex = moveActiveSuggestion(
      DOM.cityInput,
      DOM.citySuggestBox,
      citySuggestionIndex,
      1
    );
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    citySuggestionIndex = moveActiveSuggestion(
      DOM.cityInput,
      DOM.citySuggestBox,
      citySuggestionIndex,
      -1
    );
    return;
  }
  if (e.key !== "Enter") return;

  e.preventDefault();
  const items = getSuggestItems(DOM.citySuggestBox);
  const current = citySuggestionIndex >= 0 ? items[citySuggestionIndex] : null;
  if (current && !DOM.citySuggestBox.classList.contains("hidden")) {
    applyCitySelection(current.dataset.city);
    return;
  }

  closeCitySuggestions();
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
  if (e.key === "ArrowDown") {
    e.preventDefault();
    symptomSuggestionIndex = moveActiveSuggestion(
      DOM.symptomInput,
      DOM.suggestBox,
      symptomSuggestionIndex,
      1
    );
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    symptomSuggestionIndex = moveActiveSuggestion(
      DOM.symptomInput,
      DOM.suggestBox,
      symptomSuggestionIndex,
      -1
    );
    return;
  }
  if (e.key === "Enter") {
    const items = getSuggestItems(DOM.suggestBox);
    const current =
      symptomSuggestionIndex >= 0 ? items[symptomSuggestionIndex] : null;
    if (!current || DOM.suggestBox.classList.contains("hidden")) return;
    e.preventDefault();
    applySuggestion(current.dataset.label, current.dataset.filiere);
    return;
  }
  if (e.key === "Escape") {
    closeSymptomSuggestions();
  }
});

DOM.regulateBtn.addEventListener("click", () => {
  activeSpecialty = inferDetectedSpecialty(DOM.symptomInput.value) || "divers";
  renderChips();
  refreshMap();
  updateDecision();
});

DOM.focusBtn.addEventListener("click", () => {
  DOM.symptomInput.value = "";
  DOM.cityInput.value = "";
  DOM.citySelect.value = "";
  DOM.subzoneSelect.value = "";
  setDetectedSpecialtyIndicator("");
  closeSymptomSuggestions();
  closeCitySuggestions();
  updateSubzoneOptions();
  resetDecisionState();
  fitAggloBounds();
});

DOM.citySelect.addEventListener("change", () => {
  DOM.cityInput.value = DOM.citySelect.value || "";
  updateSubzoneOptions();
  updateDecision();
});

DOM.subzoneSelect.addEventListener("change", updateDecision);

// Fermer les suggest-box au clic extérieur
document.addEventListener("click", (e) => {
  if (!DOM.symptomInput.parentElement.contains(e.target)) closeSymptomSuggestions();
  if (!DOM.cityInput.parentElement.contains(e.target)) closeCitySuggestions();
});

map.on('zoomend', updateLabelVisibility);

// ─────────────────────────────────────────────
// INITIALISATION AU CHARGEMENT
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const toolbar = document.getElementById("toolbarText");
  if (toolbar) {
    toolbar.style.display = "none";
  }
  if (DOM.decisionCard) {
    const decisionSection = DOM.decisionCard.closest(".section");
    if (decisionSection) {
      decisionSection.style.display = "none";
    }
  }
  renderChips();
  setDetectedSpecialtyIndicator("");
  populateCitySelect();
  updateSubzoneOptions();
  refreshMap();
  updateDecision();
  fitAggloBounds();
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
