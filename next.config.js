/** @type {import('next').NextConfig} */
module.exports = {
  // Ensure this package is included in the serverless function
  serverExternalPackages: ['pdf2json'],
};
