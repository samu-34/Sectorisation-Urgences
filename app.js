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

const { simplify, getRankedMatches, filiereLabelById } = MediMapDomain;
const appController = MediMapApplication.createAppController();

const mapRenderer = MediMapMapRenderer.createMapRenderer({
  mapElementId: "map",
  legendElement: DOM.legend,
  getOrientationSpecialty: () => appController.getOrientationSpecialty(),
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

function syncSelectionFromCityInput(rawValue) {
  const result = appController.selectCityInput(rawValue);
  renderSelectionState();
  return result.selection.matched;
}

function applyCitySelection(picked) {
  appController.selectCityInput(picked);
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
  autocomplete.renderCitySuggestions(DOM.cityInput.value);
  syncSelectionFromCityInput(DOM.cityInput.value);
  updateDecision();
});

DOM.cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
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
  syncSelectionFromCityInput(DOM.cityInput.value);
  updateDecision();
});

DOM.cityInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    syncSelectionFromCityInput(DOM.cityInput.value);
    updateDecision();
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
  updateDecision();
});

DOM.focusBtn.addEventListener("click", () => {
  appController.resetSession();
  autocomplete.closeAllSuggestions();
  renderSelectionState();
  DOM.symptomInput.value = "";
  renderDetectedSpecialtyIndicator();
  resetDecisionState();
  mapRenderer.setDefaultMapView();
});

DOM.citySelect.addEventListener("change", () => {
  appController.selectCityValue(DOM.citySelect.value);
  renderSelectionState();
  updateDecision();
});

DOM.subzoneSelect.addEventListener("change", () => {
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
