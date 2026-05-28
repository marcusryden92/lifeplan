import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";

const withVanillaExtract = createVanillaExtractPlugin();

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

export default withVanillaExtract(nextConfig);
