@echo off
chcp 65001 >nul
title GencTek Terimler Sozlugu - Durdur
rem baslat.bat ile acilan sunucuyu kapatir: 3001 portunu dinleyen sureci (ve alt sureclerini) sonlandirir.
rem Port baslat.bat icindeki PORT degeriyle ayni olmalidir.
setlocal EnableDelayedExpansion
set PORT=3001
set FOUND=
set LAST=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  rem Ayni surec hem IPv4 hem IPv6 satirinda gorunur; bir kez islenir.
  if not "%%p"=="0" if not "%%p"=="!LAST!" (
    set FOUND=1
    set LAST=%%p
    echo Sunucu kapatiliyor ^(islem %%p^)...
    taskkill /F /T /PID %%p >nul 2>nul
  )
)
if not defined FOUND (
  echo %PORT% portunda calisan bir sunucu yok; zaten kapali.
) else (
  echo Sunucu kapatildi.
)
pause
