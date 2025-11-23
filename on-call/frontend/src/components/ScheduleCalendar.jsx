import { useMemo } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, startOfMonth, endOfMonth, addDays, subDays, isWithinInterval, parse } from 'date-fns'

const ScheduleCalendar = ({ scheduleData, onRegenerate, isRegenerating }) => {
  const { schedule, staff_assignments, start_date, end_date } = scheduleData

  const calendarWeeks = useMemo(() => {
    if (!schedule || !start_date || !end_date) return null

    // Parse dates explicitly to avoid timezone issues
    // Split the date string and create a local date
    const [startYear, startMonth, startDay] = start_date.split('-').map(Number)
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
    
    const [endYear, endMonth, endDay] = end_date.split('-').map(Number)
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999)
    
    // Only generate days within the actual schedule range
    const allDays = eachDayOfInterval({ start: start, end: end })
    
    // Group into weeks (Monday to Sunday)
    const weeks = []
    let currentWeek = []
    
    for (const day of allDays) {
      currentWeek.push(day)
      
      // If it's Sunday (end of week) or last day, finalize the week
      if (day.getDay() === 0 || day.getTime() === end.getTime()) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    }
    
    // Add any remaining days as final week
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }
    
    return weeks
  }, [schedule, start_date, end_date])

  if (!calendarWeeks) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center text-gray-600 py-8">
          No schedule data available. Generate a schedule to see results.
        </div>
      </div>
    )
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'Senior':
        return 'bg-indigo-600 text-white'
      case 'Intermediate':
        return 'bg-teal-500 text-white'
      case 'Junior':
        return 'bg-amber-500 text-white'
      default:
        return 'bg-gray-400 text-white'
    }
  }

  const getStaffRole = (staffName) => {
    if (!staff_assignments) return null
    const staff = staff_assignments[staffName]
    return staff ? staff.role : null
  }

  const getDayAssignment = (date) => {
    // Normalize date to local midnight and format consistently
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const assignment = schedule[dateStr]
    
    if (!assignment) return null
    
    if (typeof assignment === 'string') {
      // Single staff member
      const role = getStaffRole(assignment)
      return {
        type: 'single',
        name: assignment,
        role: role
      }
    } else if (typeof assignment === 'object' && assignment.display) {
      // Pairing (Senior + Junior)
      return {
        type: 'pairing',
        senior: assignment.senior,
        junior: assignment.junior,
        display: assignment.display
      }
    }
    
    return null
  }

  const isInScheduleRange = (date) => {
    // Compare dates at day level using date strings to avoid timezone/time issues
    const dateStr = format(date, 'yyyy-MM-dd')
    return dateStr >= start_date && dateStr <= end_date
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Generated Schedule</h2>
          <p className="text-sm text-gray-600">
            {format(new Date(start_date), 'MMMM d, yyyy')} - {format(new Date(end_date), 'MMMM d, yyyy')}
          </p>
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-2"
          >
            {isRegenerating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Regenerating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate Schedule
              </>
            )}
          </button>
        )}
      </div>

      {/* Staff Summary */}
      {staff_assignments && (() => {
        // Calculate min/max for Friday and weekend shifts to show equality
        const staffArray = Object.entries(staff_assignments).map(([name, info]) => ({ name, ...info }))
        const fridayShifts = staffArray.map(s => s.friday_shifts || 0)
        const weekendShifts = staffArray.map(s => s.weekend_shifts || 0)
        const minFriday = Math.min(...fridayShifts)
        const maxFriday = Math.max(...fridayShifts)
        const minWeekend = Math.min(...weekendShifts)
        const maxWeekend = Math.max(...weekendShifts)
        const fridayBalanced = (maxFriday - minFriday) <= 1
        const weekendBalanced = (maxWeekend - minWeekend) <= 1

        const roleOrder = { 'Senior': 1, 'Intermediate': 2, 'Junior': 3 }
        
        const sortedStaff = staffArray.sort((a, b) => {
          const roleDiff = (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
          if (roleDiff !== 0) return roleDiff
          return a.name.localeCompare(b.name)
        })

        return (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-800">Staff Summary</h3>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Weekend Balance:</span>
                  <span className={`px-2 py-0.5 rounded font-medium ${weekendBalanced ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {minWeekend === maxWeekend ? 'Perfect' : `${minWeekend}-${maxWeekend}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Friday Balance:</span>
                  <span className={`px-2 py-0.5 rounded font-medium ${fridayBalanced ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {minFriday === maxFriday ? 'Perfect' : `${minFriday}-${maxFriday}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekend Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Friday Calls</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedStaff.map((staff) => {
                    const diff = staff.actual - staff.target
                    const diffColor = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'
                    const diffText = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '✓'
                    
                    // Role badge styles
                    let roleBadgeClass = "bg-gray-100 text-gray-800"
                    if (staff.role === 'Senior') roleBadgeClass = "bg-indigo-100 text-indigo-800"
                    if (staff.role === 'Intermediate') roleBadgeClass = "bg-teal-100 text-teal-800"
                    if (staff.role === 'Junior') roleBadgeClass = "bg-amber-100 text-amber-800"

                    return (
                      <tr key={staff.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {staff.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleBadgeClass}`}>
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="font-medium text-gray-900">{staff.actual}</span>
                          <span className="text-xs text-gray-400 mx-1">/</span>
                          <span className="text-xs text-gray-400">{staff.target} target</span>
                          {diff !== 0 && <span className={`ml-2 text-xs font-medium ${diffColor}`}>({diffText})</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.weekend_shifts || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.friday_shifts || 0}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Calendar Header - Days of Week */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 mb-px">
            {dayNames.map(day => (
              <div 
                key={day} 
                className="bg-gray-100 text-center py-3 text-sm font-bold text-gray-700"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Weeks */}
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {calendarWeeks.map((week, weekIndex) => (
              week.map((date, dayIndex) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const isInRange = isInScheduleRange(date)
                const isCurrentMonth = isSameMonth(date, new Date(start_date)) || 
                                      isSameMonth(date, new Date(end_date))
                const assignment = isInRange ? getDayAssignment(date) : null
                const isToday = isSameDay(date, new Date())
                
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`min-h-[120px] p-2 ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    } ${!isCurrentMonth ? 'text-gray-400' : ''}`}
                  >
                    {/* Date Number */}
                    <div className="flex justify-between items-start mb-2">
                      <div className={`text-sm font-semibold ${
                        isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
                      } ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}`}>
                        {format(date, 'd')}
                      </div>
                      {isToday && !isCurrentMonth && (
                        <span className="text-xs text-blue-600 font-medium">Today</span>
                      )}
                    </div>

                    {/* Staff Assignment */}
                    {assignment && (
                      <div className="space-y-1">
                        {assignment.type === 'pairing' ? (
                          <div className="space-y-1">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor('Senior')}`}>
                              <span>{assignment.senior}</span>
                              <span className="text-xs">(Sr)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-px bg-gray-300"></div>
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <div className="flex-1 h-px bg-gray-300"></div>
                            </div>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor('Junior')}`}>
                              <span>{assignment.junior}</span>
                              <span className="text-xs">(Jr)</span>
                            </div>
                          </div>
                        ) : (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(assignment.role || 'Intermediate')}`}>
                            <span>{assignment.name}</span>
                            {assignment.role && (
                              <span className="text-xs opacity-90">
                                ({assignment.role === 'Senior' ? 'Sr' : assignment.role === 'Junior' ? 'Jr' : 'Int'})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Empty state for days in range but no assignment */}
                    {isInRange && !assignment && (
                      <div className="text-xs text-gray-400 italic">Unassigned</div>
                    )}
                  </div>
                )
              })
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      {staff_assignments && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Role Legend</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-indigo-600"></div>
              <span className="text-sm text-gray-700">Senior</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-teal-500"></div>
              <span className="text-sm text-gray-700">Intermediate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span className="text-sm text-gray-700">Junior</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleCalendar
