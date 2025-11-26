import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import axios from 'axios';

interface Region {
  id: number;
  name: string;
  description: string;
  depots?: Depot[];
}

interface Depot {
  id: number;
  name: string;
  description: string;
  region_id: number;
  transformers?: Transformer[];
}

interface Transformer {
  id: number;
  name: string;
  transformer_id: string;
  depot_id: number;
  region_id: number;
  capacity: number;
  installation_date: string;
  description: string;
  is_active: boolean;
  sensor_count: number;
}

// Define the prop interface for the component
interface HierarchyVisualizationProps {
  onTransformerSelect?: (transformerId: number) => void;
}

const HierarchyVisualization: React.FC<HierarchyVisualizationProps> = ({ onTransformerSelect }) => {
  const { token } = useAuth();
  const { hasNationalAccess, hasRegionAccess, hasDepotAccess } = useUserAccess();
  const [hierarchy, setHierarchy] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchHierarchyData = async () => {
      try {
        setLoading(true);

        // Determine which level of data to fetch based on user access
        let endpoint = '/dashboard/hierarchy/';
        
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setHierarchy(response.data);
      } catch (err) {
        setError('Failed to fetch hierarchy data');
        console.error('Error fetching hierarchy:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchHierarchyData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Loading hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      {hierarchy.length > 0 ? (
        <div className="space-y-4">
          {hierarchy.map(region => (
            <div key={region.id} className="border border-stroke rounded p-4 dark:border-strokedark dark:bg-boxdark">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg dark:text-white">📍 {region.name}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{region.description}</p>

              <div className="ml-4 space-y-3">
                {region.depots?.map(depot => (
                  <div key={depot.id} className="border-l-2 border-blue-300 pl-3 py-1">
                    <h4 className="font-medium dark:text-white">🏭 {depot.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{depot.description}</p>

                    <div className="ml-3 space-y-2">
                      {depot.transformers?.map(transformer => (
                        <div
                          key={transformer.id}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            'hover:bg-gray-100 dark:hover:bg-boxdark'
                          }`}
                          onClick={() => onTransformerSelect && onTransformerSelect(transformer.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <span className="mr-2">⚡</span>
                              <span className="font-medium dark:text-white">{transformer.name}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              transformer.is_active
                                ? 'bg-success text-white'
                                : 'bg-danger text-white'
                            }`}>
                              {transformer.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ID: {transformer.transformer_id} | {transformer.capacity} MVA | {transformer.sensor_count} sensors
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No hierarchy data available</p>
        </div>
      )}
    </div>
  );
};

export default HierarchyVisualization;