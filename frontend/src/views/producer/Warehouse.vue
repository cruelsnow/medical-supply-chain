<template>
  <div class="page-container">
    <div class="page-card">
      <h2>仓储清单</h2>
      <p class="desc">查看已登记未发货的资产，发货后自动从清单中消失</p>

      <el-form :inline="true" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="keyword" placeholder="搜索UDI/名称" clearable style="width: 200px" @clear="loadAssets" @keyup.enter="loadAssets" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAssets">刷新</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="filteredList" stripe v-loading="loading">
        <el-table-column prop="udi" label="UDI编码" width="200" />
        <el-table-column prop="name" label="耗材名称" min-width="150" />
        <el-table-column prop="specification" label="规格型号" width="120">
          <template #default="{ row }">{{ row.specification || '-' }}</template>
        </el-table-column>
        <el-table-column prop="batchNumber" label="批次号" width="100" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="productionDate" label="生产日期" width="110" />
        <el-table-column prop="expiryDate" label="有效期至" width="110">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpiring(row.expiryDate) }">
              {{ row.expiryDate }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="登记时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && filteredList.length === 0" description="暂无在库资产" :image-size="80" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { assetApi } from '@/api'
import { formatTime } from '@/utils'

const loading = ref(false)
const keyword = ref('')
const assets = ref<any[]>([])

const filteredList = computed(() => {
  if (!keyword.value.trim()) return assets.value
  const kw = keyword.value.trim().toLowerCase()
  return assets.value.filter(
    (a: any) =>
      (a.udi || '').toLowerCase().includes(kw) ||
      (a.name || '').toLowerCase().includes(kw)
  )
})

const isExpiring = (expiryDate: string) => {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const now = new Date()
  const days = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return days <= 30
}

const loadAssets = async () => {
  loading.value = true
  try {
    const res = await assetApi.byStatus('CREATED') as any
    if (res.success) {
      assets.value = (res.data || [])
        .filter((a: any) => (a.owner === 'producer' || a.owner === 'ProducerMSP' || a.producerMSP === 'ProducerMSP') && a.name && a.name.trim() !== '')
        .sort((a: any, b: any) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeB - timeA
        })
    }
  } catch {
    ElMessage.error('加载仓储清单失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadAssets())
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 { margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 20px; }
    .search-form { margin-bottom: 20px; }
  }
  .text-danger { color: #f56c6c; }
}
</style>
