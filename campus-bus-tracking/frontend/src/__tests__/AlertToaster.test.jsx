import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/alertService.js', () => ({ getAlerts: vi.fn() }))

import { getAlerts } from '../services/alertService.js'
import AlertToaster from '../components/AlertToaster.jsx'

const existingAlert = {
  id: 1,
  title: 'Existing active alert',
  alert_type: 'DELAY',
  is_active: 1,
}

describe('AlertToaster', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getAlerts.mockReset()
    getAlerts.mockResolvedValue([])
  })

  it('does not toast the initial snapshot, then times normal toasts and persists emergency toasts', async () => {
    getAlerts
      .mockResolvedValueOnce([existingAlert])
      .mockResolvedValueOnce([
        existingAlert,
        { id: 2, title: 'New delay', alert_type: 'DELAY', is_active: 1 },
        { id: 3, title: 'Emergency notice', alert_type: 'EMERGENCY', is_active: 1 },
      ])
    render(<AlertToaster />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(screen.getByText('New delay')).toBeInTheDocument()
    expect(screen.getByText('Emergency notice')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '07582-265810' })).toHaveAttribute(
      'href',
      'tel:+917582265810',
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000)
    })
    expect(screen.queryByText('New delay')).not.toBeInTheDocument()
    expect(screen.getByText('Emergency notice')).toBeInTheDocument()
  })
})