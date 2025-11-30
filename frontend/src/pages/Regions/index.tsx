import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Modal } from '../../components/ui/modal';

interface Region {
  id: number;
  name: string;
  districts?: unknown[];
}

export default function RegionsIndex() {
  const { token } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [activeRegion, setActiveRegion] = useState<Region | null>(null);
  const [nameInput, setNameInput] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const AUTH_PREFIX = import.meta.env.VITE_AUTH_SERVICE_PREFIX || '/auth-service';
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const normalizeRegions = (payload: unknown): Region[] => {
    if (Array.isArray(payload)) return payload as Region[];
    const obj = payload as Record<string, unknown>;
    const candidates = ['data', 'content', 'items', 'records'];
    for (const key of candidates) {
      const v = obj?.[key] as unknown;
      if (Array.isArray(v)) return v as Region[];
    }
    return [];
  };

  const fetchRegions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/regions`, { headers });
      setRegions(normalizeRegions(res.data));
    } catch {
      setError('Failed to fetch regions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchRegions();
  }, [token]);

  const openCreate = () => {
    setNameInput('');
    setActiveRegion(null);
    setShowCreate(true);
  };

  const openEdit = async (region: Region) => {
    try {
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/regions/${region.id}`, { headers });
      const r = (res.data as Region) || region;
      setActiveRegion(r);
      setNameInput(r.name);
    } catch {
      setActiveRegion(region);
      setNameInput(region.name);
    }
    setShowEdit(true);
  };

  const openView = async (region: Region) => {
    try {
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/regions/${region.id}`, { headers });
      setActiveRegion(res.data as Region);
    } catch {
      setActiveRegion(region);
    }
    setShowView(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/regions/create`, { name: nameInput }, { headers });
      setShowCreate(false);
      setNameInput('');
      await fetchRegions();
    } catch {
      setError('Failed to create region');
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!activeRegion) return;
      await axios.put(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/regions/${activeRegion.id}`, { name: nameInput }, { headers });
      setShowEdit(false);
      setActiveRegion(null);
      setNameInput('');
      await fetchRegions();
    } catch {
      setError('Failed to update region');
    }
  };

  const filtered = regions.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(paginated.map((r) => r.id));
    else setSelectedIds([]);
  };
  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  };

  if (loading) return <div className="p-4">Loading regions...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black dark:text-white">Regions</h2>
        <div className="flex items-center gap-2">
         {/* <button onClick={fetchRegions} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Refresh</button> */}
          <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add Region</button>
        </div>
      </div>

      {regions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">No regions found.</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={fetchRegions} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Refresh</button>
            <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add Region</button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm dark:bg-gray-900">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-[240px]" />
              <select aria-label="Batch Action" onChange={(e) => { const v = e.target.value; e.currentTarget.selectedIndex = 0; if (v === 'delete' && selectedIds.length) { if (confirm(`Delete ${selectedIds.length} selected region(s)?`)) { /* handle in future */ } } }} className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
                <option value="">Batch Action</option>
                <option value="delete">Delete Selected</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchRegions} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Refresh</button>
              <button onClick={openCreate} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">New Region</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3"><input type="checkbox" aria-label="Select all" checked={paginated.length > 0 && selectedIds.length === paginated.length} onChange={(e) => toggleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Districts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map((region) => (
                  <tr key={region.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(region.id)} onChange={(e) => toggleSelectOne(region.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{region.name}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{Array.isArray(region.districts) ? region.districts.length : 0}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="inline-flex items-center gap-3">
                        <button onClick={() => openView(region)} className="text-gray-700 hover:text-gray-900">View</button>
                        <button onClick={() => openEdit(region)} className="text-blue-600 hover:text-blue-900">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">Showing <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium">{filtered.length}</span> results</p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button onClick={() => setPage(1)} disabled={page === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">«</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                      return (
                        <button key={pageNum} onClick={() => setPage(pageNum)} className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pageNum ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{pageNum}</button>
                      );
                    })}
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">»</button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <RegionsCreateModal open={showCreate} onClose={() => setShowCreate(false)} onSubmit={submitCreate} name={nameInput} setName={setNameInput} />
      <RegionsEditModal open={showEdit} onClose={() => setShowEdit(false)} onSubmit={submitEdit} name={nameInput} setName={setNameInput} />
      <RegionsViewModal open={showView} onClose={() => setShowView(false)} region={activeRegion} />
    </div>
  );
}

export function RegionsModals() { return null }

// Create Modal
export function RegionsCreateModal({ open, onClose, onSubmit, name, setName }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Create Region</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create</button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Modal
export function RegionsEditModal({ open, onClose, onSubmit, name, setName }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Edit Region</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Update</button>
        </div>
      </form>
    </Modal>
  );
}

// View Modal
export function RegionsViewModal({ open, onClose, region }: { open: boolean; onClose: () => void; region: Region | null; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      {region && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Region Details</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <span className="text-xs uppercase text-gray-500">Name</span>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{region.name}</div>
            </div>
            <div>
              <span className="text-xs uppercase text-gray-500">Districts</span>
              <div className="text-sm text-gray-700 dark:text-gray-300">{Array.isArray(region.districts) ? region.districts.length : 0}</div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
