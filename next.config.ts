import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Evrak dosya yüklemeleri için
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;