import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/alertService.js', () => ({ getAlerts: vi.fn() }))

import { getAlerts } from '../services/alertService.js'
import AlertsPage from '../pages/AlertsPage.jsx'

describe('AlertsPage', () => {
  beforeEach(() => {
    getAlerts.mockResolvedValue([
      { id: 1, title: 'Inactive notice', message: 'Earlier service update.', alert_type: 'GENERAL', is_active: 0 },
      { id: 2, title: 'Active delay', message: 'Bus service is delayed.', alert_type: 'DELAY', is_active: 1 },
    ])
  })

  it('lists alerts and visually distinguishes active alerts', async () => {
    render(<MemoryRouter><AlertsPage /></MemoryRouter>)

    await screen.findByText('Active delay')
    expect(screen.getByText('Active').closest('article')).toHaveClass('border-warning')
    expect(screen.getByText('Inactive').closest('article')).toHaveClass('border-secondary-subtle')
  })

  it('renders the error state when alerts cannot be loaded', async () => {
    getAlerts.mockRejectedValue(new Error('offline'))

    render(<MemoryRouter><AlertsPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to load alerts'))
  })
})