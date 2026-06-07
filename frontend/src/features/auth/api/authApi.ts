import { apiClient } from '../../../shared/api/client'
import { ApiSuccessResponse } from '../../../shared/api/types'
import { AuthUser } from '../types'

export const authApi = {
  fetchMe: async () => {
    const response = await apiClient.get<ApiSuccessResponse<AuthUser>>('/auth/me')
    return response.data
  },
  logout: async () => {
    const response = await apiClient.post<void>('/auth/logout')
    return response.status === 204 ? undefined : response.data
  },
  getGoogleLoginUrl: () => `${apiClient.defaults.baseURL}/auth/google`,
  redirectToGoogleLogin: () => {
    window.location.href = `${apiClient.defaults.baseURL}/auth/google`
  },
}
