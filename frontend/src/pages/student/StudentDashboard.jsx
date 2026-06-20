/**
 * Student Dashboard
 * Main dashboard for students to view eligible drives and manage profile
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import TiltCard from '../../components/TiltCard';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [drives, setDrives] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('drives');

  useEffect(() => {
    fetchEligibleDrives();
    fetchRegistrations();
  }, []);

  const fetchEligibleDrives = async () => {
    try {
      const response = await api.get('/students/eligible-drives');
      if (response.data.success) {
        setDrives(response.data.drives);
      }
    } catch (error) {
      console.error('Failed to fetch drives:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await api.get('/students/my-registrations');
      if (response.data.success) {
        setRegistrations(response.data.registrations);
      }
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    }
  };

  const handleRegister = async (driveId) => {
    if (!window.confirm('Are you sure you want to register for this drive?')) {
      return;
    }

    try {
      const response = await api.post(`/students/register-drive/${driveId}`, {
        registrationData: {}
      });
      if (response.data.success) {
        alert('Successfully registered for drive!');
        fetchEligibleDrives();
        fetchRegistrations();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to register for drive');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <nav className="bg-white/10 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">Student Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white/80">{user?.email}</span>
              <Link
                to="/student/profile"
                className="text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                Profile
              </Link>
              <Link
                to="/batch-placement"
                className="text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                My Batch
              </Link>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-white/20">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('drives')}
                className={`${
                  activeTab === 'drives'
                    ? 'border-indigo-400 text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Eligible Drives
              </button>
              <button
                onClick={() => setActiveTab('registrations')}
                className={`${
                  activeTab === 'registrations'
                    ? 'border-indigo-400 text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                My Registrations
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'drives' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Eligible Drives</h2>
            {drives.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-xl p-6 text-center text-white/70 border border-white/20">
                No eligible drives available at the moment.
              </div>
            ) : (
              <div className="grid gap-4">
                {drives.map((drive) => (
                  <TiltCard key={drive.id} className="bg-white/10 backdrop-blur-md shadow-lg rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white">
                          {drive.job_role}
                        </h3>
                        <p className="text-white/70 mt-1">{drive.company_name}</p>
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-white/60">Package:</span>{' '}
                            <span className="font-medium text-white">
                              {drive.package_amount} {drive.package_currency}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/60">Min CGPA:</span>{' '}
                            <span className="font-medium text-white">{drive.min_cgpa}</span>
                          </div>
                          <div>
                            <span className="text-white/60">Deadline:</span>{' '}
                            <span className="font-medium text-white">
                              {new Date(drive.deadline).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/60">Openings:</span>{' '}
                            <span className="font-medium text-white">{drive.openings_count}</span>
                          </div>
                        </div>
                        <div className="mt-4">
                          <span className="text-white/60">Required Skills:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {drive.requiredSkills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="bg-indigo-500/30 backdrop-blur-sm text-white px-2 py-1 rounded text-xs border border-indigo-400/50"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4">
                          <span className="text-gray-500">Qualified Rounds:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {drive.qualifiedRounds?.map((round, idx) => (
                              <span
                                key={idx}
                                className="bg-green-500/30 backdrop-blur-sm text-white px-2 py-1 rounded text-xs border border-green-400/50"
                              >
                                {round}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {drive.alreadyRegistered ? (
                          <span className="inline-block bg-indigo-500/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-indigo-400/50">
                            {drive.registrationStatus || 'Registered'}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRegister(drive.id)}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                          >
                            Register
                          </button>
                        )}
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'registrations' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">My Registrations</h2>
            {registrations.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-xl p-6 text-center text-white/70 border border-white/20">
                You haven't registered for any drives yet.
              </div>
            ) : (
              <div className="grid gap-4">
                {registrations.map((reg) => (
                  <TiltCard key={reg.id} className="bg-white/10 backdrop-blur-md shadow-lg rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white">
                          {reg.job_role}
                        </h3>
                        <p className="text-white/70 mt-1">{reg.company_name}</p>
                        <div className="mt-4 flex items-center space-x-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border ${
                              reg.status === 'selected'
                                ? 'bg-green-500/30 text-white border-green-400/50'
                                : reg.status === 'shortlisted'
                                ? 'bg-blue-500/30 text-white border-blue-400/50'
                                : reg.status === 'rejected'
                                ? 'bg-red-500/30 text-white border-red-400/50'
                                : 'bg-white/20 text-white border-white/30'
                            }`}
                          >
                            {reg.status}
                          </span>
                          <span className="text-sm text-white/60">
                            Applied: {new Date(reg.applied_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-4">
                          <span className="text-white/60">Qualified Rounds:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {reg.qualifiedRounds?.map((round, idx) => (
                              <span
                                key={idx}
                                className="bg-green-500/30 backdrop-blur-sm text-white px-2 py-1 rounded text-xs border border-green-400/50"
                              >
                                {round}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;

