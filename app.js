/**
 * MediMap — app.js
 * Couche UI : branche le DOM, l'autocomplete et Leaflet aux cas d'usage applicatifs
 * Dépend de data.js, domain.js, application.js, autocomplete.js,
 * city-input-controller.js et map-renderer.js
 */

const DOM = {
  appRoot: document.getElementById("appRoot"),
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
  authOverlay: document.getElementById("authOverlay"),
  authForm: document.getElementById("authForm"),
  authPassword: document.getElementById("authPassword"),
  authError: document.getElementById("authError"),
  authUnlockBtn: document.getElementById("authUnlockBtn"),
  authTogglePasswordBtn: document.getElementById("authTogglePasswordBtn"),
  feedbackBtn: document.getElementById("feedbackBtn"),
  feedbackOverlay: document.getElementById("feedbackOverlay"),
  feedbackForm: document.getElementById("feedbackForm"),
  feedbackSender: document.getElementById("feedbackSender"),
  feedbackMessage: document.getElementById("feedbackMessage"),
  feedbackStatus: document.getElementById("feedbackStatus"),
  feedbackCloseBtn: document.getElementById("feedbackCloseBtn"),
  feedbackMailBtn: document.getElementById("feedbackMailBtn"),
};

const MAP_ACCESS_PASSWORD = "samu34secteur";
const FEEDBACK_EMAIL_RECIPIENTS = [
  "h-ghomrani@chu-montpellier.fr",
  "mohammed-mahmoudi@chu-montpellier.fr",
];
let mapAccessUnlocked = false;
let feedbackDialogOpen = false;

const {
  simplify,
  getRankedMatches,
  filiereLabelById,
} = MediMapDomain;
const appController = MediMapApplication.createAppController();

const mapRenderer = MediMapMapRenderer.createMapRenderer({
  mapElementId: "map",
  legendElement: DOM.legend,
  getOrientationSpecialty: () => appController.getOrientationSpecialty(),
  onOrientationPopupClose() {
    resetSessionUi();
  },
});

function resetSessionUi({ resetMapView = false } = {}) {
  cityInputController.cancelPendingWork();
  appController.resetSession();
  autocomplete.closeAllSuggestions();
  renderSelectionState();
  DOM.symptomInput.value = "";
  renderDetectedSpecialtyIndicator();
  resetDecisionState();
  if (resetMapView) {
    mapRenderer.setDefaultMapView();
  }
}

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
    areaHospitalMap: mapModel.areaHospitalMap,
    cloudHospitalMap: mapModel.cloudHospitalMap,
  });
}

function lockMapAccess() {
  mapAccessUnlocked = false;
  DOM.appRoot.classList.add("app-locked");
  DOM.authOverlay.classList.remove("hidden");
  DOM.authError.classList.add("hidden");
  DOM.authPassword.value = "";
  DOM.authPassword.type = "password";
  DOM.authTogglePasswordBtn.textContent = "Afficher";
  DOM.authTogglePasswordBtn.setAttribute("aria-pressed", "false");

  setTimeout(() => {
    try {
      DOM.authPassword.focus();
    } catch (error) {}
  }, 30);
}

function unlockMapAccess() {
  mapAccessUnlocked = true;
  DOM.appRoot.classList.remove("app-locked");
  DOM.authOverlay.classList.add("hidden");
  DOM.authError.classList.add("hidden");
  DOM.authPassword.value = "";

  setTimeout(() => {
    try {
      mapRenderer.invalidateSize();
      mapRenderer.fitAggloBounds();
      DOM.cityInput.focus();
    } catch (error) {}
  }, 120);
}

function submitMapAccessPassword() {
  const typedPassword = String(DOM.authPassword.value || "").trim();

  if (typedPassword === MAP_ACCESS_PASSWORD) {
    unlockMapAccess();
    return true;
  }

  DOM.authError.classList.remove("hidden");
  DOM.authPassword.select();
  return false;
}

function setFeedbackStatus(message, type) {
  DOM.feedbackStatus.textContent = message;
  DOM.feedbackStatus.classList.remove("hidden", "is-success", "is-error");
  DOM.feedbackStatus.classList.add(type === "error" ? "is-error" : "is-success");
}

function clearFeedbackStatus() {
  DOM.feedbackStatus.textContent = "";
  DOM.feedbackStatus.classList.add("hidden");
  DOM.feedbackStatus.classList.remove("is-success", "is-error");
}

function buildFeedbackPayload() {
  const sender = String(DOM.feedbackSender.value || "").trim();
  const message = String(DOM.feedbackMessage.value || "").trim();

  return [
    "MediMap - Remarque / suggestion",
    "",
    `Emetteur : ${sender || "Non renseigne"}`,
    `Date : ${new Date().toLocaleString("fr-FR")}`,
    "",
    "Message :",
    message,
  ].join("\n");
}

function autoResizeFeedbackMessage() {
  DOM.feedbackMessage.style.height = "auto";
  DOM.feedbackMessage.style.height = `${DOM.feedbackMessage.scrollHeight}px`;
}

function openFeedbackDialog() {
  feedbackDialogOpen = true;
  clearFeedbackStatus();
  DOM.feedbackOverlay.classList.remove("hidden");
  setTimeout(() => {
    try {
      autoResizeFeedbackMessage();
      DOM.feedbackMessage.focus();
    } catch (error) {}
  }, 30);
}

function closeFeedbackDialog() {
  feedbackDialogOpen = false;
  DOM.feedbackOverlay.classList.add("hidden");
  clearFeedbackStatus();
  DOM.feedbackMessage.style.height = "";
}

function openFeedbackEmailDraft() {
  const message = String(DOM.feedbackMessage.value || "").trim();
  if (!message) {
    setFeedbackStatus("Ajoute un message avant d'ouvrir l'email.", "error");
    DOM.feedbackMessage.focus();
    return;
  }

  const subject = encodeURIComponent("MediMap - Remarque / suggestion");
  const body = encodeURIComponent(buildFeedbackPayload());
  const recipients = encodeURIComponent(FEEDBACK_EMAIL_RECIPIENTS.join(","));
  window.location.href = `mailto:${recipients}?subject=${subject}&body=${body}`;
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

let cityInputController = null;

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
  onCityPick(picked) {
    cityInputController.applyCitySelection(picked);
  },
});

cityInputController = MediMapCityInput.createCityInputController({
  DOM,
  appController,
  autocomplete,
  simplify,
  looksLikeMontpellierAddress: MediMapDomain.looksLikeMontpellierAddress,
  resolveMontpellierGeocodeCandidate: MediMapDomain.resolveMontpellierGeocodeCandidate,
  onSelectionStateChange() {
    renderSelectionState();
  },
  onDecisionChange() {
    updateDecision();
  },
});

function syncSelectionFromCityInput(rawValue) {
  return cityInputController.syncSelectionFromCityInput(rawValue);
}

async function syncSelectionFromCityInputWithFallback(rawValue) {
  await cityInputController.syncSelectionFromCityInputWithFallback(rawValue);
}

DOM.symptomInput.addEventListener("input", () => {
  autocomplete.renderSymptomSuggestions(DOM.symptomInput.value);
  updateDecision();
});

DOM.cityInput.addEventListener("input", () => {
  cityInputController.handleInput(DOM.cityInput.value);
});

DOM.cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    cityInputController.handleEscape();
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
  void cityInputController.handleSubmit(DOM.cityInput.value);
});

DOM.cityInput.addEventListener("blur", () => {
  cityInputController.handleBlur(DOM.cityInput.value);
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
  void cityInputController.handleSubmit(DOM.cityInput.value);
});

DOM.focusBtn.addEventListener("click", () => {
  resetSessionUi({ resetMapView: true });
});

DOM.citySelect.addEventListener("change", () => {
  cityInputController.cancelPendingWork();
  appController.selectCityValue(DOM.citySelect.value);
  renderSelectionState();
  updateDecision();
});

DOM.subzoneSelect.addEventListener("change", () => {
  cityInputController.cancelPendingWork();
  appController.selectSubzone(DOM.subzoneSelect.value);
  renderSelectionState({ syncCityInput: false });
  updateDecision();
});

DOM.authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitMapAccessPassword();
});

DOM.authPassword.addEventListener("input", () => {
  DOM.authError.classList.add("hidden");
});

DOM.authTogglePasswordBtn.addEventListener("click", () => {
  const shouldReveal = DOM.authPassword.type === "password";
  DOM.authPassword.type = shouldReveal ? "text" : "password";
  DOM.authTogglePasswordBtn.textContent = shouldReveal ? "Masquer" : "Afficher";
  DOM.authTogglePasswordBtn.setAttribute(
    "aria-pressed",
    shouldReveal ? "true" : "false",
  );
  DOM.authPassword.focus();
});

DOM.feedbackBtn.addEventListener("click", () => {
  openFeedbackDialog();
});

DOM.feedbackCloseBtn.addEventListener("click", () => {
  closeFeedbackDialog();
});

DOM.feedbackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  openFeedbackEmailDraft();
});

DOM.feedbackMessage.addEventListener("input", () => {
  clearFeedbackStatus();
  autoResizeFeedbackMessage();
});

DOM.feedbackSender.addEventListener("input", () => {
  clearFeedbackStatus();
});

document.addEventListener("click", (event) => {
  if (!DOM.symptomInput.parentElement.contains(event.target)) {
    autocomplete.closeSymptomSuggestions();
  }
  if (!DOM.cityInput.parentElement.contains(event.target)) {
    autocomplete.closeCitySuggestions();
  }
  if (
    feedbackDialogOpen &&
    event.target === DOM.feedbackOverlay
  ) {
    closeFeedbackDialog();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && feedbackDialogOpen) {
    closeFeedbackDialog();
    return;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  lockMapAccess();
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
  if (!mapAccessUnlocked) return;
  try {
    mapRenderer.invalidateSize();
  } catch (error) {}
});

window.addEventListener("resize", () => {
  if (!mapAccessUnlocked) return;
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
