import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import AlertBanner from '../components/AlertBanner.jsx'

describe('AlertBanner', () => {
  it('uses the danger variant for delay alerts', () => {
    render(
      <AlertBanner
        title="Bus delayed"
        message="The bus is running late."
        alertType="DELAY"
      />,
    )

    expect(screen.getByRole('alert')).toHaveClass('alert-danger')
  })

  it('uses the warning variant for route changes', () => {
    render(
      <AlertBanner
        title="Route changed"
        message="The route has changed."
        alertType="ROUTE_CHANGE"
      />,
    )

    expect(screen.getByRole('alert')).toHaveClass('alert-warning')
  })
})