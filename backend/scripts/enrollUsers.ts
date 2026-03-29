// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 用户注册脚本
// =============================================================================
// 功能: 将Fabric用户证书导入钱包
// =============================================================================

import { Wallets } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';

// 配置
const WALLET_PATH = path.join(__dirname, '../../blockchain/wallet');
const CRYPTO_PATH = '/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations';

// 组织配置
const organizations = [
  { name: 'producer', msp: 'ProducerMSP' },
  { name: 'distributor', msp: 'DistributorMSP' },
  { name: 'hospital', msp: 'HospitalMSP' },
  { name: 'regulator', msp: 'RegulatorMSP' },
];

// 用户配置
const users = [
  { id: 'admin', certUser: 'Admin' },
  { id: '1', certUser: 'User1' },
  { id: '2', certUser: 'User2' },
];

/**
 * 从Docker容器复制证书到本地
 */
async function copyCertsFromContainer(orgName: string): Promise<boolean> {
  const localCryptoPath = path.join(__dirname, '../../blockchain/crypto/peerOrganizations', `${orgName}.supplychain.com`);

  // 如果本地已有证书，直接返回
  if (fs.existsSync(localCryptoPath)) {
    console.log(`本地证书已存在: ${localCryptoPath}`);
    return true;
  }

  // 创建目录
  fs.mkdirSync(localCryptoPath, { recursive: true });

  // 从Docker容器复制证书
  const containerCryptoPath = `${CRYPTO_PATH}/${orgName}.supplychain.com`;
  const exec = require('child_process').execSync;

  try {
    exec(`docker cp cli:${containerCryptoPath}/users ${localCryptoPath}/`, { stdio: 'inherit' });
    exec(`docker cp cli:${containerCryptoPath}/msp ${localCryptoPath}/`, { stdio: 'inherit' });
    console.log(`证书复制成功: ${orgName}`);
    return true;
  } catch (error) {
    console.error(`证书复制失败: ${orgName}`, error);
    return false;
  }
}

/**
 * 导入用户到钱包
 */
async function importUserToWallet(
  orgName: string,
  userId: string,
  mspId: string,
  certPath: string,
  keyPath: string
): Promise<void> {
  const walletPath = path.join(WALLET_PATH, orgName);

  // 确保钱包目录存在
  if (!fs.existsSync(walletPath)) {
    fs.mkdirSync(walletPath, { recursive: true });
  }

  const wallet = await Wallets.newFileSystemWallet(walletPath);

  // 检查用户是否已存在
  const identity = await wallet.get(userId);
  if (identity) {
    console.log(`用户 ${userId}@${orgName} 已存在于钱包中`);
    return;
  }

  // 读取证书和私钥
  const cert = fs.readFileSync(certPath, 'utf8');
  const key = fs.readFileSync(keyPath, 'utf8');

  // 创建身份
  const identityObject = {
    credentials: {
      certificate: cert,
      privateKey: key,
    },
    mspId: mspId,
    type: 'X.509',
  };

  // 导入钱包
  await wallet.put(userId, identityObject);
  console.log(`用户 ${userId}@${orgName} 导入钱包成功`);
}

/**
 * 查找私钥文件
 */
function findPrivateKey(keyDir: string): string | null {
  if (!fs.existsSync(keyDir)) {
    return null;
  }

  const files = fs.readdirSync(keyDir);
  for (const file of files) {
    const filePath = path.join(keyDir, file);
    if (fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }
  return null;
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(60));
  console.log('  Fabric 用户注册脚本');
  console.log('='.repeat(60));

  // 首先从Docker容器复制证书
  console.log('\n步骤1: 从Docker容器复制证书...');
  for (const org of organizations) {
    await copyCertsFromContainer(org.name);
  }

  // 导入用户到钱包
  console.log('\n步骤2: 导入用户到钱包...');

  for (const org of organizations) {
    const orgCryptoPath = path.join(
      __dirname,
      '../../blockchain/crypto/peerOrganizations',
      `${org.name}.supplychain.com`,
      'users'
    );

    if (!fs.existsSync(orgCryptoPath)) {
      console.log(`组织 ${org.name} 的证书目录不存在，跳过`);
      continue;
    }

    for (const user of users) {
      const userDir = path.join(orgCryptoPath, `${user.certUser}@${org.name}.supplychain.com`);

      if (!fs.existsSync(userDir)) {
        console.log(`用户目录不存在: ${userDir}`);
        continue;
      }

      // 证书路径
      const certPath = path.join(userDir, 'msp', 'signcerts', `${user.certUser}@${org.name}.supplychain.com-cert.pem`);

      // 私钥路径（需要查找）
      const keyDir = path.join(userDir, 'msp', 'keystore');
      const keyPath = findPrivateKey(keyDir);

      if (!fs.existsSync(certPath) || !keyPath) {
        console.log(`证书或私钥不存在: ${user.id}@${org.name}`);
        console.log(`  certPath: ${certPath}`);
        console.log(`  keyPath: ${keyPath}`);
        continue;
      }

      await importUserToWallet(org.name, user.id, org.msp, certPath, keyPath);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  用户注册完成！');
  console.log('='.repeat(60));
}

// 运行
main().catch((error) => {
  console.error('用户注册失败:', error);
  process.exit(1);
});
