const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadDataExports() {
  const filePath = path.join(__dirname, "..", "data.js");
  const source = fs.readFileSync(filePath, "utf8");
  const context = vm.createContext({ console });

  vm.runInContext(
    `${source}
globalThis.__DATA_EXPORTS__ = {
  HOSPITAL_RECORDS,
  HOSPITALS,
  SPECIALTIES,
  CITY_AREAS,
  MTP_SUBAREAS,
  ALL_AREAS,
  AREA_BY_ID,
  MAP_CLOUD_AREA_IDS,
  CLOUDS,
  CLOUD_ANCHORS,
  RULES,
  MTP_RULES,
  MTP_AREA_RULES,
  SPECIAL_AREA_RULES,
  AREA_SPECIALTY_RULES,
  resolveHospitalForArea
};`,
    context,
    { filename: filePath }
  );

  return context.__DATA_EXPORTS__;
}

module.exports = { loadDataExports };
