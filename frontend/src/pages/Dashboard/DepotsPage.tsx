import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

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

export default function DepotsPage() {
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
    return <div className="p-4">Loading depots...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black dark:text-white">Depots</h2>
        <button className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
          Add Depot
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {depots.map(depot => (
          <div key={depot.id} className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="text-lg font-semibold text-black dark:text-white">{depot.name}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Region: {depot.region_name}</p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{depot.description}</p>

            <div className="mt-4">
              <h4 className="font-medium text-black dark:text-white">Transformers in this depot:</h4>
              <ul className="mt-2 space-y-1">
                {depot.transformers?.slice(0, 3).map(transformer => (
                  <li key={transformer.id} className="text-sm text-gray-500 dark:text-gray-300">
                    {transformer.name} ({transformer.transformer_id}) -
                    <span className={`${transformer.is_active ? 'text-success' : 'text-danger'}`}>
                      {transformer.is_active ? ' Active' : ' Inactive'}
                    </span>
                  </li>
                ))}
                {depot.transformers && depot.transformers.length > 3 && (
                  <li className="text-sm text-gray-400 dark:text-gray-400">
                    +{depot.transformers.length - 3} more...
                  </li>
                )}
              </ul>
            </div>

            <div className="mt-4 flex justify-between">
              <span className="inline-block rounded bg-primary bg-opacity-10 px-2 py-1 text-xs font-semibold text-primary">
                {depot.transformers.length} Transformers
              </span>
              <a
                href={`/depot/${depot.id}`}
                className="text-sm text-primary hover:underline"
              >
                View Details
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};