// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 告警模型
// =============================================================================
// 功能: 定义缺货/延迟告警数据结构
// =============================================================================

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from './database';

// =============================================================================
// 类型定义
// =============================================================================

export enum AlertType {
  STOCK_LOW = 'STOCK_LOW',
  STOCK_ZERO = 'STOCK_ZERO',
  DELIVERY_DELAYED = 'DELIVERY_DELAYED',
  TRANSIT_TIMEOUT = 'TRANSIT_TIMEOUT',
  ENV_ABNORMAL = 'ENV_ABNORMAL',
  EXPIRY_WARNING = 'EXPIRY_WARNING',
}

export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export interface AlertAttributes {
  id: string;
  type: AlertType;
  level: AlertLevel;
  status: AlertStatus;
  title: string;
  message: string;
  sourceType: string;
  sourceId: string;
  orgName: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlertCreationAttributes
  extends Optional<AlertAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

// =============================================================================
// Alert 模型类
// =============================================================================

export class Alert
  extends Model<AlertAttributes, AlertCreationAttributes>
  implements AlertAttributes
{
  public id!: string;
  public type!: AlertType;
  public level!: AlertLevel;
  public status!: AlertStatus;
  public title!: string;
  public message!: string;
  public sourceType!: string;
  public sourceId!: string;
  public orgName!: string;
  public acknowledgedBy?: string;
  public resolvedBy?: string;
  public resolvedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// =============================================================================
// 模型初始化
// =============================================================================

Alert.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    level: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: AlertLevel.WARNING,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: AlertStatus.ACTIVE,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sourceType: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    sourceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    orgName: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    acknowledgedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    resolvedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'alerts',
    timestamps: true,
    indexes: [
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['org_name'] },
      { fields: ['source_type', 'source_id'] },
    ],
  }
);

export default Alert;
