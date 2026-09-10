import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets local checks use an isolated cache when the default output directory is unavailable.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Allow headless/runtime test clients (127.0.0.1) to reach the dev HMR socket.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
