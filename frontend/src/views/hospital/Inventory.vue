<template>
  <div class="page-container">
    <div class="page-card">
      <h2>库存管理</h2>
      <p class="desc">查看当前库存，管理效期预警</p>

      <!-- 搜索栏 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="批次号">
          <el-input v-model="filters.batchNumber" placeholder="输入批次号" clearable />
        </el-form-item>
        <el-form-item label="效期预警">
          <el-switch v-model="filters.showExpiring" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadInventory">刷新</el-button>
        </el-form-item>
      </el-form>

      <!-- 效期预警 -->
      <el-alert
        v-if="expiringCount > 0"
        :title="`有 ${expiringCount} 项资产即将过期`"
        type="warning"
        show-icon
        class="mb-20"
      />

      <!-- 库存列表 -->
      <el-table :data="inventoryList" stripe v-loading="loading">
        <el-table-column prop="udi" label="UDI编码" width="200" />
        <el-table-column prop="name" label="耗材名称" />
        <el-table-column prop="specification" label="规格" width="100" />
        <el-table-column prop="batchNumber" label="批次号" width="100" />
        <el-table-column prop="expiryDate" label="有效期" width="110">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpiring(row.expiryDate) }">
              {{ row.expiryDate }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="owner" label="库房" width="120" />
        <el-table-column prop="updatedAt" label="入库时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDetailDialog(row)">查看</el-button>
            <el-button type="success" link @click="showConsumeDialog(row)">核销</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 核销对话框 -->
    <el-dialog v-model="consumeDialogVisible" title="临床消耗核销" width="500px">
      <el-form :model="consumeForm" label-width="100px">
        <el-form-item label="UDI">
          <el-input v-model="consumeForm.udi" disabled />
        </el-form-item>
        <el-form-item label="耗材名称">
          <el-input v-model="consumeForm.assetName" disabled />
        </el-form-item>
        <el-form-item label="使用科室" required>
          <el-input v-model="consumeForm.department" placeholder="输入使用科室" />
        </el-form-item>
        <el-form-item label="手术ID">
          <el-input v-model="consumeForm.surgeryId" placeholder="关联手术ID（可选）" />
        </el-form-item>
        <el-form-item label="操作者" required>
          <el-input v-model="consumeForm.operator" placeholder="操作者姓名" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="consumeForm.remarks" type="textarea" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="consumeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="consumeLoading" @click="confirmConsume">
          确认核销
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="库存详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="UDI编码">{{ detailData.udi }}</el-descriptions-item>
        <el-descriptions-item label="耗材名称">{{ detailData.name }}</el-descriptions-item>
        <el-descriptions-item label="规格型号">{{ detailData.specification }}</el-descriptions-item>
        <el-descriptions-item label="批次号">{{ detailData.batchNumber }}</el-descriptions-item>
        <el-descriptions-item label="生产日期">{{ detailData.productionDate }}</el-descriptions-item>
        <el-descriptions-item label="有效期至">
          <span :class="{ 'text-danger': isExpiring(detailData.expiryDate) }">
            {{ detailData.expiryDate }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="生产商">{{ detailData.producer }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag type="success">在库</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="入库时间">{{ formatTime(detailData.updatedAt) }}</el-descriptions-item>
        <el-descriptions-item label="库房">{{ detailData.owner }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="success" @click="detailDialogVisible = false; showConsumeDialog(detailData)">核销</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { hospitalApi } from '@/api'
import { formatTime } from '@/utils'

const loading = ref(false)
const consumeLoading = ref(false)
const consumeDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const inventoryList = ref<any[]>([])
const expiringList = ref<any[]>([])

const filters = reactive({
  batchNumber: '',
  showExpiring: false,
})

const consumeForm = reactive({
  udi: '',
  assetName: '',
  department: '',
  surgeryId: '',
  operator: '',
  remarks: '',
})

const detailData = reactive({
  udi: '',
  name: '',
  specification: '',
  batchNumber: '',
  productionDate: '',
  expiryDate: '',
  producer: '',
  owner: '',
  updatedAt: '',
})

// 效期预警数量
const expiringCount = computed(() => expiringList.value.length)

// 判断是否即将过期
const isExpiring = (expiryDate: string) => {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const days = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return days <= 30
}

// 加载库存
const loadInventory = async () => {
  loading.value = true
  try {
    const res = await hospitalApi.inventory({
      batchNumber: filters.batchNumber || undefined,
    }) as any

    if (res.success) {
      // 过滤掉数据不完整的记录，按更新时间倒序排列
      const data = res.data || []
      inventoryList.value = data
        .filter((item: any) => item.name && item.name.trim() !== '')  // 只保留有完整数据的记录
        .sort((a: any, b: any) => {
          const timeA = new Date(a.updatedAt || 0).getTime()
          const timeB = new Date(b.updatedAt || 0).getTime()
          return timeB - timeA
        })
    }

    // 加载效期预警
    const expiringRes = await hospitalApi.expiring(30) as any
    if (expiringRes.success) {
      // 同样过滤效期预警列表
      expiringList.value = (expiringRes.data || []).filter((item: any) => item.name && item.name.trim() !== '')
    }
  } catch (error) {
    console.error('加载失败:', error)
  } finally {
    loading.value = false
  }
}

// 显示详情对话框
const showDetailDialog = (asset: any) => {
  Object.assign(detailData, asset)
  detailDialogVisible.value = true
}

// 显示核销对话框
const showConsumeDialog = (asset: any) => {
  consumeForm.udi = asset.udi
  consumeForm.assetName = asset.name
  consumeForm.department = ''
  consumeForm.surgeryId = ''
  consumeForm.operator = ''
  consumeForm.remarks = ''
  consumeDialogVisible.value = true
}

// 确认核销
const confirmConsume = async () => {
  if (!consumeForm.department || !consumeForm.operator) {
    ElMessage.warning('请填写必要信息')
    return
  }

  consumeLoading.value = true
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const res = await hospitalApi.consume({
      udi: consumeForm.udi,
      hospital: user.name || '医院',
      department: consumeForm.department,
      surgeryId: consumeForm.surgeryId,
      operator: consumeForm.operator,
      remarks: consumeForm.remarks,
    }) as any

    if (res.success) {
      ElMessage.success('核销成功')
      consumeDialogVisible.value = false
      loadInventory()
    }
  } catch (error) {
    console.error('核销失败:', error)
  } finally {
    consumeLoading.value = false
  }
}

onMounted(() => {
  loadInventory()
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

  .search-form {
    margin-bottom: 20px;
  }
}
</style>
