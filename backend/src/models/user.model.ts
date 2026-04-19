// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 用户模型
// =============================================================================
// 功能: 定义用户数据结构，包含与 Fabric 钱包的关联
// =============================================================================

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from './database';

// =============================================================================
// 类型定义
// =============================================================================

// 用户属性接口
export interface UserAttributes {
  id: string;
  username: string;
  password: string;
  name: string;
  orgName: string;
  role: 'admin' | 'operator' | 'viewer';
  walletId: string;      // Fabric 钱包身份 ID（共享身份）
  status: 'active' | 'disabled';
  createdAt?: Date;
  updatedAt?: Date;
}

// 创建用户时的可选属性
export interface UserCreationAttributes
  extends Optional<UserAttributes, 'id' | 'role' | 'status' | 'walletId' | 'createdAt' | 'updatedAt'> {}

// 组织类型
export type OrgType = 'producer' | 'distributor' | 'hospital' | 'regulator';

// =============================================================================
// User 模型类
// =============================================================================

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public username!: string;
  public password!: string;
  public name!: string;
  public orgName!: string;
  public role!: 'admin' | 'operator' | 'viewer';
  public walletId!: string;
  public status!: 'active' | 'disabled';

  // 时间戳
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 实例方法：检查是否为管理员
  public isAdmin(): boolean {
    return this.role === 'admin';
  }

  // 实例方法：检查是否激活
  public isActive(): boolean {
    return this.status === 'active';
  }
}

// =============================================================================
// 模型初始化
// =============================================================================

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '用户ID',
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '登录用户名',
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '密码（bcrypt加密）',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '用户姓名',
    },
    orgName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '所属组织',
    },
    role: {
      type: DataTypes.ENUM('admin', 'operator', 'viewer'),
      defaultValue: 'operator',
      comment: '用户角色',
    },
    walletId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '1',
      comment: 'Fabric钱包身份ID（共享身份）',
    },
    status: {
      type: DataTypes.ENUM('active', 'disabled'),
      defaultValue: 'active',
      comment: '账户状态',
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['username'],
      },
      {
        fields: ['org_name'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

export default User;
