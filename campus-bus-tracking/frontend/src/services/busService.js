import api from './api.js'

export async function getRoutes() {
  const { data } = await api.get('/api/routes')
  return data
}

export async function getRouteDetails(routeId) {
  const { data } = await api.get(`/api/routes/${routeId}`)
  return data
}

export async function getBuses() {
  const { data } = await api.get('/api/buses')
  return data
}

export async function updateBusLocation(busId, latitude, longitude) {
  const { data } = await api.post(`/api/buses/${busId}/location`, {
    latitude,
    longitude,
  })
  return data
}

export async function updateBusStatus(busId, status) {
  const { data } = await api.post(`/api/buses/${busId}/status`, { status })
  return data
}