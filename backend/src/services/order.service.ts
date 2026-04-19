// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 订单服务
// =============================================================================
// 功能: 采购订单业务逻辑（CRUD + 状态机 + 事务）
// =============================================================================

import { sequelize } from '../models';
import { Order, OrderStatus } from '../models/order.model';
import { OrderItem } from '../models/order-item.model';
import { Alert, AlertType, AlertLevel, AlertStatus } from '../models/alert.model';
import { Op } from 'sequelize';
import { AssetService } from './asset.service';

// =============================================================================
// 类型定义
// =============================================================================

interface CreateOrderDTO {
  title: string;
  expectedDeliveryDate: string;
  remarks?: string;
  items: {
    materialName: string;
    specification: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    remarks?: string;
  }[];
  hospitalId: string;
  hospitalName: string;
}

interface OrderListFilters {
  status?: string;
  keyword?: string;
  page: number;
  pageSize: number;
  orgName: string;
  userId: string;
}

// 状态转换规则
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'REJECTED'],
  CONFIRMED: ['PRODUCING', 'CANCELLED'],
  PRODUCING: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: ['ACCEPTED'],
  ACCEPTED: ['COMPLETED'],
};

// =============================================================================
// OrderService 类
// =============================================================================

export class OrderService {
  private assetService: AssetService;

  constructor() {
    this.assetService = new AssetService();
  }

  // 生成订单编号: ORD-YYYYMMDD-XXXX
  private generateOrderNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${date}-${seq}`;
  }

  // 生成 UDI 编号: (01)XXXXXX{seq}(17)YYMMDD(10)BATCH{rand}
  private generateUDI(item: any, batchNumber: string): string {
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `(01)0880${Date.now().toString().slice(-8)}${rand}(17)261231(10)${batchNumber || 'LOT'}${rand}`;
  }

  // 创建订单（事务保证一致性）
  async createOrder(data: CreateOrderDTO): Promise<any> {
    const transaction = await sequelize.transaction();

    try {
      // 计算总金额
      const totalAmount = data.items.reduce((sum, item) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);

      // 创建订单
      const order = await Order.create(
        {
          orderNumber: this.generateOrderNumber(),
          title: data.title,
          hospitalId: data.hospitalId,
          hospitalName: data.hospitalName,
          expectedDeliveryDate: data.expectedDeliveryDate,
          totalAmount,
          remarks: data.remarks || '',
          status: OrderStatus.PENDING,
        },
        { transaction }
      );

      // 创建订单项
      const items = data.items.map((item) => ({
        orderId: order.id,
        materialName: item.materialName,
        specification: item.specification,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        deliveryStatus: 'PENDING',
        remarks: item.remarks || '',
      }));

      await OrderItem.bulkCreate(items, { transaction });

      await transaction.commit();

      // 返回完整订单（含明细）
      return this.getOrderById(order.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // 查询订单详情（含明细）
  async getOrderById(id: string): Promise<any> {
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
        },
      ],
    });

    if (!order) {
      return null;
    }

    return order;
  }

  // 查询订单列表（按角色过滤）
  async listOrders(filters: OrderListFilters): Promise<{ rows: any[]; count: number }> {
    const where: any = {};

    // 按组织过滤（按 orgName 匹配，而非 userId UUID）
    switch (filters.orgName) {
      case 'hospital':
        where.hospitalName = 'hospital';
        break;
      case 'distributor':
        where[Op.or] = [
          { distributorName: 'distributor' },
          { status: OrderStatus.PENDING, distributorId: null },
        ];
        break;
      case 'producer':
        where[Op.or] = [
          { producerName: 'producer' },
          { status: OrderStatus.CONFIRMED, producerId: null },
        ];
        break;
      case 'regulator':
        // 监管可看全部
        break;
    }

    // 按状态过滤
    if (filters.status) {
      where.status = filters.status;
    }

    // 关键字搜索
    if (filters.keyword) {
      where[Op.or] = where[Op.or]
        ? [
            ...where[Op.or],
            {
              [Op.or]: [
                { orderNumber: { [Op.like]: `%${filters.keyword}%` } },
                { title: { [Op.like]: `%${filters.keyword}%` } },
              ],
            },
          ]
        : [
            { orderNumber: { [Op.like]: `%${filters.keyword}%` } },
            { title: { [Op.like]: `%${filters.keyword}%` } },
          ];
    }

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      offset: (filters.page - 1) * filters.pageSize,
      limit: filters.pageSize,
    });

    return { rows, count };
  }

  // 状态转换
  async transitionStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId: string,
    orgName: string,
    extraData?: Record<string, any>
  ): Promise<any> {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    const currentStatus = order.status as OrderStatus;

    // 检查状态转换合法性
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`不允许从 ${currentStatus} 转换到 ${newStatus}`);
    }

    // 根据新状态更新不同字段
    const updateData: any = { status: newStatus };

    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        // 经销商确认
        updateData.distributorId = userId;
        updateData.distributorName = extraData?.distributorName || '';
        break;
      case OrderStatus.PRODUCING:
        // 生产商确认
        updateData.producerId = userId;
        updateData.producerName = extraData?.producerName || '';
        break;
      case OrderStatus.IN_TRANSIT: {
        // 发货：将已登记的资产关联到订单并转移权属
        updateData.shippingId = extraData?.shippingId || '';
        const dispatchItems: { itemId: string; udi: string }[] = extraData?.dispatchItems || [];

        // 构建 itemId -> udi 映射
        const udiMap = new Map(dispatchItems.map((d) => [d.itemId, d.udi]));

        // 设置生产商上下文
        this.assetService.setContext('producer', '1');

        for (const item of (order as any).items || []) {
          const udi = udiMap.get(item.id);

          if (!udi) {
            throw new Error(`订单项 "${item.materialName}" 未关联资产，请先在资产登记中录入后再发货`);
          }

          try {
            // 验证链上资产存在
            const assetResult = await this.assetService.queryAsset(udi);
            if (!assetResult.success || !assetResult.data) {
              throw new Error(`UDI ${udi} 在链上不存在，请先进行资产登记`);
            }

            // 链上转移给经销商（必须从生产商上下文发起，因为链码校验 ProducerMSP）
            await this.assetService.transferAsset({
              udi,
              newOwner: 'distributor',
              newOwnerMSP: 'DistributorMSP',
              description: `订单 ${order.orderNumber} 发货`,
            });
          } catch (err: any) {
            throw new Error(`发货失败 (${item.materialName}): ${err.message}`);
          }

          // 将 UDI 写回订单项
          await OrderItem.update(
            { udi, deliveryStatus: 'SHIPPED' },
            { where: { id: item.id, orderId } }
          );
        }
        break;
      }
      case OrderStatus.DELIVERED:
        updateData.actualDeliveryDate = new Date().toISOString().slice(0, 10);
        break;
      case OrderStatus.ACCEPTED: {
        // 医院验收入库：链上资产转移给医院并确认收货
        const orderItems = await OrderItem.findAll({ where: { orderId } });
        const errors: string[] = [];

        for (const item of orderItems) {
          if (!item.udi) continue;

          let chainSuccess = false;

          try {
            // 1. 先查当前资产状态，判断需要执行哪步操作
            this.assetService.setContext('hospital', '1');
            const assetResult = await this.assetService.queryAsset(item.udi);

            if (!assetResult.success || !assetResult.data) {
              errors.push(`${item.udi}: 资产不存在`);
              continue;
            }

            const currentAssetStatus = (assetResult.data as any).status;

            if (currentAssetStatus === 'IN_STOCK') {
              // 已经入库，跳过
              chainSuccess = true;
            } else if (currentAssetStatus === 'IN_TRANSIT') {
              // 在途 → 直接入库（收货确权）
              await this.assetService.confirmReceipt({
                udi: item.udi,
                receiverName: 'hospital',
              });
              chainSuccess = true;
            } else if (currentAssetStatus === 'CREATED') {
              // 还在 CREATED（未发货） → 先转移再入库
              this.assetService.setContext('producer', '1');
              await this.assetService.transferAsset({
                udi: item.udi,
                newOwner: 'hospital',
                newOwnerMSP: 'HospitalMSP',
                description: `订单 ${order.orderNumber} 直接交付医院`,
              });

              this.assetService.setContext('hospital', '1');
              await this.assetService.confirmReceipt({
                udi: item.udi,
                receiverName: 'hospital',
              });
              chainSuccess = true;
            } else {
              errors.push(`${item.udi}: 状态 ${currentAssetStatus} 无法入库`);
              continue;
            }
          } catch (err: any) {
            errors.push(`${item.udi}: ${err.message}`);
          }

          // 只有链上操作成功才更新订单项状态
          if (chainSuccess) {
            await OrderItem.update(
              { deliveryStatus: 'DELIVERED' },
              { where: { id: item.id } }
            );
          }
        }

        if (errors.length > 0) {
          console.warn(`订单 ${order.orderNumber} 部分资产入库失败:`, errors);
        }
        break;
      }
      case OrderStatus.COMPLETED:
        // 订单最终完成，更新订单项状态
        await OrderItem.update(
          { deliveryStatus: 'COMPLETED' },
          { where: { orderId } }
        );
        break;
      case OrderStatus.REJECTED:
        updateData.rejectReason = extraData?.rejectReason || '';
        break;
    }

    if (extraData?.remarks) {
      updateData.remarks = extraData.remarks;
    }

    await order.update(updateData);

    // 如果订单延迟，创建告警
    if (
      newStatus === OrderStatus.IN_TRANSIT &&
      order.expectedDeliveryDate &&
      new Date(order.expectedDeliveryDate) < new Date()
    ) {
      await this.createDelayAlert(order);
    }

    return this.getOrderById(orderId);
  }

  // 创建延迟告警
  private async createDelayAlert(order: any): Promise<void> {
    // 检查是否已有活跃告警
    const existing = await Alert.findOne({
      where: {
        sourceType: 'order',
        sourceId: order.id,
        type: AlertType.DELIVERY_DELAYED,
        status: AlertStatus.ACTIVE,
      },
    });

    if (!existing) {
      await Alert.create({
        type: AlertType.DELIVERY_DELAYED,
        level: AlertLevel.WARNING,
        title: `订单 ${order.orderNumber} 交付延迟`,
        message: `订单超过期望交付日期 ${order.expectedDeliveryDate}，当前状态: ${order.status}`,
        sourceType: 'order',
        sourceId: order.id,
        orgName: order.hospitalName,
      });
    }
  }

  // 获取订单统计
  async getOrderStats(orgName: string, userId: string): Promise<any> {
    const where: any = {};

    switch (orgName) {
      case 'hospital':
        where.hospitalId = userId;
        break;
      case 'distributor':
        where.distributorId = userId;
        break;
      case 'producer':
        where.producerId = userId;
        break;
    }

    const total = await Order.count({ where });
    const pending = await Order.count({ where: { ...where, status: OrderStatus.PENDING } });
    const inTransit = await Order.count({ where: { ...where, status: OrderStatus.IN_TRANSIT } });
    const completed = await Order.count({ where: { ...where, status: OrderStatus.COMPLETED } });
    const delayed = await Order.count({
      where: {
        ...where,
        status: { [Op.in]: [OrderStatus.IN_TRANSIT, OrderStatus.CONFIRMED, OrderStatus.PRODUCING] },
        expectedDeliveryDate: { [Op.lt]: new Date().toISOString().slice(0, 10) },
      },
    });

    return { total, pending, inTransit, completed, delayed };
  }
}

export default new OrderService();
