import { useState, useEffect, Suspense, useMemo } from 'react';
import { ChevronDown, MapPinned, Warehouse, Zap } from 'lucide-react';
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

  const groupedTransformers = useMemo(() => {
    const regions: Record<string, Record<string, TransformerStatus[]>> = {};
    transformers.forEach((t) => {
      const region = t.region_name || 'Unknown Region';
      const depot = t.depot_name || 'Unknown Depot';
      if (!regions[region]) regions[region] = {};
      if (!regions[region][depot]) regions[region][depot] = [];
      regions[region][depot].push(t);
    });
    return regions;
  }, [transformers]);

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
      <div className="rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 px-6 pb-4 pt-6 shadow-lg dark:from-brand-500 dark:to-brand-700 sm:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {(() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
                return `${greeting}, ${user?.first_name || user?.username}! 👋`;
              })()}
            </h2>
            <p className="mt-1 text-brand-100">
              Your access level: <span className="font-semibold text-white">{userAccessLevel()}</span>
            </p>
          </div>
          <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Stats Cards - conditionally render based on access level */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {hasNationalAccess() && (
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl dark:bg-gray-800/80 dark:hover:bg-gray-800/90">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-brand-100 opacity-20 transition-all duration-500 group-hover:scale-110 dark:bg-brand-900"></div>
            <div className="relative z-10 flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-md">
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7ZM12 15C9.23858 15 7 17.2386 7 20H17C17 17.2386 14.7614 15 12 15Z" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.total_regions || 0}
                </h4>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Regions</span>
              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-gradient-to-r from-brand-100 to-brand-300 rounded-full dark:from-brand-800 dark:to-brand-600"></div>
          </div>
        )}

        {(hasNationalAccess() || hasRegionAccess()) && (
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl dark:bg-gray-800/80 dark:hover:bg-gray-800/90">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-light-100 opacity-20 transition-all duration-500 group-hover:scale-110 dark:bg-blue-light-900"></div>
            <div className="relative z-10 flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-light-400 to-blue-light-600 shadow-md">
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7ZM12 15C9.23858 15 7 17.2386 7 20H17C17 17.2386 14.7614 15 12 15Z" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.total_depots || 0}
                </h4>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Depots</span>
              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-gradient-to-r from-blue-light-100 to-blue-light-300 rounded-full dark:from-blue-light-800 dark:to-blue-light-600"></div>
          </div>
        )}

        <div className="group relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl dark:bg-gray-800/80 dark:hover:bg-gray-800/90">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-success-100 opacity-20 transition-all duration-500 group-hover:scale-110 dark:bg-success-900"></div>
          <div className="relative z-10 flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-success-400 to-success-600 shadow-md">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 3H1v18h12V3zm0 16H3V5h10v14zM23 3h-8v2h8v14h-8v2h8V3z"/>
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.total_transformers || 0}
              </h4>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Transformers</span>
            </div>
          </div>
          <div className="mt-4 h-1 w-full bg-gradient-to-r from-success-100 to-success-300 rounded-full dark:from-success-800 dark:to-success-600"></div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl dark:bg-gray-800/80 dark:hover:bg-gray-800/90">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-100 opacity-20 transition-all duration-500 group-hover:scale-110 dark:bg-orange-900"></div>
          <div className="relative z-10 flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-md">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7ZM12 15C9.23858 15 7 17.2386 7 20H17C17 17.2386 14.7614 15 12 15Z" />
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.total_sensors || 0}
              </h4>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Sensors</span>
            </div>
          </div>
          <div className="mt-4 h-1 w-full bg-gradient-to-r from-orange-100 to-orange-300 rounded-full dark:from-orange-800 dark:to-orange-600"></div>
        </div>
      </div>

      {/* Main Dashboard Content - Hierarchy Visualization with Interactive Transformer Details */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Side: Hierarchy Tree - conditionally render based on access level */}
        {(hasNationalAccess() || hasRegionAccess()) && (
          <div className="lg:w-1/3 xl:w-1/4 rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Monitored Transformers</h3>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-brand-400 animate-pulse"></div>
                <span className="text-sm text-brand-600 dark:text-brand-400">Live</span>
              </div>
            </div>
            <div className="h-screen overflow-y-auto scrollbar-white rounded-xl border border-gray-200/50 bg-gradient-to-br from-gray-50 to-white p-4 backdrop-blur-sm dark:border-gray-700/50 dark:from-gray-900/50 dark:to-gray-800/50">
              {Object.entries(groupedTransformers).map(([region, depots]) => (
                <details key={region} className="mb-3 group" open>
                  <summary className="flex items-center justify-between cursor-pointer rounded-lg px-3 py-2 bg-white/80 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 transition group-open:ring-2 group-open:ring-blue-200/60 dark:group-open:ring-gray-700/60">
                    <div className="flex items-center gap-2">
                      <MapPinned className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{region}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {Object.values(depots).reduce((acc, d) => acc + d.length, 0)}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="mt-2 pl-2">
                    {Object.entries(depots).map(([depot, list]) => (
                      <details key={depot} className="mb-2 group" open>
                        <summary className="flex items-center justify-between cursor-pointer rounded-md px-3 py-2 bg-white/80 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 transition group-open:ring-2 group-open:ring-blue-200/60 dark:group-open:ring-gray-700/60">
                          <div className="flex items-center gap-2">
                            <Warehouse className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{depot}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {list.length}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180" />
                          </div>
                        </summary>
                        <ul className="mt-2 space-y-2">
                          {list.map((t) => (
                            <li key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-white shadow-sm hover:shadow-md border border-gray-200/60 dark:border-gray-700/60 dark:bg-gray-800 transition">
                              <button className="text-left flex-1" onClick={() => handleTransformerSelect(t.id)}>
                                <div className="flex items-center gap-2">
                                  <Zap className={`w-4 h-4 ${t.is_active ? 'text-success' : 'text-danger'}`} />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.is_active ? 'bg-success bg-opacity-10 text-success dark:bg-opacity-20' : 'bg-danger bg-opacity-10 text-danger dark:bg-opacity-20'}`}>{t.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">ID: {t.transformer_id} • {t.capacity} MVA • {t.sensor_count} sensors</div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
              {Object.keys(groupedTransformers).length === 0 && (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">No transformers available</div>
              )}
            </div>
          </div>
        )}

        {/* Right Side: Selected Transformer Details */}
        <div className={`${(hasNationalAccess() || hasRegionAccess()) ? 'lg:w-2/3 xl:w-3/4' : 'lg:w-full'}`}>
          <div className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Transformer Details</h3>
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white p-4 backdrop-blur-sm dark:from-gray-900/50 dark:to-gray-800/50">
              {selectedTransformer ? (
                <div className="space-y-3">
                  {/* Header Card */}
                  <div className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md backdrop-blur-sm dark:from-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-xl text-gray-900 dark:text-white">{selectedTransformer.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">ID: {selectedTransformer.transformer_id} • Depot: {selectedTransformer.depot_name}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold ${
                        selectedTransformer.is_active
                          ? 'bg-gradient-to-r from-success-400 to-success-600 text-white shadow-md'
                          : 'bg-gradient-to-r from-danger-400 to-danger-600 text-white shadow-md'
                      }`}>
                        {selectedTransformer.is_active ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 bg-gradient-to-br from-brand-100 to-brand-300 rounded-xl shadow-md backdrop-blur-sm dark:from-brand-900/30 dark:to-brand-800/30 border border-brand-300/40 dark:border-brand-700/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-brand-600 dark:text-brand-400 uppercase tracking-wide">Capacity</p>
                          <p className="text-2xl font-bold text-brand-800 dark:text-brand-200 mt-1">{selectedTransformer.capacity} MVA</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 3H1v18h12V3zm0 16H3V5h10v14zM23 3h-8v2h8v14h-8v2h8V3z"/>
                          </svg>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 bg-brand-200/50 rounded-full dark:bg-brand-700/50">
                        <div className="h-full bg-brand-500 rounded-full" style={{width: '85%'}}></div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-blue-light-100 to-blue-light-300 rounded-xl shadow-md backdrop-blur-sm dark:from-blue-light-900/30 dark:to-blue-light-800/30 border border-blue-light-300/40 dark:border-blue-light-700/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-light-600 dark:text-blue-light-400 uppercase tracking-wide">Sensors</p>
                          <p className="text-2xl font-bold text-blue-light-800 dark:text-blue-light-200 mt-1">{selectedTransformer.sensor_count}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-light-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-light-600 dark:text-blue-light-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7ZM12 15C9.23858 15 7 17.2386 7 20H17C17 17.2386 14.7614 15 12 15Z"/>
                          </svg>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-blue-light-600 dark:text-blue-light-400">
                        {selectedTransformer.sensors?.filter(s => s.is_active).length || 0} active
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-success-100 to-success-300 rounded-xl shadow-md backdrop-blur-sm dark:from-success-900/30 dark:to-success-800/30 border border-success-300/40 dark:border-success-700/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-success-600 dark:text-success-400 uppercase tracking-wide">Uptime</p>
                          <p className="text-2xl font-bold text-success-800 dark:text-success-200 mt-1">98.7%</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-success-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-success-600 dark:text-success-400">
                        Last 30 days
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-300 rounded-xl shadow-md backdrop-blur-sm dark:from-orange-900/30 dark:to-orange-800/30 border border-orange-300/40 dark:border-orange-700/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">Alerts</p>
                          <p className="text-2xl font-bold text-orange-800 dark:text-orange-200 mt-1">
                            {selectedTransformer.sensors?.filter(s => s.latest_reading?.is_alert).length || 0}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm-1-14h2v6h-2V8zm0 8h2v2h-2v-2z"/>
                          </svg>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                        Active warnings
                      </div>
                    </div>
                  </div>

                  {/* Sensor Readings Grid */}
                  {selectedTransformer.sensors && selectedTransformer.sensors.length > 0 && (
                    <div className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md backdrop-blur-sm dark:from-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sensor Dashboard</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedTransformer.sensors.map((sensor, index) => (
                          <div key={index} className="p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg shadow-sm backdrop-blur-sm dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200/50 dark:border-gray-700/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="capitalize font-medium text-gray-800 dark:text-gray-200 text-sm">{sensor.name.replace('_', ' ')}</span>
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                                sensor.is_active 
                                  ? 'bg-success bg-opacity-10 text-success dark:bg-opacity-20' 
                                  : 'bg-danger bg-opacity-10 text-danger dark:bg-opacity-20'
                              }`}>
                                {sensor.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            {sensor.latest_reading ? (
                              <div>
                                <div className="flex items-end justify-between mb-1">
                                  <span className={`text-xl font-bold ${
                                    sensor.latest_reading.is_alert 
                                      ? 'text-red-600 dark:text-red-400' 
                                      : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {sensor.latest_reading.value}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {sensor.sensor_type === 'temperature' && '°C'}
                                    {sensor.sensor_type === 'oil_level' && '%'}
                                    {sensor.sensor_type === 'pressure' && 'PSI'}
                                    {sensor.sensor_type === 'current' && 'A'}
                                    {sensor.sensor_type === 'voltage' && 'V'}
                                  </span>
                                </div>

                                <div className="mt-2 bg-gray-200/50 rounded-full h-1.5 dark:bg-gray-700/50">
                                  <div className={`h-full rounded-full ${
                                    sensor.latest_reading.is_alert ? 'bg-red-500' : 'bg-green-500'
                                  }`} style={{width: `${Math.min(sensor.latest_reading.value / (sensor.sensor_type === 'temperature' ? 100 : sensor.sensor_type === 'voltage' ? 500 : 100) * 100, 100)}%`}}></div>
                                </div>

                                <div className="mt-1.5 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                  <span>{new Date(sensor.latest_reading.timestamp).toLocaleTimeString()}</span>
                                  {sensor.latest_reading.is_alert && (
                                    <span className="text-red-500 font-medium text-xs">⚠️ Alert</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2">
                                <span className="text-gray-400 dark:text-gray-500 text-xs">No data available</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Installation Details */}
                  <div className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg backdrop-blur-sm dark:from-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50">
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Installation Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Installation Date</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {new Date(selectedTransformer.installation_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Description</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedTransformer.description || 'No description available'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Select a transformer from the hierarchy to view detailed information and real-time statistics here.</p>
                  <div className="mt-4 space-y-4">
                    <div className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg backdrop-blur-sm dark:from-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-xl text-gray-900 dark:text-white">Transformer Name</h4>
                      <span className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-success-400 to-success-600 text-white shadow-md">
                        Active
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Depot:</span> [Depot Name]
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl shadow-sm dark:from-brand-900/30 dark:to-brand-800/30 border border-brand-200/50 dark:border-brand-700/50">
                        <p className="text-xs font-medium text-brand-600 dark:text-brand-400">Capacity</p>
                        <p className="text-2xl font-bold text-brand-800 dark:text-brand-200">[Capacity] MVA</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-light-50 to-blue-light-100 rounded-xl shadow-sm dark:from-blue-light-900/30 dark:to-blue-light-800/30 border border-blue-light-200/50 dark:border-blue-light-700/50">
                        <p className="text-xs font-medium text-blue-light-600 dark:text-blue-light-400">Sensors</p>
                        <p className="text-2xl font-bold text-blue-light-800 dark:text-blue-light-200">[Sensor Count]</p>
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