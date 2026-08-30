@echo off
title Associa i PDF a Lawyers-PDF
setlocal
set "CARTELLA=%~dp0"
set "CARTELLA=%CARTELLA:~0,-1%"
set "ESEGUIBILE=%CARTELLA%\Lawyers-PDF.exe"
set "ICONA=%CARTELLA%\app\lawyers-pdf-doc.ico"

if not exist "%ESEGUIBILE%" (
  echo Lawyers-PDF.exe non e' accanto a questo file: esegui lo script
  echo dalla cartella di Lawyers-PDF.
  echo.
  pause
  exit /b 1
)

echo Registrazione di Lawyers-PDF come applicazione per i file PDF...
echo Cartella: %CARTELLA%
echo.

rem Tipo di documento: da qui Windows prende l'icona dei file .pdf e il comando di apertura.
reg add "HKCU\Software\Classes\LawyersPDF.Documento" /ve /d "Documento PDF" /f >nul
reg add "HKCU\Software\Classes\LawyersPDF.Documento" /v FriendlyTypeName /d "Documento PDF" /f >nul
reg add "HKCU\Software\Classes\LawyersPDF.Documento\DefaultIcon" /ve /d "\"%ICONA%\"" /f >nul
reg add "HKCU\Software\Classes\LawyersPDF.Documento\shell\open\command" /ve /d "\"%ESEGUIBILE%\" \"%%1\"" /f >nul

rem Voce "Apri con": disponibile anche lasciando predefinito un altro programma.
reg add "HKCU\Software\Classes\.pdf\OpenWithProgids" /v "LawyersPDF.Documento" /t REG_NONE /d "" /f >nul
reg add "HKCU\Software\Classes\Applications\Lawyers-PDF.exe" /v FriendlyAppName /d "Lawyers-PDF" /f >nul
reg add "HKCU\Software\Classes\Applications\Lawyers-PDF.exe\shell\open\command" /ve /d "\"%ESEGUIBILE%\" \"%%1\"" /f >nul
reg add "HKCU\Software\Classes\Applications\Lawyers-PDF.exe\SupportedTypes" /v ".pdf" /t REG_SZ /d "" /f >nul

rem Capacita' dichiarate: sono queste a far comparire Lawyers-PDF in Impostazioni > App predefinite.
reg add "HKCU\Software\Lawyers-PDF\Capabilities" /v ApplicationName /d "Lawyers-PDF" /f >nul
reg add "HKCU\Software\Lawyers-PDF\Capabilities" /v ApplicationDescription /d "Strumenti PDF per lo studio legale, in locale." /f >nul
reg add "HKCU\Software\Lawyers-PDF\Capabilities" /v ApplicationIcon /d "\"%ESEGUIBILE%\",0" /f >nul
reg add "HKCU\Software\Lawyers-PDF\Capabilities\FileAssociations" /v ".pdf" /t REG_SZ /d "LawyersPDF.Documento" /f >nul
reg add "HKCU\Software\RegisteredApplications" /v "Lawyers-PDF" /t REG_SZ /d "Software\Lawyers-PDF\Capabilities" /f >nul

rem Svuota la cache delle icone, altrimenti Windows continua a mostrare quelle vecchie.
ie4uinit.exe -show >nul 2>&1

echo Registrazione completata.
echo.
echo Ultimo passaggio, da fare a mano: Windows non consente a un programma
echo di nominarsi predefinito da solo.
echo.
echo   Impostazioni ^> App ^> App predefinite ^> Lawyers-PDF ^> .pdf
echo.
echo   oppure: tasto destro su un PDF ^> Apri con ^> Scegli un'altra app
echo           ^> Lawyers-PDF ^> "Usa sempre questa app"
echo.
echo Fatto questo, tutti i file .pdf mostreranno l'icona di Lawyers-PDF
echo e il doppio clic aprira' il documento nel banco di lavoro.
echo.
choice /c SN /n /m "Apro ora le impostazioni delle app predefinite? [S/N] "
if errorlevel 2 goto fine
start "" "ms-settings:defaultapps?registeredAppUser=Lawyers-PDF"

:fine
echo.
pause
