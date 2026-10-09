$ErrorActionPreference = 'Stop'
# Obtain each user's own official copy; the FFL restricts repository redistribution.
$projectRoot = Split-Path -Parent $PSScriptRoot
$downloadDirectory = Join-Path $projectRoot '.local/satoshi-download'
New-Item -ItemType Directory -Force -Path $downloadDirectory | Out-Null
$archivePath = Join-Path $downloadDirectory 'satoshi.zip'
Invoke-WebRequest -Uri 'https://api.fontshare.com/v2/fonts/download/satoshi' -OutFile $archivePath
Expand-Archive -LiteralPath $archivePath -DestinationPath $downloadDirectory -Force
$fontDirectory = Join-Path $projectRoot 'public/fonts'
New-Item -ItemType Directory -Force -Path $fontDirectory | Out-Null
foreach ($weight in @('Regular', 'Medium', 'Bold')) {
  Copy-Item -LiteralPath (Join-Path $downloadDirectory "Satoshi_Complete/Fonts/WEB/fonts/Satoshi-$weight.woff2") -Destination $fontDirectory
}
Write-Output 'Installed official Satoshi 400/500/700 webfonts locally. License: .local/satoshi-download/Satoshi_Complete/License/FFL.txt'
