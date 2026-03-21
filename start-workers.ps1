Write-Host "Starting all AI workers..." -ForegroundColor Cyan
cd C:\Users\maddi\OneDrive\Desktop\ngo-impact-platform\apps\api-server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\maddi\OneDrive\Desktop\ngo-impact-platform\apps\api-server; .\node_modules\.bin\tsx ..\..\packages\queue\src\workers\requirement-extraction.worker.ts"
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\maddi\OneDrive\Desktop\ngo-impact-platform\apps\api-server; .\node_modules\.bin\tsx ..\..\packages\queue\src\workers\gap-analysis.worker.ts"
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\maddi\OneDrive\Desktop\ngo-impact-platform\apps\api-server; .\node_modules\.bin\tsx ..\..\packages\queue\src\workers\initiative-embedding.worker.ts"
Write-Host ""
Write-Host "All 3 workers started in separate windows." -ForegroundColor Green
Write-Host "Requirement Extraction Worker - running" -ForegroundColor Green
Write-Host "Gap Analysis Worker           - running" -ForegroundColor Green
Write-Host "Initiative Embedding Worker   - running" -ForegroundColor Green
