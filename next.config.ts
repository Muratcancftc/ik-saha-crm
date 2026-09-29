import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Evrak + sunum (PDF/PPTX) dosya yüklemeleri için — uygulama limiti
      // üzerinde bırak, aşırı büyük dosyalar temiz doğrulama hatası alsın
      bodySizeLimit: "25mb",
    },
    // proxy üzerinden geçen istekler (server action dosya yükleme) için gövde limiti
    proxyClientMaxBodySize: "25mb",
  },
  async headers() {
    // Paylaşım sayfaları arama motorlarına kapalı; hiçbir ara katman önbelleğe almaz.
    return [
      {
        source: '/p/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        source: '/api/public/paylasim/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },
};

export default nextConfig;