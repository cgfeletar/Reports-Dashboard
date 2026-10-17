import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Report files are read at build time; make sure they ship with the server bundle.
  outputFileTracingIncludes: { "/": ["./reports/**/*"] },
};

export default nextConfig;
