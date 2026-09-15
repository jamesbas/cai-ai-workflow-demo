param([string]$Base = "http://localhost:3000")

$ErrorActionPreference = "Stop"

Write-Output "--- health ---"
curl.exe -s "$Base/api/health"
Write-Output ""

Write-Output "--- reset ---"
curl.exe -s -X POST "$Base/api/demo/reset"
Write-Output ""

$created = curl.exe -s -X POST "$Base/api/cases" `
  -F "residentId=RES-001" `
  -F "submittedLocation=East Pool Entrance" `
  -F "residentNote=The east pool gate won't latch and keeps swinging open. I tried closing it twice." `
  -F "scenarioId=SCENARIO-POOL-GATE" `
  -F "sampleImage=pool-gate-broken.jpg" | ConvertFrom-Json

$id = $created.id
Write-Output "--- created: $id ($($created.status)) ---"

$analyzed = curl.exe -s -X POST "$Base/api/cases/$id/analyze" | ConvertFrom-Json
if ($analyzed.error) { Write-Output "ANALYZE ERROR: $($analyzed.error)"; exit 1 }

Write-Output "state        : $($analyzed.status)"
Write-Output "category     : $($analyzed.analysis.issueCategory)"
Write-Output "urgency      : $($analyzed.analysis.suggestedUrgency)  confidence: $($analyzed.analysis.confidence)"
Write-Output "observed     : $($analyzed.analysis.observations -join ' | ')"
Write-Output "reported     : $($analyzed.analysis.residentReportedFacts -join ' | ')"
Write-Output "asset        : $($analyzed.context.asset.id) - $($analyzed.context.asset.name)"
Write-Output "warranty     : active=$($analyzed.context.warranty.active) $($analyzed.context.warranty.vendorName) to $($analyzed.context.warranty.expiration)"
Write-Output "history      : $(($analyzed.context.maintenanceHistory | ForEach-Object { $_.work_date }) -join ', ')"
Write-Output "sla          : $($analyzed.context.sla.id)"
Write-Output "vendor route : $($analyzed.context.recommendedVendorName) ($($analyzed.context.routingReason))"
Write-Output "draft title  : $($analyzed.draft.workOrderTitle)"

$startBody = Join-Path $env:TEMP "cai-start.json"
Set-Content -Path $startBody -Value '{"action":"START_REVIEW"}' -Encoding ascii
curl.exe -s -X POST "$Base/api/cases/$id/review" -H "Content-Type: application/json" -d "@$startBody" | Out-Null

$approveBody = Join-Path $env:TEMP "cai-approve.json"
Set-Content -Path $approveBody -Encoding ascii -Value '{"action":"APPROVE","finalPriority":"URGENT","finalVendorId":"VEND-001","reviewNote":"Youth swim program begins shortly; gate must be secured before pool opening."}'
$review = curl.exe -s -X POST "$Base/api/cases/$id/review" -H "Content-Type: application/json" -H "x-ms-client-principal-name: manager@contoso.example.invalid" -d "@$approveBody" | ConvertFrom-Json
if ($review.error) { Write-Output "REVIEW ERROR: $($review.error)"; exit 1 }

Write-Output ""
Write-Output "--- after approval ---"
Write-Output "state        : $($review.status) ($($review.statusLabel))"
Write-Output "priority     : $($review.finalPriority)"
Write-Output "reviewer     : $($review.reviewerName)"
Write-Output "metrics      : elapsed=$($review.metrics.elapsedSeconds)s aiCalls=$($review.metrics.aiCalls) overrides=$($review.metrics.humanOverrides) final=$($review.metrics.finalState)"
Write-Output ""
Write-Output "--- audit trail ---"
$review.audit | ForEach-Object { Write-Output ("{0,-32} {1}" -f $_.action, $_.actorType) }
