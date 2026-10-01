import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/api.js', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

import api from '../services/api.js'
import {
  getBuses,
  getRouteDetails,
  getRoutes,
  updateBusLocation,
  updateBusStatus,
} from '../services/busService.js'

describe('busService', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: [] })
    api.post.mockResolvedValue({ data: { ok: true } })
  })

  it('gets routes, route details, and buses from their API paths', async () => {
    await getRoutes()
    await getRouteDetails(17)
    await getBuses()

    expect(api.get).toHaveBeenNthCalledWith(1, '/api/routes')
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/routes/17')
    expect(api.get).toHaveBeenNthCalledWith(3, '/api/buses')
  })

  it('posts location and status updates with their request bodies', async () => {
    await updateBusLocation(8, 23.84, 78.75)
    await updateBusStatus(8, 'DELAYED')

    expect(api.post).toHaveBeenNthCalledWith(1, '/api/buses/8/location', {
      latitude: 23.84,
      longitude: 78.75,
    })
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/buses/8/status', {
      status: 'DELAYED',
    })
  })

  it('propagates request failures for the page to handle', async () => {
    const failure = new Error('API unavailable')
    api.get.mockRejectedValue(failure)

    await expect(getBuses()).rejects.toBe(failure)
  })
})