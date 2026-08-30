@echo off
title Arresta Lawyers-PDF
echo Arresto di Lawyers-PDF in corso...
taskkill /F /IM Lawyers-PDF.exe >nul 2>&1
taskkill /F /IM java.exe >nul 2>&1
echo Fatto.
timeout /t 2 >nul
