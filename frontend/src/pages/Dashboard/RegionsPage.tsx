import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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

export default function RegionsPage() {
  const { token } = useAuth();
  const [regions, setRegions] = useState<HierarchyRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<HierarchyRegion | null>(null);
  const [showDepotsModal, setShowDepotsModal] = useState(false);
  const [depotsPage, setDepotsPage] = useState(1);
  const pageSize = 5;
  const [selectedDepotTransformers, setSelectedDepotTransformers] = useState<
    Array<{
      id: number;
      name: string;
      transformer_id: string;
      is_active: boolean;
    }>
  >([]);
  const [selectedDepotName, setSelectedDepotName] = useState<string>('');
  const [showTransformersModal, setShowTransformersModal] = useState(false);
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);

        const response = await axios.get<HierarchyRegion[]>(`${API_BASE_URL}/dashboard/hierarchy/`, {
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
  }, [token, API_BASE_URL]);

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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {regions.map(region => (
          <div
            key={region.id}
            className="group relative overflow-hidden rounded-2xl bg-white/80 p-5 shadow-lg backdrop-blur-sm transition hover:shadow-xl dark:bg-gray-800/80"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-100 opacity-20 group-hover:scale-110 transition dark:bg-blue-900"></div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-black dark:text-white">{region.name}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{region.description || 'No description'}</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {region.depots?.length || 0} Depots
              </span>
              <button
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                onClick={() => {
                  setSelectedRegion(region);
                  setShowDepotsModal(true);
                  setDepotsPage(1);
                }}
              >
                View Depots
              </button>
            </div>
          </div>
        ))}
      </div>

      {showDepotsModal && selectedRegion && (
        <Modal isOpen={showDepotsModal} onClose={() => setShowDepotsModal(false)} className="max-w-4xl w-full p-6" backdropBlur={false}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Depots in {selectedRegion.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Showing depots with transformer counts</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm dark:border-gray-700/60 dark:bg-gray-900">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Depot</th>
                      <th className="px-4 py-2 text-left font-semibold">Description</th>
                      <th className="px-4 py-2 text-left font-semibold">Transformers</th>
                      <th className="px-4 py-2 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRegion.depots || [])
                      .slice((depotsPage - 1) * pageSize, depotsPage * pageSize)
                      .map(depot => (
                        <tr key={depot.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-4 py-2">{depot.name}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{depot.description || '—'}</td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              {depot.transformers?.length || 0}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 mr-2"
                              onClick={() => {
                                setSelectedDepotTransformers(depot.transformers || []);
                                setSelectedDepotName(depot.name);
                                setShowTransformersModal(true);
                              }}
                            >
                              View Transformers
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Page {depotsPage} of {Math.max(1, Math.ceil((selectedRegion.depots?.length || 0) / pageSize))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    disabled={depotsPage === 1}
                    onClick={() => setDepotsPage(prev => Math.max(1, prev - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    disabled={depotsPage >= Math.ceil((selectedRegion.depots?.length || 0) / pageSize)}
                    onClick={() => setDepotsPage(prev => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showTransformersModal && (
        <Modal isOpen={showTransformersModal} onClose={() => setShowTransformersModal(false)} className="max-w-4xl w-full p-6" backdropBlur={false}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Transformers in {selectedDepotName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Click view to open transformer dashboard</p>
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
                    {selectedDepotTransformers.map(t => (
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
};