; Installer di Lawyers-PDF.
;
; Installazione per il solo utente corrente: niente elevazione, niente scritture fuori dal
; profilo. L'associazione ai file PDF e' un'opzione dichiarata, non un effetto collaterale,
; e viene rimossa dalla disinstallazione.

#define Nome "Lawyers-PDF"
#define Versione "2.14.3"
#define Editore "Avv. Roberto Arcella"
#define Sito "https://github.com/robertoarcella-bot/Lawyers-PDF"
#define Eseguibile "Lawyers-PDF.exe"
#define Immagine "C:\SPDF-build\jp-pubblica\Lawyers-PDF"

[Setup]
AppId={{7B3F1C42-9E5A-4D18-96C7-2A0E5D4B8F31}
AppName={#Nome}
AppVersion={#Versione}
AppVerName={#Nome} {#Versione}
AppPublisher={#Editore}
AppPublisherURL={#Sito}
AppSupportURL={#Sito}/issues
AppUpdatesURL={#Sito}/releases
DefaultDirName={autopf}\{#Nome}
DefaultGroupName={#Nome}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=C:\SPDF-build\pacchetti
OutputBaseFilename=Lawyers-PDF-{#Versione}-windows-x64-setup
SetupIconFile=C:\SPDF-build\lawyers-pdf.ico
UninstallDisplayIcon={app}\{#Eseguibile}
UninstallDisplayName={#Nome} {#Versione}
WizardStyle=modern
; Il jar e' gia' compresso: la compressione forte costerebbe minuti per pochi megabyte.
Compression=lzma2/fast
SolidCompression=no
ChangesAssociations=yes
LicenseFile=C:\SPDF-build\portable-extras\LICENZA.txt
InfoAfterFile=C:\SPDF-build\portable-extras\LEGGIMI.txt

[Languages]
Name: "italiano"; MessagesFile: "compiler:Languages\Italian.isl"

[Tasks]
Name: "desktopicon"; Description: "Crea un collegamento sul desktop"; GroupDescription: "Collegamenti:"
Name: "associapdf"; Description: "Apri i file PDF con {#Nome} (i documenti mostreranno la sua icona)"; GroupDescription: "Tipi di file:"; Flags: unchecked

[Files]
; Gli script di associazione e collegamento servono alla versione portabile: qui li fa il programma di installazione.
Source: "{#Immagine}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; \
  Excludes: "Associa i PDF a Lawyers-PDF.cmd,Ripristina l'associazione dei PDF.cmd,Crea i collegamenti.cmd,app\collegamenti.ps1"

[Icons]
Name: "{group}\{#Nome}"; Filename: "{app}\{#Eseguibile}"
Name: "{group}\Leggimi"; Filename: "{app}\LEGGIMI.txt"
Name: "{autodesktop}\{#Nome}"; Filename: "{app}\{#Eseguibile}"; Tasks: desktopicon

[Registry]
; Il tipo di documento viene sempre scritto, anche senza spuntare l'associazione: se una copia
; precedente lo aveva registrato da una cartella poi rimossa, resterebbe a puntare nel vuoto e
; Windows mostrerebbe i PDF con l'icona bianca. Definirlo non lo rende predefinito: dice soltanto
; come il documento si aprirebbe, se scelto.
Root: HKCU; Subkey: "Software\Classes\LawyersPDF.Documento"; ValueType: string; ValueName: ""; ValueData: "Documento PDF"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\LawyersPDF.Documento"; ValueType: string; ValueName: "FriendlyTypeName"; ValueData: "Documento PDF"
Root: HKCU; Subkey: "Software\Classes\LawyersPDF.Documento\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\app\lawyers-pdf-doc.ico"
Root: HKCU; Subkey: "Software\Classes\LawyersPDF.Documento\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#Eseguibile}"" ""%1"""
; Questa invece e' la proposta vera e propria, e resta facoltativa.
Root: HKCU; Subkey: "Software\Classes\.pdf\OpenWithProgids"; ValueType: none; ValueName: "LawyersPDF.Documento"; Flags: uninsdeletevalue; Tasks: associapdf

; Voce "Apri con": utile anche a chi lascia predefinito un altro programma.
Root: HKCU; Subkey: "Software\Classes\Applications\{#Eseguibile}"; ValueType: string; ValueName: "FriendlyAppName"; ValueData: "{#Nome}"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\Applications\{#Eseguibile}\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#Eseguibile}"" ""%1"""
Root: HKCU; Subkey: "Software\Classes\Applications\{#Eseguibile}\SupportedTypes"; ValueType: string; ValueName: ".pdf"; ValueData: ""

; Capacita' dichiarate: sono queste a far comparire il programma in Impostazioni > App predefinite.
Root: HKCU; Subkey: "Software\{#Nome}\Capabilities"; ValueType: string; ValueName: "ApplicationName"; ValueData: "{#Nome}"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\{#Nome}\Capabilities"; ValueType: string; ValueName: "ApplicationDescription"; ValueData: "Strumenti PDF per lo studio legale, in locale."
Root: HKCU; Subkey: "Software\{#Nome}\Capabilities"; ValueType: string; ValueName: "ApplicationIcon"; ValueData: "{app}\{#Eseguibile},0"
Root: HKCU; Subkey: "Software\{#Nome}\Capabilities\FileAssociations"; ValueType: string; ValueName: ".pdf"; ValueData: "LawyersPDF.Documento"
Root: HKCU; Subkey: "Software\RegisteredApplications"; ValueType: string; ValueName: "{#Nome}"; ValueData: "Software\{#Nome}\Capabilities"; Flags: uninsdeletevalue

[Run]
Filename: "{app}\{#Eseguibile}"; Description: "Avvia {#Nome}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Il server resta in ascolto dopo la chiusura della finestra: va fermato prima di rimuovere i file.
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM {#Eseguibile}"; Flags: runhidden; RunOnceId: "FermaServer"
