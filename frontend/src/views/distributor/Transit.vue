<template>
  <div class="page-container">
    <div class="page-card">
      <h2>在途资产</h2>
      <p class="desc">查看当前物流运输中的医用耗材资产</p>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchUDI"
          placeholder="请输入UDI编码搜索"
          clearable
          @keyup.enter="handleSearch"
        >
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </el-input>
      </div>

      <!-- 资产列表 -->
      <el-table :data="transitAssets" stripe style="width: 100%">
        <el-table-column prop="udi" label="UDI编码" width="200" />
        <el-table-column prop="name" label="耗材名称" width="150" />
        <el-table-column prop="specification" label="规格型号" width="120" />
        <el-table-column prop="batchNumber" label="批次号" width="120" />
        <el-table-column prop="from" label="发货方" width="120" />
        <el-table-column prop="to" label="收货方" width="120" />
        <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
        <el-table-column prop="shippedAt" label="发货时间" width="180" />
        <el-table-column label="操作" fixed width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="资产详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="UDI编码">{{ currentAsset.udi }}</el-descriptions-item>
        <el-descriptions-item label="耗材名称">{{ currentAsset.name }}</el-descriptions-item>
        <el-descriptions-item label="规格型号">{{ currentAsset.specification }}</el-descriptions-item>
        <el-descriptions-item label="批次号">{{ currentAsset.batchNumber }}</el-descriptions-item>
        <el-descriptions-item label="发货方">{{ currentAsset.from }}</el-descriptions-item>
        <el-descriptions-item label="收货方">{{ currentAsset.to }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="getStatusType(currentAsset.status)">
            {{ getStatusLabel(currentAsset.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发货时间">{{ currentAsset.shippedAt }}</el-descriptions-item>
        <el-descriptions-item label="预计到达">{{ currentAsset.estimatedArrival }}</el-descriptions-item>
        <el-descriptions-item label="运输温度">{{ currentAsset.temperature }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 搜索
const searchUDI = ref('')

// 表格数据
const transitAssets = ref<any[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 详情
const detailVisible = ref(false)
const currentAsset = ref<any>({})

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    'IN_TRANSIT': 'warning',
    'DELIVERED': 'success',
    'PENDING': 'info',
  }
  return types[status] || 'info'
}

// 获取状态标签
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'IN_TRANSIT': '运输中',
    'DELIVERED': '已送达',
    'PENDING': '待发货',
  }
  return labels[status] || status
}

// 搜索
const handleSearch = async () => {
  currentPage.value = 1
  await fetchTransitAssets()
}

// 获取在途资产列表
const fetchTransitAssets = async () => {
  // TODO: 调用 API 获取数据
  // 模拟数据
  transitAssets.value = [
    {
      udi: 'UDI20240328001',
      name: '一次性医用口罩',
      specification: '10只/盒',
      batchNumber: 'B20240328',
      from: '生产商A',
      to: '医院B',
      status: 'IN_TRANSIT',
      shippedAt: '2024-03-28 10:00',
      estimatedArrival: '2024-03-30 18:00',
      temperature: '2-8°C',
    },
    {
      udi: 'UDI20240328002',
      name: '医用外科手套',
      specification: '100只/盒',
      batchNumber: 'B20240329',
      from: '生产商A',
      to: '经销商C',
      status: 'IN_TRANSIT',
      shippedAt: '2024-03-29 14:00',
      estimatedArrival: '2024-03-31 12:00',
      temperature: '常温',
    },
  ]
  total.value = 2
}

// 查看详情
const viewDetail = (row: any) => {
  currentAsset.value = row
  detailVisible.value = true
}

// 分页
const handleSizeChange = (size: number) => {
  pageSize.value = size
  fetchTransitAssets()
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  fetchTransitAssets()
}

// 初始化
onMounted(() => {
  fetchTransitAssets()
})
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 {
      margin-bottom: 10px;
    }

    .desc {
      color: #666;
      margin-bottom: 20px;
    }
  }

  .search-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;

    .el-input {
      width: 300px;
    }
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
