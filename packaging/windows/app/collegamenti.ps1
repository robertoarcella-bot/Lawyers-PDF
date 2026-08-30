# Creates the Desktop and Start-menu shortcuts a portable folder does not get on its own.
param([Parameter(Mandatory = $true)][string]$Cartella)

$eseguibile = Join-Path $Cartella "Lawyers-PDF.exe"
$shell = New-Object -ComObject WScript.Shell

function Nuovo-Collegamento([string]$percorso) {
    $collegamento = $shell.CreateShortcut($percorso)
    $collegamento.TargetPath = $eseguibile
    $collegamento.WorkingDirectory = $Cartella
    $collegamento.IconLocation = "$eseguibile,0"
    $collegamento.Description = "Lawyers-PDF - strumenti PDF per lo studio legale"
    $collegamento.Save()
    Write-Output "creato: $percorso"
}

Nuovo-Collegamento (Join-Path ([Environment]::GetFolderPath("Desktop")) "Lawyers-PDF.lnk")

$menu = Join-Path ([Environment]::GetFolderPath("ApplicationData")) "Microsoft\Windows\Start Menu\Programs"
Nuovo-Collegamento (Join-Path $menu "Lawyers-PDF.lnk")

Write-Output ""
Write-Output "Da ora Lawyers-PDF si trova sul desktop e nel menu Start."
