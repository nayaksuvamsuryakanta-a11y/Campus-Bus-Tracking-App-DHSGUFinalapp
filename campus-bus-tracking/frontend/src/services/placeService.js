import api from './api.js'

export async function getPlaces(category) {
  const { data } = await api.get('/api/places', {
    params: category ? { category } : undefined,
  })
  return data
}

export async function getPlace(placeId) {
  const { data } = await api.get(`/api/places/${placeId}`)
  return data
}