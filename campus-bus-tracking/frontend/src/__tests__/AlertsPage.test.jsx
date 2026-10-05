import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/alertService.js', () => ({ getAlerts: vi.fn() }))

import { getAlerts } from '../services/alertService.js'
import AlertsPage from '../pages/AlertsPage.jsx'

describe('AlertsPage', () => {
  beforeEach(() => {
    getAlerts.mockResolvedValue([
      { id: 1, title: 'Past route update', message: 'Earlier service update.', alert_type: 'ROUTE_CHANGE', is_active: 0 },
      { id: 2, title: 'Active delay', message: 'Bus service is delayed.', alert_type: 'DELAY', is_active: 1 },
      { id: 3, title: 'Campus emergency', message: 'Seek immediate help.', alert_type: 'EMERGENCY', is_active: 1 },
      { id: 4, title: 'General notice', message: 'General update.', alert_type: 'GENERAL', is_active: 1 },
    ])
  })

  it('defaults to active alerts and filters by status tab and type chip', async () => {
    render(<MemoryRouter><AlertsPage /></MemoryRouter>)

    await screen.findByText('Active delay')
    expect(screen.getByText('Active delay').closest('article')).toHaveClass('border-warning')
    expect(screen.queryByText('Past route update')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('tab', { name: 'Past' }))
    expect(await screen.findByText('Past route update')).toBeInTheDocument()
    expect(screen.queryByText('Active delay')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    fireEvent.click(screen.getByRole('button', { name: 'DELAY' }))
    expect(screen.getByText('Active delay')).toBeInTheDocument()
    expect(screen.queryByText('Past route update')).not.toBeInTheDocument()
    expect(screen.queryByText('Campus emergency')).not.toBeInTheDocument()
  })

  it('renders the emergency helpline as a telephone link', async () => {
    render(<MemoryRouter><AlertsPage /></MemoryRouter>)

    await screen.findByText('Campus emergency')
    expect(screen.getByRole('link', { name: '07582-265810' })).toHaveAttribute(
      'href',
      'tel:+917582265810',
    )
  })

  it('shows an empty message for each status tab', async () => {
    getAlerts.mockResolvedValue([])
    render(<MemoryRouter><AlertsPage /></MemoryRouter>)

    expect(await screen.findByText('There are no active alerts.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Past' }))
    expect(screen.getByText('There are no past alerts.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    expect(screen.getByText('There are no alerts to display.')).toBeInTheDocument()
  })

  it('renders the error state when alerts cannot be loaded', async () => {
    getAlerts.mockRejectedValue(new Error('offline'))

    render(<MemoryRouter><AlertsPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to load alerts'))
  })
})