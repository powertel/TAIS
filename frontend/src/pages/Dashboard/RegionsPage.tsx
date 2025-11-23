import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

interface HierarchyRegion {
  id: number;
  name: string;
  description?: string;
  depots?: Array<{
    id: number;
    name: string;
    description?: string;
    transformers?: Array<{
      id: number;
      name: string;
      transformer_id: string;
      is_active: boolean;
    }>;
  }>;
}

export default function RegionsPage() {
  const { token } = useAuth();
  const [regions, setRegions] = useState<HierarchyRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);

        const response = await axios.get(`${API_BASE_URL}/dashboard/hierarchy/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // The hierarchy returns the full structure, so we just need to set it
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
    return <div className="p-4">Loading regions...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black dark:text-white">Regions</h2>
        <button className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
          Add Region
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {regions.map(region => (
          <div key={region.id} className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="text-lg font-semibold text-black dark:text-white">{region.name}</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{region.description}</p>

            <div className="mt-4">
              <h4 className="font-medium text-black dark:text-white">Depots in this region:</h4>
              <ul className="mt-2 space-y-1">
                {region.depots && Array.isArray(region.depots) ? (
                  region.depots.slice(0, 3).map(depot => (
                    <li key={depot.id} className="text-sm text-gray-500 dark:text-gray-300">
                      {depot.name}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500 dark:text-gray-400">
                    No depots available
                  </li>
                )}
                {region.depots && Array.isArray(region.depots) && region.depots.length > 3 && (
                  <li className="text-sm text-gray-400 dark:text-gray-400">
                    +{region.depots.length - 3} more...
                  </li>
                )}
              </ul>
            </div>

            <div className="mt-4">
              <span className="inline-block rounded bg-primary bg-opacity-10 px-2 py-1 text-xs font-semibold text-primary">
                {region.depots?.length || 0} Depots
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};