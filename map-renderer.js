/**
 * MediMap — map-renderer.js
 * Rendu Leaflet et interactions cartographiques
 * Dépend de data.js et Leaflet (chargés avant)
 */

(function attachMapRenderer(global) {
  "use strict";

  function createMapRenderer({
    mapElementId = "map",
    legendElement = null,
    getOrientationSpecialty = () => "divers",
  } = {}) {
    const map = L.map(mapElementId, { zoomControl: true }).setView(
      [43.61, 3.87],
      12,
    );
    const AGGLO_BOUNDS = [
      [43.47, 3.67],
      [43.75, 4.08],
    ];

    let cloudLayers = [];
    let haloLayers = [];
    let heatLayers = [];
    let hospitalLayers = [];
    let labelLayers = [];
    let focusLayer = null;
    let routeLayer = null;
    let orientationPopup = null;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    function fitAggloBounds() {
      map.fitBounds(AGGLO_BOUNDS, { padding: [24, 24] });
    }

    function setDefaultMapView() {
      map.setView([43.61, 3.87], 12);
    }

    const AggloControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        container.style.position = "absolute";
        container.style.top = "0";
        container.style.left = "56px";
        container.style.margin = "10px 0 0 0";
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
        button.style.borderRadius = "4px";

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        L.DomEvent.on(button, "click", (event) => {
          L.DomEvent.stop(event);
          fitAggloBounds();
        });

        return container;
      },
    });

    map.addControl(new AggloControl());

    function clearLayers(arr) {
      arr.forEach((layer) => map.removeLayer(layer));
      arr.length = 0;
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
      const normalized = String(hex || "")
        .replace("#", "")
        .trim();
      if (!/^[\da-fA-F]{6}$/.test(normalized)) {
        return `rgba(15, 23, 42, ${alpha})`;
      }

      const r = Number.parseInt(normalized.slice(0, 2), 16);
      const g = Number.parseInt(normalized.slice(2, 4), 16);
      const b = Number.parseInt(normalized.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function applyPopupCardTint(
      element,
      color,
      backgroundAlpha = 0.1,
      borderAlpha = 0.2,
    ) {
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
      const row = document.createElement("span");
      row.appendChild(document.createElement("strong")).textContent = label;
      row.appendChild(document.createTextNode(" "));

      const phoneValues = String(value ?? "")
        .split(/\s*\/\s*|\s+ou\s+/i)
        .map((entry) => entry.trim())
        .filter(Boolean);

      phoneValues.forEach((phone, index) => {
        const link = document.createElement("a");
        link.href = `tel:${normalizePhoneHref(phone)}`;
        link.textContent = phone;
        row.appendChild(link);
        if (index < phoneValues.length - 1) {
          row.appendChild(document.createTextNode(" ou "));
        }
      });

      return row;
    }

    async function copyTextToClipboard(value) {
      const text = String(value ?? "").trim();
      if (!text) return false;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (error) {}

      try {
        const input = document.createElement("textarea");
        input.value = text;
        input.setAttribute("readonly", "");
        input.style.position = "absolute";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(input);
        return copied;
      } catch (error) {
        return false;
      }
    }

    function buildCopyButton(value, color) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Copier";
      button.style.width = "auto";
      button.style.padding = "5px 10px";
      button.style.borderRadius = "999px";
      button.style.border = `1px solid ${hexToRgba(color, 0.26)}`;
      button.style.background = hexToRgba(color, 0.1);
      button.style.color = color;
      button.style.fontSize = "12px";
      button.style.fontWeight = "700";
      button.style.marginLeft = "8px";

      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const previousLabel = button.textContent;
        const copied = await copyTextToClipboard(value);
        button.textContent = copied ? "Copié" : "Échec";
        window.setTimeout(() => {
          button.textContent = previousLabel;
        }, 1200);
      });

      return button;
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

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.gap = "10px";
      row.style.flexWrap = "wrap";
      row.append(
        buildPhoneLink("Urgences :", hospital.phone_urgences),
        buildCopyButton(hospital.phone_urgences, hospital.color),
      );

      phones.append(row);
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
            Object.assign(document.createElement("strong"), {
              textContent: "Temps de trajet :",
            }),
            document.createTextNode(
              ` ${Math.round(travelEstimate.theoreticalDurationMin)} min`,
            ),
          );
          return span;
        })(),
        (() => {
          const span = document.createElement("span");
          span.append(
            Object.assign(document.createElement("strong"), {
              textContent: "Distance :",
            }),
            document.createTextNode(
              ` ${travelEstimate.directDistanceKm.toFixed(1)} km`,
            ),
          );
          return span;
        })(),
      ]);
      return routeInfo;
    }

    function buildPopupDisclaimerCard() {
      const disclaimer = document.createElement("div");
      disclaimer.className = "small";
      disclaimer.style.marginTop = "10px";
      disclaimer.style.padding = "10px 12px";
      disclaimer.style.borderRadius = "12px";
      disclaimer.style.background = "#fff7db";
      disclaimer.style.border = "1px solid #f2d58a";
      disclaimer.style.color = "#7a4b00";
      const popupSpecialty = getOrientationSpecialty();

      disclaimer.textContent =
        popupSpecialty === "trauma"
          ? "⚠️ Prérequis : traumatisme SANS deformation ni plaie chez patient STABLE ⚠️"
          : popupSpecialty === "cardio_pneumo"
            ? "⚠️ Prérequis : patient STABLE + ECG normal ⚠️"
            : "⚠️ Prérequis : patient STABLE et SANS signe de gravite ⚠️";

      return disclaimer;
    }

    function clearSelectionVisuals() {
      if (focusLayer) {
        (Array.isArray(focusLayer) ? focusLayer : [focusLayer]).forEach((layer) =>
          map.removeLayer(layer),
        );
        focusLayer = null;
      }
      if (routeLayer) {
        (Array.isArray(routeLayer) ? routeLayer : [routeLayer]).forEach((layer) =>
          map.removeLayer(layer),
        );
        routeLayer = null;
      }
    }

    function closeOrientationPopup() {
      if (!orientationPopup) return;
      map.closePopup(orientationPopup);
      orientationPopup = null;
    }

    function seededRand(seed) {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    function generateCloudPoints(key, n) {
      const cloud = CLOUDS[key];
      const style = CLOUD_STYLE[key] || { spread: 0.7 };
      const spread = style.spread || 0.7;
      const anchors = CLOUD_ANCHORS[key] || [
        { lat: cloud.center[0], lng: cloud.center[1], w: 1 },
      ];
      const totalWeight = anchors.reduce((sum, anchor) => sum + anchor.w, 0);
      const cumulative = [];
      let acc = 0;
      anchors.forEach((anchor) => {
        acc += anchor.w / totalWeight;
        cumulative.push(acc);
      });
      const angle = (cloud.angle * Math.PI) / 180;

      function pickAnchor(r) {
        for (let index = 0; index < cumulative.length; index += 1) {
          if (r <= cumulative[index]) return anchors[index];
        }
        return anchors[anchors.length - 1];
      }

      const points = [];
      for (let index = 0; index < n; index += 1) {
        const pickedAnchor = pickAnchor(seededRand(index * 29 + key.length * 17));
        const r1 = seededRand(index * 31 + key.length * 7);
        const r2 = seededRand(index * 47 + key.length * 11);
        const radius = Math.pow(r1, 0.82) * spread;
        const theta = r2 * Math.PI * 2;
        const localRx = cloud.rx * (0.34 + 0.32 * spread);
        const localRy = cloud.ry * (0.34 + 0.32 * spread);
        const x = radius * Math.cos(theta) * localRx;
        const y = radius * Math.sin(theta) * localRy;
        const xr = x * Math.cos(angle) - y * Math.sin(angle);
        const yr = x * Math.sin(angle) + y * Math.cos(angle);
        const jitterLat =
          (seededRand(index * 53 + key.length * 13) - 0.5) * cloud.ry * 0.1;
        const jitterLng =
          (seededRand(index * 61 + key.length * 19) - 0.5) * cloud.rx * 0.1;
        points.push([pickedAnchor.lat + yr + jitterLat, pickedAnchor.lng + xr + jitterLng]);
      }
      return points;
    }

    function addHeatBlob(lat, lng, color, baseRadius, opacity) {
      const layers = [
        { r: 1.9, o: 0.16 },
        { r: 1.25, o: 0.22 },
        { r: 0.72, o: 0.28 },
      ];
      layers.forEach(({ r, o }) => {
        heatLayers.push(
          L.circle([lat, lng], {
            radius: baseRadius * r,
            stroke: false,
            fillColor: color,
            fillOpacity: opacity * o,
            interactive: false,
          }).addTo(map),
        );
      });
    }

    function addComboHeat(key, hospitalId) {
      const hospital = HOSPITALS[hospitalId];
      const anchors = CLOUD_ANCHORS[key] || [
        { lat: CLOUDS[key].center[0], lng: CLOUDS[key].center[1], w: 1 },
      ];
      const style = CLOUD_STYLE[key] || { halo: 0.7 };
      const isMtp = key.startsWith("mtp_");
      const isLattes = key.startsWith("lattes");
      const baseRadius = isMtp ? 260 : isLattes ? 210 : 340;
      const opacity = isMtp ? 0.9 : 1.0;

      anchors.forEach((anchor) => {
        const weightFactor = 0.75 + (anchor.w || 1) * 0.35;
        const radius = baseRadius * weightFactor * (style.halo || 0.7);
        addHeatBlob(anchor.lat, anchor.lng, hospital.color, radius, opacity);
      });

      const cloud = CLOUDS[key];
      addHeatBlob(
        cloud.center[0],
        cloud.center[1],
        hospital.color,
        baseRadius * 0.92 * (style.halo || 0.7),
        opacity * 0.95,
      );
    }

    function addCloud(key, hospitalId, density) {
      const hospital = HOSPITALS[hospitalId];
      const cloud = CLOUDS[key];
      const style = CLOUD_STYLE[key] || { density, halo: 0.7 };
      const haloRadius =
        Math.max(cloud.rx * 62000, cloud.ry * 82000) * (style.halo || 0.7);

      haloLayers.push(
        L.circle([cloud.center[0], cloud.center[1]], {
          radius: haloRadius,
          stroke: false,
          fillColor: hospital.color,
          fillOpacity: 0.09,
          interactive: false,
        }).addTo(map),
      );

      generateCloudPoints(key, style.density || density).forEach((point, idx) => {
        const mod = idx % 12;
        const radius = mod === 0 ? 3.4 : mod < 4 ? 2.8 : 2.2;

        cloudLayers.push(
          L.circleMarker(point, {
            radius: radius + 3,
            stroke: false,
            fillColor: hospital.color,
            fillOpacity: 0.12,
            interactive: false,
          }).addTo(map),
        );
        cloudLayers.push(
          L.circleMarker(point, {
            radius,
            stroke: false,
            fillColor: hospital.color,
            fillOpacity: mod === 0 ? 0.65 : 0.85,
            interactive: false,
          }).addTo(map),
        );
      });
    }

    function buildHospitalPopup(hospital) {
      const root = document.createElement("div");
      root.append(
        buildPopupHeader(hospital, "Établissement"),
        buildPopupAddressBlock(hospital),
        buildPopupPhoneCard(hospital),
      );
      return root;
    }

    function buildOrientationPopupContent(hospitalId, travelEstimate) {
      const hospital = HOSPITALS[hospitalId];
      const root = document.createElement("div");
      root.append(
        buildPopupHeader(hospital, "Destination prioritaire"),
        buildPopupAddressBlock(hospital),
        buildPopupPhoneCard(hospital),
        buildPopupRouteCard(hospital, travelEstimate),
        buildPopupDisclaimerCard(),
      );
      return root;
    }

    function getOrientationViewportPadding({ reserveRouteView = false } = {}) {
      const size = map.getSize();
      const topPadding = reserveRouteView
        ? Math.max(280, Math.min(420, Math.round(size.y * 0.36)))
        : Math.max(220, Math.min(340, Math.round(size.y * 0.28)));
      const rightPadding = reserveRouteView
        ? Math.max(250, Math.min(520, Math.round(size.x * 0.32)))
        : Math.max(200, Math.min(460, Math.round(size.x * 0.26)));
      const bottomPadding = reserveRouteView
        ? Math.max(150, Math.min(280, Math.round(size.y * 0.2)))
        : Math.max(120, Math.min(240, Math.round(size.y * 0.16)));

      return {
        paddingTopLeft: [reserveRouteView ? 90 : 70, topPadding],
        paddingBottomRight: [rightPadding, bottomPadding],
      };
    }

    function openOrientationPopup(hospitalId, travelEstimate) {
      closeOrientationPopup();
      const hospital = HOSPITALS[hospitalId];
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
        .setLatLng([hospital.lat, hospital.lng])
        .setContent(buildOrientationPopupContent(hospitalId, travelEstimate))
        .openOn(map);
    }

    function buildHospitals() {
      clearLayers(hospitalLayers);
      Object.values(HOSPITALS).forEach((hospital) => {
        const halo = L.circle([hospital.lat, hospital.lng], {
          radius: 700,
          stroke: false,
          fillColor: hospital.color,
          fillOpacity: 0.14,
          interactive: false,
        }).addTo(map);
        const marker = L.circleMarker([hospital.lat, hospital.lng], {
          radius: 8.5,
          color: "#fff",
          weight: 2.5,
          fillColor: hospital.color,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup(buildHospitalPopup(hospital), { maxWidth: 320 });
        hospitalLayers.push(halo, marker);
      });
    }

    function updateLabelVisibility() {
      const zoom = map.getZoom();
      document.querySelectorAll(".quarter-label").forEach((element) => {
        element.style.opacity = zoom >= 12 ? "0.65" : "0";
      });
      document.querySelectorAll(".city-label").forEach((element) => {
        element.style.opacity = zoom >= 11 ? "0.55" : "0.28";
      });
    }

    function buildLabels() {
      clearLayers(labelLayers);
      CITY_AREAS.filter((area) => area.type === "commune").forEach((area) => {
        labelLayers.push(
          L.marker([area.lat, area.lng], {
            interactive: false,
            icon: L.divIcon({
              className: "city-label",
              html: escapeHtml(area.city),
            }),
          }).addTo(map),
        );
      });
      MTP_SUBAREAS.forEach((area) => {
        labelLayers.push(
          L.marker([area.lat, area.lng], {
            interactive: false,
            icon: L.divIcon({
              className: "quarter-label",
              html: escapeHtml(area.label.replace("Montpellier - ", "")),
            }),
          }).addTo(map),
        );
      });
      updateLabelVisibility();
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
      const control = [
        midLat + normalLat * curvature,
        midLng + normalLng * curvature,
      ];

      return [start, control, end];
    }

    function buildDestinationFlagIcon(hospital) {
      const fill = escapeHtml(hospital.color);
      const label = escapeHtml(`Destination ${hospital.name}`);

      return L.divIcon({
        className: "destination-flag-icon",
        iconSize: [28, 36],
        iconAnchor: [10, 34],
        popupAnchor: [0, -30],
        html: `
          <div class="destination-flag-wrap" aria-label="${label}" role="img">
            <svg viewBox="0 0 28 36" width="28" height="36" aria-hidden="true">
              <path
                d="M9 3.5c0-.83.67-1.5 1.5-1.5S12 2.67 12 3.5V5h8.7c1.28 0 2.08 1.39 1.45 2.5l-1.32 2.32c-.27.47-.27 1.04 0 1.5l1.32 2.32c.63 1.11-.17 2.5-1.45 2.5H12v9.36c0 .46-.21.89-.56 1.17l-1.86 1.48c-.98.78-2.43.08-2.43-1.17V3.5Z"
                fill="${fill}"
                stroke="#ffffff"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <path
                d="M10.5 31.5c2.4 0 4.35 1.42 4.35 3.17S12.9 37.84 10.5 37.84 6.15 36.42 6.15 34.67s1.95-3.17 4.35-3.17Z"
                transform="translate(0 -2)"
                fill="rgba(15, 23, 42, 0.18)"
              />
            </svg>
          </div>
        `,
      });
    }

    function drawRoute(area, hospitalId) {
      if (routeLayer) {
        (Array.isArray(routeLayer) ? routeLayer : [routeLayer]).forEach((layer) =>
          map.removeLayer(layer),
        );
      }
      const hospital = HOSPITALS[hospitalId];
      const path = buildRoutePath(area, hospital);
      const shadow = L.polyline(path, {
        color: "#ffffff",
        weight: 8,
        opacity: 0.7,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      const main = L.polyline(path, {
        color: hospital.color,
        weight: 4,
        opacity: 0.92,
        dashArray: "12,8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      const startMarker = L.circleMarker([area.lat, area.lng], {
        radius: 5,
        color: "#ffffff",
        weight: 2,
        fillColor: "#0f172a",
        fillOpacity: 1,
      }).addTo(map);
      const endMarker = L.marker([hospital.lat, hospital.lng], {
        icon: buildDestinationFlagIcon(hospital),
        keyboard: false,
      }).addTo(map);
      routeLayer = [shadow, main, startMarker, endMarker];
    }

    function highlightCurrentArea(area) {
      if (focusLayer) {
        (Array.isArray(focusLayer) ? focusLayer : [focusLayer]).forEach((layer) =>
          map.removeLayer(layer),
        );
      }
      focusLayer = L.circleMarker([area.lat, area.lng], {
        radius: 9,
        color: "#ffffff",
        weight: 3,
        fillColor: "#0f172a",
        fillOpacity: 0.9,
      }).addTo(map);
    }

    function zoomToBounds(area, hospitalId, { reserveRouteView = false } = {}) {
      const hospital = HOSPITALS[hospitalId];
      const routePath = buildRoutePath(area, hospital);
      const bounds = L.latLngBounds(routePath);
      const viewportPadding = getOrientationViewportPadding({ reserveRouteView });
      bounds.extend([area.lat, area.lng]);
      bounds.extend([hospital.lat, hospital.lng]);
      if (area.lat === hospital.lat && area.lng === hospital.lng) {
        bounds.extend([area.lat + 0.005, area.lng + 0.005]);
      }
      map.fitBounds(bounds, {
        ...viewportPadding,
        maxZoom: reserveRouteView ? 13 : 14,
      });
    }

    function renderLegend(specialtyId) {
      if (!legendElement) return;
      const specialty =
        SPECIALTIES.find((item) => item.id === specialtyId)?.label || specialtyId;
      const title = document.createElement("div");
      title.style.fontWeight = "700";
      title.style.marginBottom = "6px";
      title.textContent = specialty;

      const items = Object.values(HOSPITALS).map((hospital) => {
        const row = document.createElement("div");
        row.className = "legend-item";

        const swatch = document.createElement("span");
        swatch.className = "legend-swatch";
        swatch.style.background = hospital.color;

        const label = document.createElement("span");
        label.textContent = hospital.name;

        row.append(swatch, label);
        return row;
      });

      legendElement.replaceChildren(title, ...items);
    }

    function refresh({ specialtyId, cloudHospitalMap }) {
      clearLayers(cloudLayers);
      clearLayers(haloLayers);
      clearLayers(heatLayers);

      Object.entries(cloudHospitalMap).forEach(([cloud, hospitalId]) => {
        addComboHeat(cloud, hospitalId);
        addCloud(cloud, hospitalId, 140);
      });

      buildHospitals();
      buildLabels();
      renderLegend(specialtyId);
    }

    function showOrientation({ area, hospitalId, travelEstimate }) {
      closeOrientationPopup();
      highlightCurrentArea(area);
      drawRoute(area, hospitalId);
      zoomToBounds(area, hospitalId);
      openOrientationPopup(hospitalId, travelEstimate);
      // Re-cadre ensuite avec plus de marge pour garder tout le trajet visible
      // une fois que l'autopan de la popup a fini de repositionner la carte.
      setTimeout(() => {
        if (!orientationPopup) return;
        zoomToBounds(area, hospitalId, { reserveRouteView: true });
      }, 0);
    }

    function resetDecisionState() {
      closeOrientationPopup();
      clearSelectionVisuals();
    }

    function getState() {
      return {
        map,
        focusLayer,
        routeLayer,
        orientationPopup,
      };
    }

    map.on("zoomend", updateLabelVisibility);

    return Object.freeze({
      fitAggloBounds,
      setDefaultMapView,
      invalidateSize() {
        map.invalidateSize();
      },
      refresh,
      showOrientation,
      resetDecisionState,
      getState,
    });
  }

  global.MediMapMapRenderer = Object.freeze({
    createMapRenderer,
  });
})(globalThis);
