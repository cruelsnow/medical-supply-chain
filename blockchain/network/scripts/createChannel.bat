@echo off
REM =============================================================================
REM Medical Supply Chain Blockchain - Channel Creation Script (Windows)
REM Function: Create application channel and join all peer nodes
REM =============================================================================

setlocal EnableDelayedExpansion

echo ============================================================
echo    Create Channel - supplychain-channel
echo ============================================================
echo.

REM Set variables
set CHANNEL_NAME=supplychain-channel
set NETWORK_DIR=%~dp0..
set CONFIG_DIR=%NETWORK_DIR%\config

REM TLS CA certificate for orderer
set ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

REM Check Docker
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

cd /d "%NETWORK_DIR%"

echo [1/5] Creating channel %CHANNEL_NAME%...
docker exec -i cli peer channel create -o orderer1.supplychain.com:7050 -c %CHANNEL_NAME% -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/supplychain-channel.tx --tls --cafile %ORDERER_CA%
if errorlevel 1 (
    echo [ERROR] Channel creation failed
    pause
    exit /b 1
)
echo [OK] Channel created
echo.

echo [2/5] All peer nodes joining channel...

REM Producer peers
echo   peer0.producer joining...
docker exec -i cli peer channel join -b %CHANNEL_NAME%.block --tls --cafile %ORDERER_CA%

echo   peer1.producer joining...
docker exec -i -e CORE_PEER_LOCALMSPID=ProducerMSP -e CORE_PEER_ADDRESS=peer1.producer.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/producer.supplychain.com/peers/peer1.producer.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/producer.supplychain.com/users/Admin@producer.supplychain.com/msp" cli peer channel join -b %CHANNEL_NAME%.block --tls --cafile %ORDERER_CA%

REM Distributor peers
echo   peer0.distributor joining...
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e CORE_PEER_ADDRESS=peer0.distributor.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/users/Admin@distributor.supplychain.com/msp" cli peer channel join -b %CHANNEL_NAME%.block --tls --cafile %ORDERER_CA%

echo   peer1.distributor joining...
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e CORE_PEER_ADDRESS=peer1.distributor.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/peers/peer1.distributor.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/users/Admin@distributor.supplychain.com/msp" cli peer channel join -b %CHANNEL_NAME%.block --tls --cafile %ORDERER_CA%

REM Hospital peers
echo   peer0.hospital joining...
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e CORE_PEER_ADDRESS=peer0.hospital.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/users/Admin@hospital.supplychain.com/msp" cli peer channel join -b %CHANNEL_NAME%.block --tls --cafile %ORDERER_CA%

echo   peer1.hospital joining...
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e CORE_PEER_ADDRESS=peer1.hospital.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/peers/peer1.hospital.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/users/Admin@hospital.supplychain.com/msp" cli peer channel join -b %CHANNEL_NAME%.block --tls --cafile %ORDERER_CA%

REM Regulator peers
echo   peer0.regulator joining...
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e CORE_PEER_ADDRESS=peer0.regulator.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/users/Admin@regulator.supplychain.com/msp" cli peer channel join -b %CHANNEL_NAME%.block --tls --cafile %ORDERER_CA%

echo   peer1.regulator joining...
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e CORE_PEER_ADDRESS=peer1.regulator.supplychain.com:7051 -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/peers/peer1.regulator.supplychain.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/users/Admin@regulator.supplychain.com/msp" cli peer channel join -b %CHANNEL_NAME%.block --tls --cafile %ORDERER_CA%

echo [OK] All peers joined channel
echo.

echo [3/5] Updating anchor peers...

REM Producer anchor
docker exec -i cli peer channel update -o orderer1.supplychain.com:7050 -c %CHANNEL_NAME% -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/ProducerMSPanchors.tx --tls --cafile %ORDERER_CA%
echo   ProducerMSP anchor updated

REM Distributor anchor
docker exec -i -e CORE_PEER_LOCALMSPID=DistributorMSP -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/users/Admin@distributor.supplychain.com/msp" cli peer channel update -o orderer1.supplychain.com:7050 -c %CHANNEL_NAME% -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/DistributorMSPanchors.tx --tls --cafile %ORDERER_CA%
echo   DistributorMSP anchor updated

REM Hospital anchor
docker exec -i -e CORE_PEER_LOCALMSPID=HospitalMSP -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/users/Admin@hospital.supplychain.com/msp" cli peer channel update -o orderer1.supplychain.com:7050 -c %CHANNEL_NAME% -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/HospitalMSPanchors.tx --tls --cafile %ORDERER_CA%
echo   HospitalMSP anchor updated

REM Regulator anchor
docker exec -i -e CORE_PEER_LOCALMSPID=RegulatorMSP -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/users/Admin@regulator.supplychain.com/msp" cli peer channel update -o orderer1.supplychain.com:7050 -c %CHANNEL_NAME% -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/RegulatorMSPanchors.tx --tls --cafile %ORDERER_CA%
echo   RegulatorMSP anchor updated

echo [OK] All anchor peers updated
echo.

echo [4/5] Verifying channel status...
docker exec -i cli peer channel getinfo -c %CHANNEL_NAME%
echo.

echo [5/5] Channel list...
docker exec -i cli peer channel list
echo.

echo ============================================================
echo    Channel Created Successfully!
echo ============================================================
echo.
echo NEXT: Run deployChaincode.bat to deploy chaincode
echo.
pause
