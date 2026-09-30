import { NavLink } from 'react-router-dom'

const links = [
  { label: 'Home', to: '/' },
  { label: 'Routes', to: '/routes' },
  { label: 'Live Map', to: '/live-map' },
  { label: 'Alerts', to: '/alerts' },
  { label: 'Driver Panel', to: '/driver-panel' },
]

function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <NavLink className="navbar-brand fw-semibold" to="/">
          Campus Bus Tracker
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
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar