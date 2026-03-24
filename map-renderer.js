/**
 * MediMap — map-renderer.js
 * Orchestration du rendu Leaflet et des couches d'orientation
 * Dépend de data.js, Leaflet, map-renderer-static.js et map-renderer-layout.js
 */

(function attachMapRenderer(global) {
  "use strict";

  function createMapRenderer({
    mapElementId = "map",
    legendElement = null,
    getOrientationSpecialty = () => "divers",
    onOrientationPopupClose = null,
  } = {}) {
    const map = L.map(mapElementId, { zoomControl: true }).setView(
      [43.61, 3.87],
      12,
    );
    const AGGLO_BOUNDS = [
      [43.47, 3.67],
      [43.75, 4.08],
    ];

    let focusLayer = null;
    let routeLayer = null;
    let orientationPopup = null;
    let orientationPopupPlacement = null;
    let orientationPopupHospitalId = null;
    let skipNextOrientationPopupCloseCallback = false;

    const layoutController = MediMapMapLayout.createMapLayoutController({
      map,
      legendElement,
      getOrientationSpecialty,
    });
    const staticLayerRenderer = MediMapMapStatic.createStaticLayerRenderer({
      map,
      legendElement,
      buildHospitalPopup: layoutController.buildHospitalPopup,
    });

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

    function clearRenderableLayer(layer) {
      if (!layer) return null;
      (Array.isArray(layer) ? layer : [layer]).forEach((entry) => map.removeLayer(entry));
      return null;
    }

    function clearSelectionVisuals() {
      focusLayer = clearRenderableLayer(focusLayer);
      routeLayer = clearRenderableLayer(routeLayer);
    }

    function handleOrientationPopupClosed(popup) {
      if (!popup || popup !== orientationPopup) {
        skipNextOrientationPopupCloseCallback = false;
        return;
      }

      const shouldNotifyApp = !skipNextOrientationPopupCloseCallback;
      skipNextOrientationPopupCloseCallback = false;
      orientationPopup = null;
      orientationPopupPlacement = null;
      orientationPopupHospitalId = null;
      clearSelectionVisuals();

      if (shouldNotifyApp && typeof onOrientationPopupClose === "function") {
        onOrientationPopupClose();
      }
    }

    function closeOrientationPopup({ notifyApp = false } = {}) {
      if (!orientationPopup) return;
      skipNextOrientationPopupCloseCallback = !notifyApp;
      map.closePopup(orientationPopup);
    }

    function drawRoute(area, hospitalId, originPoint = null) {
      routeLayer = clearRenderableLayer(routeLayer);

      const hospital = HOSPITALS[hospitalId];
      const path = layoutController.buildRoutePath(area, hospital, originPoint);
      const [startLat, startLng] = layoutController.getOriginCoordinates(
        originPoint,
        area,
      );
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
      const startMarker = L.circleMarker([startLat, startLng], {
        radius: 5,
        color: "#ffffff",
        weight: 2,
        fillColor: "#0f172a",
        fillOpacity: 1,
      }).addTo(map);
      const endMarker = L.marker([hospital.lat, hospital.lng], {
        icon: layoutController.buildDestinationFlagIcon(hospital),
        keyboard: false,
      }).addTo(map);
      routeLayer = [shadow, main, startMarker, endMarker];
    }

    function highlightCurrentArea(area, originPoint = null) {
      focusLayer = clearRenderableLayer(focusLayer);

      const [originLat, originLng] = layoutController.getOriginCoordinates(
        originPoint,
        area,
      );
      focusLayer = L.circleMarker([originLat, originLng], {
        radius: 9,
        color: "#ffffff",
        weight: 3,
        fillColor: "#0f172a",
        fillOpacity: 0.9,
      }).addTo(map);
    }

    function zoomToBounds(
      area,
      hospitalId,
      { reserveRouteView = false, originPoint = null, popupPlacement = "right" } = {},
    ) {
      const hospital = HOSPITALS[hospitalId];
      const routePath = layoutController.buildRoutePath(area, hospital, originPoint);
      const [originLat, originLng] = layoutController.getOriginCoordinates(
        originPoint,
        area,
      );
      const bounds = L.latLngBounds(routePath);
      const viewportPadding = layoutController.getOrientationViewportPadding({
        reserveRouteView,
        popupPlacement,
        area,
        hospital,
        originPoint,
        orientationPopup,
      });
      bounds.extend([originLat, originLng]);
      bounds.extend([hospital.lat, hospital.lng]);
      if (originLat === hospital.lat && originLng === hospital.lng) {
        bounds.extend([originLat + 0.005, originLng + 0.005]);
      }
      map.fitBounds(bounds, {
        ...viewportPadding,
        maxZoom: reserveRouteView ? 13 : 14,
      });
    }

    function openOrientationPopup(
      hospitalId,
      travelEstimate,
      popupPlacement = "right",
    ) {
      closeOrientationPopup();
      orientationPopup = L.popup({
        closeButton: true,
        autoClose: false,
        closeOnClick: false,
        autoPan: false,
        keepInView: false,
        className: layoutController.getPopupClassName(popupPlacement),
        offset: [0, 0],
        maxWidth: 360,
      })
        .setLatLng([HOSPITALS[hospitalId].lat, HOSPITALS[hospitalId].lng])
        .setContent(layoutController.buildOrientationPopupContent(hospitalId, travelEstimate))
        .openOn(map);
      orientationPopupHospitalId = hospitalId;
      orientationPopupPlacement = popupPlacement;
      layoutController.positionOrientationPopup({
        orientationPopup,
        hospitalId,
        placement: popupPlacement,
      });
    }

    function refresh({ specialtyId, cloudHospitalMap }) {
      staticLayerRenderer.refresh({ specialtyId, cloudHospitalMap });
    }

    function showOrientation({
      area,
      originPoint = null,
      hospitalId,
      travelEstimate,
    }) {
      closeOrientationPopup();
      const hospital = HOSPITALS[hospitalId];
      const preferredPopupPlacement =
        layoutController.getPreferredOrientationPopupPlacement(
          area,
          hospital,
          originPoint,
        );
      const initialPopupPlacement = preferredPopupPlacement;
      highlightCurrentArea(area, originPoint);
      drawRoute(area, hospitalId, originPoint);
      zoomToBounds(area, hospitalId, {
        originPoint,
        popupPlacement: initialPopupPlacement,
      });
      openOrientationPopup(hospitalId, travelEstimate, initialPopupPlacement);
      setTimeout(() => {
        if (!orientationPopup) return;
        zoomToBounds(area, hospitalId, {
          reserveRouteView: true,
          originPoint,
          popupPlacement: preferredPopupPlacement,
        });
        const finalPopupPlacement = layoutController.resolveOrientationPopupPlacement({
          area,
          hospital,
          originPoint,
          preferredPlacement: preferredPopupPlacement,
          orientationPopup,
        });
        orientationPopupPlacement = finalPopupPlacement;
        if (finalPopupPlacement !== preferredPopupPlacement) {
          zoomToBounds(area, hospitalId, {
            reserveRouteView: true,
            originPoint,
            popupPlacement: finalPopupPlacement,
          });
        }
        layoutController.positionOrientationPopup({
          orientationPopup,
          hospitalId,
          placement: finalPopupPlacement,
        });
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

    map.on("zoomend", staticLayerRenderer.updateLabelVisibility);
    map.on("zoomend", () => {
      if (orientationPopup && orientationPopupHospitalId && orientationPopupPlacement) {
        layoutController.positionOrientationPopup({
          orientationPopup,
          hospitalId: orientationPopupHospitalId,
          placement: orientationPopupPlacement,
        });
      }
    });
    map.on("moveend", () => {
      if (orientationPopup && orientationPopupHospitalId && orientationPopupPlacement) {
        layoutController.positionOrientationPopup({
          orientationPopup,
          hospitalId: orientationPopupHospitalId,
          placement: orientationPopupPlacement,
        });
      }
    });
    map.on("popupclose", (event) => {
      handleOrientationPopupClosed(event?.popup || null);
    });

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
