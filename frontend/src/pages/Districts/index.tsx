import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Modal } from '../../components/ui/modal';
import Alert from '../../components/ui/alert/Alert';

interface District {
  id: number;
  name: string;
  regionId?: number;
  region?: { id: number; name: string };
}

interface RegionOption { id: number; name: string }

export default function DistrictsIndex() {
  const { token } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [activeDistrict, setActiveDistrict] = useState<District | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [regionInput, setRegionInput] = useState<number | ''>('');
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ variant: 'success' | 'error' | 'info' | 'warning'; title: string; message: string } | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const AUTH_PREFIX = import.meta.env.VITE_AUTH_SERVICE_PREFIX || '/auth-service';
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const normalizeList = (payload: unknown): District[] => {
    if (Array.isArray(payload)) return payload as District[];
    const obj = payload as Record<string, unknown>;
    const candidates = ['data', 'content', 'items', 'records'];
    for (const key of candidates) {
      const v = obj?.[key] as unknown;
      if (Array.isArray(v)) return v as District[];
    }
    return [];
  };

  const fetchRegionsOptions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/regions`, { headers });
      const arr = Array.isArray(res.data) ? (res.data as RegionOption[]) : ((res.data?.data as RegionOption[]) ?? []);
      setRegions(arr.map((r) => ({ id: r.id, name: r.name })));
    } catch {
      setRegions([]);
    }
  }, [API_BASE_URL, AUTH_PREFIX, token]);

  const fetchDistricts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/districts`, { headers });
      setDistricts(normalizeList(res.data));
    } catch {
      setError('Failed to fetch districts');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, AUTH_PREFIX, token]);

  useEffect(() => {
    if (token) {
      fetchRegionsOptions();
      fetchDistricts();
    }
  }, [token, fetchRegionsOptions, fetchDistricts]);

  const openCreate = () => {
    setNameInput('');
    setRegionInput('');
    setActiveDistrict(null);
    setFormError(null);
    setShowCreate(true);
  };

  const openEdit = async (district: District) => {
    try {
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/districts/${district.id}`, { headers });
      const d = (res.data as District) || district;
      setActiveDistrict(d);
      setNameInput(d.name);
      setRegionInput(d.region?.id ?? d.regionId ?? '');
    } catch {
      setActiveDistrict(district);
      setNameInput(district.name);
      setRegionInput(district.region?.id ?? district.regionId ?? '');
    }
    setFormError(null);
    setShowEdit(true);
  };

  const openView = async (district: District) => {
    try {
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/districts/${district.id}`, { headers });
      setActiveDistrict(res.data as District);
    } catch {
      setActiveDistrict(district);
    }
    setShowView(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!nameInput || nameInput.trim().length < 2) { setFormError('Enter a valid name'); return; }
      if (!regionInput || typeof regionInput !== 'number') { setFormError('Select a region'); return; }
      setSavingCreate(true);
      setFormError(null);
      await axios.post(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/districts/create`, { name: nameInput.trim(), regionId: regionInput }, { headers });
      setShowCreate(false);
      setNameInput('');
      setRegionInput('');
      await fetchDistricts();
      setNotice({ variant: 'success', title: 'District created', message: 'The district was created successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to create district');
      setNotice({ variant: 'error', title: 'Create failed', message: 'Could not create the district.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingCreate(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!activeDistrict) return;
      if (!nameInput || nameInput.trim().length < 2) { setFormError('Enter a valid name'); return; }
      if (!regionInput || typeof regionInput !== 'number') { setFormError('Select a region'); return; }
      setSavingEdit(true);
      setFormError(null);
      await axios.put(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/districts/${activeDistrict.id}`, { name: nameInput.trim(), regionId: regionInput }, { headers });
      setShowEdit(false);
      setActiveDistrict(null);
      setNameInput('');
      setRegionInput('');
      await fetchDistricts();
      setNotice({ variant: 'success', title: 'District updated', message: 'Changes were saved successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to update district');
      setNotice({ variant: 'error', title: 'Update failed', message: 'Could not update the district.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteDistrict = async (id: number) => {
    if (!window.confirm('Delete this district?')) return;
    try {
      await axios.delete(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/districts/${id}`, { headers });
      await fetchDistricts();
      setNotice({ variant: 'success', title: 'District deleted', message: 'The district was deleted successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setError('Failed to delete district');
      setNotice({ variant: 'error', title: 'Delete failed', message: 'Could not delete the district.' });
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const filtered = districts.filter((d) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const rName = regions.find(r => r.id === (d.region?.id ?? d.regionId))?.name ?? '';
    return d.name.toLowerCase().includes(q) || rName.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(paginated.map((d) => d.id));
    else setSelectedIds([]);
  };
  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  };

  if (loading) return <div className="p-4">Loading districts...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {notice && (
        <Alert variant={notice.variant} title={notice.title} message={notice.message} />
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black dark:text-white">Districts</h2>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add District</button>
        </div>
      </div>

      {districts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">No districts found.</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add District</button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm dark:bg-gray-900">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-[240px]" />
            </div>
            <div className="flex items-center gap-2">
             {/* <button onClick={fetchDistricts} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Refresh</button> */}
              <button onClick={openCreate} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">New District</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3"><input type="checkbox" aria-label="Select all" checked={paginated.length > 0 && selectedIds.length === paginated.length} onChange={(e) => toggleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map((d) => {
                  const rName = regions.find(r => r.id === (d.region?.id ?? d.regionId))?.name ?? d.region?.name ?? '—';
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(d.id)} onChange={(e) => toggleSelectOne(d.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{d.name}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="inline-flex items-center gap-3">
                          <button onClick={() => openView(d)} className="text-gray-700 hover:text-gray-900">View</button>
                          <button onClick={() => openEdit(d)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => deleteDistrict(d.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      <DistrictCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={submitCreate}
        name={nameInput}
        setName={setNameInput}
        regionId={regionInput}
        setRegionId={setRegionInput}
        regions={regions}
        saving={savingCreate}
        error={formError}
      />
      <DistrictEditModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={submitEdit}
        name={nameInput}
        setName={setNameInput}
        regionId={regionInput}
        setRegionId={setRegionInput}
        regions={regions}
        saving={savingEdit}
        error={formError}
      />
      <DistrictViewModal open={showView} onClose={() => setShowView(false)} district={activeDistrict} regions={regions} />
    </div>
  );
}

export function DistrictCreateModal({ open, onClose, onSubmit, name, setName, regionId, setRegionId, regions, saving, error }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void; regionId: number | ''; setRegionId: (v: number | '') => void; regions: RegionOption[]; saving?: boolean; error?: string | null; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Create District</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <div className="relative group">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6v1a6 6 0 11-12 0V8a6 6 0 016-6z"/></svg>
              </span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter district name" aria-invalid={!!error} aria-describedby={error ? 'district-create-error' : undefined} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm hover:border-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Region *</label>
            <select value={regionId} onChange={(e) => setRegionId(Number(e.target.value) || '')} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              <option value="">Select region</option>
              {regions.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
            </select>
          </div>
          {error && <div id="district-create-error" className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>}
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DistrictEditModal({ open, onClose, onSubmit, name, setName, regionId, setRegionId, regions, saving, error }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void; regionId: number | ''; setRegionId: (v: number | '') => void; regions: RegionOption[]; saving?: boolean; error?: string | null; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Edit District</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <div className="relative group">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6v1a6 6 0 11-12 0V8a6 6 0 016-6z"/></svg>
              </span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter district name" aria-invalid={!!error} aria-describedby={error ? 'district-edit-error' : undefined} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm hover:border-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Region *</label>
            <select value={regionId} onChange={(e) => setRegionId(Number(e.target.value) || '')} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              <option value="">Select region</option>
              {regions.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
            </select>
          </div>
          {error && <div id="district-edit-error" className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>}
            Update
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DistrictViewModal({ open, onClose, district, regions }: { open: boolean; onClose: () => void; district: District | null; regions: RegionOption[]; }) {
  const rName = district ? (regions.find(r => r.id === (district.region?.id ?? district.regionId))?.name ?? district.region?.name ?? '—') : '—';
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      {district && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">District Details</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <span className="text-xs uppercase text-gray-500">Name</span>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{district.name}</div>
            </div>
            <div>
              <span className="text-xs uppercase text-gray-500">Region</span>
              <div className="text-sm text-gray-700 dark:text-gray-300">{rName}</div>
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
