import axios from 'axios'

export function noop() {
  return undefined
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(date)
}

export function formatCount(value?: number | null) {
  if (typeof value !== 'number') {
    return '-'
  }

  return new Intl.NumberFormat('ko-KR').format(value)
}

export function formatDecimal(value?: string | number | null, digits = 2) {
  if (value == null || value === '') {
    return '-'
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (Number.isNaN(parsed)) {
    return String(value)
  }

  return parsed.toFixed(digits)
}

export function formatRatioPercent(value?: string | number | null, digits = 1) {
  if (value == null || value === '') {
    return '-'
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (Number.isNaN(parsed)) {
    return String(value)
  }

  return `${(parsed * 100).toFixed(digits)}%`
}

export function getApiErrorMessage(
  error: unknown,
  fallback = '요청 처리 중 문제가 발생했습니다.',
) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data?.error?.message === 'string'
        ? error.response.data.error.message
        : undefined

    return responseMessage ?? error.message ?? fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export function getApiErrorStatus(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status ?? null
  }

  return null
}

export function getApiErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.error?.code
    return typeof code === 'string' ? code : null
  }

  return null
}

export function parsePositiveNumber(value?: string) {
  if (!value) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export function toDateTimeLocalInputValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset()
  const normalized = new Date(date.getTime() - offset * 60_000)

  return normalized.toISOString().slice(0, 16)
}

export function toOffsetDateTime(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(offsetMinutes)
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0')
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, '0')

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetRemainder}`
}

export function formatFileSize(value?: number | null) {
  if (typeof value !== 'number' || value <= 0) {
    return '-'
  }

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function isActiveResource(status?: string | null) {
  return status === 'ACTIVE'
}

export function isRunningAnalysisJob(status?: string | null) {
  return status === 'QUEUED' || status === 'RUNNING'
}
