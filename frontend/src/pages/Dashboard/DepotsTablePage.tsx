import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Modal } from '../../components/ui/modal';

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

interface HierarchyDepot {
  id: number;
  name: string;
  region_name: string;
  description: string;
  transformers: Array<{
    id: number;
    name: string;
    transformer_id: string;
    is_active: boolean;
  }>;
}

export default function DepotsTablePage() {
  const { token } = useAuth();
  const [depots, setDepots] = useState<HierarchyDepot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepot, setSelectedDepot] = useState<HierarchyDepot | null>(null);
  const [showTransformersModal, setShowTransformersModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchDepots = async () => {
      try {
        setLoading(true);

        const response = await axios.get<HierarchyRegion[]>(`${API_BASE_URL}/dashboard/hierarchy/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const allDepots: HierarchyDepot[] = [];
        response.data.forEach((region) => {
          (region.depots || []).forEach((depot) => {
            allDepots.push({
              id: depot.id,
              name: depot.name,
              description: depot.description || '',
              region_name: region.name,
              transformers: depot.transformers || [],
            });
          });
        });

        setDepots(allDepots);
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
  }, [token, API_BASE_URL]);

  if (loading) {
    return <div className="p-4">Loading depots...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  const totalPages = Math.max(1, Math.ceil(depots.length / pageSize));
  const pagedDepots = depots.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black dark:text-white">Depots</h2>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {depots.length} Total
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200/60 bg-white shadow-lg dark:border-gray-700/60 dark:bg-gray-900">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Depot</th>
                <th className="px-4 py-2 text-left font-semibold">Region</th>
                <th className="px-4 py-2 text-left font-semibold">Description</th>
                <th className="px-4 py-2 text-left font-semibold">Transformers</th>
                <th className="px-4 py-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedDepots.map((depot) => (
                <tr key={depot.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{depot.name}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{depot.region_name}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{depot.description || '—'}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {depot.transformers?.length || 0}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      onClick={() => { setSelectedDepot(depot); setShowTransformersModal(true); }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</div>
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
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showTransformersModal && selectedDepot && (
        <Modal isOpen={showTransformersModal} onClose={() => setShowTransformersModal(false)} className="max-w-4xl w-full p-6" backdropBlur={false}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Transformers in {selectedDepot.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Depot • {selectedDepot.region_name}</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm dark:border-gray-700/60 dark:bg-gray-900">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Transformer</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">ID</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDepot.transformers || []).map((t) => (
                      <tr key={t.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                        <td className="px-4 py-2">
                          <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{t.transformer_id}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${t.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>{t.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}