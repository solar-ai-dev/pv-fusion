import axios from 'axios'
import { create } from 'zustand'
import { ApiErrorResponse } from '../../../shared/api/types'
import { authApi } from '../api/authApi'
import { AuthResolution, AuthUser } from '../types'

type AuthState = {
  hasInitialized: boolean
  isAuthenticated: boolean
  isLoggingOut: boolean
  resolution: AuthResolution
  user: AuthUser | null
  error: ApiErrorResponse['error'] | null
  initialize: () => Promise<void>
  refreshMe: () => Promise<void>
  clearAuth: () => void
  logout: () => Promise<{ success: boolean; message?: string }>
}

function resolveAuthFailure(
  error: unknown,
): Pick<AuthState, 'error' | 'resolution'> {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status
    const responseBody = error.response?.data?.error ?? null

    if (!error.response) {
      return {
        error: {
          status: 503,
          code: 'AUTH_SERVER_UNREACHABLE',
          message: '인증 서버에 연결할 수 없습니다.',
          detail: '잠시 후 다시 시도하거나 Backend 서버가 실행 중인지 확인하세요.',
        },
        resolution: 'error',
      }
    }

    if (status === 401) {
      return {
        error: null,
        resolution: 'unauthenticated',
      }
    }

    if (status === 403) {
      return {
        error: responseBody,
        resolution: 'forbidden',
      }
    }

    return {
      error:
        responseBody ??
        ({
          status: status ?? 500,
          code: 'AUTH_REQUEST_FAILED',
          message: '인증 상태를 확인할 수 없습니다.',
        } satisfies ApiErrorResponse['error']),
      resolution: 'error',
    }
  }

  return {
    error: {
      status: 500,
      code: 'AUTH_UNKNOWN_ERROR',
      message: '인증 서버에 연결할 수 없습니다.',
      detail: error instanceof Error ? error.message : undefined,
    },
    resolution: 'error',
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  hasInitialized: false,
  isAuthenticated: false,
  isLoggingOut: false,
  resolution: 'idle',
  user: null,
  error: null,
  initialize: async () => {
    if (get().resolution === 'loading') {
      return
    }

    set({
      resolution: 'loading',
      error: null,
    })

    try {
      const response = await authApi.fetchMe()

      set({
        hasInitialized: true,
        isAuthenticated: true,
        resolution: 'authenticated',
        user: response.data,
        error: null,
      })
    } catch (error) {
      const failure = resolveAuthFailure(error)

      set({
        hasInitialized: true,
        isAuthenticated: false,
        resolution: failure.resolution,
        user: null,
        error: failure.error,
      })
    }
  },
  refreshMe: async () => {
    set({
      resolution: 'loading',
      error: null,
    })

    try {
      const response = await authApi.fetchMe()

      set({
        hasInitialized: true,
        isAuthenticated: true,
        resolution: 'authenticated',
        user: response.data,
        error: null,
      })
    } catch (error) {
      const failure = resolveAuthFailure(error)

      set({
        hasInitialized: true,
        isAuthenticated: false,
        resolution: failure.resolution,
        user: null,
        error: failure.error,
      })
    }
  },
  clearAuth: () => {
    set({
      hasInitialized: true,
      isAuthenticated: false,
      resolution: 'unauthenticated',
      user: null,
      error: null,
    })
  },
  logout: async () => {
    set({ isLoggingOut: true })

    try {
      await authApi.logout()
      get().clearAuth()
      return { success: true }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        get().clearAuth()
        return { success: true }
      }

      const failure = resolveAuthFailure(error)

      set({
        error: failure.error,
        resolution: 'authenticated',
      })

      return {
        success: false,
        message:
          failure.error?.detail ??
          failure.error?.message ??
          '로그아웃 처리 중 문제가 발생했습니다.',
      }
    } finally {
      set({ isLoggingOut: false })
    }
  },
}))
