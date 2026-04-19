// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 订单项模型
// =============================================================================
// 功能: 定义订单中的耗材明细行
// =============================================================================

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from './database';

// =============================================================================
// 类型定义
// =============================================================================

export interface OrderItemAttributes {
  id: string;
  orderId: string;
  materialName: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  batchNumber?: string;
  udi?: string;
  deliveryStatus: string;
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItemCreationAttributes
  extends Optional<OrderItemAttributes, 'id' | 'deliveryStatus' | 'createdAt' | 'updatedAt'> {}

// =============================================================================
// OrderItem 模型类
// =============================================================================

export class OrderItem
  extends Model<OrderItemAttributes, OrderItemCreationAttributes>
  implements OrderItemAttributes
{
  public id!: string;
  public orderId!: string;
  public materialName!: string;
  public specification!: string;
  public quantity!: number;
  public unit!: string;
  public unitPrice?: number;
  public totalPrice?: number;
  public batchNumber?: string;
  public udi?: string;
  public deliveryStatus!: string;
  public remarks?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// =============================================================================
// 模型初始化
// =============================================================================

OrderItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    materialName: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    specification: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '个',
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    batchNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    udi: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    deliveryStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'order_items',
    timestamps: true,
    indexes: [
      { fields: ['order_id'] },
    ],
  }
);

export default OrderItem;
