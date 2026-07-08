# import-all.ps1 — Drive'dan DIA'ya tek komutluk import zinciri
# Kullanım: proje kökünde  .\import-all.ps1
# Ne yapar: Sheet indir → görselleri sync et → metadata DB'ye → görseller R2'ye
# Hepsi idempotent: istediğin kadar çalıştır, sadece yeni/değişen veri işlenir.

$ErrorActionPreference = "Stop"  # herhangi bir adım patlarsa dur, sonrakine geçme

# --- Sabitler ---
$ProjectRoot   = "C:\Users\Berat Tansu Cabuk\Desktop\dia"
$CacheDir      = Join-Path $ProjectRoot ".import-cache"
$ImagesDir     = Join-Path $CacheDir "images"
$SheetName     = "daily islamic art.xlsx"
$SheetPath     = Join-Path $CacheDir $SheetName
$ImagesFolderId = "1X9x4mLsjuuK56xXErrWbKAnBSy_Hz46w"
$Rclone = "C:\Users\Berat Tansu Cabuk\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.74.3-windows-amd64\rclone.exe"

Write-Host "`n=== DIA Import başlıyor ===`n" -ForegroundColor Cyan

# --- Adım 1: Sheet'i indir (xlsx) ---
Write-Host "[1/4] Sheet indiriliyor..." -ForegroundColor Yellow
& $Rclone copy gdrive: $CacheDir --drive-shared-with-me --include $SheetName --drive-export-formats xlsx -v

# --- Adım 2: Görselleri sync et ---
Write-Host "`n[2/4] Görseller sync ediliyor (sadece yeni/değişen)..." -ForegroundColor Yellow
& $Rclone sync gdrive: $ImagesDir --drive-root-folder-id $ImagesFolderId --transfers 8 --progress

# --- Adım 3: Metadata → DB (tsx, packages/database) ---
Write-Host "`n[3/4] Metadata DB'ye yazılıyor..." -ForegroundColor Yellow
Push-Location (Join-Path $ProjectRoot "packages\database")
pnpm tsx scripts/import-metadata.ts $SheetPath
Pop-Location

# --- Adım 4: Görseller → R2 (ts-node, apps/api) ---
Write-Host "`n[4/4] Görseller R2'ye yükleniyor..." -ForegroundColor Yellow
Push-Location (Join-Path $ProjectRoot "apps\api")
pnpm ts-node scripts/import-images.ts $ImagesDir
Pop-Location

Write-Host "`n=== Import tamamlandı ===" -ForegroundColor Green