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
