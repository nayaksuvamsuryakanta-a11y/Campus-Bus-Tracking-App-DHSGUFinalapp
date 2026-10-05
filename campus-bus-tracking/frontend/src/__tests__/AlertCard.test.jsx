import { render, screen } from '@testing-library/react'
import AlertCard from '../components/AlertCard.jsx'

const baseAlert = {
  id: 1,
  title: 'Bus delayed',
  message: 'The shuttle is running late.',
  alert_type: 'DELAY',
  is_active: 1,
}

it('shows a date for older alerts and preserves the UTC datetime attribute', () => {
  render(<AlertCard alert={{ ...baseAlert, created_at: '2025-01-01 06:30:00' }} />)

  expect(screen.getByText('1 Jan 2025')).toBeInTheDocument()
  expect(screen.getByText('1 Jan 2025').closest('time')).toHaveAttribute(
    'dateTime',
    '2025-01-01T06:30:00.000Z',
  )
})

it.each([null, 'not-a-date'])('shows unavailable time for %s timestamps', (createdAt) => {
  render(<AlertCard alert={{ ...baseAlert, created_at: createdAt }} />)

  expect(screen.getByText('Time unavailable')).toBeInTheDocument()
})