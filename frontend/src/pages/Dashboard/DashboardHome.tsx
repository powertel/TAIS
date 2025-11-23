import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import axios from 'axios';

interface DashboardStats {
  total_regions: number;
  total_depots: number;
  total_transformers: number;
  total_sensors: number;
  active_transformers: number;
  inactive_transformers: number;
}

interface TransformerStatus {
  id: number;
  name: string;
  transformer_id: string;
  depot_name: string;
  region_name: string;
  capacity: number;
  is_active: boolean;
  latest_readings: any[];
  sensor_count: number;
}

export default function DashboardHome() {
  const { token, user } = useAuth();
  const { hasNationalAccess, hasRegionAccess, hasDepotAccess, loading: accessLoading } = useUserAccess();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transformers, setTransformers] = useState<TransformerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch dashboard stats
        const statsResponse = await axios.get(`${API_BASE_URL}/dashboard/stats/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setStats(statsResponse.data);

        // Fetch transformer status
        const transformersResponse = await axios.get(`${API_BASE_URL}/dashboard/transformer_status/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setTransformers(transformersResponse.data.slice(0, 10)); // Only get first 10 for display
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  // Determine what level of access the user has for display purposes
  const userAccessLevel = () => {
    if (hasNationalAccess()) return 'National Level';
    if (hasRegionAccess()) return 'Region Level';
    if (hasDepotAccess()) return 'Depot Level';
    return 'Limited Access';
  };

  if (loading || accessLoading) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">
          Good Morning, {user?.first_name || user?.username}! 👋
        </h2>
        <p className="text-sm font-medium text-black dark:text-white">
          Your access level: <span className="text-primary">{userAccessLevel()}</span>
        </p>
      </div>

      {/* Stats Cards - conditionally render based on access level */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        {hasNationalAccess() && (
          <div className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <svg className="fill-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7ZM12 15C9.23858 15 7 17.2386 7 20H17C17 17.2386 14.7614 15 12 15Z" fill="" />
              </svg>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {stats?.total_regions || 0}
                </h4>
                <span className="text-sm font-medium">Total Regions</span>
              </div>
            </div>
          </div>
        )}

        {(hasNationalAccess() || hasRegionAccess()) && (
          <div className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <svg className="fill-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7ZM12 15C9.23858 15 7 17.2386 7 20H17C17 17.2386 14.7614 15 12 15Z" fill="" />
              </svg>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {stats?.total_depots || 0}
                </h4>
                <span className="text-sm font-medium">Total Depots</span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <svg className="fill-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7ZM12 15C9.23858 15 7 17.2386 7 20H17C17 17.2386 14.7614 15 12 15Z" fill="" />
            </svg>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                {stats?.total_transformers || 0}
              </h4>
              <span className="text-sm font-medium">Transformers</span>
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <svg className="fill-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7ZM12 15C9.23858 15 7 17.2386 7 20H17C17 17.2386 14.7614 15 12 15Z" fill="" />
            </svg>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                {stats?.total_sensors || 0}
              </h4>
              <span className="text-sm font-medium">Active Sensors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchy Visualization and Transformers Status */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 lg:grid-cols-2">
        {/* Hierarchy Tree - conditionally render based on access level */}
        {(hasNationalAccess() || hasRegionAccess()) && (
          <div className="md:col-span-1 rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">Infrastructure Hierarchy</h3>
            <div className="h-80 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-boxdark">
              {/* Placeholder hierarchy visualization */}
              <p className="text-gray-500 dark:text-gray-400">Infrastructure hierarchy visualization would be shown here</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Regions → Depots → Transformers</p>
            </div>
          </div>
        )}

        {/* Transformers Status Table */}
        <div className={`${(hasNationalAccess() || hasRegionAccess()) ? 'md:col-span-1' : 'md:col-span-2'}`}>
          <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-black dark:text-white">Transformer Status</h3>
            </div>
            <div className="max-w-full overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                      ID
                    </th>
                    <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                      Name
                    </th>
                    <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">
                      Status
                    </th>
                    <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">
                      Sensors
                    </th>
                    <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transformers.map((transformer, key) => (
                    <tr key={key} className="border-b border-[#eee] dark:border-strokedark">
                      <td className="py-5 px-4 dark:border-strokedark xl:pl-11">
                        <p className="text-black dark:text-white">{transformer.transformer_id}</p>
                      </td>
                      <td className="py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white">{transformer.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{transformer.depot_name}</p>
                      </td>
                      <td className="py-5 px-4 dark:border-strokedark">
                        <p className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-xs font-medium ${
                          transformer.is_active
                            ? 'bg-success text-success'
                            : 'bg-danger text-danger'
                        }`}>
                          {transformer.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </td>
                      <td className="py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white">{transformer.sensor_count}</p>
                      </td>
                      <td className="py-5 px-4 dark:border-strokedark">
                        <a
                          href={`/transformer/${transformer.id}`}
                          className="text-primary hover:underline"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};