@echo off
REM =============================================================================
REM Smart Contract Upgrade Script (Windows)
REM =============================================================================
REM Usage:
REM   cd blockchain\network
REM   交付包-20260421\blockchain-update\upgrade-chaincode.bat
REM
REM Description:
REM   Automated: Query Version -> Package -> Install (4 Orgs) -> Approve (4 Orgs) -> Commit -> Verify
REM =============================================================================

setlocal enabledelayedexpansion

set CC_NAME=supplychain
set CC_VERSION=1.3
set CC_SEQUENCE=2
set CC_LABEL=supplychain_1.3
set CHANNEL=supplychain-channel
set CC_PATH=./chaincode/supplychain

set BASE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto
set PEER_BASE=%BASE%/peerOrganizations
set ORDERER_CA=%BASE%/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem
echo.
echo ============================================
echo   Smart Contract Upgrade v%CC_VERSION%  (sequence %CC_SEQUENCE%)
echo ============================================
echo.

REM ---- Check cli container ----
docker ps --format "{{.Names}}" | findstr "cli" >nul 2>&1
if errorlevel 1 (
    echo [X] cli container is not running, please start the blockchain network first: docker-compose up -d
    pause
    exit /b 1
)
echo [OK] cli container is running

REM ---- 1. Package chaincode ----
echo.
echo --- Step 1/5: Packaging chaincode ---
docker exec -i cli peer lifecycle chaincode package /tmp/%CC_NAME%.tar.gz --path %CC_PATH% --lang golang --label %CC_LABEL%
if errorlevel 1 (
    echo [X] Packaging failed, please verify the chaincode path
    pause
    exit /b 1
)
echo [OK] Chaincode packaged successfully

REM ---- 2. Install chaincode to all organizations ----
echo.
echo --- Step 2/5: Installing chaincode to organizations ---

echo   [Producer] Installing...
docker exec -i -e CORE_PEER_LOCALMSPID=ProducerMSP -e CORE_PEER_ADDRESS=peer0.producer.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=%PEER_BASE%/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=%PEER_BASE%/producer.supplychain.com/users/Admin@producer.supplychain.com/msp" cli peer lifecycle chaincode install /tmp/%CC_NAME%.tar.gz > "%TEMP%\cc_install.txt" 2>&1
echo   [OK] Producer installation complete

echo   [Distributor] Installing...
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e CORE_PEER_ADDRESS=peer0.distributor.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=%PEER_BASE%/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=%PEER_BASE%/distributor.supplychain.com/users/Admin@distributor.supplychain.com/msp" cli peer lifecycle chaincode install /tmp/%CC_NAME%.tar.gz >nul 2>&1
echo   [OK] Distributor installation complete

echo   [Hospital] Installing...
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e CORE_PEER_ADDRESS=peer0.hospital.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=%PEER_BASE%/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=%PEER_BASE%/hospital.supplychain.com/users/Admin@hospital.supplychain.com/msp" cli peer lifecycle chaincode install /tmp/%CC_NAME%.tar.gz >nul 2>&1
echo   [OK] Hospital installation complete

echo   [Regulator] Installing...
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e CORE_PEER_ADDRESS=peer0.regulator.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=%PEER_BASE%/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=%PEER_BASE%/regulator.supplychain.com/users/Admin@regulator.supplychain.com/msp" cli peer lifecycle chaincode install /tmp/%CC_NAME%.tar.gz >nul 2>&1
echo   [OK] Regulator installation complete

REM ---- Extract Package ID ----
echo.
echo   Extracting Package ID...
set PACKAGE_ID=
for /f "usebackq delims=" %%L in (`findstr "identifier" "%TEMP%\cc_install.txt" 2^>nul`) do (
    for %%W in (%%L) do set "PACKAGE_ID=%%W"
)

if not defined PACKAGE_ID (
    echo   [!] Failed to extract from install output, trying queryinstalled...
    for /f "usebackq delims=" %%L in (`docker exec -i cli peer lifecycle chaincode queryinstalled 2^>^&1 ^| findstr "Package ID"`) do (
        for %%W in (%%L) do set "LAST=%%W"
    )
    if defined LAST set "PACKAGE_ID=!LAST:,=!"
)

if not defined PACKAGE_ID (
    echo.
    echo [X] Failed to automatically extract Package ID, please query manually:
    echo     docker exec -i cli peer lifecycle chaincode queryinstalled
    pause
    exit /b 1
)
echo   [OK] Package ID: !PACKAGE_ID!

REM ---- 3. Approve chaincode ----
echo.
echo --- Step 3/5: Approving chaincode ---

echo   [Producer] Approving...
docker exec -i -e CORE_PEER_LOCALMSPID=ProducerMSP -e CORE_PEER_ADDRESS=peer0.producer.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=%PEER_BASE%/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=%PEER_BASE%/producer.supplychain.com/users/Admin@producer.supplychain.com/msp" cli peer lifecycle chaincode approveformyorg --channelID %CHANNEL% --name %CC_NAME% --version %CC_VERSION% --package-id !PACKAGE_ID! --sequence !CC_SEQUENCE! --tls --cafile %ORDERER_CA%
if errorlevel 1 (
    echo   [X] Producer approval failed
    pause
    exit /b 1
)
echo   [OK] Producer approval complete

echo   [Distributor] Approving...
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e CORE_PEER_ADDRESS=peer0.distributor.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=%PEER_BASE%/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=%PEER_BASE%/distributor.supplychain.com/users/Admin@distributor.supplychain.com/msp" cli peer lifecycle chaincode approveformyorg --channelID %CHANNEL% --name %CC_NAME% --version %CC_VERSION% --package-id !PACKAGE_ID! --sequence !CC_SEQUENCE! --tls --cafile %ORDERER_CA%
if errorlevel 1 (
    echo   [X] Distributor approval failed
    pause
    exit /b 1
)
echo   [OK] Distributor approval complete

echo   [Hospital] Approving...
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e CORE_PEER_ADDRESS=peer0.hospital.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=%PEER_BASE%/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=%PEER_BASE%/hospital.supplychain.com/users/Admin@hospital.supplychain.com/msp" cli peer lifecycle chaincode approveformyorg --channelID %CHANNEL% --name %CC_NAME% --version %CC_VERSION% --package-id !PACKAGE_ID! --sequence !CC_SEQUENCE! --tls --cafile %ORDERER_CA%
if errorlevel 1 (
    echo   [X] Hospital approval failed
    pause
    exit /b 1
)
echo   [OK] Hospital approval complete

echo   [Regulator] Approving...
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e CORE_PEER_ADDRESS=peer0.regulator.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=%PEER_BASE%/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=%PEER_BASE%/regulator.supplychain.com/users/Admin@regulator.supplychain.com/msp" cli peer lifecycle chaincode approveformyorg --channelID %CHANNEL% --name %CC_NAME% --version %CC_VERSION% --package-id !PACKAGE_ID! --sequence !CC_SEQUENCE! --tls --cafile %ORDERER_CA%
if errorlevel 1 (
    echo   [X] Regulator approval failed
    pause
    exit /b 1
)
echo   [OK] Regulator approval complete

REM ---- 4. Commit chaincode upgrade ----
echo.
echo --- Step 4/5: Committing chaincode upgrade ---
timeout /t 3 /nobreak >nul

docker exec -i -e CORE_PEER_LOCALMSPID=ProducerMSP -e CORE_PEER_ADDRESS=peer0.producer.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=%PEER_BASE%/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=%PEER_BASE%/producer.supplychain.com/users/Admin@producer.supplychain.com/msp" cli peer lifecycle chaincode commit --channelID %CHANNEL% --name %CC_NAME% --version %CC_VERSION% --sequence !CC_SEQUENCE! --tls --cafile %ORDERER_CA% --peerAddresses peer0.producer.supplychain.com:7051 --tlsRootCertFiles %PEER_BASE%/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt --peerAddresses peer0.distributor.supplychain.com:7051 --tlsRootCertFiles %PEER_BASE%/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt --peerAddresses peer0.hospital.supplychain.com:7051 --tlsRootCertFiles %PEER_BASE%/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt --peerAddresses peer0.regulator.supplychain.com:7051 --tlsRootCertFiles %PEER_BASE%/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt
if errorlevel 1 (
    echo [X] Commit failed
    pause
    exit /b 1
)
echo [OK] Chaincode committed

REM ---- 5. Verify upgrade result ----
echo.
echo --- Step 5/5: Verifying upgrade result ---
timeout /t 3 /nobreak >nul

docker exec -i cli peer lifecycle chaincode querycommitted --channelID %CHANNEL%

echo.
echo ============================================
echo   Chaincode upgrade completed!
echo   Please confirm the version in the output above is %CC_VERSION%
echo ============================================

endlocal
pause