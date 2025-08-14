/** @type {import('next').NextConfig} */
const nextConfig = {
  // Opt this package out of bundling and load it via Node at runtime
  serverExternalPackages: ['pdf2json'],

  // (optional safety net) if tracing ever misses it, still include it
  // This broad include is fine for small packages like pdf2json
  outputFileTracingIncludes: {
    '/': ['node_modules/pdf2json/**'],
  },
};
module.exports = nextConfig;
