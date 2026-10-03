import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/placeService.js', () => ({ getPlaces: vi.fn() }))

import { getPlaces } from '../services/placeService.js'
import PlacesPage from '../pages/PlacesPage.jsx'

const places = [
  { id: 3, name: 'Jawaharlal Nehru Central Library', category: 'LIBRARY', latitude: 23.8276, longitude: 78.7708, description: 'Library building', is_verified: 0 },
  { id: 4, name: 'Rani Laxmi Bai Girls Hostel', category: 'HOSTEL', latitude: 23.8306, longitude: 78.7817, description: 'Girls hostel', is_verified: 0 },
  { id: 5, name: 'Vivekanand Boys Hostel', category: 'HOSTEL', latitude: 23.8239, longitude: 78.7700, description: 'Boys hostel', is_verified: 0 },
  { id: 6, name: 'Valley Campus', category: 'OTHER', latitude: 23.8241, longitude: 78.7816, description: 'Valley Campus', is_verified: 0 },
  { id: 7, name: 'Department of Computer Science and Applications', category: 'ACADEMIC', latitude: 23.8241, longitude: 78.7820, description: 'Academic department', is_verified: 0 },
]

describe('PlacesPage', () => {
  beforeEach(() => {
    getPlaces.mockImplementation((category) => Promise.resolve(
      category ? places.filter((place) => place.category === category) : places,
    ))
  })

  it('shows a DemoBadge for unverified places and filters by category', async () => {
    render(<MemoryRouter><PlacesPage /></MemoryRouter>)

    await screen.findByText('Jawaharlal Nehru Central Library')
    expect(screen.getAllByText('Demo data - not official')).toHaveLength(5)
    expect(screen.getAllByRole('link', { name: 'Show on map' })).toHaveLength(5)

    fireEvent.click(screen.getByRole('button', { name: 'LIBRARY' }))

    await waitFor(() => expect(getPlaces).toHaveBeenLastCalledWith('LIBRARY'))
    expect(await screen.findByText('Jawaharlal Nehru Central Library')).toBeInTheDocument()
    expect(screen.queryByText('Rani Laxmi Bai Girls Hostel')).not.toBeInTheDocument()
  })

  it('links a place to its matching map query parameter', async () => {
    render(
      <MemoryRouter initialEntries={['/places']}>
        <Routes>
          <Route path="/places" element={<PlacesPage />} />
          <Route path="/live-map" element={<p>Map target: {window.location.search}</p>} />
        </Routes>
      </MemoryRouter>,
    )

    const mapLink = await screen.findAllByRole('link', { name: 'Show on map' })
    expect(mapLink[0]).toHaveAttribute('href', '/live-map?place=3')
  })
})