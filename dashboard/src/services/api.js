import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('[API Error]', err.message)
    return Promise.reject(err)
  }
)

export const getStatus    = ()            => api.get('/status')
export const getSlots     = ()            => api.get('/slots')
export const updateSlot   = (id, data)   => api.post(`/slots/${id}`, data)
export const toggleSlot   = (id)         => api.post(`/slots/${id}/toggle`)
export const getTradeHistory = ()        => api.get('/trades')
export const getBalance   = ()            => api.get('/balance')
export const getAgentStatus = ()          => api.get('/agents/status')
export const lookupStock  = (code)        => api.get(`/stocks/${code}`)

export default api
