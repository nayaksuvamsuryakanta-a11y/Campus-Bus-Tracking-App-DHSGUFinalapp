import 'bootstrap/dist/css/bootstrap.min.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ChatWidget from './components/ChatWidget.jsx'
import AlertToaster from './components/AlertToaster.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import DriverPanelPage from './pages/DriverPanelPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LiveMapPage from './pages/LiveMapPage.jsx'
import PlacesPage from './pages/PlacesPage.jsx'
import RouteDetailsPage from './pages/RouteDetailsPage.jsx'
import RoutesPage from './pages/RoutesPage.jsx'
import { getStoredUserType, USER_LANDING_PATHS } from './config/userTypes.js'

function App() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={USER_LANDING_PATHS[getStoredUserType()]} replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/routes/:routeId" element={<RouteDetailsPage />} />
        <Route path="/live-map" element={<LiveMapPage />} />
        <Route path="/places" element={<PlacesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/driver-panel" element={<DriverPanelPage />} />
      </Routes>
      <Footer />
      <AlertToaster />
      <ChatWidget />
    </div>
  )
}

export default App
