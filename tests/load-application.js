const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadApplicationExports() {
  const dataPath = path.join(__dirname, "..", "data.js");
  const domainPath = path.join(__dirname, "..", "domain.js");
  const applicationPath = path.join(__dirname, "..", "application.js");

  const context = vm.createContext({ console, globalThis: null });
  context.globalThis = context;

  vm.runInContext(fs.readFileSync(dataPath, "utf8"), context, {
    filename: dataPath,
  });
  vm.runInContext(fs.readFileSync(domainPath, "utf8"), context, {
    filename: domainPath,
  });
  vm.runInContext(fs.readFileSync(applicationPath, "utf8"), context, {
    filename: applicationPath,
  });
  vm.runInContext(
    `globalThis.__APPLICATION_EXPORTS__ = {
      MediMapApplication,
      MediMapDomain,
      AREA_BY_ID,
      MAP_CLOUD_AREA_IDS
    };`,
    context,
    { filename: "application-exports.js" },
  );

  return context.__APPLICATION_EXPORTS__;
}

module.exports = { loadApplicationExports };
