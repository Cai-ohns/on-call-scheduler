import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const RosterManagement = () => {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    role: 'Intermediate',
    default_target_shifts: 7
  })

  useEffect(() => {
    fetchStaff()
  }, [])

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Note: We are now using Supabase directly for roster management, 
  // so we don't strictly need the backend API for CRUD operations anymore.
  // Keeping the Supabase integration we added earlier.

  const fetchStaff = async () => {
    try {
      setLoading(true)
      // Direct Supabase call - no backend API needed here
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      // Sort by Role (Senior > Intermediate > Junior) then Name
      const roleOrder = { 'Senior': 1, 'Intermediate': 2, 'Junior': 3 }
      const sortedData = data.sort((a, b) => {
        const roleDiff = (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
        if (roleDiff !== 0) return roleDiff
        return a.name.localeCompare(b.name)
      })

      setStaff(sortedData)
      setError(null)
    } catch (err) {
      console.error('Error fetching staff:', err)
      setError(err.message || 'Failed to fetch residents')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      if (editingId) {
        // Update existing staff
        const { error } = await supabase
          .from('staff')
          .update(formData)
          .eq('id', editingId)
        
        if (error) throw error
      } else {
        // Create new staff
        const { error } = await supabase
          .from('staff')
          .insert([formData])
        
        if (error) throw error
      }
      
      resetForm()
      fetchStaff()
    } catch (err) {
      console.error('Error saving staff:', err)
      setError(err.message || 'Failed to save resident')
    }
  }

  const handleEdit = (staffMember) => {
    setEditingId(staffMember.id)
    setFormData({
      name: staffMember.name,
      role: staffMember.role,
      default_target_shifts: staffMember.default_target_shifts
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resident?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchStaff()
    } catch (err) {
      console.error('Error deleting staff:', err)
      setError(err.message || 'Failed to delete resident')
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      name: '',
      role: 'Intermediate',
      default_target_shifts: 7
    })
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

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading resident roster...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Resident Roster Management</h2>
        <p className="text-sm text-gray-600 mt-1">Add, edit, or remove residents from the roster</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingId ? 'Edit Resident' : 'Add New Resident'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dr. Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Junior">Junior</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Target Shifts
                </label>
                <input
                  type="number"
                  value={formData.default_target_shifts}
                  onChange={(e) => setFormData({ ...formData, default_target_shifts: parseInt(e.target.value) || 0 })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
                >
                  {editingId ? 'Update' : 'Add Resident'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Staff List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Resident Roster ({staff.length})</h3>
            </div>
            
            {staff.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg mb-2">No residents yet</p>
                <p className="text-sm">Add your first resident using the form on the left</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Default Target Shifts
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staff.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {member.default_target_shifts}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(member)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default RosterManagement

