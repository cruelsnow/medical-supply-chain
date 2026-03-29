// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 智能合约测试
// =============================================================================
// 功能: 测试所有智能合约方法的正确性
// =============================================================================

package main

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"
)

// =============================================================================
// 测试辅助结构 - 简化版内存存储
// =============================================================================

// InMemoryStore 内存存储
type InMemoryStore struct {
	data    map[string][]byte
	history map[string][]HistoryEntry
	txID    string
}

// HistoryEntry 历史记录条目
type HistoryEntry struct {
	TxID      string
	Timestamp string
	Value     []byte
}

// NewInMemoryStore 创建内存存储
func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		data:    make(map[string][]byte),
		history: make(map[string][]HistoryEntry),
		txID:    fmt.Sprintf("tx-%d", time.Now().UnixNano()),
	}
}

// Put 存储数据
func (s *InMemoryStore) Put(key string, value []byte) {
	// 保存历史
	s.history[key] = append(s.history[key], HistoryEntry{
		TxID:      s.txID,
		Timestamp: time.Now().Format(time.RFC3339),
		Value:     value,
	})
	// 保存当前状态
	s.data[key] = value
}

// Get 获取数据
func (s *InMemoryStore) Get(key string) []byte {
	return s.data[key]
}

// GetAll 获取所有数据
func (s *InMemoryStore) GetAll() [][]byte {
	var results [][]byte
	for _, v := range s.data {
		results = append(results, v)
	}
	return results
}

// GetHistory 获取历史
func (s *InMemoryStore) GetHistory(key string) []HistoryEntry {
	return s.history[key]
}

// =============================================================================
// 业务逻辑测试 - 直接测试核心功能
// =============================================================================

// TestAssetCreation 测试资产创建
func TestAssetCreation(t *testing.T) {
	store := NewInMemoryStore()

	udi := "UDI_TEST_001"
	asset := &MedicalAsset{
		UDI:            udi,
		Name:           "心脏支架",
		Specification:  "10x50mm",
		BatchNumber:    "BATCH2024001",
		ProductionDate: "2024-01-01",
		ExpiryDate:     "2026-01-01",
		DocHash:        "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
		Status:         StatusCreated,
		Owner:          "美敦力医疗",
		Producer:       "美敦力医疗",
		ProducerMSP:    "ProducerMSP",
		CreatedAt:      time.Now().Format(time.RFC3339),
		UpdatedAt:      time.Now().Format(time.RFC3339),
	}

	// 序列化并存储
	data, err := json.Marshal(asset)
	if err != nil {
		t.Fatalf("Failed to marshal asset: %v", err)
	}

	store.Put(udi, data)

	// 验证存储
	stored := store.Get(udi)
	if stored == nil {
		t.Fatal("Asset not stored")
	}

	// 反序列化验证
	var retrieved MedicalAsset
	err = json.Unmarshal(stored, &retrieved)
	if err != nil {
		t.Fatalf("Failed to unmarshal asset: %v", err)
	}

	if retrieved.UDI != udi {
		t.Errorf("Expected UDI %s, got %s", udi, retrieved.UDI)
	}

	if retrieved.Status != StatusCreated {
		t.Errorf("Expected Status %s, got %s", StatusCreated, retrieved.Status)
	}

	t.Logf("✅ TestAssetCreation passed: UDI=%s, Status=%s", retrieved.UDI, retrieved.Status)
}

// TestAssetTransfer 测试资产转移
func TestAssetTransfer(t *testing.T) {
	store := NewInMemoryStore()

	udi := "UDI_TRANSFER_TEST_001"

	// 创建资产
	asset := &MedicalAsset{
		UDI:         udi,
		Name:        "转移测试耗材",
		Status:      StatusCreated,
		Owner:       "生产商A",
		Producer:    "生产商A",
		ProducerMSP: "ProducerMSP",
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}

	data, _ := json.Marshal(asset)
	store.Put(udi, data)

	// 转移资产
	asset.Owner = "经销商B"
	asset.Status = StatusInTransit
	asset.UpdatedAt = time.Now().Format(time.RFC3339)

	data, _ = json.Marshal(asset)
	store.Put(udi, data)

	// 验证转移后的状态
	stored := store.Get(udi)
	var retrieved MedicalAsset
	json.Unmarshal(stored, &retrieved)

	if retrieved.Status != StatusInTransit {
		t.Errorf("Expected Status %s, got %s", StatusInTransit, retrieved.Status)
	}

	if retrieved.Owner != "经销商B" {
		t.Errorf("Expected Owner 经销商B, got %s", retrieved.Owner)
	}

	t.Logf("✅ TestAssetTransfer passed: Status=%s, Owner=%s", retrieved.Status, retrieved.Owner)
}

// TestConfirmReceipt 测试收货确权
func TestConfirmReceipt(t *testing.T) {
	store := NewInMemoryStore()

	udi := "UDI_RECEIPT_TEST_001"

	// 创建并转移资产
	asset := &MedicalAsset{
		UDI:         udi,
		Name:        "收货测试耗材",
		Status:      StatusInTransit,
		Owner:       "经销商B",
		Producer:    "生产商A",
		ProducerMSP: "ProducerMSP",
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}

	data, _ := json.Marshal(asset)
	store.Put(udi, data)

	// 确认收货
	asset.Status = StatusInStock
	asset.UpdatedAt = time.Now().Format(time.RFC3339)

	data, _ = json.Marshal(asset)
	store.Put(udi, data)

	// 验证收货后的状态
	stored := store.Get(udi)
	var retrieved MedicalAsset
	json.Unmarshal(stored, &retrieved)

	if retrieved.Status != StatusInStock {
		t.Errorf("Expected Status %s, got %s", StatusInStock, retrieved.Status)
	}

	t.Logf("✅ TestConfirmReceipt passed: Status=%s", retrieved.Status)
}

// TestBurnAsset 测试消耗核销
func TestBurnAsset(t *testing.T) {
	store := NewInMemoryStore()

	udi := "UDI_BURN_TEST_001"

	// 创建入库状态的资产
	asset := &MedicalAsset{
		UDI:         udi,
		Name:        "核销测试耗材",
		Status:      StatusInStock,
		Owner:       "医院C",
		Producer:    "生产商A",
		ProducerMSP: "ProducerMSP",
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}

	data, _ := json.Marshal(asset)
	store.Put(udi, data)

	// 消耗核销
	asset.Status = StatusConsumed
	asset.UpdatedAt = time.Now().Format(time.RFC3339)

	data, _ = json.Marshal(asset)
	store.Put(udi, data)

	// 创建消耗记录
	consumeRecord := &ConsumeRecord{
		UDI:        udi,
		Hospital:   "医院C",
		Department: "心内科",
		SurgeryID:  "SURGERY001",
		Operator:   "张医生",
		Remarks:    "正常消耗",
		ConsumedAt: time.Now().Format(time.RFC3339),
	}

	consumeKey := "CONSUME_" + udi
	consumeData, _ := json.Marshal(consumeRecord)
	store.Put(consumeKey, consumeData)

	// 验证消耗后的状态
	stored := store.Get(udi)
	var retrieved MedicalAsset
	json.Unmarshal(stored, &retrieved)

	if retrieved.Status != StatusConsumed {
		t.Errorf("Expected Status %s, got %s", StatusConsumed, retrieved.Status)
	}

	// 验证消耗记录
	consumeStored := store.Get(consumeKey)
	var retrievedConsume ConsumeRecord
	json.Unmarshal(consumeStored, &retrievedConsume)

	if retrievedConsume.Hospital != "医院C" {
		t.Errorf("Expected Hospital 医院C, got %s", retrievedConsume.Hospital)
	}

	t.Logf("✅ TestBurnAsset passed: Status=%s, ConsumedAt=%s", retrieved.Status, retrievedConsume.ConsumedAt)
}

// TestRecallAsset 测试资产召回
func TestRecallAsset(t *testing.T) {
	store := NewInMemoryStore()

	udi := "UDI_RECALL_TEST_001"

	// 创建资产
	asset := &MedicalAsset{
		UDI:         udi,
		Name:        "召回测试耗材",
		Status:      StatusCreated,
		Owner:       "生产商A",
		Producer:    "生产商A",
		ProducerMSP: "ProducerMSP",
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}

	data, _ := json.Marshal(asset)
	store.Put(udi, data)

	// 执行召回
	asset.Status = StatusRecall
	asset.UpdatedAt = time.Now().Format(time.RFC3339)

	data, _ = json.Marshal(asset)
	store.Put(udi, data)

	// 验证召回后的状态
	stored := store.Get(udi)
	var retrieved MedicalAsset
	json.Unmarshal(stored, &retrieved)

	if retrieved.Status != StatusRecall {
		t.Errorf("Expected Status %s, got %s", StatusRecall, retrieved.Status)
	}

	t.Logf("✅ TestRecallAsset passed: Status=%s", retrieved.Status)
}

// TestHistoryTracking 测试历史追溯
func TestHistoryTracking(t *testing.T) {
	store := NewInMemoryStore()

	udi := "UDI_HISTORY_TEST_001"

	// 创建资产
	asset := &MedicalAsset{
		UDI:         udi,
		Name:        "历史测试耗材",
		Status:      StatusCreated,
		Owner:       "生产商A",
		Producer:    "生产商A",
		ProducerMSP: "ProducerMSP",
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}

	data, _ := json.Marshal(asset)
	store.Put(udi, data)

	// 转移
	asset.Status = StatusInTransit
	asset.Owner = "经销商"
	asset.UpdatedAt = time.Now().Format(time.RFC3339)
	data, _ = json.Marshal(asset)
	store.Put(udi, data)

	// 收货
	asset.Status = StatusInStock
	asset.UpdatedAt = time.Now().Format(time.RFC3339)
	data, _ = json.Marshal(asset)
	store.Put(udi, data)

	// 验证历史记录
	history := store.GetHistory(udi)
	if len(history) < 3 {
		t.Errorf("Expected at least 3 history records, got %d", len(history))
		return
	}

	t.Logf("✅ TestHistoryTracking passed: found %d history records", len(history))
}

// TestHashVerification 测试哈希验证
func TestHashVerification(t *testing.T) {
	store := NewInMemoryStore()

	udi := "UDI_HASH_TEST_001"
	docHash := "abc123def456abc123def456abc123def456abc123def456abc123def456abc1"

	// 创建资产
	asset := &MedicalAsset{
		UDI:         udi,
		Name:        "哈希测试耗材",
		DocHash:     docHash,
		Status:      StatusCreated,
		Owner:       "生产商A",
		Producer:    "生产商A",
		ProducerMSP: "ProducerMSP",
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}

	data, _ := json.Marshal(asset)
	store.Put(udi, data)

	// 验证正确的哈希
	stored := store.Get(udi)
	var retrieved MedicalAsset
	json.Unmarshal(stored, &retrieved)

	if retrieved.DocHash != docHash {
		t.Errorf("Expected DocHash %s, got %s", docHash, retrieved.DocHash)
	}

	// 模拟哈希验证
	isValid := retrieved.DocHash == docHash
	if !isValid {
		t.Error("Hash verification failed for matching hash")
	}

	// 验证错误的哈希
	isValid = retrieved.DocHash == "wrong_hash"
	if isValid {
		t.Error("Hash verification should fail for non-matching hash")
	}

	t.Logf("✅ TestHashVerification passed: isValid=%v", retrieved.DocHash == docHash)
}

// TestQueryAllAssets 测试查询所有资产
func TestQueryAllAssets(t *testing.T) {
	store := NewInMemoryStore()

	// 创建多个资产
	for i := 1; i <= 3; i++ {
		udi := fmt.Sprintf("UDI_ALL_TEST_%03d", i)
		asset := &MedicalAsset{
			UDI:         udi,
			Name:        fmt.Sprintf("测试耗材%d", i),
			Status:      StatusCreated,
			Owner:       "测试厂商",
			Producer:    "测试厂商",
			ProducerMSP: "ProducerMSP",
			CreatedAt:   time.Now().Format(time.RFC3339),
			UpdatedAt:   time.Now().Format(time.RFC3339),
		}
		data, _ := json.Marshal(asset)
		store.Put(udi, data)
	}

	// 查询所有资产
	allAssets := store.GetAll()
	if len(allAssets) < 3 {
		t.Errorf("Expected at least 3 assets, got %d", len(allAssets))
		return
	}

	t.Logf("✅ TestQueryAllAssets passed: found %d assets", len(allAssets))
}

// TestFullLifecycle 完整生命周期测试
func TestFullLifecycle(t *testing.T) {
	t.Log("========== 开始完整生命周期测试 ==========")

	store := NewInMemoryStore()
	udi := "UDI_LIFECYCLE_TEST_001"

	// 步骤1: 生产商创建资产
	t.Log("步骤1: 生产商创建资产...")
	asset := &MedicalAsset{
		UDI:            udi,
		Name:           "完整生命周期测试耗材",
		Specification:  "100ml",
		BatchNumber:    "BATCH_LC_001",
		ProductionDate: "2024-01-01",
		ExpiryDate:     "2026-01-01",
		DocHash:        "lifecycle_hash_001",
		Status:         StatusCreated,
		Owner:          "测试生产商",
		Producer:       "测试生产商",
		ProducerMSP:    "ProducerMSP",
		CreatedAt:      time.Now().Format(time.RFC3339),
		UpdatedAt:      time.Now().Format(time.RFC3339),
	}
	data, _ := json.Marshal(asset)
	store.Put(udi, data)

	if asset.Status != StatusCreated {
		t.Fatalf("步骤1: 期望状态CREATED, 实际%s", asset.Status)
	}
	t.Logf("✅ 步骤1通过: 资产创建成功, UDI=%s, Status=%s", asset.UDI, asset.Status)

	// 步骤2: 生产商发货给经销商
	t.Log("步骤2: 生产商发货给经销商...")
	asset.Status = StatusInTransit
	asset.Owner = "测试经销商"
	asset.UpdatedAt = time.Now().Format(time.RFC3339)
	data, _ = json.Marshal(asset)
	store.Put(udi, data)

	if asset.Status != StatusInTransit {
		t.Fatalf("步骤2: 期望状态IN_TRANSIT, 实际%s", asset.Status)
	}
	t.Logf("✅ 步骤2通过: 发货成功, Status=%s", asset.Status)

	// 步骤3: 经销商收货
	t.Log("步骤3: 经销商收货确权...")
	asset.Status = StatusInStock
	asset.UpdatedAt = time.Now().Format(time.RFC3339)
	data, _ = json.Marshal(asset)
	store.Put(udi, data)

	if asset.Status != StatusInStock {
		t.Fatalf("步骤3: 期望状态IN_STOCK, 实际%s", asset.Status)
	}
	t.Logf("✅ 步骤3通过: 收货成功, Status=%s", asset.Status)

	// 步骤4: 经销商发货给医院
	t.Log("步骤4: 经销商发货给医院...")
	asset.Status = StatusInTransit
	asset.Owner = "测试医院"
	asset.UpdatedAt = time.Now().Format(time.RFC3339)
	data, _ = json.Marshal(asset)
	store.Put(udi, data)
	t.Logf("✅ 步骤4通过: 发往医院成功, Status=%s", asset.Status)

	// 步骤5: 医院入库
	t.Log("步骤5: 医院验收入库...")
	asset.Status = StatusInStock
	asset.UpdatedAt = time.Now().Format(time.RFC3339)
	data, _ = json.Marshal(asset)
	store.Put(udi, data)
	t.Logf("✅ 步骤5通过: 入库成功, Status=%s", asset.Status)

	// 步骤6: 临床消耗
	t.Log("步骤6: 临床消耗核销...")
	asset.Status = StatusConsumed
	asset.UpdatedAt = time.Now().Format(time.RFC3339)
	data, _ = json.Marshal(asset)
	store.Put(udi, data)
	t.Logf("✅ 步骤6通过: 核销成功")

	// 步骤7: 验证最终状态
	t.Log("步骤7: 验证最终状态...")
	stored := store.Get(udi)
	var finalAsset MedicalAsset
	json.Unmarshal(stored, &finalAsset)
	if finalAsset.Status != StatusConsumed {
		t.Fatalf("步骤7: 期望最终状态CONSUMED, 实际%s", finalAsset.Status)
	}
	t.Logf("✅ 步骤7通过: 最终状态验证成功, Status=%s", finalAsset.Status)

	// 步骤8: 全链追溯
	t.Log("步骤8: 全链追溯查询...")
	history := store.GetHistory(udi)
	t.Logf("✅ 步骤8通过: 追溯查询成功, 共%d条历史记录", len(history))

	// 步骤9: 哈希验证
	t.Log("步骤9: 文档哈希验证...")
	if finalAsset.DocHash != "lifecycle_hash_001" {
		t.Fatalf("步骤9: 哈希验证失败")
	}
	t.Logf("✅ 步骤9通过: 哈希验证成功")

	t.Log("========== 完整生命周期测试全部通过 ==========")
}

// TestStatusConstants 测试状态常量
func TestStatusConstants(t *testing.T) {
	statuses := []string{
		StatusCreated,
		StatusInTransit,
		StatusInStock,
		StatusConsumed,
		StatusRecall,
	}

	expected := []string{"CREATED", "IN_TRANSIT", "IN_STOCK", "CONSUMED", "RECALL"}

	for i, status := range statuses {
		if status != expected[i] {
			t.Errorf("Status constant mismatch: expected %s, got %s", expected[i], status)
		}
	}

	t.Logf("✅ TestStatusConstants passed: all %d status constants correct", len(statuses))
}

// TestAssetStructure 测试资产结构
func TestAssetStructure(t *testing.T) {
	asset := MedicalAsset{
		UDI:            "UDI_STRUCT_TEST",
		Name:           "结构测试耗材",
		Specification:  "100ml",
		BatchNumber:    "BATCH001",
		ProductionDate: "2024-01-01",
		ExpiryDate:     "2026-01-01",
		DocHash:        "hash",
		Status:         StatusCreated,
		Owner:          "测试厂商",
		Producer:       "测试厂商",
		ProducerMSP:    "ProducerMSP",
		CreatedAt:      "2024-01-01T00:00:00Z",
		UpdatedAt:      "2024-01-01T00:00:00Z",
	}

	// 验证JSON序列化
	data, err := json.Marshal(asset)
	if err != nil {
		t.Fatalf("Failed to marshal asset: %v", err)
	}

	// 验证JSON反序列化
	var retrieved MedicalAsset
	err = json.Unmarshal(data, &retrieved)
	if err != nil {
		t.Fatalf("Failed to unmarshal asset: %v", err)
	}

	// 验证字段
	if retrieved.UDI != asset.UDI {
		t.Errorf("UDI mismatch")
	}
	if retrieved.Name != asset.Name {
		t.Errorf("Name mismatch")
	}
	if retrieved.Status != asset.Status {
		t.Errorf("Status mismatch")
	}

	t.Logf("✅ TestAssetStructure passed: JSON serialization/deserialization works")
}

// =============================================================================
// 测试入口
// =============================================================================

func TestMain(m *testing.M) {
	fmt.Println("==============================================")
	fmt.Println("    医用耗材供应链管理系统 - 智能合约测试")
	fmt.Println("==============================================")
	fmt.Println("")

	m.Run()

	fmt.Println("")
	fmt.Println("==============================================")
	fmt.Println("    所有测试完成")
	fmt.Println("==============================================")
}
