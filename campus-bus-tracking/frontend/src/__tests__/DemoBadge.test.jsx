import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import DemoBadge from '../components/DemoBadge.jsx'

describe('DemoBadge', () => {
  it('renders for an unverified record', () => {
    render(<DemoBadge isVerified={0} />)

    expect(screen.getByText('Demo data - not official')).toBeInTheDocument()
  })

  it('is hidden for a verified record', () => {
    const { container } = render(<DemoBadge isVerified={1} />)

    expect(container.firstChild).toBeNull()
  })
})