#!/bin/bash
# =============================================================================
# 基于区块链的医用耗材供应链管理系统 - 网络启动脚本
# 功能: 生成证书、创世块，并启动Fabric网络
# =============================================================================

set -e

# 颜色输出定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_DIR="${NETWORK_DIR}/config"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}    医用耗材供应链区块链网络 - 启动脚本${NC}"
echo -e "${BLUE}============================================================${NC}"

# 检查依赖工具
check_dependencies() {
    echo -e "${YELLOW}[1/6] 检查依赖工具...${NC}"

    # 检查cryptogen
    if ! command -v cryptogen &> /dev/null; then
        echo -e "${RED}错误: cryptogen 未安装，请先安装 Hyperledger Fabric 工具${NC}"
        exit 1
    fi

    # 检查configtxgen
    if ! command -v configtxgen &> /dev/null; then
        echo -e "${RED}错误: configtxgen 未安装，请先安装 Hyperledger Fabric 工具${NC}"
        exit 1
    fi

    # 检查docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: docker 未安装${NC}"
        exit 1
    fi

    # 检查docker-compose (支持新旧两种命令)
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        echo -e "${RED}错误: docker-compose 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}  使用: ${DOCKER_COMPOSE}${NC}"

    echo -e "${GREEN}✓ 所有依赖工具检查通过${NC}"
}

# 清理旧数据
clean_old_data() {
    echo -e "${YELLOW}[2/6] 清理旧数据...${NC}"

    cd "${NETWORK_DIR}"

    # 停止并删除容器
    ${DOCKER_COMPOSE} down --volumes 2>/dev/null || true

    # 删除旧的加密材料
    rm -rf crypto-config
    rm -rf config/*.block config/*.tx

    # 删除docker卷
    docker volume prune -f 2>/dev/null || true

    echo -e "${GREEN}✓ 旧数据清理完成${NC}"
}

# 生成加密材料（证书）
generate_crypto_material() {
    echo -e "${YELLOW}[3/6] 生成加密材料（MSP证书和TLS证书）...${NC}"

    cd "${NETWORK_DIR}"

    # 使用cryptogen生成证书
    cryptogen generate --config=crypto-config.yaml --output=crypto-config

    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: 加密材料生成失败${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ 加密材料生成完成${NC}"
    echo -e "  ${BLUE}生成的组织:${NC}"
    echo -e "    - OrdererMSP (排序组织)"
    echo -e "    - ProducerMSP (生产商组织)"
    echo -e "    - DistributorMSP (经销商组织)"
    echo -e "    - HospitalMSP (医院组织)"
    echo -e "    - RegulatorMSP (监管机构)"
}

# 生成创世块和通道配置
generate_genesis_block() {
    echo -e "${YELLOW}[4/6] 生成创世块和通道配置...${NC}"

    mkdir -p "${CONFIG_DIR}"
    cd "${NETWORK_DIR}"

    # 设置FABRIC_CFG_PATH环境变量
    export FABRIC_CFG_PATH="${NETWORK_DIR}"

    # 生成创世区块
    configtxgen -profile SupplyChainGenesis -channelID system-channel -outputBlock "${CONFIG_DIR}/genesis.block"

    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: 创世块生成失败${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ 创世块生成完成: ${CONFIG_DIR}/genesis.block${NC}"
}

# 生成通道配置交易
generate_channel_tx() {
    echo -e "${YELLOW}[5/6] 生成通道配置交易...${NC}"

    cd "${NETWORK_DIR}"
    export FABRIC_CFG_PATH="${NETWORK_DIR}"

    # 生成通道创建交易
    configtxgen -profile SupplyChainChannel -outputCreateChannelTx "${CONFIG_DIR}/supplychain-channel.tx" -channelID supplychain-channel

    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: 通道配置交易生成失败${NC}"
        exit 1
    fi

    # 为每个组织生成锚节点配置
    configtxgen -profile SupplyChainChannel -outputAnchorPeersUpdate "${CONFIG_DIR}/ProducerMSPanchors.tx" -channelID supplychain-channel -asOrg ProducerMSP
    configtxgen -profile SupplyChainChannel -outputAnchorPeersUpdate "${CONFIG_DIR}/DistributorMSPanchors.tx" -channelID supplychain-channel -asOrg DistributorMSP
    configtxgen -profile SupplyChainChannel -outputAnchorPeersUpdate "${CONFIG_DIR}/HospitalMSPanchors.tx" -channelID supplychain-channel -asOrg HospitalMSP
    configtxgen -profile SupplyChainChannel -outputAnchorPeersUpdate "${CONFIG_DIR}/RegulatorMSPanchors.tx" -channelID supplychain-channel -asOrg RegulatorMSP

    echo -e "${GREEN}✓ 通道配置交易生成完成${NC}"
}

# 启动Docker容器
start_docker_containers() {
    echo -e "${YELLOW}[6/6] 启动Docker容器...${NC}"

    cd "${NETWORK_DIR}"

    # 启动所有容器
    ${DOCKER_COMPOSE} up -d

    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: Docker容器启动失败${NC}"
        exit 1
    fi

    # 等待容器启动完成
    echo -e "${BLUE}等待容器启动...${NC}"
    sleep 15

    # 检查容器状态
    echo -e "${BLUE}容器状态:${NC}"
    ${DOCKER_COMPOSE} ps

    echo -e "${GREEN}✓ 网络启动完成${NC}"
}

# 主函数
main() {
    echo ""
    check_dependencies
    echo ""
    clean_old_data
    echo ""
    generate_crypto_material
    echo ""
    generate_genesis_block
    echo ""
    generate_channel_tx
    echo ""
    start_docker_containers
    echo ""

    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}    网络启动成功!${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "${YELLOW}下一步:${NC}"
    echo -e "  1. 运行 ${BLUE}./scripts/createChannel.sh${NC} 创建通道"
    echo -e "  2. 运行 ${BLUE}./scripts/deployChaincode.sh${NC} 部署智能合约"
    echo ""
}

main "$@"
