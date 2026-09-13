# Website Entegrasyonu — API Dokümantasyonu

Bu doküman, **ATALAY İK CRM** ile public website (`atalayik.com.tr`) arasındaki
entegrasyonu anlatır. Website sunucusu, aşağıdaki endpoint'lere **server-to-server**
olarak bağlanır; CRM secret'ı asla frontend'e/website kaynak koduna yazılmaz.

Base URL (production): `https://crm.atalayik.com.tr`
Base URL (development): `http://localhost:3000`

---

## Kimlik Doğrulama (Auth)

Tüm **POST** endpoint'leri aşağıdaki header ile korunur:

```
Authorization: Bearer <WEBSITE_INTEGRATION_SECRET>
```

- Secret, `.env` → `WEBSITE_INTEGRATION_SECRET` içinde tanımlanır.
- Yanlış/eksik secret → `401 { "success": false, "error": "unauthorized" }`.
- Secret `NEXT_PUBLIC_` olmamalı, kaynak koda ve loglara yazılmamalıdır.

Content-Type: `application/json` (CV'siz) veya `multipart/form-data` (CV'li).

---

## 1. İşveren Personel Talebi

### `POST /api/integrations/website/employer-lead`

Bir işverenin personel talebini CRM'e alır:
- Firma kaydı bulunur veya oluşturulur (`MusteriFirma`).
- Yetkili/contact bulunur veya oluşturulur (`Yetkili`).
- Personel talebi (Talep) açılır, firma + yetkili bağlanır.
- Kaynak **Website** / **Website (test)** olarak işaretlenir.

**Request body (JSON):**

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `companyName` | ✅ | Firma adı |
| `contactName` | ✅ | İlgili kişi |
| `phone` | ✅ | Telefon |
| `email` | | E-posta |
| `position` | ✅ | Talep edilen pozisyon |
| `personnelCount` | | Talep edilen kişi sayısı (varsayılan 1) |
| `description` | | Açıklama |
| `source` | | Kaynak (gönderilmezse `WEBSITE_INTEGRATION_MODE`'a göre `website`/`website_test`) |
| `landingPage`, `referrer` | | Attribution |
| `utmSource` … `utmTerm` | | Attribution (UTM) |

**İdempotency:** Header `X-Idempotency-Key: <benzersiz>` eklenirse aynı key ile
tekrar eden istek duplicate oluşturmaz; mevcut talep döner.

**Başarılı yanıt (201):**
```json
{
  "success": true,
  "requestId": 123,
  "companyId": 5,
  "duplicate": false
}
```

---

## 2. Aday Başvurusu

### `POST /api/integrations/website/candidate`

Bir aday başvurusunu CRM'e alır. Aynı telefon/email ile daha önce başvuru varsa
yeni aday oluşturmaz; mevcut kayda yeni başvuru/CV/ilan bilgisini ekler.

**Request (JSON veya multipart):**

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `fullName` **veya** `firstName`+`lastName` | ✅ | Ad Soyad |
| `phone` | ✅ | Telefon |
| `email` | | E-posta |
| `city`, `district` | | Şehir / ilçe |
| `position` | | Başvurulan pozisyon |
| `experience` | | Tecrübe |
| `message` | | Mesaj |
| `kvkkAccepted` | ✅ | `true` olmalı (KVKK onayı) |
| `kvkkAcceptedAt` | | Onay zamanı (ISO) |
| `jobId` / `jobSlug` | | İş ilanı ilişkisi (opsiyonel) |
| `cv` | | Dosya alanı — sadece multipart (PDF/DOC/DOCX, ≤5MB) |
| `source` | | Kaynak (opsiyonel) |

**CV yükleme:** `multipart/form-data` ile `cv` dosya alanı. Desteklenen: `pdf`, `doc`, `docx` (≤5MB). Başka tip/boyut → `422`.

**Başarılı yanıt (201):**
```json
{
  "success": true,
  "candidateId": 42,
  "jobId": 7,
  "cvUploaded": true,
  "duplicate": false
}
```

---

## 3. İş İlanları (Public)

Website, ilanları bu **public read-only** API'den çeker. **Auth gerekmez.**

### `GET /api/public/jobs`

Yalnızca **yayınlanmış** ve **süresi geçmemiş** ilanları döner.

**Yanıt:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": 7,
      "slug": "cnc-operatoru-gebze",
      "title": "CNC Operatörü",
      "location": "Gebze, Kocaeli",
      "employmentType": "tam_zamanli",
      "description": "...",
      "requirements": ["...", "..."],
      "publishedAt": "2026-09-13T10:00:00.000Z",
      "validThrough": "2026-10-13T00:00:00.000Z"
    }
  ]
}
```

> Private CRM alanları (iç notlar, ücret, marj vb.) asla dönmez.

### `GET /api/public/jobs/:slug`

Tek ilan detayı. Yayınlanmamış/kayıp ilan → `404`.

---

## Hata Yanıtları

| Durum | Gövde |
|---|---|
| 401 | `{ "success": false, "error": "unauthorized" }` |
| 422 | `{ "success": false, "error": "validation", "message": "..." }` |
| 429 | `{ "success": false, "error": "rate_limited" }` |
| 400 | `{ "success": false, "error": "invalid_json" }` |
| 404 | `{ "success": false, "error": "not_found" }` |

---

## Örnek curl

```bash
# İşveren talebi
curl -X POST https://crm.atalayik.com.tr/api/integrations/website/employer-lead \
  -H "Authorization: Bearer $WEBSITE_INTEGRATION_SECRET" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: req-abc-123" \
  -d '{
    "companyName": "ABC Metal San.",
    "contactName": "Mehmet Demir",
    "phone": "+90 532 111 22 33",
    "email": "mehmet@abcmetal.com",
    "position": "CNC Operatörü",
    "personnelCount": 5,
    "utmSource": "google"
  }'

# Aday başvurusu (CV'li, multipart)
curl -X POST https://crm.atalayik.com.tr/api/integrations/website/candidate \
  -H "Authorization: Bearer $WEBSITE_INTEGRATION_SECRET" \
  -F "fullName=Ahmet Yılmaz" \
  -F "phone=+90 533 000 00 00" \
  -F "email=ahmet@example.com" \
  -F "position=Depo İşçisi" \
  -F "kvkkAccepted=true" \
  -F "jobSlug=depo-iscisi-gebze" \
  -F "cv=@/path/to/cv.pdf"

# İlanlar
curl https://crm.atalayik.com.tr/api/public/jobs
curl https://crm.atalayik.com.tr/api/public/jobs/cnc-operatoru-gebze
```

---

## Notlar

- **CORS:** Yalnızca `WEBSITE_ALLOWED_ORIGINS` içindeki origin'lere izin verilir.
- **Rate limit:** POST endpoint'leri IP başına dakikada ~20 istekle sınırlıdır
  (gerçek kullanıcıyı engellemez, spam'i azaltır).
- **Kaynak etiketi:** `WEBSITE_INTEGRATION_MODE=test` → `website_test`,
  `production` → `website`. Talep/aday listelerinde "Website" rozeti görünür.