/**
 * 工具函数
 */

/**
 * 格式化时间（UTC转本地时间）
 * 区块链存储的是UTC时间，需要转换为本地时间显示
 */
export function formatTime(utcTime: string): string {
  if (!utcTime) return '-'

  // 解析UTC时间字符串 "2026-03-01 08:30:00"
  const [datePart, timePart] = utcTime.split(' ')
  if (!datePart || !timePart) return utcTime

  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second] = timePart.split(':').map(Number)

  // 创建UTC时间对象
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second || 0))

  // 转换为本地时间字符串
  const localDate = new Date(utcDate.getTime())

  const pad = (n: number) => n.toString().padStart(2, '0')

  return `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())} ${pad(localDate.getHours())}:${pad(localDate.getMinutes())}:${pad(localDate.getSeconds())}`
}

/**
 * 格式化日期
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return dateStr.split(' ')[0] // 只返回日期部分
}
