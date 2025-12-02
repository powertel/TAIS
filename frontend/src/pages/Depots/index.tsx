import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Modal } from '../../components/ui/modal';
import Alert from '../../components/ui/alert/Alert';

interface Depot {
  id: number;
  name: string;
  districtId?: number;
  district?: { id: number; name: string };
}

interface DistrictOption { id: number; name: string }

export default function DepotsIndex() {
  const { token } = useAuth();
  const [depots, setDepots] = useState<Depot[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [activeDepot, setActiveDepot] = useState<Depot | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [districtInput, setDistrictInput] = useState<number | ''>('');
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ variant: 'success' | 'error' | 'info' | 'warning'; title: string; message: string } | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const AUTH_PREFIX = import.meta.env.VITE_AUTH_SERVICE_PREFIX || '/auth-service';
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

  const normalizeList = (payload: unknown): Depot[] => {
    if (Array.isArray(payload)) return payload as Depot[];
    const obj = payload as Record<string, unknown>;
    const candidates = ['data', 'content', 'items', 'records'];
    for (const key of candidates) {
      const v = obj?.[key] as unknown;
      if (Array.isArray(v)) return v as Depot[];
    }
    return [];
  };

  const fetchDistrictOptions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/districts`, { headers });
      const arr = Array.isArray(res.data) ? (res.data as DistrictOption[]) : ((res.data?.data as DistrictOption[]) ?? []);
      setDistricts(arr.map((d) => ({ id: d.id, name: d.name })));
    } catch {
      setDistricts([]);
    }
  }, [API_BASE_URL, AUTH_PREFIX, headers]);

  const fetchDepots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/depots`, { headers });
      setDepots(normalizeList(res.data));
    } catch {
      setError('Failed to fetch depots');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, AUTH_PREFIX, headers]);

  useEffect(() => {
    if (token) {
      fetchDistrictOptions();
      fetchDepots();
    }
  }, [token, fetchDistrictOptions, fetchDepots]);

  const openCreate = () => {
    setNameInput('');
    setDistrictInput('');
    setActiveDepot(null);
    setFormError(null);
    setShowCreate(true);
  };

  const openEdit = async (depot: Depot) => {
    try {
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/depots/${depot.id}`, { headers });
      const d = (res.data as Depot) || depot;
      setActiveDepot(d);
      setNameInput(d.name);
      setDistrictInput(d.district?.id ?? d.districtId ?? '');
    } catch {
      setActiveDepot(depot);
      setNameInput(depot.name);
      setDistrictInput(depot.district?.id ?? depot.districtId ?? '');
    }
    setFormError(null);
    setShowEdit(true);
  };

  const openView = async (depot: Depot) => {
    try {
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/depots/${depot.id}`, { headers });
      setActiveDepot(res.data as Depot);
    } catch {
      setActiveDepot(depot);
    }
    setShowView(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!nameInput || nameInput.trim().length < 2) { setFormError('Enter a valid name'); return; }
      if (!districtInput || typeof districtInput !== 'number') { setFormError('Select a district'); return; }
      setSavingCreate(true);
      setFormError(null);
      await axios.post(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/depots/create`, { name: nameInput.trim(), districtId: districtInput }, { headers });
      setShowCreate(false);
      setNameInput('');
      setDistrictInput('');
      await fetchDepots();
      setNotice({ variant: 'success', title: 'Depot created', message: 'The depot was created successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to create depot');
      setNotice({ variant: 'error', title: 'Create failed', message: 'Could not create the depot.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingCreate(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!activeDepot) return;
      if (!nameInput || nameInput.trim().length < 2) { setFormError('Enter a valid name'); return; }
      if (!districtInput || typeof districtInput !== 'number') { setFormError('Select a district'); return; }
      setSavingEdit(true);
      setFormError(null);
      await axios.put(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/depots/${activeDepot.id}`, { name: nameInput.trim(), districtId: districtInput }, { headers });
      setShowEdit(false);
      setActiveDepot(null);
      setNameInput('');
      setDistrictInput('');
      await fetchDepots();
      setNotice({ variant: 'success', title: 'Depot updated', message: 'Changes were saved successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to update depot');
      setNotice({ variant: 'error', title: 'Update failed', message: 'Could not update the depot.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteDepot = async (id: number) => {
    if (!window.confirm('Delete this depot?')) return;
    try {
      await axios.delete(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/depots/${id}`, { headers });
      await fetchDepots();
      setNotice({ variant: 'success', title: 'Depot deleted', message: 'The depot was deleted successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setError('Failed to delete depot');
      setNotice({ variant: 'error', title: 'Delete failed', message: 'Could not delete the depot.' });
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const filtered = depots.filter((d) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const distName = districts.find(x => x.id === (d.district?.id ?? d.districtId))?.name ?? '';
    return d.name.toLowerCase().includes(q) || distName.toLowerCase().includes(q);
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

  if (loading) return <div className="p-4">Loading depots...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {notice && (
        <Alert variant={notice.variant} title={notice.title} message={notice.message} />
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black dark:text-white">Depots</h2>
        <div className="flex items-center gap-2">
          {/* <button onClick={fetchDepots} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Refresh</button> */}
          <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add Depot</button>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm dark:bg-gray-900">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-[240px]" />
          </div>
          <div className="flex items-center gap-2">
            {/* <button onClick={fetchDepots} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Refresh</button> */}
            <button onClick={openCreate} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">New Depot</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3"><input type="checkbox" aria-label="Select all" checked={paginated.length > 0 && selectedIds.length === paginated.length} onChange={(e) => toggleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-600">
                    No depots found.
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button onClick={fetchDepots} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Refresh</button>
                      <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add Depot</button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((d) => {
                  const distName = districts.find(x => x.id === (d.district?.id ?? d.districtId))?.name ?? d.district?.name ?? '—';
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(d.id)} onChange={(e) => toggleSelectOne(d.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{d.name}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{distName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="inline-flex items-center gap-3">
                          <button onClick={() => openView(d)} className="text-gray-700 hover:text-gray-900">View</button>
                          <button onClick={() => openEdit(d)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => deleteDepot(d.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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

      <DepotCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={submitCreate}
        name={nameInput}
        setName={setNameInput}
        districtId={districtInput}
        setDistrictId={setDistrictInput}
        districts={districts}
        saving={savingCreate}
        error={formError}
      />
      <DepotEditModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={submitEdit}
        name={nameInput}
        setName={setNameInput}
        districtId={districtInput}
        setDistrictId={setDistrictInput}
        districts={districts}
        saving={savingEdit}
        error={formError}
      />
      <DepotViewModal open={showView} onClose={() => setShowView(false)} depot={activeDepot} districts={districts} />
    </div>
  );
}

function SearchableSelect({ options, value, onChange, placeholder }: { options: { id: number; name: string }[]; value: number | ''; onChange: (v: number | '') => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = typeof value === 'number' ? options.find(o => o.id === value) : undefined;

  useEffect(() => {
    setQuery(selected ? selected.name : '');
  }, [selected]);

  const filtered = options.filter(o => o.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="relative">
      <div className="relative group">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || 'Search…'}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white pl-10 pr-8 py-2 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm hover:border-gray-400"
        />
        <button type="button" onClick={() => setOpen(v => !v)} className="absolute inset-y-0 right-0 px-2 text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.25 8.27a.75.75 0 01-.02-1.06z"/></svg>
        </button>
      </div>
      {open && (
        <div className="absolute z-10 mt-2 w-full rounded-md border border-gray-200 bg-white shadow focus:outline-none">
          <ul className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
            ) : (
              filtered.map(opt => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.id); setQuery(opt.name); setOpen(false); }}
                    className={`flex w-full px-3 py-2 text-left text-sm ${value === opt.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                  >
                    {opt.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DepotCreateModal({ open, onClose, onSubmit, name, setName, districtId, setDistrictId, districts, saving, error }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void; districtId: number | ''; setDistrictId: (v: number | '') => void; districts: DistrictOption[]; saving?: boolean; error?: string | null; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Create Depot</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <div className="relative group">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6v1a6 6 0 11-12 0V8a6 6 0 016-6z"/></svg>
              </span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter depot name" aria-invalid={!!error} aria-describedby={error ? 'depot-create-error' : undefined} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm hover:border-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">District *</label>
            <SearchableSelect options={districts} value={districtId} onChange={setDistrictId} placeholder="Search district" />
          </div>
          {error && <div id="depot-create-error" className="text-xs text-red-600">{error}</div>}
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

export function DepotEditModal({ open, onClose, onSubmit, name, setName, districtId, setDistrictId, districts, saving, error }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void; districtId: number | ''; setDistrictId: (v: number | '') => void; districts: DistrictOption[]; saving?: boolean; error?: string | null; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Edit Depot</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <div className="relative group">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6v1a6 6 0 11-12 0V8a6 6 0 016-6z"/></svg>
              </span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter depot name" aria-invalid={!!error} aria-describedby={error ? 'depot-edit-error' : undefined} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm hover:border-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">District *</label>
            <SearchableSelect options={districts} value={districtId} onChange={setDistrictId} placeholder="Search district" />
          </div>
          {error && <div id="depot-edit-error" className="text-xs text-red-600">{error}</div>}
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

export function DepotViewModal({ open, onClose, depot, districts }: { open: boolean; onClose: () => void; depot: Depot | null; districts: DistrictOption[]; }) {
  const distName = depot ? (districts.find(x => x.id === (depot.district?.id ?? depot.districtId))?.name ?? depot.district?.name ?? '—') : '—';
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      {depot && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Depot Details</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <span className="text-xs uppercase text-gray-500">Name</span>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{depot.name}</div>
            </div>
            <div>
              <span className="text-xs uppercase text-gray-500">District</span>
              <div className="text-sm text-gray-700 dark:text-gray-300">{distName}</div>
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
