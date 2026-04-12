const test = require("node:test");
const assert = require("node:assert/strict");

const { createAppHarness } = require("./load-app");

function flushAsyncWork() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("la saisie d'une commune exacte synchronise la selection interne et produit une orientation", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Juvignac";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Juvignac");
  assert.equal(exports.DOM.subzoneSelect.value, "");
  assert.equal(exports.getCurrentArea().id, "juvignac");
  assert.notEqual(exports.getInternalState().routeLayer, null);
});

test("la saisie d'un quartier de Montpellier selectionne la bonne sous-zone", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Montpellier - Mosson";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Montpellier");
  assert.equal(exports.DOM.subzoneSelect.value, "mtp_mosson");
  assert.equal(exports.getCurrentArea().id, "mtp_mosson");
  assert.notEqual(exports.getInternalState().routeLayer, null);
});

test("un alias de quartier intramuros selectionne la sous-zone la plus pertinente", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Antigone";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Montpellier");
  assert.equal(exports.DOM.subzoneSelect.value, "mtp_port_marianne");
  assert.equal(exports.getCurrentArea().id, "mtp_port_marianne");
  assert.notEqual(exports.getInternalState().routeLayer, null);
});

test("une adresse montpellieraine exacte fait partir le trajet d'un point precis", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "10 rue Joffre";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Montpellier");
  assert.equal(exports.DOM.subzoneSelect.value, "mtp_centre_historique");
  assert.equal(exports.getCurrentArea().id, "mtp_centre_historique");
  assert.equal(exports.getApplicationState().originPoint !== null, true);
  assert.equal(exports.getApplicationState().originPoint.precision, "address");
  assert.notEqual(exports.getInternalState().routeLayer, null);
  const routeStart = Array.from(
    exports.getInternalState().routeLayer[1].payload.coords[0],
  );
  assert.equal(routeStart[0], 43.6065946);
  assert.equal(routeStart[1], 3.8792217);
});

test("une rue montpellieraine issue de la base locale selectionne le quartier attendu", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "rue Joffre";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Montpellier");
  assert.equal(exports.DOM.subzoneSelect.value, "mtp_centre_historique");
  assert.equal(exports.getCurrentArea().id, "mtp_centre_historique");
  assert.notEqual(exports.getInternalState().routeLayer, null);
});

test("cliquer une suggestion locale de rue montpellieraine conserve un texte lisible et localise la zone", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "joff";
  exports.DOM.cityInput.dispatchEvent({ type: "input" });

  const suggestions = exports.DOM.citySuggestBox.querySelectorAll(".suggest-item");
  assert.ok(suggestions.some((item) => item.textContent.includes("Rue Joffre")));

  const streetSuggestion = suggestions.find((item) =>
    item.textContent.includes("Rue Joffre"),
  );
  streetSuggestion.dispatchEvent({ type: "click" });

  assert.equal(exports.DOM.cityInput.value, "Rue Joffre");
  assert.equal(exports.DOM.citySelect.value, "Montpellier");
  assert.equal(exports.DOM.subzoneSelect.value, "mtp_centre_historique");
  assert.equal(exports.getCurrentArea().id, "mtp_centre_historique");
});

test("une interaction tactile sur une suggestion de localisation met a jour le champ mobile", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "joff";
  exports.DOM.cityInput.dispatchEvent({ type: "input" });

  const suggestions = exports.DOM.citySuggestBox.querySelectorAll(".suggest-item");
  const streetSuggestion = suggestions.find((item) =>
    item.textContent.includes("Rue Joffre"),
  );

  assert.ok(streetSuggestion);

  streetSuggestion.dispatchEvent({ type: "touchstart" });
  exports.DOM.cityInput.dispatchEvent({ type: "blur" });

  assert.equal(exports.DOM.cityInput.value, "Rue Joffre");
  assert.equal(exports.DOM.citySelect.value, "Montpellier");
  assert.equal(exports.DOM.subzoneSelect.value, "mtp_centre_historique");
  assert.equal(exports.getCurrentArea().id, "mtp_centre_historique");
});

test("l'autocompletion propose une adresse montpellieraine distante et la selectionne au clic", async () => {
  const fetchCalls = [];
  const { exports } = createAppHarness({
    fetchImpl: async (url) => {
      fetchCalls.push(url);
      return {
        ok: true,
        async json() {
          return [
            {
              display_name: "45 Rue du Faubourg du Courreau, Montpellier, France",
              name: "Rue du Faubourg du Courreau",
              lat: "43.6085",
              lon: "3.8664",
              address: {
                house_number: "45",
                road: "Rue du Faubourg du Courreau",
                city: "Montpellier",
                suburb: "Figuerolles",
              },
            },
          ];
        },
      };
    },
  });

  exports.DOM.cityInput.value = "45 rue imaginaire du courreau";
  exports.DOM.cityInput.dispatchEvent({ type: "input" });
  await flushAsyncWork();
  await flushAsyncWork();

  assert.equal(fetchCalls.length, 1);
  const suggestions = exports.DOM.citySuggestBox.querySelectorAll(".suggest-item");
  assert.ok(suggestions.some((item) => item.textContent.includes("Rue du Faubourg du Courreau")));

  suggestions[0].dispatchEvent({ type: "click" });

  assert.equal(exports.DOM.citySelect.value, "Montpellier");
  assert.equal(exports.getCurrentArea().id, "mtp_centre_historique");
  assert.match(exports.DOM.cityInput.value, /Montpellier/);
});

test("la saisie d'un secteur de Lattes selectionne la bonne sous-zone", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Lattes - Boirargues";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.DOM.citySelect.value, "Lattes");
  assert.equal(exports.DOM.subzoneSelect.value, "lattes-boirargues");
  assert.equal(exports.getCurrentArea().id, "lattes-boirargues");
  assert.notEqual(exports.getInternalState().routeLayer, null);
});

test("Mauguio avec un motif traumato oriente vers la Clinique du Parc", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Mauguio";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.DOM.symptomInput.value = "entorse";
  exports.updateDecision();

  assert.equal(matched, true);
  assert.equal(exports.getCurrentArea().id, "mauguio");
  assert.notEqual(exports.getInternalState().routeLayer, null);
  assert.equal(
    exports.getInternalState().orientationPopup.content.textContent.includes(
      "Clinique du Parc",
    ),
    true,
  );
});

test("changer le motif recalcule l'orientation quand la filiere bascule", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Carnon";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.DOM.symptomInput.value = "traumatisme";
  exports.DOM.symptomInput.dispatchEvent({ type: "input" });

  assert.equal(matched, true);
  assert.equal(exports.getCurrentArea().id, "carnon");
  assert.equal(
    exports.getInternalState().orientationPopup.content.textContent.includes(
      "Clinique Saint-Roch",
    ),
    true,
  );

  exports.DOM.symptomInput.value = "vomissements";
  exports.DOM.symptomInput.dispatchEvent({ type: "input" });

  assert.equal(exports.getApplicationState().mapSpecialty, "gastro_uro");
  assert.equal(
    exports.getInternalState().orientationPopup.content.textContent.includes(
      "Clinique du Millénaire",
    ),
    true,
  );
});

test("un motif non indexe efface l'orientation au lieu de basculer en classique", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Mauguio";
  const matched = exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.DOM.symptomInput.value = "entorse";
  exports.updateDecision();

  assert.equal(matched, true);
  assert.notEqual(exports.getInternalState().routeLayer, null);
  assert.notEqual(exports.getInternalState().orientationPopup, null);

  exports.DOM.symptomInput.value = "motif hors catalogue";
  exports.DOM.symptomInput.dispatchEvent({ type: "input" });

  assert.equal(exports.DOM.detectedSpecialty.value, "");
  assert.equal(exports.DOM.symptomInput.getAttribute("aria-invalid"), "true");
  assert.equal(exports.DOM.symptomError.classList.contains("hidden"), false);
  assert.equal(exports.DOM.symptomError.textContent, "Choisir un motif valable");
  assert.equal(exports.DOM.symptomField.classList.contains("is-invalid"), true);
  assert.equal(exports.getInternalState().routeLayer, null);
  assert.equal(exports.getInternalState().orientationPopup, null);
});

test("une saisie valide efface le message d'erreur sur le motif", () => {
  const { exports } = createAppHarness();

  exports.DOM.symptomInput.value = "motif hors catalogue";
  exports.DOM.symptomInput.dispatchEvent({ type: "input" });

  assert.equal(exports.DOM.symptomError.classList.contains("hidden"), false);

  exports.DOM.symptomInput.value = "traumatisme";
  exports.DOM.symptomInput.dispatchEvent({ type: "input" });

  assert.equal(exports.DOM.symptomInput.getAttribute("aria-invalid"), "false");
  assert.equal(exports.DOM.symptomError.classList.contains("hidden"), true);
  assert.equal(exports.DOM.symptomField.classList.contains("is-invalid"), false);
});

test("le bouton Effacer reinitialise la selection, la decision et la carte", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Juvignac";
  exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.updateDecision();
  assert.notEqual(exports.getInternalState().routeLayer, null);

  exports.DOM.focusBtn.dispatchEvent("click");

  assert.equal(exports.DOM.cityInput.value, "");
  assert.equal(exports.DOM.citySelect.value, "");
  assert.equal(exports.DOM.subzoneSelect.value, "");
  assert.equal(exports.DOM.detectedSpecialty.value, "");
  assert.equal(exports.getInternalState().routeLayer, null);
  assert.equal(exports.getInternalState().focusLayer, null);
});

test("le bouton Orientation se masque sur petit viewport puis reapparait sur grand ecran", () => {
  const harness = createAppHarness();
  const { exports, window } = harness;

  window.innerWidth = 740;
  window.dispatchEvent({ type: "resize" });
  assert.equal(exports.DOM.regulateBtn.classList.contains("hidden"), true);

  window.innerWidth = 1024;
  window.dispatchEvent({ type: "resize" });
  assert.equal(exports.DOM.regulateBtn.classList.contains("hidden"), false);
});

test("fermer la popup d'orientation efface la console pour une nouvelle saisie", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Juvignac";
  exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.DOM.symptomInput.value = "vomissements";
  exports.updateDecision();

  const popup = exports.getInternalState().orientationPopup;
  assert.notEqual(popup, null);

  exports.getInternalState().map.closePopup(popup);

  assert.equal(exports.DOM.cityInput.value, "");
  assert.equal(exports.DOM.citySelect.value, "");
  assert.equal(exports.DOM.subzoneSelect.value, "");
  assert.equal(exports.DOM.symptomInput.value, "");
  assert.equal(exports.DOM.detectedSpecialty.value, "");
  assert.equal(exports.getInternalState().orientationPopup, null);
  assert.equal(exports.getInternalState().routeLayer, null);
  assert.equal(exports.getInternalState().focusLayer, null);
});

test("la popup d'orientation reste laterale au niveau du drapeau d'arrivee", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Mauguio";
  exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.DOM.symptomInput.value = "vomissements";
  exports.updateDecision();

  const popup = exports.getInternalState().orientationPopup;
  assert.notEqual(popup, null);
  assert.equal(
    popup.getElement().className.includes("orientation-popup--top"),
    false,
  );
  assert.equal(
    popup.getElement().className.includes("orientation-popup--bottom"),
    false,
  );
  assert.equal(
    popup.getElement().className.includes("orientation-popup--left"),
    true,
  );
  assert.equal(Array.isArray(popup.options.offset), true);
  assert.equal(popup.options.offset[0] < 0, true);
  assert.equal(popup.getElement().style.left || "", "");
  assert.equal(popup.getElement().style.top || "", "");
});

test("le cadrage reserve davantage de hauteur du cote d'arrivee du trajet", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Montpellier - Mosson";
  exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.DOM.symptomInput.value = "douleur thoracique";
  exports.updateDecision();

  const fitOptions = exports.getInternalState().map._lastFitOptions;
  assert.notEqual(fitOptions, null);
  assert.equal(fitOptions.paddingTopLeft[1] > fitOptions.paddingBottomRight[1], true);
});

test("le cadrage laisse de la place a la popup gauche au-dessus de la legende", () => {
  const { exports } = createAppHarness();

  exports.DOM.cityInput.value = "Mauguio";
  exports.syncSelectionFromCityInput(exports.DOM.cityInput.value);
  exports.DOM.symptomInput.value = "douleur thoracique";
  exports.updateDecision();

  const fitOptions = exports.getInternalState().map._lastFitOptions;
  const popup = exports.getInternalState().orientationPopup;
  assert.notEqual(fitOptions, null);
  assert.notEqual(popup, null);
  assert.equal(popup.getElement().className.includes("orientation-popup--left"), true);
  assert.equal(fitOptions.paddingBottomRight[1] >= 226, true);
});
