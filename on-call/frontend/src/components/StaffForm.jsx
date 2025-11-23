import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from '../supabaseClient'

const StaffForm = ({ onScheduleGenerated, onError, loading, setLoading }) => {
  const [rosterStaff, setRosterStaff] = useState([])
  const [selectedStaff, setSelectedStaff] = useState({}) // { staffId: { unavailableDays: [], targetShifts: number } }
  const [startDate, setStartDate] = useState('')
  const [numDays, setNumDays] = useState(28)
  const [fetchingStaff, setFetchingStaff] = useState(true)

  useEffect(() => {
    fetchRosterStaff()
  }, [])

  const fetchRosterStaff = async () => {
    try {
      setFetchingStaff(true)
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name')
      
      if (error) throw error
      setRosterStaff(data)
      
      // Initialize selected staff with default values
      const initialSelected = {}
      data.forEach(staff => {
        initialSelected[staff.id] = {
          unavailableDays: [],
          targetShifts: staff.default_target_shifts
        }
      })
      setSelectedStaff(initialSelected)
    } catch (err) {
      console.error('Error fetching staff:', err)
      onError('Failed to load staff roster. Please ensure staff members are added in the Manage Residents page.')
    } finally {
      setFetchingStaff(false)
    }
  }

  const toggleStaffSelection = (staffId) => {
    setSelectedStaff(prev => {
      const newSelected = { ...prev }
      if (newSelected[staffId]) {
        delete newSelected[staffId]
      } else {
        const staff = rosterStaff.find(s => s.id === staffId)
        newSelected[staffId] = {
          unavailableDays: [],
          targetShifts: staff.default_target_shifts
        }
      }
      return newSelected
    })
  }

  const updateSelectedStaff = (staffId, field, value) => {
    setSelectedStaff(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }))
  }

  const handleUnavailableDaysChange = (staffId, dates) => {
    if (!dates) {
      updateSelectedStaff(staffId, 'unavailableDays', [])
      return
    }
    
    const dateArray = Array.isArray(dates) ? dates : [dates]
    const dateStrings = dateArray
      .filter(date => date instanceof Date && !isNaN(date.getTime()))
      .map(date => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      })
      .filter((date, idx, arr) => arr.indexOf(date) === idx)
    
    updateSelectedStaff(staffId, 'unavailableDays', dateStrings)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    onError(null)

    // Validate form
    if (!startDate) {
      onError('Please select a start date')
      setLoading(false)
      return
    }

    const selectedIds = Object.keys(selectedStaff)
    if (selectedIds.length < 2) {
      onError('At least 2 staff members must be selected')
      setLoading(false)
      return
    }

    // Validate roles
    const selectedStaffMembers = selectedIds.map(id => {
      const staff = rosterStaff.find(s => s.id === parseInt(id))
      return { ...staff, ...selectedStaff[id] }
    })

    const hasJunior = selectedStaffMembers.some(s => s.role === 'Junior')
    const hasSenior = selectedStaffMembers.some(s => s.role === 'Senior')
    
    if (hasJunior && !hasSenior) {
      onError('At least one Senior staff member must be selected when Junior staff are present')
      setLoading(false)
      return
    }

    // Prepare request
    const requestData = {
      staff: selectedStaffMembers.map(s => ({
        name: s.name,
        role: s.role,
        target_shifts: s.targetShifts,
        unavailable_days: s.unavailableDays || []
      })),
      start_date: startDate,
      num_days: numDays
    }

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const response = await axios.post(`${API_URL}/api/schedule/generate`, requestData)
      onScheduleGenerated(response.data, requestData)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate schedule'
      onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getMinDate = () => {
    return startDate ? new Date(startDate) : null
  }

  const getMaxDate = () => {
    if (!startDate) return null
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + numDays - 1)
    return end
  }

  const getSelectedDates = (staffId) => {
    const staff = selectedStaff[staffId]
    if (!staff || !staff.unavailableDays || staff.unavailableDays.length === 0) return []
    return staff.unavailableDays
      .map(dateStr => {
        const date = new Date(dateStr + 'T00:00:00')
        return isNaN(date.getTime()) ? null : date
      })
      .filter(date => date !== null)
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'Senior':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'Intermediate':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'Junior':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (fetchingStaff) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading staff roster...</p>
        </div>
      </div>
    )
  }

  if (rosterStaff.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <p className="text-lg text-gray-800 mb-2">No staff members in roster</p>
          <p className="text-sm text-gray-600 mb-4">Add staff members in the "Manage Staff" page first</p>
          <Link
            to="/roster"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Go to Manage Staff
          </Link>
        </div>
      </div>
    )
  }

  const selectedCount = Object.keys(selectedStaff).length

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Schedule Configuration</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Schedule Period */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Days
            </label>
            <input
              type="number"
              value={numDays}
              onChange={(e) => setNumDays(parseInt(e.target.value) || 28)}
              min="7"
              max="90"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Staff Selection */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              Select Staff ({selectedCount} selected)
            </h3>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-700">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={rosterStaff.length > 0 && Object.keys(selectedStaff).length === rosterStaff.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const allSelected = {}
                      rosterStaff.forEach(staff => {
                        allSelected[staff.id] = {
                          unavailableDays: [],
                          targetShifts: staff.default_target_shifts
                        }
                      })
                      setSelectedStaff(allSelected)
                    } else {
                      setSelectedStaff({})
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Target Shifts</div>
              <div className="col-span-4">Unavailable Days</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-200">
              {rosterStaff.map((staff) => {
                const isSelected = selectedStaff[staff.id] !== undefined
                const staffData = selectedStaff[staff.id] || {}
                
                return (
                  <div
                    key={staff.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-2 transition ${
                      isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStaffSelection(staff.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>

                    {/* Name */}
                    <div className="col-span-3 flex items-center">
                      <span className="font-medium text-gray-800 text-sm">{staff.name}</span>
                    </div>

                    {/* Role */}
                    <div className="col-span-2 flex items-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRoleColor(staff.role)}`}>
                        {staff.role}
                      </span>
                    </div>

                    {/* Target Shifts */}
                    <div className="col-span-2 flex items-center">
                      {isSelected ? (
                        <input
                          type="number"
                          value={staffData.targetShifts || staff.default_target_shifts}
                          onChange={(e) => updateSelectedStaff(staff.id, 'targetShifts', parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                          required
                          placeholder={staff.default_target_shifts}
                        />
                      ) : (
                        <span className="text-sm text-gray-400">{staff.default_target_shifts}</span>
                      )}
                    </div>

                    {/* Unavailable Days */}
                    <div className="col-span-4">
                      {isSelected && startDate ? (
                        <div className="w-full">
                          <DatePicker
                            selected={getSelectedDates(staff.id)[0] || null}
                            onChange={(dates) => {
                              if (!dates) {
                                updateSelectedStaff(staff.id, 'unavailableDays', [])
                                return
                              }
                              
                              const clickedDate = Array.isArray(dates) ? dates[dates.length - 1] : dates
                              
                              if (clickedDate && clickedDate instanceof Date) {
                                const dateStr = clickedDate.toISOString().split('T')[0]
                                const currentDateStrs = staffData.unavailableDays || []
                                
                                if (currentDateStrs.includes(dateStr)) {
                                  updateSelectedStaff(staff.id, 'unavailableDays', 
                                    currentDateStrs.filter(d => d !== dateStr))
                                } else {
                                  updateSelectedStaff(staff.id, 'unavailableDays', 
                                    [...currentDateStrs, dateStr].sort())
                                }
                              }
                            }}
                            minDate={getMinDate()}
                            maxDate={getMaxDate()}
                            selectsMultiple
                            isClearable
                            placeholderText="Click to select dates"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            dateFormat="yyyy-MM-dd"
                            inline={false}
                            highlightDates={getSelectedDates(staff.id)}
                            popperModifiers={[
                              {
                                name: "offset",
                                options: {
                                  offset: [0, 8],
                                },
                              },
                            ]}
                            popperClassName="z-50"
                          />
                          {staffData.unavailableDays && staffData.unavailableDays.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {staffData.unavailableDays.map((date, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200"
                                >
                                  {date}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      e.preventDefault()
                                      const updated = staffData.unavailableDays.filter((_, i) => i !== idx)
                                      updateSelectedStaff(staff.id, 'unavailableDays', updated)
                                    }}
                                    className="ml-1 text-red-600 hover:text-red-800 font-bold text-xs leading-none"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || selectedCount < 2}
          className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Schedule...
            </span>
          ) : (
            'Generate Schedule'
          )}
        </button>
      </form>
    </div>
  )
}

export default StaffForm
