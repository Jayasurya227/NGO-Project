# Start API server, Web Admin, and Donor Portal
Write-Host "Starting API server on http://localhost:4000..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "$env:Path += ';C:\Users\rayav\AppData\Roaming\npm'; cd C:\Users\rayav\OneDrive\Desktop\Project\apps\api-server; pnpm exec tsx src/server.ts"
Start-Sleep -Seconds 3
Write-Host "Starting Web Admin on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "$env:Path += ';C:\Users\rayav\AppData\Roaming\npm'; cd C:\Users\rayav\OneDrive\Desktop\Project\apps\web-admin; pnpm dev"
Start-Sleep -Seconds 1
Write-Host "Starting Donor Portal on http://localhost:3002..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "$env:Path += ';C:\Users\rayav\AppData\Roaming\npm'; cd C:\Users\rayav\OneDrive\Desktop\Project\apps\donor-portal; pnpm dev"
Write-Host ""
Write-Host "All 3 servers starting in separate windows." -ForegroundColor Yellow
Write-Host "API:           http://localhost:4000" -ForegroundColor Blue
Write-Host "Web Admin:     http://localhost:3000" -ForegroundColor Green
Write-Host "Donor Portal:  http://localhost:3002" -ForegroundColor Magenta
