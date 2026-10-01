import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '../components/StatusBadge.jsx'

describe('StatusBadge', () => {
  it.each([
    ['ON_TIME', 'ON TIME', 'bg-success'],
    ['DELAYED', 'DELAYED', 'bg-danger'],
    ['IN_TRANSIT', 'IN TRANSIT', 'bg-primary'],
    ['OFFLINE', 'OFFLINE', 'bg-secondary'],
  ])('maps %s to %s with %s', (status, label, bootstrapClass) => {
    render(<StatusBadge status={status} />)

    expect(screen.getByText(label)).toHaveClass('badge', bootstrapClass)
  })
})