import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/alertService.js', () => ({
  createAlert: vi.fn(),
  deactivateAlert: vi.fn(),
  getAlerts: vi.fn(),
}))
vi.mock('../services/busService.js', () => ({
  getBuses: vi.fn(),
  updateBusLocation: vi.fn(),
  updateBusStatus: vi.fn(),
}))
vi.mock('../services/geolocationService.js', () => ({ getCurrentPosition: vi.fn() }))
vi.mock('../services/gpsRecorderService.js', () => ({
  start: vi.fn(),
  stop: vi.fn(),
  totalDistanceMetres: vi.fn(),
}))
vi.mock('react-leaflet', async () => {
  const { createReactLeafletMock } = await import('./helpers.js')
  return createReactLeafletMock()
})

import { createAlert, deactivateAlert, getAlerts } from '../services/alertService.js'
import { getBuses, updateBusLocation, updateBusStatus } from '../services/busService.js'
import {
  start as startGpsRecording,
  stop as stopGpsRecording,
  totalDistanceMetres,
} from '../services/gpsRecorderService.js'
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
    deactivateAlert.mockResolvedValue({ id: 7, is_active: 0 })
    getAlerts.mockResolvedValue([])
    startGpsRecording.mockReturnValue(true)
    stopGpsRecording.mockReturnValue([])
    totalDistanceMetres.mockReturnValue(0)
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

  it('shows a live GPS trace and exports the stopped coordinates', async () => {
    const user = userEvent.setup()
    const coordinates = [[23.820406, 78.770011], [23.820496, 78.770011]]
    const clipboardWrite = vi.fn().mockResolvedValue(undefined)
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite },
    })
    let onGpsPoint
    startGpsRecording.mockImplementation((onPoint) => {
      onGpsPoint = onPoint
      return true
    })
    stopGpsRecording.mockReturnValue(coordinates)
    totalDistanceMetres.mockReturnValue(10)
    sessionStorage.setItem('dhsgu-driver-unlocked', 'true')
    renderDriverPanel()
    await screen.findByRole('heading', { name: 'Driver panel' })

    await user.click(screen.getByRole('button', { name: 'Start recording' }))
    expect(startGpsRecording).toHaveBeenCalledWith(expect.any(Function), expect.any(Function))
    await act(async () => {
      onGpsPoint({ latitude: coordinates[0][0], longitude: coordinates[0][1] })
      onGpsPoint({ latitude: coordinates[1][0], longitude: coordinates[1][1] })
    })
    expect(screen.getByRole('status')).toHaveTextContent('Points kept: 2 · Distance: 10.0 m')
    expect(screen.getByTestId('polyline')).toHaveAttribute(
      'data-path-options',
      JSON.stringify({ color: '#34a853', weight: 5, lineCap: 'round', lineJoin: 'round' }),
    )
    expect(screen.getByTestId('circle-marker')).toHaveAttribute(
      'data-center',
      JSON.stringify(coordinates[1]),
    )

    await user.click(screen.getByRole('button', { name: 'Stop recording' }))
    expect(stopGpsRecording).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Copy coordinates' }))
    expect(clipboardWrite).toHaveBeenCalledWith(JSON.stringify(coordinates))
    expect(screen.getByText('Coordinates copied.')).toBeInTheDocument()

    const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const createObjectURL = vi.fn(() => 'blob:route-trace')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    let downloadedName = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function recordDownload() {
      downloadedName = this.download
    })
    await user.click(screen.getByRole('button', { name: 'Download JSON' }))
    expect(downloadedName).toBe('route-trace.json')
    expect(createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: 'application/json' }))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:route-trace')
    const downloadBlob = createObjectURL.mock.calls[0][0]
    const downloadText = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsText(downloadBlob)
    })
    expect(JSON.parse(downloadText)).toEqual(coordinates)

    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard)
    } else {
      delete navigator.clipboard
    }
    if (createObjectUrlDescriptor) {
      Object.defineProperty(URL, 'createObjectURL', createObjectUrlDescriptor)
    } else {
      delete URL.createObjectURL
    }
    if (revokeObjectUrlDescriptor) {
      Object.defineProperty(URL, 'revokeObjectURL', revokeObjectUrlDescriptor)
    } else {
      delete URL.revokeObjectURL
    }
  })

  it.each([
    'Location permission was denied. Allow location access and try again.',
    'GPS location is unavailable. Check the device location settings and try again.',
  ])('shows GPS failure inline without leaving recording active', async (errorMessage) => {
    sessionStorage.setItem('dhsgu-driver-unlocked', 'true')
    startGpsRecording.mockImplementation((_onPoint, onError) => {
      onError(errorMessage, true)
      return false
    })
    renderDriverPanel()
    await screen.findByRole('heading', { name: 'Driver panel' })

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(errorMessage)
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
  })

  it('deactivates an active alert, refreshes the list, and confirms inline', async () => {
    const user = userEvent.setup()
    getAlerts
      .mockResolvedValueOnce([{
        id: 7,
        title: 'Campus emergency',
        message: 'Contact security.',
        alert_type: 'EMERGENCY',
        is_active: 1,
      }])
      .mockResolvedValueOnce([])
    sessionStorage.setItem('dhsgu-driver-unlocked', 'true')
    renderDriverPanel()
    await screen.findByRole('heading', { name: 'Driver panel' })
    expect(await screen.findByText('Campus emergency')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Deactivate Campus emergency' }))

    expect(deactivateAlert).toHaveBeenCalledWith(7)
    expect(await screen.findByText('Alert deactivated successfully.')).toBeInTheDocument()
    expect(screen.queryByText('Campus emergency')).not.toBeInTheDocument()
    expect(getAlerts).toHaveBeenCalledTimes(2)
  })
})