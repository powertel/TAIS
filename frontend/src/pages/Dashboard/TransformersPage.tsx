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
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchTransformers = async () => {
      try {
        setLoading(true);

        const response = await axios.get<Transformer[]>(`${API_BASE_URL}/transformers/`, {
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
  }, [token, API_BASE_URL]);

  if (loading) {
    return <div className="p-4">Loading transformers...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-black dark:text-white">Transformers</h2>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {transformers.filter((t) => {
              const q = search.trim().toLowerCase();
              if (!q) return true;
              return (
                (t.name && t.name.toLowerCase().includes(q)) ||
                (t.transformer_id && t.transformer_id.toLowerCase().includes(q)) ||
                (t.depot_name && t.depot_name.toLowerCase().includes(q)) ||
                (t.region_name && t.region_name.toLowerCase().includes(q)) ||
                String(t.capacity).toLowerCase().includes(q) ||
                String(t.sensor_count).toLowerCase().includes(q) ||
                (t.is_active ? 'active' : 'inactive').includes(q)
              );
            }).length} Total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="w-56 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          />
          <button className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
            Add Transformer
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">ID</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Name</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Location</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Capacity</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Sensors</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transformers
                .filter((t) => {
                  const q = search.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    (t.name && t.name.toLowerCase().includes(q)) ||
                    (t.transformer_id && t.transformer_id.toLowerCase().includes(q)) ||
                    (t.depot_name && t.depot_name.toLowerCase().includes(q)) ||
                    (t.region_name && t.region_name.toLowerCase().includes(q)) ||
                    String(t.capacity).toLowerCase().includes(q) ||
                    String(t.sensor_count).toLowerCase().includes(q) ||
                    (t.is_active ? 'active' : 'inactive').includes(q)
                  );
                })
                .slice((page - 1) * pageSize, page * pageSize)
                .map((t) => (
                <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{t.transformer_id}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-gray-800 dark:text-gray-100">{t.depot_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.region_name}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-gray-800 dark:text-gray-100">{t.capacity} MVA</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{t.sensor_count}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${t.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>{t.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <a href={`/transformer/${t.id}`} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">View</a>
                      <a href={`/transformer/${t.id}/edit`} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">Edit</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Page {page} of {Math.max(1, Math.ceil(transformers.filter((t) => { const q = search.trim().toLowerCase(); if (!q) return true; return (
            (t.name && t.name.toLowerCase().includes(q)) ||
            (t.transformer_id && t.transformer_id.toLowerCase().includes(q)) ||
            (t.depot_name && t.depot_name.toLowerCase().includes(q)) ||
            (t.region_name && t.region_name.toLowerCase().includes(q)) ||
            String(t.capacity).toLowerCase().includes(q) ||
            String(t.sensor_count).toLowerCase().includes(q) ||
            (t.is_active ? 'active' : 'inactive').includes(q)
          ); }).length / pageSize))}</div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              disabled={page >= Math.max(1, Math.ceil(transformers.filter((t) => { const q = search.trim().toLowerCase(); if (!q) return true; return (
                (t.name && t.name.toLowerCase().includes(q)) ||
                (t.transformer_id && t.transformer_id.toLowerCase().includes(q)) ||
                (t.depot_name && t.depot_name.toLowerCase().includes(q)) ||
                (t.region_name && t.region_name.toLowerCase().includes(q)) ||
                String(t.capacity).toLowerCase().includes(q) ||
                String(t.sensor_count).toLowerCase().includes(q) ||
                (t.is_active ? 'active' : 'inactive').includes(q)
              ); }).length / pageSize))}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};