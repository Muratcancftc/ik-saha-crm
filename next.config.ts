import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Evrak dosya yüklemeleri için — 10MB uygulama limitinin üzerinde bırak,
      // böylece aşırı büyük dosyalar framework 500 yerine temiz doğrulama hatası alır
      bodySizeLimit: "15mb",
    },
    // proxy üzerinden geçen istekler (server action dosya yükleme) için gövde limiti
    proxyClientMaxBodySize: "15mb",
  },
};

export default nextConfig;