#!/bin/bash
# =============================================================================
# Medical Supply Chain Blockchain System - Channel Creation Script
# Function: Create application channel and join all peer nodes
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
NETWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${NETWORK_DIR}/config"

# TLS cert path
ORDERER_CA="${NETWORK_DIR}/crypto-config/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}    Create Channel - ${CHANNEL_NAME}${NC}"
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

# Create channel
create_channel() {
    echo -e "${YELLOW}[1/5] Creating channel ${CHANNEL_NAME}...${NC}"

    set_peer_env "producer" "peer0"

    docker exec -i cli peer channel create \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/supplychain-channel.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Channel creation failed${NC}"
        exit 1
    fi

    echo -e "${GREEN}Channel created successfully${NC}"
}

# Join channel
join_channel() {
    local org=$1
    local peer=$2

    echo -e "${YELLOW}  ${peer}.${org}.supplychain.com joining channel...${NC}"

    set_peer_env "${org}" "${peer}"

    docker exec -i cli peer channel join \
        -b ${CHANNEL_NAME}.block \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: ${peer}.${org} failed to join channel${NC}"
        return 1
    fi

    echo -e "${GREEN}  ${peer}.${org} joined channel${NC}"
}

# All peers join channel
all_peers_join_channel() {
    echo -e "${YELLOW}[2/5] All peer nodes joining channel...${NC}"

    # Producer org
    join_channel "producer" "peer0"
    join_channel "producer" "peer1"

    # Distributor org
    join_channel "distributor" "peer0"
    join_channel "distributor" "peer1"

    # Hospital org
    join_channel "hospital" "peer0"
    join_channel "hospital" "peer1"

    # Regulator org
    join_channel "regulator" "peer0"
    join_channel "regulator" "peer1"

    echo -e "${GREEN}All peers joined channel${NC}"
}

# Update anchor peers
update_anchor_peers() {
    echo -e "${YELLOW}[3/5] Updating anchor peers...${NC}"

    # Producer anchor peer
    set_peer_env "producer" "peer0"
    docker exec -i cli peer channel update \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/ProducerMSPanchors.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem
    echo -e "${GREEN}  ProducerMSP anchor peer updated${NC}"

    # Distributor anchor peer
    set_peer_env "distributor" "peer0"
    docker exec -i cli peer channel update \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/DistributorMSPanchors.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem
    echo -e "${GREEN}  DistributorMSP anchor peer updated${NC}"

    # Hospital anchor peer
    set_peer_env "hospital" "peer0"
    docker exec -i cli peer channel update \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/HospitalMSPanchors.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem
    echo -e "${GREEN}  HospitalMSP anchor peer updated${NC}"

    # Regulator anchor peer
    set_peer_env "regulator" "peer0"
    docker exec -i cli peer channel update \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/RegulatorMSPanchors.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem
    echo -e "${GREEN}  RegulatorMSP anchor peer updated${NC}"

    echo -e "${GREEN}All anchor peers updated${NC}"
}

# Verify channel
verify_channel() {
    echo -e "${YELLOW}[4/5] Verifying channel status...${NC}"

    set_peer_env "producer" "peer0"

    docker exec -i cli peer channel getinfo -c ${CHANNEL_NAME}

    echo -e "${GREEN}Channel verified${NC}"
}

# List channels
list_channels() {
    echo -e "${YELLOW}[5/5] Channel list...${NC}"

    set_peer_env "producer" "peer0"
    docker exec -i cli peer channel list

    echo -e "${GREEN}Channel creation completed${NC}"
}

# Main
main() {
    echo ""
    create_channel
    echo ""
    all_peers_join_channel
    echo ""
    update_anchor_peers
    echo ""
    verify_channel
    echo ""
    list_channels
    echo ""

    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}    Channel Created Successfully!${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "${YELLOW}NEXT:${NC}"
    echo -e "  Run ${BLUE}./scripts/deployChaincode.sh${NC} to deploy chaincode"
    echo ""
}

main "$@"
