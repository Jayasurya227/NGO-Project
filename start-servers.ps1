# Terminal 1 — Start API server and Web Admin together
Write-Host "Starting API server on http://localhost:4000..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\maddi\OneDrive\Desktop\ngo-impact-platform\apps\api-server; .\node_modules\.bin\tsx src/server.ts"
Start-Sleep -Seconds 3
Write-Host "Starting Web Admin on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\maddi\OneDrive\Desktop\ngo-impact-platform\apps\web-admin; pnpm dev"
Write-Host ""
Write-Host "Both servers starting in separate windows." -ForegroundColor Yellow
Write-Host "API:  http://localhost:4000" -ForegroundColor Blue
Write-Host "Web:  http://localhost:3000" -ForegroundColor Green
