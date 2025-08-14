/** @type {import('next').NextConfig} */
const nextConfig = {
  // Make sure the package is present on the server at runtime (but not bundled)
  serverExternalPackages: ['pdf2json'],
  outputFileTracingIncludes: {
    '/': ['node_modules/pdf2json/**'],
  },
};
module.exports = nextConfig;
