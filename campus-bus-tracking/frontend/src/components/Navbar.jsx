import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { UNIVERSITY } from '../config/university.js'
import {
  getStoredUserType,
  USER_LANDING_PATHS,
  USER_TYPE_STORAGE_KEY,
  USER_TYPES,
} from '../config/userTypes.js'

const links = [
  { label: 'Home', to: '/home' },
  { label: 'Routes', to: '/routes' },
  { label: 'Live Map', to: '/live-map' },
  { label: 'Places', to: '/places' },
  { label: 'About DHSGU', to: '/about' },
  { label: 'Alerts', to: '/alerts' },
]

function Navbar() {
  const navigate = useNavigate()
  const [userType, setUserType] = useState(getStoredUserType)

  function handleUserTypeChange(event) {
    const nextUserType = event.target.value
    setUserType(nextUserType)
    window.localStorage.setItem(USER_TYPE_STORAGE_KEY, nextUserType)
    navigate(USER_LANDING_PATHS[nextUserType])
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <NavLink className="navbar-brand fw-semibold" to="/">
          {UNIVERSITY.shortName} Bus Tracker
        </NavLink>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#campusBusNavigation"
          aria-controls="campusBusNavigation"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="campusBusNavigation">
          <div className="navbar-nav ms-auto">
            {links.map((link) => (
              <NavLink
                key={link.to}
                className={({ isActive }) =>
                  `nav-link${isActive ? ' active' : ''}`
                }
                to={link.to}
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            ))}
            {userType === 'Driver' && (
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                to="/driver-panel"
              >
                Driver Panel
              </NavLink>
            )}
            <div className="d-flex align-items-center gap-2 ms-lg-3 py-2">
              <label className="small text-white text-nowrap mb-0" htmlFor="user-type">
                I am a:
              </label>
              <select
                className="form-select form-select-sm"
                id="user-type"
                value={userType}
                onChange={handleUserTypeChange}
                aria-label="Select user type"
              >
                {USER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar