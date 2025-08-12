/** @type {import('next').NextConfig} */
module.exports = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // keep pdf2json out of the bundle
      const externals = config.externals || [];
      config.externals = [
        (...args) => {
          const callback = args[2];
          const req = args[1];
          if (typeof req === "string" && req === "pdf2json") {
            return callback(null, "commonjs pdf2json");
          }
          return externals[0] ? externals[0](...args) : callback();
        },
      ];
    }
    return config;
  },
};
