<template>
  <div class="page-container">
    <div class="page-card">
      <h2>发货管理</h2>
      <p class="desc">选择待发货的资产，指定收货方并发起权属转移</p>

      <!-- 权限提示 -->
      <el-alert
        v-if="!canWrite"
        title="权限不足"
        type="warning"
        description="您的角色是查看者，无法执行发货操作。如需操作权限，请联系管理员。"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />

      <!-- 搜索栏 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="UDI编码">
          <el-input v-model="searchUDI" placeholder="输入UDI搜索" @keyup.enter="searchAsset" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchAsset">搜索</el-button>
        </el-form-item>
      </el-form>

      <!-- 待发货列表 -->
      <el-table :data="assetList" stripe v-loading="loading">
        <el-table-column prop="udi" label="UDI编码" width="220" />
        <el-table-column prop="name" label="耗材名称" />
        <el-table-column prop="specification" label="规格" width="120" />
        <el-table-column prop="batchNumber" label="批次号" width="120" />
        <el-table-column prop="expiryDate" label="有效期" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag type="success">待出厂</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" :disabled="!canWrite" @click="showShipDialog(row)">发货</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 发货对话框 -->
    <el-dialog v-model="shipDialogVisible" title="确认发货" width="500px">
      <el-form :model="shipForm" label-width="100px">
        <el-form-item label="UDI编码">
          <el-input v-model="shipForm.udi" disabled />
        </el-form-item>
        <el-form-item label="耗材名称">
          <el-input v-model="shipForm.name" disabled />
        </el-form-item>
        <el-form-item label="收货方" required>
          <el-select v-model="shipForm.newOwnerMSP" placeholder="选择收货方" style="width: 100%">
            <el-option label="经销商" value="DistributorMSP" />
            <el-option label="医院" value="HospitalMSP" />
          </el-select>
        </el-form-item>
        <el-form-item label="收货方名称" required>
          <el-input v-model="shipForm.newOwner" placeholder="输入收货方名称" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="shipForm.description" type="textarea" placeholder="发货备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="shipLoading" :disabled="!canWrite" @click="confirmShip">确认发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { assetApi } from '@/api'
import { usePermission } from '@/composables/usePermission'

const { canWrite, showPermissionDenied } = usePermission()

const loading = ref(false)
const shipLoading = ref(false)
const searchUDI = ref('')
const assetList = ref<any[]>([])
const shipDialogVisible = ref(false)

const shipForm = reactive({
  udi: '',
  name: '',
  newOwner: '',
  newOwnerMSP: '',
  description: '',
})

// 加载待发货资产
const loadAssets = async () => {
  loading.value = true
  try {
    const res = await assetApi.byStatus('CREATED') as any
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
    }
  } catch (error) {
    console.error('加载失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索资产
const searchAsset = async () => {
  if (!searchUDI.value) {
    loadAssets()
    return
  }

  loading.value = true
  try {
    const res = await assetApi.query(searchUDI.value) as any
    if (res.success && res.data) {
      if (res.data.status === 'CREATED') {
        assetList.value = [res.data]
      } else {
        ElMessage.warning('该资产不在待出厂状态')
        assetList.value = []
      }
    }
  } catch (error) {
    assetList.value = []
  } finally {
    loading.value = false
  }
}

// 显示发货对话框
const showShipDialog = (asset: any) => {
  shipForm.udi = asset.udi
  shipForm.name = asset.name
  shipForm.newOwner = ''
  shipForm.newOwnerMSP = ''
  shipForm.description = ''
  shipDialogVisible.value = true
}

// 确认发货
const confirmShip = async () => {
  if (!shipForm.newOwner || !shipForm.newOwnerMSP) {
    ElMessage.warning('请选择收货方')
    return
  }

  shipLoading.value = true
  try {
    const res = await assetApi.transfer({
      udi: shipForm.udi,
      newOwner: shipForm.newOwner,
      newOwnerMSP: shipForm.newOwnerMSP,
      description: shipForm.description,
    }) as any

    if (res.success) {
      ElMessage.success('发货成功')
      shipDialogVisible.value = false
      loadAssets()
    }
  } catch (error) {
    console.error('发货失败:', error)
  } finally {
    shipLoading.value = false
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
}
</style>
