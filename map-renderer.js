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
    const map = L.map(mapElementId, { zoomControl: false }).setView(
      [43.50, 3.42],
      10,
    );
    L.control.zoom({ position: "topright" }).addTo(map);
    const DUAL_SECTORIZATION_BOUNDS = [
      [43.27, 3.08],
      [43.74, 4.06],
    ];

    const mapElement = document.getElementById(mapElementId);
    const orientationOverlayHost =
      mapElement?.parentElement || mapElement || document.body;
    let focusLayer = null;
    let routeLayer = null;
    let orientationPopup = null;
    let orientationOverlay = null;
    let orientationPopupPlacement = null;
    let orientationPopupHospitalId = null;
    let skipNextOrientationPopupCloseCallback = false;
    let preserveOrientationVisualsOnClose = false;
    let lastOrientationContext = null;

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
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth || 0;
      const desktopPaddingOptions =
        viewportWidth >= 1024
          ? {
              paddingTopLeft: [520, 24],
              paddingBottomRight: [24, 24],
            }
          : { padding: [24, 24] };
      map.fitBounds(DUAL_SECTORIZATION_BOUNDS, desktopPaddingOptions);
    }

    function setDefaultMapView() {
      fitAggloBounds();
    }

    function clearRenderableLayer(layer) {
      if (!layer) return null;
      (Array.isArray(layer) ? layer : [layer]).forEach((entry) => map.removeLayer(entry));
      return null;
    }

    function clearSelectionVisuals() {
      focusLayer = clearRenderableLayer(focusLayer);
      routeLayer = clearRenderableLayer(routeLayer);
    }

    function notifyOrientationPopupClosed() {
      if (typeof onOrientationPopupClose !== "function") return;
      // Laisse Leaflet terminer la fermeture visuelle avant de recadrer la carte.
      requestAnimationFrame(() => {
        onOrientationPopupClose();
      });
    }

    function removeElement(element) {
      if (!element) return;
      if (typeof element.remove === "function") {
        element.remove();
        return;
      }
      const parent = element.parentElement;
      if (typeof parent?.removeChild === "function") {
        parent.removeChild(element);
        return;
      }
      if (Array.isArray(parent?.children)) {
        parent.children = parent.children.filter((child) => child !== element);
      }
    }

    function handleOrientationPopupClosed(popup) {
      if (!popup || popup !== orientationPopup) {
        skipNextOrientationPopupCloseCallback = false;
        preserveOrientationVisualsOnClose = false;
        return;
      }

      const shouldNotifyApp = !skipNextOrientationPopupCloseCallback;
      const shouldPreserveVisuals = preserveOrientationVisualsOnClose;
      skipNextOrientationPopupCloseCallback = false;
      preserveOrientationVisualsOnClose = false;
      orientationPopup = null;
      orientationPopupPlacement = null;
      orientationPopupHospitalId = null;
      if (!shouldPreserveVisuals) {
        lastOrientationContext = null;
        clearSelectionVisuals();
      }

      if (shouldNotifyApp) {
        notifyOrientationPopupClosed();
      }
    }

    function closeOrientationOverlay({
      notifyApp = false,
      preserveVisuals = false,
    } = {}) {
      if (!orientationOverlay) return false;

      removeElement(orientationOverlay);
      orientationOverlay = null;
      orientationPopupPlacement = null;
      orientationPopupHospitalId = null;

      if (!preserveVisuals) {
        lastOrientationContext = null;
        clearSelectionVisuals();
      }

      if (notifyApp) {
        notifyOrientationPopupClosed();
      }

      return true;
    }

    function closeOrientationPopup({
      notifyApp = false,
      preserveVisuals = false,
    } = {}) {
      if (closeOrientationOverlay({ notifyApp, preserveVisuals })) {
        return;
      }
      if (!orientationPopup) return;
      preserveOrientationVisualsOnClose = preserveVisuals;
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
      const isCompactViewport = layoutController.isCompactOrientationViewport();
      map.fitBounds(bounds, {
        ...viewportPadding,
        maxZoom: isCompactViewport ? (reserveRouteView ? 12 : 13) : reserveRouteView ? 13 : 14,
      });
    }

    function openOrientationPopup(
      hospitalId,
      travelEstimate,
      popupPlacement = "right",
    ) {
      const isCompactViewport = layoutController.isCompactOrientationViewport();
      orientationPopup = L.popup({
        closeButton: true,
        autoClose: false,
        closeOnClick: false,
        autoPan: isCompactViewport,
        keepInView: isCompactViewport,
        className: layoutController.getPopupClassName(popupPlacement),
        offset: [0, 0],
        maxWidth: layoutController.getOrientationPopupMaxWidth(),
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

    function openFixedOrientationOverlay(hospitalId, travelEstimate) {
      const overlay = document.createElement("div");
      overlay.className = "orientation-overlay";

      const card = document.createElement("section");
      card.className = "orientation-overlay-card";
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-modal", "false");
      card.setAttribute("aria-label", `Destination ${HOSPITALS[hospitalId].name}`);

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "orientation-overlay-close";
      closeButton.setAttribute("aria-label", "Fermer la destination");
      closeButton.textContent = "×";
      closeButton.addEventListener("click", () => {
        closeOrientationPopup({ notifyApp: true });
      });

      card.append(
        closeButton,
        layoutController.buildOrientationPopupContent(hospitalId, travelEstimate),
      );
      overlay.appendChild(card);
      orientationOverlayHost.appendChild(overlay);

      orientationOverlay = overlay;
      orientationPopupPlacement = "compact";
      orientationPopupHospitalId = hospitalId;
    }

    function refresh({ specialtyId, cloudHospitalMap, beziersPreviewEnabled = false }) {
      staticLayerRenderer.refresh({
        specialtyId,
        cloudHospitalMap,
        beziersPreviewEnabled,
      });
    }

    function renderOrientationPresentation() {
      if (!lastOrientationContext) return;

      const {
        area,
        originPoint,
        hospitalId,
        travelEstimate,
      } = lastOrientationContext;
      const hospital = HOSPITALS[hospitalId];
      const preferredPopupPlacement =
        layoutController.getPreferredOrientationPopupPlacement(
          area,
          hospital,
          originPoint,
        );

      zoomToBounds(area, hospitalId, {
        originPoint,
        popupPlacement: preferredPopupPlacement,
      });

      if (preferredPopupPlacement === "compact") {
        openFixedOrientationOverlay(hospitalId, travelEstimate);
        zoomToBounds(area, hospitalId, {
          reserveRouteView: true,
          originPoint,
          popupPlacement: "compact",
        });
        return;
      }

      openOrientationPopup(hospitalId, travelEstimate, preferredPopupPlacement);
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

    function syncOrientationPresentationToViewport() {
      if (!lastOrientationContext) return;

      const shouldUseFixedOverlay = layoutController.isCompactOrientationViewport();
      if (shouldUseFixedOverlay && orientationOverlay) {
        return;
      }
      if (
        !shouldUseFixedOverlay &&
        orientationPopup &&
        orientationPopupHospitalId &&
        orientationPopupPlacement
      ) {
        layoutController.positionOrientationPopup({
          orientationPopup,
          hospitalId: orientationPopupHospitalId,
          placement: orientationPopupPlacement,
        });
        return;
      }

      closeOrientationPopup({ preserveVisuals: true });
      renderOrientationPresentation();
    }

    function showOrientation({
      area,
      originPoint = null,
      hospitalId,
      travelEstimate,
    }) {
      closeOrientationPopup();
      lastOrientationContext = {
        area,
        originPoint,
        hospitalId,
        travelEstimate,
      };
      highlightCurrentArea(area, originPoint);
      drawRoute(area, hospitalId, originPoint);
      renderOrientationPresentation();
    }

    function resetDecisionState() {
      closeOrientationPopup();
      clearSelectionVisuals();
      lastOrientationContext = null;
    }

    function getState() {
      return {
        map,
        focusLayer,
        routeLayer,
        orientationPopup,
        orientationOverlay,
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
        syncOrientationPresentationToViewport();
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
