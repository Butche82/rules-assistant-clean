/** @type {import('next').NextConfig} */
module.exports = {
  // Make sure pdf2json is present on the lambda, resolved via native Node require
  serverExternalPackages: ['pdf2json'],
  // Belt-and-braces include for anything the tracer misses
  outputFileTracingIncludes: {
    '/': ['node_modules/pdf2json/**'],
  },
};
