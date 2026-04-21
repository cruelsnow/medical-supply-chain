<template>
  <div class="page-container">
    <div class="page-card">
      <h2>消耗记录</h2>
      <p class="desc">查看临床消耗核销的历史记录</p>

      <!-- 搜索栏 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="filters.startDate"
            type="date"
            placeholder="选择开始日期"
            value-format="YYYY-MM-DD"
            clearable
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="filters.endDate"
            type="date"
            placeholder="选择结束日期"
            value-format="YYYY-MM-DD"
            clearable
          />
        </el-form-item>
        <el-form-item label="科室">
          <el-select v-model="filters.department" placeholder="全部科室" clearable style="width: 150px">
            <el-option label="手术室" value="手术室" />
            <el-option label="内科" value="内科" />
            <el-option label="外科" value="外科" />
            <el-option label="骨科" value="骨科" />
            <el-option label="心内科" value="心内科" />
            <el-option label="神经内科" value="神经内科" />
            <el-option label="急诊科" value="急诊科" />
            <el-option label="ICU" value="ICU" />
            <el-option label="妇产科" value="妇产科" />
            <el-option label="儿科" value="儿科" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="mb-20">
        <el-col :span="8">
          <el-card shadow="never" class="stat-card">
            <div class="stat-value">{{ total }}</div>
            <div class="stat-label">消耗总数</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="never" class="stat-card">
            <div class="stat-value">{{ totalQuantity }}</div>
            <div class="stat-label">消耗数量合计</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="never" class="stat-card">
            <div class="stat-value">{{ departmentCount }}</div>
            <div class="stat-label">涉及科室数</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 消耗列表 -->
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="udi" label="UDI编码" width="180" />
        <el-table-column prop="name" label="耗材名称" />
        <el-table-column prop="specification" label="规格" width="100" />
        <el-table-column prop="batchNumber" label="批次号" width="100" />
        <el-table-column label="消耗数量" width="100">
          <template #default="{ row }">
            {{ row.consumedQuantity || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="department" label="使用科室" width="100">
          <template #default="{ row }">
            {{ row.department || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作者" width="100">
          <template #default="{ row }">
            {{ row.operator || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="消耗时间" width="160">
          <template #default="{ row }">
            {{ row.consumedAt || formatTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewHistory(row)">追溯</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 追溯对话框 -->
    <el-dialog v-model="historyVisible" title="消耗追溯" width="700px">
      <el-timeline v-if="historyList.length > 0">
        <el-timeline-item
          v-for="(item, index) in historyList"
          :key="index"
          :timestamp="formatTime(item.timestamp)"
          placement="top"
          :type="getTimelineType(item.txType)"
        >
          <el-card shadow="never">
            <p><strong>{{ item.action || item.txType }}</strong></p>
            <p>操作者: {{ item.value?.owner || '-' }}</p>
            <p v-if="item.txId">交易ID: {{ item.txId?.substring(0, 20) }}...</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无追溯数据" />
      <template #footer>
        <el-button @click="historyVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { hospitalApi, assetApi } from '@/api'
import { formatTime } from '@/utils'

const loading = ref(false)
const list = ref<any[]>([])
const historyVisible = ref(false)
const historyList = ref<any[]>([])

const filters = reactive({
  startDate: '',
  endDate: '',
  department: '',
})

const total = computed(() => list.value.length)
const totalQuantity = computed(() => {
  return list.value.reduce((sum, item) => sum + (item.consumedQuantity || 1), 0)
})
const departmentCount = computed(() => {
  const depts = new Set(list.value.map(item => item.department).filter(Boolean))
  return depts.size
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await hospitalApi.consumption({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      department: filters.department || undefined,
    }) as any

    if (res.success) {
      list.value = (res.data || []).sort((a: any, b: any) => {
        const timeA = new Date(a.consumedAt || a.updatedAt || 0).getTime()
        const timeB = new Date(b.consumedAt || b.updatedAt || 0).getTime()
        return timeB - timeA
      })
    }
  } catch (error) {
    console.error('加载消耗记录失败:', error)
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.department = ''
  loadData()
}

const viewHistory = async (row: any) => {
  historyVisible.value = true
  historyList.value = []
  try {
    const res = await assetApi.history(row.udi) as any
    if (res.success) {
      historyList.value = res.data || []
    }
  } catch (error) {
    console.error('加载追溯数据失败:', error)
  }
}

const getTimelineType = (txType: string) => {
  const types: Record<string, string> = {
    INIT: 'primary',
    TRANSFER: 'warning',
    RECEIVE: 'success',
    CONSUME: 'danger',
    RECALL: 'danger',
    EXCEPTION: 'danger',
  }
  return types[txType] || 'info'
}

onMounted(() => {
  loadData()
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

  .stat-card {
    text-align: center;

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #409eff;
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-top: 5px;
    }
  }
}
</style>
