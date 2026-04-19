<template>
  <div class="page-container">
    <div class="page-card">
      <h2>哈希校验</h2>
      <p class="desc">验证链下文档与链上哈希的一致性，确保数据未被篡改</p>

      <!-- 步骤一：输入UDI -->
      <el-card class="step-card" shadow="never">
        <template #header>
          <div class="step-header">
            <el-tag :type="step >= 2 ? 'success' : 'primary'">步骤 1</el-tag>
            <span>输入UDI编码，查询链上哈希</span>
          </div>
        </template>
        <div class="step-content">
          <el-input
            v-model="udi"
            placeholder="请输入UDI编码"
            style="max-width: 400px; margin-right: 12px"
          >
            <template #prepend>UDI</template>
          </el-input>
          <el-button type="primary" :loading="queryLoading" @click="queryAsset">
            查询链上哈希
          </el-button>
        </div>

        <!-- 查询结果 -->
        <div v-if="assetInfo" class="query-result">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="资产名称">{{ assetInfo.name }}</el-descriptions-item>
            <el-descriptions-item label="规格型号">{{ assetInfo.specification }}</el-descriptions-item>
            <el-descriptions-item label="批次号">{{ assetInfo.batchNumber }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="small">{{ assetInfo.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="链上哈希" :span="2">
              <code class="hash-text">{{ assetInfo.docHash || '未设置' }}</code>
            </el-descriptions-item>
          </el-descriptions>
          <el-alert
            v-if="!assetInfo.docHash"
            title="该资产未设置文档哈希"
            type="warning"
            description="此资产在登记时未上传质检报告，无法进行哈希校验。请联系生产商重新登记资产并上传质检报告。"
            :closable="false"
            show-icon
            style="margin-top: 12px"
          />
        </div>
      </el-card>

      <!-- 步骤二：上传文档 -->
      <el-card v-if="step >= 2 && assetInfo?.docHash" class="step-card" shadow="never">
        <template #header>
          <div class="step-header">
            <el-tag :type="step >= 3 ? 'success' : 'primary'">步骤 2</el-tag>
            <span>上传原始文档，计算哈希并校验</span>
          </div>
        </template>
        <div class="step-content">
          <el-upload
            class="upload-area"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持 PDF、图片、Word 等格式</div>
            </template>
          </el-upload>

          <div v-if="calculatedHash" class="hash-compare">
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="上传文件">{{ fileName }}</el-descriptions-item>
              <el-descriptions-item label="文件哈希">
                <code class="hash-text">{{ calculatedHash }}</code>
              </el-descriptions-item>
              <el-descriptions-item label="链上哈希">
                <code class="hash-text">{{ assetInfo?.docHash }}</code>
              </el-descriptions-item>
            </el-descriptions>

            <div class="verify-action">
              <el-button type="primary" size="large" :loading="verifyLoading" @click="handleVerify">
                开始校验
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 校验结果 -->
      <el-card v-if="verifyResult" class="step-card result-card" shadow="never">
        <el-result
          :icon="verifyResult.isValid ? 'success' : 'error'"
          :title="verifyResult.isValid ? '校验通过' : '校验失败'"
        >
          <template #sub-title>
            <p v-if="verifyResult.isValid">文档未被篡改，与链上记录完全一致</p>
            <p v-else>文档可能已被篡改，与链上记录不一致</p>
          </template>
          <template #extra>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="UDI编码">{{ udi }}</el-descriptions-item>
              <el-descriptions-item label="链上哈希">
                <code class="hash-text">{{ verifyResult.storedHash }}</code>
              </el-descriptions-item>
              <el-descriptions-item label="文件哈希">
                <code class="hash-text">{{ verifyResult.providedHash }}</code>
              </el-descriptions-item>
              <el-descriptions-item label="校验时间">{{ verifyResult.verifiedAt }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </el-result>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, UploadFile } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { traceApi } from '@/api'
import CryptoJS from 'crypto-js'

const route = useRoute()
const udi = ref('')
const queryLoading = ref(false)
const verifyLoading = ref(false)
const calculatedHash = ref('')
const fileName = ref('')
const assetInfo = ref<any>(null)
const verifyResult = ref<any>(null)

// 当前步骤
const step = computed(() => {
  if (verifyResult.value) return 3
  if (assetInfo.value) return 2
  return 1
})

// 查询链上资产
const queryAsset = async () => {
  if (!udi.value.trim()) {
    ElMessage.warning('请输入UDI编码')
    return
  }

  queryLoading.value = true
  assetInfo.value = null
  verifyResult.value = null
  calculatedHash.value = ''

  try {
    const res = await traceApi.report(udi.value) as any
    if (res.success && res.data?.asset) {
      assetInfo.value = res.data.asset
      ElMessage.success('查询成功')
    } else {
      ElMessage.error(res.error || '资产不存在')
    }
  } catch (error) {
    ElMessage.error('查询失败，请检查UDI编码')
  } finally {
    queryLoading.value = false
  }
}

// 处理文件上传
const handleFileChange = (file: UploadFile) => {
  if (!file.raw) return

  fileName.value = file.name
  verifyResult.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    calculatedHash.value = CryptoJS.SHA256(content).toString()
    ElMessage.success('哈希计算完成')
  }
  reader.readAsText(file.raw)
}

// 执行校验
const handleVerify = async () => {
  if (!udi.value || !calculatedHash.value) return

  verifyLoading.value = true
  verifyResult.value = null

  try {
    const res = await traceApi.verify({
      udi: udi.value,
      docHash: calculatedHash.value,
    }) as any

    if (res.success) {
      verifyResult.value = res.data
    }
  } catch (error) {
    ElMessage.error('校验请求失败')
  } finally {
    verifyLoading.value = false
  }
}

// 初始化
const queryUdi = route.query.udi as string
if (queryUdi) {
  udi.value = queryUdi
}
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 { margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 24px; }
  }

  .step-card {
    margin-bottom: 20px;

    .step-header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
    }

    .step-content {
      padding: 4px 0;
    }
  }

  .query-result {
    margin-top: 16px;
  }

  .hash-text {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
    background: #f5f7fa;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .upload-area {
    max-width: 500px;
  }

  .hash-compare {
    margin-top: 20px;

    .verify-action {
      margin-top: 16px;
      text-align: center;
    }
  }

  .result-card {
    :deep(.el-result) {
      padding: 20px 0;
    }
  }
}
</style>
