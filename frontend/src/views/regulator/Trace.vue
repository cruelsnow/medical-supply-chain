<template>
  <div class="page-container">
    <div class="page-card">
      <h2>全链追溯</h2>
      <p class="desc">输入UDI编码，查看资产从生产到消耗的完整链路</p>

      <!-- 搜索栏 -->
      <div class="search-area">
        <el-input
          v-model="udiInput"
          placeholder="请输入UDI编码"
          size="large"
          style="max-width: 400px"
          @keyup.enter="searchTrace"
        >
          <template #prepend>UDI</template>
        </el-input>
        <el-button type="primary" size="large" :loading="loading" @click="searchTrace">
          追溯查询
        </el-button>
      </div>

      <!-- 追溯结果 -->
      <div v-if="traceResult" class="trace-result">
        <!-- 资产基本信息 -->
        <el-descriptions title="资产基本信息" :column="2" border class="mb-20">
          <el-descriptions-item label="UDI编码">{{ traceResult.asset.udi }}</el-descriptions-item>
          <el-descriptions-item label="耗材名称">{{ traceResult.asset.name }}</el-descriptions-item>
          <el-descriptions-item label="规格型号">{{ traceResult.asset.specification }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ traceResult.asset.batchNumber }}</el-descriptions-item>
          <el-descriptions-item label="生产日期">{{ traceResult.asset.productionDate }}</el-descriptions-item>
          <el-descriptions-item label="有效期至">{{ traceResult.asset.expiryDate }}</el-descriptions-item>
          <el-descriptions-item label="生产商">{{ traceResult.asset.producer }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(traceResult.asset.status)">
              {{ getStatusText(traceResult.asset.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前所有者">{{ traceResult.asset.owner }}</el-descriptions-item>
          <el-descriptions-item label="最后更新">{{ formatTime(traceResult.asset.updatedAt) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 流转时间线 -->
        <div class="timeline-section">
          <h3>流转记录</h3>
          <el-timeline>
            <el-timeline-item
              v-for="(record, index) in traceResult.history"
              :key="index"
              :timestamp="formatTime(record.timestamp)"
              :type="getTimelineType(record.value?.status)"
              placement="top"
            >
              <el-card>
                <div class="timeline-content">
                  <div class="status-info">
                    <el-tag :type="getStatusType(record.value?.status)">
                      {{ getStatusText(record.value?.status) }}
                    </el-tag>
                    <span class="owner">所有者: {{ record.value?.owner || '-' }}</span>
                  </div>
                  <div class="tx-info">
                    <span>交易ID: {{ record.txId }}</span>
                  </div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <el-button type="primary" @click="exportReport">导出报告</el-button>
          <el-button @click="goToVerify">哈希校验</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { traceApi } from '@/api'
import { formatTime } from '@/utils'

const route = useRoute()
const router = useRouter()

const udiInput = ref('')
const loading = ref(false)
const traceResult = ref<any>(null)

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
    CREATED: '生产登记',
    IN_TRANSIT: '在途运输',
    IN_STOCK: '入库存储',
    CONSUMED: '临床消耗',
    RECALL: '召回',
    EXCEPTION: '异常',
  }
  return texts[status] || status || '未知'
}

// 获取时间线类型
const getTimelineType = (status: string) => {
  const types: Record<string, any> = {
    CREATED: 'primary',
    IN_TRANSIT: 'warning',
    IN_STOCK: 'success',
    CONSUMED: 'info',
    RECALL: 'danger',
    EXCEPTION: 'danger',
  }
  return types[status] || ''
}

// 追溯查询
const searchTrace = async () => {
  if (!udiInput.value) {
    ElMessage.warning('请输入UDI编码')
    return
  }

  loading.value = true
  traceResult.value = null

  try {
    const res = await traceApi.report(udiInput.value) as any

    if (res.success) {
      traceResult.value = res.data
    } else {
      ElMessage.error('未找到该资产')
    }
  } catch (error) {
    console.error('查询失败:', error)
    ElMessage.error('追溯查询失败')
  } finally {
    loading.value = false
  }
}

// 导出报告
const exportReport = () => {
  ElMessage.success('报告导出功能开发中')
}

// 跳转哈希校验
const goToVerify = () => {
  router.push(`/regulator/verify?udi=${udiInput.value}`)
}

// 初始化
onMounted(() => {
  // 从URL参数获取UDI
  const udi = route.query.udi as string
  if (udi) {
    udiInput.value = udi
    searchTrace()
  }
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
      margin-bottom: 30px;
    }
  }

  .search-area {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
  }

  .trace-result {
    .timeline-section {
      margin-top: 30px;

      h3 {
        margin-bottom: 20px;
      }

      .timeline-content {
        .status-info {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 10px;

          .owner {
            color: #666;
          }
        }

        .tx-info {
          font-size: 12px;
          color: #999;
        }
      }
    }

    .actions {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
  }
}
</style>
