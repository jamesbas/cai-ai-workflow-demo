param([string]$Base = "http://localhost:3000")

$ErrorActionPreference = "Stop"

$scenarios = @(
  @{ id = "SCENARIO-POOL-GATE"; resident = "RES-001"; location = "East Pool Entrance"; image = "pool-gate-broken.jpg"
     note = "The east pool gate won't latch and keeps swinging open. I tried closing it twice."
     expectCategory = "POOL_GATE"; expectAsset = "PG-002" },
  @{ id = "SCENARIO-IRRIGATION"; resident = "RES-002"; location = "Greenway near Lot 42"; image = "irrigation-leak.jpg"
     note = "Water has been running across the walking path near Lot 42 for about 20 minutes."
     expectCategory = "IRRIGATION_LEAK"; expectAsset = "IRR-014" },
  @{ id = "SCENARIO-TRAIL-LIGHT"; resident = "RES-002"; location = "East Walking Trail"; image = "trail-light.jpg"
     note = "The light at the east trail intersection has been out for two nights."
     expectCategory = "SITE_LIGHTING"; expectAsset = "LIGHT-009" }
)

curl.exe -s -X POST "$Base/api/demo/reset" | Out-Null
$failures = 0

foreach ($s in $scenarios) {
  $created = curl.exe -s -X POST "$Base/api/cases" `
    -F "residentId=$($s.resident)" -F "submittedLocation=$($s.location)" `
    -F "residentNote=$($s.note)" -F "scenarioId=$($s.id)" -F "sampleImage=$($s.image)" | ConvertFrom-Json
  $result = curl.exe -s -X POST "$Base/api/cases/$($created.id)/analyze" | ConvertFrom-Json

  Write-Output ""
  Write-Output "=== $($s.id) ==="
  if ($result.error) { Write-Output "  ERROR: $($result.error)"; $failures++; continue }

  $categoryOk = $result.analysis.issueCategory -eq $s.expectCategory
  $assetOk = $result.context.asset.id -eq $s.expectAsset
  if (-not ($categoryOk -and $assetOk)) { $failures++ }

  Write-Output ("  category   : {0} {1}" -f $result.analysis.issueCategory, $(if ($categoryOk) { "[ok]" } else { "[EXPECTED $($s.expectCategory)]" }))
  Write-Output ("  asset      : {0} {1}" -f $result.context.asset.id, $(if ($assetOk) { "[ok]" } else { "[EXPECTED $($s.expectAsset)]" }))
  Write-Output "  urgency    : $($result.analysis.suggestedUrgency)   confidence: $($result.analysis.confidence)"
  Write-Output "  vendor     : $($result.context.recommendedVendorName)"
  Write-Output "  observed   :"
  $result.analysis.observations | ForEach-Object { Write-Output "    - $_" }
  Write-Output "  reported   :"
  $result.analysis.residentReportedFacts | ForEach-Object { Write-Output "    - $_" }
  if ($result.analysis.missingInformation.Count -gt 0) {
    Write-Output "  missing    :"
    $result.analysis.missingInformation | ForEach-Object { Write-Output "    - $_" }
  }
}

curl.exe -s -X POST "$Base/api/demo/reset" | Out-Null
Write-Output ""
if ($failures -eq 0) { Write-Output "All scenarios matched their expected category and asset." }
else { Write-Output "$failures scenario(s) did not match expectations."; exit 1 }
