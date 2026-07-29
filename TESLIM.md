# Daily Islamic Art (DIA) — Teslim / Deploy Runbook

> Bu dosya deploy içindir. Kod bilgisi gerektirmez.
> Amaç: env'leri doldur → altyapıyı ayağa kaldır → backend'i build+çalıştır → mobil app'i build'le → domain/CDN geçişini yap.
> Mimari "neden"ler bu dosyada YOK (geliştirici referansı ayrı). Burada sadece **ne yapılacak** var.

**Stack:** NestJS + Prisma + PostgreSQL + Redis (backend) · React Native + Expo (mobil, ana ürün) · Next.js (web, sadece admin paneli) · Cloudflare R2 + CDN (görsel).

**Monorepo (pnpm v11):** `apps/api` (backend) · `apps/web` (admin panel) · `apps/mobile` (mobil) · `packages/database` (Prisma).

---

## 0. Deploy sırası (özet)

1. `.env` dosyalarını doldur (Bölüm 1)
2. PostgreSQL + Redis ayağa kalksın (Bölüm 2)
3. Prisma migration + client generate (Bölüm 3)
4. Backend build + çalıştır (Bölüm 4) — **apps/api Dockerfile YAZILMADI, Bölüm 4'e dikkat**
5. Web admin panel build (Bölüm 5)
6. Mobil app build — EAS (Bölüm 6)
7. Domain + CDN geçişi (Bölüm 7)
8. Deploy sonrası kontrol listesi + bilinen notlar (Bölüm 8-9)

---

## 1. Ortam Değişkenleri (.env şablonları)

> Değerler bu dosyada YOK (secret sızmasın). Her `KEY=` satırını gerçek değerle doldur.
> **Secret üretimi:** JWT secret'ları uzun rastgele string olmalı (ör. `openssl rand -base64 48`). Access ve refresh secret'ları FARKLI olmalı.

### 1a. Backend — `apps/api/.env`

```dotenv
# --- JWT ---
JWT_ACCESS_SECRET=            # uzun rastgele string
JWT_REFRESH_SECRET=           # uzun rastgele string (access'ten FARKLI)
JWT_ACCESS_EXPIRES=15m        # sure formati: 15m, 1h vb. (saniye degil)
JWT_REFRESH_EXPIRES=7d        # ornek: 7d, 30d

# --- Redis ---
REDIS_HOST=                   # ornek: 127.0.0.1 (ayni sunucu) veya redis servis adi
REDIS_PORT=6379

# --- Cloudflare R2 (S3 uyumlu) ---
R2_ACCOUNT_ID=                # Cloudflare account ID
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=                # CDN domain, SONUNDA / YOK. Ornek: https://cdn.projedomaini.com

# --- Opsiyonel ---
PORT=3000                     # verilmezse 3000. Nginx reverse proxy bu porta baglanir
CORS_ORIGIN=                  # web admin panel domaini. Ornek: https://panel.projedomaini.com
                              # verilmezse dev default'una (http://localhost:3001) duser -> PROD'DA MUTLAKA DOLDUR
```

**R2 endpoint notu:** Ayrı `R2_ENDPOINT` değişkeni YOK. Backend endpoint'i `R2_ACCOUNT_ID`'den otomatik üretir (`https://<account_id>.r2.cloudflarestorage.com`). Yukarıdaki 5 R2 değişkeni yeterli.

**R2 fail-fast:** R2 credential'ları eksik/yanlışsa backend **hiç açılmaz** — başlangıçta net hata verir (`R2 credentials eksik — StorageService başlatılamadı`). "Sessizce çalışıyor ama görsel yok" durumu olmaz; backend açıldıysa R2 bağlantısı kurulmuştur.

**CORS_ORIGIN — önemli:** Şu an tek origin destekleniyor. Web panel birden fazla domain'den gelecekse (ör. `panel.x.com` + `www.panel.x.com`) kod tarafında `split(',')` desteği eklenmeli — geliştiriciye danışın. Tek domain ise sorun yok.

### 1b. Database — `packages/database/.env`

```dotenv
DATABASE_URL=                 # postgresql://KULLANICI:SIFRE@HOST:PORT/VERITABANI
                              # Yerel gelistirmede Postgres portu 5433, prod'da genelde 5432 -> DOGRULA
```

### 1c. Mobil — `apps/mobile/.env`

```dotenv
EXPO_PUBLIC_API_URL=          # backend'in PUBLIC adresi. Ornek: https://api.projedomaini.com
                              # verilmezse default http://10.0.2.2:3000 (emulator) -> PROD BUILD'DE MUTLAKA DOLDUR
```

**`EXPO_PUBLIC_` prefix ŞART** — Expo sadece bu prefix'li değişkenleri app'e gömer. Değiştikten sonra `npx expo start -c` (cache temizliği) gerekir.

**ÖNEMLİ — yerel `.env` vs EAS build:** Bu `.env` YALNIZCA yerel geliştirme (Metro / `expo start`) içindir. **EAS build'de `.env` kullanılmaz** (gitignore'da olduğu için buluta gitmez). Prod build'in API URL'i `apps/mobile/eas.json` içindeki profil `env` bloğundan gelir → Bölüm 6. Yani prod build için `.env` DEĞİL, `eas.json` doldurulur.

### 1d. Web admin panel — `apps/web/.env.local`

```dotenv
NEXT_PUBLIC_API_URL=          # backend public adresi. Ornek: https://api.projedomaini.com
```

---

## 2. Altyapı — PostgreSQL + Redis

Yerel geliştirmede `docker-compose` **sadece Postgres + Redis** çalıştırır (backend değil). Prod'da bu iki servis ayağa kalkmalı.

- **PostgreSQL:** Yerelde port **5433** (prod'da genelde 5432 — `DATABASE_URL` ile eşleşmeli).
- **Redis:** Port **6379**. Uygulama cache için kullanır (feed önbelleği). Redis düşerse app çöker mi? Hayır — cache miss olur, DB'den okur (yavaşlar ama çalışır). Yine de prod'da ayakta olmalı.

Mevcut `docker-compose.yml` bu iki servisi tanımlar. Prod'da aynı compose kullanılabilir veya managed servis (ör. managed Postgres/Redis) tercih edilebilir.

---

## 3. Prisma — Migration + Client Generate

Backend ilk kez ayağa kalkmadan önce (ve şema değiştiğinde) çalıştırılmalı:

```bash
# packages/database dizininde (veya --filter ile)
pnpm --filter @dia/database exec prisma migrate deploy   # prod: deploy (migrate dev DEGIL)
pnpm --filter @dia/database exec prisma generate          # client uretir
```

- **`migrate deploy`** kullan, `migrate dev` DEĞİL (dev şema değişikliği üretmeye çalışır, prod'da istenmez).
- Prisma client custom output'a generate olur (`packages/database/generated/client`). Backend build'i bu client'a bağımlı → **generate, backend build'inden ÖNCE** çalışmalı.

---

## 4. Backend — Build + Çalıştır (apps/api)

> **DİKKAT: `apps/api` için Dockerfile YAZILMADI.** Aşağıdaki gereksinimlere göre yazılmalı. Hazır komut yok — bu bilinçli, uydurma komut vermek yerine gereksinimler listelendi.

Backend'i container'a alırken şunlara dikkat:

1. **`sharp` native binary (KRİTİK).** Backend thumbnail üretiminde `sharp` kullanır. `sharp` platforma özel native binary içerir → **build platformu ile çalışma platformu aynı olmalı.** Alpine (musl libc) ile Debian/Ubuntu (glibc) binary'leri farklı. Alpine imaj kullanılırsa `sharp` için ekstra adım gerekebilir (`npm rebuild sharp` veya platform-spesifik kurulum). En güvenli: Debian-tabanlı Node imajı (`node:20-slim` gibi) kullanmak. **Bu adım atlanırsa backend açılır ama thumbnail üretimi/upload çöker.**

2. **`assets/` klasörü.** Font vb. asset'ler imaja kopyalanmalı — `dist` build'i asset'leri otomatik taşımaz. Dockerfile'da `COPY` ile dahil et.

3. **Prisma generated client.** `packages/database/generated/client` build sırasında mevcut olmalı (Bölüm 3). Monorepo yapısı gereği `packages/database` de imaja dahil edilmeli.

4. **pnpm monorepo.** Build, workspace kökünden yapılmalı (bağımlılıklar hoisted). `pnpm install` → `pnpm --filter @dia/api build` → `dist` çalıştır.

5. **Çalıştırma:** `node dist/main.js` (veya `pnpm --filter @dia/api start:prod`). Port `PORT` env'inden (default 3000).

6. **Nginx reverse proxy:** Nginx `https://api.domain.com` → `http://localhost:3000` (veya container portu) yönlendirir. API'de global prefix YOK → route'lar doğrudan (`/auth`, `/artworks`, `/artists`, `/health`).

7. **Health check:** `GET /health` endpoint'i mevcut — Nginx/orchestrator health probe için kullanılabilir.

---

## 5. Web Admin Panel — Build (apps/web)

Next.js standart build:

```bash
pnpm --filter @dia/web build
pnpm --filter @dia/web start   # veya bir Node process manager arkasinda
```

- `.env.local` → `NEXT_PUBLIC_API_URL` build zamanında gömülür → **değişirse rebuild gerekir.**
- Panel sadece internal kürasyon içindir (kullanıcıya dönük değil). Erişim kısıtlaması (IP allowlist / basic auth) deploy tarafında düşünülebilir — uygulama içi login var ama panel public internete açılacaksa ekstra katman önerilir.

---

## 6. Mobil App — EAS Build (apps/mobile)

```bash
# apps/mobile DIZININDEN calistir (kokten calistirinca proje slug'ini yanlis tahmin eder)
cd apps/mobile
eas build --platform android --profile production
```

- **`apps/mobile` dizininden** çalıştır (kökten değil).
- **API URL'in kaynağı `eas.json` — `.env` DEĞİL.** EAS build'de `.env` buluta gitmez (gitignore'da). Bu yüzden her build profili API URL'ini `eas.json` içindeki `env` bloğundan alır. Yerel `apps/mobile/.env` yalnızca yerel geliştirme/Metro içindir, build'e etki etmez.
- **`eas.json` içinde `EXPO_PUBLIC_API_URL` prod backend adresine set edilmeli.** Şu an `production` (ve onu extends eden `production-apk`) profilinde placeholder var: `https://REPLACE-WITH-PRODUCTION-API-DOMAIN`. **Build almadan önce bu placeholder gerçek API domain'iyle değiştirilmeli**, yoksa app çözülemeyen host'a bağlanır (feed boş gelir). Placeholder bilinçli seçildi — sessiz yanlış (eski IP) yerine gürültülü yanlış (build alan hemen fark eder).
- **Profiller:**
  - `production` → store build (AAB). Play Store'a bu gider.
  - `production-apk` → APK formatı (doğrudan APK dağıtımı gerekirse). `production`'ı extends eder, aynı env'i miras alır.
  - `local-apk` → SADECE geliştiricinin yerel cihaz testi için (yerel LAN IP'li). **Deploy'da KULLANILMAZ**, dokunulmasına gerek yok.
- **`usesCleartextTraffic` production'da KAPATILMALI** — Bölüm 8'e bak (KRİTİK güvenlik).
- **`android.package`** şu an geçici (`app.dia.mobile`) — Bölüm 8'e bak (Play'e yüklenince DEĞİŞMEZ).

---

## 7. Domain + CDN Geçişi

Görseller şu an geçici bir CDN domain'inde (geliştirme domain'i). Prod'da proje domain'ine geçilmeli.

1. **R2 custom domain** proje domain'ine bağlanır (Cloudflare R2 → Custom Domains).
2. **`apps/api/.env` → `R2_PUBLIC_URL`** yeni CDN domain'ine güncellenir (sonunda `/` yok). **Backend restart ŞART** (URL constructor'da okunur).
3. **DB'deki mevcut görsel URL'leri** eski domain'i işaret ediyor → migration script'i ile toplu güncellenir:

```bash
# packages/database scripts — eski URL'leri yeni CDN domain'ine cevirir (idempotent)
pnpm --filter @dia/database exec tsx scripts/migrate-image-urls.ts
```

> Script `startsWith` filtresiyle çalışır (idempotent, tekrar çalıştırmak zarar vermez). Eski/yeni domain'i script içinde/env'de doğrula.

4. **Eski domain düşerse tüm görseller ölür** — bu geçiş yapılmadan yayına çıkılmamalı.

---

## 8. KRİTİK Deploy-Öncesi Kontrol Listesi

Bunlar atlanırsa prod'da sorun çıkar:

- [ ] **`usesCleartextTraffic` KAPATILDI.** `apps/mobile/app.config.ts` → `expo-build-properties` içinde `usesCleartextTraffic: true` var (yerel HTTP test için eklendi). **Production'da kaldırılmalı** — yoksa app düz HTTP'ye izin verir (MITM riski). Prod API HTTPS olacağı için zaten gereksiz. Kaldırıp rebuild.
- [ ] **`CORS_ORIGIN` dolduruldu** (Bölüm 1a) — web panel domain'i. Boş kalırsa panel API'ye bağlanamaz.
- [ ] **`EXPO_PUBLIC_API_URL` prod adrese set** (Bölüm 1c) — yoksa app emülatör adresine (`10.0.2.2:3000`) bağlanmaya çalışır.
- [ ] **`android.package` kesinleşti.** Şu an `app.dia.mobile` GEÇİCİ. **Play Store'a ilk yüklemeden sonra DEĞİŞTİRİLEMEZ.** Yükleme öncesi nihai paket adı netleşmeli (Macellan'ın Play hesabı / marka kararı). Yayın Macellan hesabından yapılacak.
- [ ] **`sharp` binary** hedef platforma uygun (Bölüm 4.1) — yoksa thumbnail/upload çöker.
- [ ] **`R2_PUBLIC_URL` + `migrate-image-urls.ts`** prod CDN domain'ine geçirildi (Bölüm 7).
- [ ] **DATABASE_URL portu** prod ile eşleşiyor (yerelde 5433, prod'da genelde 5432).
- [ ] **iOS için `ios.bundleIdentifier`** eklenmeli (şu an `app.config.ts`'te `ios` bloğu yok). Sadece App Store hedefi için — Android yayınında gerekmez.

> **DOĞRULANAMADI — deploy sonrası test şart:** Production APK, gerçek cihazda + gerçek backend'e karşı **henüz uçtan uca test edilmedi.** Sebep: geliştirme sırasında backend yerel makinede çalışıyordu ve test ağı (kurumsal Wi-Fi) cihazlar-arası bağlantıyı engelledi; ayrıca backend henüz deploy edilmedi. Regresyon **emülatörde** yapıldı (feed/koleksiyon/beğeni/arama/paylaş/dark mode/widget — hepsi temiz). Backend deploy edildikten ve `eas.json`'daki API URL gerçek domain'e çevrildikten SONRA, gerçek cihazda production APK ile tam regresyon TEKRARLANMALI. Özellikle: feed yükleniyor mu (API bağlantısı), widget günün eserini çekiyor mu, wallpaper/indir gerçek cihazda çalışıyor mu (emülatörde media-library sınırlı).

---

## 9. Operasyonel Notlar (deploy sonrası çalışma)

### Redis cache — ne zaman FLUSHALL?

Redis feed önbelleğini tutar (5 dk TTL). Şu değişikliklerden sonra **manuel flush** gerekir, yoksa 5 dk'ya kadar eski veri görünür:

```bash
docker exec dia_redis redis-cli FLUSHALL   # container adi prod'da farkli olabilir
```

Gereken durumlar: bir eserin `isPublished` / `publishAt` / `thumbUrl` alanı elle değiştirildiğinde, veya toplu kürasyon script'i çalıştırıldığında. Normal kullanıcı akışında (beğeni, koleksiyon) flush GEREKMEZ.

### Yeni eser import'u sonrası thumbnail

Drive/Excel'den yeni eser import edildikten sonra thumbnail üretim script'i çalıştırılmalı (yeni eserlerin `thumbUrl`'ü boş gelir):

```bash
pnpm --filter @dia/database exec tsx scripts/backfill-thumbnails.ts
```

Idempotent — sadece `thumbUrl: null` olanları işler, mevcut thumbnail'lara dokunmaz. Import script'ine gömülü DEĞİL (ayrı sorumluluk).

### Günlük eser yayını — otomatik, müdahale gerektirmez

Eserler `publishAt` tarihine göre otomatik yayınlanır (cron YOK, sorgu anında `publishAt <= now()` değerlendirilir). Kuyruk ileri tarihe kadar dolu → **kimsenin elle bir şey yapması gerekmez.** Yeni eser kuyruğa alma geliştirici script'iyle yapılır (deploy sonrası panel butonu planlı, henüz yok).

### findDaily gün dönümü — UTC kayması (bilinen, kabul edilmiş)

"Günün eseri" sunucu-yerel güne göre hesaplanır. Sunucu UTC ise, Türkiye saatiyle **gece 00:00–03:00 arası** widget/feed hâlâ "dünün" eserini gösterebilir (TR, UTC+3). MVP'de kabul edilen davranış — kritik değil. Tam TR hizası gerekirse geliştiriciye danışın (TR-offset'li gün helper'ı gerekir).

### Widget güncelleme aralığı

Android home screen widget'ı ~30 dakikada bir günceller (Android minimum sınırı). Cihaz Doze modundaysa gecikebilir — tam saat garantisi yok. Bilinen davranış.

---

## 10. Bu Teslimin KAPSAM DIŞI Bıraktıkları (Faz 1.5 / deploy sonrası)

Bunlar bilinçli olarak teslime dahil edilmedi — sunucu bağımlılığı veya yeni geliştirme gerektirir:

- **Push notification** ("günün eseri geldi") — cron + 7/24 sunucu gerekir. Deploy sonrası.
- **Drive/Excel → panel otomatik senkron** — rclone'un sunucuya taşınması + OAuth gerekir.
- **Bildir/report sistemi** — yeni DB modeli + migration.
- **i18n içerik çevirisi** — arayüz TR/EN hazır; eser metinlerinin çevirisi ayrı iş.
- **Editör seçkisi** — feed ekseni kararı + migration.

---

## Hızlı Referans — Env Değişken Özeti

| Dosya | Değişken | Zorunlu? | Not |
|---|---|---|---|
| `apps/api/.env` | JWT_ACCESS_SECRET | Evet | rastgele string |
| `apps/api/.env` | JWT_REFRESH_SECRET | Evet | access'ten farklı |
| `apps/api/.env` | JWT_ACCESS_EXPIRES | Evet | ör. `15m` |
| `apps/api/.env` | JWT_REFRESH_EXPIRES | Evet | ör. `7d` |
| `apps/api/.env` | REDIS_HOST / REDIS_PORT | Evet | 6379 |
| `apps/api/.env` | R2_ACCOUNT_ID | Evet | endpoint bundan üretilir |
| `apps/api/.env` | R2_ACCESS_KEY_ID | Evet | |
| `apps/api/.env` | R2_SECRET_ACCESS_KEY | Evet | |
| `apps/api/.env` | R2_BUCKET_NAME | Evet | |
| `apps/api/.env` | R2_PUBLIC_URL | Evet | CDN, sonunda `/` yok |
| `apps/api/.env` | PORT | Hayır | default 3000 |
| `apps/api/.env` | CORS_ORIGIN | **Prod'da evet** | panel domaini |
| `packages/database/.env` | DATABASE_URL | Evet | port'a dikkat |
| `apps/mobile/.env` | EXPO_PUBLIC_API_URL | **Prod'da evet** | APK'ya gömülür |
| `apps/web/.env.local` | NEXT_PUBLIC_API_URL | Evet | build'e gömülür |
