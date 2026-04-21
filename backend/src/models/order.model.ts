// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 采购订单模型
// =============================================================================
// 功能: 定义采购订单数据结构，支持医院发起采购的全流程管理
// =============================================================================

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from './database';

// =============================================================================
// 类型定义
// =============================================================================

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PRODUCING = 'PRODUCING',
  READY_TO_SHIP = 'READY_TO_SHIP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  DISTRIBUTOR_SHIPPING = 'DISTRIBUTOR_SHIPPING',
  ACCEPTED = 'ACCEPTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export interface OrderAttributes {
  id: string;
  orderNumber: string;
  title: string;
  hospitalId: string;
  hospitalName: string;
  distributorId?: string;
  distributorName?: string;
  producerId?: string;
  producerName?: string;
  status: OrderStatus;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  shippingId?: string;
  distributorShippingId?: string;
  totalAmount?: number;
  remarks?: string;
  rejectReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderCreationAttributes
  extends Optional<OrderAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

// =============================================================================
// Order 模型类
// =============================================================================

export class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  public id!: string;
  public orderNumber!: string;
  public title!: string;
  public hospitalId!: string;
  public hospitalName!: string;
  public distributorId?: string;
  public distributorName?: string;
  public producerId?: string;
  public producerName?: string;
  public status!: OrderStatus;
  public expectedDeliveryDate?: string;
  public actualDeliveryDate?: string;
  public shippingId?: string;
  public distributorShippingId?: string;
  public totalAmount?: number;
  public remarks?: string;
  public rejectReason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// =============================================================================
// 模型初始化
// =============================================================================

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    hospitalId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    hospitalName: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    distributorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    distributorName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    producerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    producerName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: OrderStatus.PENDING,
    },
    expectedDeliveryDate: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    actualDeliveryDate: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    shippingId: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    distributorShippingId: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejectReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'orders',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['order_number'] },
      { fields: ['hospital_id'] },
      { fields: ['distributor_id'] },
      { fields: ['producer_id'] },
      { fields: ['status'] },
    ],
  }
);

export default Order;
