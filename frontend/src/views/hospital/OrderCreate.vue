<template>
  <div class="page-container">
    <div class="page-card">
      <h2>创建采购订单</h2>
      <p class="desc">填写采购需求并提交订单</p>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" style="max-width: 700px">
        <el-form-item label="订单标题" prop="title">
          <el-input v-model="form.title" placeholder="例如：外科手术耗材采购" />
        </el-form-item>

        <el-form-item label="期望交付日期" prop="expectedDeliveryDate">
          <el-date-picker
            v-model="form.expectedDeliveryDate"
            type="date"
            placeholder="选择交付日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="form.remarks" type="textarea" :rows="3" placeholder="备注信息（可选）" />
        </el-form-item>
      </el-form>

      <!-- 耗材明细 -->
      <h3 style="margin: 20px 0 15px">耗材明细</h3>
      <el-table :data="form.items" border style="margin-bottom: 20px">
        <el-table-column label="耗材名称" min-width="150">
          <template #default="{ row }">
            <el-input v-model="row.materialName" placeholder="耗材名称" />
          </template>
        </el-table-column>
        <el-table-column label="规格型号" width="140">
          <template #default="{ row }">
            <el-input v-model="row.specification" placeholder="规格" />
          </template>
        </el-table-column>
        <el-table-column label="数量" width="140">
          <template #default="{ row }">
            <el-input-number v-model="row.quantity" :min="1" :controls="false" style="width: 100%" placeholder="数量" />
          </template>
        </el-table-column>
        <el-table-column label="单位" width="80">
          <template #default="{ row }">
            <el-input v-model="row.unit" placeholder="个" />
          </template>
        </el-table-column>
        <el-table-column label="单价(元)" width="140">
          <template #default="{ row }">
            <el-input-number v-model="row.unitPrice" :min="0" :precision="2" :controls="false" style="width: 100%" placeholder="单价" />
          </template>
        </el-table-column>
        <el-table-column label="小计" width="100">
          <template #default="{ row }">
            <span>¥{{ (row.quantity * row.unitPrice).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ $index }">
            <el-button type="danger" link @click="removeItem($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-button type="primary" plain @click="addItem" style="margin-bottom: 20px">+ 添加耗材</el-button>

      <div style="text-align: right; font-size: 16px; margin-bottom: 20px">
        合计金额：<b>¥{{ totalAmount }}</b>
      </div>

      <div style="text-align: center">
        <el-button @click="$router.back()">取消</el-button>
        <el-button type="primary" size="large" :loading="loading" @click="handleSubmit">提交订单</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { orderApi } from '@/api'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  title: '',
  expectedDeliveryDate: '',
  remarks: '',
  items: [
    { materialName: '', specification: '', quantity: 1, unit: '个', unitPrice: 0, remarks: '' },
  ],
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入订单标题' }],
  expectedDeliveryDate: [{ required: true, message: '请选择期望交付日期' }],
}

const totalAmount = computed(() => {
  return form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)
})

const addItem = () => {
  form.items.push({ materialName: '', specification: '', quantity: 1, unit: '个', unitPrice: 0, remarks: '' })
}

const removeItem = (index: number) => {
  if (form.items.length <= 1) {
    ElMessage.warning('至少保留一条耗材明细')
    return
  }
  form.items.splice(index, 1)
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    // 检查明细是否完整
    const hasEmpty = form.items.some(item => !item.materialName || !item.specification)
    if (hasEmpty) {
      ElMessage.warning('请填写完整的耗材名称和规格')
      return
    }

    loading.value = true
    try {
      const res = await orderApi.create(form)
      if (res.success) {
        ElMessage.success('订单创建成功')
        router.push('/hospital/orders')
      }
    } catch (error: any) {
      ElMessage.error(error.message || '创建失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 { margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 20px; }
  }
}
</style>
