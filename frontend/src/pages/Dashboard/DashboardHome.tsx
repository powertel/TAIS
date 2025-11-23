import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import axios from 'axios';
import DashboardLayout from '../../layout/DashboardLayout';
import HierarchyTree from './HierarchyTree';

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

const DashboardHome: React.FC = () => {
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
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Access Level Indicator */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800">Welcome, {user?.first_name || user?.username}!</h2>
          <p className="text-blue-600">Your access level: <span className="font-medium">{userAccessLevel()}</span></p>
        </div>

        {/* Stats Cards - conditionally render based on access level */}
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
          {hasNationalAccess() && (
            <div className="flex items-center p-4 bg-white rounded-lg shadow">
              <div className="p-3 mr-4 rounded-full bg-blue-50">
                <Map className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Regions</p>
                <p className="text-2xl font-semibold text-gray-800">{stats?.total_regions || 0}</p>
              </div>
            </div>
          )}

          {(hasNationalAccess() || hasRegionAccess()) && (
            <div className="flex items-center p-4 bg-white rounded-lg shadow">
              <div className="p-3 mr-4 rounded-full bg-blue-50">
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Depots</p>
                <p className="text-2xl font-semibold text-gray-800">{stats?.total_depots || 0}</p>
              </div>
            </div>
          )}

          <div className="flex items-center p-4 bg-white rounded-lg shadow">
            <div className="p-3 mr-4 rounded-full bg-green-50">
              <Zap className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Transformers</p>
              <p className="text-2xl font-semibold text-gray-800">{stats?.total_transformers || 0}</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-white rounded-lg shadow">
            <div className="p-3 mr-4 rounded-full bg-purple-50">
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Sensors</p>
              <p className="text-2xl font-semibold text-gray-800">{stats?.total_sensors || 0}</p>
            </div>
          </div>
        </div>

        {/* Hierarchy Visualization and Transformers Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hierarchy Tree - conditionally render based on access level */}
          {(hasNationalAccess() || hasRegionAccess()) && (
            <div className="lg:col-span-1">
              <div className="p-6 bg-white rounded-lg shadow">
                <h2 className="mb-4 text-xl font-semibold text-gray-800">Infrastructure Hierarchy</h2>
                <div className="h-96 overflow-y-auto border rounded p-2 bg-gray-50">
                  <HierarchyTree />
                </div>
              </div>
            </div>
          )}

          {/* Transformers Status Table */}
          <div className={`${(hasNationalAccess() || hasRegionAccess()) ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
            <div className="p-6 bg-white rounded-lg shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-800">Transformer Status</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        ID
                      </th>
                      <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Sensors
                      </th>
                      <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transformers.map((transformer) => (
                      <tr key={transformer.id}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{transformer.transformer_id}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{transformer.name}</div>
                          <div className="text-xs text-gray-500">{transformer.depot_name}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${transformer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {transformer.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {transformer.sensor_count}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium whitespace-nowrap">
                          <a href={`/transformer/${transformer.id}`} className="text-blue-600 hover:text-blue-900">View</a>
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
    </DashboardLayout>
  );
};

// Icons for the components
import { Map, Building2, Zap, Activity } from 'lucide-react';

export default DashboardHome;