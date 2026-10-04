import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

function getPairFromUrl(url) {
  const waypoints = url.split('/driving/')[1].split('?')[0]
  return waypoints.split(';').map((waypoint) => waypoint.split(',').map(Number))
}

function roadMiddle(start, end) {
  return [
    (start[0] + end[0]) / 2 + 0.0001,
    (start[1] + end[1]) / 2 + 0.0001,
  ]
}

function createRoadRouteResponse(url, { distanceMeters = 1000, detour = false } = {}) {
  const [start, end] = getPairFromUrl(url)
  const coordinates = detour
    ? [start, [78.9, 23.7], end]
    : [start, roadMiddle(start, end), end]
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      code: 'Ok',
      routes: [{
        geometry: { coordinates },
        distance: distanceMeters,
        duration: 9000,
      }],
    }),
  }
}

function expectedRoadCoordinates(stops, straightSegmentIndex = -1) {
  const coordinates = []
  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = [Number(stops[index].longitude), Number(stops[index].latitude)]
    const end = [Number(stops[index + 1].longitude), Number(stops[index + 1].latitude)]
    const segment = index === straightSegmentIndex
      ? [start, end]
      : [start, roadMiddle(start, end), end]
    segment.forEach((coordinate) => {
      const previous = coordinates.at(-1)
      if (previous?.[0] === coordinate[0] && previous?.[1] === coordinate[1]) return
      coordinates.push(coordinate)
    })
  }
  return coordinates
}

function expectUniformBlueRouteLines(routeLines) {
  expect(routeLines).toHaveLength(2)
  expect(routeLines.map((routeLine) => (
    JSON.parse(routeLine.getAttribute('data-path-options')).color
  ))).toEqual(['#0b57d0', '#1a73e8'])
}

function haversineDistanceKm(start, end) {
  const radians = Math.PI / 180
  const latitude1 = Number(start.latitude) * radians
  const latitude2 = Number(end.latitude) * radians
  const latitudeDelta = latitude2 - latitude1
  const longitudeDelta = (Number(end.longitude) - Number(start.longitude)) * radians
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function routeUrl(start, end) {
  return `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`
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
    await Promise.resolve()
    await Promise.resolve()
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LiveMapPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => (
      Promise.resolve(createRoadRouteResponse(url))
    )))
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
    expect(screen.getByTestId('tile-layer')).toHaveAttribute(
      'data-url',
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    )
    expect(screen.getByTestId('tile-layer')).toHaveAttribute(
      'data-attribution',
      '© OpenStreetMap contributors',
    )
    expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-max-zoom', '19')
    expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-class-name', 'gm-muted-tiles')
    const busMarker = screen.getAllByTestId('marker')
      .find((marker) => marker.getAttribute('data-position') === '[23.820405,78.7700109]')
    expect(busMarker).toBeInTheDocument()
    expect(busMarker).toHaveAttribute('data-icon-html', expect.stringContaining('bg-danger'))
    expect(L.divIcon).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('bg-danger'),
    }))
    expect(await screen.findByText('≈ 6.0 km • ~18 min')).toBeInTheDocument()
    const routeLines = await screen.findAllByTestId('polyline')
    expectUniformBlueRouteLines(routeLines)
    const routeVertices = JSON.stringify(
      expectedRoadCoordinates(campusLoopStops).map(([longitude, latitude]) => [latitude, longitude]),
    )
    routeLines.forEach((routeLine) => {
      expect(routeLine).toHaveAttribute('data-positions', routeVertices)
    })
    expect(routeLines[0]).toHaveAttribute(
      'data-path-options',
      JSON.stringify({
        color: '#0b57d0', weight: 9, opacity: 0.9, lineCap: 'round', lineJoin: 'round',
      }),
    )
    expect(routeLines[1]).toHaveAttribute(
      'data-path-options',
      JSON.stringify({
        color: '#1a73e8', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round',
      }),
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Campus Circle Route (DEMO)' }))
      .toBeInTheDocument()
    expect(screen.getByTestId('route-summary')).toHaveTextContent('≈ 6.0 km • ~18 min')
    expect(screen.queryByText('Road routing unavailable - showing direct demo line.'))
      .not.toBeInTheDocument()
    const expectedUrls = campusLoopStops.slice(1).map((stop, index) => (
      routeUrl(campusLoopStops[index], stop)
    ))
    expect(globalThis.fetch.mock.calls.map(([url]) => url)).toEqual(expectedUrls)
    expect(globalThis.fetch.mock.calls.every(([, options]) => options.signal instanceof AbortSignal))
      .toBe(true)
    const itineraryRows = screen.getAllByRole('listitem')
    expect(itineraryRows).toHaveLength(7)
    expect(itineraryRows.map((row) => row.querySelector('.live-map-stop-name').textContent))
      .toEqual(campusLoopStops.map((stop) => stop.stop_name))
    expect(itineraryRows[0]).toHaveTextContent('23.820405, 78.7700109')
    expect(within(screen.getByTestId('route-itinerary'))
      .getByText('Demo data - not official')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Stops'))
    const waypointMarkers = screen.getAllByTestId('circle-marker')
    expect(waypointMarkers).toHaveLength(7)
    expect(waypointMarkers[0]).toHaveAttribute('data-radius', '6')
    expect(waypointMarkers[0]).toHaveAttribute(
      'data-path-options',
      JSON.stringify({ color: '#fff', weight: 2, fillColor: '#1a73e8', fillOpacity: 1 }),
    )
    expect(waypointMarkers[1]).toHaveAttribute('data-radius', '5')
    expect(waypointMarkers[1]).toHaveAttribute(
      'data-path-options',
      JSON.stringify({ color: '#80868b', weight: 2, fillColor: '#fff', fillOpacity: 1 }),
    )
    expect(waypointMarkers[6]).toHaveAttribute('data-radius', '7')
    expect(waypointMarkers[6]).toHaveAttribute(
      'data-path-options',
      JSON.stringify({ color: '#fff', weight: 2, fillColor: '#ea4335', fillOpacity: 1 }),
    )
  })

  it('polls buses every ten seconds and does not poll after unmount', async () => {
    vi.useFakeTimers()
    const { unmount } = renderMap()
    await flushPromises()
    expect(getBuses).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).toHaveBeenCalledTimes(6)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(getBuses).toHaveBeenCalledTimes(2)
    expect(globalThis.fetch).toHaveBeenCalledTimes(6)

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

  it('uses straight-line geometry and summary when OSRM routing fails', async () => {
    globalThis.fetch.mockRejectedValue(new Error('OSRM unavailable'))
    renderMap()

    expect(await screen.findByText('Road routing unavailable - showing direct demo line.'))
      .toBeInTheDocument()
    const directRouteVertices = JSON.stringify(
      campusLoopStops.map((stop) => [stop.latitude, stop.longitude]),
    )
    const routeLines = screen.getAllByTestId('polyline')
    expect(routeLines).toHaveLength(2)
    routeLines.forEach((routeLine) => {
      expect(routeLine).toHaveAttribute('data-positions', directRouteVertices)
    })
    expect(screen.getByTestId('route-summary')).toHaveTextContent('≈ 4.4 km • ~13 min')
    expect(globalThis.fetch).toHaveBeenCalledTimes(12)
  })

  it('uses road geometry when a pair exceeds the strict guard but passes the relaxed guard', async () => {
    const relaxedSegmentIndex = 2
    globalThis.fetch.mockImplementation((url) => {
      const pair = getPairFromUrl(url)
      const relaxedPair = pair[0][0] === Number(campusLoopStops[relaxedSegmentIndex].longitude)
        && pair[1][0] === Number(campusLoopStops[relaxedSegmentIndex + 1].longitude)
      return Promise.resolve(createRoadRouteResponse(url, {
        distanceMeters: relaxedPair ? 4000 : 1000,
      }))
    })
    renderMap()

    const expectedDistanceKm = campusLoopStops.slice(1).reduce((sum, _stop, index) => (
      sum + (index === relaxedSegmentIndex ? 4 : 1)
    ), 0)
    const expectedSummary = `≈ ${expectedDistanceKm.toFixed(1)} km • ~${Math.round((expectedDistanceKm / 20) * 60)} min`
    expect(await screen.findByText(expectedSummary)).toBeInTheDocument()

    const routeVertices = JSON.stringify(
      expectedRoadCoordinates(campusLoopStops)
        .map(([longitude, latitude]) => [latitude, longitude]),
    )
    const routeLines = screen.getAllByTestId('polyline')
    expectUniformBlueRouteLines(routeLines)
    routeLines.forEach((routeLine) => {
      expect(routeLine).toHaveAttribute('data-positions', routeVertices)
    })
    expect(screen.queryByText('Road routing unavailable - showing direct demo line.'))
      .not.toBeInTheDocument()

    const relaxedPairUrl = routeUrl(
      campusLoopStops[relaxedSegmentIndex],
      campusLoopStops[relaxedSegmentIndex + 1],
    )
    const requestedUrls = globalThis.fetch.mock.calls.map(([url]) => url)
    expect(requestedUrls.filter((url) => url === relaxedPairUrl)).toHaveLength(2)
    expect(globalThis.fetch).toHaveBeenCalledTimes(7)
  })

  it('falls back to a straight segment when a pair exceeds both detour guards', async () => {
    const detourSegmentIndex = 2
    globalThis.fetch.mockImplementation((url) => {
      const pair = getPairFromUrl(url)
      const detour = pair[0][0] === Number(campusLoopStops[detourSegmentIndex].longitude)
        && pair[1][0] === Number(campusLoopStops[detourSegmentIndex + 1].longitude)
      return Promise.resolve(createRoadRouteResponse(url, {
        distanceMeters: detour ? 100000 : 1000,
        detour,
      }))
    })
    renderMap()

    const expectedDistanceKm = campusLoopStops.slice(1).reduce((sum, stop, index) => (
      sum + (index === detourSegmentIndex
        ? haversineDistanceKm(campusLoopStops[index], stop)
        : 1)
    ), 0)
    const expectedSummary = `≈ ${expectedDistanceKm.toFixed(1)} km • ~${Math.round((expectedDistanceKm / 20) * 60)} min`
    expect(await screen.findByText(expectedSummary)).toBeInTheDocument()

    const routeVertices = JSON.stringify(
      expectedRoadCoordinates(campusLoopStops, detourSegmentIndex)
        .map(([longitude, latitude]) => [latitude, longitude]),
    )
    const routeLines = screen.getAllByTestId('polyline')
    expectUniformBlueRouteLines(routeLines)
    routeLines.forEach((routeLine) => {
      expect(routeLine).toHaveAttribute('data-positions', routeVertices)
    })
    expect(screen.queryByText('Road routing unavailable - showing direct demo line.'))
      .not.toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledTimes(7)
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