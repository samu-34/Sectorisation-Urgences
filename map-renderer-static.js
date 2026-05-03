/**
 * MediMap — map-renderer-static.js
 * Couches statiques et semi-statiques de la carte: nuages, etablissements, labels, legende
 */

(function attachMapStaticRenderer(global) {
  "use strict";

  function createStaticLayerRenderer({
    map,
    legendElement = null,
    buildHospitalPopup,
  }) {
    let cloudLayers = [];
    let haloLayers = [];
    let heatLayers = [];
    let hospitalLayers = [];
    let labelLayers = [];
    let baseLayersBuilt = false;

    function clearLayers(arr) {
      arr.forEach((layer) => map.removeLayer(layer));
      arr.length = 0;
    }

    function elevateLayer(layer, zIndexOffset = 1000) {
      if (!layer) return;
      if (typeof layer.bringToFront === "function") {
        layer.bringToFront();
      }
      if (typeof layer.setZIndexOffset === "function") {
        layer.setZIndexOffset(zIndexOffset);
      }
    }

    function elevateStaticForegroundLayers() {
      hospitalLayers.forEach((layer, index) => {
        elevateLayer(layer, 1200 + index);
      });
      labelLayers.forEach((layer, index) => {
        elevateLayer(layer, 1600 + index);
      });
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
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

    function ensureBaseLayers() {
      if (baseLayersBuilt) return;
      buildHospitals();
      buildLabels();
      elevateStaticForegroundLayers();
      baseLayersBuilt = true;
    }

    function refresh({ specialtyId, cloudHospitalMap }) {
      clearLayers(cloudLayers);
      clearLayers(haloLayers);
      clearLayers(heatLayers);

      Object.entries(cloudHospitalMap).forEach(([cloud, hospitalId]) => {
        addComboHeat(cloud, hospitalId);
        addCloud(cloud, hospitalId, 140);
      });

      ensureBaseLayers();
      elevateStaticForegroundLayers();
      renderLegend(specialtyId);
    }

    return Object.freeze({
      refresh,
      updateLabelVisibility,
    });
  }

  global.MediMapMapStatic = Object.freeze({
    createStaticLayerRenderer,
  });
})(globalThis);
