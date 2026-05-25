/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      rrule: "rrule/dist/es5/rrule.js",
    };
    return config;
  },
};

export default nextConfig;
