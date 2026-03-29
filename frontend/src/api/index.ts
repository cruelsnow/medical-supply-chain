// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - API请求封装
// =============================================================================
// 功能: 统一管理所有API请求
// =============================================================================

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// =============================================================================
// Axios实例配置
// =============================================================================

const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// =============================================================================
// 请求拦截器
// =============================================================================
service.interceptors.request.use(
  (config) => {
    NProgress.start()

    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    NProgress.done()
    return Promise.reject(error)
  }
)

// =============================================================================
// 响应拦截器
// =============================================================================
service.interceptors.response.use(
  (response: AxiosResponse) => {
    NProgress.done()

    const { data } = response

    // 如果返回的是文件流，直接返回
    if (response.config.responseType === 'blob') {
      return response
    }

    // 业务逻辑错误
    if (!data.success) {
      ElMessage.error(data.error || '请求失败')
      return Promise.reject(new Error(data.error || '请求失败'))
    }

    return data
  },
  (error) => {
    NProgress.done()

    // HTTP错误处理
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          ElMessage.error('没有权限访问')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(data?.error || '请求失败')
      }
    } else {
      ElMessage.error('网络连接失败')
    }

    return Promise.reject(error)
  }
)

// =============================================================================
// 通用请求方法
// =============================================================================
export const request = {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, config)
  },

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config)
  },

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.put(url, data, config)
  },

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.delete(url, config)
  },
}

// =============================================================================
// API接口定义
// =============================================================================

// 认证相关
export const authApi = {
  login: (data: { username: string; password: string; orgName: string }) =>
    request.post('/auth/login', data),

  register: (data: { username: string; password: string; orgName: string; name?: string; role?: string }) =>
    request.post('/auth/register', data),

  getMe: () => request.get('/auth/me'),

  refresh: () => request.post('/auth/refresh'),

  logout: () => request.post('/auth/logout'),

  // 用户管理（管理员）
  getUsers: (params?: { orgName?: string; page?: number; pageSize?: number }) =>
    request.get('/auth/users', { params }),

  getUser: (id: string) => request.get(`/auth/users/${id}`),

  updateUser: (id: string, data: { name?: string; role?: string }) =>
    request.put(`/auth/users/${id}`, data),

  updateStatus: (id: string, status: 'active' | 'disabled') =>
    request.put(`/auth/users/${id}/status`, { status }),

  resetPassword: (id: string, newPassword: string) =>
    request.put(`/auth/users/${id}/password`, { newPassword }),

  deleteUser: (id: string) => request.delete(`/auth/users/${id}`),
}

// 资产相关
export const assetApi = {
  // 资产初始化
  init: (data: {
    udi: string
    name: string
    specification: string
    batchNumber: string
    productionDate: string
    expiryDate: string
    docHash: string
    producer: string
  }) => request.post('/asset/init', data),

  // 权属转移
  transfer: (data: {
    udi: string
    newOwner: string
    newOwnerMSP: string
    description?: string
  }) => request.post('/asset/transfer', data),

  // 查询单个资产
  query: (udi: string) => request.get(`/asset/query/${udi}`),

  // 查询所有资产
  all: () => request.get('/asset/all'),

  // 按所有者查询
  byOwner: (owner: string) => request.get(`/asset/owner/${owner}`),

  // 按状态查询
  byStatus: (status: string) => request.get(`/asset/status/${status}`),

  // 按批次查询
  byBatch: (batchNumber: string) => request.get(`/asset/batch/${batchNumber}`),

  // 历史追溯
  history: (udi: string) => request.get(`/asset/history/${udi}`),

  // 消耗核销
  burn: (data: {
    udi: string
    hospital: string
    department: string
    surgeryId?: string
    operator: string
    remarks?: string
  }) => request.post('/asset/burn', data),

  // 资产召回
  recall: (udi: string, reason: string) =>
    request.post('/asset/recall', { udi, reason }),

  // 资产统计
  stats: () => request.get('/asset/stats'),
}

// 医院相关
export const hospitalApi = {
  // 入库
  inbound: (data: { udi: string; receiverName: string }) =>
    request.post('/hospital/inbound', data),

  // 库存查询
  inventory: (params?: { status?: string; batchNumber?: string; keyword?: string }) =>
    request.get('/hospital/inventory', { params }),

  // 库存详情
  inventoryDetail: (udi: string) => request.get(`/hospital/inventory/${udi}`),

  // 临床消耗
  consume: (data: {
    udi: string
    hospital: string
    department: string
    surgeryId?: string
    operator: string
    remarks?: string
  }) => request.post('/hospital/consume', data),

  // 效期预警
  expiring: (days: number = 30) =>
    request.get('/hospital/expiring', { params: { days } }),

  // 消耗记录
  consumption: (params?: { startDate?: string; endDate?: string; department?: string }) =>
    request.get('/hospital/consumption', { params }),
}

// 物流相关
export const logisticsApi = {
  // 收货确权
  receive: (data: { udi: string; receiverName: string }) =>
    request.post('/logistics/receive', data),

  // 更新环境数据
  envData: (data: {
    udi: string
    temperature: number
    humidity: number
    location: string
    isAbnormal: boolean
  }) => request.post('/logistics/envdata', data),

  // 在途资产
  transit: () => request.get('/logistics/transit'),

  // 异常资产
  abnormal: () => request.get('/logistics/abnormal'),
}

// 追溯监管相关
export const traceApi = {
  // 全链追溯报告
  report: (udi: string) => request.get(`/trace/report/${udi}`),

  // 哈希校验
  verify: (data: { udi: string; docHash: string }) =>
    request.post('/trace/verify', data),

  // 批量追溯
  batch: (udiList: string[]) => request.post('/trace/batch', { udiList }),

  // 全局统计
  stats: () => request.get('/trace/stats'),

  // 计算哈希
  hash: (content: string) => request.post('/trace/hash', { content }),
}

export default service
