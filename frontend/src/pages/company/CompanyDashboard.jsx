/**
 * Company Dashboard
 * Main dashboard for companies to manage drives and view eligible students
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const CompanyDashboard = () => {
  const { user, logout } = useAuth();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDrive, setShowCreateDrive] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [eligibleStudents, setEligibleStudents] = useState([]);

  useEffect(() => {
    fetchDrives();
  }, []);

  const fetchDrives = async () => {
    try {
      const response = await api.get('/companies/my-drives');
      if (response.data.success) {
        setDrives(response.data.drives);
      }
    } catch (error) {
      console.error('Failed to fetch drives:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleStudents = async (driveId) => {
    try {
      const response = await api.get(`/companies/drives/${driveId}/eligible-students`);
      if (response.data.success) {
        setEligibleStudents(response.data.students);
        setSelectedDrive(driveId);
      }
    } catch (error) {
      alert('Failed to fetch eligible students');
    }
  };

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const driveData = {
      jobRole: formData.get('jobRole'),
      minCgpa: parseFloat(formData.get('minCgpa')),
      packageAmount: parseFloat(formData.get('packageAmount')),
      packageCurrency: formData.get('packageCurrency') || 'LPA',
      deadline: formData.get('deadline'),
      openingsCount: parseInt(formData.get('openingsCount')),
      driveType: formData.get('driveType'),
      targetEmployeeType: formData.get('targetEmployeeType'),
      rounds: formData.getAll('rounds'),
      requiredSkills: formData.get('requiredSkills').split(',').map(s => s.trim()).filter(s => s)
    };

    try {
      const response = await api.post('/companies/drives', driveData);
      if (response.data.success) {
        alert(response.data.message || 'Drive created successfully');
        setShowCreateDrive(false);
        fetchDrives();
        e.target.reset();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create drive');
    }
  };

  const handleShortlist = async (driveId, studentId) => {
    try {
      const response = await api.put(`/companies/drives/${driveId}/students/${studentId}/shortlist`);
      if (response.data.success) {
        alert('Student shortlisted successfully');
        fetchEligibleStudents(driveId);
      }
    } catch (error) {
      alert('Failed to shortlist student');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Company Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.email}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Drives</h2>
          <button
            onClick={() => setShowCreateDrive(!showCreateDrive)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          >
            {showCreateDrive ? 'Cancel' : 'Create New Drive'}
          </button>
        </div>

        {showCreateDrive && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Create New Drive</h3>
            <form onSubmit={handleCreateDrive} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Role *</label>
                  <input
                    type="text"
                    name="jobRole"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min CGPA *</label>
                  <input
                    type="number"
                    name="minCgpa"
                    required
                    min="0"
                    max="10"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Package Amount</label>
                  <input
                    type="number"
                    name="packageAmount"
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Package Currency</label>
                  <select
                    name="packageCurrency"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  >
                    <option value="LPA">LPA</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deadline *</label>
                  <input
                    type="date"
                    name="deadline"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Openings Count *</label>
                  <input
                    type="number"
                    name="openingsCount"
                    required
                    min="1"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Drive Type *</label>
                  <select
                    name="driveType"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  >
                    <option value="core">Core</option>
                    <option value="non-core">Non-Core</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Employee Type *</label>
                  <select
                    name="targetEmployeeType"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="Experienced">Experienced</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rounds *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input type="checkbox" name="rounds" value="aptitude" className="mr-2" />
                      Aptitude
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" name="rounds" value="technical" className="mr-2" />
                      Technical
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" name="rounds" value="HR" className="mr-2" />
                      HR
                    </label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Required Skills (comma-separated)</label>
                  <input
                    type="text"
                    name="requiredSkills"
                    placeholder="JavaScript, React, Node.js"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded"
                >
                  Create Drive
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {drives.map((drive) => (
            <div key={drive.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-semibold text-gray-900">{drive.job_role}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        drive.is_approved
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {drive.is_approved ? 'Approved' : 'Pending Approval'}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Package:</span>{' '}
                      <span className="font-medium">
                        {drive.package_amount} {drive.package_currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Min CGPA:</span>{' '}
                      <span className="font-medium">{drive.min_cgpa}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Deadline:</span>{' '}
                      <span className="font-medium">
                        {new Date(drive.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Registered:</span>{' '}
                      <span className="font-medium">{drive.registered_count || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => fetchEligibleStudents(drive.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                  >
                    View Eligible Students
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedDrive && (
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Eligible Students</h3>
            {eligibleStudents.length === 0 ? (
              <p className="text-gray-500">No eligible students found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CGPA</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {eligibleStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.roll_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.cgpa}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {student.registered ? (
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                student.registrationStatus === 'shortlisted'
                                  ? 'bg-blue-100 text-blue-800'
                                  : student.registrationStatus === 'selected'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {student.registrationStatus}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not Registered</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {student.registered && student.registrationStatus === 'applied' && (
                            <button
                              onClick={() => handleShortlist(selectedDrive, student.id)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Shortlist
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDashboard;

