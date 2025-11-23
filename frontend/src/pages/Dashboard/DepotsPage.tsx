import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import DashboardLayout from '../../layout/DashboardLayout';

interface Depot {
  id: number;
  name: string;
  region_name: string;
  description: string;
  created_at: string;
  updated_at: string;
  transformers: Array<{
    id: number;
    name: string;
    transformer_id: string;
    is_active: boolean;
  }>;
}

const DepotsPage: React.FC = () => {
  const { token } = useAuth();
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchDepots = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(`${API_BASE_URL}/depots/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        setDepots(response.data);
      } catch (err) {
        setError('Failed to fetch depots');
        console.error('Error fetching depots:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDepots();
    }
  }, [token]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading depots...</p>
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
          <h1 className="text-2xl font-semibold text-gray-800">Depots</h1>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
            Add Depot
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {depots.map(depot => (
            <div key={depot.id} className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-800">{depot.name}</h2>
              <p className="mt-1 text-sm text-gray-600">Region: {depot.region_name}</p>
              <p className="mt-2 text-gray-600">{depot.description}</p>
              
              <div className="mt-4">
                <h3 className="font-medium text-gray-700">Transformers in this depot:</h3>
                <ul className="mt-2 space-y-1">
                  {depot.transformers.slice(0, 3).map(transformer => (
                    <li key={transformer.id} className="text-sm text-gray-600">
                      {transformer.name} ({transformer.transformer_id}) - 
                      <span className={transformer.is_active ? 'text-green-600' : 'text-red-600'}>
                        {transformer.is_active ? ' Active' : ' Inactive'}
                      </span>
                    </li>
                  ))}
                  {depot.transformers.length > 3 && (
                    <li className="text-sm text-gray-500">
                      +{depot.transformers.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="mt-4 flex justify-between">
                <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">
                  {depot.transformers.length} Transformers
                </span>
                <a 
                  href={`/depot/${depot.id}`} 
                  className="text-sm text-blue-600 hover:text-blue-900"
                >
                  View Details
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DepotsPage;