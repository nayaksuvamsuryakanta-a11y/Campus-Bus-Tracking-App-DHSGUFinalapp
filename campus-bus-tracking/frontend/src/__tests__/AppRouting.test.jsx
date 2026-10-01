import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-leaflet', async () => {
  const { createReactLeafletMock } = await import('./helpers.js')
  return createReactLeafletMock()
})
vi.mock('leaflet', async () => {
  const { createLeafletMock } = await import('./helpers.js')
  return createLeafletMock()
})
vi.mock('../services/alertService.js', () => ({ getAlerts: vi.fn() }))
vi.mock('../services/busService.js', () => ({
  getBuses: vi.fn(),
  getRouteDetails: vi.fn(),
  getRoutes: vi.fn(),
}))
vi.mock('../services/placeService.js', () => ({ getPlaces: vi.fn() }))
vi.mock('../services/universityService.js', () => ({ getUniversity: vi.fn() }))

import { getAlerts } from '../services/alertService.js'
import { getBuses, getRouteDetails, getRoutes } from '../services/busService.js'
import { getPlaces } from '../services/placeService.js'
import { getUniversity } from '../services/universityService.js'
import { USER_TYPE_STORAGE_KEY } from '../config/userTypes.js'
import App from '../App.jsx'

function renderApp() {
  return render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
}

describe('App landing route', () => {
  beforeEach(() => {
    getAlerts.mockResolvedValue([])
    getBuses.mockResolvedValue([])
    getRouteDetails.mockResolvedValue({ stops: [] })
    getRoutes.mockResolvedValue([])
    getPlaces.mockResolvedValue([])
    getUniversity.mockResolvedValue({})
  })

  it('redirects a stored Student to the live map', async () => {
    localStorage.setItem(USER_TYPE_STORAGE_KEY, 'Student')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Live bus map' })).toBeInTheDocument()
  })

  it('redirects a stored Faculty user to routes', async () => {
    localStorage.setItem(USER_TYPE_STORAGE_KEY, 'Faculty')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Bus routes' })).toBeInTheDocument()
  })

  it('redirects a stored Driver to the driver panel gate', async () => {
    localStorage.setItem(USER_TYPE_STORAGE_KEY, 'Driver')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Driver panel access' })).toBeInTheDocument()
  })
})