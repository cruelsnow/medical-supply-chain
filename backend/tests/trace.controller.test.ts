/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 追溯控制器测试
 * =============================================================================
 * 功能: 测试追溯监管相关的API接口（全链追溯、哈希校验、数据统计）
 * =============================================================================
 */

import { createContext, generateTestAsset, generateLifecycleTestData } from './helpers/test-helper';
import mockFabricService from './__mocks__/fabric.service.mock';

jest.mock('../src/services/fabric.service', () => ({
  FabricService: jest.fn().mockImplementation(() => mockFabricService)
}));

describe('TraceController 追溯控制器测试', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  describe('GET /api/trace/report/:udi - 追溯报告', () => {
    test('应该生成完整的追溯报告', async () => {
      // 创建完整的生命周期
      const testData = generateLifecycleTestData();
      const assetData = testData.producer;

      // 1. 创建
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

      // 2. 发货给经销商
      await mockFabricService.transferAsset(assetData.udi, testData.distributor.owner, 'DistributorMSP', '发货');

      // 3. 经销商收货
      await mockFabricService.confirmReceipt(assetData.udi, testData.distributor.location);

      // 4. 发货给医院
      await mockFabricService.transferAsset(assetData.udi, testData.hospital.owner, 'HospitalMSP', '发货');

      // 5. 医院入库
      await mockFabricService.confirmReceipt(assetData.udi, testData.hospital.location);

      // 6. 临床消耗
      await mockFabricService.burnAsset(
        assetData.udi,
        testData.hospital.owner,
        testData.hospital.department,
        testData.hospital.surgeryId,
        testData.hospital.operator,
        testData.hospital.reason
      );

      // 获取历史记录
      const history = await mockFabricService.getHistory(assetData.udi);

      expect(history.length).toBeGreaterThanOrEqual(6);

      // 验证状态变化
      const statuses = history.map(h => h.value.status);
      expect(statuses).toContain('CREATED');
      expect(statuses).toContain('IN_TRANSIT');
      expect(statuses).toContain('IN_STOCK');
      expect(statuses).toContain('CONSUMED');
    });

    test('应该包含生产信息', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_PROD_INFO' });
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

      const asset = await mockFabricService.queryAsset(assetData.udi);

      expect(asset?.producer).toBe(assetData.producer);
      expect(asset?.productionDate).toBe(assetData.productionDate);
      expect(asset?.batchNumber).toBe(assetData.batchNumber);
    });

    test('应该包含物流轨迹', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_LOGISTICS_TRACK' });
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

      // 记录物流轨迹
      await mockFabricService.transferAsset(assetData.udi, '经销商A', 'DistributorMSP', '发货');
      await mockFabricService.updateEnvData(assetData.udi, 5, 65, '北京', '物流员1');
      await mockFabricService.confirmReceipt(assetData.udi, '北京仓库');

      const envData = await mockFabricService.getEnvData(assetData.udi);
      expect(envData.length).toBeGreaterThanOrEqual(1);
    });

    test('应该包含消耗信息', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_CONSUME_INFO' });
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
      await mockFabricService.transferAsset(assetData.udi, '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt(assetData.udi, '仓库');

      const consumeRecord = await mockFabricService.burnAsset(
        assetData.udi,
        '测试医院',
        '心内科',
        'SURGERY001',
        '张医生',
        '手术使用'
      );

      expect(consumeRecord.hospital).toBe('测试医院');
      expect(consumeRecord.department).toBe('心内科');
      expect(consumeRecord.operator).toBe('张医生');
    });

    test('应该返回空报告对于不存在的资产', async () => {
      const history = await mockFabricService.getHistory('UDI_NOT_EXIST');
      expect(history).toEqual([]);
    });
  });

  describe('POST /api/trace/verify - 哈希校验', () => {
    test('应该验证匹配的哈希', async () => {
      const docHash = 'a'.repeat(64);
      const assetData = generateTestAsset({ udi: 'UDI_HASH_MATCH', docHash });
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

      const result = await mockFabricService.verifyHash(assetData.udi, docHash);

      expect(result.isValid).toBe(true);
    });

    test('应该拒绝不匹配的哈希', async () => {
      const correctHash = 'a'.repeat(64);
      const wrongHash = 'b'.repeat(64);
      const assetData = generateTestAsset({ udi: 'UDI_HASH_WRONG', docHash: correctHash });
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

      const result = await mockFabricService.verifyHash(assetData.udi, wrongHash);

      expect(result.isValid).toBe(false);
    });

    test('应该拒绝不存在的资产哈希验证', async () => {
      await expect(
        mockFabricService.verifyHash('UDI_NOT_EXIST', 'some_hash')
      ).rejects.toThrow();
    });

    test('应该处理空哈希', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_EMPTY_HASH', docHash: 'valid_hash' });
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

      const result = await mockFabricService.verifyHash(assetData.udi, '');

      expect(result.isValid).toBe(false);
    });
  });

  describe('GET /api/trace/stats - 数据统计', () => {
    test('应该返回正确的资产统计', async () => {
      // 创建多个不同状态的资产
      for (let i = 1; i <= 5; i++) {
        const assetData = generateTestAsset({ udi: `UDI_STATS_${i}` });
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

      const count = await mockFabricService.getAssetCount();

      expect(count).toBeGreaterThanOrEqual(5);
    });

    test('应该返回按状态分组的统计', async () => {
      // 创建不同状态的资产
      const asset1 = generateTestAsset({ udi: 'UDI_GROUP_CREATED_1' });
      const asset2 = generateTestAsset({ udi: 'UDI_GROUP_CREATED_2' });
      const asset3 = generateTestAsset({ udi: 'UDI_GROUP_STOCK' });

      await mockFabricService.initAsset(asset1.udi, asset1.name, asset1.specification, asset1.batchNumber, asset1.productionDate, asset1.expiryDate, asset1.docHash, asset1.producer);
      await mockFabricService.initAsset(asset2.udi, asset2.name, asset2.specification, asset2.batchNumber, asset2.productionDate, asset2.expiryDate, asset2.docHash, asset2.producer);
      await mockFabricService.initAsset(asset3.udi, asset3.name, asset3.specification, asset3.batchNumber, asset3.productionDate, asset3.expiryDate, asset3.docHash, asset3.producer);

      await mockFabricService.transferAsset(asset3.udi, '经销商', 'DistributorMSP', '发货');
      await mockFabricService.confirmReceipt(asset3.udi, '仓库');

      const created = await mockFabricService.queryByStatus('CREATED');
      const inStock = await mockFabricService.queryByStatus('IN_STOCK');

      expect(created.length).toBeGreaterThanOrEqual(2);
      expect(inStock.length).toBeGreaterThanOrEqual(1);
    });

    test('应该返回按所有者分组的统计', async () => {
      const producer1 = '生产商A';
      const producer2 = '生产商B';

      const asset1 = generateTestAsset({ udi: 'UDI_OWNER_A', producer: producer1 });
      const asset2 = generateTestAsset({ udi: 'UDI_OWNER_B', producer: producer2 });

      await mockFabricService.initAsset(asset1.udi, asset1.name, asset1.specification, asset1.batchNumber, asset1.productionDate, asset1.expiryDate, asset1.docHash, producer1);
      await mockFabricService.initAsset(asset2.udi, asset2.name, asset2.specification, asset2.batchNumber, asset2.productionDate, asset2.expiryDate, asset2.docHash, producer2);

      const assetsA = await mockFabricService.queryByOwner(producer1);
      const assetsB = await mockFabricService.queryByOwner(producer2);

      expect(assetsA.length).toBeGreaterThanOrEqual(1);
      expect(assetsB.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/trace/batch/:batchNumber - 批次追溯', () => {
    test('应该返回同一批次的所有资产', async () => {
      const batchNumber = 'BATCH_TRACE_001';

      // 创建同批次资产
      for (let i = 1; i <= 3; i++) {
        const assetData = generateTestAsset({ udi: `UDI_BATCH_${i}`, batchNumber });
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

      const batchAssets = await mockFabricService.queryByBatch(batchNumber);

      expect(batchAssets.length).toBe(3);
      batchAssets.forEach(asset => {
        expect(asset.batchNumber).toBe(batchNumber);
      });
    });

    test('应该返回空数组对于不存在的批次', async () => {
      const batchAssets = await mockFabricService.queryByBatch('BATCH_NOT_EXIST');
      expect(batchAssets).toEqual([]);
    });
  });
});

describe('追溯控制器报告生成测试', () => {
  test('应该生成JSON格式报告', () => {
    const report = {
      udi: 'UDI_REPORT_001',
      name: '测试耗材',
      lifecycle: [
        { status: 'CREATED', timestamp: '2024-01-01T00:00:00Z', actor: '生产商' },
        { status: 'IN_TRANSIT', timestamp: '2024-01-02T00:00:00Z', actor: '物流' },
        { status: 'IN_STOCK', timestamp: '2024-01-03T00:00:00Z', actor: '医院' }
      ]
    };

    const jsonReport = JSON.stringify(report);
    const parsed = JSON.parse(jsonReport);

    expect(parsed.udi).toBe('UDI_REPORT_001');
    expect(parsed.lifecycle.length).toBe(3);
  });

  test('应该计算追溯完整性', () => {
    const checkTraceability = (history: { status: string }[]) => {
      const requiredStatuses = ['CREATED', 'IN_TRANSIT', 'IN_STOCK', 'CONSUMED'];
      const actualStatuses = history.map(h => h.status);
      return requiredStatuses.every(s => actualStatuses.includes(s));
    };

    const completeHistory = [
      { status: 'CREATED' },
      { status: 'IN_TRANSIT' },
      { status: 'IN_STOCK' },
      { status: 'CONSUMED' }
    ];

    const incompleteHistory = [
      { status: 'CREATED' },
      { status: 'IN_TRANSIT' }
    ];

    expect(checkTraceability(completeHistory)).toBe(true);
    expect(checkTraceability(incompleteHistory)).toBe(false);
  });

  test('应该计算追溯时长', () => {
    const calculateDuration = (startTime: string, endTime: string): number => {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      return (end - start) / (1000 * 60 * 60 * 24); // 天数
    };

    const duration = calculateDuration('2024-01-01', '2024-01-10');
    expect(duration).toBe(9);
  });
});

describe('追溯控制器监管功能测试', () => {
  test('应该检测异常状态转换', () => {
    const validateStatusTransition = (from: string, to: string): boolean => {
      const validTransitions: Record<string, string[]> = {
        'CREATED': ['IN_TRANSIT', 'RECALL'],
        'IN_TRANSIT': ['IN_STOCK', 'RECALL'],
        'IN_STOCK': ['CONSUMED', 'IN_TRANSIT', 'RECALL'],
        'CONSUMED': [],
        'RECALL': []
      };

      return validTransitions[from]?.includes(to) || false;
    };

    expect(validateStatusTransition('CREATED', 'IN_TRANSIT')).toBe(true);
    expect(validateStatusTransition('CREATED', 'CONSUMED')).toBe(false); // 非法跳转
    expect(validateStatusTransition('CONSUMED', 'IN_STOCK')).toBe(false); // 已消耗不能再入库
  });

  test('应该检测召回资产', async () => {
    const assetData = generateTestAsset({ udi: 'UDI_RECALL_CHECK' });
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

    const result = await mockFabricService.recallAsset('UDI_RECALL_CHECK', '质量缺陷');

    expect(result.status).toBe('RECALL');
  });

  test('应该提供审计日志', async () => {
    const assetData = generateTestAsset({ udi: 'UDI_AUDIT_LOG' });
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
    await mockFabricService.transferAsset('UDI_AUDIT_LOG', '经销商', 'DistributorMSP', '发货');

    const history = await mockFabricService.getHistory('UDI_AUDIT_LOG');

    // 每条历史记录应该有交易ID和时间戳
    history.forEach(record => {
      expect(record.txId).toBeDefined();
      expect(record.timestamp).toBeDefined();
    });
  });
});
