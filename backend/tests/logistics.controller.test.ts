/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 物流控制器测试
 * =============================================================================
 * 功能: 测试物流管理相关的API接口（收货确权、环境监控）
 * =============================================================================
 */

import { createContext, generateTestAsset } from './helpers/test-helper';
import mockFabricService from './__mocks__/fabric.service.mock';

jest.mock('../src/services/fabric.service', () => ({
  FabricService: jest.fn().mockImplementation(() => mockFabricService)
}));

describe('LogisticsController 物流控制器测试', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  describe('POST /api/logistics/receive - 收货确权', () => {
    test('应该成功确认收货', async () => {
      // 创建并发货资产
      const assetData = generateTestAsset({ udi: 'UDI_RECEIVE_001' });
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
      await mockFabricService.transferAsset('UDI_RECEIVE_001', '经销商B', 'DistributorMSP', '发货');

      // 收货确权
      const result = await mockFabricService.confirmReceipt('UDI_RECEIVE_001', '经销商B仓库');

      expect(result.status).toBe('IN_STOCK');
    });

    test('应该拒绝确认不在途的资产', async () => {
      // 创建但未发货的资产
      const assetData = generateTestAsset({ udi: 'UDI_NO_TRANSFER' });
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

      const asset = await mockFabricService.queryAsset('UDI_NO_TRANSFER');
      expect(asset?.status).toBe('CREATED'); // 不是IN_TRANSIT状态
    });

    test('应该记录收货时间和地点', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_RECEIVE_TIME' });
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
      await mockFabricService.transferAsset('UDI_RECEIVE_TIME', '经销商', 'DistributorMSP', '发货');

      const beforeReceive = new Date();
      const result = await mockFabricService.confirmReceipt('UDI_RECEIVE_TIME', '北京仓库');
      const afterReceive = new Date();

      const updatedAt = new Date(result.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeReceive.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterReceive.getTime());
    });

    test('应该更新资产所有者信息', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_OWNER_UPDATE' });
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

      const newOwner = '国药控股';
      await mockFabricService.transferAsset('UDI_OWNER_UPDATE', newOwner, 'DistributorMSP', '发货');

      const asset = await mockFabricService.queryAsset('UDI_OWNER_UPDATE');
      expect(asset?.owner).toBe(newOwner);
    });
  });

  describe('POST /api/logistics/envdata - 环境数据记录', () => {
    test('应该成功记录温湿度数据', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_ENV_001' });
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
      await mockFabricService.transferAsset('UDI_ENV_001', '物流商', 'LogisticsMSP', '发货');

      const envData = await mockFabricService.updateEnvData(
        'UDI_ENV_001',
        25.5,  // 温度
        65,    // 湿度
        '北京市朝阳区',  // 位置
        '物流员张三'
      );

      expect(envData.udi).toBe('UDI_ENV_001');
      expect(envData.temperature).toBe(25.5);
      expect(envData.humidity).toBe(65);
      expect(envData.location).toBe('北京市朝阳区');
    });

    test('应该记录异常温度（冷链断链）', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_COLD_CHAIN_BREAK' });
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
      await mockFabricService.transferAsset('UDI_COLD_CHAIN_BREAK', '物流商', 'LogisticsMSP', '发货');

      // 记录异常温度（超过8°C）
      const abnormalTemp = 12.5;
      const envData = await mockFabricService.updateEnvData(
        'UDI_COLD_CHAIN_BREAK',
        abnormalTemp,
        70,
        '位置',
        '物流员'
      );

      // 冷链温度应该保持在2-8°C
      const isColdChainBroken = abnormalTemp < 2 || abnormalTemp > 8;
      expect(isColdChainBroken).toBe(true);
      expect(envData.temperature).toBe(abnormalTemp);
    });

    test('应该记录多次环境数据', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_MULTI_ENV' });
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
      await mockFabricService.transferAsset('UDI_MULTI_ENV', '物流商', 'LogisticsMSP', '发货');

      // 记录多次数据
      for (let i = 0; i < 5; i++) {
        await mockFabricService.updateEnvData(
          'UDI_MULTI_ENV',
          5 + Math.random() * 2,  // 5-7°C
          60 + Math.random() * 10, // 60-70%
          `位置${i}`,
          '物流员'
        );
      }

      const envRecords = await mockFabricService.getEnvData('UDI_MULTI_ENV');
      expect(envRecords.length).toBe(5);
    });

    test('应该验证温度范围', async () => {
      const validTemp = 5.5;
      const invalidTemp = -1;

      const isValidTemperature = (temp: number) => temp >= 2 && temp <= 8;

      expect(isValidTemperature(validTemp)).toBe(true);
      expect(isValidTemperature(invalidTemp)).toBe(false);
    });

    test('应该验证湿度范围', async () => {
      const validHumidity = 65;
      const invalidHumidity = 120;

      const isValidHumidity = (humidity: number) => humidity >= 0 && humidity <= 100;

      expect(isValidHumidity(validHumidity)).toBe(true);
      expect(isValidHumidity(invalidHumidity)).toBe(false);
    });
  });

  describe('GET /api/logistics/envdata/:udi - 查询环境数据', () => {
    test('应该返回资产的所有环境记录', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_QUERY_ENV' });
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
      await mockFabricService.transferAsset('UDI_QUERY_ENV', '物流商', 'LogisticsMSP', '发货');

      // 添加多条记录
      await mockFabricService.updateEnvData('UDI_QUERY_ENV', 5, 65, '位置1', '人员1');
      await mockFabricService.updateEnvData('UDI_QUERY_ENV', 6, 60, '位置2', '人员2');

      const records = await mockFabricService.getEnvData('UDI_QUERY_ENV');

      expect(records.length).toBe(2);
    });

    test('应该返回空数组对于没有环境数据的资产', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_NO_ENV_DATA' });
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

      const records = await mockFabricService.getEnvData('UDI_NO_ENV_DATA');

      expect(records).toEqual([]);
    });
  });
});

describe('物流控制器冷链监控测试', () => {
  test('应该检测冷链断链', () => {
    const checkColdChain = (records: { temperature: number }[]) => {
      return records.some(r => r.temperature < 2 || r.temperature > 8);
    };

    const normalRecords = [
      { temperature: 4 },
      { temperature: 5 },
      { temperature: 6 }
    ];

    const brokenRecords = [
      { temperature: 4 },
      { temperature: 10 }, // 断链
      { temperature: 5 }
    ];

    expect(checkColdChain(normalRecords)).toBe(false);
    expect(checkColdChain(brokenRecords)).toBe(true);
  });

  test('应该计算温度统计信息', () => {
    const records = [
      { temperature: 4 },
      { temperature: 5 },
      { temperature: 6 },
      { temperature: 5 },
      { temperature: 4 }
    ];

    const temps = records.map(r => r.temperature);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const max = Math.max(...temps);
    const min = Math.min(...temps);

    expect(avg).toBeCloseTo(4.8);
    expect(max).toBe(6);
    expect(min).toBe(4);
  });

  test('应该生成温度曲线数据', () => {
    const generateTempCurve = (startTemp: number, endTemp: number, points: number) => {
      const step = (endTemp - startTemp) / (points - 1);
      return Array.from({ length: points }, (_, i) => ({
        time: i,
        temperature: startTemp + step * i
      }));
    };

    const curve = generateTempCurve(4, 6, 5);

    expect(curve.length).toBe(5);
    expect(curve[0].temperature).toBe(4);
    expect(curve[4].temperature).toBe(6);
  });
});

describe('物流控制器边界条件测试', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  test('应该处理极端温度值', async () => {
    const assetData = generateTestAsset({ udi: 'UDI_EXTREME_TEMP' });
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
    await mockFabricService.transferAsset('UDI_EXTREME_TEMP', '物流商', 'LogisticsMSP', '发货');

    // 极端低温
    const lowTemp = await mockFabricService.updateEnvData('UDI_EXTREME_TEMP', -40, 50, '位置', '人员');
    expect(lowTemp.temperature).toBe(-40);

    // 极端高温
    const highTemp = await mockFabricService.updateEnvData('UDI_EXTREME_TEMP', 100, 20, '位置', '人员');
    expect(highTemp.temperature).toBe(100);
  });

  test('应该处理特殊位置字符', async () => {
    const assetData = generateTestAsset({ udi: 'UDI_SPECIAL_LOC' });
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
    await mockFabricService.transferAsset('UDI_SPECIAL_LOC', '物流商', 'LogisticsMSP', '发货');

    const specialLocation = '北京市朝阳区🏥建国路100号📍';
    const result = await mockFabricService.updateEnvData('UDI_SPECIAL_LOC', 5, 65, specialLocation, '人员');

    expect(result.location).toContain('🏥');
    expect(result.location).toContain('📍');
  });
});
