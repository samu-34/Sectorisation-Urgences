/**
 * MediMap — autocomplete.js
 * Gestion UI des listes de suggestions
 */

(function attachAutocomplete(global) {
  "use strict";

  function createAutocompleteController({
    DOM,
    enabled = true,
    simplify,
    getRankedMatches,
    filiereLabelById,
    symptomItems,
    cityItems,
    onSymptomPick,
    onCityPick,
  }) {
    let symptomSuggestionIndex = -1;
    let citySuggestionIndex = -1;
    let currentCitySuggestions = [];

    function getSuggestItems(box) {
      return [...box.querySelectorAll(".suggest-item")];
    }

    function setSuggestBoxState(input, box, isOpen) {
      box.classList.toggle("hidden", !isOpen);
      input.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (!isOpen) {
        input.removeAttribute("aria-activedescendant");
      }
    }

    function setActiveSuggestion(input, box, index) {
      const items = getSuggestItems(box);
      items.forEach((item, itemIndex) => {
        const isActive = itemIndex === index;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      if (index >= 0 && items[index]) {
        input.setAttribute("aria-activedescendant", items[index].id);
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    }

    function closeSymptomSuggestions() {
      DOM.suggestBox.innerHTML = "";
      symptomSuggestionIndex = -1;
      setSuggestBoxState(DOM.symptomInput, DOM.suggestBox, false);
    }

    function closeCitySuggestions() {
      DOM.citySuggestBox.innerHTML = "";
      citySuggestionIndex = -1;
      currentCitySuggestions = [];
      setSuggestBoxState(DOM.cityInput, DOM.citySuggestBox, false);
    }

    function clearBox(box) {
      box.replaceChildren();
    }

    function bindSuggestionPick(element, pick) {
      let handled = false;

      function handlePick(event) {
        if (handled) {
          return;
        }
        handled = true;

        if (event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }

        pick();
      }

      element.addEventListener("pointerdown", handlePick);
      element.addEventListener("mousedown", handlePick);
      element.addEventListener("touchstart", handlePick);
      element.addEventListener("click", handlePick);
    }

    function buildSuggestionItem({
      id,
      label,
      category,
      dataset = {},
    }) {
      const item = document.createElement("div");
      item.id = id;
      item.className = "suggest-item";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      Object.entries(dataset).forEach(([key, value]) => {
        item.dataset[key] = value;
      });
      item.append(document.createTextNode(label));

      if (category) {
        const badge = document.createElement("span");
        badge.className = "suggest-cat";
        badge.textContent = category;
        item.appendChild(badge);
      }

      return item;
    }

    function moveActiveSuggestion(input, box, currentIndex, delta) {
      const items = getSuggestItems(box);
      if (!items.length || box.classList.contains("hidden")) return -1;

      let nextIndex = currentIndex;
      if (nextIndex < 0) {
        nextIndex = delta > 0 ? 0 : items.length - 1;
      } else {
        nextIndex = (nextIndex + delta + items.length) % items.length;
      }

      setActiveSuggestion(input, box, nextIndex);
      return nextIndex;
    }

    function renderSymptomSuggestions(query) {
      if (!enabled) {
        closeSymptomSuggestions();
        return;
      }

      const normalizedQuery = simplify(query);
      if (!normalizedQuery) {
        closeSymptomSuggestions();
        return;
      }

      const matches = getRankedMatches(symptomItems, normalizedQuery, (item) => [
        item.label,
        ...(item.aliases || []),
      ]).slice(0, 8);

      if (!matches.length) {
        closeSymptomSuggestions();
        return;
      }

      clearBox(DOM.suggestBox);
      DOM.suggestBox.append(
        ...matches.map((item, idx) =>
          buildSuggestionItem({
            id: `symptom-option-${idx}`,
            label: item.label,
            category: filiereLabelById(item.filiere),
            dataset: {
              label: item.label,
              filiere: item.filiere,
            },
          }),
        ),
      );

      symptomSuggestionIndex = -1;
      setSuggestBoxState(DOM.symptomInput, DOM.suggestBox, true);
      setActiveSuggestion(DOM.symptomInput, DOM.suggestBox, symptomSuggestionIndex);

      DOM.suggestBox.querySelectorAll(".suggest-item").forEach((element) => {
        bindSuggestionPick(element, () => {
          onSymptomPick(element.dataset.label, element.dataset.filiere);
          closeSymptomSuggestions();
        });
      });
    }

    function renderCitySuggestionEntries(entries) {
      if (!entries.length) {
        closeCitySuggestions();
        return;
      }

      currentCitySuggestions = entries.slice();
      clearBox(DOM.citySuggestBox);
      DOM.citySuggestBox.append(
        ...entries.map((suggestion, idx) =>
          buildSuggestionItem({
            id: `city-option-${idx}`,
            label: suggestion.label,
            category: suggestion.category,
            dataset: {
              index: String(idx),
            },
          }),
        ),
      );

      citySuggestionIndex = -1;
      setSuggestBoxState(DOM.cityInput, DOM.citySuggestBox, true);
      setActiveSuggestion(DOM.cityInput, DOM.citySuggestBox, citySuggestionIndex);

      DOM.citySuggestBox.querySelectorAll(".suggest-item").forEach((element) => {
        bindSuggestionPick(element, () => {
          const suggestion = currentCitySuggestions[Number(element.dataset.index)];
          if (suggestion) {
            onCityPick(suggestion);
          }
        });
      });
    }

    function renderCitySuggestions(query, { extraItems = [] } = {}) {
      if (!enabled) {
        closeCitySuggestions();
        return;
      }

      const normalizedQuery = simplify(query);
      if (!normalizedQuery) {
        closeCitySuggestions();
        return;
      }

      const localMatches = getRankedMatches(
        cityItems,
        normalizedQuery,
        (suggestion) => [suggestion.label, ...(suggestion.aliases || [])],
      ).slice(0, 10);

      const mergedEntries = Array.from(
        new Map(
          [...localMatches, ...extraItems].map((suggestion) => [
            `${simplify(suggestion.label)}::${simplify(suggestion.category || "")}`,
            suggestion,
          ]),
        ).values(),
      ).slice(0, 10);

      renderCitySuggestionEntries(mergedEntries);
    }

    function acceptActiveCitySuggestion() {
      const items = getSuggestItems(DOM.citySuggestBox);
      const current =
        citySuggestionIndex >= 0 ? items[citySuggestionIndex] : null;
      if (!current || DOM.citySuggestBox.classList.contains("hidden")) {
        return false;
      }
      const suggestion = currentCitySuggestions[Number(current.dataset.index)];
      if (!suggestion) {
        return false;
      }
      onCityPick(suggestion);
      return true;
    }

    function acceptActiveSymptomSuggestion() {
      const items = getSuggestItems(DOM.suggestBox);
      const current =
        symptomSuggestionIndex >= 0 ? items[symptomSuggestionIndex] : null;
      if (!current || DOM.suggestBox.classList.contains("hidden")) {
        return false;
      }
      onSymptomPick(current.dataset.label, current.dataset.filiere);
      closeSymptomSuggestions();
      return true;
    }

    return Object.freeze({
      closeSymptomSuggestions,
      closeCitySuggestions,
      closeAllSuggestions() {
        closeSymptomSuggestions();
        closeCitySuggestions();
      },
      renderSymptomSuggestions,
      renderCitySuggestions,
      moveSymptomSuggestion(delta) {
        symptomSuggestionIndex = moveActiveSuggestion(
          DOM.symptomInput,
          DOM.suggestBox,
          symptomSuggestionIndex,
          delta,
        );
      },
      moveCitySuggestion(delta) {
        citySuggestionIndex = moveActiveSuggestion(
          DOM.cityInput,
          DOM.citySuggestBox,
          citySuggestionIndex,
          delta,
        );
      },
      acceptActiveCitySuggestion,
      acceptActiveSymptomSuggestion,
    });
  }

  global.MediMapAutocomplete = Object.freeze({
    createAutocompleteController,
  });
})(globalThis);
