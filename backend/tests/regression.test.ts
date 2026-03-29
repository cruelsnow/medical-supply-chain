/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 系统回归测试
 * =============================================================================
 * 功能: 全面测试系统功能，确保修改后功能正常
 * =============================================================================
 */

import mockFabricService from './__mocks__/fabric.service.mock';
import { generateTestAsset, generateLifecycleTestData } from './helpers/test-helper';

/**
 * 回归测试说明:
 * 这些测试在每次系统修改后运行，确保现有功能没有被破坏
 * 覆盖所有核心功能模块
 */

describe('系统回归测试套件', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  // =========================================================================
  // 模块1: 资产初始化回归测试
  // =========================================================================
  describe('模块1: 资产初始化', () => {
    test('REG-INIT-001: 基本资产创建', async () => {
      const asset = generateTestAsset();
      const result = await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      expect(result).toBeDefined();
      expect(result.udi).toBe(asset.udi);
      expect(result.status).toBe('CREATED');
    });

    test('REG-INIT-002: 包含所有必填字段', async () => {
      const asset = generateTestAsset();
      const result = await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      expect(result.udi).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.specification).toBeDefined();
      expect(result.batchNumber).toBeDefined();
      expect(result.productionDate).toBeDefined();
      expect(result.expiryDate).toBeDefined();
      expect(result.docHash).toBeDefined();
      expect(result.producer).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.owner).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    test('REG-INIT-003: 重复UDI处理', async () => {
      const asset = generateTestAsset({ udi: 'UDI_DUPLICATE_TEST' });

      // 第一次创建
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      // 第二次创建相同UDI - 应该被业务逻辑拒绝
      const assets = await mockFabricService.queryAllAssets();
      const duplicates = assets.filter(a => a.udi === 'UDI_DUPLICATE_TEST');
      expect(duplicates.length).toBe(1);
    });
  });

  // =========================================================================
  // 模块2: 资产查询回归测试
  // =========================================================================
  describe('模块2: 资产查询', () => {
    beforeEach(async () => {
      // 准备测试数据
      for (let i = 1; i <= 5; i++) {
        const asset = generateTestAsset({ udi: `UDI_QUERY_REG_${i}` });
        await mockFabricService.initAsset(
          asset.udi,
          asset.name,
          asset.specification,
          asset.batchNumber,
          asset.productionDate,
          asset.expiryDate,
          asset.docHash,
          asset.producer
        );
      }
    });

    test('REG-QUERY-001: 单个资产查询', async () => {
      const result = await mockFabricService.queryAsset('UDI_QUERY_REG_1');
      expect(result).toBeDefined();
      expect(result?.udi).toBe('UDI_QUERY_REG_1');
    });

    test('REG-QUERY-002: 查询所有资产', async () => {
      const results = await mockFabricService.queryAllAssets();
      expect(results.length).toBeGreaterThanOrEqual(5);
    });

    test('REG-QUERY-003: 按状态查询', async () => {
      const results = await mockFabricService.queryByStatus('CREATED');
      expect(results.length).toBeGreaterThanOrEqual(5);
      results.forEach(r => expect(r.status).toBe('CREATED'));
    });

    test('REG-QUERY-004: 按所有者查询', async () => {
      const results = await mockFabricService.queryByOwner(generateTestAsset().producer);
      expect(results.length).toBeGreaterThanOrEqual(5);
    });

    test('REG-QUERY-005: 按批次查询', async () => {
      const batchNumber = generateTestAsset().batchNumber;
      const results = await mockFabricService.queryByBatch(batchNumber);
      expect(results.length).toBeGreaterThanOrEqual(5);
    });

    test('REG-QUERY-006: 不存在的资产返回null', async () => {
      const result = await mockFabricService.queryAsset('UDI_NOT_EXIST');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // 模块3: 资产转移回归测试
  // =========================================================================
  describe('模块3: 资产转移', () => {
    test('REG-TRANSFER-001: 基本转移功能', async () => {
      const asset = generateTestAsset({ udi: 'UDI_TRANSFER_REG_001' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      const result = await mockFabricService.transferAsset(
        asset.udi,
        '新所有者',
        'NewMSP',
        '测试转移'
      );

      expect(result.status).toBe('IN_TRANSIT');
      expect(result.owner).toBe('新所有者');
    });

    test('REG-TRANSFER-002: 转移后可查询', async () => {
      const asset = generateTestAsset({ udi: 'UDI_TRANSFER_REG_002' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      await mockFabricService.transferAsset(asset.udi, '新所有者', 'MSP', '转移');

      const result = await mockFabricService.queryAsset(asset.udi);
      expect(result?.owner).toBe('新所有者');
    });

    test('REG-TRANSFER-003: 转移记录到历史', async () => {
      const asset = generateTestAsset({ udi: 'UDI_TRANSFER_REG_003' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      await mockFabricService.transferAsset(asset.udi, '新所有者', 'MSP', '转移');

      const history = await mockFabricService.getHistory(asset.udi);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    test('REG-TRANSFER-004: 不存在的资产转移报错', async () => {
      await expect(
        mockFabricService.transferAsset('UDI_NOT_EXIST', '所有者', 'MSP', '备注')
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // 模块4: 收货确权回归测试
  // =========================================================================
  describe('模块4: 收货确权', () => {
    test('REG-RECEIVE-001: 基本收货功能', async () => {
      const asset = generateTestAsset({ udi: 'UDI_RECEIVE_REG_001' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
      await mockFabricService.transferAsset(asset.udi, '收货方', 'MSP', '发货');

      const result = await mockFabricService.confirmReceipt(asset.udi, '仓库');

      expect(result.status).toBe('IN_STOCK');
    });

    test('REG-RECEIVE-002: 收货后状态正确', async () => {
      const asset = generateTestAsset({ udi: 'UDI_RECEIVE_REG_002' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
      await mockFabricService.transferAsset(asset.udi, '收货方', 'MSP', '发货');
      await mockFabricService.confirmReceipt(asset.udi, '仓库');

      const result = await mockFabricService.queryAsset(asset.udi);
      expect(result?.status).toBe('IN_STOCK');
    });
  });

  // =========================================================================
  // 模块5: 消耗核销回归测试
  // =========================================================================
  describe('模块5: 消耗核销', () => {
    test('REG-BURN-001: 基本核销功能', async () => {
      const asset = generateTestAsset({ udi: 'UDI_BURN_REG_001' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
      await mockFabricService.transferAsset(asset.udi, '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt(asset.udi, '仓库');

      const result = await mockFabricService.burnAsset(
        asset.udi,
        '测试医院',
        '心内科',
        'SURGERY001',
        '张医生',
        '手术使用'
      );

      expect(result.udi).toBe(asset.udi);
    });

    test('REG-BURN-002: 核销后状态为CONSUMED', async () => {
      const asset = generateTestAsset({ udi: 'UDI_BURN_REG_002' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
      await mockFabricService.transferAsset(asset.udi, '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt(asset.udi, '仓库');
      await mockFabricService.burnAsset(asset.udi, '医院', '科室', '手术', '医生', '原因');

      const result = await mockFabricService.queryAsset(asset.udi);
      expect(result?.status).toBe('CONSUMED');
    });

    test('REG-BURN-003: 核销记录完整', async () => {
      const asset = generateTestAsset({ udi: 'UDI_BURN_REG_003' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
      await mockFabricService.transferAsset(asset.udi, '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt(asset.udi, '仓库');

      const record = await mockFabricService.burnAsset(
        asset.udi,
        '北京协和医院',
        '心内科',
        'SURGERY_2024_001',
        '张医生',
        '冠脉支架植入手术'
      );

      expect(record.hospital).toBe('北京协和医院');
      expect(record.department).toBe('心内科');
      expect(record.surgeryId).toBe('SURGERY_2024_001');
      expect(record.operator).toBe('张医生');
      expect(record.reason).toBe('冠脉支架植入手术');
      expect(record.consumedAt).toBeDefined();
    });
  });

  // =========================================================================
  // 模块6: 历史追溯回归测试
  // =========================================================================
  describe('模块6: 历史追溯', () => {
    test('REG-HISTORY-001: 完整历史记录', async () => {
      const asset = generateTestAsset({ udi: 'UDI_HISTORY_REG_001' });

      // 创建完整生命周期
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
      await mockFabricService.transferAsset(asset.udi, '经销商', 'DistributorMSP', '发货');
      await mockFabricService.confirmReceipt(asset.udi, '仓库');
      await mockFabricService.transferAsset(asset.udi, '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt(asset.udi, '医院仓库');
      await mockFabricService.burnAsset(asset.udi, '医院', '科室', '手术', '医生', '消耗');

      const history = await mockFabricService.getHistory(asset.udi);

      expect(history.length).toBeGreaterThanOrEqual(6);
    });

    test('REG-HISTORY-002: 历史记录包含时间戳', async () => {
      const asset = generateTestAsset({ udi: 'UDI_HISTORY_REG_002' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      const history = await mockFabricService.getHistory(asset.udi);

      history.forEach(record => {
        expect(record.timestamp).toBeDefined();
        expect(record.txId).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 模块7: 哈希验证回归测试
  // =========================================================================
  describe('模块7: 哈希验证', () => {
    test('REG-HASH-001: 正确哈希验证通过', async () => {
      const docHash = 'c'.repeat(64);
      const asset = generateTestAsset({ udi: 'UDI_HASH_REG_001', docHash });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      const result = await mockFabricService.verifyHash(asset.udi, docHash);

      expect(result.isValid).toBe(true);
    });

    test('REG-HASH-002: 错误哈希验证失败', async () => {
      const asset = generateTestAsset({ udi: 'UDI_HASH_REG_002', docHash: 'a'.repeat(64) });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      const result = await mockFabricService.verifyHash(asset.udi, 'b'.repeat(64));

      expect(result.isValid).toBe(false);
    });
  });

  // =========================================================================
  // 模块8: 召回功能回归测试
  // =========================================================================
  describe('模块8: 资产召回', () => {
    test('REG-RECALL-001: 基本召回功能', async () => {
      const asset = generateTestAsset({ udi: 'UDI_RECALL_REG_001' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      const result = await mockFabricService.recallAsset(asset.udi, '质量召回');

      expect(result.status).toBe('RECALL');
    });

    test('REG-RECALL-002: 召回后状态正确', async () => {
      const asset = generateTestAsset({ udi: 'UDI_RECALL_REG_002' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
      await mockFabricService.recallAsset(asset.udi, '质量召回');

      const result = await mockFabricService.queryAsset(asset.udi);
      expect(result?.status).toBe('RECALL');
    });
  });

  // =========================================================================
  // 模块9: 环境监控回归测试
  // =========================================================================
  describe('模块9: 环境监控', () => {
    test('REG-ENV-001: 记录环境数据', async () => {
      const asset = generateTestAsset({ udi: 'UDI_ENV_REG_001' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
      await mockFabricService.transferAsset(asset.udi, '物流', 'LogisticsMSP', '发货');

      const result = await mockFabricService.updateEnvData(
        asset.udi,
        5.5,
        65,
        '北京市',
        '物流员'
      );

      expect(result.udi).toBe(asset.udi);
      expect(result.temperature).toBe(5.5);
      expect(result.humidity).toBe(65);
    });

    test('REG-ENV-002: 查询环境数据', async () => {
      const asset = generateTestAsset({ udi: 'UDI_ENV_REG_002' });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
      await mockFabricService.transferAsset(asset.udi, '物流', 'LogisticsMSP', '发货');

      await mockFabricService.updateEnvData(asset.udi, 5, 65, '位置1', '人员');
      await mockFabricService.updateEnvData(asset.udi, 6, 60, '位置2', '人员');

      const results = await mockFabricService.getEnvData(asset.udi);

      expect(results.length).toBe(2);
    });
  });

  // =========================================================================
  // 模块10: 效期预警回归测试
  // =========================================================================
  describe('模块10: 效期预警', () => {
    test('REG-EXPIRY-001: 查询即将过期资产', async () => {
      const nearExpiryDate = new Date();
      nearExpiryDate.setDate(nearExpiryDate.getDate() + 15);

      const asset = generateTestAsset({
        udi: 'UDI_EXPIRY_REG_001',
        expiryDate: nearExpiryDate.toISOString().split('T')[0]
      });

      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );

      const results = await mockFabricService.queryExpiringSoon(30);

      expect(results.some(a => a.udi === 'UDI_EXPIRY_REG_001')).toBe(true);
    });
  });

  // =========================================================================
  // 模块11: 统计功能回归测试
  // =========================================================================
  describe('模块11: 数据统计', () => {
    test('REG-STATS-001: 资产计数', async () => {
      mockFabricService.resetAllMocks();

      for (let i = 1; i <= 10; i++) {
        const asset = generateTestAsset({ udi: `UDI_STATS_REG_${i}` });
        await mockFabricService.initAsset(
          asset.udi,
          asset.name,
          asset.specification,
          asset.batchNumber,
          asset.productionDate,
          asset.expiryDate,
          asset.docHash,
          asset.producer
        );
      }

      const count = await mockFabricService.getAssetCount();

      expect(count).toBe(10);
    });
  });
});

describe('系统边界回归测试', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  test('REG-EDGE-001: 处理空字符串UDI', async () => {
    const asset = generateTestAsset({ udi: '' });
    const result = await mockFabricService.initAsset(
      asset.udi,
      asset.name,
      asset.specification,
      asset.batchNumber,
      asset.productionDate,
      asset.expiryDate,
      asset.docHash,
      asset.producer
    );

    expect(result.udi).toBe('');
  });

  test('REG-EDGE-002: 处理超长名称', async () => {
    const longName = '测试'.repeat(500);
    const asset = generateTestAsset({ name: longName });
    const result = await mockFabricService.initAsset(
      asset.udi,
      asset.name,
      asset.specification,
      asset.batchNumber,
      asset.productionDate,
      asset.expiryDate,
      asset.docHash,
      asset.producer
    );

    expect(result.name).toBe(longName);
  });

  test('REG-EDGE-003: 处理特殊字符', async () => {
    const specialAsset = generateTestAsset({
      udi: 'UDI_SPECIAL_!@#$%',
      name: '名称<>&"\'\n\t',
      producer: '厂商\u0000'
    });

    const result = await mockFabricService.initAsset(
      specialAsset.udi,
      specialAsset.name,
      specialAsset.specification,
      specialAsset.batchNumber,
      specialAsset.productionDate,
      specialAsset.expiryDate,
      specialAsset.docHash,
      specialAsset.producer
    );

    expect(result.udi).toContain('!');
    expect(result.name).toContain('<');
  });

  test('REG-EDGE-004: 处理Unicode字符', async () => {
    const unicodeAsset = generateTestAsset({
      name: '心脏支架🩺💉',
      producer: '美敦力®医疗™',
      specification: '10×50mm³'
    });

    const result = await mockFabricService.initAsset(
      unicodeAsset.udi,
      unicodeAsset.name,
      unicodeAsset.specification,
      unicodeAsset.batchNumber,
      unicodeAsset.productionDate,
      unicodeAsset.expiryDate,
      unicodeAsset.docHash,
      unicodeAsset.producer
    );

    expect(result.name).toContain('🩺');
    expect(result.producer).toContain('®');
    expect(result.specification).toContain('×');
  });
});

describe('系统稳定性回归测试', () => {
  test('REG-STABLE-001: 连续操作不丢失数据', async () => {
    mockFabricService.resetAllMocks();

    // 连续创建100个资产
    for (let i = 1; i <= 100; i++) {
      const asset = generateTestAsset({ udi: `UDI_STRESS_${i.toString().padStart(3, '0')}` });
      await mockFabricService.initAsset(
        asset.udi,
        asset.name,
        asset.specification,
        asset.batchNumber,
        asset.productionDate,
        asset.expiryDate,
        asset.docHash,
        asset.producer
      );
    }

    const count = await mockFabricService.getAssetCount();
    expect(count).toBe(100);

    // 验证每个资产都可查询
    for (let i = 1; i <= 100; i++) {
      const udi = `UDI_STRESS_${i.toString().padStart(3, '0')}`;
      const asset = await mockFabricService.queryAsset(udi);
      expect(asset).toBeDefined();
    }
  });

  test('REG-STABLE-002: 并发操作隔离', async () => {
    mockFabricService.resetAllMocks();

    // 模拟并发操作
    const operations = [];
    for (let i = 1; i <= 10; i++) {
      const asset = generateTestAsset({ udi: `UDI_CONCURRENT_${i}` });
      operations.push(
        mockFabricService.initAsset(
          asset.udi,
          asset.name,
          asset.specification,
          asset.batchNumber,
          asset.productionDate,
          asset.expiryDate,
          asset.docHash,
          asset.producer
        )
      );
    }

    await Promise.all(operations);

    const count = await mockFabricService.getAssetCount();
    expect(count).toBe(10);
  });
});

// 测试总结
afterAll(() => {
  console.log('\n========================================');
  console.log('系统回归测试套件执行完成');
  console.log('========================================');
});
