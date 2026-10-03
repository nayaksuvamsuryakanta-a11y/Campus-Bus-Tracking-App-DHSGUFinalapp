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
  id: 101,
  bus_number: 'BUS-101',
  route_name: 'Campus Circle Route (DEMO)',
  status: 'DELAYED',
  latitude: 23.8204050,
  longitude: 78.7700109,
  is_verified: 0,
}

const library = {
  id: 11,
  name: 'Jawaharlal Nehru Central Library',
  category: 'LIBRARY',
  latitude: 23.8276,
  longitude: 78.7708,
  is_verified: 0,
}

const campusLoopStops = [
  ['Vivekanand Boys Hostel', 23.8204050, 78.7700109],
  ['Rani Laxmi Bai Girls Hostel', 23.8306, 78.7817],
  ['Institute Of Engineering And Technology', 23.8245, 78.7816],
  ['Department of Computer Science and Applications', 23.8241, 78.7820],
  ['Department of Criminology and Forensic', 23.8227, 78.7829],
  ['Nivedita Girls Hostel', 23.8298, 78.7804],
  ['Jawaharlal Nehru Central Library', 23.8276, 78.7708],
].map(([stop_name, latitude, longitude], index) => ({
  id: index + 1,
  stop_name,
  latitude,
  longitude,
}))

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
    getRoutes.mockResolvedValue([{ id: 1, route_name: 'Campus Circle Route (DEMO)' }])
    getRouteDetails.mockResolvedValue({
      route_name: 'Campus Circle Route (DEMO)',
      stops: campusLoopStops,
    })
  })

  it('renders the map and gives delayed buses danger-colored divIcons', async () => {
    renderMap()

    expect(await screen.findByTestId('map')).toBeInTheDocument()
    expect(screen.getByTestId('map')).toHaveAttribute('data-center', '[23.8257,78.7785]')
    expect(screen.getByTestId('map')).toHaveAttribute('data-zoom', '15')
    const busMarker = screen.getAllByTestId('marker')
      .find((marker) => marker.getAttribute('data-position') === '[23.820405,78.7700109]')
    expect(busMarker).toBeInTheDocument()
    expect(busMarker).toHaveAttribute('data-icon-html', expect.stringContaining('bg-danger'))
    expect(L.divIcon).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('bg-danger'),
    }))
    const routeLine = await screen.findByTestId('polyline')
    expect(routeLine).toHaveAttribute(
      'data-positions',
      JSON.stringify(campusLoopStops.map((stop) => [stop.latitude, stop.longitude])),
    )
    expect(routeLine).toHaveAttribute(
      'data-path-options',
      JSON.stringify({ color: '#d9480f', weight: 6, opacity: 0.9 }),
    )
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
    getRoutes.mockResolvedValue([{ id: 1, route_name: 'Campus Circle Route (DEMO)' }])
    getRouteDetails.mockResolvedValue({
      route_name: 'Campus Circle Route (DEMO)',
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
        [23.8276, 78.7708],
        17,
        { duration: 0.8 },
      )
    })
  })
})