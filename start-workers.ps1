Write-Host "Starting all AI workers..." -ForegroundColor Cyan

$root = "C:\Users\maddi\OneDrive\Desktop\ngo-impact-platform"
$apiServerDir = "$root\apps\api-server"
$workersDir = "$root\packages\queue\src\workers"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiServerDir'; npx tsx '$workersDir\requirement-extraction.worker.ts'"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiServerDir'; npx tsx '$workersDir\gap-analysis.worker.ts'"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiServerDir'; npx tsx '$workersDir\initiative-matching.worker.ts'"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiServerDir'; npx tsx '$workersDir\initiative-embedding.worker.ts'"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiServerDir'; npx tsx '$workersDir\pitch-deck.worker.ts'"
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "All 5 workers started in separate windows." -ForegroundColor Green
Write-Host "Requirement Extraction Worker  - running" -ForegroundColor Green
Write-Host "Gap Analysis Worker            - running" -ForegroundColor Green
Write-Host "Initiative Matching Worker     - running" -ForegroundColor Green
Write-Host "Initiative Embedding Worker    - running" -ForegroundColor Green
Write-Host "Pitch Deck Worker              - running" -ForegroundColor Green