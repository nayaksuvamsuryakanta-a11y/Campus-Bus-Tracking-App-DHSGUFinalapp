import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import AlertBanner from '../components/AlertBanner.jsx'

describe('AlertBanner', () => {
  it.each([
    ['DELAY', 'danger'],
    ['CANCELLATION', 'danger'],
    ['ROUTE_CHANGE', 'warning'],
    ['GENERAL', 'info'],
  ])('maps %s alerts to the Bootstrap %s variant', (alertType, variant) => {
    render(
      <AlertBanner
        title={`${alertType} notice`}
        message="Service update."
        alertType={alertType}
      />,
    )

    expect(screen.getByRole('alert')).toHaveClass(`alert-${variant}`)
  })
})