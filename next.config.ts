import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid picking a parent folder’s lockfile when multiple exist on the machine
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
