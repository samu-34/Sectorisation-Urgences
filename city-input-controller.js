/**
 * MediMap — city-input-controller.js
 * Gestion de la saisie de localisation, des suggestions distantes et du geocodage
 */

(function attachCityInputController(global) {
  "use strict";

  const REMOTE_CITY_SUGGESTION_DEBOUNCE_MS = 1100;

  function createCityInputController({
    DOM,
    appController,
    autocomplete,
    simplify,
    looksLikeMontpellierAddress,
    resolveMontpellierGeocodeCandidate,
    onSelectionStateChange = () => {},
    onDecisionChange = () => {},
  }) {
    let citySuggestionRequestId = 0;
    let citySuggestionAbortController = null;
    let citySuggestionDebounceTimer = null;
    let remoteCitySuggestions = [];
    let cityResolutionRequestId = 0;
    let cityResolutionAbortController = null;

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

    function cancelPendingWork() {
      cancelPendingCitySuggestions();
      cancelPendingCityResolution();
    }

    function syncSelectionFromCityInput(rawValue) {
      const result = appController.selectCityInput(rawValue);
      onSelectionStateChange();
      return result.selection.matched;
    }

    async function loadRemoteCitySuggestions(rawValue) {
      const trimmed = String(rawValue || "").trim();
      if (
        !trimmed ||
        !looksLikeMontpellierAddress(trimmed) ||
        !canResolveRemoteAddress()
      ) {
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
      if (
        !trimmed ||
        !looksLikeMontpellierAddress(trimmed) ||
        !canResolveRemoteAddress()
      ) {
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
          onSelectionStateChange();
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
      onDecisionChange();
    }

    function applyCitySelection(picked) {
      cancelPendingWork();
      if (picked && typeof picked === "object" && picked.selection) {
        appController.applyResolvedSelection(picked.selection, {
          inputValue: picked.inputValue || picked.label || "",
        });
      } else if (picked && typeof picked === "object") {
        appController.selectCityInput(picked.inputValue || picked.label || "");
      } else {
        appController.selectCityInput(picked);
      }
      onSelectionStateChange();
      autocomplete.closeCitySuggestions();
      onDecisionChange();
    }

    function handleInput(rawValue) {
      cancelPendingWork();
      renderCitySuggestions(rawValue);
      const matched = syncSelectionFromCityInput(rawValue);
      onDecisionChange();
      if (!matched) {
        scheduleRemoteCitySuggestions(rawValue);
      }
      return matched;
    }

    function handleEscape() {
      cancelPendingCitySuggestions();
      autocomplete.closeCitySuggestions();
    }

    async function handleSubmit(rawValue) {
      autocomplete.closeCitySuggestions();
      await syncSelectionFromCityInputWithFallback(rawValue);
    }

    function handleBlur(rawValue) {
      window.setTimeout(() => {
        cancelPendingCitySuggestions();
        void syncSelectionFromCityInputWithFallback(rawValue);
      }, 0);
    }

    return Object.freeze({
      cancelPendingCitySuggestions,
      cancelPendingCityResolution,
      cancelPendingWork,
      syncSelectionFromCityInput,
      syncSelectionFromCityInputWithFallback,
      applyCitySelection,
      handleInput,
      handleEscape,
      handleSubmit,
      handleBlur,
    });
  }

  global.MediMapCityInput = Object.freeze({
    createCityInputController,
  });
})(globalThis);
