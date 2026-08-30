@echo off
title Crea i collegamenti a Lawyers-PDF
setlocal
set "CARTELLA=%~dp0"
set "CARTELLA=%CARTELLA:~0,-1%"

if not exist "%CARTELLA%\Lawyers-PDF.exe" (
  echo Lawyers-PDF.exe non e' accanto a questo file: esegui lo script
  echo dalla cartella di Lawyers-PDF.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%CARTELLA%\app\collegamenti.ps1" -Cartella "%CARTELLA%"
echo.
pause
