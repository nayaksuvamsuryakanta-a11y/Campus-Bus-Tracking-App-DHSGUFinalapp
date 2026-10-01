import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/api.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import api from '../services/api.js'
import { createAlert, getAlerts, updateAlertStatus } from '../services/alertService.js'

describe('alertService', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: [] })
    api.post.mockResolvedValue({ data: { alert_id: 3 } })
    api.patch.mockResolvedValue({ data: { is_active: false } })
  })

  it('gets alerts, creates an alert, and updates an alert status', async () => {
    await getAlerts()
    await createAlert('Route notice', 'Use the east road.', 'ROUTE_CHANGE', true)
    await updateAlertStatus(3, false)

    expect(api.get).toHaveBeenCalledWith('/api/alerts')
    expect(api.post).toHaveBeenCalledWith('/api/alerts', {
      title: 'Route notice',
      message: 'Use the east road.',
      alert_type: 'ROUTE_CHANGE',
      is_active: true,
    })
    expect(api.patch).toHaveBeenCalledWith('/api/alerts/3', { is_active: false })
  })

  it('propagates request failures for the page to handle', async () => {
    const failure = new Error('API unavailable')
    api.post.mockRejectedValue(failure)

    await expect(createAlert('Notice', 'Message', 'GENERAL', true)).rejects.toBe(failure)
  })
})