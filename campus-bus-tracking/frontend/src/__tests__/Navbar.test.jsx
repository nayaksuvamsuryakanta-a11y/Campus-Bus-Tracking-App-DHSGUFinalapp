import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )
}

it('renders the brand and public navigation links', () => {
  renderNavbar()

  expect(screen.getByRole('link', { name: 'DHSGU Bus Tracker' })).toBeInTheDocument()
  for (const label of ['Home', 'Routes', 'Live Map', 'Places', 'About DHSGU', 'Alerts']) {
    expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
  }
  expect(screen.queryByRole('link', { name: 'Driver Panel' })).not.toBeInTheDocument()
})

it('shows the Driver Panel link only for the stored Driver user type', () => {
  localStorage.setItem('dhsgu-user-type', 'Driver')

  renderNavbar()

  expect(screen.getByRole('link', { name: 'Driver Panel' })).toBeInTheDocument()
})