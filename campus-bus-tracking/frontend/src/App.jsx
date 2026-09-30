import 'bootstrap/dist/css/bootstrap.min.css'
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import DriverPanelPage from './pages/DriverPanelPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LiveMapPage from './pages/LiveMapPage.jsx'
import RouteDetailsPage from './pages/RouteDetailsPage.jsx'
import RoutesPage from './pages/RoutesPage.jsx'

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/routes/:routeId" element={<RouteDetailsPage />} />
        <Route path="/live-map" element={<LiveMapPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/driver-panel" element={<DriverPanelPage />} />
      </Routes>
    </>
  )
}

export default App
