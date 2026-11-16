import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep these native/server-only packages out of the bundler so their
  // worker + native bindings resolve correctly at runtime (local & Vercel).
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas", "mammoth"],
};

export default nextConfig;
