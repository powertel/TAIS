import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import axios from 'axios';
import HierarchyVisualization from './HierarchyVisualization';

interface DashboardStats {
  total_regions: number;
  total_depots: number;
  total_transformers: number;
  total_sensors: number;
  active_transformers: number;
  inactive_transformers: number;
}

interface TransformerDetails {
  id: number;
  name: string;
  transformer_id: string;
  depot_name: string;
  region_name: string;
  capacity: number;
  is_active: boolean;
  installation_date: string;
  description: string;
  sensor_count: number;
  sensors: Array<{
    id: number;
    name: string;
    sensor_type: string;
    is_active: boolean;
    latest_reading?: {
      value: number;
      timestamp: string;
      is_alert: boolean;
    };
  }>;
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
  const [selectedTransformer, setSelectedTransformer] = useState<TransformerDetails | null>(null);
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

  const handleTransformerSelect = async (transformerId: number) => {
    console.log('Transformer clicked:', transformerId); // Debug log
    try {
      setLoading(true); // Set loading state while fetching transformer details
      const response = await axios.get(`${API_BASE_URL}/dashboard/${transformerId}/transformer_detail/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Transformer details fetched:', response.data); // Debug log
      setSelectedTransformer(response.data);
    } catch (err: any) {
      console.error('Error fetching transformer details:', err);
      setError(`Failed to fetch transformer details: ${err.response?.status} - ${err.response?.data?.error || 'Unknown error'}`);
      // Log more details to help debug
      if (err.response) {
        console.log('Response data:', err.response.data);
        console.log('Response status:', err.response.status);
        console.log('Response headers:', err.response.headers);
      }
    } finally {
      setLoading(false);
    }
  };

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
          {(() => {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
            return `${greeting}, ${user?.first_name || user?.username}! 👋`;
          })()}
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

      {/* Main Dashboard Content - Hierarchy Visualization with Interactive Transformer Details */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Side: Hierarchy Tree - conditionally render based on access level */}
        {(hasNationalAccess() || hasRegionAccess()) && (
          <div className="lg:w-1/2 rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">Infrastructure Hierarchy</h3>
            <div className="h-96 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-boxdark">
              <Suspense fallback={<div className="flex items-center justify-center h-full">Loading hierarchy...</div>}>
                <HierarchyVisualization onTransformerSelect={handleTransformerSelect} />
              </Suspense>
            </div>
          </div>
        )}

        {/* Right Side: Selected Transformer Details */}
        <div className={`${(hasNationalAccess() || hasRegionAccess()) ? 'lg:w-1/2' : 'lg:w-full'}`}>
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">Transformer Details</h3>
            <div className="h-96 overflow-y-auto bg-gray-50 p-4 rounded dark:bg-boxdark">
              {selectedTransformer ? (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded shadow dark:bg-boxdark">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-black dark:text-white">{selectedTransformer.name}</h4>
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        selectedTransformer.is_active
                          ? 'bg-success bg-opacity-10 text-success dark:bg-opacity-20'
                          : 'bg-danger bg-opacity-10 text-danger dark:bg-opacity-20'
                      }`}>
                        {selectedTransformer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ID: {selectedTransformer.transformer_id}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Depot: {selectedTransformer.depot_name}</p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-100 rounded dark:bg-meta-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Capacity</p>
                        <p className="font-medium text-black dark:text-white">{selectedTransformer.capacity} MVA</p>
                      </div>
                      <div className="p-3 bg-gray-100 rounded dark:bg-meta-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sensors</p>
                        <p className="font-medium text-black dark:text-white">{selectedTransformer.sensor_count}</p>
                      </div>
                    </div>

                    {selectedTransformer.sensors && selectedTransformer.sensors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-black dark:text-white">Recent Sensor Readings</h4>
                        <div className="mt-2 space-y-2">
                          {selectedTransformer.sensors.slice(0, 5).map((sensor, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="capitalize">{sensor.name.replace('_', ' ')}</span>
                              {sensor.latest_reading ? (
                                <span className={`text-black dark:text-white ${sensor.latest_reading.is_alert ? 'text-red-600 font-bold' : ''}`}>
                                  {sensor.latest_reading.value}
                                  {sensor.sensor_type === 'temperature' && ' °C'}
                                  {sensor.sensor_type === 'oil_level' && ' %'}
                                  {sensor.sensor_type === 'pressure' && ' PSI'}
                                  {sensor.sensor_type === 'current' && ' A'}
                                  {sensor.sensor_type === 'voltage' && ' V'}
                                </span>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">No reading</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Select a transformer from the hierarchy to view detailed information and real-time statistics here.</p>
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-white rounded shadow dark:bg-boxdark">
                      <div className="flex justify-between">
                        <h4 className="font-medium text-black dark:text-white">Transformer Name</h4>
                        <span className="inline-flex items-center gap-1 rounded-full bg-success bg-opacity-10 px-3 py-1 text-xs font-medium text-success dark:bg-opacity-20">
                          Active
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Depot: [Depot Name]</p>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-100 rounded dark:bg-meta-4">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Capacity</p>
                          <p className="font-medium text-black dark:text-white">[Capacity] MVA</p>
                        </div>
                        <div className="p-3 bg-gray-100 rounded dark:bg-meta-4">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sensors</p>
                          <p className="font-medium text-black dark:text-white">[Sensor Count]</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-black dark:text-white">Recent Sensor Readings</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Temperature</span>
                            <span className="text-black dark:text-white">[Value] °C</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Oil Level</span>
                            <span className="text-black dark:text-white">[Value] %</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Pressure</span>
                            <span className="text-black dark:text-white">[Value] PSI</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};