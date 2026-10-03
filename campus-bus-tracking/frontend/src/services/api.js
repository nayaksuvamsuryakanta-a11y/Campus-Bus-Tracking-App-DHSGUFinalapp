import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000',
  timeout: 70000,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const pin = window.sessionStorage.getItem('dhsgu-driver-pin')
    if (pin) {
      config.headers['X-Driver-Pin'] = pin
    }
  }
  return config
})

export default api