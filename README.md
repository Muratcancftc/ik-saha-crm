# İK Saha — Saha İşgücü CRM + Ön Muhasebe

İnsan kaynakları ve saha işgücü (günlük işçi) firmaları için tam işlevsel CRM + ön muhasebe
otomasyonu. Next.js (App Router) + TypeScript + Prisma + PostgreSQL, JWT oturum ve rol bazlı
yetkilendirme (RBAC).

## Teknoloji

- **Next.js 16** (App Router, Server Actions, RSC) + TypeScript
- **Prisma 7** + PostgreSQL
- **jose** (JWT oturum), **bcryptjs** (şifre hash)
- **Tailwind CSS 4** (modern dashboard tasarımı)
- Para/tarih biçimleme: `Intl.NumberFormat('tr-TR', { currency: 'TRY' })`

## Roller (RBAC)

| Rol | Erişim |
| --- | --- |
| `patron` | Her şey |
| `operasyon` | İşçi havuzu, talepler & atama, puantaj, müşteri firmalar, belge/SGK |
| `muhasebe` | Hakediş, gelir-gider, fatura, vergi & resmi ödemeler, personel/bordro |
| `saha_sorumlusu` | Yalnızca kendi lokasyonunun puantajı |

Her sayfa, Server Action ve API route kendi rolünü doğrular (`src/lib/dal.ts` + `src/proxy.ts`).

## İş Kuralları

1. **Çakışma:** `Atama(işciId, tarih)` benzersiz — aynı işçi aynı güne iki atamaya yazılamaz (P2002 yakalanır, kullanıcı uyarılır).
2. **Belge:** `bitisTarihi <= bugün+30` uyarı listesine düşer; süresi dolmuş belgeli işçi atanamaz.
3. **Hakediş (otomatik):** atama `tamamlandı` + puantaj olunca hakediş üretilir: işçi net = gün×yevmiye − avans − kesinti; müşteriden = gün×FirmaFiyat (meslek bazlı); brüt marj = müşteriden − gün×yevmiye.
4. **Net kâr** (dashboard) = gelir − (saha işçi maliyeti + genel giderler + bordro + ödenen resmi ödeme); **brüt marj** ayrı gösterilir.
5. **Fatura:** kdvTutar = araToplam×0.20; genelToplam = araToplam + kdv. Alacak = ödenmemiş fatura toplamı. Fatura KDV'si vergi ekranına aktarılır.
6. **Vade takibi:** vadesi geçen faturalar kırmızı, 3 gün kala ödemeler amber rozetle gösterilir.
7. **SGK:** atama yapılınca `sgkBildirildi=false`; işten 1 gün önce bildirim hatırlatılır.
8. **Vergi/SGK:** sistem hesaplar ve hatırlatır; resmi beyanname mali müşavirde.
9. **KVKK:** TC ve IBAN AES-256-GCM şifreli saklanır, arayüzde maskeli gösterilir.

## Kurulum

```bash
# 1. Bağımlılıklar
npm install

# 2. Ortam değişkenleri (.env) — .env.example kopyalayın
cp .env.example .env
# ENCRYPTION_KEY için:  openssl rand -hex 32
# SESSION_SECRET için: openssl rand -base64 32

# 3. Veritabanı (PostgreSQL gerekir)
npx prisma migrate dev   # migration uygula
npm run db:seed          # demo verisi (22 işçi, 4 firma, talepler, faturalar…)

# 4. Çalıştır
npm run dev              # http://localhost:3000
```

## Demo Giriş (şifre: `123123`)

- `admin@ikcrm.com` — tek admin hesabı (tüm yetkiler)

## Komutlar

```bash
npm run dev        # geliştirme
npm run build      # production build
npm run start      # production sunucu
npm run db:migrate # prisma migrate dev
npm run db:seed    # seed
npm run db:reset   # DB sıfırla + seed (veri silinir!)
npm run db:studio  # Prisma Studio
npm run lint       # eslint
```

## Ekranlar

`/` Kontrol Paneli (KPI + operasyon özeti + bugünkü atama + uyarılar) ·
`/isci-havuzu` (filtre + arama + CRUD + işçi detay kartı: belge/müsaitlik/no-show/avans/geçmiş) ·
`/talepler` (talep→atama, çakışma + belge kontrolü, uygunluk %'li öneri, çıkar/yerine bul,
canlı puantaj, şablon & tekrarlayan talep, SMS/WhatsApp bildirim iskeleti) ·
`/puantaj` (lokasyon kapsamlı) · `/hakedis` (otomatik + Excel/PDF icmal) ·
`/gelir-gider` (kârlılık + nakit akışı) · `/faturalar` (KDV otomatik + tahsilat) ·
`/vergi-odemeler` (KDV/SGK/muhtasar/maaş/geçici vergi) · `/musteri-firmalar` (fiyat anlaşması,
alacak, satış hattı) · `/personel` (iç kadro, bordro, IBAN) · `/belge-sgk` (geçerlilik + giriş bildirimi)

## Notlar

- `DATABASE_URL` varsayılanı `postgresql://postgres:postgres@localhost:5432/ik_crm` (yerel docker).
- `.env` commit edilmez; gizli anahtarlar repoda yoktur.
- Bu proje **dev verisi** ile çalışır: `db:reset` tüm veriyi siler ve yeniden seed eder.