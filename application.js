/**
 * MediMap — application.js
 * Cas d'usage applicatifs : session, orchestration fonctionnelle et view-models
 * Dépend de data.js et domain.js (chargés avant)
 */

(function attachApplication(global) {
  "use strict";

  const CITY_OPTIONS = Object.freeze(
    [
      "Montpellier",
      "Lattes",
      ...CITY_AREAS.filter((area) => area.type === "commune").map(
        (area) => area.city,
      ),
    ]
      .filter((city, index, list) => list.indexOf(city) === index)
      .sort((a, b) => a.localeCompare(b, "fr")),
  );

  const SUBZONE_MODELS_BY_CITY = Object.freeze({
    Montpellier: Object.freeze({
      placeholder: "— Sélectionner un quartier —",
      options: MTP_SUBAREAS,
    }),
    Lattes: Object.freeze({
      placeholder: "— Sélectionner un secteur —",
      options: CITY_AREAS.filter((area) => area.type === "lattes"),
    }),
  });

  function cloneSelection(selection) {
    return {
      matched: selection.matched,
      cityValue: selection.cityValue,
      subzoneValue: selection.subzoneValue,
      displayValue: selection.displayValue,
      resolvedPoint: selection.resolvedPoint
        ? {
            lat: selection.resolvedPoint.lat,
            lng: selection.resolvedPoint.lng,
            label: selection.resolvedPoint.label,
            precision: selection.resolvedPoint.precision,
          }
        : null,
      isAddressSelection: Boolean(selection.isAddressSelection),
    };
  }

  function createAppController({ domain = MediMapDomain } = {}) {
    const state = {
      cityInputValue: "",
      cityValue: "",
      subzoneValue: "",
      symptomInputValue: "",
      detectedSpecialty: "",
      mapSpecialty: "divers",
      originPoint: null,
    };

    function resolveCurrentArea() {
      return domain.resolveAreaFromSelection(state.cityValue, state.subzoneValue);
    }

    function getSubzoneModel(cityValue = state.cityValue) {
      const model = SUBZONE_MODELS_BY_CITY[cityValue];
      if (!model) {
        return {
          visible: false,
          placeholder: "",
          options: [],
        };
      }

      return {
        visible: true,
        placeholder: model.placeholder,
        options: model.options.slice(),
      };
    }

    function syncDetectedSpecialty() {
      state.detectedSpecialty = domain.inferDetectedSpecialty(state.symptomInputValue);
      return state.detectedSpecialty;
    }

    function syncMapSpecialtyFromDetected() {
      const detectedSpecialty = syncDetectedSpecialty();
      if (!detectedSpecialty || detectedSpecialty === state.mapSpecialty) {
        return false;
      }
      state.mapSpecialty = detectedSpecialty;
      return true;
    }

    function getState() {
      return {
        cityInputValue: state.cityInputValue,
        cityValue: state.cityValue,
        subzoneValue: state.subzoneValue,
        symptomInputValue: state.symptomInputValue,
        detectedSpecialty: state.detectedSpecialty,
        mapSpecialty: state.mapSpecialty,
        originPoint: state.originPoint
          ? {
              lat: state.originPoint.lat,
              lng: state.originPoint.lng,
              label: state.originPoint.label,
              precision: state.originPoint.precision,
            }
          : null,
        currentArea: resolveCurrentArea(),
      };
    }

    function getCityOptions() {
      return CITY_OPTIONS.slice();
    }

    function getCitySuggestions() {
      return domain.getCitySuggestions();
    }

    function getCurrentArea() {
      return resolveCurrentArea();
    }

    function getOrientationSpecialty() {
      return state.detectedSpecialty || "divers";
    }

    function selectCityInput(rawValue) {
      state.cityInputValue = String(rawValue ?? "");
      const selection = domain.resolveCitySelection(state.cityInputValue);
      return applyResolvedSelection(selection, {
        inputValue:
          selection.matched && selection.displayValue
            ? selection.displayValue
            : state.cityInputValue,
      });
    }

    function applyResolvedSelection(selection, { inputValue } = {}) {
      state.cityValue = String(selection.cityValue || "");
      state.subzoneValue = String(selection.subzoneValue || "");
      state.originPoint = selection.resolvedPoint
        ? {
            lat: selection.resolvedPoint.lat,
            lng: selection.resolvedPoint.lng,
            label: selection.resolvedPoint.label,
            precision: selection.resolvedPoint.precision,
          }
        : null;

      if (inputValue !== undefined) {
        state.cityInputValue = String(inputValue ?? "");
      } else if (
        selection.matched &&
        selection.displayValue &&
        !selection.isAddressSelection
      ) {
        state.cityInputValue = selection.displayValue;
      }

      return {
        selection: cloneSelection(selection),
        subzoneModel: getSubzoneModel(selection.cityValue),
        currentArea: resolveCurrentArea(),
        state: getState(),
      };
    }

    function selectCityValue(cityValue) {
      state.cityValue = String(cityValue || "");
      state.cityInputValue = state.cityValue;
      state.subzoneValue = "";
      state.originPoint = null;

      return {
        subzoneModel: getSubzoneModel(state.cityValue),
        currentArea: resolveCurrentArea(),
        state: getState(),
      };
    }

    function selectSubzone(subzoneValue) {
      state.subzoneValue = String(subzoneValue || "");
      state.originPoint = null;
      return {
        currentArea: resolveCurrentArea(),
        state: getState(),
      };
    }

    function setSymptomInput(text, { syncMapSpecialty = true } = {}) {
      state.symptomInputValue = String(text ?? "");
      syncDetectedSpecialty();
      const mapSpecialtyChanged =
        syncMapSpecialty ? syncMapSpecialtyFromDetected() : false;

      return {
        detectedSpecialty: state.detectedSpecialty,
        mapSpecialtyChanged,
        state: getState(),
      };
    }

    function selectMapSpecialty(specialtyId) {
      const nextSpecialty = String(specialtyId || "");
      const changed = Boolean(nextSpecialty) && nextSpecialty !== state.mapSpecialty;
      if (changed) {
        state.mapSpecialty = nextSpecialty;
      }

      return {
        mapSpecialtyChanged: changed,
        state: getState(),
      };
    }

    function computeOrientation() {
      const area = resolveCurrentArea();
      if (!area) {
        return {
          mapSpecialtyChanged: false,
          orientation: null,
          state: getState(),
        };
      }

      const mapSpecialtyChanged = syncMapSpecialtyFromDetected();
      const hospitalId = domain.resolveOrientationHospital(area, state.symptomInputValue);
      if (!hospitalId) {
        return {
          mapSpecialtyChanged,
          orientation: null,
          state: getState(),
        };
      }

      const originPoint =
        state.originPoint || {
          lat: area.lat,
          lng: area.lng,
          label: area.label,
          precision: "area",
        };

      return {
        mapSpecialtyChanged,
        orientation: {
          area,
          originPoint,
          hospitalId,
          symptom: state.symptomInputValue.trim(),
          travelEstimate: domain.estimateTheoreticalTravelFromPoint(
            originPoint,
            hospitalId,
          ),
        },
        state: getState(),
      };
    }

    function refreshSectorisationMap() {
      return {
        specialtyId: state.mapSpecialty,
        cloudHospitalMap: Object.fromEntries(
          Object.entries(MAP_CLOUD_AREA_IDS).map(([cloudKey, areaId]) => [
            cloudKey,
            domain.resolveMapHospital(AREA_BY_ID[areaId], state.mapSpecialty),
          ]),
        ),
        state: getState(),
      };
    }

    function resetSession() {
      const preservedMapSpecialty = state.mapSpecialty;
      state.cityInputValue = "";
      state.cityValue = "";
      state.subzoneValue = "";
      state.symptomInputValue = "";
      state.detectedSpecialty = "";
      state.originPoint = null;
      state.mapSpecialty = preservedMapSpecialty;

      return {
        subzoneModel: getSubzoneModel(""),
        state: getState(),
      };
    }

    return Object.freeze({
      getState,
      getCityOptions,
      getCitySuggestions,
      getSubzoneModel,
      getCurrentArea,
      getOrientationSpecialty,
      selectCityInput,
      applyResolvedSelection,
      selectCityValue,
      selectSubzone,
      setSymptomInput,
      selectMapSpecialty,
      computeOrientation,
      refreshSectorisationMap,
      resetSession,
    });
  }

  global.MediMapApplication = Object.freeze({
    createAppController,
  });
})(globalThis);
