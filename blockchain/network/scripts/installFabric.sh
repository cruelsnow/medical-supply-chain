#!/bin/bash
# =============================================================================
# Hyperledger Fabric 安装脚本
# 功能: 下载并安装 Fabric 工具和 Docker 镜像
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fabric 版本
FABRIC_VERSION=2.5.9
CA_VERSION=1.5.12

# 安装目录
FABRIC_DIR="${HOME}/fabric-tools"
BIN_DIR="${FABRIC_DIR}/bin"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}    Hyperledger Fabric 安装脚本${NC}"
echo -e "${BLUE}============================================================${NC}"

# 检查系统类型
detect_system() {
    echo -e "${YELLOW}检测系统类型...${NC}"
    OS="$(uname)"
    if [ "$OS" = "Darwin" ]; then
        ARCH="darwin"
        if [ "$(uname -m)" = "arm64" ]; then
            ARCH="${ARCH}-arm64"
        else
            ARCH="${ARCH}-amd64"
        fi
    elif [ "$OS" = "Linux" ]; then
        ARCH="linux-amd64"
    else
        echo -e "${RED}不支持的系统: $OS${NC}"
        exit 1
    fi
    echo -e "${GREEN}检测到系统: ${OS} ${ARCH}${NC}"
}

# 检查 Docker
check_docker() {
    echo -e "${YELLOW}检查 Docker...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker 未安装，请先安装 Docker Desktop${NC}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}Docker 未运行，请先启动 Docker Desktop${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Docker 已就绪${NC}"
}

# 创建目录
create_directories() {
    echo -e "${YELLOW}创建安装目录...${NC}"
    mkdir -p "${FABRIC_DIR}"
    mkdir -p "${BIN_DIR}"
    echo -e "${GREEN}✓ 目录创建完成: ${FABRIC_DIR}${NC}"
}

# 下载 Fabric 二进制文件
download_binaries() {
    echo -e "${YELLOW}下载 Fabric 二进制文件 (版本 ${FABRIC_VERSION})...${NC}"

    cd "${FABRIC_DIR}"

    # 下载 Fabric
    FABRIC_URL="https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/hyperledger-fabric-${ARCH}-${FABRIC_VERSION}.tar.gz"
    echo -e "  下载地址: ${FABRIC_URL}"

    curl -L -o fabric.tar.gz "${FABRIC_URL}"

    if [ $? -ne 0 ]; then
        echo -e "${RED}Fabric 下载失败${NC}"
        echo -e "${YELLOW}尝试使用备用下载方式...${NC}"

        # 使用 Fabric 官方安装脚本
        curl -sSL https://bit.ly/2ysbOFE | bash -s -- ${FABRIC_VERSION} ${CA_VERSION}
        if [ $? -eq 0 ]; then
            # 移动到目标目录
            if [ -d "fabric-samples" ]; then
                cp -r fabric-samples/bin/* "${BIN_DIR}/" 2>/dev/null || true
                cp -r fabric-samples/config "${FABRIC_DIR}/" 2>/dev/null || true
            fi
        fi
    else
        tar -xzf fabric.tar.gz
        mv bin/* "${BIN_DIR}/" 2>/dev/null || true
        mv config "${FABRIC_DIR}/" 2>/dev/null || true
        rm -f fabric.tar.gz
    fi

    echo -e "${GREEN}✓ Fabric 二进制文件下载完成${NC}"
}

# 下载 Docker 镜像
download_docker_images() {
    echo -e "${YELLOW}下载 Fabric Docker 镜像...${NC}"

    # 拉取 Fabric 镜像
    docker pull hyperledger/fabric-peer:${FABRIC_VERSION}
    docker pull hyperledger/fabric-orderer:${FABRIC_VERSION}
    docker pull hyperledger/fabric-ccenv:${FABRIC_VERSION}
    docker pull hyperledger/fabric-baseos:${FABRIC_VERSION}
    docker pull hyperledger/fabric-ca:${CA_VERSION}
    docker pull hyperledger/fabric-tools:${FABRIC_VERSION}

    # 标记为 latest
    docker tag hyperledger/fabric-peer:${FABRIC_VERSION} hyperledger/fabric-peer:latest
    docker tag hyperledger/fabric-orderer:${FABRIC_VERSION} hyperledger/fabric-orderer:latest
    docker tag hyperledger/fabric-ccenv:${FABRIC_VERSION} hyperledger/fabric-ccenv:latest
    docker tag hyperledger/fabric-ca:${CA_VERSION} hyperledger/fabric-ca:latest
    docker tag hyperledger/fabric-tools:${FABRIC_VERSION} hyperledger/fabric-tools:latest

    echo -e "${GREEN}✓ Docker 镜像下载完成${NC}"
}

# 设置环境变量
setup_environment() {
    echo -e "${YELLOW}配置环境变量...${NC}"

    # 添加到 shell 配置
    SHELL_RC=""
    if [ -f "${HOME}/.zshrc" ]; then
        SHELL_RC="${HOME}/.zshrc"
    elif [ -f "${HOME}/.bashrc" ]; then
        SHELL_RC="${HOME}/.bashrc"
    fi

    if [ -n "${SHELL_RC}" ]; then
        if ! grep -q "FABRIC_BIN_PATH" "${SHELL_RC}"; then
            echo "" >> "${SHELL_RC}"
            echo "# Hyperledger Fabric" >> "${SHELL_RC}"
            echo "export FABRIC_BIN_PATH=${BIN_DIR}" >> "${SHELL_RC}"
            echo "export PATH=\$PATH:\$FABRIC_BIN_PATH" >> "${SHELL_RC}"
            echo -e "${GREEN}✓ 环境变量已添加到 ${SHELL_RC}${NC}"
            echo -e "${YELLOW}请运行 'source ${SHELL_RC}' 或重新打开终端${NC}"
        fi
    fi
}

# 验证安装
verify_installation() {
    echo -e "${YELLOW}验证安装...${NC}"

    export PATH="${BIN_DIR}:${PATH}"

    if command -v peer &> /dev/null; then
        VERSION=$(peer version | head -1)
        echo -e "${GREEN}✓ peer 已安装: ${VERSION}${NC}"
    else
        echo -e "${RED}✗ peer 安装失败${NC}"
    fi

    if command -v cryptogen &> /dev/null; then
        echo -e "${GREEN}✓ cryptogen 已安装${NC}"
    else
        echo -e "${RED}✗ cryptogen 安装失败${NC}"
    fi

    if command -v configtxgen &> /dev/null; then
        echo -e "${GREEN}✓ configtxgen 已安装${NC}"
    else
        echo -e "${RED}✗ configtxgen 安装失败${NC}"
    fi
}

# 主函数
main() {
    echo ""
    detect_system
    echo ""
    check_docker
    echo ""
    create_directories
    echo ""
    download_binaries
    echo ""
    download_docker_images
    echo ""
    setup_environment
    echo ""
    verify_installation
    echo ""

    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}    Fabric 安装完成!${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "${YELLOW}请执行以下命令使环境变量生效:${NC}"
    echo -e "  ${BLUE}source ~/.zshrc${NC}  (如果使用 zsh)"
    echo -e "  ${BLUE}source ~/.bashrc${NC} (如果使用 bash)"
    echo ""
    echo -e "${YELLOW}或者直接设置:${NC}"
    echo -e "  ${BLUE}export PATH=\$PATH:${BIN_DIR}${NC}"
    echo ""
}

main "$@"
