@echo off
chcp 65001 >nul
title GencTek Terimler Sozlugu - Sunucu
cd /d "%~dp0"
rem Teknofest (Kelimeden Hayale) 3000'de calisir; ikisi ayni anda acik kalabilsin diye bu proje 3001 kullanir.
set PORT=3001

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. https://nodejs.org adresinden Node.js 22 veya ustunu kurun.
  pause
  exit /b 1
)

netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
  echo [HATA] %PORT% portu baska bir program tarafindan kullaniliyor.
  echo Sozluk zaten acik olabilir: http://localhost:%PORT%
  echo Degilse o programi kapatin ya da bu dosyadaki PORT degerini degistirin.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Paketler kuruluyor, bu ilk seferde birkac dakika surebilir...
  rem better-sqlite3 hazir derlenmis dosyasiyla gelir; kurulum betikleri Visual Studio olmayan bilgisayarda takilmasin diye atlanir.
  call npm ci --ignore-scripts
  if errorlevel 1 goto hata
)

if not exist ".env.local" (
  echo [UYARI] .env.local bulunamadi. Gorevli paneli icin ADMIN_USER ve ADMIN_PASSWORD tanimlayin.
  copy /y ".env.example" ".env.local" >nul
)

echo Uygulama derleniyor...
call npm run build
if errorlevel 1 goto hata

echo.
echo Sunucu baslatiliyor: http://localhost:%PORT%
echo Gorevli paneli:      http://localhost:%PORT%/admin
echo Kapatmak icin bu pencereyi kapatin ya da Ctrl+C basin.
echo.
start "" cmd /c "timeout /t 4 >nul & start http://localhost:%PORT%"
call npx next start -p %PORT%
goto son

:hata
echo.
echo [HATA] Islem basarisiz oldu. Yukaridaki mesajlari kontrol edin.
:son
pause
