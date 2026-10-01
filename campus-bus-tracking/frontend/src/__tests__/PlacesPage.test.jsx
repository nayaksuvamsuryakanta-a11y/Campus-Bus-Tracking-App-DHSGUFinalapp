import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/placeService.js', () => ({ getPlaces: vi.fn() }))

import { getPlaces } from '../services/placeService.js'
import PlacesPage from '../pages/PlacesPage.jsx'

const places = [
  { id: 3, name: 'Central Library', category: 'LIBRARY', description: 'Library building', is_verified: 0 },
  { id: 4, name: 'Science Block', category: 'ACADEMIC', description: 'Academic building', is_verified: 1 },
]

describe('PlacesPage', () => {
  beforeEach(() => {
    getPlaces.mockImplementation((category) => Promise.resolve(
      category ? places.filter((place) => place.category === category) : places,
    ))
  })

  it('shows a DemoBadge for unverified places and filters by category', async () => {
    render(<MemoryRouter><PlacesPage /></MemoryRouter>)

    await screen.findByText('Central Library')
    expect(screen.getByText('Demo data - not official')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Show on map' })).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'LIBRARY' }))

    await waitFor(() => expect(getPlaces).toHaveBeenLastCalledWith('LIBRARY'))
    expect(await screen.findByText('Central Library')).toBeInTheDocument()
    expect(screen.queryByText('Science Block')).not.toBeInTheDocument()
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