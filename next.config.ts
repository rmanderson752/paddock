import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL ships native bindings for file: URLs — keep it out of the bundle
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
