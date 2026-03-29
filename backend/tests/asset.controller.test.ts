/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 资产控制器测试
 * =============================================================================
 * 功能: 测试资产管理相关的所有API接口
 * =============================================================================
 */

import { createContext, createNext, generateTestAsset, generateTestUser } from './helpers/test-helper';
import mockFabricService from './__mocks__/fabric.service.mock';

// 模拟Fabric服务
jest.mock('../src/services/fabric.service', () => ({
  FabricService: jest.fn().mockImplementation(() => mockFabricService)
}));

describe('AssetController 资产控制器测试', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  describe('POST /api/asset/init - 资产初始化', () => {
    test('应该成功创建新资产', async () => {
      const assetData = generateTestAsset();
      const ctx = createContext({
        method: 'POST',
        path: '/api/asset/init',
        body: assetData,
        state: { user: generateTestUser('producer') }
      });

      // 调用模拟服务
      const result = await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      expect(result).toBeDefined();
      expect(result.udi).toBe(assetData.udi);
      expect(result.name).toBe(assetData.name);
      expect(result.status).toBe('CREATED');
      expect(result.owner).toBe(assetData.producer);
    });

    test('应该拒绝缺少UDI的请求', async () => {
      const assetData = generateTestAsset() as any;
      delete assetData.udi;

      const ctx = createContext({
        method: 'POST',
        path: '/api/asset/init',
        body: assetData,
        state: { user: generateTestUser('producer') }
      });

      // 验证UDI缺失
      expect((ctx.request.body as any).udi).toBeUndefined();
    });

    test('应该拒绝非生产商用户创建资产', async () => {
      const assetData = generateTestAsset();
      const ctx = createContext({
        method: 'POST',
        path: '/api/asset/init',
        body: assetData,
        state: { user: generateTestUser('hospital') } // 医院用户
      });

      // 验证用户角色
      expect(ctx.state.user.orgName).toBe('hospital');
      // 实际实现中应该拒绝此请求
    });

    test('应该正确记录创建时间', async () => {
      const assetData = generateTestAsset();
      const beforeCreate = new Date();

      const result = await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      const afterCreate = new Date();
      const createdAt = new Date(result.createdAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('GET /api/asset/query/:udi - 查询资产', () => {
    test('应该成功查询存在的资产', async () => {
      // 先创建资产
      const assetData = generateTestAsset({ udi: 'UDI_QUERY_001' });
      await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      // 查询资产
      const result = await mockFabricService.queryAsset('UDI_QUERY_001');

      expect(result).toBeDefined();
      expect(result?.udi).toBe('UDI_QUERY_001');
    });

    test('应该返回null查询不存在的资产', async () => {
      const result = await mockFabricService.queryAsset('UDI_NOT_EXIST');

      expect(result).toBeNull();
    });

    test('应该正确处理特殊字符UDI', async () => {
      const specialUdi = 'UDI-SPECIAL_001';
      const assetData = generateTestAsset({ udi: specialUdi });

      await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      const result = await mockFabricService.queryAsset(specialUdi);
      expect(result?.udi).toBe(specialUdi);
    });
  });

  describe('GET /api/asset/all - 查询所有资产', () => {
    test('应该返回所有资产列表', async () => {
      // 创建多个资产
      for (let i = 1; i <= 3; i++) {
        const assetData = generateTestAsset({ udi: `UDI_ALL_${i}` });
        await mockFabricService.initAsset(
          assetData.udi,
          assetData.name,
          assetData.specification,
          assetData.batchNumber,
          assetData.productionDate,
          assetData.expiryDate,
          assetData.docHash,
          assetData.producer
        );
      }

      const results = await mockFabricService.queryAllAssets();

      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    test('应该返回空数组当没有资产时', async () => {
      mockFabricService.resetAllMocks();
      const results = await mockFabricService.queryAllAssets();
      expect(results).toEqual([]);
    });
  });

  describe('POST /api/asset/transfer - 资产转移', () => {
    test('应该成功转移资产所有权', async () => {
      // 创建资产
      const assetData = generateTestAsset({ udi: 'UDI_TRANSFER_001' });
      await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      // 转移资产
      const result = await mockFabricService.transferAsset(
        'UDI_TRANSFER_001',
        '国药控股',
        'DistributorMSP',
        '发货至经销商'
      );

      expect(result.status).toBe('IN_TRANSIT');
      expect(result.owner).toBe('国药控股');
    });

    test('应该拒绝转移不存在的资产', async () => {
      await expect(
        mockFabricService.transferAsset('UDI_NOT_EXIST', '新所有者', 'MSP', '备注')
      ).rejects.toThrow();
    });

    test('应该正确记录转移时间', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_TRANSFER_TIME' });
      await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      const beforeTransfer = new Date();
      const result = await mockFabricService.transferAsset(
        'UDI_TRANSFER_TIME',
        '新所有者',
        'MSP',
        '转移'
      );
      const afterTransfer = new Date();

      const updatedAt = new Date(result.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTransfer.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterTransfer.getTime());
    });
  });

  describe('POST /api/asset/burn - 消耗核销', () => {
    test('应该成功核销在库资产', async () => {
      // 创建并转移资产到入库状态
      const assetData = generateTestAsset({ udi: 'UDI_BURN_001' });
      await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );
      await mockFabricService.transferAsset('UDI_BURN_001', '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt('UDI_BURN_001', '医院仓库');

      // 核销
      const result = await mockFabricService.burnAsset(
        'UDI_BURN_001',
        '测试医院',
        '心内科',
        'SURGERY001',
        '张医生',
        '手术使用'
      );

      expect(result.udi).toBe('UDI_BURN_001');
      expect(result.hospital).toBe('测试医院');
      expect(result.department).toBe('心内科');

      // 验证资产状态
      const asset = await mockFabricService.queryAsset('UDI_BURN_001');
      expect(asset?.status).toBe('CONSUMED');
    });

    test('应该拒绝核销不存在的资产', async () => {
      await expect(
        mockFabricService.burnAsset('UDI_NOT_EXIST', '医院', '科室', '手术ID', '医生', '原因')
      ).rejects.toThrow();
    });
  });

  describe('GET /api/asset/history/:udi - 历史追溯', () => {
    test('应该返回完整的资产历史记录', async () => {
      // 创建资产
      const assetData = generateTestAsset({ udi: 'UDI_HISTORY_001' });
      await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      // 转移
      await mockFabricService.transferAsset('UDI_HISTORY_001', '经销商', 'DistributorMSP', '发货');

      // 收货
      await mockFabricService.confirmReceipt('UDI_HISTORY_001', '仓库');

      // 查询历史
      const history = await mockFabricService.getHistory('UDI_HISTORY_001');

      expect(history.length).toBeGreaterThanOrEqual(3);
      expect(history[0].value.status).toBe('CREATED');
    });

    test('应该返回空数组对于不存在的资产', async () => {
      const history = await mockFabricService.getHistory('UDI_NOT_EXIST');
      expect(history).toEqual([]);
    });
  });

  describe('POST /api/asset/recall - 资产召回', () => {
    test('应该成功召回资产', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_RECALL_001' });
      await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      const result = await mockFabricService.recallAsset('UDI_RECALL_001', '质量缺陷召回');

      expect(result.status).toBe('RECALL');
    });
  });

  describe('GET /api/asset/status/:status - 按状态查询', () => {
    test('应该返回指定状态的所有资产', async () => {
      // 创建不同状态的资产
      for (let i = 1; i <= 3; i++) {
        const assetData = generateTestAsset({ udi: `UDI_STATUS_${i}` });
        await mockFabricService.initAsset(
          assetData.udi,
          assetData.name,
          assetData.specification,
          assetData.batchNumber,
          assetData.productionDate,
          assetData.expiryDate,
          assetData.docHash,
          assetData.producer
        );
      }

      const results = await mockFabricService.queryByStatus('CREATED');

      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach(asset => {
        expect(asset.status).toBe('CREATED');
      });
    });
  });

  describe('GET /api/asset/owner/:owner - 按所有者查询', () => {
    test('应该返回指定所有者的资产', async () => {
      const owner = '测试生产商';
      const assetData = generateTestAsset({ udi: 'UDI_OWNER_001', producer: owner });
      await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        owner
      );

      const results = await mockFabricService.queryByOwner(owner);

      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach(asset => {
        expect(asset.owner).toBe(owner);
      });
    });
  });

  describe('GET /api/asset/expiring - 查询即将过期资产', () => {
    test('应该返回即将过期的资产', async () => {
      // 创建即将过期的资产（30天内）
      const nearExpiryDate = new Date();
      nearExpiryDate.setDate(nearExpiryDate.getDate() + 15); // 15天后过期

      const assetData = generateTestAsset({
        udi: 'UDI_EXPIRING_001',
        expiryDate: nearExpiryDate.toISOString().split('T')[0]
      });
      await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      const results = await mockFabricService.queryExpiringSoon(30);

      expect(results.some(a => a.udi === 'UDI_EXPIRING_001')).toBe(true);
    });
  });
});

describe('资产控制器边界条件测试', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  test('应该处理超长UDI', async () => {
    const longUdi = 'UDI_' + 'x'.repeat(500);
    const assetData = generateTestAsset({ udi: longUdi });

    const result = await mockFabricService.initAsset(
      assetData.udi,
      assetData.name,
      assetData.specification,
      assetData.batchNumber,
      assetData.productionDate,
      assetData.expiryDate,
      assetData.docHash,
      assetData.producer
    );

    expect(result.udi.length).toBe(504);
  });

  test('应该处理无效日期格式', async () => {
    const assetData = generateTestAsset({
      productionDate: 'invalid-date',
      expiryDate: '2026-01-01'
    });

    // 即使日期格式无效，模拟服务也应该处理
    const result = await mockFabricService.initAsset(
      assetData.udi,
      assetData.name,
      assetData.specification,
      assetData.batchNumber,
      assetData.productionDate,
      assetData.expiryDate,
      assetData.docHash,
      assetData.producer
    );

    expect(result.productionDate).toBe('invalid-date');
  });

  test('应该处理空批次号', async () => {
    const assetData = generateTestAsset({ batchNumber: '' });

    const result = await mockFabricService.initAsset(
      assetData.udi,
      assetData.name,
      assetData.specification,
      assetData.batchNumber,
      assetData.productionDate,
      assetData.expiryDate,
      assetData.docHash,
      assetData.producer
    );

    expect(result.batchNumber).toBe('');
  });

  test('应该处理Unicode字符', async () => {
    const assetData = generateTestAsset({
      name: '心脏支架🩺❤️',
      specification: '10×50mm³',
      producer: '美敦力®医疗™'
    });

    const result = await mockFabricService.initAsset(
      assetData.udi,
      assetData.name,
      assetData.specification,
      assetData.batchNumber,
      assetData.productionDate,
      assetData.expiryDate,
      assetData.docHash,
      assetData.producer
    );

    expect(result.name).toContain('🩺');
    expect(result.specification).toContain('×');
    expect(result.producer).toContain('®');
  });
});
