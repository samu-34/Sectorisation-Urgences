/**
 * MediMap — map-renderer-layout.js
 * Popup, geometrietrie de trajet et logique de cadrage de la carte
 */

(function attachMapLayoutRenderer(global) {
  "use strict";

  const ORIENTATION_POPUP_CLASS = "orientation-popup";
  const ORIENTATION_POPUP_PLACEMENTS = ["right", "left"];
  const ORIENTATION_POPUP_GAP_PX = 18;
  const ORIENTATION_POPUP_VIEWPORT_MARGIN_PX = 16;
  const ORIENTATION_POPUP_FALLBACK_SIZE = Object.freeze({
    width: 320,
    height: 220,
  });
  const LEGEND_FALLBACK_SIZE = Object.freeze({
    width: 280,
    height: 190,
    left: 12,
    bottom: 12,
  });

  function createMapLayoutController({
    map,
    legendElement = null,
    getOrientationSpecialty = () => "divers",
  }) {
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

    function projectLatLngToContainerPoint(latlng) {
      if (typeof map.latLngToContainerPoint === "function") {
        const point = map.latLngToContainerPoint(latlng);
        return { x: point.x, y: point.y };
      }

      const size = map.getSize();
      const lat = Array.isArray(latlng) ? latlng[0] : latlng.lat;
      const lng = Array.isArray(latlng) ? latlng[1] : latlng.lng;
      const centerLat = 43.61;
      const centerLng = 3.87;
      const scale = 18000;

      return {
        x: size.x / 2 + (lng - centerLng) * scale,
        y: size.y / 2 - (lat - centerLat) * scale,
      };
    }

    function getPopupElement(popup) {
      if (!popup) return null;
      if (typeof popup.getElement === "function") {
        return popup.getElement();
      }
      return popup._container || null;
    }

    function getPopupElementSize(popup) {
      const element = getPopupElement(popup);
      const width =
        Number(element?.offsetWidth) || ORIENTATION_POPUP_FALLBACK_SIZE.width;
      const height =
        Number(element?.offsetHeight) || ORIENTATION_POPUP_FALLBACK_SIZE.height;

      return { width, height };
    }

    function getLegendViewportBox(viewportSize = map.getSize()) {
      if (!legendElement || legendElement.classList?.contains("hidden")) {
        return null;
      }

      const width = Number(legendElement.offsetWidth) || LEGEND_FALLBACK_SIZE.width;
      const height = Number(legendElement.offsetHeight) || LEGEND_FALLBACK_SIZE.height;
      const left = LEGEND_FALLBACK_SIZE.left;
      const bottom = LEGEND_FALLBACK_SIZE.bottom;

      return {
        left,
        top: viewportSize.y - height - bottom,
        right: left + width,
        bottom: viewportSize.y - bottom,
        width,
        height,
      };
    }

    function boxesIntersect(firstBox, secondBox) {
      if (!firstBox || !secondBox) return false;
      return !(
        firstBox.right <= secondBox.left ||
        firstBox.left >= secondBox.right ||
        firstBox.bottom <= secondBox.top ||
        firstBox.top >= secondBox.bottom
      );
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function getOppositePopupPlacement(placement) {
      return placement === "left" ? "right" : "left";
    }

    function getOriginCoordinates(originPoint, area) {
      const origin = originPoint || area;
      return [origin.lat, origin.lng];
    }

    function buildRoutePath(area, hospital, originPoint = null) {
      const start = getOriginCoordinates(originPoint, area);
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

    function resolvePopupCenteredTop(
      point,
      size,
      placement,
      viewportSize = map.getSize(),
    ) {
      let centeredTop = clamp(
        point.y - size.height / 2,
        ORIENTATION_POPUP_VIEWPORT_MARGIN_PX,
        viewportSize.y - size.height - ORIENTATION_POPUP_VIEWPORT_MARGIN_PX,
      );
      const legendBox = getLegendViewportBox(viewportSize);

      if (placement === "left" && legendBox) {
        const popupLeft =
          point.x - size.width - ORIENTATION_POPUP_GAP_PX - 20;
        const popupBox = {
          left: popupLeft,
          top: centeredTop,
          right: popupLeft + size.width,
          bottom: centeredTop + size.height,
        };
        if (boxesIntersect(popupBox, legendBox)) {
          centeredTop = clamp(
            legendBox.top - size.height - 14,
            ORIENTATION_POPUP_VIEWPORT_MARGIN_PX,
            viewportSize.y - size.height - ORIENTATION_POPUP_VIEWPORT_MARGIN_PX,
          );
        }
      }

      return centeredTop;
    }

    function buildPopupScreenBox(point, size, placement, viewportSize = map.getSize()) {
      const tipSpan = 20;
      const centeredTop = resolvePopupCenteredTop(
        point,
        size,
        placement,
        viewportSize,
      );

      switch (placement) {
        case "right":
          return {
            left: point.x + ORIENTATION_POPUP_GAP_PX + tipSpan,
            top: centeredTop,
          };
        case "left":
          return {
            left: point.x - size.width - ORIENTATION_POPUP_GAP_PX - tipSpan,
            top: centeredTop,
          };
        default:
          return {
            left: point.x + ORIENTATION_POPUP_GAP_PX + tipSpan,
            top: centeredTop,
          };
      }
    }

    function doesPopupBoxFitViewport(box, size, viewportSize) {
      return (
        box.left >= ORIENTATION_POPUP_VIEWPORT_MARGIN_PX &&
        box.top >= ORIENTATION_POPUP_VIEWPORT_MARGIN_PX &&
        box.left + size.width <=
          viewportSize.x - ORIENTATION_POPUP_VIEWPORT_MARGIN_PX &&
        box.top + size.height <=
          viewportSize.y - ORIENTATION_POPUP_VIEWPORT_MARGIN_PX
      );
    }

    function scorePopupBox(box, size, viewportSize) {
      const visibleWidth = Math.max(
        0,
        Math.min(box.left + size.width, viewportSize.x) - Math.max(box.left, 0),
      );
      const visibleHeight = Math.max(
        0,
        Math.min(box.top + size.height, viewportSize.y) - Math.max(box.top, 0),
      );
      return visibleWidth * visibleHeight;
    }

    function getPreferredOrientationPopupPlacement(area, hospital, originPoint = null) {
      const routePath = buildRoutePath(area, hospital, originPoint);
      const endPoint = projectLatLngToContainerPoint(routePath[routePath.length - 1]);
      const previousPoint = projectLatLngToContainerPoint(
        routePath[Math.max(0, routePath.length - 2)],
      );
      const dx = endPoint.x - previousPoint.x;

      if (Math.abs(dx) < 6) {
        const originPointOnScreen = projectLatLngToContainerPoint(routePath[0]);
        return endPoint.x >= originPointOnScreen.x ? "right" : "left";
      }

      return dx >= 0 ? "right" : "left";
    }

    function resolveOrientationPopupPlacement({
      area,
      hospital,
      originPoint = null,
      preferredPlacement = "right",
      orientationPopup,
    }) {
      const placementOrder = [
        preferredPlacement,
        getOppositePopupPlacement(preferredPlacement),
      ];
      const popupSize = getPopupElementSize(orientationPopup);
      const markerPoint = projectLatLngToContainerPoint([hospital.lat, hospital.lng]);
      const viewportSize = map.getSize();
      let bestPlacement = placementOrder[0];
      let bestScore = -1;

      placementOrder.forEach((placement) => {
        const box = buildPopupScreenBox(
          markerPoint,
          popupSize,
          placement,
          viewportSize,
        );
        if (doesPopupBoxFitViewport(box, popupSize, viewportSize)) {
          bestPlacement = placement;
          bestScore = Number.POSITIVE_INFINITY;
          return;
        }
        const score = scorePopupBox(box, popupSize, viewportSize);
        if (score > bestScore) {
          bestPlacement = placement;
          bestScore = score;
        }
      });

      return ORIENTATION_POPUP_PLACEMENTS.includes(bestPlacement)
        ? bestPlacement
        : "right";
    }

    function getRouteArrivalScreenVector(area, hospital, originPoint = null) {
      const routePath = buildRoutePath(area, hospital, originPoint);
      const endPoint = projectLatLngToContainerPoint(routePath[routePath.length - 1]);
      const previousPoint = projectLatLngToContainerPoint(
        routePath[Math.max(0, routePath.length - 2)],
      );

      return {
        dx: endPoint.x - previousPoint.x,
        dy: endPoint.y - previousPoint.y,
      };
    }

    function getOrientationPopupOffset(size, placement) {
      const tipHalfHeight = 10;
      const horizontalShift = Math.round(size.width / 2 + ORIENTATION_POPUP_GAP_PX);
      const verticalShift = Math.round(size.height / 2 + tipHalfHeight);

      return placement === "left"
        ? [-horizontalShift, verticalShift]
        : [horizontalShift, verticalShift];
    }

    function positionOrientationPopup({
      orientationPopup,
      hospitalId,
      placement,
    }) {
      if (!orientationPopup) return;

      const popupElement = getPopupElement(orientationPopup);
      const popupSize = getPopupElementSize(orientationPopup);
      const markerPoint = projectLatLngToContainerPoint([
        HOSPITALS[hospitalId].lat,
        HOSPITALS[hospitalId].lng,
      ]);
      const centeredTop = resolvePopupCenteredTop(
        markerPoint,
        popupSize,
        placement,
        map.getSize(),
      );
      const rawCenteredTop = clamp(
        markerPoint.y - popupSize.height / 2,
        ORIENTATION_POPUP_VIEWPORT_MARGIN_PX,
        map.getSize().y - popupSize.height - ORIENTATION_POPUP_VIEWPORT_MARGIN_PX,
      );
      const offset = getOrientationPopupOffset(popupSize, placement);

      orientationPopup.options.offset = offset;
      if (typeof orientationPopup.update === "function") {
        orientationPopup.update();
      } else {
        orientationPopup.setLatLng([HOSPITALS[hospitalId].lat, HOSPITALS[hospitalId].lng]);
      }

      if (!popupElement) return;

      popupElement.classList.add(ORIENTATION_POPUP_CLASS);
      ORIENTATION_POPUP_PLACEMENTS.forEach((placementName) => {
        popupElement.classList.remove(`${ORIENTATION_POPUP_CLASS}--${placementName}`);
      });
      popupElement.classList.add(`${ORIENTATION_POPUP_CLASS}--${placement}`);
      popupElement.style.left = "";
      popupElement.style.top = "";
      popupElement.style.bottom = "";
      popupElement.style.marginTop = `${Math.round(centeredTop - rawCenteredTop)}px`;
    }

    function getOrientationViewportPadding({
      reserveRouteView = false,
      popupPlacement = "right",
      area = null,
      hospital = null,
      originPoint = null,
      orientationPopup = null,
    } = {}) {
      const size = map.getSize();
      const popupSize = reserveRouteView
        ? getPopupElementSize(orientationPopup)
        : ORIENTATION_POPUP_FALLBACK_SIZE;
      const sidePadding = Math.max(
        popupSize.width + ORIENTATION_POPUP_GAP_PX + 44,
        reserveRouteView
          ? Math.max(250, Math.min(520, Math.round(size.x * 0.32)))
          : Math.max(200, Math.min(460, Math.round(size.x * 0.26))),
      );
      const bottomPadding = reserveRouteView
        ? Math.max(150, Math.min(280, Math.round(size.y * 0.2)))
        : Math.max(120, Math.min(240, Math.round(size.y * 0.16)));
      const paddingTopLeft = [reserveRouteView ? 90 : 70, reserveRouteView ? 118 : 96];
      const paddingBottomRight = [
        reserveRouteView ? 180 : 140,
        reserveRouteView ? 118 : 96,
      ];

      if (area && hospital) {
        const { dy } = getRouteArrivalScreenVector(area, hospital, originPoint);
        const verticalBias = clamp(
          Math.round(Math.abs(dy) * (reserveRouteView ? 0.35 : 0.24)),
          reserveRouteView ? 32 : 20,
          reserveRouteView ? 140 : 90,
        );

        if (dy < -10) {
          paddingTopLeft[1] += verticalBias;
        } else if (dy > 10) {
          paddingBottomRight[1] += verticalBias;
        }
      }

      if (popupPlacement === "right") {
        paddingBottomRight[0] = sidePadding;
        paddingBottomRight[1] = Math.max(paddingBottomRight[1], bottomPadding);
      } else if (popupPlacement === "left") {
        paddingTopLeft[0] = sidePadding;
        paddingBottomRight[1] = Math.max(paddingBottomRight[1], bottomPadding);
        const legendBox = getLegendViewportBox(size);
        if (legendBox) {
          paddingBottomRight[1] = Math.max(
            paddingBottomRight[1],
            legendBox.height + LEGEND_FALLBACK_SIZE.bottom + 24,
          );
        }
      }

      return {
        paddingTopLeft,
        paddingBottomRight,
      };
    }

    function buildDestinationFlagIcon(hospital) {
      const fill = escapeHtml(hospital.color);
      const label = escapeHtml(`Destination ${hospital.name}`);

      return L.divIcon({
        className: "destination-flag-icon",
        iconSize: [28, 36],
        iconAnchor: [14, 34],
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

    function getPopupClassName(placement = "right") {
      return `${ORIENTATION_POPUP_CLASS} ${ORIENTATION_POPUP_CLASS}--${placement}`;
    }

    return Object.freeze({
      buildHospitalPopup,
      buildOrientationPopupContent,
      getOriginCoordinates,
      buildRoutePath,
      buildDestinationFlagIcon,
      getPreferredOrientationPopupPlacement,
      resolveOrientationPopupPlacement,
      positionOrientationPopup,
      getOrientationViewportPadding,
      getPopupClassName,
    });
  }

  global.MediMapMapLayout = Object.freeze({
    createMapLayoutController,
  });
})(globalThis);
