param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

function Resolve-ProjectPath {
  param([string]$Path)

  $resolved = Resolve-Path -LiteralPath $Path -ErrorAction SilentlyContinue
  if (-not $resolved) {
    throw "Khong tim thay duong dan: $Path"
  }
  return $resolved.Path
}

function Ensure-Command {
  param(
    [string]$Name,
    [string]$InstallHint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Thieu $Name. $InstallHint"
  }
}

$FrontendRoot = $PSScriptRoot
$BackendRoot = Resolve-ProjectPath (Join-Path $FrontendRoot "..\db\GW_v1")
$DatabaseRoot = Join-Path $BackendRoot "database"
$ToolsRoot = Join-Path $FrontendRoot ".tools"
$AirBin = Join-Path $ToolsRoot "bin\air.exe"
$GoCache = Join-Path $ToolsRoot "go-build"
$GoModCache = Join-Path $ToolsRoot "gomod"

Ensure-Command "docker" "Hay mo Docker Desktop truoc."
Ensure-Command "go" "Hay cai Go truoc."
Ensure-Command "npm.cmd" "Hay cai Node.js/npm truoc."

if (-not (Test-Path -LiteralPath (Join-Path $BackendRoot ".env"))) {
  Copy-Item -LiteralPath (Join-Path $BackendRoot ".env.example") -Destination (Join-Path $BackendRoot ".env")
}

New-Item -ItemType Directory -Force -Path (Split-Path $AirBin), $GoCache, $GoModCache | Out-Null

if (-not (Test-Path -LiteralPath $AirBin)) {
  Write-Host "Dang cai Air local..."
  $env:GOBIN = Split-Path $AirBin
  $env:GOCACHE = $GoCache
  $env:GOMODCACHE = $GoModCache
  go install github.com/cosmtrek/air@v1.49.0
}

if (-not $SkipDocker) {
  Write-Host "Dang start Docker services cho backend..."
  Push-Location $DatabaseRoot
  try {
    docker compose --env-file ..\.env -f docker-compose.yml up -d
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $FrontendRoot "node_modules"))) {
  Write-Host "Dang cai frontend dependencies..."
  Push-Location $FrontendRoot
  try {
    npm.cmd install
  } finally {
    Pop-Location
  }
}

$gatewayCommand = @"
`$env:PATH = '$((Split-Path $AirBin).Replace("'", "''"));' + ';' + `$env:PATH
`$env:GOCACHE = '$($GoCache.Replace("'", "''"))'
`$env:GOMODCACHE = '$($GoModCache.Replace("'", "''"))'
Set-Location -LiteralPath '$($BackendRoot.Replace("'", "''"))'
& '$($AirBin.Replace("'", "''"))' -c .air.toml
"@

$logServiceCommand = @"
`$env:GOCACHE = '$($GoCache.Replace("'", "''"))'
`$env:GOMODCACHE = '$($GoModCache.Replace("'", "''"))'
Set-Location -LiteralPath '$($BackendRoot.Replace("'", "''"))'
go run -buildvcs=false .\cmd\log-service
"@

$frontendCommand = @"
Set-Location -LiteralPath '$($FrontendRoot.Replace("'", "''"))'
npm.cmd run dev
"@

Write-Host "Dang mo backend Gateway bang Air..."
Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $gatewayCommand)

Write-Host "Dang mo backend Log Service..."
Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $logServiceCommand)

Write-Host "Dang mo frontend Vite..."
Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand)

Write-Host ""
Write-Host "Xong. Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:8080"
Write-Host "Logs API: theo LOG_SERVICE_PORT trong backend .env"
Write-Host "Docker:   PostgreSQL/Redis/RabbitMQ/Elasticsearch/Kibana dang chay bang compose."
