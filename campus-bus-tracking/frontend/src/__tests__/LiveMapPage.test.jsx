import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
vi.mock('../services/busService.js', () => ({
  getBuses: vi.fn(),
  getRoutes: vi.fn(),
  getRouteDetails: vi.fn(),
}))
vi.mock('../services/placeService.js', () => ({ getPlaces: vi.fn() }))

import L from 'leaflet'
import { getBuses, getRouteDetails, getRoutes } from '../services/busService.js'
import { getPlaces } from '../services/placeService.js'
import { mockMap } from './helpers.js'
import LiveMapPage from '../pages/LiveMapPage.jsx'

const delayedBus = {
  id: 4,
  bus_number: 'BUS-4',
  route_name: 'Library Loop',
  status: 'DELAYED',
  latitude: 23.84,
  longitude: 78.75,
  is_verified: 0,
}

const library = {
  id: 11,
  name: 'Central Library',
  category: 'LIBRARY',
  latitude: 23.85,
  longitude: 78.76,
  is_verified: 0,
}

function renderMap(entry = '/live-map') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LiveMapPage />
    </MemoryRouter>,
  )
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('LiveMapPage', () => {
  beforeEach(() => {
    getBuses.mockResolvedValue([delayedBus])
    getPlaces.mockResolvedValue([library])
    getRoutes.mockResolvedValue([])
    getRouteDetails.mockResolvedValue({ stops: [] })
  })

  it('renders the map and gives delayed buses danger-colored divIcons', async () => {
    renderMap()

    expect(await screen.findByTestId('map')).toBeInTheDocument()
    const busMarker = screen.getAllByTestId('marker')
      .find((marker) => marker.getAttribute('data-position') === '[23.84,78.75]')
    expect(busMarker).toBeInTheDocument()
    expect(busMarker).toHaveAttribute('data-icon-html', expect.stringContaining('bg-danger'))
    expect(L.divIcon).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('bg-danger'),
    }))
  })

  it('polls buses every ten seconds and does not poll after unmount', async () => {
    vi.useFakeTimers()
    const { unmount } = renderMap()
    await flushPromises()
    expect(getBuses).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(getBuses).toHaveBeenCalledTimes(2)

    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })
    expect(getBuses).toHaveBeenCalledTimes(2)
  })

  it('loads places and stops once, independent of the bus refresh timer', async () => {
    vi.useFakeTimers()
    getRoutes.mockResolvedValue([{ id: 1, route_name: 'Library Loop' }])
    getRouteDetails.mockResolvedValue({
      route_name: 'Library Loop',
      stops: [{ id: 2, stop_name: 'Gate', latitude: 23.8, longitude: 78.7 }],
    })
    renderMap()
    await flushPromises()

    fireEvent.click(screen.getByLabelText('Stops'))
    fireEvent.click(screen.getByLabelText('Campus places'))
    expect(screen.getByTestId('circle-marker')).toBeInTheDocument()
    expect(getPlaces).toHaveBeenCalledTimes(1)
    expect(getRoutes).toHaveBeenCalledTimes(1)
    expect(getRouteDetails).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(getBuses).toHaveBeenCalledTimes(2)
    expect(getPlaces).toHaveBeenCalledTimes(1)
    expect(getRoutes).toHaveBeenCalledTimes(1)
    expect(getRouteDetails).toHaveBeenCalledTimes(1)
  })

  it('flies to the place selected by the place query parameter', async () => {
    renderMap('/live-map?place=11')

    await waitFor(() => {
      expect(mockMap.flyTo).toHaveBeenCalledWith(
        [23.85, 78.76],
        17,
        { duration: 0.8 },
      )
    })
  })
})