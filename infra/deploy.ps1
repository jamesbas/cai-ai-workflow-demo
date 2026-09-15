<#
.SYNOPSIS
  Deploys the CAI Demo 2 application to Azure Container Apps.

.DESCRIPTION
  Idempotent. Builds the container image in Azure Container Registry (no local
  Docker required), deploys it to Container Apps with a system-assigned managed
  identity, and grants that identity access to the Microsoft Foundry project.
  No API keys are created, stored, or configured anywhere in this script.

.EXAMPLE
  ./infra/deploy.ps1 -AcrName acrcaidemo2jb01
#>
[CmdletBinding()]
param(
  [string]$SubscriptionId = $env:AZURE_SUBSCRIPTION_ID,
  [string]$ResourceGroup  = "rgCAI",
  [string]$Location       = "",
  [string]$AcrName        = "",
  [string]$EnvironmentName = "cae-cai-demo2",
  [string]$AppName        = "ca-cai-demo2",
  [string]$ImageRepo      = "cai-demo2",
  [string]$FoundryProjectEndpoint = "",
  [string]$FoundryModel   = "",
  [string]$FoundryVisionModel = "",
  [string]$FoundryAccountName = "",
  [string[]]$FoundryRoles = @("Foundry User", "Cognitive Services OpenAI User")
)

# az writes progress to stderr, which PowerShell would otherwise treat as fatal.
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# The ACR build log stream contains non-cp1252 characters; without this the
# Azure CLI crashes while printing them on a Windows console.
$env:PYTHONIOENCODING = "utf-8"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

function Step($message) { Write-Host "`n==> $message" -ForegroundColor Cyan }

# Arguments are passed as a single array so PowerShell never tries to bind
# az switches such as -o to its own common parameters.
function Invoke-Az([string[]]$Arguments) {
  $output = & az @Arguments 2>&1
  return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = $output }
}

function Get-AzJson([string[]]$Arguments) {
  $result = Invoke-Az $Arguments
  if ($result.ExitCode -ne 0) { return $null }
  $text = ($result.Output | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
  if ([string]::IsNullOrWhiteSpace($text)) { return $null }
  try { return $text | ConvertFrom-Json } catch { return $null }
}

function Assert-Az([string]$What, [string[]]$Arguments) {
  $result = Invoke-Az $Arguments
  if ($result.ExitCode -ne 0) {
    $result.Output | ForEach-Object { Write-Host $_ }
    throw "Failed: $What"
  }
}

# Settings resolve in order: explicit parameter, .env.local, process environment.
$localEnv = @{}
$envFile = Join-Path $repoRoot ".env.local"
if (Test-Path $envFile) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
      $localEnv[$Matches[1]] = $Matches[2]
    }
  }
}

function Resolve-Setting([string]$Current, [string]$Key, [string]$Fallback = "") {
  if ($Current) { return $Current }
  if ($localEnv.ContainsKey($Key) -and $localEnv[$Key]) { return $localEnv[$Key] }
  $fromEnv = [Environment]::GetEnvironmentVariable($Key)
  if ($fromEnv) { return $fromEnv }
  return $Fallback
}

try {
  # 0. Foundry settings -------------------------------------------------------
  $FoundryProjectEndpoint = Resolve-Setting $FoundryProjectEndpoint "FOUNDRY_PROJECT_ENDPOINT"
  $FoundryModel = Resolve-Setting $FoundryModel "FOUNDRY_MODEL"
  $FoundryVisionModel = Resolve-Setting $FoundryVisionModel "FOUNDRY_VISION_MODEL"

  if (-not $FoundryProjectEndpoint) {
    throw "FOUNDRY_PROJECT_ENDPOINT is not set. Copy .env.local.example to .env.local and fill it in, or pass -FoundryProjectEndpoint."
  }
  if (-not $FoundryModel) {
    throw "FOUNDRY_MODEL is not set. Copy .env.local.example to .env.local and fill it in, or pass -FoundryModel."
  }

  if (-not $FoundryAccountName) {
    # https://<account>.services.ai.azure.com/api/projects/<project>
    $FoundryAccountName = ([System.Uri]$FoundryProjectEndpoint).Host.Split(".")[0]
  }

  Step "Foundry configuration"
  Write-Host "    endpoint: $FoundryProjectEndpoint"
  Write-Host "    resource: $FoundryAccountName"
  Write-Host "    model:    $FoundryModel"

  # 1. Subscription -----------------------------------------------------------
  Step "Selecting subscription"
  if (-not $SubscriptionId) {
    $SubscriptionId = [string](Get-AzJson @("account", "show", "--query", "id", "-o", "json"))
    if (-not $SubscriptionId) { throw "No subscription selected. Run 'az login' or pass -SubscriptionId." }
  }
  Write-Host "    $SubscriptionId"
  Assert-Az "az account set" @("account", "set", "--subscription", $SubscriptionId)

  # 2. Resource group ---------------------------------------------------------
  Step "Confirming resource group $ResourceGroup"
  $rg = Get-AzJson @("group", "show", "--name", $ResourceGroup, "-o", "json")
  if (-not $rg) { throw "Resource group $ResourceGroup was not found." }
  if (-not $Location) { $Location = $rg.location }
  Write-Host "    location: $Location"

  # 3. Container registry -----------------------------------------------------
  Step "Ensuring an Azure Container Registry exists"
  if (-not $AcrName) {
    $existing = Get-AzJson @("acr", "list", "-g", $ResourceGroup, "--query", "[0].name", "-o", "json")
    if ($existing) {
      $AcrName = [string]$existing
    } else {
      $AcrName = "acrcaidemo2" + (-join ((97..122) | Get-Random -Count 6 | ForEach-Object { [char]$_ }))
    }
  }
  $acr = Get-AzJson @("acr", "show", "-n", $AcrName, "-g", $ResourceGroup, "-o", "json")
  if (-not $acr) {
    Write-Host "    creating $AcrName"
    Assert-Az "az acr create" @("acr", "create", "-n", $AcrName, "-g", $ResourceGroup, "--sku", "Basic", "--location", $Location, "--admin-enabled", "false", "-o", "none")
    $acr = Get-AzJson @("acr", "show", "-n", $AcrName, "-g", $ResourceGroup, "-o", "json")
  }
  if (-not $acr) { throw "Could not resolve the container registry." }
  $loginServer = $acr.loginServer
  Write-Host "    registry: $loginServer"

  # 4. Container Apps environment --------------------------------------------
  Step "Ensuring Container Apps environment $EnvironmentName"
  Invoke-Az @("extension", "add", "--name", "containerapp", "--upgrade", "--only-show-errors") | Out-Null
  $cae = Get-AzJson @("containerapp", "env", "show", "-n", $EnvironmentName, "-g", $ResourceGroup, "-o", "json")
  if ($cae -and $cae.properties.provisioningState -ne "Succeeded") {
    # A half-provisioned environment (for example after a regional capacity
    # failure) can never host an app, so replace it.
    Write-Host "    existing environment state is '$($cae.properties.provisioningState)'; deleting it"
    Assert-Az "az containerapp env delete" @("containerapp", "env", "delete", "-n", $EnvironmentName, "-g", $ResourceGroup, "--yes", "-o", "none")
    $cae = $null
  }
  if (-not $cae) {
    Write-Host "    creating $EnvironmentName in $Location (this can take a few minutes)"
    Assert-Az "az containerapp env create" @("containerapp", "env", "create", "-n", $EnvironmentName, "-g", $ResourceGroup, "--location", $Location, "-o", "none")
  } else {
    Write-Host "    reusing existing environment in $($cae.location)"
  }

  # 5. Build and push the image ----------------------------------------------
  $tag = Get-Date -Format "yyyyMMddHHmmss"
  $image = "$loginServer/${ImageRepo}:$tag"
  Step "Building $image in ACR (no local Docker required)"
  # --no-logs: the build log contains characters the Azure CLI cannot print on
  # a Windows console, so the run is polled instead of streamed.
  $queued = Get-AzJson @("acr", "build", "--registry", $AcrName, "--image", "${ImageRepo}:$tag", "--image", "${ImageRepo}:latest", "--file", "Dockerfile", ".", "--no-logs", "-o", "json")
  $runId = if ($queued) { [string]$queued.runId } else { $null }
  if (-not $runId) { throw "Failed to queue the ACR build." }
  Write-Host "    run id: $runId"

  $buildStatus = "Queued"
  foreach ($attempt in 1..90) {
    Start-Sleep -Seconds 10
    $runs = Get-AzJson @("acr", "task", "list-runs", "-r", $AcrName, "--top", "20", "--query", "[].{runId:runId,status:status}", "-o", "json")
    $run = @($runs) | Where-Object { $_.runId -eq $runId } | Select-Object -First 1
    if ($run) { $buildStatus = $run.status }
    Write-Host "    build status: $buildStatus"
    if ($buildStatus -in @("Succeeded", "Failed", "Error", "Canceled", "Timeout")) { break }
  }
  if ($buildStatus -ne "Succeeded") {
    throw "ACR build $runId ended with status '$buildStatus'. Inspect with: az acr task logs -r $AcrName --run-id $runId"
  }

  # 6-7. Create or update the Container App with a managed identity -----------
  Step "Ensuring Container App $AppName"
  $app = Get-AzJson @("containerapp", "show", "-n", $AppName, "-g", $ResourceGroup, "-o", "json")
  if (-not $app) {
    Write-Host "    creating $AppName with a placeholder image"
    Assert-Az "az containerapp create" @(
      "containerapp", "create", "-n", $AppName, "-g", $ResourceGroup,
      "--environment", $EnvironmentName,
      "--image", "mcr.microsoft.com/k8se/quickstart:latest",
      "--target-port", "3000", "--ingress", "external",
      "--min-replicas", "1", "--max-replicas", "1",
      "--cpu", "1.0", "--memory", "2.0Gi",
      "--system-assigned", "-o", "none"
    )
  } else {
    Invoke-Az @("containerapp", "identity", "assign", "-n", $AppName, "-g", $ResourceGroup, "--system-assigned", "-o", "none") | Out-Null
  }

  $principalId = [string](Get-AzJson @("containerapp", "show", "-n", $AppName, "-g", $ResourceGroup, "--query", "identity.principalId", "-o", "json"))
  if (-not $principalId) { throw "Could not read the managed identity principal ID." }
  Write-Host "    managed identity principal: $principalId"

  Step "Granting the managed identity AcrPull on $AcrName"
  Invoke-Az @("role", "assignment", "create", "--assignee-object-id", $principalId, "--assignee-principal-type", "ServicePrincipal", "--role", "AcrPull", "--scope", $acr.id, "-o", "none") | Out-Null

  # 8. Foundry RBAC -----------------------------------------------------------
  Step "Granting the managed identity Foundry access"
  $foundryId = [string](Get-AzJson @("resource", "list", "--name", $FoundryAccountName, "--resource-type", "Microsoft.CognitiveServices/accounts", "--query", "[0].id", "-o", "json"))
  if (-not $foundryId) {
    Write-Warning "Could not find Foundry account '$FoundryAccountName'. Assign access manually. See infra/configure-foundry-rbac.md."
  } else {
    Write-Host "    scope: $foundryId"
    $granted = $false
    foreach ($role in $FoundryRoles) {
      $assign = Invoke-Az @("role", "assignment", "create", "--assignee-object-id", $principalId, "--assignee-principal-type", "ServicePrincipal", "--role", $role, "--scope", $foundryId, "-o", "none")
      if ($assign.ExitCode -eq 0) {
        Write-Host "    granted '$role'"
        $granted = $true
      } else {
        Write-Host "    skipped '$role' (role not available in this tenant, or already assigned)"
      }
    }
    $existing = Get-AzJson @("role", "assignment", "list", "--assignee", $principalId, "--scope", $foundryId, "--query", "[].roleDefinitionName", "-o", "json")
    if ($existing) { Write-Host "    current roles: $((@($existing)) -join ', ')" }
    if (-not $granted -and -not $existing) {
      Write-Warning "No Foundry role could be assigned. See infra/configure-foundry-rbac.md."
    }
    # Data-plane role changes can take several minutes to take effect.
    Write-Host "    note: new Foundry role assignments can take a few minutes to become effective"
  }

  # 9-10. Image, env vars, replicas ------------------------------------------
  Step "Updating the Container App image and configuration"
  Assert-Az "az containerapp registry set" @("containerapp", "registry", "set", "-n", $AppName, "-g", $ResourceGroup, "--server", $loginServer, "--identity", "system", "-o", "none")

  Assert-Az "az containerapp update" @(
    "containerapp", "update", "-n", $AppName, "-g", $ResourceGroup,
    "--image", $image,
    "--min-replicas", "1", "--max-replicas", "1",
    "--set-env-vars",
    "AZURE_SUBSCRIPTION_ID=$SubscriptionId",
    "AZURE_RESOURCE_GROUP=$ResourceGroup",
    "FOUNDRY_PROJECT_ENDPOINT=$FoundryProjectEndpoint",
    "FOUNDRY_MODEL=$FoundryModel",
    "FOUNDRY_VISION_MODEL=$FoundryVisionModel",
    "DATABASE_PATH=/app/data/cai-demo2.db",
    "DEMO_MODE=true",
    "DEMO_EXTERNAL_DISPATCH=false",
    "DEMO_AI_TIMEOUT_MS=20000",
    "DEMO_FIXTURE_MODE=false",
    "NEXT_PUBLIC_APP_TITLE=CAI Connected Maintenance Demo",
    "-o", "none"
  )

  # 12-14. Verify -------------------------------------------------------------
  $fqdn = [string](Get-AzJson @("containerapp", "show", "-n", $AppName, "-g", $ResourceGroup, "--query", "properties.configuration.ingress.fqdn", "-o", "json"))
  $url = "https://$fqdn"

  Step "Checking $url/api/health"
  $healthy = $false
  foreach ($attempt in 1..15) {
    $raw = curl.exe -s --max-time 20 "$url/api/health"
    if ($raw) {
      Write-Host "    $raw"
      try {
        $health = $raw | ConvertFrom-Json
        if ($health.status -eq "ok") { $healthy = $true; break }
      } catch { }
    } else {
      Write-Host "    attempt $attempt ..."
    }
    Start-Sleep -Seconds 10
  }
  if (-not $healthy) {
    Write-Warning "Health check did not report ok. Inspect: az containerapp logs show -n $AppName -g $ResourceGroup --follow"
  }

  Step "Resetting demo state"
  $reset = curl.exe -s -X POST --max-time 30 "$url/api/demo/reset"
  if ($reset) { Write-Host "    $reset" } else { Write-Host "    reset call returned nothing (expected if inbound Entra auth is enabled)" }

  Write-Host "`nApplication URL: $url" -ForegroundColor Green
  Write-Host "Optional next step: enable Entra sign-in - see infra/configure-entra-auth.md"
}
finally {
  Pop-Location
}
