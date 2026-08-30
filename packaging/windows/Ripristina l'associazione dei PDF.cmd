@echo off
title Rimuovi l'associazione dei PDF a Lawyers-PDF
setlocal

echo Rimozione della registrazione di Lawyers-PDF per i file PDF...
echo.

reg delete "HKCU\Software\Classes\LawyersPDF.Documento" /f >nul 2>&1
reg delete "HKCU\Software\Classes\.pdf\OpenWithProgids" /v "LawyersPDF.Documento" /f >nul 2>&1
reg delete "HKCU\Software\Classes\Applications\Lawyers-PDF.exe" /f >nul 2>&1
reg delete "HKCU\Software\Lawyers-PDF" /f >nul 2>&1
reg delete "HKCU\Software\RegisteredApplications" /v "Lawyers-PDF" /f >nul 2>&1

rem La scelta dell'utente vive in una chiave separata: finche' resta, Windows
rem continua a puntare a un tipo di documento che non esiste piu'.
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.pdf\UserChoice" /f >nul 2>&1

ie4uinit.exe -show >nul 2>&1

echo Rimozione completata.
echo.
echo Windows chiedera' con quale programma aprire i PDF al primo doppio clic,
echo oppure puoi indicarlo da Impostazioni ^> App ^> App predefinite.
echo.
choice /c SN /n /m "Apro ora le impostazioni delle app predefinite? [S/N] "
if errorlevel 2 goto fine
start "" "ms-settings:defaultapps"

:fine
echo.
pause
