import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('../services/universityService.js', () => ({ getUniversity: vi.fn() }))

import { getUniversity } from '../services/universityService.js'
import AboutPage from '../pages/AboutPage.jsx'

beforeEach(() => {
  getUniversity.mockResolvedValue({
    name_english: 'Dr. Harisingh Gour Vishwavidyalaya',
    also_known_as: 'Sagar University from API',
    distance_sagar_bus_stand: 'Three kilometres from API.',
    distance_saugor_railway_station: 'Four kilometres from API.',
    distance_dhana_airport: 'Thirteen kilometres from API.',
  })
})

it('renders university facts and How to reach distances from the service', async () => {
  render(<MemoryRouter><AboutPage /></MemoryRouter>)

  expect(await screen.findByText('Sagar University from API')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'How to reach' })).toBeInTheDocument()
  expect(screen.getByText('Three kilometres from API.')).toBeInTheDocument()
  expect(screen.getByText('Four kilometres from API.')).toBeInTheDocument()
  expect(screen.getByText('Thirteen kilometres from API.')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Campus Security' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '07582-265810' })).toHaveAttribute(
    'href',
    'tel:+917582265810',
  )
})