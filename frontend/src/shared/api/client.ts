import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8080/api/v1'

function attachAuthorization(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  // 인증 방식(Session/JWT)은 미확정이므로 구조만 열어둡니다.
  const token: string | null = null

  if (token) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }

  return config
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 5000,
})

apiClient.interceptors.request.use(attachAuthorization)
