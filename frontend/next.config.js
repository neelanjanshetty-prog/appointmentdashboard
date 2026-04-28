const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "fast-equals": path.join(__dirname, "node_modules", "fast-equals", "dist", "cjs", "index.cjs")
    };

    return config;
  }
};

module.exports = nextConfig;
