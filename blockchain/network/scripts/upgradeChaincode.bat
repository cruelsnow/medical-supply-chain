@echo off
REM =============================================================================
REM 医用耗材供应链管理系统 - 链码升级脚本 (Windows)
REM 功能: 在已有v1.0链码的基础上，升级到v1.1（新增Quantity字段）
REM 前提: Fabric网络已运行，v1.0链码已部署
REM =============================================================================

setlocal EnableDelayedExpansion

echo ============================================================
echo    Upgrade Chaincode - supplychain v1.0 to v1.1
echo ============================================================
echo.

REM 升级版本号和序列号
set CHANNEL_NAME=supplychain-channel
set CHAINCODE_NAME=supplychain
set CHAINCODE_VERSION=1.1
set CHAINCODE_SEQUENCE=2
set NETWORK_DIR=%~dp0..

REM TLS CA certificate for orderer
set ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

cd /d "%NETWORK_DIR%"

REM Check Docker
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/5] Packaging chaincode v%CHAINCODE_VERSION%...
docker exec -i cli peer lifecycle chaincode package %CHAINCODE_NAME%.tar.gz --path /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/supplychain --lang golang --label %CHAINCODE_NAME%_%CHAINCODE_VERSION%
if errorlevel 1 (
    echo [ERROR] Chaincode packaging failed
    pause
    exit /b 1
)
echo [OK] Chaincode packaged
echo.

echo [2/5] Installing chaincode on all peers...

REM Producer peers
echo   Installing on peer0.producer...
docker exec -i cli peer lifecycle chaincode install %CHAINCODE_NAME%.tar.gz

echo   Installing on peer1.producer...
docker exec -i -e CORE_PEER_LOCALMSPID=ProducerMSP -e CORE_PEER_ADDRESS=peer1.producer.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/producer.supplychain.com/peers/peer1.producer.supplychain.com/tls/ca.crt" cli peer lifecycle chaincode install %CHAINCODE_NAME%.tar.gz

REM Distributor peers
echo   Installing on peer0.distributor...
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e CORE_PEER_ADDRESS=peer0.distributor.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/users/Admin@distributor.supplychain.com/msp" cli peer lifecycle chaincode install %CHAINCODE_NAME%.tar.gz

echo   Installing on peer1.distributor...
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e CORE_PEER_ADDRESS=peer1.distributor.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/peers/peer1.distributor.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/users/Admin@distributor.supplychain.com/msp" cli peer lifecycle chaincode install %CHAINCODE_NAME%.tar.gz

REM Hospital peers
echo   Installing on peer0.hospital...
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e CORE_PEER_ADDRESS=peer0.hospital.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/users/Admin@hospital.supplychain.com/msp" cli peer lifecycle chaincode install %CHAINCODE_NAME%.tar.gz

echo   Installing on peer1.hospital...
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e CORE_PEER_ADDRESS=peer1.hospital.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/peers/peer1.hospital.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/users/Admin@hospital.supplychain.com/msp" cli peer lifecycle chaincode install %CHAINCODE_NAME%.tar.gz

REM Regulator peers
echo   Installing on peer0.regulator...
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e CORE_PEER_ADDRESS=peer0.regulator.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/users/Admin@regulator.supplychain.com/msp" cli peer lifecycle chaincode install %CHAINCODE_NAME%.tar.gz

echo   Installing on peer1.regulator...
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e CORE_PEER_ADDRESS=peer1.regulator.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/peers/peer1.regulator.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/users/Admin@regulator.supplychain.com/msp" cli peer lifecycle chaincode install %CHAINCODE_NAME%.tar.gz

echo [OK] All peers chaincode installed
echo.

echo [3/5] Getting package ID...
docker exec -i cli peer lifecycle chaincode queryinstalled --tls --cafile %ORDERER_CA%
echo.

echo [4/5] All organizations approving chaincode definition...

REM Get package ID
for /f "tokens=3 delims=, " %%a in ('docker exec -i cli peer lifecycle chaincode queryinstalled --tls --cafile %ORDERER_CA% 2^>nul ^| findstr "%CHAINCODE_NAME%_%CHAINCODE_VERSION%"') do set PACKAGE_ID=%%a

echo Package ID: %PACKAGE_ID%
echo.

REM Approve for each org
echo   Producer approving...
docker exec -i cli peer lifecycle chaincode approveformyorg -o orderer1.supplychain.com:7050 --channelID %CHANNEL_NAME% --name %CHAINCODE_NAME% --version %CHAINCODE_VERSION% --sequence %CHAINCODE_SEQUENCE% --package-id %PACKAGE_ID% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile %ORDERER_CA%

echo   Distributor approving...
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e CORE_PEER_ADDRESS=peer0.distributor.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/users/Admin@distributor.supplychain.com/msp" cli peer lifecycle chaincode approveformyorg -o orderer1.supplychain.com:7050 --channelID %CHANNEL_NAME% --name %CHAINCODE_NAME% --version %CHAINCODE_VERSION% --sequence %CHAINCODE_SEQUENCE% --package-id %PACKAGE_ID% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile %ORDERER_CA%

echo   Hospital approving...
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e CORE_PEER_ADDRESS=peer0.hospital.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/users/Admin@hospital.supplychain.com/msp" cli peer lifecycle chaincode approveformyorg -o orderer1.supplychain.com:7050 --channelID %CHANNEL_NAME% --name %CHAINCODE_NAME% --version %CHAINCODE_VERSION% --sequence %CHAINCODE_SEQUENCE% --package-id %PACKAGE_ID% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile %ORDERER_CA%

echo   Regulator approving...
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e CORE_PEER_ADDRESS=peer0.regulator.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/users/Admin@regulator.supplychain.com/msp" cli peer lifecycle chaincode approveformyorg -o orderer1.supplychain.com:7050 --channelID %CHANNEL_NAME% --name %CHAINCODE_NAME% --version %CHAINCODE_VERSION% --sequence %CHAINCODE_SEQUENCE% --package-id %PACKAGE_ID% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile %ORDERER_CA%

echo [OK] All organizations approved
echo.

echo [5/5] Committing chaincode definition...
echo Checking commit readiness...
docker exec -i cli peer lifecycle chaincode checkcommitreadiness --channelID %CHANNEL_NAME% --name %CHAINCODE_NAME% --version %CHAINCODE_VERSION% --sequence %CHAINCODE_SEQUENCE% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile %ORDERER_CA%

echo Committing...
docker exec -i cli peer lifecycle chaincode commit -o orderer1.supplychain.com:7050 --channelID %CHANNEL_NAME% --name %CHAINCODE_NAME% --version %CHAINCODE_VERSION% --sequence %CHAINCODE_SEQUENCE% --signature-policy "OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')" --tls --cafile %ORDERER_CA% --peerAddresses peer0.producer.supplychain.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt --peerAddresses peer0.distributor.supplychain.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt --peerAddresses peer0.hospital.supplychain.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt --peerAddresses peer0.regulator.supplychain.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt

if errorlevel 1 (
    echo [ERROR] Chaincode commit failed
    pause
    exit /b 1
)

echo [OK] Chaincode committed
echo.

echo Verifying deployment...
docker exec -i cli peer lifecycle chaincode querycommitted --channelID %CHANNEL_NAME% --tls --cafile %ORDERER_CA%
echo.

echo ============================================================
echo    Chaincode Upgraded Successfully!
echo ============================================================
echo.
echo Chaincode Info:
echo   Name: %CHAINCODE_NAME%
echo   Version: %CHAINCODE_VERSION%
echo   Sequence: %CHAINCODE_SEQUENCE%
echo   Channel: %CHANNEL_NAME%
echo.
echo NEXT:
echo   1. Rebuild backend: cd ..\..\..\..\backend ^&^& npm run build
echo   2. Restart backend: cd ..\..\..\..\backend ^&^& node dist\app.js
echo.
pause
