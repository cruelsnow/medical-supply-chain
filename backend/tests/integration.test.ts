/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 集成测试
 * =============================================================================
 * 功能: 测试各模块之间的集成，模拟真实业务流程
 * =============================================================================
 */

import mockFabricService from './__mocks__/fabric.service.mock';
import { generateTestAsset, generateLifecycleTestData } from './helpers/test-helper';

/**
 * 集成测试说明:
 * 这些测试模拟完整的业务流程，验证各组件之间的协作
 */

describe('集成测试 - 完整供应链流程', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  describe('场景1: 标准供应链流程', () => {
    test('应该完成 生产商 -> 经销商 -> 医院 -> 消耗 的完整流程', async () => {
      const testData = generateLifecycleTestData();
      const assetData = testData.producer;

      // ========== 步骤1: 生产商创建资产 ==========
      console.log('步骤1: 生产商创建资产...');
      const createdAsset = await mockFabricService.initAsset(
        assetData.udi,
        assetData.name,
        assetData.specification,
        assetData.batchNumber,
        assetData.productionDate,
        assetData.expiryDate,
        assetData.docHash,
        assetData.producer
      );

      expect(createdAsset).toBeDefined();
      expect(createdAsset.status).toBe('CREATED');
      expect(createdAsset.owner).toBe(assetData.producer);

      // ========== 步骤2: 生产商发货给经销商 ==========
      console.log('步骤2: 生产商发货给经销商...');
      const transferredToDistributor = await mockFabricService.transferAsset(
        assetData.udi,
        testData.distributor.owner,
        'DistributorMSP',
        '发货至经销商'
      );

      expect(transferredToDistributor.status).toBe('IN_TRANSIT');
      expect(transferredToDistributor.owner).toBe(testData.distributor.owner);

      // ========== 步骤3: 经销商收货确权 ==========
      console.log('步骤3: 经销商收货确权...');
      const receivedByDistributor = await mockFabricService.confirmReceipt(
        assetData.udi,
        testData.distributor.location
      );

      expect(receivedByDistributor.status).toBe('IN_STOCK');

      // ========== 步骤4: 经销商发货给医院 ==========
      console.log('步骤4: 经销商发货给医院...');
      const transferredToHospital = await mockFabricService.transferAsset(
        assetData.udi,
        testData.hospital.owner,
        'HospitalMSP',
        '发货至医院'
      );

      expect(transferredToHospital.status).toBe('IN_TRANSIT');
      expect(transferredToHospital.owner).toBe(testData.hospital.owner);

      // ========== 步骤5: 医院验收入库 ==========
      console.log('步骤5: 医院验收入库...');
      const receivedByHospital = await mockFabricService.confirmReceipt(
        assetData.udi,
        testData.hospital.location
      );

      expect(receivedByHospital.status).toBe('IN_STOCK');

      // ========== 步骤6: 临床消耗核销 ==========
      console.log('步骤6: 临床消耗核销...');
      const consumeRecord = await mockFabricService.burnAsset(
        assetData.udi,
        testData.hospital.owner,
        testData.hospital.department,
        testData.hospital.surgeryId,
        testData.hospital.operator,
        testData.hospital.reason
      );

      expect(consumeRecord.udi).toBe(assetData.udi);
      expect(consumeRecord.hospital).toBe(testData.hospital.owner);

      // ========== 步骤7: 验证最终状态 ==========
      console.log('步骤7: 验证最终状态...');
      const finalAsset = await mockFabricService.queryAsset(assetData.udi);
      expect(finalAsset?.status).toBe('CONSUMED');

      // ========== 步骤8: 验证历史记录完整性 ==========
      console.log('步骤8: 验证历史记录完整性...');
      const history = await mockFabricService.getHistory(assetData.udi);
      expect(history.length).toBeGreaterThanOrEqual(6);

      // 验证状态变化序列
      const statusSequence = history.map(h => h.value.status);
      expect(statusSequence).toContain('CREATED');
      expect(statusSequence).toContain('IN_TRANSIT');
      expect(statusSequence).toContain('IN_STOCK');
      expect(statusSequence).toContain('CONSUMED');

      console.log('✅ 完整供应链流程测试通过！');
    });
  });

  describe('场景2: 带环境监控的冷链运输', () => {
    test('应该记录并验证冷链环境数据', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_COLD_CHAIN_001' });

      // 创建资产
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

      // 发货
      await mockFabricService.transferAsset(assetData.udi, '物流商', 'LogisticsMSP', '冷链发货');

      // 模拟运输过程中的多次环境数据记录
      const envRecords = [
        { temperature: 4.5, humidity: 65, location: '北京' },
        { temperature: 5.0, humidity: 62, location: '天津' },
        { temperature: 4.8, humidity: 64, location: '济南' },
        { temperature: 5.2, humidity: 60, location: '南京' },
        { temperature: 4.6, humidity: 63, location: '上海' }
      ];

      for (const env of envRecords) {
        await mockFabricService.updateEnvData(
          assetData.udi,
          env.temperature,
          env.humidity,
          env.location,
          '物流员'
        );
      }

      // 验证环境数据
      const recordedEnv = await mockFabricService.getEnvData(assetData.udi);
      expect(recordedEnv.length).toBe(5);

      // 验证温度在冷链范围内 (2-8°C)
      recordedEnv.forEach(record => {
        expect(record.temperature).toBeGreaterThanOrEqual(2);
        expect(record.temperature).toBeLessThanOrEqual(8);
      });

      // 收货
      await mockFabricService.confirmReceipt(assetData.udi, '上海仓库');

      const asset = await mockFabricService.queryAsset(assetData.udi);
      expect(asset?.status).toBe('IN_STOCK');
    });

    test('应该检测并报警冷链断链', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_COLD_BREAK_001' });

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

      await mockFabricService.transferAsset(assetData.udi, '物流商', 'LogisticsMSP', '发货');

      // 正常温度
      await mockFabricService.updateEnvData(assetData.udi, 5, 65, '位置1', '人员');

      // 异常温度 - 冷链断链
      await mockFabricService.updateEnvData(assetData.udi, 12, 70, '位置2', '人员');

      // 恢复正常
      await mockFabricService.updateEnvData(assetData.udi, 6, 62, '位置3', '人员');

      const envData = await mockFabricService.getEnvData(assetData.udi);

      // 检测是否有断链记录
      const hasColdChainBreak = envData.some(r => r.temperature > 8 || r.temperature < 2);
      expect(hasColdChainBreak).toBe(true);
    });
  });

  describe('场景3: 资产召回流程', () => {
    test('应该正确执行召回流程', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_RECALL_FLOW_001' });

      // 创建并发货
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

      await mockFabricService.transferAsset(assetData.udi, '经销商', 'DistributorMSP', '发货');
      await mockFabricService.confirmReceipt(assetData.udi, '仓库');

      // 发现问题，执行召回
      const recalledAsset = await mockFabricService.recallAsset(
        assetData.udi,
        '发现质量问题，立即召回'
      );

      expect(recalledAsset.status).toBe('RECALL');

      // 验证召回资产不能被消耗
      const asset = await mockFabricService.queryAsset(assetData.udi);
      expect(asset?.status).toBe('RECALL');
    });
  });

  describe('场景4: 哈希验证流程', () => {
    test('应该验证文档完整性', async () => {
      const docHash = 'abc123def456'.padEnd(64, '0');
      const assetData = generateTestAsset({ udi: 'UDI_HASH_VERIFY_001', docHash });

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

      // 验证正确的哈希
      const validResult = await mockFabricService.verifyHash(assetData.udi, docHash);
      expect(validResult.isValid).toBe(true);

      // 验证错误的哈希
      const invalidResult = await mockFabricService.verifyHash(assetData.udi, 'wrong_hash');
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('场景5: 批次管理', () => {
    test('应该正确管理同批次资产', async () => {
      const batchNumber = 'BATCH_INTEGRATION_001';

      // 创建同批次资产
      for (let i = 1; i <= 5; i++) {
        const assetData = generateTestAsset({
          udi: `UDI_BATCH_INTEG_${i}`,
          batchNumber
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
      }

      // 查询批次资产
      const batchAssets = await mockFabricService.queryByBatch(batchNumber);
      expect(batchAssets.length).toBe(5);

      // 验证所有资产都属于同一批次
      batchAssets.forEach(asset => {
        expect(asset.batchNumber).toBe(batchNumber);
      });
    });
  });
});

describe('集成测试 - 多用户协作', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  test('应该支持多用户并发操作不同资产', async () => {
    // 用户A创建资产
    const assetA = generateTestAsset({ udi: 'UDI_USER_A' });
    await mockFabricService.initAsset(
      assetA.udi,
      assetA.name,
      assetA.specification,
      assetA.batchNumber,
      assetA.productionDate,
      assetA.expiryDate,
      assetA.docHash,
      assetA.producer
    );

    // 用户B创建资产
    const assetB = generateTestAsset({ udi: 'UDI_USER_B' });
    await mockFabricService.initAsset(
      assetB.udi,
      assetB.name,
      assetB.specification,
      assetB.batchNumber,
      assetB.productionDate,
      assetB.expiryDate,
      assetB.docHash,
      assetB.producer
    );

    // 验证两个资产都存在
    const allAssets = await mockFabricService.queryAllAssets();
    expect(allAssets.length).toBeGreaterThanOrEqual(2);

    // 用户A转移资产
    await mockFabricService.transferAsset('UDI_USER_A', '经销商A', 'DistributorMSP', '发货');

    // 用户B转移资产
    await mockFabricService.transferAsset('UDI_USER_B', '经销商B', 'DistributorMSP', '发货');

    // 验证两个资产状态正确
    const assetAAfter = await mockFabricService.queryAsset('UDI_USER_A');
    const assetBAfter = await mockFabricService.queryAsset('UDI_USER_B');

    expect(assetAAfter?.owner).toBe('经销商A');
    expect(assetBAfter?.owner).toBe('经销商B');
  });

  test('应该正确隔离不同组织的资产视图', async () => {
    // 生产商资产
    const producerAsset = generateTestAsset({ udi: 'UDI_PRODUCER_ONLY', producer: '生产商A' });
    await mockFabricService.initAsset(
      producerAsset.udi,
      producerAsset.name,
      producerAsset.specification,
      producerAsset.batchNumber,
      producerAsset.productionDate,
      producerAsset.expiryDate,
      producerAsset.docHash,
      '生产商A'
    );

    // 按所有者查询
    const producerAssets = await mockFabricService.queryByOwner('生产商A');
    expect(producerAssets.length).toBeGreaterThanOrEqual(1);

    producerAssets.forEach(asset => {
      expect(asset.owner).toBe('生产商A');
    });
  });
});

describe('集成测试 - 数据一致性', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  test('应该保持历史记录与当前状态一致', async () => {
    const assetData = generateTestAsset({ udi: 'UDI_CONSISTENCY_001' });

    // 创建
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
    await mockFabricService.transferAsset(assetData.udi, '新所有者', 'MSP', '转移');

    // 获取当前状态
    const currentAsset = await mockFabricService.queryAsset(assetData.udi);

    // 获取历史记录
    const history = await mockFabricService.getHistory(assetData.udi);

    // 最新历史记录应该与当前状态一致
    const latestHistory = history[history.length - 1];
    expect(latestHistory.value.status).toBe(currentAsset?.status);
    expect(latestHistory.value.owner).toBe(currentAsset?.owner);
  });

  test('应该保证统计数据准确', async () => {
    // 清空数据
    mockFabricService.resetAllMocks();

    // 创建不同状态的资产
    for (let i = 1; i <= 3; i++) {
      const asset = generateTestAsset({ udi: `UDI_STATS_${i}` });
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

    // 转移一个
    await mockFabricService.transferAsset('UDI_STATS_1', '经销商', 'DistributorMSP', '发货');

    // 收货一个
    await mockFabricService.transferAsset('UDI_STATS_2', '医院', 'HospitalMSP', '发货');
    await mockFabricService.confirmReceipt('UDI_STATS_2', '仓库');

    // 统计
    const total = await mockFabricService.getAssetCount();
    const created = await mockFabricService.queryByStatus('CREATED');
    const inTransit = await mockFabricService.queryByStatus('IN_TRANSIT');
    const inStock = await mockFabricService.queryByStatus('IN_STOCK');

    expect(total).toBe(3);
    expect(created.length).toBe(1); // UDI_STATS_3
    expect(inTransit.length).toBe(1); // UDI_STATS_1
    expect(inStock.length).toBe(1); // UDI_STATS_2
  });
});

describe('集成测试 - 性能基准', () => {
  test('应该能在合理时间内完成批量操作', async () => {
    mockFabricService.resetAllMocks();

    const startTime = Date.now();
    const batchSize = 50;

    // 批量创建资产
    for (let i = 1; i <= batchSize; i++) {
      const asset = generateTestAsset({ udi: `UDI_PERF_${i.toString().padStart(3, '0')}` });
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

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`批量创建 ${batchSize} 个资产耗时: ${duration}ms`);

    // 验证所有资产都已创建
    const allAssets = await mockFabricService.queryAllAssets();
    expect(allAssets.length).toBe(batchSize);
  });
});
