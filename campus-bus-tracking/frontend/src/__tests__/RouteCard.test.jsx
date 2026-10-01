import { render, screen } from '@testing-library/react'
import RouteCard from '../components/RouteCard.jsx'
import { UNIVERSITY } from '../config/university.js'

it('renders route fields and its provided description', () => {
  render(
    <RouteCard
      route={{
        route_name: 'Library Shuttle',
        description: 'Connects the hostels to the library.',
        start_time: '08:00',
        end_time: '18:00',
        is_verified: 1,
      }}
      onClick={() => {}}
    />,
  )

  expect(screen.getByText('Library Shuttle')).toBeInTheDocument()
  expect(screen.getByText('Connects the hostels to the library.')).toBeInTheDocument()
  expect(screen.getByText('Starts').parentElement).toHaveTextContent('08:00')
  expect(screen.getByText('Ends').parentElement).toHaveTextContent('18:00')
})

it('uses the university demo fallback when the description is missing', () => {
  render(
    <RouteCard
      route={{ route_name: 'Campus Loop', start_time: '07:00', end_time: '20:00' }}
      onClick={() => {}}
    />,
  )

  expect(screen.getByText(`${UNIVERSITY.shortName} demo route; details are not official.`))
    .toBeInTheDocument()
})