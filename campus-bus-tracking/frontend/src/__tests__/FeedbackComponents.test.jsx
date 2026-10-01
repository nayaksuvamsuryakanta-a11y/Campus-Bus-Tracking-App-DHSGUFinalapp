import { render, screen } from '@testing-library/react'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'

it('renders the loader label with the status role', () => {
  render(<Loader label="Loading route data" />)

  expect(screen.getByRole('status')).toHaveClass('d-flex', 'justify-content-center')
  expect(screen.getByText('Loading route data')).toBeInTheDocument()
})

it('renders the error message with Bootstrap danger styling', () => {
  render(<ErrorMessage message="Unable to load routes." />)

  expect(screen.getByRole('alert')).toHaveClass('alert', 'alert-danger')
  expect(screen.getByText('Unable to load routes.')).toBeInTheDocument()
})