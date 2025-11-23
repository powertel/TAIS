import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import DashboardLayout from '../../layout/DashboardLayout';

interface Region {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  depots: Array<{
    id: number;
    name: string;
    description: string;
  }>;
}

const RegionsPage: React.FC = () => {
  const { token } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(`${API_BASE_URL}/regions/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        setRegions(response.data);
      } catch (err) {
        setError('Failed to fetch regions');
        console.error('Error fetching regions:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchRegions();
    }
  }, [token]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading regions...</p>
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">Regions</h1>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
            Add Region
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {regions.map(region => (
            <div key={region.id} className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-800">{region.name}</h2>
              <p className="mt-2 text-gray-600">{region.description}</p>
              
              <div className="mt-4">
                <h3 className="font-medium text-gray-700">Depots in this region:</h3>
                <ul className="mt-2 space-y-1">
                  {region.depots.slice(0, 3).map(depot => (
                    <li key={depot.id} className="text-sm text-gray-600">
                      {depot.name}
                    </li>
                  ))}
                  {region.depots.length > 3 && (
                    <li className="text-sm text-gray-500">
                      +{region.depots.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="mt-4">
                <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">
                  {region.depots.length} Depots
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RegionsPage;