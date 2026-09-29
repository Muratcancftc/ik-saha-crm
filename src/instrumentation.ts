export function register() {
  // Tüm tarih/`new Date()` hesapları Türkiye saatiyle çalışsın (sunucu UTC kullanıyor)
  process.env.TZ = 'Europe/Istanbul'
}