#!/bin/bash
# =============================================================================
# 基于区块链的医用耗材供应链管理系统 - 链码部署脚本
# 功能: 打包、安装、批准并提交智能合约到通道
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
CHAINCODE_SEQUENCE="1"
CHAINCODE_LOCAL_PATH="../chaincode/supplychain"  # 宿主机路径
CHAINCODE_CONTAINER_PATH="chaincode/supplychain"  # 容器内路径
NETWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 背书策略: 任意一个组织背书即可
ENDORSEMENT_POLICY="OR('ProducerMSP.member','DistributorMSP.member','HospitalMSP.member','RegulatorMSP.member')"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}    部署智能合约 - ${CHAINCODE_NAME}${NC}"
echo -e "${BLUE}============================================================${NC}"

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

# 打包链码
package_chaincode() {
    echo -e "${YELLOW}[1/5] 打包链码...${NC}"

    cd "${NETWORK_DIR}"

    # 检查链码是否存在
    if [ ! -d "${CHAINCODE_LOCAL_PATH}" ]; then
        echo -e "${RED}错误: 链码目录不存在: ${CHAINCODE_LOCAL_PATH}${NC}"
        exit 1
    fi

    # 打包链码
    docker exec -i cli peer lifecycle chaincode package \
        ${CHAINCODE_NAME}.tar.gz \
        --path /opt/gopath/src/github.com/hyperledger/fabric/peer/${CHAINCODE_CONTAINER_PATH} \
        --lang golang \
        --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}

    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: 链码打包失败${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ 链码打包完成: ${CHAINCODE_NAME}.tar.gz${NC}"
}

# 在指定组织的Peer上安装链码
install_chaincode() {
    local org=$1
    local peer=$2

    echo -e "${YELLOW}  在 ${peer}.${org} 上安装链码...${NC}"

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
            echo -e "${GREEN}  ✓ ${peer}.${org} 链码已安装，跳过${NC}"
            return 0
        fi
        echo -e "${RED}错误: ${peer}.${org} 安装链码失败${NC}"
        return 1
    fi

    echo -e "${GREEN}  ✓ ${peer}.${org} 链码安装完成${NC}"
}

# 在所有组织上安装链码
install_chaincode_all() {
    echo -e "${YELLOW}[2/5] 在所有Peer节点安装链码...${NC}"

    # 生产商组织
    install_chaincode "producer" "peer0"
    install_chaincode "producer" "peer1"

    # 经销商组织
    install_chaincode "distributor" "peer0"
    install_chaincode "distributor" "peer1"

    # 医院组织
    install_chaincode "hospital" "peer0"
    install_chaincode "hospital" "peer1"

    # 监管机构
    install_chaincode "regulator" "peer0"
    install_chaincode "regulator" "peer1"

    echo -e "${GREEN}✓ 所有节点链码安装完成${NC}"
}

# 获取链码包ID
get_package_id() {
    echo -e "${YELLOW}[3/5] 获取链码包ID...${NC}"

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

# 组织批准链码定义
approve_chaincode() {
    local org=$1
    local peer=$2

    echo -e "${YELLOW}  ${org} 批准链码定义...${NC}"

    set_peer_env "${org}" "${peer}"

    # 获取Package ID
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
        echo -e "${RED}错误: ${org} 批准链码失败${NC}"
        return 1
    fi

    echo -e "${GREEN}  ✓ ${org} 已批准链码定义${NC}"
}

# 所有组织批准链码
approve_chaincode_all() {
    echo -e "${YELLOW}[4/5] 所有组织批准链码定义...${NC}"

    approve_chaincode "producer" "peer0"
    approve_chaincode "distributor" "peer0"
    approve_chaincode "hospital" "peer0"
    approve_chaincode "regulator" "peer0"

    echo -e "${GREEN}✓ 所有组织已批准链码定义${NC}"
}

# 提交链码定义
commit_chaincode() {
    echo -e "${YELLOW}[5/5] 提交链码定义到通道...${NC}"

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

# 验证链码部署
verify_chaincode() {
    echo -e "${YELLOW}验证链码部署...${NC}"

    set_peer_env "producer" "peer0"

    # 查询已提交的链码
    docker exec -i cli peer lifecycle chaincode querycommitted \
        --channelID ${CHANNEL_NAME} \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    echo -e "${GREEN}✓ 链码部署验证完成${NC}"
}

# 测试链码调用
test_chaincode() {
    echo -e "${YELLOW}测试链码初始化...${NC}"

    set_peer_env "producer" "peer0"

    # 初始化测试资产
    echo -e "${BLUE}调用 InitAsset 创建测试资产...${NC}"
    docker exec -i cli peer chaincode invoke \
        -o orderer1.supplychain.com:7050 \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem \
        --peerAddresses peer0.producer.supplychain.com:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt \
        -c '{"function":"InitAsset","Args":["UDI_TEST_001","测试耗材","100ml","BATCH001","500","2024-01-01","2025-01-01","test_hash_1234567890123456789012345678901234567890123456789012345678901234","测试生产商"]}'

    # 查询测试资产
    echo -e "${BLUE}查询测试资产...${NC}"
    docker exec -i cli peer chaincode query \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        -c '{"function":"QueryAsset","Args":["UDI_TEST_001"]}'

    echo -e "${GREEN}✓ 链码测试完成${NC}"
}

# 主函数
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
    echo -e "${GREEN}    智能合约部署成功!${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "${YELLOW}链码信息:${NC}"
    echo -e "  名称: ${BLUE}${CHAINCODE_NAME}${NC}"
    echo -e "  版本: ${BLUE}${CHAINCODE_VERSION}${NC}"
    echo -e "  通道: ${BLUE}${CHANNEL_NAME}${NC}"
    echo ""
    echo -e "${YELLOW}下一步:${NC}"
    echo -e "  1. 启动后端服务: ${BLUE}cd backend && npm run dev${NC}"
    echo -e "  2. 启动前端应用: ${BLUE}cd frontend && npm run dev${NC}"
    echo ""
}

main "$@"
