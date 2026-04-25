const fs = require("fs");
const path = require("path");

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

const patchNextCli = () => {
  const nextCliPath = path.join(nodeModulesPath, "next", "dist", "bin", "next");

  if (!fs.existsSync(nextCliPath)) {
    return;
  }

  const raw = fs.readFileSync(nextCliPath, "utf8");
  const patched = raw.replace(/import\('(\.\.\/[^']+)'\)/g, "Promise.resolve(require('$1'))");

  if (patched !== raw) {
    fs.writeFileSync(nextCliPath, patched);
  }
};

const patchNextConfigLoader = () => {
  const configLoaderPath = path.join(nodeModulesPath, "next", "dist", "server", "config.js");

  if (!fs.existsSync(configLoaderPath)) {
    return;
  }

  const raw = fs.readFileSync(configLoaderPath, "utf8");
  const patched = raw.replace(
    "userConfigModule = await import((0, _url.pathToFileURL)(path).href);",
    "userConfigModule = require(path);"
  );

  if (patched !== raw) {
    fs.writeFileSync(configLoaderPath, patched);
  }
};

const patchNextBuildTrace = () => {
  const tracePath = path.join(nodeModulesPath, "next", "dist", "build", "collect-build-traces.js");

  if (!fs.existsSync(tracePath)) {
    return;
  }

  const raw = fs.readFileSync(tracePath, "utf8");
  const marker = "    debug('starting build traces');";
  const guard = "    if (process.cwd().includes('\\\\')) { return; }";

  if (!raw.includes(guard)) {
    fs.writeFileSync(tracePath, raw.replace(/    if \(process\.cwd\(\)\.includes\('\\\\\\\\'\)\) \{ return; \}\n/g, "").replace(marker, `${marker}\n${guard}`));
  }
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

    if (!entry.isDirectory()) {
      continue;
    }

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
};

patchPackagesIn(nodeModulesPath);
patchNextCli();
patchNextConfigLoader();
patchNextBuildTrace();
console.log("Patched dependency package exports for literal-backslash install path.");
