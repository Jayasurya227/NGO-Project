Write-Host "Starting all AI workers..." -ForegroundColor Cyan

$root = Get-Location
$apiServerDir = Join-Path $root "apps/api-server"
$workersDir = Join-Path $root "packages/queue/src/workers"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $apiServerDir; npx tsx $workersDir/requirement-extraction.worker.ts"
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $apiServerDir; npx tsx $workersDir/gap-analysis.worker.ts"
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $apiServerDir; npx tsx $workersDir/initiative-embedding.worker.ts"

Write-Host ""
Write-Host "All 3 workers started in separate windows." -ForegroundColor Green

