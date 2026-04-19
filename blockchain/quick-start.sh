#!/bin/bash
# =============================================================================
# 医用耗材供应链区块链 - 一键启动脚本
# 功能: 安装依赖、启动网络、创建通道、部署链码
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="${SCRIPT_DIR}/network"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     医用耗材供应链区块链网络 - 一键启动脚本               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查 Docker
check_docker() {
    echo -e "${YELLOW}[检查] Docker...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker 未安装${NC}"
        echo -e "${YELLOW}请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop${NC}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}✗ Docker 未运行${NC}"
        echo -e "${YELLOW}请先启动 Docker Desktop${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Docker 已就绪${NC}"
}

# 检查 Fabric 工具
check_fabric_tools() {
    echo -e "${YELLOW}[检查] Fabric 工具...${NC}"

    # 检查是否已有 Fabric 工具
    if command -v peer &> /dev/null && command -v cryptogen &> /dev/null; then
        echo -e "${GREEN}✓ Fabric 工具已安装${NC}"
        return 0
    fi

    # 检查本地安装目录
    LOCAL_BIN="${HOME}/fabric-tools/bin"
    if [ -f "${LOCAL_BIN}/peer" ] && [ -f "${LOCAL_BIN}/cryptogen" ]; then
        export PATH="${LOCAL_BIN}:${PATH}"
        echo -e "${GREEN}✓ 使用本地 Fabric 工具: ${LOCAL_BIN}${NC}"
        return 0
    fi

    echo -e "${YELLOW}Fabric 工具未安装，正在安装...${NC}"
    bash "${NETWORK_DIR}/scripts/installFabric.sh"

    # 设置路径
    export PATH="${HOME}/fabric-tools/bin:${PATH}"
}

# 主流程
main() {
    echo ""
    check_docker
    echo ""
    check_fabric_tools
    echo ""

    # 添加到 PATH
    export PATH="${HOME}/fabric-tools/bin:${PATH}"

    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}    步骤 1/4: 启动区块链网络${NC}"
    echo -e "${BLUE}============================================================${NC}"
    cd "${NETWORK_DIR}"
    bash scripts/startNetwork.sh
    echo ""

    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}    步骤 2/4: 创建通道${NC}"
    echo -e "${BLUE}============================================================${NC}"
    bash scripts/createChannel.sh
    echo ""

    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}    步骤 3/4: 部署智能合约${NC}"
    echo -e "${BLUE}============================================================${NC}"
    bash scripts/deployChaincode.sh
    echo ""

    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}    步骤 4/4: 验证网络${NC}"
    echo -e "${BLUE}============================================================${NC}"

    # 验证容器状态
    echo -e "${YELLOW}容器状态:${NC}"
    docker compose -f "${NETWORK_DIR}/docker-compose.yaml" ps

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              区块链网络启动成功!                           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}下一步:${NC}"
    echo -e "  1. 启动后端服务: ${BLUE}cd ../backend && npm run dev${NC}"
    echo -e "  2. 启动前端服务: ${BLUE}cd ../frontend && npm run dev${NC}"
    echo -e "  3. 访问系统: ${BLUE}http://localhost:5173${NC}"
    echo ""
}

main "$@"
