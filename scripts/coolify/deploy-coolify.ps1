<#
deploy-coolify.ps1
Template PowerShell script to automate Coolify operations (create project, databases, application services).

USAGE (secure):
# In PowerShell (recommended session):
# $env:COOLIFY_API_BASE = 'https://coolify.pickpoint.my.id/api'
# $env:COOLIFY_API_TOKEN = Read-Host -AsSecureString "Paste your Coolify token" | ConvertFrom-SecureString
# (or set plaintext for quick testing: $env:COOLIFY_API_TOKEN='1|...')
# .\scripts\coolify\deploy-coolify.ps1 -Mode Full

Notes:
- This is a template. Coolify API endpoints and payload shapes may vary by Coolify version.
- Before running, open the script and read the comments. Adjust endpoints if your Coolify instance exposes different routes.
- Keep your token secret. Do not commit it to Git.
#>

param(
    [ValidateSet('DBOnly','Full')]
    [string]$Mode = 'DBOnly',

    [string]$ProjectName = 'Pickpoint',
    [string]$DevDbName = 'pickpoint-dev-db',
    [string]$ProdDbName = 'pickpoint-prod-db',

    [string]$RepoUrl = 'https://github.com/shauridh/pickpointdash.git',
    [string]$RepoBranch = 'main',
    [string]$AppBaseDir = 'pickpoint'
)

function Get-EnvOrPrompt([string]$name, [switch]$secure) {
    if ($env:$name) {
        return $env:$name
    }
    if ($secure) {
        $s = Read-Host -AsSecureString "Enter value for $name (secure)"
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
    } else {
        return Read-Host "Enter value for $name"
    }
}

$base = Get-EnvOrPrompt -name 'COOLIFY_API_BASE'
$token = Get-EnvOrPrompt -name 'COOLIFY_API_TOKEN' -secure

if (-not $base) { Write-Error "COOLIFY_API_BASE not set. Aborting."; exit 1 }
if (-not $token) { Write-Error "COOLIFY_API_TOKEN not set. Aborting."; exit 1 }

# Normalize base (remove trailing /)
if ($base.EndsWith('/')) { $base = $base.TrimEnd('/') }

$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

Write-Host "Using Coolify API base: $base" -ForegroundColor Cyan

# Helper: simple GET wrapper
function ApiGet($path) {
    $url = "$base$path"
    try { Invoke-RestMethod -Uri $url -Headers $headers -Method Get }
    catch { Write-Warning "GET $url failed: $_"; return $null }
}

function ApiPost($path, $body) {
    $url = "$base$path"
    try { Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body ($body | ConvertTo-Json -Depth 10) }
    catch { Write-Warning "POST $url failed: $_"; return $null }
}

# 1) Ensure Project exists (list projects => create if missing)
Write-Host "Checking for existing project '$ProjectName'..."
# NOTE: endpoint path may differ. Commonly: /projects or /api/projects
$projects = ApiGet('/projects')
$project = $null
if ($projects) {
    $project = $projects | Where-Object { $_.name -eq $ProjectName }
}

if (-not $project) {
    Write-Host "Project not found — creating project '$ProjectName'..."
    $payload = @{ name = $ProjectName }
    $project = ApiPost('/projects', $payload)
    if (-not $project) { Write-Error "Failed to create project. Please check API endpoints and token."; exit 1 }
    Write-Host "Project created: $($project.id)" -ForegroundColor Green
} else {
    Write-Host "Found project: $($project.name) (id: $($project.id))" -ForegroundColor Green
}

# 2) Create Databases (Postgres) — DEV and PROD
function CreatePostgres($envLabel, $resourceName) {
    Write-Host "Creating Postgres resource for $envLabel: $resourceName"

    # Payload example — adjust fields to Coolify API schema
    $payload = @{
        name = $resourceName
        image = 'postgres:17-alpine'
        type = 'postgresql'
        # metadata / service specific config — adjust if Coolify API expects different keys
        username = $resourceName -replace '[-_]','_' + '_user'
        password = [System.Web.Security.Membership]::GeneratePassword(16,2)
        initialDatabase = $resourceName -replace '[-_]','_' + '_db'
        ssl = $true
    }

    # Endpoint likely: /resources or /databases — update if necessary
    $resp = ApiPost('/resources', $payload)
    if ($resp) { Write-Host "Created DB resource: $($resp.name)" -ForegroundColor Green; return $resp }
    else { Write-Warning "Creation returned nothing. Check API. Returning null."; return $null }
}

if ($Mode -in @('DBOnly','Full')) {
    Write-Host "Creating DEV DB resource (template)..."
    $devResp = CreatePostgres -envLabel 'dev' -resourceName $DevDbName

    Write-Host "Creating PROD DB resource (template)..."
    $prodResp = CreatePostgres -envLabel 'prod' -resourceName $ProdDbName
}

if ($Mode -eq 'Full') {
    Write-Host "Creating application services (DEV + PROD) — template steps"

    # Example payload to create application service. Adjust fields to match your Coolify API.
    $appPayloadDev = @{
        name = 'pickpoint-dev'
        projectId = $project.id
        source = @{ type='git'; url=$RepoUrl; branch=$RepoBranch }
        baseDir = $AppBaseDir
        build = @{ command='npm run build' }
        start = @{ command='npm run start'; port=3000 }
        env = @(
            @{ key='DATABASE_URL'; value = 'REPLACE_WITH_DEV_DB_URL' },
            @{ key='NEXTAUTH_URL'; value = 'https://dev-portal.pickpoint.my.id' },
            @{ key='NODE_ENV'; value = 'development' }
        )
    }
    $appDev = ApiPost('/services', $appPayloadDev)
    if ($appDev) { Write-Host "Created app service pickpoint-dev" -ForegroundColor Green }
    else { Write-Warning "Failed to create pickpoint-dev service (check endpoint)" }

    # Repeat for prod (modify env values)
    $appPayloadProd = $appPayloadDev.Clone()
    $appPayloadProd.name = 'pickpoint-prod'
    $appPayloadProd.env = @(
        @{ key='DATABASE_URL'; value = 'REPLACE_WITH_PROD_DB_URL' },
        @{ key='NEXTAUTH_URL'; value = 'https://portal.pickpoint.my.id' },
        @{ key='NODE_ENV'; value = 'production' }
    )
    $appProd = ApiPost('/services', $appPayloadProd)
    if ($appProd) { Write-Host "Created app service pickpoint-prod" -ForegroundColor Green }
    else { Write-Warning "Failed to create pickpoint-prod service (check endpoint)" }

    Write-Host "Note: The script uses placeholder payloads for services — adjust keys/structure to match your Coolify API version." -ForegroundColor Yellow
}

Write-Host "Done. Inspect created resources in Coolify UI and adjust env values for DATABASE_URL using internal Postgres URLs." -ForegroundColor Cyan
