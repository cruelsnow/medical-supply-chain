// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 哈希计算服务
// =============================================================================
// 功能: 提供SHA-256哈希计算功能，用于文件完整性校验
// =============================================================================

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// 哈希服务类
// =============================================================================

export class HashService {
  /**
   * 计算字符串的SHA-256哈希值
   * @param content 待计算的内容
   * @returns SHA-256哈希值（十六进制字符串）
   */
  public static hashString(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * 计算Buffer的SHA-256哈希值
   * @param buffer 待计算的Buffer
   * @returns SHA-256哈希值（十六进制字符串）
   */
  public static hashBuffer(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * 计算文件的SHA-256哈希值
   * @param filePath 文件路径
   * @returns SHA-256哈希值（十六进制字符串）
   */
  public static hashFile(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return this.hashBuffer(fileBuffer);
  }

  /**
   * 验证哈希值是否匹配
   * @param content 原始内容
   * @param expectedHash 期望的哈希值
   * @returns 是否匹配
   */
  public static verifyString(content: string, expectedHash: string): boolean {
    const actualHash = this.hashString(content);
    return actualHash === expectedHash;
  }

  /**
   * 验证文件哈希值是否匹配
   * @param filePath 文件路径
   * @param expectedHash 期望的哈希值
   * @returns 是否匹配
   */
  public static verifyFile(filePath: string, expectedHash: string): boolean {
    const actualHash = this.hashFile(filePath);
    return actualHash === expectedHash;
  }

  /**
   * 计算JSON对象的SHA-256哈希值
   * @param obj 待计算的JSON对象
   * @returns SHA-256哈希值（十六进制字符串）
   */
  public static hashObject(obj: object): string {
    // 确保对象序列化的顺序一致
    const content = JSON.stringify(obj, Object.keys(obj).sort());
    return this.hashString(content);
  }

  /**
   * 生成UDI编码（医疗器械唯一标识）
   * @param producerCode 生产商代码
   * @param productCode 产品代码
   * @param batchNumber 批次号
   * @param serialNumber 序列号
   * @returns UDI编码
   */
  public static generateUDI(
    producerCode: string,
    productCode: string,
    batchNumber: string,
    serialNumber: string
  ): string {
    // UDI = DI (产品标识) + PI (生产标识)
    // DI = 生产商代码 + 产品代码
    // PI = 批次号 + 序列号
    const di = `${producerCode}${productCode}`;
    const pi = `${batchNumber}${serialNumber}`;
    return `${di}${pi}`;
  }

  /**
   * 生成交易ID（用于追踪）
   * @param prefix 前缀
   * @returns 交易ID
   */
  public static generateTxId(prefix: string = 'TX'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }
}

// 导出默认实例
export const hashService = HashService;
export default hashService;
