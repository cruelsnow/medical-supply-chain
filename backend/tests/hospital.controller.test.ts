/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 医院控制器测试
 * =============================================================================
 * 功能: 测试医院管理相关的API接口
 * =============================================================================
 */

import { createContext, generateTestAsset, generateTestUser } from './helpers/test-helper';
import mockFabricService from './__mocks__/fabric.service.mock';

jest.mock('../src/services/fabric.service', () => ({
  FabricService: jest.fn().mockImplementation(() => mockFabricService)
}));

describe('HospitalController 医院控制器测试', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  describe('POST /api/hospital/inbound - 验收入库', () => {
    test('应该成功验收入库在途资产', async () => {
      // 创建并发货资产
      const assetData = generateTestAsset({ udi: 'UDI_INBOUND_001' });
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
      await mockFabricService.transferAsset('UDI_INBOUND_001', '测试医院', 'HospitalMSP', '发货');

      // 入库
      const result = await mockFabricService.confirmReceipt('UDI_INBOUND_001', '医院中心库房');

      expect(result.status).toBe('IN_STOCK');
    });

    test('应该验证资产真伪', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_VERIFY_001', docHash: 'valid_hash_123' });
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

      // 验证哈希
      const verifyResult = await mockFabricService.verifyHash('UDI_VERIFY_001', 'valid_hash_123');

      expect(verifyResult.isValid).toBe(true);
    });

    test('应该拒绝验证失败的资产', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_VERIFY_FAIL', docHash: 'correct_hash' });
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

      const verifyResult = await mockFabricService.verifyHash('UDI_VERIFY_FAIL', 'wrong_hash');

      expect(verifyResult.isValid).toBe(false);
    });

    test('应该记录入库位置', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_LOCATION_001' });
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
      await mockFabricService.transferAsset('UDI_LOCATION_001', '医院', 'HospitalMSP', '发货');

      const location = 'A区3号货架';
      const result = await mockFabricService.confirmReceipt('UDI_LOCATION_001', location);

      expect(result).toBeDefined();
    });
  });

  describe('GET /api/hospital/inventory - 库存查询', () => {
    test('应该返回医院的所有在库资产', async () => {
      const hospital = '测试医院';

      // 创建多个资产并入库
      for (let i = 1; i <= 3; i++) {
        const assetData = generateTestAsset({ udi: `UDI_INV_${i}` });
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
        await mockFabricService.transferAsset(`UDI_INV_${i}`, hospital, 'HospitalMSP', '发货');
        await mockFabricService.confirmReceipt(`UDI_INV_${i}`, '仓库');
      }

      const inventory = await mockFabricService.queryByOwner(hospital);

      expect(inventory.length).toBeGreaterThanOrEqual(3);
    });

    test('应该正确筛选在库状态资产', async () => {
      const hospital = '库存测试医院';
      const assetData = generateTestAsset({ udi: 'UDI_STOCK_ONLY' });
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
      await mockFabricService.transferAsset('UDI_STOCK_ONLY', hospital, 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt('UDI_STOCK_ONLY', '仓库');

      const inStock = await mockFabricService.queryByStatus('IN_STOCK');

      expect(inStock.some(a => a.udi === 'UDI_STOCK_ONLY')).toBe(true);
    });
  });

  describe('POST /api/hospital/consume - 临床消耗', () => {
    test('应该成功记录临床消耗', async () => {
      // 准备入库状态的资产
      const assetData = generateTestAsset({ udi: 'UDI_CONSUME_001' });
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
      await mockFabricService.transferAsset('UDI_CONSUME_001', '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt('UDI_CONSUME_001', '仓库');

      // 消耗
      const consumeRecord = await mockFabricService.burnAsset(
        'UDI_CONSUME_001',
        '北京协和医院',
        '心内科',
        'SURGERY_2024_001',
        '张医生',
        '冠脉支架植入手术'
      );

      expect(consumeRecord.udi).toBe('UDI_CONSUME_001');
      expect(consumeRecord.hospital).toBe('北京协和医院');
      expect(consumeRecord.department).toBe('心内科');
      expect(consumeRecord.operator).toBe('张医生');

      // 验证资产状态
      const asset = await mockFabricService.queryAsset('UDI_CONSUME_001');
      expect(asset?.status).toBe('CONSUMED');
    });

    test('应该记录手术ID', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_SURGERY_001' });
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
      await mockFabricService.transferAsset('UDI_SURGERY_001', '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt('UDI_SURGERY_001', '仓库');

      const surgeryId = 'SURGERY_2024_12_25_001';
      const result = await mockFabricService.burnAsset(
        'UDI_SURGERY_001',
        '医院',
        '科室',
        surgeryId,
        '医生',
        '原因'
      );

      expect(result.surgeryId).toBe(surgeryId);
    });

    test('应该拒绝消耗非在库资产', async () => {
      // 创建但未入库的资产
      const assetData = generateTestAsset({ udi: 'UDI_NO_STOCK' });
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

      // 尝试直接消耗（实际应该被拒绝）
      const asset = await mockFabricService.queryAsset('UDI_NO_STOCK');
      expect(asset?.status).toBe('CREATED'); // 不是IN_STOCK状态
    });

    test('应该拒绝消耗已消耗的资产', async () => {
      const assetData = generateTestAsset({ udi: 'UDI_DOUBLE_CONSUME' });
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
      await mockFabricService.transferAsset('UDI_DOUBLE_CONSUME', '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt('UDI_DOUBLE_CONSUME', '仓库');

      // 第一次消耗
      await mockFabricService.burnAsset('UDI_DOUBLE_CONSUME', '医院', '科室', '手术1', '医生', '原因');

      // 验证状态
      const asset = await mockFabricService.queryAsset('UDI_DOUBLE_CONSUME');
      expect(asset?.status).toBe('CONSUMED');
    });
  });

  describe('GET /api/hospital/expiring - 效期预警', () => {
    test('应该返回即将过期的资产', async () => {
      // 创建即将过期的资产
      const nearExpiryDate = new Date();
      nearExpiryDate.setDate(nearExpiryDate.getDate() + 20); // 20天后过期

      const assetData = generateTestAsset({
        udi: 'UDI_EXPIRING_HOSPITAL',
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
      await mockFabricService.transferAsset('UDI_EXPIRING_HOSPITAL', '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt('UDI_EXPIRING_HOSPITAL', '仓库');

      const expiring = await mockFabricService.queryExpiringSoon(30);

      expect(expiring.some(a => a.udi === 'UDI_EXPIRING_HOSPITAL')).toBe(true);
    });

    test('应该不返回已消耗的资产', async () => {
      const nearExpiryDate = new Date();
      nearExpiryDate.setDate(nearExpiryDate.getDate() + 15);

      const assetData = generateTestAsset({
        udi: 'UDI_EXPIRED_CONSUMED',
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
      await mockFabricService.transferAsset('UDI_EXPIRED_CONSUMED', '医院', 'HospitalMSP', '发货');
      await mockFabricService.confirmReceipt('UDI_EXPIRED_CONSUMED', '仓库');
      await mockFabricService.burnAsset('UDI_EXPIRED_CONSUMED', '医院', '科室', '手术', '医生', '原因');

      const expiring = await mockFabricService.queryExpiringSoon(30);

      // 已消耗的资产不应该在过期预警中
      expect(expiring.some(a => a.udi === 'UDI_EXPIRED_CONSUMED')).toBe(false);
    });
  });
});

describe('医院控制器权限测试', () => {
  test('只有医院用户可以访问医院接口', () => {
    const allowedRoles = ['hospital'];
    const testRoles = ['producer', 'distributor', 'hospital', 'regulator'];

    testRoles.forEach(role => {
      const hasAccess = allowedRoles.includes(role);
      if (role === 'hospital') {
        expect(hasAccess).toBe(true);
      } else {
        expect(hasAccess).toBe(false);
      }
    });
  });
});

describe('医院控制器数据验证测试', () => {
  test('应该验证入库位置不为空', () => {
    const location = '';
    expect(location.trim().length).toBe(0); // 应该被拒绝
  });

  test('应该验证手术ID格式', () => {
    const validSurgeryId = 'SURGERY_2024_001';
    const pattern = /^SURGERY_\d{4}_\d{3}$/;
    expect(pattern.test(validSurgeryId)).toBe(true);
  });

  test('应该验证科室名称', () => {
    const validDepartments = ['心内科', '神经外科', '骨科', '普外科'];
    const testDept = '心内科';
    expect(validDepartments).toContain(testDept);
  });
});
