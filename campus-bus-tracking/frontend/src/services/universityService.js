import api from './api.js'

export async function getUniversity() {
  const { data } = await api.get('/api/university')
  return data
}