import api from './api.js'

export async function sendChatMessage(message) {
  const { data } = await api.post('/api/chat', { message })
  return data
}