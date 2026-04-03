@echo off
echo Starting NGO Impact Platform...

start "API Server" cmd /k "cd /d C:\Users\pavan\Desktop\NGO_IMPACT\apps\api-server && npx tsx watch src/server.ts"
timeout /t 3 /nobreak >nul

start "Admin Portal" cmd /k "cd /d C:\Users\pavan\Desktop\NGO_IMPACT\apps\web-admin && npm run dev"
timeout /t 2 /nobreak >nul

start "CSR Portal" cmd /k "cd /d C:\Users\pavan\Desktop\NGO_IMPACT\apps\donor-portal && npm run dev"
timeout /t 2 /nobreak >nul

start "Workers" cmd /k "cd /d C:\Users\pavan\Desktop\NGO_IMPACT && npx tsx packages/queue/src/start-all-workers.ts"

echo All servers started!
echo.
echo  API Server  : http://localhost:4000
echo  Admin Portal: http://localhost:3000
echo  CSR Portal  : http://localhost:3002
echo.
pause
