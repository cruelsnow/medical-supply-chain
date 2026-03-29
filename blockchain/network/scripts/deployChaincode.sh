#!/bin/bash
# =============================================================================
# Medical Supply Chain Blockchain System - Chaincode Deployment Script
# Function: Package, install, approve and commit chaincode to channel
# =============================================================================

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Config
CHANNEL_NAME="supplychain-channel"
CHAINCODE_NAME="supplychain"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"
CHAINCODE_LOCAL_PATH="../chaincode/supplychain"
CHAINCODE_CONTAINER_PATH="chaincode/supplychain"
NETWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Endorsement policy: any organization can endorse
ENDORSEMENT_POLICY="OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}    Deploy Chaincode - ${CHAINCODE_NAME}${NC}"
echo -e "${BLUE}============================================================${NC}"

# Set peer environment
set_peer_env() {
    local org=$1
    local peer=$2

    unset CORE_PEER_LOCALMSPID
    unset CORE_PEER_TLS_ROOTCERT_FILE
    unset CORE_PEER_MSPCONFIGPATH
    unset CORE_PEER_ADDRESS

    case $org in
        "producer")
            export CORE_PEER_LOCALMSPID="ProducerMSP"
            export CORE_PEER_TLS_ROOTCERT_FILE="${NETWORK_DIR}/crypto-config/peerOrganizations/producer.supplychain.com/peers/${peer}.producer.supplychain.com/tls/ca.crt"
            export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/crypto-config/peerOrganizations/producer.supplychain.com/users/Admin@producer.supplychain.com/msp"
            export CORE_PEER_ADDRESS="${peer}.producer.supplychain.com:7051"
            ;;
        "distributor")
            export CORE_PEER_LOCALMSPID="DistributorMSP"
            export CORE_PEER_TLS_ROOTCERT_FILE="${NETWORK_DIR}/crypto-config/peerOrganizations/distributor.supplychain.com/peers/${peer}.distributor.supplychain.com/tls/ca.crt"
            export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/crypto-config/peerOrganizations/distributor.supplychain.com/users/Admin@distributor.supplychain.com/msp"
            export CORE_PEER_ADDRESS="${peer}.distributor.supplychain.com:7051"
            ;;
        "hospital")
            export CORE_PEER_LOCALMSPID="HospitalMSP"
            export CORE_PEER_TLS_ROOTCERT_FILE="${NETWORK_DIR}/crypto-config/peerOrganizations/hospital.supplychain.com/peers/${peer}.hospital.supplychain.com/tls/ca.crt"
            export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/crypto-config/peerOrganizations/hospital.supplychain.com/users/Admin@hospital.supplychain.com/msp"
            export CORE_PEER_ADDRESS="${peer}.hospital.supplychain.com:7051"
            ;;
        "regulator")
            export CORE_PEER_LOCALMSPID="RegulatorMSP"
            export CORE_PEER_TLS_ROOTCERT_FILE="${NETWORK_DIR}/crypto-config/peerOrganizations/regulator.supplychain.com/peers/${peer}.regulator.supplychain.com/tls/ca.crt"
            export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/crypto-config/peerOrganizations/regulator.supplychain.com/users/Admin@regulator.supplychain.com/msp"
            export CORE_PEER_ADDRESS="${peer}.regulator.supplychain.com:7051"
            ;;
    esac
}

# Package chaincode
package_chaincode() {
    echo -e "${YELLOW}[1/5] Packaging chaincode...${NC}"

    cd "${NETWORK_DIR}"

    if [ ! -d "${CHAINCODE_LOCAL_PATH}" ]; then
        echo -e "${RED}ERROR: Chaincode directory not found: ${CHAINCODE_LOCAL_PATH}${NC}"
        exit 1
    fi

    docker exec -i cli peer lifecycle chaincode package \
        ${CHAINCODE_NAME}.tar.gz \
        --path /opt/gopath/src/github.com/hyperledger/fabric/peer/${CHAINCODE_CONTAINER_PATH} \
        --lang golang \
        --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}

    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Chaincode packaging failed${NC}"
        exit 1
    fi

    echo -e "${GREEN}Chaincode packaged: ${CHAINCODE_NAME}.tar.gz${NC}"
}

# Install chaincode on peer
install_chaincode() {
    local org=$1
    local peer=$2

    echo -e "${YELLOW}  Installing on ${peer}.${org}...${NC}"

    set_peer_env "${org}" "${peer}"

    local output
    output=$(docker exec -i cli peer lifecycle chaincode install \
        ${CHAINCODE_NAME}.tar.gz \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem 2>&1)

    local result=$?
    echo "$output"

    if [ $result -ne 0 ]; then
        if echo "$output" | grep -q "already successfully installed"; then
            echo -e "${GREEN}  ${peer}.${org} chaincode already installed, skipping${NC}"
            return 0
        fi
        echo -e "${RED}ERROR: ${peer}.${org} install failed${NC}"
        return 1
    fi

    echo -e "${GREEN}  ${peer}.${org} chaincode installed${NC}"
}

# Install chaincode on all peers
install_chaincode_all() {
    echo -e "${YELLOW}[2/5] Installing chaincode on all peers...${NC}"

    install_chaincode "producer" "peer0"
    install_chaincode "producer" "peer1"
    install_chaincode "distributor" "peer0"
    install_chaincode "distributor" "peer1"
    install_chaincode "hospital" "peer0"
    install_chaincode "hospital" "peer1"
    install_chaincode "regulator" "peer0"
    install_chaincode "regulator" "peer1"

    echo -e "${GREEN}All peers chaincode installed${NC}"
}

# Get package ID
get_package_id() {
    echo -e "${YELLOW}[3/5] Getting package ID...${NC}"

    set_peer_env "producer" "peer0"

    docker exec -i cli peer lifecycle chaincode queryinstalled \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    PACKAGE_ID=$(docker exec -i cli peer lifecycle chaincode queryinstalled \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem \
        | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" \
        | awk '{print $3}' \
        | sed 's/,//')

    echo -e "${GREEN}Package ID: ${PACKAGE_ID}${NC}"
}

# Approve chaincode definition
approve_chaincode() {
    local org=$1
    local peer=$2

    echo -e "${YELLOW}  ${org} approving chaincode definition...${NC}"

    set_peer_env "${org}" "${peer}"

    PACKAGE_ID=$(docker exec -i cli peer lifecycle chaincode queryinstalled \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem \
        | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" \
        | awk '{print $3}' \
        | sed 's/,//')

    docker exec -i cli peer lifecycle chaincode approveformyorg \
        -o orderer1.supplychain.com:7050 \
        --channelID ${CHANNEL_NAME} \
        --name ${CHAINCODE_NAME} \
        --version ${CHAINCODE_VERSION} \
        --sequence ${CHAINCODE_SEQUENCE} \
        --package-id ${PACKAGE_ID} \
        --signature-policy "${ENDORSEMENT_POLICY}" \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: ${org} approval failed${NC}"
        return 1
    fi

    echo -e "${GREEN}  ${org} approved chaincode definition${NC}"
}

# All orgs approve chaincode
approve_chaincode_all() {
    echo -e "${YELLOW}[4/5] All organizations approving chaincode definition...${NC}"

    approve_chaincode "producer" "peer0"
    approve_chaincode "distributor" "peer0"
    approve_chaincode "hospital" "peer0"
    approve_chaincode "regulator" "peer0"

    echo -e "${GREEN}All organizations approved chaincode definition${NC}"
}

# Commit chaincode definition
commit_chaincode() {
    echo -e "${YELLOW}[5/5] Committing chaincode definition to channel...${NC}"

    set_peer_env "producer" "peer0"

    echo -e "${BLUE}Checking commit readiness...${NC}"
    docker exec -i cli peer lifecycle chaincode checkcommitreadiness \
        --channelID ${CHANNEL_NAME} \
        --name ${CHAINCODE_NAME} \
        --version ${CHAINCODE_VERSION} \
        --sequence ${CHAINCODE_SEQUENCE} \
        --signature-policy "${ENDORSEMENT_POLICY}" \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    docker exec -i cli peer lifecycle chaincode commit \
        -o orderer1.supplychain.com:7050 \
        --channelID ${CHANNEL_NAME} \
        --name ${CHAINCODE_NAME} \
        --version ${CHAINCODE_VERSION} \
        --sequence ${CHAINCODE_SEQUENCE} \
        --signature-policy "${ENDORSEMENT_POLICY}" \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem \
        --peerAddresses peer0.producer.supplychain.com:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt \
        --peerAddresses peer0.distributor.supplychain.com:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt \
        --peerAddresses peer0.hospital.supplychain.com:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt \
        --peerAddresses peer0.regulator.supplychain.com:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt

    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Chaincode commit failed${NC}"
        exit 1
    fi

    echo -e "${GREEN}Chaincode committed${NC}"
}

# Verify chaincode deployment
verify_chaincode() {
    echo -e "${YELLOW}Verifying chaincode deployment...${NC}"

    set_peer_env "producer" "peer0"

    docker exec -i cli peer lifecycle chaincode querycommitted \
        --channelID ${CHANNEL_NAME} \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    echo -e "${GREEN}Chaincode deployment verified${NC}"
}

# Test chaincode invocation
test_chaincode() {
    echo -e "${YELLOW}Testing chaincode initialization...${NC}"

    set_peer_env "producer" "peer0"

    echo -e "${BLUE}Invoking InitAsset to create test asset...${NC}"
    docker exec -i cli peer chaincode invoke \
        -o orderer1.supplychain.com:7050 \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem \
        --peerAddresses peer0.producer.supplychain.com:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt \
        -c '{"function":"InitAsset","Args":["UDI_TEST_001","Test Supply","100ml","BATCH001","2024-01-01","2025-01-01","test_hash_123"]}'

    echo -e "${BLUE}Querying test asset...${NC}"
    docker exec -i cli peer chaincode query \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        -c '{"function":"QueryAsset","Args":["UDI_TEST_001"]}'

    echo -e "${GREEN}Chaincode test completed${NC}"
}

# Main
main() {
    echo ""
    package_chaincode
    echo ""
    install_chaincode_all
    echo ""
    get_package_id
    echo ""
    approve_chaincode_all
    echo ""
    commit_chaincode
    echo ""
    verify_chaincode
    echo ""
    test_chaincode
    echo ""

    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}    Chaincode Deployed Successfully!${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "${YELLOW}Chaincode Info:${NC}"
    echo -e "  Name: ${BLUE}${CHAINCODE_NAME}${NC}"
    echo -e "  Version: ${BLUE}${CHAINCODE_VERSION}${NC}"
    echo -e "  Channel: ${BLUE}${CHANNEL_NAME}${NC}"
    echo ""
    echo -e "${YELLOW}NEXT:${NC}"
    echo -e "  1. Start backend: ${BLUE}cd backend && npm run dev${NC}"
    echo -e "  2. Start frontend: ${BLUE}cd frontend && npm run dev${NC}"
    echo ""
}

main "$@"
