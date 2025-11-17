import axios from 'axios'
import { BASE_URL } from '../config'

// Simple token storage helpers
const getAccess = () => localStorage.getItem('nihiconnect_access')
const getRefresh = () => localStorage.getItem('nihiconnect_refresh')

type RequestConfig = {
  setAuthToken: (token: string | null) => void
  get: (url: string, config?: any) => Promise<any>
  post: (url: string, data?: any, config?: any) => Promise<any>
  put: (url: string, data?: any, config?: any) => Promise<any>
  delete: (url: string, config?: any) => Promise<any>
}

const instance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// If we're talking to an ngrok public URL, add the skip-browser-warning header
// so ngrok does not serve its HTML interstitial for free tunnels.
try{
  if (typeof BASE_URL === 'string' && BASE_URL.includes('ngrok')) {
    instance.defaults.headers.common['ngrok-skip-browser-warning'] = '1'
  }
}catch(e){/* ignore in non-browser environments */}

// Ensure each request includes the latest access token from localStorage
instance.interceptors.request.use((config: any) => {
  try {
    const token = localStorage.getItem('nihiconnect_access')
    if (token) {
      config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` }
    }
  } catch (e) {
    // ignore localStorage errors
  }
  return config
}, (error) => Promise.reject(error))

let isRefreshing = false
let refreshPromise: Promise<any> | null = null

// attach auth header
const setAuthToken = (token: string | null) => {
  if (token) instance.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete instance.defaults.headers.common['Authorization']
}

// response interceptor to handle 401 -> try refresh
instance.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (!original || original._retry) return Promise.reject(error)
    if (error.response && error.response.status === 401) {
      // avoid multiple refreshes
      if (!isRefreshing) {
        isRefreshing = true
        const refresh = getRefresh()
        if (!refresh) {
          isRefreshing = false
          return Promise.reject(error)
        }
        // request refresh token endpoint - adjust path if backend differs
        refreshPromise = instance.post('/auth/token/refresh/', { refresh }).then(res => {
          const { access } = res.data
          localStorage.setItem('nihiconnect_access', access)
          setAuthToken(access)
          isRefreshing = false
          return access
        }).catch(err=>{
          isRefreshing = false
          // failed refresh -> logout expected
          throw err
        })
      }

      try{
        const newAccess = await refreshPromise
        // replay original req with new token
        original._retry = true
        original.headers['Authorization'] = `Bearer ${newAccess}`
        return instance(original)
      }catch(err){
        return Promise.reject(err)
      }
    }
    return Promise.reject(error)
  }
)

export const api: RequestConfig = {
  setAuthToken,
  get: (url, config) => instance.get(url, config),
  post: (url, data, config) => {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData
    if (isForm) {
      const cfg = { ...(config || {}), headers: { ...(config?.headers || {}), 'Content-Type': undefined } }
      return instance.post(url, data, cfg)
    }
    return instance.post(url, data, config)
  },
  put: (url, data, config) => {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData
    if (isForm) {
      const cfg = { ...(config || {}), headers: { ...(config?.headers || {}), 'Content-Type': undefined } }
      return instance.put(url, data, cfg)
    }
    return instance.put(url, data, config)
  },
  delete: (url, config) => instance.delete(url, config),
}

export default instance
