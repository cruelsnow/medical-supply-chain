// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 默认用户初始化
// =============================================================================
// 功能: 初始化各组织的默认用户账号
// 说明: 同组织用户共享 Fabric 钱包身份（共享身份方案）
// =============================================================================

import bcrypt from 'bcrypt';
import User from '../models/user.model';
import sequelize from '../models/index';

// =============================================================================
// 默认用户配置
// =============================================================================

interface DefaultUser {
  username: string;
  password: string;
  name: string;
  orgName: string;
  role: 'admin' | 'operator' | 'viewer';
  walletId: string;  // 共享钱包身份
}

// 各组织共享的钱包身份 ID
// 每个组织有独立的 wallet 目录（wallet/producer/, wallet/distributor/ 等）
// 同一目录下的用户共享 '1' 身份文件（1.id）
const WALLET_IDS = {
  producer: '1',
  distributor: '1',
  hospital: '1',
  regulator: '1',
};

// 默认用户列表
const defaultUsers: DefaultUser[] = [
  // ==================== 生产商账号 ====================
  {
    username: 'producer_admin',
    password: '123456',
    name: '生产商管理员',
    orgName: 'producer',
    role: 'admin',
    walletId: WALLET_IDS.producer,
  },
  {
    username: 'producer_op1',
    password: '123456',
    name: '生产商操作员1',
    orgName: 'producer',
    role: 'operator',
    walletId: WALLET_IDS.producer,
  },
  {
    username: 'producer_op2',
    password: '123456',
    name: '生产商操作员2',
    orgName: 'producer',
    role: 'operator',
    walletId: WALLET_IDS.producer,
  },

  // ==================== 经销商账号 ====================
  {
    username: 'distributor_admin',
    password: '123456',
    name: '经销商管理员',
    orgName: 'distributor',
    role: 'admin',
    walletId: WALLET_IDS.distributor,
  },
  {
    username: 'distributor_op1',
    password: '123456',
    name: '经销商操作员1',
    orgName: 'distributor',
    role: 'operator',
    walletId: WALLET_IDS.distributor,
  },

  // ==================== 医院账号 ====================
  {
    username: 'hospital_admin',
    password: '123456',
    name: '医院管理员',
    orgName: 'hospital',
    role: 'admin',
    walletId: WALLET_IDS.hospital,
  },
  {
    username: 'hospital_nurse1',
    password: '123456',
    name: '医院护士1',
    orgName: 'hospital',
    role: 'operator',
    walletId: WALLET_IDS.hospital,
  },
  {
    username: 'hospital_doctor1',
    password: '123456',
    name: '医院医生1',
    orgName: 'hospital',
    role: 'operator',
    walletId: WALLET_IDS.hospital,
  },

  // ==================== 监管机构账号 ====================
  {
    username: 'regulator_admin',
    password: '123456',
    name: '监管管理员',
    orgName: 'regulator',
    role: 'admin',
    walletId: WALLET_IDS.regulator,
  },
  {
    username: 'regulator_auditor1',
    password: '123456',
    name: '监管审计员1',
    orgName: 'regulator',
    role: 'viewer',
    walletId: WALLET_IDS.regulator,
  },
];

// =============================================================================
// 初始化函数
// =============================================================================

/**
 * 初始化默认用户
 * 如果数据库中已有用户，则跳过初始化
 */
export const initUsers = async (): Promise<void> => {
  try {
    // 检查是否已有用户
    const count = await User.count();
    if (count > 0) {
      console.log(`📋 用户数据已存在 (${count} 个用户)，跳过初始化`);
      return;
    }

    console.log('🚀 开始初始化默认用户...');

    // 密码加密轮数
    const saltRounds = 10;

    // 创建默认用户
    for (const userData of defaultUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      await User.create({
        username: userData.username,
        password: hashedPassword,
        name: userData.name,
        orgName: userData.orgName,
        role: userData.role,
        walletId: userData.walletId,
        status: 'active',
      });

      console.log(`   ✅ 创建用户: ${userData.username} (${userData.name})`);
    }

    console.log(`\n✅ 默认用户初始化完成，共 ${defaultUsers.length} 个账号\n`);
    console.log('📋 默认账号列表:');
    console.log('   ┌─────────────────────────────────────────────────┐');
    console.log('   │ 组织       │ 用户名          │ 角色     │ 密码   │');
    console.log('   ├─────────────────────────────────────────────────┤');
    console.log('   │ producer   │ producer_admin  │ admin    │ 123456 │');
    console.log('   │ producer   │ producer_op1    │ operator │ 123456 │');
    console.log('   │ producer   │ producer_op2    │ operator │ 123456 │');
    console.log('   │ distributor│ distributor_admin│ admin   │ 123456 │');
    console.log('   │ distributor│ distributor_op1 │ operator │ 123456 │');
    console.log('   │ hospital   │ hospital_admin  │ admin    │ 123456 │');
    console.log('   │ hospital   │ hospital_nurse1 │ operator │ 123456 │');
    console.log('   │ hospital   │ hospital_doctor1│ operator │ 123456 │');
    console.log('   │ regulator  │ regulator_admin │ admin    │ 123456 │');
    console.log('   │ regulator  │ regulator_auditor1│ viewer │ 123456 │');
    console.log('   └─────────────────────────────────────────────────┘');
  } catch (error) {
    console.error('❌ 初始化用户失败:', error);
    throw error;
  }
};

/**
 * 重置用户数据（删除所有用户并重新初始化）
 * 仅用于开发环境
 */
export const resetUsers = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ 生产环境禁止重置用户数据');
    return;
  }

  try {
    await User.destroy({ where: {}, truncate: true });
    console.log('🗑️ 已清空用户数据');
    await initUsers();
  } catch (error) {
    console.error('❌ 重置用户失败:', error);
    throw error;
  }
};

// =============================================================================
// 命令行直接执行
// =============================================================================

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: true });
      await initUsers();
      process.exit(0);
    } catch (error) {
      console.error('初始化失败:', error);
      process.exit(1);
    }
  })();
}

export default initUsers;
