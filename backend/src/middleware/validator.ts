// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 参数验证中间件
// =============================================================================
// 功能: 使用Joi进行请求参数验证
// =============================================================================

import { Context, Next } from 'koa';
import Joi from 'joi';

// =============================================================================
// 验证模式定义
// =============================================================================

// 资产初始化验证模式
export const initAssetSchema = Joi.object({
  udi: Joi.string().required().min(10).max(100).description('医疗器械唯一标识'),
  name: Joi.string().required().max(200).description('耗材名称'),
  specification: Joi.string().required().max(100).description('规格型号'),
  batchNumber: Joi.string().required().max(50).description('批次号'),
  quantity: Joi.number().integer().min(1).required().description('生产数量'),
  productionDate: Joi.string().required().pattern(/^\d{4}-\d{2}-\d{2}$/).description('生产日期'),
  expiryDate: Joi.string().required().pattern(/^\d{4}-\d{2}-\d{2}$/).description('有效期'),
  docHash: Joi.string().required().length(64).description('质检报告哈希'),
  producer: Joi.string().required().max(200).description('生产商名称'),
});

// 权属转移验证模式
export const transferSchema = Joi.object({
  udi: Joi.string().required().description('资产UDI'),
  newOwner: Joi.string().required().max(200).description('新所有者'),
  newOwnerMSP: Joi.string().required().valid('ProducerMSP', 'DistributorMSP', 'HospitalMSP', 'RegulatorMSP').description('新所有者MSP'),
  description: Joi.string().allow('').max(500).description('转移描述'),
});

// 收货确权验证模式
export const receiptSchema = Joi.object({
  udi: Joi.string().required().description('资产UDI'),
  receiverName: Joi.string().required().max(200).description('收货方名称'),
});

// 环境数据验证模式
export const envDataSchema = Joi.object({
  udi: Joi.string().required().description('资产UDI'),
  temperature: Joi.number().min(-50).max(100).required().description('温度'),
  humidity: Joi.number().min(0).max(100).required().description('湿度'),
  location: Joi.string().required().max(200).description('位置'),
  isAbnormal: Joi.boolean().required().description('是否异常'),
});

// 消耗核销验证模式
export const burnSchema = Joi.object({
  udi: Joi.string().required().description('资产UDI'),
  hospital: Joi.string().required().max(200).description('医院名称'),
  department: Joi.string().required().max(100).description('科室'),
  surgeryId: Joi.string().allow('').max(50).description('手术ID'),
  operator: Joi.string().required().max(100).description('操作者'),
  remarks: Joi.string().allow('').max(500).description('备注'),
  consumeQuantity: Joi.number().integer().min(1).default(1).description('消耗数量'),
});

// 哈希验证模式
export const verifyHashSchema = Joi.object({
  udi: Joi.string().required().description('资产UDI'),
  docHash: Joi.string().required().length(64).description('待验证哈希'),
});

// 用户登录验证模式
export const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(50).description('用户名'),
  password: Joi.string().required().min(6).max(100).description('密码'),
  orgName: Joi.string().required().valid('producer', 'distributor', 'hospital', 'regulator').description('组织名称'),
});

// =============================================================================
// 订单验证模式
// =============================================================================

// 创建订单验证模式
export const createOrderSchema = Joi.object({
  title: Joi.string().required().max(200).description('订单标题'),
  expectedDeliveryDate: Joi.string().required().pattern(/^\d{4}-\d{2}-\d{2}$/).description('期望交付日期'),
  remarks: Joi.string().allow('').max(1000).description('备注'),
  items: Joi.array().min(1).items(Joi.object({
    materialName: Joi.string().required().max(200).description('耗材名称'),
    specification: Joi.string().required().max(100).description('规格型号'),
    quantity: Joi.number().integer().min(1).required().description('数量'),
    unit: Joi.string().required().max(20).description('单位'),
    unitPrice: Joi.number().min(0).required().description('单价'),
    remarks: Joi.string().allow('').max(500).description('备注'),
  })).required().description('订单项列表'),
});

// 订单状态更新验证模式
export const updateOrderStatusSchema = Joi.object({
  remarks: Joi.string().allow('').max(1000).description('备注'),
  rejectReason: Joi.string().allow('').max(500).description('拒绝原因'),
  shippingId: Joi.string().allow('').max(50).description('运输单号'),
});

// 订单列表查询验证模式
export const orderListQuerySchema = Joi.object({
  status: Joi.string().allow('').valid(
    'PENDING', 'CONFIRMED', 'PRODUCING', 'READY_TO_SHIP',
    'IN_TRANSIT', 'DELIVERED', 'ACCEPTED', 'COMPLETED',
    'CANCELLED', 'REJECTED'
  ).description('订单状态'),
  keyword: Joi.string().allow('').max(100).description('搜索关键字'),
  page: Joi.number().integer().min(1).default(1).description('页码'),
  pageSize: Joi.number().integer().min(1).max(100).default(10).description('每页数量'),
});

// =============================================================================
// 验证中间件工厂函数
// =============================================================================

type ValidationSource = 'body' | 'query' | 'params';

/**
 * 创建参数验证中间件
 * @param schema Joi验证模式
 * @param source 验证来源（body/query/params）
 */
export const validate = (schema: Joi.Schema, source: ValidationSource = 'body') => {
  return async (ctx: Context, next: Next): Promise<void> => {
    let data: any;

    switch (source) {
      case 'body':
        data = ctx.request.body;
        break;
      case 'query':
        data = ctx.query;
        break;
      case 'params':
        data = ctx.params;
        break;
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      ctx.status = 400;
      ctx.body = {
        success: false,
        error: '参数验证失败',
        code: 'VALIDATION_ERROR',
        details: errorMessages,
      };
      return;
    }

    // 将验证后的数据存储到上下文
    ctx.validatedData = value;
    await next();
  };
};

// 扩展Context类型
declare module 'koa' {
  interface Context {
    validatedData?: any;
  }
}

export default validate;
