// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 智能合约
// =============================================================================
// 功能描述:
//   本智能合约实现了医用耗材全生命周期的链上管理，包括：
//   - 资产初始化（源头赋码上链）
//   - 权属转移（发货、收货、入库）
//   - 状态查询与追溯
//   - 环境数据记录（冷链监控）
//   - 临床消耗核销
// =============================================================================
// 资产状态定义:
//   CREATED    - 已创建（生产商赋码完成）
//   IN_TRANSIT - 在途（已发货，运输中）
//   IN_STOCK   - 在库（医院入库完成）
//   CONSUMED   - 已消耗（临床使用完成）
//   RECALL     - 召回（质量问题）
// =============================================================================

package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// =============================================================================
// 常量定义
// =============================================================================

// 资产状态常量
const (
	StatusCreated    = "CREATED"    // 已创建 - 生产商赋码上链
	StatusInTransit  = "IN_TRANSIT" // 在途 - 已发货
	StatusInStock    = "IN_STOCK"   // 在库 - 医院入库
	StatusConsumed   = "CONSUMED"   // 已消耗 - 临床使用
	StatusRecall     = "RECALL"     // 召回 - 质量问题
	StatusException  = "EXCEPTION"  // 异常 - 环境异常等
)

// =============================================================================
// 数据结构定义
// =============================================================================

// MedicalAsset 医用耗材资产结构
// 描述: 存储在区块链上的核心资产数据，包含耗材的基本信息和状态
type MedicalAsset struct {
	UDI            string `json:"udi"`            // 医疗器械唯一标识 (Unique Device Identification)
	Name           string `json:"name"`           // 耗材名称
	Specification  string `json:"specification"`  // 规格型号
	BatchNumber    string `json:"batchNumber"`    // 批次号
	Quantity       int    `json:"quantity"`       // 生产数量
	ProductionDate string `json:"productionDate"` // 生产日期 (格式: YYYY-MM-DD)
	ExpiryDate     string `json:"expiryDate"`     // 有效期 (格式: YYYY-MM-DD)
	DocHash        string `json:"docHash"`        // 质检报告哈希 (SHA-256)
	Status         string `json:"status"`         // 当前状态
	Owner          string `json:"owner"`          // 当前所有者 (MSP ID)
	Producer       string `json:"producer"`       // 生产商名称
	ProducerMSP    string `json:"producerMSP"`    // 生产商MSP ID
	CreatedAt      string `json:"createdAt"`      // 创建时间
	UpdatedAt      string `json:"updatedAt"`      // 更新时间
	TxID           string `json:"txID"`           // 交易ID
}

// TransferRecord 权属转移记录
// 描述: 记录资产的每一次权属变更
type TransferRecord struct {
	UDI         string `json:"udi"`         // 资产UDI
	FromOwner   string `json:"fromOwner"`   // 原所有者
	ToOwner     string `json:"toOwner"`     // 新所有者
	FromMSP     string `json:"fromMSP"`     // 原所有者MSP
	ToMSP       string `json:"toMSP"`       // 新所有者MSP
	Status      string `json:"status"`      // 转移后状态
	Timestamp   string `json:"timestamp"`   // 转移时间
	TxID        string `json:"txID"`        // 交易ID
	Description string `json:"description"` // 转移描述
}

// EnvDataRecord 环境数据记录
// 描述: 记录物流过程中的环境监控数据
type EnvDataRecord struct {
	UDI         string  `json:"udi"`         // 资产UDI
	Temperature float64 `json:"temperature"` // 温度 (摄氏度)
	Humidity    float64 `json:"humidity"`    // 湿度 (%)
	Location    string  `json:"location"`    // 位置信息
	Timestamp   string  `json:"timestamp"`   // 记录时间
	IsAbnormal  bool    `json:"isAbnormal"`  // 是否异常
	TxID        string  `json:"txID"`        // 交易ID
	Recorder    string  `json:"recorder"`    // 记录者MSP
}

// ConsumeRecord 消耗记录
// 描述: 记录临床消耗信息
type ConsumeRecord struct {
	UDI               string `json:"udi"`               // 资产UDI
	Hospital          string `json:"hospital"`          // 使用医院
	Department        string `json:"department"`        // 使用科室
	SurgeryID         string `json:"surgeryId"`         // 手术ID (脱敏)
	Operator          string `json:"operator"`          // 操作者
	ConsumedAt        string `json:"consumedAt"`        // 消耗时间
	TxID              string `json:"txID"`              // 交易ID
	Remarks           string `json:"remarks"`           // 备注
	ConsumedQuantity  int    `json:"consumedQuantity"`  // 本次消耗数量
	RemainingQuantity int    `json:"remainingQuantity"` // 剩余数量
}

// AssetHistory 资产历史记录
// 描述: 用于存储历史查询结果
type AssetHistory struct {
	TxID      string `json:"txId"`
	Timestamp string `json:"timestamp"`
	IsDelete  bool   `json:"isDelete"`
	Value     *MedicalAsset `json:"value"`
}

// =============================================================================
// 智能合约主结构
// =============================================================================

// SupplyChainContract 供应链智能合约
type SupplyChainContract struct {
	contractapi.Contract
}

// =============================================================================
// 辅助函数
// =============================================================================

// getTxTimestamp 获取交易时间戳
func getTxTimestamp(ctx contractapi.TransactionContextInterface) (string, error) {
	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	return time.Unix(timestamp.Seconds, int64(timestamp.Nanos)).Format("2006-01-02 15:04:05"), nil
}

// getTxID 获取交易ID
func getTxID(ctx contractapi.TransactionContextInterface) string {
	return ctx.GetStub().GetTxID()
}

// getMSPID 获取调用者的MSP ID
func getMSPID(ctx contractapi.TransactionContextInterface) (string, error) {
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return "", fmt.Errorf("failed to get MSP ID: %v", err)
	}
	return mspID, nil
}

// assetExists 检查资产是否存在
func assetExists(ctx contractapi.TransactionContextInterface, udi string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(udi)
	if err != nil {
		return false, fmt.Errorf("failed to read asset: %v", err)
	}
	return assetJSON != nil, nil
}

// getAsset 获取资产
func getAsset(ctx contractapi.TransactionContextInterface, udi string) (*MedicalAsset, error) {
	assetJSON, err := ctx.GetStub().GetState(udi)
	if err != nil {
		return nil, fmt.Errorf("failed to read asset: %v", err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("asset with UDI %s does not exist", udi)
	}

	var asset MedicalAsset
	err = json.Unmarshal(assetJSON, &asset)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal asset: %v", err)
	}

	return &asset, nil
}

// putAsset 保存资产
func putAsset(ctx contractapi.TransactionContextInterface, asset *MedicalAsset) error {
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return fmt.Errorf("failed to marshal asset: %v", err)
	}
	return ctx.GetStub().PutState(asset.UDI, assetJSON)
}

// saveTransferRecord 保存转移记录
func saveTransferRecord(ctx contractapi.TransactionContextInterface, record *TransferRecord) error {
	key := fmt.Sprintf("TRANSFER_%s_%s", record.UDI, record.TxID)
	recordJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal transfer record: %v", err)
	}
	return ctx.GetStub().PutState(key, recordJSON)
}

// saveEnvDataRecord 保存环境数据记录
func saveEnvDataRecord(ctx contractapi.TransactionContextInterface, record *EnvDataRecord) error {
	key := fmt.Sprintf("ENV_%s_%d", record.UDI, time.Now().UnixNano())
	recordJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal env data record: %v", err)
	}
	return ctx.GetStub().PutState(key, recordJSON)
}

// saveConsumeRecord 保存消耗记录
func saveConsumeRecord(ctx contractapi.TransactionContextInterface, record *ConsumeRecord) error {
	key := fmt.Sprintf("CONSUME_%s_%s", record.UDI, record.TxID)
	recordJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal consume record: %v", err)
	}
	return ctx.GetStub().PutState(key, recordJSON)
}

// =============================================================================
// 核心业务方法 - 资产初始化
// =============================================================================

// InitAsset 初始化资产（源头赋码上链）
// 参数:
//   - udi: 医疗器械唯一标识
//   - name: 耗材名称
//   - specification: 规格型号
//   - batchNumber: 批次号
//   - quantity: 生产数量
//   - productionDate: 生产日期
//   - expiryDate: 有效期
//   - docHash: 质检报告哈希
//   - producer: 生产商名称
// 返回: 创建的资产信息
func (s *SupplyChainContract) InitAsset(
	ctx contractapi.TransactionContextInterface,
	udi string,
	name string,
	specification string,
	batchNumber string,
	quantity string,
	productionDate string,
	expiryDate string,
	docHash string,
	producer string,
) (*MedicalAsset, error) {
	// 验证调用者权限 - 只有生产商可以创建资产
	mspID, err := getMSPID(ctx)
	if err != nil {
		return nil, err
	}

	if mspID != "ProducerMSP" {
		return nil, fmt.Errorf("only ProducerMSP can initialize assets, current MSP: %s", mspID)
	}

	// 检查资产是否已存在
	exists, err := assetExists(ctx, udi)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("asset with UDI %s already exists", udi)
	}

	// 获取时间戳
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return nil, err
	}

	// 创建资产
	qty, err := strconv.Atoi(quantity)
	if err != nil || qty < 1 {
		return nil, fmt.Errorf("invalid quantity: %s, must be a positive integer", quantity)
	}

	asset := &MedicalAsset{
		UDI:            udi,
		Name:           name,
		Specification:  specification,
		BatchNumber:    batchNumber,
		Quantity:       qty,
		ProductionDate: productionDate,
		ExpiryDate:     expiryDate,
		DocHash:        docHash,
		Status:         StatusCreated,
		Owner:          producer,
		Producer:       producer,
		ProducerMSP:    mspID,
		CreatedAt:      timestamp,
		UpdatedAt:      timestamp,
		TxID:           getTxID(ctx),
	}

	// 保存资产
	err = putAsset(ctx, asset)
	if err != nil {
		return nil, err
	}

	// 发送事件
	eventPayload, _ := json.Marshal(asset)
	ctx.GetStub().SetEvent("AssetInitialized", eventPayload)

	return asset, nil
}

// =============================================================================
// 核心业务方法 - 权属转移
// =============================================================================

// TransferAsset 权属转移
// 参数:
//   - udi: 资产UDI
//   - newOwner: 新所有者名称
//   - newOwnerMSP: 新所有者MSP ID
//   - description: 转移描述
// 返回: 更新后的资产信息
func (s *SupplyChainContract) TransferAsset(
	ctx contractapi.TransactionContextInterface,
	udi string,
	newOwner string,
	newOwnerMSP string,
	description string,
) (*MedicalAsset, error) {
	// 获取资产
	asset, err := getAsset(ctx, udi)
	if err != nil {
		return nil, err
	}

	// 获取当前调用者MSP
	currentMSP, err := getMSPID(ctx)
	if err != nil {
		return nil, err
	}

	// 验证调用者权限 - 只有当前所有者可以转移资产
	if asset.Owner != currentMSP && asset.ProducerMSP != currentMSP {
		// 允许生产商发货，也允许当前持有者转移
		if asset.Status == StatusCreated && asset.ProducerMSP != currentMSP {
			return nil, fmt.Errorf("only producer can transfer newly created asset")
		}
	}

	// 验证资产状态 - 已消耗或召回的资产不能转移
	if asset.Status == StatusConsumed {
		return nil, fmt.Errorf("cannot transfer consumed asset")
	}
	if asset.Status == StatusRecall {
		return nil, fmt.Errorf("cannot transfer recalled asset")
	}

	// 获取时间戳和交易ID
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return nil, err
	}
	txID := getTxID(ctx)

	// 记录原所有者信息
	oldOwner := asset.Owner
	oldMSP := currentMSP

	// 更新资产信息
	asset.Owner = newOwner
	asset.Status = StatusInTransit
	asset.UpdatedAt = timestamp
	asset.TxID = txID

	// 保存资产
	err = putAsset(ctx, asset)
	if err != nil {
		return nil, err
	}

	// 创建转移记录
	transferRecord := &TransferRecord{
		UDI:         udi,
		FromOwner:   oldOwner,
		ToOwner:     newOwner,
		FromMSP:     oldMSP,
		ToMSP:       newOwnerMSP,
		Status:      StatusInTransit,
		Timestamp:   timestamp,
		TxID:        txID,
		Description: description,
	}
	err = saveTransferRecord(ctx, transferRecord)
	if err != nil {
		return nil, err
	}

	// 发送事件
	eventPayload, _ := json.Marshal(asset)
	ctx.GetStub().SetEvent("AssetTransferred", eventPayload)

	return asset, nil
}

// ConfirmReceipt 确认收货（收货确权）
// 参数:
//   - udi: 资产UDI
//   - receiverName: 收货方名称
// 返回: 更新后的资产信息
func (s *SupplyChainContract) ConfirmReceipt(
	ctx contractapi.TransactionContextInterface,
	udi string,
	receiverName string,
) (*MedicalAsset, error) {
	// 获取资产
	asset, err := getAsset(ctx, udi)
	if err != nil {
		return nil, err
	}

	// 获取当前调用者MSP
	currentMSP, err := getMSPID(ctx)
	if err != nil {
		return nil, err
	}

	// 验证资产状态 - 必须是在途状态
	if asset.Status != StatusInTransit {
		return nil, fmt.Errorf("asset must be in transit to confirm receipt, current status: %s", asset.Status)
	}

	// 获取时间戳和交易ID
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return nil, err
	}
	txID := getTxID(ctx)

	// 更新资产信息
	asset.Owner = receiverName
	// 根据收货方类型设置状态
	if currentMSP == "HospitalMSP" {
		asset.Status = StatusInStock
	} else {
		// 经销商或物流商收货，状态保持为在库（经销商库存）
		asset.Status = StatusInStock
	}
	asset.UpdatedAt = timestamp
	asset.TxID = txID

	// 保存资产
	err = putAsset(ctx, asset)
	if err != nil {
		return nil, err
	}

	// 创建转移记录
	transferRecord := &TransferRecord{
		UDI:         udi,
		FromOwner:   asset.Owner,
		ToOwner:     receiverName,
		FromMSP:     "",
		ToMSP:       currentMSP,
		Status:      asset.Status,
		Timestamp:   timestamp,
		TxID:        txID,
		Description: "Receipt confirmed",
	}
	err = saveTransferRecord(ctx, transferRecord)
	if err != nil {
		return nil, err
	}

	// 发送事件
	eventPayload, _ := json.Marshal(asset)
	ctx.GetStub().SetEvent("ReceiptConfirmed", eventPayload)

	return asset, nil
}

// =============================================================================
// 核心业务方法 - 环境数据记录
// =============================================================================

// UpdateEnvData 更新环境数据
// 参数:
//   - udi: 资产UDI
//   - temperature: 温度
//   - humidity: 湿度
//   - location: 位置
//   - isAbnormal: 是否异常
// 返回: 环境数据记录
func (s *SupplyChainContract) UpdateEnvData(
	ctx contractapi.TransactionContextInterface,
	udi string,
	temperature float64,
	humidity float64,
	location string,
	isAbnormal bool,
) (*EnvDataRecord, error) {
	// 获取资产
	asset, err := getAsset(ctx, udi)
	if err != nil {
		return nil, err
	}

	// 获取当前调用者MSP
	currentMSP, err := getMSPID(ctx)
	if err != nil {
		return nil, err
	}

	// 验证调用者权限 - 只有物流商或经销商可以记录环境数据
	if currentMSP != "DistributorMSP" {
		return nil, fmt.Errorf("only DistributorMSP can update environment data")
	}

	// 获取时间戳
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return nil, err
	}

	// 创建环境数据记录
	envRecord := &EnvDataRecord{
		UDI:         udi,
		Temperature: temperature,
		Humidity:    humidity,
		Location:    location,
		Timestamp:   timestamp,
		IsAbnormal:  isAbnormal,
		TxID:        getTxID(ctx),
		Recorder:    currentMSP,
	}

	// 保存环境数据记录
	err = saveEnvDataRecord(ctx, envRecord)
	if err != nil {
		return nil, err
	}

	// 如果环境数据异常，更新资产状态
	if isAbnormal {
		asset.Status = StatusException
		asset.UpdatedAt = timestamp
		asset.TxID = getTxID(ctx)
		err = putAsset(ctx, asset)
		if err != nil {
			return nil, err
		}
	}

	// 发送事件
	eventPayload, _ := json.Marshal(envRecord)
	ctx.GetStub().SetEvent("EnvDataUpdated", eventPayload)

	return envRecord, nil
}

// =============================================================================
// 核心业务方法 - 消耗核销
// =============================================================================

// BurnAsset 消耗核销（支持部分核销）
// 参数:
//   - udi: 资产UDI
//   - hospital: 医院名称
//   - department: 科室
//   - surgeryId: 手术ID（脱敏）
//   - operator: 操作者
//   - remarks: 备注
//   - consumeQuantity: 本次消耗数量
// 返回: 消耗记录
func (s *SupplyChainContract) BurnAsset(
	ctx contractapi.TransactionContextInterface,
	udi string,
	hospital string,
	department string,
	surgeryId string,
	operator string,
	remarks string,
	consumeQuantity string,
) (*ConsumeRecord, error) {
	// 获取资产
	asset, err := getAsset(ctx, udi)
	if err != nil {
		return nil, err
	}

	// 获取当前调用者MSP
	currentMSP, err := getMSPID(ctx)
	if err != nil {
		return nil, err
	}

	// 验证调用者权限 - 只有医院可以消耗资产
	if currentMSP != "HospitalMSP" {
		return nil, fmt.Errorf("only HospitalMSP can burn assets")
	}

	// 验证资产状态 - 必须是在库状态
	if asset.Status != StatusInStock {
		return nil, fmt.Errorf("asset must be in stock to burn, current status: %s", asset.Status)
	}

	// 解析消耗数量
	qty, err := strconv.Atoi(consumeQuantity)
	if err != nil || qty <= 0 {
		return nil, fmt.Errorf("consumeQuantity must be a positive integer, got: %s", consumeQuantity)
	}

	// 验证消耗数量不超过库存
	if qty > asset.Quantity {
		return nil, fmt.Errorf("consume quantity (%d) exceeds available quantity (%d)", qty, asset.Quantity)
	}

	// 获取时间戳
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return nil, err
	}
	txID := getTxID(ctx)

	// 扣减数量
	remainingQuantity := asset.Quantity - qty
	asset.Quantity = remainingQuantity

	// 数量为0时状态变为已消耗，否则保持IN_STOCK
	if remainingQuantity == 0 {
		asset.Status = StatusConsumed
	}

	asset.UpdatedAt = timestamp
	asset.TxID = txID

	// 保存资产
	err = putAsset(ctx, asset)
	if err != nil {
		return nil, err
	}

	// 创建消耗记录
	consumeRecord := &ConsumeRecord{
		UDI:               udi,
		Hospital:          hospital,
		Department:        department,
		SurgeryID:         surgeryId,
		Operator:          operator,
		ConsumedAt:        timestamp,
		TxID:              txID,
		Remarks:           remarks,
		ConsumedQuantity:  qty,
		RemainingQuantity: remainingQuantity,
	}

	// 保存消耗记录
	err = saveConsumeRecord(ctx, consumeRecord)
	if err != nil {
		return nil, err
	}

	// 发送事件
	eventPayload, _ := json.Marshal(consumeRecord)
	ctx.GetStub().SetEvent("AssetConsumed", eventPayload)

	return consumeRecord, nil
}

// RecallAsset 召回资产
// 参数:
//   - udi: 资产UDI
//   - reason: 召回原因
// 返回: 更新后的资产信息
func (s *SupplyChainContract) RecallAsset(
	ctx contractapi.TransactionContextInterface,
	udi string,
	reason string,
) (*MedicalAsset, error) {
	// 获取资产
	asset, err := getAsset(ctx, udi)
	if err != nil {
		return nil, err
	}

	// 获取当前调用者MSP
	currentMSP, err := getMSPID(ctx)
	if err != nil {
		return nil, err
	}

	// 验证调用者权限 - 只有生产商或监管机构可以召回资产
	if currentMSP != "ProducerMSP" && currentMSP != "RegulatorMSP" {
		return nil, fmt.Errorf("only ProducerMSP or RegulatorMSP can recall assets")
	}

	// 验证资产状态 - 已消耗的资产不能召回
	if asset.Status == StatusConsumed {
		return nil, fmt.Errorf("cannot recall consumed asset")
	}

	// 获取时间戳
	timestamp, err := getTxTimestamp(ctx)
	if err != nil {
		return nil, err
	}

	// 更新资产状态为召回
	asset.Status = StatusRecall
	asset.UpdatedAt = timestamp
	asset.TxID = getTxID(ctx)

	// 保存资产
	err = putAsset(ctx, asset)
	if err != nil {
		return nil, err
	}

	// 发送事件
	eventPayload, _ := json.Marshal(map[string]string{
		"udi":    udi,
		"reason": reason,
		"txId":   asset.TxID,
	})
	ctx.GetStub().SetEvent("AssetRecalled", eventPayload)

	return asset, nil
}

// =============================================================================
// 查询方法
// =============================================================================

// QueryAsset 查询单个资产
// 参数:
//   - udi: 资产UDI
// 返回: 资产信息
func (s *SupplyChainContract) QueryAsset(
	ctx contractapi.TransactionContextInterface,
	udi string,
) (*MedicalAsset, error) {
	return getAsset(ctx, udi)
}

// QueryAllAssets 查询所有资产
// 返回: 所有资产列表
func (s *SupplyChainContract) QueryAllAssets(
	ctx contractapi.TransactionContextInterface,
) ([]*MedicalAsset, error) {
	// 使用范围查询获取所有资产
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get all assets: %v", err)
	}
	defer resultsIterator.Close()

	var assets []*MedicalAsset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate results: %v", err)
		}

		// 只返回资产数据，过滤掉其他类型的记录
		var asset MedicalAsset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err == nil && asset.UDI != "" {
			assets = append(assets, &asset)
		}
	}

	return assets, nil
}

// QueryByOwner 按所有者查询资产
// 参数:
//   - owner: 所有者名称
// 返回: 该所有者的资产列表
func (s *SupplyChainContract) QueryByOwner(
	ctx contractapi.TransactionContextInterface,
	owner string,
) ([]*MedicalAsset, error) {
	// 使用CouchDB富查询
	queryString := fmt.Sprintf(`{"selector":{"owner":"%s"}}`, owner)
	return s.queryAssets(ctx, queryString)
}

// QueryByStatus 按状态查询资产
// 参数:
//   - status: 资产状态
// 返回: 该状态的资产列表
func (s *SupplyChainContract) QueryByStatus(
	ctx contractapi.TransactionContextInterface,
	status string,
) ([]*MedicalAsset, error) {
	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return s.queryAssets(ctx, queryString)
}

// QueryByBatch 按批次查询资产
// 参数:
//   - batchNumber: 批次号
// 返回: 该批次的资产列表
func (s *SupplyChainContract) QueryByBatch(
	ctx contractapi.TransactionContextInterface,
	batchNumber string,
) ([]*MedicalAsset, error) {
	queryString := fmt.Sprintf(`{"selector":{"batchNumber":"%s"}}`, batchNumber)
	return s.queryAssets(ctx, queryString)
}

// QueryExpiringSoon 查询即将过期的资产
// 参数:
//   - days: 天数阈值
// 返回: 即将过期的资产列表
func (s *SupplyChainContract) QueryExpiringSoon(
	ctx contractapi.TransactionContextInterface,
	days int,
) ([]*MedicalAsset, error) {
	// 计算过期日期阈值
	expiryThreshold := time.Now().AddDate(0, 0, days).Format("2006-01-02")
	queryString := fmt.Sprintf(`{"selector":{"expiryDate":{"$lte":"%s"}}}`, expiryThreshold)
	return s.queryAssets(ctx, queryString)
}

// queryAssets 执行富查询
func (s *SupplyChainContract) queryAssets(
	ctx contractapi.TransactionContextInterface,
	queryString string,
) ([]*MedicalAsset, error) {
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %v", err)
	}
	defer resultsIterator.Close()

	var assets []*MedicalAsset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate query results: %v", err)
		}

		var asset MedicalAsset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal asset: %v", err)
		}
		assets = append(assets, &asset)
	}

	return assets, nil
}

// GetHistory 获取资产历史记录
// 参数:
//   - udi: 资产UDI
// 返回: 资产历史记录列表
func (s *SupplyChainContract) GetHistory(
	ctx contractapi.TransactionContextInterface,
	udi string,
) ([]*AssetHistory, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(udi)
	if err != nil {
		return nil, fmt.Errorf("failed to get history: %v", err)
	}
	defer resultsIterator.Close()

	var history []*AssetHistory
	for resultsIterator.HasNext() {
		historyEntry, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate history: %v", err)
		}

		var asset MedicalAsset
		if len(historyEntry.Value) > 0 {
			err = json.Unmarshal(historyEntry.Value, &asset)
			if err != nil {
				return nil, fmt.Errorf("failed to unmarshal history entry: %v", err)
			}
		}

		timestamp := time.Unix(historyEntry.Timestamp.Seconds, int64(historyEntry.Timestamp.Nanos)).Format("2006-01-02 15:04:05")

		history = append(history, &AssetHistory{
			TxID:      historyEntry.TxId,
			Timestamp: timestamp,
			IsDelete:  historyEntry.IsDelete,
			Value:     &asset,
		})
	}

	return history, nil
}

// VerifyHash 验证文档哈希
// 参数:
//   - udi: 资产UDI
//   - docHash: 待验证的文档哈希
// 返回: 验证结果
func (s *SupplyChainContract) VerifyHash(
	ctx contractapi.TransactionContextInterface,
	udi string,
	docHash string,
) (map[string]interface{}, error) {
	asset, err := getAsset(ctx, udi)
	if err != nil {
		return nil, err
	}

	isValid := asset.DocHash == docHash

	return map[string]interface{}{
		"udi":           udi,
		"storedHash":    asset.DocHash,
		"providedHash":  docHash,
		"isValid":       isValid,
		"verifiedAt":    time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

// GetAssetCount 获取资产统计
// 返回: 各状态资产数量统计
func (s *SupplyChainContract) GetAssetCount(
	ctx contractapi.TransactionContextInterface,
) (map[string]int, error) {
	assets, err := s.QueryAllAssets(ctx)
	if err != nil {
		return nil, err
	}

	counts := map[string]int{
		"total":      len(assets),
		"created":    0,
		"inTransit":  0,
		"inStock":    0,
		"consumed":   0,
		"recall":     0,
		"exception":  0,
	}

	for _, asset := range assets {
		switch asset.Status {
		case StatusCreated:
			counts["created"]++
		case StatusInTransit:
			counts["inTransit"]++
		case StatusInStock:
			counts["inStock"]++
		case StatusConsumed:
			counts["consumed"]++
		case StatusRecall:
			counts["recall"]++
		case StatusException:
			counts["exception"]++
		}
	}

	return counts, nil
}

// QueryConsumeRecords 查询消耗记录
// 参数: owner (可选，按所有者过滤)
func (s *SupplyChainContract) QueryConsumeRecords(ctx contractapi.TransactionContextInterface, owner string) ([]*ConsumeRecord, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("CONSUME_", "CONSUME_~")
	if err != nil {
		return nil, fmt.Errorf("failed to get consume records: %v", err)
	}
	defer resultsIterator.Close()

	var records []*ConsumeRecord
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate consume records: %v", err)
		}

		var record ConsumeRecord
		err = json.Unmarshal(queryResponse.Value, &record)
		if err != nil {
			continue
		}

		// 如果指定了 owner，按医院过滤
		if owner != "" && record.Hospital != owner {
			continue
		}

		records = append(records, &record)
	}

	return records, nil
}

// =============================================================================
// 主函数
// =============================================================================

func main() {
	chaincode, err := contractapi.NewChaincode(&SupplyChainContract{})
	if err != nil {
		fmt.Printf("Error creating supply chain chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting supply chain chaincode: %v\n", err)
	}
}
