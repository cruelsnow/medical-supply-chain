// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 告警规则模型
// =============================================================================
// 功能: 定义告警触发规则配置（阈值、时间限制等）
// =============================================================================

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from './database';

// =============================================================================
// 类型定义
// =============================================================================

export interface AlertRuleAttributes {
  id: string;
  ruleName: string;
  alertType: string;
  conditionType: string;
  thresholdValue?: number;
  timeLimitHours?: number;
  isEnabled: boolean;
  orgName?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlertRuleCreationAttributes
  extends Optional<AlertRuleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// =============================================================================
// AlertRule 模型类
// =============================================================================

export class AlertRule
  extends Model<AlertRuleAttributes, AlertRuleCreationAttributes>
  implements AlertRuleAttributes
{
  public id!: string;
  public ruleName!: string;
  public alertType!: string;
  public conditionType!: string;
  public thresholdValue?: number;
  public timeLimitHours?: number;
  public isEnabled!: boolean;
  public orgName?: string;
  public description?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// =============================================================================
// 模型初始化
// =============================================================================

AlertRule.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ruleName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    alertType: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    conditionType: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    thresholdValue: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    timeLimitHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    orgName: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'alert_rules',
    timestamps: true,
    indexes: [
      { fields: ['alert_type'] },
      { fields: ['is_enabled'] },
    ],
  }
);

export default AlertRule;
