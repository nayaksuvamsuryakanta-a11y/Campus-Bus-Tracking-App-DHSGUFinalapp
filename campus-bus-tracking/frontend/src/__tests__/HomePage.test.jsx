import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/alertService.js', () => ({ getAlerts: vi.fn() }))
vi.mock('../services/busService.js', () => ({ getBuses: vi.fn(), getRoutes: vi.fn() }))

import { getAlerts } from '../services/alertService.js'
import { getBuses, getRoutes } from '../services/busService.js'
import HomePage from '../pages/HomePage.jsx'

const activeAlerts = [
  { id: 1, title: 'First delay', message: 'Bus 1 is delayed.', alert_type: 'DELAY', is_active: 1 },
  { id: 2, title: 'Later notice', message: 'Another notice.', alert_type: 'GENERAL', is_active: 1 },
  { id: 3, title: 'Closed notice', message: 'This is inactive.', alert_type: 'GENERAL', is_active: 0 },
]

function renderPage() {
  return render(<MemoryRouter><HomePage /></MemoryRouter>)
}

describe('HomePage', () => {
  beforeEach(() => {
    getRoutes.mockResolvedValue([{ id: 1 }, { id: 2 }])
    getBuses.mockResolvedValue([
      { id: 1, status: 'DELAYED' },
      { id: 2, status: 'ON_TIME' },
      { id: 3, status: 'DELAYED' },
    ])
    getAlerts.mockResolvedValue(activeAlerts)
  })

  it('shows summary counts and the first active alert with its variant', async () => {
    renderPage()

    await screen.findByText('First delay')
    expect(screen.getByText('Total Routes').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Total Buses').nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Active Alerts').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Delayed Buses').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByRole('alert')).toHaveClass('alert-danger')
    expect(screen.queryByText('Later notice')).not.toBeInTheDocument()
  })

  it('renders its loading state while requests are pending', () => {
    getRoutes.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading data')
  })

  it('renders an error state when a summary request fails', async () => {
    getRoutes.mockRejectedValue(new Error('offline'))

    renderPage()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to reach'))
  })
})