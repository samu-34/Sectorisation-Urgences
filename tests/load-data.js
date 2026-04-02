const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadDataExports() {
  const sectorizationPath = path.join(
    __dirname,
    "..",
    "generated",
    "sectorization-data.js",
  );
  const filePath = path.join(__dirname, "..", "data.js");
  const sectorizationSource = fs.existsSync(sectorizationPath)
    ? fs.readFileSync(sectorizationPath, "utf8")
    : "";
  const source = fs.readFileSync(filePath, "utf8");
  const context = vm.createContext({ console });

  if (sectorizationSource) {
    vm.runInContext(sectorizationSource, context, { filename: sectorizationPath });
  }

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
