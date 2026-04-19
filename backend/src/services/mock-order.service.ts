// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 订单模拟数据
// =============================================================================
// 功能: 为开发/演示环境提供订单模拟数据
// =============================================================================

import { Order, OrderStatus } from '../models/order.model';
import { OrderItem } from '../models/order-item.model';
import { Alert, AlertType, AlertLevel, AlertStatus } from '../models/alert.model';
import { sequelize } from '../models';

// =============================================================================
// 模拟数据
// =============================================================================

interface MockOrderData {
  orderNumber: string;
  title: string;
  hospitalId: string;
  hospitalName: string;
  distributorId: string;
  distributorName: string;
  producerId: string;
  producerName: string;
  status: OrderStatus;
  expectedDeliveryDate: string;
  actualDeliveryDate: string | undefined;
  shippingId: string;
  totalAmount: number;
  remarks: string;
  rejectReason: string | undefined;
  items: {
    materialName: string;
    specification: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    batchNumber: string;
    deliveryStatus: string;
  }[];
}

const mockOrders: MockOrderData[] = [
  {
    orderNumber: 'ORD-20260301-0001',
    title: '一次性医用口罩采购',
    hospitalId: 'hospital-001',
    hospitalName: 'hospital',
    distributorId: 'dist-001',
    distributorName: 'distributor',
    producerId: 'prod-001',
    producerName: 'producer',
    status: OrderStatus.COMPLETED,
    expectedDeliveryDate: '2026-03-10',
    actualDeliveryDate: '2026-03-08',
    shippingId: 'SF20260305001',
    totalAmount: 15000,
    remarks: '急需',
    rejectReason: undefined,
    items: [
      { materialName: '一次性医用口罩', specification: '10只/盒', quantity: 500, unit: '盒', unitPrice: 20, totalPrice: 10000, batchNumber: 'B20260301', deliveryStatus: 'DELIVERED' },
      { materialName: 'N95口罩', specification: '5只/盒', quantity: 250, unit: '盒', unitPrice: 20, totalPrice: 5000, batchNumber: 'B20260301', deliveryStatus: 'DELIVERED' },
    ],
  },
  {
    orderNumber: 'ORD-20260310-0002',
    title: '外科手套和注射器采购',
    hospitalId: 'hospital-001',
    hospitalName: 'hospital',
    distributorId: 'dist-001',
    distributorName: 'distributor',
    producerId: 'prod-001',
    producerName: 'producer',
    status: OrderStatus.IN_TRANSIT,
    expectedDeliveryDate: '2026-03-15',
    actualDeliveryDate: undefined,
    shippingId: 'SF20260312002',
    totalAmount: 8500,
    remarks: '',
    rejectReason: undefined,
    items: [
      { materialName: '医用外科手套', specification: '100只/盒', quantity: 50, unit: '盒', unitPrice: 80, totalPrice: 4000, batchNumber: 'B20260310', deliveryStatus: 'IN_TRANSIT' },
      { materialName: '一次性注射器', specification: '5ml/支', quantity: 3000, unit: '支', unitPrice: 1.5, totalPrice: 4500, batchNumber: 'B20260310', deliveryStatus: 'IN_TRANSIT' },
    ],
  },
  {
    orderNumber: 'ORD-20260315-0003',
    title: '输液器和敷料采购',
    hospitalId: 'hospital-001',
    hospitalName: 'hospital',
    distributorId: 'dist-001',
    distributorName: 'distributor',
    producerId: '',
    producerName: '',
    status: OrderStatus.CONFIRMED,
    expectedDeliveryDate: '2026-03-25',
    actualDeliveryDate: undefined,
    shippingId: '',
    totalAmount: 12000,
    remarks: '请尽快安排生产',
    rejectReason: undefined,
    items: [
      { materialName: '输液器', specification: '标准型', quantity: 2000, unit: '套', unitPrice: 3.5, totalPrice: 7000, batchNumber: 'B20260315', deliveryStatus: 'PENDING' },
      { materialName: '医用敷料', specification: '10cm×10cm', quantity: 5000, unit: '片', unitPrice: 1, totalPrice: 5000, batchNumber: 'B20260315', deliveryStatus: 'PENDING' },
    ],
  },
  {
    orderNumber: 'ORD-20260320-0004',
    title: 'CT造影剂紧急采购',
    hospitalId: 'hospital-001',
    hospitalName: 'hospital',
    distributorId: '',
    distributorName: '',
    producerId: '',
    producerName: '',
    status: OrderStatus.PENDING,
    expectedDeliveryDate: '2026-03-28',
    actualDeliveryDate: undefined,
    shippingId: '',
    totalAmount: 25000,
    remarks: '急诊科急需',
    rejectReason: undefined,
    items: [
      { materialName: '碘佛醇注射液', specification: '320mgI/ml 50ml', quantity: 100, unit: '瓶', unitPrice: 200, totalPrice: 20000, batchNumber: 'B20260320', deliveryStatus: 'PENDING' },
      { materialName: '碘海醇注射液', specification: '300mgI/ml 100ml', quantity: 50, unit: '瓶', unitPrice: 100, totalPrice: 5000, batchNumber: 'B20260320', deliveryStatus: 'PENDING' },
    ],
  },
  {
    orderNumber: 'ORD-20260322-0005',
    title: '手术缝合线采购',
    hospitalId: 'hospital-001',
    hospitalName: 'hospital',
    distributorId: 'dist-001',
    distributorName: 'distributor',
    producerId: '',
    producerName: '',
    status: OrderStatus.READY_TO_SHIP,
    expectedDeliveryDate: '2026-03-20',
    actualDeliveryDate: undefined,
    shippingId: '',
    totalAmount: 6800,
    remarks: '注意效期',
    rejectReason: undefined,
    items: [
      { materialName: '可吸收缝合线', specification: '3-0 45cm', quantity: 200, unit: '根', unitPrice: 25, totalPrice: 5000, batchNumber: 'B20260322', deliveryStatus: 'PENDING' },
      { materialName: '不可吸收缝合线', specification: '2-0 60cm', quantity: 180, unit: '根', unitPrice: 10, totalPrice: 1800, batchNumber: 'B20260322', deliveryStatus: 'PENDING' },
    ],
  },
];

const mockAlerts = [
  {
    type: AlertType.DELIVERY_DELAYED,
    level: AlertLevel.WARNING,
    title: '订单 ORD-20260322-0005 交付延迟',
    message: '订单 "手术缝合线采购" 超过期望交付日期 2026-03-20，当前状态: READY_TO_SHIP',
    sourceType: 'order',
    sourceId: 'mock-order-5',
    orgName: 'hospital',
  },
  {
    type: AlertType.STOCK_LOW,
    level: AlertLevel.WARNING,
    title: '医用口罩库存不足',
    message: '一次性医用口罩当前库存低于安全阈值，建议尽快补充',
    sourceType: 'inventory',
    sourceId: 'UDI20240328001',
    orgName: 'hospital',
  },
  {
    type: AlertType.ENV_ABNORMAL,
    level: AlertLevel.CRITICAL,
    title: '运输温度异常',
    message: '运输中的外科手套温度超过规定范围（当前: 32°C，上限: 25°C）',
    sourceType: 'asset',
    sourceId: 'UDI20240328002',
    orgName: 'distributor',
  },
];

// =============================================================================
// MockOrderService 类
// =============================================================================

export class MockOrderService {
  private static instance: MockOrderService;

  public static getInstance(): MockOrderService {
    if (!MockOrderService.instance) {
      MockOrderService.instance = new MockOrderService();
    }
    return MockOrderService.instance;
  }

  /**
   * 初始化模拟订单和告警数据
   */
  async initMockData(): Promise<void> {
    const orderCount = await Order.count();
    if (orderCount > 0) {
      console.log('📋 订单数据已存在，跳过模拟数据初始化');
      return;
    }

    const transaction = await sequelize.transaction();

    try {
      for (const mockOrder of mockOrders) {
        const { items, ...orderData } = mockOrder;

        const order = await Order.create(
          {
            ...orderData,
            status: orderData.status,
          },
          { transaction }
        );

        const orderItems = items.map((item) => ({
          ...item,
          orderId: order.id,
          remarks: '',
        }));

        await OrderItem.bulkCreate(orderItems, { transaction });
      }

      // 创建模拟告警
      for (const mockAlert of mockAlerts) {
        await Alert.create(mockAlert, { transaction });
      }

      await transaction.commit();
      console.log(`✅ 模拟数据初始化完成: ${mockOrders.length} 个订单, ${mockAlerts.length} 条告警`);
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 模拟数据初始化失败:', error);
      throw error;
    }
  }
}

export const mockOrderService = MockOrderService.getInstance();
export default mockOrderService;
