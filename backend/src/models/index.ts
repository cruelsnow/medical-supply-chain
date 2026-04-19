// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 数据库连接
// =============================================================================
// 功能: SQLite 数据库初始化与连接管理
// =============================================================================

// 先导入 sequelize 实例（在 database.ts 中创建，避免循环依赖）
export { sequelize } from './database';
export { default } from './database';

import { sequelize } from './database';
import { config } from '../config';

// 导入所有模型（触发 Model.init() 注册）
import './user.model';
import './order.model';
import './order-item.model';
import './alert.model';
import './alert-rule.model';

// 导入模型类用于关联配置
import { Order } from './order.model';
import { OrderItem } from './order-item.model';

// 测试数据库连接
export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite 数据库连接成功');

    // 设置模型关联关系
    setupAssociations();

    // 同步模型到数据库（开发环境自动创建表）
    await sequelize.sync({ alter: config.server.env === 'development' });
    console.log('✅ 数据库表同步完成');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
};

// =============================================================================
// 模型关联关系配置
// =============================================================================

function setupAssociations(): void {
  // Order -> OrderItem：一对多
  Order.hasMany(OrderItem, {
    foreignKey: 'orderId',
    as: 'items',
    onDelete: 'CASCADE',
  });
  OrderItem.belongsTo(Order, {
    foreignKey: 'orderId',
    as: 'order',
  });
}

// 关闭数据库连接
export const closeDB = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('SQLite 数据库连接已关闭');
  } catch (error) {
    console.error('关闭数据库连接失败:', error);
  }
};
