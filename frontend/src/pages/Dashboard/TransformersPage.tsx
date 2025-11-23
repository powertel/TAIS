import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

interface Transformer {
  id: number;
  name: string;
  transformer_id: string;
  depot_name: string;
  region_name: string;
  capacity: number;
  is_active: boolean;
  sensor_count: number;
  installation_date: string;
}

export default function TransformersPage() {
  const { token } = useAuth();
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchTransformers = async () => {
      try {
        setLoading(true);

        const response = await axios.get(`${API_BASE_URL}/transformers/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setTransformers(response.data);
      } catch (err) {
        setError('Failed to fetch transformers');
        console.error('Error fetching transformers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchTransformers();
    }
  }, [token]);

  if (loading) {
    return <div className="p-4">Loading transformers...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black dark:text-white">Transformers</h2>
        <button className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
          Add Transformer
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
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
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                  Location
                </th>
                <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">
                  Capacity
                </th>
                <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">
                  Sensors
                </th>
                <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">
                  Status
                </th>
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
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
                  </td>
                  <td className="py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{transformer.depot_name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{transformer.region_name}</p>
                  </td>
                  <td className="py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{transformer.capacity} MVA</p>
                  </td>
                  <td className="py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{transformer.sensor_count}</p>
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
                    <div className="flex items-center space-x-3.5">
                      <a
                        href={`/transformer/${transformer.id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </a>
                      <a
                        href={`/transformer/${transformer.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};