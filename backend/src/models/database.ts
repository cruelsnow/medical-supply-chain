// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - Sequelize 实例
// =============================================================================
// 功能: 单独导出 sequelize 实例，避免循环依赖
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

export default sequelize;
