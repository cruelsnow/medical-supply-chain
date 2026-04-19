#!/bin/bash
# =============================================================================
# 基于区块链的医用耗材供应链管理系统 - 通道创建脚本
# 功能: 创建应用通道并让所有组织节点加入通道
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
NETWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${NETWORK_DIR}/config"

# TLS证书路径
ORDERER_CA="${NETWORK_DIR}/crypto-config/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}    创建应用通道 - ${CHANNEL_NAME}${NC}"
echo -e "${BLUE}============================================================${NC}"

# 设置环境变量函数
set_peer_env() {
    local org=$1
    local peer=$2

    # 清除旧的环境变量
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

# 创建通道
create_channel() {
    echo -e "${YELLOW}[1/5] 创建通道 ${CHANNEL_NAME}...${NC}"

    set_peer_env "producer" "peer0"

    docker exec -i cli peer channel create \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/supplychain-channel.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: 通道创建失败${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ 通道创建成功${NC}"
}

# 组织加入通道
join_channel() {
    local org=$1
    local peer=$2

    echo -e "${YELLOW}  ${peer}.${org}.supplychain.com 加入通道...${NC}"

    set_peer_env "${org}" "${peer}"

    docker exec -i cli peer channel join \
        -b ${CHANNEL_NAME}.block \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem

    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: ${peer}.${org} 加入通道失败${NC}"
        return 1
    fi

    echo -e "${GREEN}  ✓ ${peer}.${org} 已加入通道${NC}"
}

# 所有组织加入通道
all_peers_join_channel() {
    echo -e "${YELLOW}[2/5] 所有Peer节点加入通道...${NC}"

    # 生产商组织
    join_channel "producer" "peer0"
    join_channel "producer" "peer1"

    # 经销商组织
    join_channel "distributor" "peer0"
    join_channel "distributor" "peer1"

    # 医院组织
    join_channel "hospital" "peer0"
    join_channel "hospital" "peer1"

    # 监管机构
    join_channel "regulator" "peer0"
    join_channel "regulator" "peer1"

    echo -e "${GREEN}✓ 所有Peer节点已加入通道${NC}"
}

# 更新锚节点配置
update_anchor_peers() {
    echo -e "${YELLOW}[3/5] 更新锚节点配置...${NC}"

    # 生产商锚节点
    set_peer_env "producer" "peer0"
    docker exec -i cli peer channel update \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/ProducerMSPanchors.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem
    echo -e "${GREEN}  ✓ ProducerMSP 锚节点更新完成${NC}"

    # 经销商锚节点
    set_peer_env "distributor" "peer0"
    docker exec -i cli peer channel update \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/DistributorMSPanchors.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem
    echo -e "${GREEN}  ✓ DistributorMSP 锚节点更新完成${NC}"

    # 医院锚节点
    set_peer_env "hospital" "peer0"
    docker exec -i cli peer channel update \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/HospitalMSPanchors.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem
    echo -e "${GREEN}  ✓ HospitalMSP 锚节点更新完成${NC}"

    # 监管机构锚节点
    set_peer_env "regulator" "peer0"
    docker exec -i cli peer channel update \
        -o orderer1.supplychain.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/RegulatorMSPanchors.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem
    echo -e "${GREEN}  ✓ RegulatorMSP 锚节点更新完成${NC}"

    echo -e "${GREEN}✓ 所有锚节点配置更新完成${NC}"
}

# 验证通道
verify_channel() {
    echo -e "${YELLOW}[4/5] 验证通道状态...${NC}"

    set_peer_env "producer" "peer0"

    # 获取通道信息
    docker exec -i cli peer channel getinfo -c ${CHANNEL_NAME}

    echo -e "${GREEN}✓ 通道验证完成${NC}"
}

# 显示加入的通道列表
list_channels() {
    echo -e "${YELLOW}[5/5] 通道列表...${NC}"

    set_peer_env "producer" "peer0"
    docker exec -i cli peer channel list

    echo -e "${GREEN}✓ 通道创建流程完成${NC}"
}

# 主函数
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
    echo -e "${GREEN}    通道创建成功!${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "${YELLOW}下一步:${NC}"
    echo -e "  运行 ${BLUE}./scripts/deployChaincode.sh${NC} 部署智能合约"
    echo ""
}

main "$@"
