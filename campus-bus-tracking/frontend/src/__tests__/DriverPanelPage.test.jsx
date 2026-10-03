import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/alertService.js', () => ({ createAlert: vi.fn() }))
vi.mock('../services/busService.js', () => ({
  getBuses: vi.fn(),
  updateBusLocation: vi.fn(),
  updateBusStatus: vi.fn(),
}))
vi.mock('../services/geolocationService.js', () => ({ getCurrentPosition: vi.fn() }))

import { createAlert } from '../services/alertService.js'
import { getBuses, updateBusLocation, updateBusStatus } from '../services/busService.js'
import DriverPanelPage from '../pages/DriverPanelPage.jsx'

const buses = [{
  id: 101,
  bus_number: 'BUS-101',
  route_name: 'Campus Circle Route (DEMO)',
  status: 'ON_TIME',
  latitude: 23.8204050,
  longitude: 78.7700109,
  is_verified: 0,
}]

function renderDriverPanel() {
  return render(<MemoryRouter><DriverPanelPage /></MemoryRouter>)
}

describe('DriverPanelPage', () => {
  beforeEach(() => {
    getBuses.mockResolvedValue(buses)
    updateBusLocation.mockResolvedValue({
      message: 'Location updated successfully',
      latitude: 23.8276,
      longitude: 78.7708,
      updated_at: '2026-10-01 12:00:00',
    })
    updateBusStatus.mockResolvedValue({
      message: 'Bus status updated successfully',
      status: 'DELAYED',
    })
    createAlert.mockResolvedValue({ message: 'Alert created successfully' })
  })

  it('shows the PIN gate, stores the entered PIN, and loads the panel after unlock', async () => {
    const user = userEvent.setup()
    renderDriverPanel()

    expect(screen.getByRole('heading', { name: 'Driver panel access' })).toBeInTheDocument()
    expect(getBuses).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Driver PIN'), '4321')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'Driver panel' })).toBeInTheDocument()
    expect(sessionStorage.getItem('dhsgu-driver-pin')).toBe('4321')
    expect(sessionStorage.getItem('dhsgu-driver-unlocked')).toBe('true')
    expect(getBuses).toHaveBeenCalledTimes(1)
  })

  it('submits location, status, and alert values and displays success feedback', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('dhsgu-driver-unlocked', 'true')
    renderDriverPanel()
    await screen.findByRole('heading', { name: 'Driver panel' })

    await user.clear(screen.getByLabelText('Latitude'))
    await user.type(screen.getByLabelText('Latitude'), '23.8276')
    await user.clear(screen.getByLabelText('Longitude'))
    await user.type(screen.getByLabelText('Longitude'), '78.7708')
    await user.click(screen.getByRole('button', { name: 'Update Location' }))
    expect(updateBusLocation).toHaveBeenCalledWith(101, 23.8276, 78.7708)
    expect(await screen.findByText('Location updated successfully')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Bus status'), 'DELAYED')
    await user.click(screen.getByRole('button', { name: 'Update Status' }))
    expect(updateBusStatus).toHaveBeenCalledWith(101, 'DELAYED')
    expect(await screen.findByText('Bus status updated successfully')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Title'), 'Library shuttle delay')
    await user.selectOptions(screen.getByLabelText('Alert type'), 'ROUTE_CHANGE')
    await user.type(screen.getByLabelText('Message'), 'Use the north entrance.')
    await user.click(screen.getByRole('button', { name: 'Broadcast Alert' }))
    expect(createAlert).toHaveBeenCalledWith(
      'Library shuttle delay',
      'Use the north entrance.',
      'ROUTE_CHANGE',
      true,
    )
    expect(await screen.findByText('Alert created successfully')).toBeInTheDocument()
  })

  it('disables an update while it is pending and ignores duplicate submissions', async () => {
    const user = userEvent.setup()
    let resolveUpdate
    updateBusLocation.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve }))
    sessionStorage.setItem('dhsgu-driver-unlocked', 'true')
    renderDriverPanel()
    await screen.findByRole('heading', { name: 'Driver panel' })

    const locationButton = screen.getByRole('button', { name: 'Update Location' })
    await user.click(locationButton)
    await waitFor(() => expect(locationButton).toBeDisabled())
    fireEvent.click(locationButton)
    expect(updateBusLocation).toHaveBeenCalledTimes(1)

    resolveUpdate({
      message: 'Location updated successfully',
      latitude: 23.8276,
      longitude: 78.7708,
      updated_at: '2026-10-01 12:00:00',
    })
    expect(await screen.findByText('Location updated successfully')).toBeInTheDocument()
  })
})