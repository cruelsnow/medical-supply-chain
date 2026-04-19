#!/bin/bash
# =============================================================================
# 基于区块链的医用耗材供应链管理系统 - 链码升级脚本
# 功能: 升级链码定义以应用新的背书策略
# =============================================================================

set -e

# 颜色输出定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
CHANNEL_NAME="supplychain-channel"
CHAINCODE_NAME="supplychain"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="2"  # 升级需要增加序列号

# 新的背书策略: 任意一个组织背书即可
ENDORSEMENT_POLICY="OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')"

NETWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}    升级链码背书策略 - ${CHAINCODE_NAME}${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "${YELLOW}新策略: ${ENDORSEMENT_POLICY}${NC}"
echo ""

# 设置环境变量函数
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

# 获取已安装的链码包ID
get_package_id() {
    set_peer_env "producer" "peer0"

    # 查询已安装的链码
    docker exec -i cli peer lifecycle chaincode queryinstalled \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    # 获取Package ID
    PACKAGE_ID=$(docker exec -i cli peer lifecycle chaincode queryinstalled \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem \
        | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" \
        | awk '{print $3}' \
        | sed 's/,//')

    echo -e "${GREEN}✓ 链码包ID: ${PACKAGE_ID}${NC}"
}

# 组织批准链码定义（带新策略）
approve_chaincode() {
    local org=$1
    local peer=$2

    echo -e "${YELLOW}  ${org} 批准新的链码定义...${NC}"

    set_peer_env "${org}" "${peer}"

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
        echo -e "${RED}错误: ${org} 批准链码失败${NC}"
        return 1
    fi

    echo -e "${GREEN}  ✓ ${org} 已批准新策略${NC}"
}

# 提交新的链码定义
commit_chaincode() {
    echo -e "${YELLOW}[3/4] 提交新的链码定义...${NC}"

    set_peer_env "producer" "peer0"

    # 检查提交准备状态
    echo -e "${BLUE}检查提交准备状态...${NC}"
    docker exec -i cli peer lifecycle chaincode checkcommitreadiness \
        --channelID ${CHANNEL_NAME} \
        --name ${CHAINCODE_NAME} \
        --version ${CHAINCODE_VERSION} \
        --sequence ${CHAINCODE_SEQUENCE} \
        --signature-policy "${ENDORSEMENT_POLICY}" \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    # 提交链码定义
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
        echo -e "${RED}错误: 链码提交失败${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ 链码提交成功${NC}"
}

# 验证链码
verify_chaincode() {
    echo -e "${YELLOW}[4/4] 验证链码定义...${NC}"

    set_peer_env "producer" "peer0"

    # 查询已提交的链码
    docker exec -i cli peer lifecycle chaincode querycommitted \
        --channelID ${CHANNEL_NAME} \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    echo -e "${GREEN}✓ 链码验证完成${NC}"
}

# 主函数
main() {
    cd "${NETWORK_DIR}"

    echo -e "${YELLOW}[1/4] 获取链码包ID...${NC}"
    get_package_id
    echo ""

    echo -e "${YELLOW}[2/4] 所有组织批准新策略...${NC}"
    approve_chaincode "producer" "peer0"
    approve_chaincode "distributor" "peer0"
    approve_chaincode "hospital" "peer0"
    approve_chaincode "regulator" "peer0"
    echo -e "${GREEN}✓ 所有组织已批准新策略${NC}"
    echo ""

    commit_chaincode
    echo ""

    verify_chaincode
    echo ""

    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}    链码背书策略升级成功!${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "${YELLOW}新策略: 任意一个组织背书即可${NC}"
    echo ""
}

main "$@"
