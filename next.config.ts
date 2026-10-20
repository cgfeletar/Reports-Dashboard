import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Served at caitlynfeletar.com/dashboard through a Netlify proxy on the main site.
  basePath: "/dashboard",
  // Report files are read at build time; make sure they ship with the server bundle.
  outputFileTracingIncludes: { "/": ["./reports/**/*"] },
};

export default nextConfig;
