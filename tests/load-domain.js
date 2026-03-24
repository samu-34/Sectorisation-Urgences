const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadDomainExports() {
  const dataPath = path.join(__dirname, "..", "data.js");
  const streetIndexPath = path.join(__dirname, "..", "generated", "montpellier_street_index.js");
  const domainPath = path.join(__dirname, "..", "domain.js");
  const dataSource = fs.readFileSync(dataPath, "utf8");
  const streetIndexSource = fs.existsSync(streetIndexPath)
    ? fs.readFileSync(streetIndexPath, "utf8")
    : "";
  const domainSource = fs.readFileSync(domainPath, "utf8");
  const context = vm.createContext({ console, globalThis: null });
  context.globalThis = context;

  vm.runInContext(dataSource, context, { filename: dataPath });
  if (streetIndexSource) {
    vm.runInContext(streetIndexSource, context, { filename: streetIndexPath });
  }
  vm.runInContext(domainSource, context, { filename: domainPath });
  vm.runInContext(
    `globalThis.__DOMAIN_EXPORTS__ = {
      MediMapDomain,
      CITY_AREAS,
      MTP_SUBAREAS
    };`,
    context,
    { filename: "domain-exports.js" },
  );

  return context.__DOMAIN_EXPORTS__;
}

module.exports = { loadDomainExports };
