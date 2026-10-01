import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/busService.js', () => ({ getRouteDetails: vi.fn() }))

import { getRouteDetails } from '../services/busService.js'
import RouteDetailsPage from '../pages/RouteDetailsPage.jsx'

function renderRouteDetails() {
  return render(
    <MemoryRouter initialEntries={['/routes/12']}>
      <Routes>
        <Route path="/routes/:routeId" element={<RouteDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RouteDetailsPage', () => {
  beforeEach(() => {
    getRouteDetails.mockResolvedValue({
      id: 12,
      route_name: 'Academic Shuttle',
      description: 'Connects academic buildings.',
      start_time: '09:00',
      end_time: '17:00',
      is_verified: 1,
      stops: [
        { id: 4, stop_name: 'Central Library', arrival_time: '09:10', departure_time: '09:12' },
        { id: 5, stop_name: 'Science Block', arrival_time: '09:20', departure_time: '09:22' },
      ],
    })
  })

  it('renders the route stops table using the route parameter', async () => {
    renderRouteDetails()

    expect(await screen.findByRole('heading', { name: 'Academic Shuttle' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    const stopRow = screen.getByRole('row', { name: /Central Library/ })
    expect(within(stopRow).getByText('09:10')).toBeInTheDocument()
    expect(within(stopRow).getByText('09:12')).toBeInTheDocument()
    expect(getRouteDetails).toHaveBeenCalledWith('12')
  })

  it('renders the service error state', async () => {
    getRouteDetails.mockRejectedValue(new Error('offline'))

    renderRouteDetails()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to load route details')
    })
  })
})