// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 数据库连接
// =============================================================================
// 功能: SQLite 数据库初始化与连接管理
// =============================================================================

import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// 数据库文件存储路径
const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'database.sqlite');

// 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建 Sequelize 实例
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: config.server.env === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

// 测试数据库连接
export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite 数据库连接成功');

    // 同步模型到数据库（开发环境自动创建表）
    await sequelize.sync({ alter: config.server.env === 'development' });
    console.log('✅ 数据库表同步完成');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
};

// 关闭数据库连接
export const closeDB = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('SQLite 数据库连接已关闭');
  } catch (error) {
    console.error('关闭数据库连接失败:', error);
  }
};

export default sequelize;
