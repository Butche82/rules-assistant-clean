/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Stop pdfjs from trying to load a real worker or canvas
      canvas: false,
      "canvas-prebuilt": false,
      "pdfjs-dist/build/pdf.worker.js": require.resolve("./lib/pdf.worker.stub.js"),
      "pdfjs-dist/legacy/build/pdf.worker.js": require.resolve("./lib/pdf.worker.stub.js"),
    };
    return config;
  },
};
module.exports = nextConfig;
