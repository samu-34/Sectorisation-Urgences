/**
 * MediMap — app.js
 * Couche UI : branche le DOM, l'autocomplete et Leaflet aux cas d'usage applicatifs
 * Dépend de data.js, domain.js, application.js, autocomplete.js et map-renderer.js
 */

const DOM = {
  chips: document.getElementById("chips"),
  citySelect: document.getElementById("citySelect"),
  cityInput: document.getElementById("cityInput"),
  subzoneSelect: document.getElementById("subzoneSelect"),
  subzoneWrap: document.getElementById("subzoneWrap"),
  detectedSpecialty: document.getElementById("detectedSpecialty"),
  legend: document.getElementById("legend"),
  symptomInput: document.getElementById("symptomInput"),
  suggestBox: document.getElementById("suggestBox"),
  citySuggestBox: document.getElementById("citySuggestBox"),
  regulateBtn: document.getElementById("regulateBtn"),
  focusBtn: document.getElementById("focusBtn"),
};

const {
  simplify,
  getRankedMatches,
  filiereLabelById,
  looksLikeMontpellierAddress,
  resolveMontpellierGeocodeCandidate,
} = MediMapDomain;
const appController = MediMapApplication.createAppController();
const REMOTE_CITY_SUGGESTION_DEBOUNCE_MS = 1100;
let citySuggestionRequestId = 0;
let citySuggestionAbortController = null;
let citySuggestionDebounceTimer = null;
let remoteCitySuggestions = [];
let cityResolutionRequestId = 0;
let cityResolutionAbortController = null;

const mapRenderer = MediMapMapRenderer.createMapRenderer({
  mapElementId: "map",
  legendElement: DOM.legend,
  getOrientationSpecialty: () => appController.getOrientationSpecialty(),
  onOrientationPopupClose() {
    appController.resetSession();
    cancelPendingCitySuggestions();
    cancelPendingCityResolution();
    autocomplete.closeAllSuggestions();
    renderSelectionState();
    DOM.symptomInput.value = "";
    renderDetectedSpecialtyIndicator();
    resetDecisionState();
  },
});

function renderDetectedSpecialtyIndicator() {
  const { detectedSpecialty } = appController.getState();
  DOM.detectedSpecialty.value = detectedSpecialty
    ? filiereLabelById(detectedSpecialty)
    : "";
}

function renderSubzoneOptions() {
  const { subzoneValue } = appController.getState();
  const subzoneModel = appController.getSubzoneModel();

  if (!subzoneModel.visible) {
    DOM.subzoneWrap.classList.add("hidden");
    DOM.subzoneSelect.replaceChildren();
    return;
  }

  DOM.subzoneWrap.classList.remove("hidden");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.selected = true;
  placeholder.textContent = subzoneModel.placeholder;

  DOM.subzoneSelect.replaceChildren(
    placeholder,
    ...subzoneModel.options.map((area) => {
      const option = document.createElement("option");
      option.value = area.id;
      option.textContent = area.label;
      return option;
    }),
  );
  DOM.subzoneSelect.value = subzoneValue;
}

function renderSelectionState({ syncCityInput = true } = {}) {
  const { cityInputValue, cityValue } = appController.getState();

  if (syncCityInput) {
    DOM.cityInput.value = cityInputValue;
  }
  DOM.citySelect.value = cityValue;
  renderSubzoneOptions();
}

function populateCitySelect() {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.selected = true;
  placeholder.textContent = "— Sélectionner —";

  DOM.citySelect.replaceChildren(
    placeholder,
    ...appController.getCityOptions().map((city) => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      return option;
    }),
  );
}

function renderChips() {
  const { mapSpecialty } = appController.getState();

  DOM.chips.innerHTML = "";
  SPECIALTIES.forEach((specialty) => {
    const btn = document.createElement("button");
    btn.className = "chip" + (specialty.id === mapSpecialty ? " active" : "");
    btn.textContent = specialty.label;
    btn.onclick = () => {
      const result = appController.selectMapSpecialty(specialty.id);
      if (!result.mapSpecialtyChanged) return;
      renderChips();
      refreshMap();
    };
    DOM.chips.appendChild(btn);
  });
}

function refreshMap() {
  const mapModel = appController.refreshSectorisationMap();
  mapRenderer.refresh({
    specialtyId: mapModel.specialtyId,
    cloudHospitalMap: mapModel.cloudHospitalMap,
  });
}

function applySymptomInput(text, options = {}) {
  const result = appController.setSymptomInput(text, options);
  renderDetectedSpecialtyIndicator();

  if (result.mapSpecialtyChanged) {
    renderChips();
    refreshMap();
  }

  return result;
}

function cancelPendingCitySuggestions() {
  if (citySuggestionDebounceTimer !== null) {
    clearTimeout(citySuggestionDebounceTimer);
    citySuggestionDebounceTimer = null;
  }
  citySuggestionRequestId += 1;
  remoteCitySuggestions = [];
  if (citySuggestionAbortController) {
    citySuggestionAbortController.abort();
    citySuggestionAbortController = null;
  }
}

function cancelPendingCityResolution() {
  cityResolutionRequestId += 1;
  if (cityResolutionAbortController) {
    cityResolutionAbortController.abort();
    cityResolutionAbortController = null;
  }
}

function syncSelectionFromCityInput(rawValue) {
  const result = appController.selectCityInput(rawValue);
  renderSelectionState();
  return result.selection.matched;
}

function renderCitySuggestions(query) {
  autocomplete.renderCitySuggestions(query, {
    extraItems: remoteCitySuggestions,
  });
}

function canResolveRemoteAddress() {
  return typeof fetch === "function";
}

function buildMontpellierGeocodeUrl(rawValue, { limit = 5 } = {}) {
  const trimmed = String(rawValue || "").trim();
  const query = simplify(trimmed).includes("montpellier")
    ? trimmed
    : `${trimmed}, Montpellier`;
  return `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=fr&accept-language=fr&q=${encodeURIComponent(query)}`;
}

function buildMontpellierAddressSuggestion(candidate) {
  const selection = resolveMontpellierGeocodeCandidate(candidate);
  if (!selection.matched) {
    return null;
  }

  const address = candidate.address || {};
  const streetName =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.cycleway ||
    address.path ||
    candidate.name ||
    "";
  const houseNumber = address.house_number || "";
  const district =
    address.suburb ||
    address.neighbourhood ||
    address.neighborhood ||
    address.quarter ||
    address.city_district ||
    "";
  const streetLabel = [houseNumber, streetName].filter(Boolean).join(" ").trim();
  const labelParts = [
    streetLabel || candidate.display_name || "Adresse Montpellier",
    "Montpellier",
    district ? `(${district})` : "",
  ].filter(Boolean);

  return {
    label: labelParts.join(", ").replace(", (", " ("),
    category: "Adresse Montpellier",
    inputValue:
      candidate.display_name ||
      [streetLabel, "34000 Montpellier"].filter(Boolean).join(", "),
    selection,
  };
}

async function loadRemoteCitySuggestions(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed || !looksLikeMontpellierAddress(trimmed) || !canResolveRemoteAddress()) {
    return;
  }

  const requestId = citySuggestionRequestId;
  const controller =
    typeof AbortController === "function" ? new AbortController() : null;
  citySuggestionAbortController = controller;

  try {
    const response = await fetch(buildMontpellierGeocodeUrl(trimmed, { limit: 6 }), {
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const candidates = Array.isArray(payload) ? payload : [];
    if (
      requestId !== citySuggestionRequestId ||
      simplify(DOM.cityInput.value) !== simplify(trimmed)
    ) {
      return;
    }

    remoteCitySuggestions = Array.from(
      new Map(
        candidates
          .map((candidate) => buildMontpellierAddressSuggestion(candidate))
          .filter(Boolean)
          .map((suggestion) => [simplify(suggestion.label), suggestion]),
      ).values(),
    ).slice(0, 5);

    renderCitySuggestions(DOM.cityInput.value);
  } catch (error) {
    if (!error || error.name !== "AbortError") {
      remoteCitySuggestions = [];
    }
  } finally {
    if (requestId === citySuggestionRequestId) {
      citySuggestionAbortController = null;
    }
  }
}

function scheduleRemoteCitySuggestions(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (
    !trimmed ||
    trimmed.length < 6 ||
    !looksLikeMontpellierAddress(trimmed) ||
    !canResolveRemoteAddress()
  ) {
    return;
  }

  citySuggestionDebounceTimer = window.setTimeout(() => {
    citySuggestionDebounceTimer = null;
    void loadRemoteCitySuggestions(trimmed);
  }, REMOTE_CITY_SUGGESTION_DEBOUNCE_MS);
}

async function tryResolveMontpellierAddress(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed || !looksLikeMontpellierAddress(trimmed) || !canResolveRemoteAddress()) {
    return false;
  }

  if (appController.getCurrentArea()) {
    return true;
  }

  cancelPendingCityResolution();
  const requestId = cityResolutionRequestId;
  const controller =
    typeof AbortController === "function" ? new AbortController() : null;
  cityResolutionAbortController = controller;

  try {
    const response = await fetch(buildMontpellierGeocodeUrl(trimmed), {
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    const candidates = Array.isArray(payload) ? payload : [];
    if (
      requestId !== cityResolutionRequestId ||
      simplify(DOM.cityInput.value) !== simplify(trimmed)
    ) {
      return false;
    }

    for (const candidate of candidates) {
      const selection = resolveMontpellierGeocodeCandidate(candidate);
      if (!selection.matched) continue;

      appController.applyResolvedSelection(selection, { inputValue: trimmed });
      renderSelectionState();
      return true;
    }

    return false;
  } catch (error) {
    if (error && error.name === "AbortError") {
      return false;
    }
    return false;
  } finally {
    if (requestId === cityResolutionRequestId) {
      cityResolutionAbortController = null;
    }
  }
}

async function syncSelectionFromCityInputWithFallback(rawValue) {
  const matched = syncSelectionFromCityInput(rawValue);
  if (!matched) {
    await tryResolveMontpellierAddress(rawValue);
  }
  updateDecision();
}

function applyCitySelection(picked) {
  cancelPendingCitySuggestions();
  cancelPendingCityResolution();
  if (picked && typeof picked === "object" && picked.selection) {
    appController.applyResolvedSelection(picked.selection, {
      inputValue: picked.inputValue || picked.label || "",
    });
  } else if (picked && typeof picked === "object") {
    appController.selectCityInput(picked.inputValue || picked.label || "");
  } else {
    appController.selectCityInput(picked);
  }
  renderSelectionState();
  autocomplete.closeCitySuggestions();
  updateDecision();
}

function getCurrentArea() {
  return appController.getCurrentArea();
}

function resetDecisionState() {
  mapRenderer.resetDecisionState();
}

function updateDecision() {
  applySymptomInput(DOM.symptomInput.value, { syncMapSpecialty: false });

  const decision = appController.computeOrientation();
  if (decision.mapSpecialtyChanged) {
    renderChips();
    refreshMap();
  }

  if (!decision.orientation) {
    resetDecisionState();
    return;
  }

  mapRenderer.showOrientation(decision.orientation);
}

const autocomplete = MediMapAutocomplete.createAutocompleteController({
  DOM,
  simplify,
  getRankedMatches,
  filiereLabelById,
  symptomItems: MOTIF_CATALOG,
  cityItems: appController.getCitySuggestions(),
  onSymptomPick(label) {
    DOM.symptomInput.value = label;
    updateDecision();
  },
  onCityPick: applyCitySelection,
});

DOM.symptomInput.addEventListener("input", () => {
  autocomplete.renderSymptomSuggestions(DOM.symptomInput.value);
  updateDecision();
});

DOM.cityInput.addEventListener("input", () => {
  cancelPendingCitySuggestions();
  cancelPendingCityResolution();
  renderCitySuggestions(DOM.cityInput.value);
  const matched = syncSelectionFromCityInput(DOM.cityInput.value);
  updateDecision();
  if (!matched) {
    scheduleRemoteCitySuggestions(DOM.cityInput.value);
  }
});

DOM.cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    cancelPendingCitySuggestions();
    autocomplete.closeCitySuggestions();
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    autocomplete.moveCitySuggestion(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    autocomplete.moveCitySuggestion(-1);
    return;
  }
  if (event.key !== "Enter") return;

  event.preventDefault();
  if (autocomplete.acceptActiveCitySuggestion()) {
    return;
  }

  autocomplete.closeCitySuggestions();
  void syncSelectionFromCityInputWithFallback(DOM.cityInput.value);
});

DOM.cityInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    cancelPendingCitySuggestions();
    void syncSelectionFromCityInputWithFallback(DOM.cityInput.value);
  }, 0);
});

DOM.symptomInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    autocomplete.moveSymptomSuggestion(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    autocomplete.moveSymptomSuggestion(-1);
    return;
  }
  if (event.key === "Enter") {
    if (autocomplete.acceptActiveSymptomSuggestion()) {
      event.preventDefault();
    }
    return;
  }
  if (event.key === "Escape") {
    autocomplete.closeSymptomSuggestions();
  }
});

DOM.regulateBtn.addEventListener("click", () => {
  void syncSelectionFromCityInputWithFallback(DOM.cityInput.value);
});

DOM.focusBtn.addEventListener("click", () => {
  cancelPendingCitySuggestions();
  cancelPendingCityResolution();
  appController.resetSession();
  autocomplete.closeAllSuggestions();
  renderSelectionState();
  DOM.symptomInput.value = "";
  renderDetectedSpecialtyIndicator();
  resetDecisionState();
  mapRenderer.setDefaultMapView();
});

DOM.citySelect.addEventListener("change", () => {
  cancelPendingCitySuggestions();
  cancelPendingCityResolution();
  appController.selectCityValue(DOM.citySelect.value);
  renderSelectionState();
  updateDecision();
});

DOM.subzoneSelect.addEventListener("change", () => {
  cancelPendingCitySuggestions();
  cancelPendingCityResolution();
  appController.selectSubzone(DOM.subzoneSelect.value);
  renderSelectionState({ syncCityInput: false });
  updateDecision();
});

document.addEventListener("click", (event) => {
  if (!DOM.symptomInput.parentElement.contains(event.target)) {
    autocomplete.closeSymptomSuggestions();
  }
  if (!DOM.cityInput.parentElement.contains(event.target)) {
    autocomplete.closeCitySuggestions();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  renderChips();
  populateCitySelect();
  renderSelectionState();
  renderDetectedSpecialtyIndicator();
  refreshMap();
  updateDecision();
  mapRenderer.fitAggloBounds();
  setTimeout(() => {
    try {
      mapRenderer.invalidateSize();
    } catch (error) {}
  }, 150);
});

window.addEventListener("load", () => {
  try {
    mapRenderer.invalidateSize();
  } catch (error) {}
});

window.addEventListener("resize", () => {
  try {
    mapRenderer.invalidateSize();
  } catch (error) {}
});

window.addEventListener("error", () => {
  const panel = document.querySelector(".panel");
  if (!panel || document.getElementById("appErrorBanner")) return;
  const div = document.createElement("div");
  div.id = "appErrorBanner";
  div.style.cssText =
    "margin:12px 18px 0;padding:10px 12px;border:1px solid #fecaca;border-radius:12px;background:#fef2f2;color:#991b1b;font-size:12px;";
  div.textContent =
    "Une erreur JavaScript a été détectée. Vérifie la console du navigateur.";
  panel.insertBefore(div, panel.children[1] || null);
});
