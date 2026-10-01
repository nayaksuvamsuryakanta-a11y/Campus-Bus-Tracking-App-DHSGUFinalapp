import { expect, it, vi } from 'vitest'

vi.mock('../services/api.js', () => ({
  default: { get: vi.fn() },
}))

import api from '../services/api.js'
import { getUniversity } from '../services/universityService.js'

it('gets university information and propagates request failures', async () => {
  const info = { name_english: 'DHSGU' }
  api.get.mockResolvedValueOnce({ data: info })
  await expect(getUniversity()).resolves.toEqual(info)
  expect(api.get).toHaveBeenCalledWith('/api/university')

  const failure = new Error('API unavailable')
  api.get.mockRejectedValueOnce(failure)
  await expect(getUniversity()).rejects.toBe(failure)
})