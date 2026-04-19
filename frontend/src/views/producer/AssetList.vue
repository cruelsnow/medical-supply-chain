<template>
  <div class="page-container">
    <div class="page-card">
      <h2>资产列表</h2>
      <p class="desc">查看所有已登记的资产</p>

      <!-- 搜索栏 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="状态">
          <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="loadAssets">
            <el-option label="全部" value="" />
            <el-option label="待出厂" value="CREATED" />
            <el-option label="在途" value="IN_TRANSIT" />
            <el-option label="在库" value="IN_STOCK" />
            <el-option label="已消耗" value="CONSUMED" />
            <el-option label="召回" value="RECALL" />
          </el-select>
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="filterBatch" placeholder="输入批次号" clearable @keyup.enter="loadAssets" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAssets">搜索</el-button>
        </el-form-item>
      </el-form>

      <!-- 资产列表 -->
      <el-table :data="assetList" stripe v-loading="loading">
        <el-table-column prop="udi" label="UDI编码" width="200" />
        <el-table-column prop="name" label="耗材名称" />
        <el-table-column prop="specification" label="规格" width="100" />
        <el-table-column prop="batchNumber" label="批次号" width="100" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="expiryDate" label="有效期" width="110" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="owner" label="当前所有者" width="120" />
        <el-table-column prop="updatedAt" label="更新时间" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
            <el-button
              type="danger"
              link
              v-if="row.status !== 'CONSUMED'"
              @click="showRecallDialog(row)"
            >
              召回
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        class="pagination"
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="10"
      />
    </div>

    <!-- 召回对话框 -->
    <el-dialog v-model="recallDialogVisible" title="资产召回" width="400px">
      <el-form :model="recallForm" label-width="80px">
        <el-form-item label="UDI">
          <el-input v-model="recallForm.udi" disabled />
        </el-form-item>
        <el-form-item label="召回原因" required>
          <el-input v-model="recallForm.reason" type="textarea" placeholder="请输入召回原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recallDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="recallLoading" @click="confirmRecall">确认召回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { assetApi } from '@/api'

const router = useRouter()
const loading = ref(false)
const recallLoading = ref(false)
const filterStatus = ref('')
const filterBatch = ref('')
const assetList = ref<any[]>([])
const total = ref(0)
const recallDialogVisible = ref(false)

const recallForm = reactive({
  udi: '',
  reason: '',
})

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, any> = {
    CREATED: '',
    IN_TRANSIT: 'warning',
    IN_STOCK: 'success',
    CONSUMED: 'info',
    RECALL: 'danger',
    EXCEPTION: 'danger',
  }
  return types[status] || ''
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    CREATED: '待出厂',
    IN_TRANSIT: '在途',
    IN_STOCK: '在库',
    CONSUMED: '已消耗',
    RECALL: '召回',
    EXCEPTION: '异常',
  }
  return texts[status] || status
}

// 加载资产
const loadAssets = async () => {
  loading.value = true
  try {
    let res: any
    if (filterStatus.value) {
      res = await assetApi.byStatus(filterStatus.value)
    } else {
      res = await assetApi.all()
    }

    if (res.success) {
      // 过滤掉数据不完整的记录，按创建时间倒序排列
      const data = res.data || []
      assetList.value = data
        .filter((item: any) => item.name && item.name.trim() !== '')
        .sort((a: any, b: any) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeB - timeA
      })
      total.value = res.total || assetList.value.length
    }
  } catch (error) {
    console.error('加载失败:', error)
  } finally {
    loading.value = false
  }
}

// 查看详情
const viewDetail = (asset: any) => {
  router.push(`/regulator/trace?udi=${asset.udi}`)
}

// 显示召回对话框
const showRecallDialog = (asset: any) => {
  recallForm.udi = asset.udi
  recallForm.reason = ''
  recallDialogVisible.value = true
}

// 确认召回
const confirmRecall = async () => {
  if (!recallForm.reason) {
    ElMessage.warning('请输入召回原因')
    return
  }

  recallLoading.value = true
  try {
    const res = await assetApi.recall(recallForm.udi, recallForm.reason) as any
    if (res.success) {
      ElMessage.success('召回成功')
      recallDialogVisible.value = false
      loadAssets()
    }
  } catch (error) {
    console.error('召回失败:', error)
  } finally {
    recallLoading.value = false
  }
}

onMounted(() => {
  loadAssets()
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

  .pagination {
    margin-top: 20px;
    justify-content: flex-end;
  }
}
</style>
