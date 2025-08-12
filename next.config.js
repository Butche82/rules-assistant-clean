/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Don’t try to bundle node-canvas (not needed for text extraction)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
      'canvas-prebuilt': false,
      'pdfjs-dist/build/pdf.worker.js': false,
      'pdfjs-dist/legacy/build/pdf.worker.js': false,
    };
    return config;
  },
};
module.exports = nextConfig;
