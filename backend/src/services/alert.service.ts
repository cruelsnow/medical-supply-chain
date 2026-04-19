// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 告警服务
// =============================================================================
// 功能: 缺货/延迟告警检查 + 告警生命周期管理
// =============================================================================

import { Alert, AlertType, AlertLevel, AlertStatus } from '../models/alert.model';
import { AlertRule } from '../models/alert-rule.model';
import { Order, OrderStatus } from '../models/order.model';
import { Op } from 'sequelize';

// =============================================================================
// AlertService 类
// =============================================================================

export class AlertService {
  // 查询告警列表（按组织过滤）
  async listAlerts(params: {
    type?: string;
    status?: string;
    orgName: string;
    page: number;
    pageSize: number;
  }): Promise<{ rows: any[]; count: number }> {
    const where: any = {};

    // 按组织过滤（regulator 看全部）
    if (params.orgName !== 'regulator') {
      where.orgName = params.orgName;
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.status) {
      where.status = params.status;
    }

    const { rows, count } = await Alert.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset: (params.page - 1) * params.pageSize,
      limit: params.pageSize,
    });

    return { rows, count };
  }

  // 查询告警详情
  async getAlertById(id: string): Promise<any> {
    const alert = await Alert.findByPk(id);
    return alert;
  }

  // 确认告警
  async acknowledgeAlert(id: string, userName: string): Promise<any> {
    const alert = await Alert.findByPk(id);
    if (!alert) {
      throw new Error('告警不存在');
    }

    await alert.update({
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedBy: userName,
    });

    return alert;
  }

  // 解决告警
  async resolveAlert(id: string, userName: string): Promise<any> {
    const alert = await Alert.findByPk(id);
    if (!alert) {
      throw new Error('告警不存在');
    }

    await alert.update({
      status: AlertStatus.RESOLVED,
      resolvedBy: userName,
      resolvedAt: new Date(),
    });

    return alert;
  }

  // 获取告警统计
  async getAlertStats(orgName: string): Promise<any> {
    const where: any = {};
    if (orgName !== 'regulator') {
      where.orgName = orgName;
    }

    const total = await Alert.count({ where });
    const active = await Alert.count({ where: { ...where, status: AlertStatus.ACTIVE } });
    const critical = await Alert.count({ where: { ...where, level: AlertLevel.CRITICAL, status: AlertStatus.ACTIVE } });
    const warning = await Alert.count({ where: { ...where, level: AlertLevel.WARNING, status: AlertStatus.ACTIVE } });
    const resolved = await Alert.count({ where: { ...where, status: AlertStatus.RESOLVED } });

    return { total, active, critical, warning, resolved };
  }

  // 手动触发全量告警检查
  async runAllChecks(): Promise<number> {
    let count = 0;
    count += await this.checkDeliveryDelay();
    return count;
  }

  // 检查交付延迟
  async checkDeliveryDelay(): Promise<number> {
    const now = new Date().toISOString().slice(0, 10);

    // 查找超过期望交付日期的未完成订单
    const delayedOrders = await Order.findAll({
      where: {
        status: {
          [Op.in]: [
            OrderStatus.IN_TRANSIT,
            OrderStatus.CONFIRMED,
            OrderStatus.PRODUCING,
            OrderStatus.READY_TO_SHIP,
          ],
        },
        expectedDeliveryDate: { [Op.lt]: now },
      },
    });

    let count = 0;
    for (const order of delayedOrders) {
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
          message: `订单 "${order.title}" 超过期望交付日期 ${order.expectedDeliveryDate}，当前状态: ${order.status}`,
          sourceType: 'order',
          sourceId: order.id,
          orgName: order.hospitalName || 'hospital',
        });
        count++;
      }
    }

    return count;
  }

  // 获取告警规则
  async getAlertRules(): Promise<AlertRule[]> {
    return AlertRule.findAll({ where: { isEnabled: true } });
  }

  // 更新告警规则
  async updateAlertRule(id: string, data: any): Promise<AlertRule> {
    const rule = await AlertRule.findByPk(id);
    if (!rule) {
      throw new Error('规则不存在');
    }

    await rule.update(data);
    return rule;
  }
}

export default new AlertService();
