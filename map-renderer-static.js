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
    let beziersPreviewLayers = [];
    let lattesSectorLayers = [];
    let mtpSubareaLayers = [];
    let communeContourLayer = null;
    let communeGeoJson = null;
    let communeGeoJsonLoadPromise = null;
    let mtpSubareaGeoJson = null;
    let mtpSubareaGeoJsonLoadPromise = null;
    let latestRefreshArgs = null;
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
      if (communeContourLayer && typeof communeContourLayer.bringToBack === "function") {
        communeContourLayer.bringToBack();
      }
      mtpSubareaLayers.forEach((layer, index) => {
        elevateLayer(layer, 1080 + index);
      });
      lattesSectorLayers.forEach((layer, index) => {
        elevateLayer(layer, 1100 + index);
      });
      hospitalLayers.forEach((layer, index) => {
        elevateLayer(layer, 1200 + index);
      });
      beziersPreviewLayers.forEach((layer, index) => {
        elevateLayer(layer, 1400 + index);
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

    function normalizeText(value) {
      if (typeof simplifySectorizationText === "function") {
        return simplifySectorizationText(value);
      }
      return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function buildCommuneNameKeys(value) {
      const base = normalizeText(value);
      if (!base) return [];
      const withoutArticle = base
        .replace(/^(l'|l’|le |la |les |du |de la |de l'|de l’|des )/i, "")
        .trim();
      if (!withoutArticle || withoutArticle === base) return [base];
      return [base, withoutArticle];
    }

    function clearCommuneContourLayer() {
      if (!communeContourLayer) return;
      map.removeLayer(communeContourLayer);
      communeContourLayer = null;
    }

    function ensureCommuneGeoJsonLoaded() {
      if (communeGeoJson) return Promise.resolve(communeGeoJson);
      if (communeGeoJsonLoadPromise) return communeGeoJsonLoadPromise;
      communeGeoJsonLoadPromise = fetch("data_sources/communes-34-herault.geojson")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`GeoJSON load failed (${response.status})`);
          }
          return response.json();
        })
        .then((payload) => {
          communeGeoJson = payload;
          return payload;
        })
        .catch((error) => {
          console.warn("Unable to load commune contours:", error);
          return null;
        });
      return communeGeoJsonLoadPromise;
    }

    function ensureMtpSubareaGeoJsonLoaded() {
      if (mtpSubareaGeoJson) return Promise.resolve(mtpSubareaGeoJson);
      if (mtpSubareaGeoJsonLoadPromise) return mtpSubareaGeoJsonLoadPromise;
      mtpSubareaGeoJsonLoadPromise = fetch("data_sources/montpellier_sous_quartiers.json")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`MTP sous-quartiers load failed (${response.status})`);
          }
          return response.json();
        })
        .then((payload) => {
          mtpSubareaGeoJson = payload;
          return payload;
        })
        .catch((error) => {
          console.warn("Unable to load MTP subareas:", error);
          return null;
        });
      return mtpSubareaGeoJsonLoadPromise;
    }

    function buildCommuneHospitalMap(specialtyId, cloudHospitalMap) {
      const mapByCommune = new Map();
      (CITY_AREAS || []).forEach((area) => {
        if (!area || !area.city) return;
        if (area.type === "lattes") return;
        const hospitalId =
          typeof resolveHospitalForArea === "function"
            ? resolveHospitalForArea(area, specialtyId)
            : area.cloud
              ? cloudHospitalMap[area.cloud]
              : null;
        if (!hospitalId) return;
        buildCommuneNameKeys(area.city).forEach((key) => {
          mapByCommune.set(key, hospitalId);
        });
      });
      (BEZIERS_COMMUNES || []).forEach((item) => {
        if (!item || !item.commune || !item.structureId) return;
        buildCommuneNameKeys(item.commune).forEach((key) => {
          mapByCommune.set(key, item.structureId);
        });
      });
      return mapByCommune;
    }

    function clipRingByHalfPlane(ring, midpoint, normal, keepLe) {
      if (!Array.isArray(ring) || ring.length < 4) return [];
      const openRing = ring.slice(0, -1);
      if (openRing.length < 3) return [];

      function side(point) {
        return (
          (point[0] - midpoint[0]) * normal[0] +
          (point[1] - midpoint[1]) * normal[1]
        );
      }

      function isInside(point) {
        const value = side(point);
        return keepLe ? value <= 1e-12 : value >= -1e-12;
      }

      function intersect(a, b) {
        const ax = a[0] - midpoint[0];
        const ay = a[1] - midpoint[1];
        const bx = b[0] - midpoint[0];
        const by = b[1] - midpoint[1];
        const da = ax * normal[0] + ay * normal[1];
        const db = bx * normal[0] + by * normal[1];
        const denom = da - db;
        if (Math.abs(denom) < 1e-12) return b;
        const t = da / (da - db);
        return [
          a[0] + t * (b[0] - a[0]),
          a[1] + t * (b[1] - a[1]),
        ];
      }

      const output = [];
      for (let index = 0; index < openRing.length; index += 1) {
        const current = openRing[index];
        const previous = openRing[(index - 1 + openRing.length) % openRing.length];
        const currentInside = isInside(current);
        const previousInside = isInside(previous);
        if (currentInside) {
          if (!previousInside) output.push(intersect(previous, current));
          output.push(current);
        } else if (previousInside) {
          output.push(intersect(previous, current));
        }
      }

      if (output.length < 3) return [];
      return [...output, output[0]];
    }

    function extractLattesOuterRings() {
      if (!communeGeoJson || !Array.isArray(communeGeoJson.features)) return [];
      const lattesFeature = communeGeoJson.features.find(
        (feature) => normalizeText(feature?.properties?.nom) === "lattes",
      );
      if (!lattesFeature || !lattesFeature.geometry) return [];
      const geometry = lattesFeature.geometry;
      if (geometry.type === "Polygon") {
        return geometry.coordinates && geometry.coordinates[0]
          ? [geometry.coordinates[0]]
          : [];
      }
      if (geometry.type === "MultiPolygon") {
        return (geometry.coordinates || [])
          .map((polygon) => polygon && polygon[0])
          .filter(Boolean);
      }
      return [];
    }

    function renderLattesSectors(specialtyId, cloudHospitalMap) {
      clearLayers(lattesSectorLayers);
      const lattesAreas = (CITY_AREAS || []).filter(
        (area) => area && area.type === "lattes",
      );
      const maurin = lattesAreas.find((area) => area.id === "lattes-maurin");
      const centre = lattesAreas.find((area) => area.id === "lattes-centre");
      const boirargues = lattesAreas.find((area) => area.id === "lattes-boirargues");
      if (!maurin || !centre || !boirargues) return;

      const rings = extractLattesOuterRings();
      if (!rings.length) return;

      const points = {
        maurin: [maurin.lng, maurin.lat],
        centre: [centre.lng, centre.lat],
        boirargues: [boirargues.lng, boirargues.lat],
      };
      const midMC = [
        (points.maurin[0] + points.centre[0]) / 2,
        (points.maurin[1] + points.centre[1]) / 2,
      ];
      const normalMC = [
        points.centre[0] - points.maurin[0],
        points.centre[1] - points.maurin[1],
      ];
      const midCB = [
        (points.centre[0] + points.boirargues[0]) / 2,
        (points.centre[1] + points.boirargues[1]) / 2,
      ];
      const normalCB = [
        points.boirargues[0] - points.centre[0],
        points.boirargues[1] - points.centre[1],
      ];

      const sectors = [
        {
          area: maurin,
          rings: rings
            .map((ring) => clipRingByHalfPlane(ring, midMC, normalMC, true))
            .filter((ring) => ring.length >= 4),
        },
        {
          area: centre,
          rings: rings
            .map((ring) => clipRingByHalfPlane(ring, midMC, normalMC, false))
            .map((ring) => clipRingByHalfPlane(ring, midCB, normalCB, true))
            .filter((ring) => ring.length >= 4),
        },
        {
          area: boirargues,
          rings: rings
            .map((ring) => clipRingByHalfPlane(ring, midCB, normalCB, false))
            .filter((ring) => ring.length >= 4),
        },
      ];

      sectors.forEach(({ area, rings: sectorRings }) => {
        const hospitalId =
          typeof resolveHospitalForArea === "function"
            ? resolveHospitalForArea(area, specialtyId)
            : area.cloud
              ? cloudHospitalMap[area.cloud]
              : null;
        const hospital = hospitalId ? HOSPITALS[hospitalId] : null;
        if (!hospital || !sectorRings.length) return;
        sectorRings.forEach((ring) => {
          const latLngRing = ring.map(([lng, lat]) => [lat, lng]);
          lattesSectorLayers.push(
            L.polygon(latLngRing, {
              interactive: false,
              color: hospital.color,
              weight: 2.2,
              opacity: 0.95,
              fillColor: hospital.color,
              fillOpacity: 0.32,
            }).addTo(map),
          );
        });
      });
    }

    function renderMontpellierSubareas(specialtyId, cloudHospitalMap) {
      clearLayers(mtpSubareaLayers);
      if (!mtpSubareaGeoJson || !Array.isArray(mtpSubareaGeoJson.features)) return;

      const areaByKey = new Map();
      (MTP_SUBAREAS || []).forEach((area) => {
        const keys = [area.label, ...(area.aliases || [])]
          .map((value) => normalizeText(value))
          .filter(Boolean);
        keys.forEach((key) => areaByKey.set(key, area));
      });
      // Ajustements explicites de libellés GeoJSON qui ne correspondent pas
      // exactement aux alias métier des sous-secteurs.
      areaByKey.set("celleneuve", AREA_BY_ID.mtp_cevennes);
      areaByKey.set("les hauts de massane", AREA_BY_ID.mtp_mosson);
      areaByKey.set("hauts de massane", AREA_BY_ID.mtp_mosson);
      areaByKey.set("figuerolles", AREA_BY_ID.mtp_arceaux_gambetta);

      mtpSubareaLayers.push(
        L.geoJSON(mtpSubareaGeoJson, {
          interactive: false,
          style(feature) {
            const name = feature?.properties?.name || feature?.properties?.quartier || "";
            const area = areaByKey.get(normalizeText(name));
            if (!area) {
              return {
                color: "#94a3b8",
                weight: 1.2,
                opacity: 0.45,
                fillColor: "#cbd5e1",
                fillOpacity: 0.08,
              };
            }
            const hospitalId =
              typeof resolveHospitalForArea === "function"
                ? resolveHospitalForArea(area, specialtyId)
                : area.cloud
                  ? cloudHospitalMap[area.cloud]
                  : null;
            const hospital = hospitalId ? HOSPITALS[hospitalId] : null;
            if (!hospital) {
              return {
                color: "#94a3b8",
                weight: 1.2,
                opacity: 0.45,
                fillColor: "#cbd5e1",
                fillOpacity: 0.08,
              };
            }
            return {
              color: hospital.color,
              weight: 1.8,
              opacity: 0.95,
              fillColor: hospital.color,
              fillOpacity: 0.22,
            };
          },
        }).addTo(map),
      );
    }

    function renderCommuneContours(specialtyId, cloudHospitalMap) {
      clearCommuneContourLayer();
      if (!communeGeoJson || !Array.isArray(communeGeoJson.features)) return;

      const communeHospitalMap = buildCommuneHospitalMap(
        specialtyId,
        cloudHospitalMap,
      );
      communeContourLayer = L.geoJSON(communeGeoJson, {
        interactive: false,
        style(feature) {
          const communeName = feature?.properties?.nom || "";
          const communeKeys = buildCommuneNameKeys(communeName);
          const hospitalId = communeKeys
            .map((key) => communeHospitalMap.get(key))
            .find(Boolean);
          const hospital = hospitalId ? HOSPITALS[hospitalId] : null;
          if (!hospital) {
            return {
              color: "#9ca3af",
              weight: 0.8,
              opacity: 0.25,
              fillColor: "#cbd5e1",
              fillOpacity: 0.04,
            };
          }
          return {
            color: hospital.color,
            weight: 1.6,
            opacity: 0.75,
            fillColor: hospital.color,
            fillOpacity: 0.2,
          };
        },
      }).addTo(map);
    }

    function seededRand(seed) {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    function generateCloudPoints(
      key,
      n,
      { clouds = CLOUDS, cloudStyle = CLOUD_STYLE, cloudAnchors = CLOUD_ANCHORS } = {},
    ) {
      const cloud = clouds[key];
      const style = cloudStyle[key] || { spread: 0.7 };
      const spread = style.spread || 0.7;
      const anchors = cloudAnchors[key] || [
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

    function addComboHeat(
      key,
      { color, clouds = CLOUDS, cloudStyle = CLOUD_STYLE, cloudAnchors = CLOUD_ANCHORS } = {},
    ) {
      const anchors = cloudAnchors[key] || [
        { lat: clouds[key].center[0], lng: clouds[key].center[1], w: 1 },
      ];
      const style = cloudStyle[key] || { halo: 0.7 };
      const isMtp = key.startsWith("mtp_");
      const isLattes = key.startsWith("lattes");
      const baseRadius = isMtp ? 260 : isLattes ? 210 : 340;
      const opacity = isMtp ? 0.9 : 1.0;

      anchors.forEach((anchor) => {
        const weightFactor = 0.75 + (anchor.w || 1) * 0.35;
        const radius = baseRadius * weightFactor * (style.halo || 0.7);
        addHeatBlob(anchor.lat, anchor.lng, color, radius, opacity);
      });

      const cloud = clouds[key];
      addHeatBlob(
        cloud.center[0],
        cloud.center[1],
        color,
        baseRadius * 0.92 * (style.halo || 0.7),
        opacity * 0.95,
      );
    }

    function addCloud(
      key,
      density,
      { color, clouds = CLOUDS, cloudStyle = CLOUD_STYLE, cloudAnchors = CLOUD_ANCHORS } = {},
    ) {
      const cloud = clouds[key];
      const style = cloudStyle[key] || { density, halo: 0.7 };
      const haloRadius =
        Math.max(cloud.rx * 62000, cloud.ry * 82000) * (style.halo || 0.7);

      haloLayers.push(
        L.circle([cloud.center[0], cloud.center[1]], {
          radius: haloRadius,
          stroke: false,
          fillColor: color,
          fillOpacity: 0.09,
          interactive: false,
        }).addTo(map),
      );

      generateCloudPoints(key, style.density || density, {
        clouds,
        cloudStyle,
        cloudAnchors,
      }).forEach((point, idx) => {
        const mod = idx % 12;
        const radius = mod === 0 ? 3.4 : mod < 4 ? 2.8 : 2.2;

        cloudLayers.push(
          L.circleMarker(point, {
            radius: radius + 3,
            stroke: false,
            fillColor: color,
            fillOpacity: 0.12,
            interactive: false,
          }).addTo(map),
        );
        cloudLayers.push(
          L.circleMarker(point, {
            radius,
            stroke: false,
            fillColor: color,
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

    function renderBeziersPreview({ enabled }) {
      clearLayers(beziersPreviewLayers);
      if (!enabled) return;

      (BEZIERS_STRUCTURES || []).forEach((item) => {
        if (!item.coordinates) return;
        const pseudoHospital = {
          name: item.nom || "Établissement",
          color: item.color || "#1d4e6a",
          address: item.commune || "Béziers",
          phone_urgences: "Non communiqué",
        };
        beziersPreviewLayers.push(
          L.circle([item.coordinates.lat, item.coordinates.lng], {
            radius: 700,
            stroke: false,
            fillColor: pseudoHospital.color,
            fillOpacity: 0.14,
            interactive: false,
          }).addTo(map),
        );
        beziersPreviewLayers.push(
          L.circleMarker([item.coordinates.lat, item.coordinates.lng], {
            radius: 8.5,
            color: "#ffffff",
            weight: 2.5,
            fillColor: pseudoHospital.color,
            fillOpacity: 1,
          })
            .addTo(map)
            .bindPopup(buildHospitalPopup(pseudoHospital), { maxWidth: 320 }),
        );
      });
    }

    function refresh({ specialtyId, cloudHospitalMap, beziersPreviewEnabled = false }) {
      latestRefreshArgs = { specialtyId, cloudHospitalMap, beziersPreviewEnabled };
      clearLayers(cloudLayers);
      clearLayers(haloLayers);
      clearLayers(heatLayers);
      clearLayers(lattesSectorLayers);
      clearLayers(mtpSubareaLayers);

      clearCommuneContourLayer();
      if (communeGeoJson) {
        renderCommuneContours(specialtyId, cloudHospitalMap);
        renderLattesSectors(specialtyId, cloudHospitalMap);
        if (mtpSubareaGeoJson) {
          renderMontpellierSubareas(specialtyId, cloudHospitalMap);
        } else {
          ensureMtpSubareaGeoJsonLoaded().then((loaded) => {
            if (!loaded || !latestRefreshArgs) return;
            renderMontpellierSubareas(
              latestRefreshArgs.specialtyId,
              latestRefreshArgs.cloudHospitalMap,
            );
            elevateStaticForegroundLayers();
          });
        }
      } else {
        ensureCommuneGeoJsonLoaded().then((loaded) => {
          if (!loaded || !latestRefreshArgs) return;
          ensureMtpSubareaGeoJsonLoaded().then(() => {
            if (!latestRefreshArgs) return;
            renderCommuneContours(
              latestRefreshArgs.specialtyId,
              latestRefreshArgs.cloudHospitalMap,
            );
            renderLattesSectors(
              latestRefreshArgs.specialtyId,
              latestRefreshArgs.cloudHospitalMap,
            );
            renderMontpellierSubareas(
              latestRefreshArgs.specialtyId,
              latestRefreshArgs.cloudHospitalMap,
            );
            elevateStaticForegroundLayers();
          });
        });
      }

      ensureBaseLayers();
      renderBeziersPreview({ enabled: beziersPreviewEnabled });
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
