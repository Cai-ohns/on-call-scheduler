import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import StaffForm from './components/StaffForm'
import ScheduleCalendar from './components/ScheduleCalendar'
import RosterManagement from './components/RosterManagement'
import './App.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<SchedulePage />} />
          <Route path="/roster" element={<RosterManagement />} />
        </Routes>
      </div>
    </Router>
  )
}

function Navigation() {
  const location = useLocation()
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">OHNS On-Call Scheduler</h1>
            <p className="text-sm text-gray-600 mt-1">Generate fair on call schedules for OHNS residents</p>
          </div>
          <nav className="flex gap-4">
            <Link
              to="/"
              className={`px-4 py-2 rounded-md font-medium transition ${
                location.pathname === '/'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Schedule
            </Link>
            <Link
              to="/roster"
              className={`px-4 py-2 rounded-md font-medium transition ${
                location.pathname === '/roster'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Manage Residents
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

function SchedulePage() {
  const [scheduleData, setScheduleData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastRequestData, setLastRequestData] = useState(null)

  const handleScheduleGenerated = (data, requestData) => {
    setScheduleData(data)
    setError(null)
    if (requestData) {
      setLastRequestData(requestData)
    }
  }

  const handleError = (err) => {
    setError(err)
    setScheduleData(null)
  }

  const handleRegenerate = async () => {
    if (!lastRequestData) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Add a new random seed each time to ensure different schedules
      const requestWithSeed = {
        ...lastRequestData,
        random_seed: Math.floor(Math.random() * (2**31 - 1))
      }
      
      const response = await axios.post('http://localhost:8000/api/schedule/generate', requestWithSeed)
      setScheduleData(response.data)
      // Update lastRequestData to include the seed for consistency
      setLastRequestData(requestWithSeed)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to regenerate schedule'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {scheduleData && scheduleData.status === 'success' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <StaffForm
              onScheduleGenerated={handleScheduleGenerated}
              onError={handleError}
              loading={loading}
              setLoading={setLoading}
            />
            <div>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              )}
            </div>
          </div>
          <ScheduleCalendar 
            scheduleData={scheduleData} 
            onRegenerate={handleRegenerate}
            isRegenerating={loading}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <StaffForm
              onScheduleGenerated={handleScheduleGenerated}
              onError={handleError}
              loading={loading}
              setLoading={setLoading}
            />
          </div>
          
          <div>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            )}
            
            {scheduleData && scheduleData.status === 'error' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">Schedule Generation Failed</p>
                <p className="text-yellow-600 text-sm mt-1">
                  {scheduleData.message || 'Could not generate a valid schedule with the given constraints.'}
                </p>
              </div>
            )}
            
            {!scheduleData && !error && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                <p className="text-lg mb-2">No schedule generated yet</p>
                <p className="text-sm">Fill out the form and click "Generate Schedule" to create a schedule</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default App
