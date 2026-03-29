<template>
  <div class="page-container">
    <div class="page-card">
      <h2>数据统计</h2>
      <p class="desc">查看系统整体运行数据</p>

      <!-- 统计卡片 -->
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">资产总数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card success">
            <div class="stat-value">{{ stats.inStock }}</div>
            <div class="stat-label">在库</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card warning">
            <div class="stat-value">{{ stats.inTransit }}</div>
            <div class="stat-label">在途</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card info">
            <div class="stat-value">{{ stats.consumed }}</div>
            <div class="stat-label">已消耗</div>
          </div>
        </el-col>
      </el-row>

      <!-- 状态分布 -->
      <div class="chart-section">
        <h3>状态分布</h3>
        <div ref="pieChartRef" class="chart" style="height: 300px;"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import * as echarts from 'echarts'
import { traceApi } from '@/api'

const pieChartRef = ref<HTMLElement>()
const stats = reactive({
  total: 0,
  created: 0,
  inTransit: 0,
  inStock: 0,
  consumed: 0,
  recall: 0,
  exception: 0,
})

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await traceApi.stats() as any
    if (res.success && res.data) {
      stats.total = res.data.total || 0
      Object.assign(stats, res.data.byStatus || {})
      renderChart()
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 渲染图表
const renderChart = () => {
  if (!pieChartRef.value) return

  const chart = echarts.init(pieChartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
    },
    series: [
      {
        name: '资产状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        data: [
          { value: stats.created, name: '待出厂', itemStyle: { color: '#409eff' } },
          { value: stats.inTransit, name: '在途', itemStyle: { color: '#e6a23c' } },
          { value: stats.inStock, name: '在库', itemStyle: { color: '#67c23a' } },
          { value: stats.consumed, name: '已消耗', itemStyle: { color: '#909399' } },
          { value: stats.recall, name: '召回', itemStyle: { color: '#f56c6c' } },
          { value: stats.exception, name: '异常', itemStyle: { color: '#f56c6c' } },
        ],
      },
    ],
  }

  chart.setOption(option)

  // 响应式
  window.addEventListener('resize', () => chart.resize())
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 { margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 30px; }
  }

  .stat-card {
    background: #fff;
    border-radius: 8px;
    padding: 30px;
    text-align: center;
    border-left: 4px solid #409eff;

    &.success { border-left-color: #67c23a; }
    &.warning { border-left-color: #e6a23c; }
    &.info { border-left-color: #909399; }

    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #333;
    }

    .stat-label {
      margin-top: 10px;
      color: #666;
    }
  }

  .chart-section {
    margin-top: 30px;

    h3 { margin-bottom: 20px; }
    .chart { width: 100%; }
  }
}
</style>
