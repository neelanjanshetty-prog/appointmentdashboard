const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const nodeModulesPath = path.join(__dirname, "..", "node_modules");

if (!process.cwd().includes("\\")) {
  process.exit(0);
}

const patchPackageJson = (packageJsonPath) => {
  const raw = fs.readFileSync(packageJsonPath, "utf8");
  const pkg = JSON.parse(raw);

  if (!Object.prototype.hasOwnProperty.call(pkg, "exports")) {
    return;
  }

  delete pkg.exports;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
};

const patchPackagesIn = (dir) => {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".bin")) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith("@")) {
        patchPackagesIn(entryPath);
        continue;
      }

      const packageJsonPath = path.join(entryPath, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        patchPackageJson(packageJsonPath);
      }

      patchPackagesIn(path.join(entryPath, "node_modules"));
    }
  }
};

patchPackagesIn(nodeModulesPath);
logger.info("Patched dependency package exports for literal-backslash install path");
