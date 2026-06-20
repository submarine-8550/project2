/**
 * Batch Placement Page
 * Role-adaptive view: Admin sees all batches, Student sees own batch, Company sees history
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function BatchPlacementPage() {
  const { user, logout } = useAuth();
  const [selectedYear, setSelectedYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial fetch — admin needs year list first, others fetch directly
  useEffect(() => {
    if (user.role === 'admin') {
      // First fetch with current year to get availableBatchYears
      const currentYear = new Date().getFullYear();
      fetchAdminBatch(currentYear);
    } else if (user.role === 'student') {
      fetchStudentBatch();
    } else if (user.role === 'company') {
      fetchCompanyHistory();
    }
  }, []);

  // Admin year change
  useEffect(() => {
    if (user.role === 'admin' && selectedYear && availableYears.length > 0) {
      fetchAdminBatch(selectedYear);
    }
  }, [selectedYear]);

  const fetchAdminBatch = async (year) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/admin/batch/${year}`);
      if (response.data.success) {
        setData(response.data);
        if (response.data.availableBatchYears?.length > 0) {
          setAvailableYears(response.data.availableBatchYears);
          if (!selectedYear) {
            setSelectedYear(response.data.availableBatchYears[0]);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch batch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentBatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/students/batch-placement');
      if (response.data.success) {
        setData(response.data);
        setSelectedYear(response.data.batchYear);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch batch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/companies/batch-history');
      if (response.data.success) {
        setData(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch batch history');
    } finally {
      setLoading(false);
    }
  };

  // Determine the back link based on role
  const getBackLink = () => {
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'company') return '/company/dashboard';
    return '/student/dashboard';
  };

  const getPageTitle = () => {
    if (user.role === 'company') return 'Placement History';
    return 'Batch-wise Placement';
  };

  const getNavLabel = () => {
    if (user.role === 'admin') return 'Admin Portal';
    if (user.role === 'company') return 'Company Portal';
    return 'Student Portal';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to={getBackLink()}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                ← Back to Dashboard
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-xl font-bold text-gray-900">{getNavLabel()}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.email}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h2>
          {selectedYear && user.role !== 'company' && (
            <p className="text-gray-500 mt-1">Batch {selectedYear}</p>
          )}
        </div>

        {/* Batch year tabs — admin only */}
        {user.role === 'admin' && availableYears.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-full text-sm border transition-all ${
                  selectedYear === year
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-medium shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                Batch {year}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            Error: {error}
          </div>
        )}

        {/* Content — only when not loading and no error */}
        {!loading && !error && data && (
          <>
            {/* Stats row — admin + student */}
            {data.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Students" value={data.stats.totalStudents} />
                <StatCard label="Placed" value={data.stats.placedStudents} color="green" />
                {data.stats.totalCompaniesVisited !== undefined && (
                  <StatCard label="Companies Visited" value={data.stats.totalCompaniesVisited} color="blue" />
                )}
                {data.stats.placementPercentage !== undefined && (
                  <StatCard label="Placement %" value={`${data.stats.placementPercentage}%`} color="purple" />
                )}
                {data.stats.totalOffers !== undefined && (
                  <StatCard label="Total Offers" value={data.stats.totalOffers} color="amber" />
                )}
              </div>
            )}

            {/* 3-column board — admin + student */}
            {(user.role === 'admin' || user.role === 'student') && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming */}
                <BoardColumn
                  title="Upcoming"
                  subtitle={`${data.upcoming?.length ?? 0} drives`}
                  bgClass="bg-blue-50"
                  borderClass="border-blue-100"
                  titleColor="text-blue-800"
                  subtitleColor="text-blue-500"
                >
                  {data.upcoming?.length === 0 && (
                    <p className="text-sm text-gray-400 p-4">No upcoming drives</p>
                  )}
                  {data.upcoming?.map(d => (
                    <DriveCard key={d.id} drive={d} />
                  ))}
                </BoardColumn>

                {/* Recently visited */}
                <BoardColumn
                  title="Recently Visited"
                  subtitle="Last 12 months"
                  bgClass="bg-green-50"
                  borderClass="border-green-100"
                  titleColor="text-green-800"
                  subtitleColor="text-green-500"
                >
                  {data.recentlyVisited?.length === 0 && (
                    <p className="text-sm text-gray-400 p-4">No recent visits</p>
                  )}
                  {data.recentlyVisited?.map(c => (
                    <CompanyCard key={c.company_id} company={c} variant="recent" />
                  ))}
                </BoardColumn>

                {/* Visited once — admin only */}
                {user.role === 'admin' && (
                  <BoardColumn
                    title="Visited Once · Last 3 Yrs"
                    subtitle={`${data.visitedOnce?.length ?? 0} companies`}
                    bgClass="bg-amber-50"
                    borderClass="border-amber-100"
                    titleColor="text-amber-800"
                    subtitleColor="text-amber-500"
                  >
                    {data.visitedOnce?.length === 0 && (
                      <p className="text-sm text-gray-400 p-4">None found</p>
                    )}
                    {data.visitedOnce?.map(c => (
                      <CompanyCard key={c.company_id} company={c} variant="once" />
                    ))}
                  </BoardColumn>
                )}
              </div>
            )}

            {/* Company view — batch history table */}
            {user.role === 'company' && data.history && (
              <div className="space-y-8">
                {data.history.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                    No placement history yet. Create your first drive to get started.
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900">History by Batch Year</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <tr>
                            <th className="text-left px-6 py-3 font-medium">Batch Year</th>
                            <th className="text-left px-6 py-3 font-medium">Roles</th>
                            <th className="text-left px-6 py-3 font-medium">Drives</th>
                            <th className="text-left px-6 py-3 font-medium">Registered</th>
                            <th className="text-left px-6 py-3 font-medium">Selected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.history.map(row => (
                            <tr key={row.batch_year} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">Batch {row.batch_year}</td>
                              <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate">{row.roles}</td>
                              <td className="px-6 py-4 text-gray-700">{row.drive_count}</td>
                              <td className="px-6 py-4 text-gray-700">{row.total_registered}</td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                  {row.selected_count}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Upcoming drives for company */}
                {data.upcoming && data.upcoming.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900">Upcoming Drives</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {data.upcoming.map(d => (
                        <div key={d.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{d.job_role}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Deadline: {new Date(d.deadline).toLocaleDateString('en-IN')}
                              {d.target_graduation_year && ` · Batch ${d.target_graduation_year}`}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            d.status === 'approved'
                              ? 'bg-green-50 text-green-700'
                              : d.status === 'rejected'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function StatCard({ label, value, color = 'gray' }) {
  const colorMap = {
    gray: 'bg-gray-50',
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    amber: 'bg-amber-50',
  };
  return (
    <div className={`${colorMap[color] || colorMap.gray} rounded-xl p-5 border border-gray-100`}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}

function BoardColumn({ title, subtitle, bgClass, borderClass, titleColor, subtitleColor, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className={`${bgClass} px-5 py-4 border-b ${borderClass}`}>
        <p className={`text-sm font-semibold ${titleColor}`}>{title}</p>
        <p className={`text-xs ${subtitleColor} mt-0.5`}>{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function DriveCard({ drive }) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <p className="text-sm font-medium text-gray-900">{drive.company_name}</p>
      <p className="text-xs text-gray-500 mt-0.5">{drive.job_role}</p>
      <p className="text-xs text-gray-400 mt-1">
        Deadline: {new Date(drive.deadline).toLocaleDateString('en-IN')}
      </p>
      {drive.package_amount && (
        <p className="text-xs text-gray-400">
          Package: {drive.package_amount} {drive.package_currency}
        </p>
      )}
      <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        drive.status === 'approved'
          ? 'bg-blue-50 text-blue-700'
          : 'bg-yellow-50 text-yellow-700'
      }`}>
        {drive.status === 'approved' ? 'Drive approved' : 'Pending approval'}
      </span>
    </div>
  );
}

function CompanyCard({ company, variant }) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <p className="text-sm font-medium text-gray-900">{company.company_name}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {new Date(company.last_visit_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
      </p>
      {variant === 'recent' && company.selected_count > 0 && (
        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
          {company.selected_count} selected
        </span>
      )}
      {variant === 'once' && (
        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
          Not returned
        </span>
      )}
    </div>
  );
}
