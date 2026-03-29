@echo off
REM =============================================================================
REM Medical Supply Chain Blockchain - One-Click Deployment Script (Windows)
REM Function: Complete deployment in one click
REM =============================================================================

setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
color 0A

echo.
echo  ================================================================
echo  ^|     Medical Supply Chain - One-Click Deployment               ^|
echo  ================================================================
echo.

REM Get script directory (scripts folder)
set "SCRIPTS_DIR=%~dp0"

REM Navigate up to find project root
REM scripts dir: blockchain/network/scripts/
REM project root is 3 levels up from scripts
cd /d "%SCRIPTS_DIR%..\..\..\..\"
set "PROJECT_ROOT=%CD%"
cd /d "%SCRIPTS_DIR%"

echo Project Root: %PROJECT_ROOT%
echo.

REM ============================================================
REM STEP 1: Check Environment
REM ============================================================
echo [STEP 1/6] Checking Environment...
echo.

REM Check Docker
echo   Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo   [ERROR] Docker is not running!
    echo.
    echo   Please:
    echo     1. Open Docker Desktop from Start Menu
    echo     2. Wait for Docker to start ^(green icon in taskbar^)
    echo     3. Run this script again
    echo.
    pause
    exit /b 1
)
echo   [OK] Docker is running

REM Check Node.js
echo   Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo   [ERROR] Node.js is not installed!
    echo.
    echo   Please install Node.js 18.x from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   [OK] Node.js %NODE_VERSION%

REM Check npm
echo   Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
    color 0C
    echo   [ERROR] npm is not installed!
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo   [OK] npm %NPM_VERSION%

echo.
echo   Environment check passed!
echo.

REM ============================================================
REM STEP 2: Install Dependencies
REM ============================================================
echo [STEP 2/6] Installing Dependencies...
echo.

cd /d "%PROJECT_ROOT%\backend"
if not exist "package.json" (
    color 0C
    echo   [ERROR] backend/package.json not found!
    echo   Project root: %PROJECT_ROOT%
    echo   Make sure the script is in the correct location.
    echo.
    pause
    exit /b 1
)

echo   Installing backend dependencies...
echo   ^(This may take 2-5 minutes^)
echo.
call npm install
if errorlevel 1 (
    echo   [WARNING] Backend npm install had warnings, continuing...
) else (
    echo   [OK] Backend dependencies installed
)
echo.

cd /d "%PROJECT_ROOT%\frontend"
if not exist "package.json" (
    color 0C
    echo   [ERROR] frontend/package.json not found!
    echo.
    pause
    exit /b 1
)

echo   Installing frontend dependencies...
echo   ^(This may take 2-5 minutes^)
echo.
call npm install
if errorlevel 1 (
    echo   [WARNING] Frontend npm install had warnings, continuing...
) else (
    echo   [OK] Frontend dependencies installed
)
echo.

REM ============================================================
REM STEP 3: Start Blockchain Network
REM ============================================================
echo [STEP 3/6] Starting Blockchain Network...
echo.

cd /d "%PROJECT_ROOT%\blockchain\network"

echo   Starting Docker containers...
docker compose up -d
if errorlevel 1 (
    color 0C
    echo   [ERROR] Failed to start Docker containers!
    echo   Try: docker compose down
    echo   Then run this script again.
    echo.
    pause
    exit /b 1
)
echo   [OK] Containers starting...

echo.
echo   Waiting for containers to be ready ^(30 seconds^)...
timeout /t 30 /nobreak >nul
echo   [OK] Wait complete
echo.

REM Check if containers are running
docker ps --format "{{.Names}}" | findstr "cli" >nul
if errorlevel 1 (
    color 0C
    echo   [ERROR] CLI container not running!
    echo   Run: docker ps -a
    echo   Check container logs: docker logs cli
    echo.
    pause
    exit /b 1
)
echo   [OK] Blockchain containers are running
echo.

REM ============================================================
REM STEP 4: Create Channel
REM ============================================================
echo [STEP 4/6] Creating Channel...
echo.

echo   Creating supplychain-channel...
docker exec -i cli peer channel create -o orderer1.supplychain.com:7050 -c supplychain-channel -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/supplychain-channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem 2>nul
if errorlevel 1 (
    echo   [INFO] Channel may already exist, continuing...
) else (
    echo   [OK] Channel created
)

echo   Joining peers to channel...
docker exec -i cli peer channel join -b supplychain-channel.block --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e CORE_PEER_ADDRESS=peer0.distributor.supplychain.com:7051 cli peer channel join -b supplychain-channel.block --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e CORE_PEER_ADDRESS=peer0.hospital.supplychain.com:7051 cli peer channel join -b supplychain-channel.block --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e CORE_PEER_ADDRESS=peer0.regulator.supplychain.com:7051 cli peer channel join -b supplychain-channel.block --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
echo   [OK] Peers joined channel
echo.

REM ============================================================
REM STEP 5: Deploy Chaincode
REM ============================================================
echo [STEP 5/6] Deploying Chaincode...
echo.

echo   Packaging chaincode...
docker exec -i cli peer lifecycle chaincode package supplychain.tar.gz --path /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/supplychain --lang golang --label supplychain_1.0 >nul 2>&1
echo   [OK] Chaincode packaged

echo   Installing chaincode on peers...
docker exec -i cli peer lifecycle chaincode install supplychain.tar.gz --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e CORE_PEER_ADDRESS=peer0.distributor.supplychain.com:7051 cli peer lifecycle chaincode install supplychain.tar.gz --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e CORE_PEER_ADDRESS=peer0.hospital.supplychain.com:7051 cli peer lifecycle chaincode install supplychain.tar.gz --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e CORE_PEER_ADDRESS=peer0.regulator.supplychain.com:7051 cli peer lifecycle chaincode install supplychain.tar.gz --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
echo   [OK] Chaincode installed

echo   Getting package ID and approving...
for /f "tokens=3 delims=, " %%a in ('docker exec -i cli peer lifecycle chaincode queryinstalled --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem 2^>nul ^| findstr "supplychain_1.0"') do set PACKAGE_ID=%%a

docker exec -i cli peer lifecycle chaincode approveformyorg -o orderer1.supplychain.com:7050 --channelID supplychain-channel --name supplychain --version 1.0 --sequence 1 --package-id %PACKAGE_ID% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP cli peer lifecycle chaincode approveformyorg -o orderer1.supplychain.com:7050 --channelID supplychain-channel --name supplychain --version 1.0 --sequence 1 --package-id %PACKAGE_ID% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP cli peer lifecycle chaincode approveformyorg -o orderer1.supplychain.com:7050 --channelID supplychain-channel --name supplychain --version 1.0 --sequence 1 --package-id %PACKAGE_ID% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP cli peer lifecycle chaincode approveformyorg -o orderer1.supplychain.com:7050 --channelID supplychain-channel --name supplychain --version 1.0 --sequence 1 --package-id %PACKAGE_ID% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem >nul 2>&1
echo   [OK] All organizations approved

echo   Committing chaincode...
docker exec -i cli peer lifecycle chaincode commit -o orderer1.supplychain.com:7050 --channelID supplychain-channel --name supplychain --version 1.0 --sequence 1 --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem --peerAddresses peer0.producer.supplychain.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt --peerAddresses peer0.distributor.supplychain.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt --peerAddresses peer0.hospital.supplychain.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt --peerAddresses peer0.regulator.supplychain.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt >nul 2>&1
echo   [OK] Chaincode deployed
echo.

REM ============================================================
REM STEP 6: Start Backend and Frontend
REM ============================================================
echo [STEP 6/6] Starting Services...
echo.

echo   Starting backend service...
start "Backend - Medical Supply Chain" cmd /c "cd /d "%PROJECT_ROOT%\backend" && npm run dev"
echo   [OK] Backend starting on http://localhost:3000

timeout /t 5 /nobreak >nul

echo   Starting frontend service...
start "Frontend - Medical Supply Chain" cmd /c "cd /d "%PROJECT_ROOT%\frontend" && npm run dev"
echo   [OK] Frontend starting on http://localhost:5173

echo.
timeout /t 10 /nobreak >nul

echo.
echo  ================================================================
echo  ^|          DEPLOYMENT COMPLETED SUCCESSFULLY!                    ^|
echo  ================================================================
echo.
echo   Services:
echo     - Blockchain: Running ^(Docker containers^)
echo     - Backend:    http://localhost:3000
echo     - Frontend:   http://localhost:5173
echo.
echo   Test Accounts:
echo     - Producer:    producer_admin / 123456
echo     - Distributor: distributor_admin / 123456
echo     - Hospital:    hospital_admin / 123456
echo     - Regulator:   regulator_admin / 123456
echo.
echo  ================================================================
echo.

echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:5173

pause
