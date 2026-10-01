import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('../services/busService.js', () => ({ getRoutes: vi.fn() }))

import { getRoutes } from '../services/busService.js'
import RoutesPage from '../pages/RoutesPage.jsx'

beforeEach(() => {
  getRoutes.mockResolvedValue([
    { id: 9, route_name: 'Library Loop', start_time: '08:00', end_time: '18:00' },
    { id: 10, route_name: 'Hostel Shuttle', start_time: '07:00', end_time: '20:00' },
  ])
})

it('renders one card per route and navigates when a card is clicked', async () => {
  render(
    <MemoryRouter initialEntries={['/routes']}>
      <Routes>
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/routes/:routeId" element={<p>Route details destination</p>} />
      </Routes>
    </MemoryRouter>,
  )

  const libraryRoute = await screen.findByRole('button', { name: /Library Loop/ })
  expect(screen.getByRole('button', { name: /Hostel Shuttle/ })).toBeInTheDocument()
  expect(screen.getAllByRole('button').filter((button) => button.classList.contains('card')))
    .toHaveLength(2)

  fireEvent.click(libraryRoute)

  expect(await screen.findByText('Route details destination')).toBeInTheDocument()
})