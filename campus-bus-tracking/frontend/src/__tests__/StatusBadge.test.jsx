import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '../components/StatusBadge.jsx'

describe('StatusBadge', () => {
  it('uses the Bootstrap danger variant for delayed buses', () => {
    render(<StatusBadge status="DELAYED" />)

    expect(screen.getByText('DELAYED')).toHaveClass('badge', 'bg-danger')
  })
})