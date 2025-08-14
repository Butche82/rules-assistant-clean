/** @type {import('next').NextConfig} */
module.exports = {
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  outputFileTracingIncludes: {
    '/': ['node_modules/pdf-parse/**', 'node_modules/pdfjs-dist/**']
  }
};
