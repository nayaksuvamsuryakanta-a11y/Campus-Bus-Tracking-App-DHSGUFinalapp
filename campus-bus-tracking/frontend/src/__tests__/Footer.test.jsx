import { render, screen } from '@testing-library/react'
import Footer from '../components/Footer.jsx'

it('renders the demonstration-data disclaimer', () => {
  render(<Footer />)

  expect(screen.getByText(/demonstration data, not official DHSGU vehicle tracking/i))
    .toBeInTheDocument()
})