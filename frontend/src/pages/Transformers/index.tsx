import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Modal } from '../../components/ui/modal';
import Alert from '../../components/ui/alert/Alert';

interface Transformer {
  id: number;
  name: string;
  capacity?: number;
  isActive?: boolean;
  depotId?: number;
  depot?: { id: number; name: string };
  lat?: number;
  lng?: number;
}

interface DepotOption { id: number; name: string }

export default function TransformersIndex() {
  const { token } = useAuth();
  const [items, setItems] = useState<Transformer[]>([]);
  const [depots, setDepots] = useState<DepotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [depotFilter, setDepotFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [active, setActive] = useState<Transformer | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [capacityInput, setCapacityInput] = useState<number | ''>('');
  const [isActiveInput, setIsActiveInput] = useState<boolean>(true);
  const [depotInput, setDepotInput] = useState<number | ''>('');
  const [latInput, setLatInput] = useState<number | ''>('');
  const [lngInput, setLngInput] = useState<number | ''>('');
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ variant: 'success' | 'error' | 'info' | 'warning'; title: string; message: string } | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const AUTH_PREFIX = import.meta.env.VITE_AUTH_SERVICE_PREFIX || '/auth-service';
  const TRANSFORMER_PREFIX = (import.meta.env as any).VITE_TRANSFORMER_SERVICE_PREFIX || '/transformer-service';
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

  const normalizeList = (payload: unknown): Transformer[] => {
    if (Array.isArray(payload)) return payload as Transformer[];
    const obj = payload as Record<string, unknown>;
    const candidates = ['data', 'content', 'items', 'records'];
    for (const key of candidates) {
      const v = obj?.[key] as unknown;
      if (Array.isArray(v)) return v as Transformer[];
    }
    return [];
  };

  const fetchDepotOptions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/depots`, { headers });
      const arr = Array.isArray(res.data) ? (res.data as DepotOption[]) : ((res.data?.data as DepotOption[]) ?? []);
      setDepots(arr.map((d) => ({ id: d.id, name: d.name })));
    } catch {
      setDepots([]);
    }
  }, [API_BASE_URL, AUTH_PREFIX, headers]);

  const fetchTransformers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = typeof depotFilter === 'number'
        ? `${API_BASE_URL}${TRANSFORMER_PREFIX}/api/v1/transformers/depot/${depotFilter}`
        : `${API_BASE_URL}${TRANSFORMER_PREFIX}/api/v1/transformers`;
      const res = await axios.get(url, { headers });
      setItems(normalizeList(res.data));
    } catch {
      setError('Failed to fetch transformers');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, AUTH_PREFIX, headers, depotFilter]);

  useEffect(() => {
    if (token) {
      fetchDepotOptions();
      fetchTransformers();
    }
  }, [token, fetchDepotOptions, fetchTransformers]);

  const openCreate = () => {
    setNameInput('');
    setCapacityInput('');
    setIsActiveInput(true);
    setDepotInput('');
    setLatInput('');
    setLngInput('');
    setActive(null);
    setFormError(null);
    setShowCreate(true);
  };

  const openEdit = async (row: Transformer) => {
    try {
      const res = await axios.get(`${API_BASE_URL}${TRANSFORMER_PREFIX}/api/v1/transformers/${row.id}`, { headers });
      const t = (res.data as Transformer) || row;
      setActive(t);
      setNameInput(t.name);
      setCapacityInput(typeof t.capacity === 'number' ? t.capacity : '');
      setIsActiveInput(t.isActive ?? true);
      setDepotInput(t.depot?.id ?? t.depotId ?? '');
      setLatInput(typeof t.lat === 'number' ? t.lat : '');
      setLngInput(typeof t.lng === 'number' ? t.lng : '');
    } catch {
      setActive(row);
      setNameInput(row.name);
      setCapacityInput(typeof row.capacity === 'number' ? row.capacity : '');
      setIsActiveInput(row.isActive ?? true);
      setDepotInput(row.depot?.id ?? row.depotId ?? '');
      setLatInput(typeof row.lat === 'number' ? row.lat : '');
      setLngInput(typeof row.lng === 'number' ? row.lng : '');
    }
    setFormError(null);
    setShowEdit(true);
  };

  const openView = async (row: Transformer) => {
    try {
      const res = await axios.get(`${API_BASE_URL}${TRANSFORMER_PREFIX}/api/v1/transformers/${row.id}`, { headers });
      setActive(res.data as Transformer);
    } catch {
      setActive(row);
    }
    setShowView(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!nameInput || nameInput.trim().length < 2) { setFormError('Enter a valid name'); return; }
      if (capacityInput === '' || typeof capacityInput !== 'number' || capacityInput <= 0) { setFormError('Enter capacity'); return; }
      if (!depotInput || typeof depotInput !== 'number') { setFormError('Select a depot'); return; }
      if (latInput === '' || typeof latInput !== 'number') { setFormError('Enter latitude'); return; }
      if (lngInput === '' || typeof lngInput !== 'number') { setFormError('Enter longitude'); return; }
      setSavingCreate(true);
      setFormError(null);
      await axios.post(`${API_BASE_URL}${TRANSFORMER_PREFIX}/api/v1/transformers/create`, { name: nameInput.trim(), capacity: capacityInput, isActive: isActiveInput, depotId: depotInput, lat: latInput, lng: lngInput }, { headers });
      setShowCreate(false);
      setNameInput('');
      setCapacityInput('');
      setIsActiveInput(true);
      setDepotInput('');
      setLatInput('');
      setLngInput('');
      await fetchTransformers();
      setNotice({ variant: 'success', title: 'Transformer created', message: 'The transformer was created successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to create transformer');
      setNotice({ variant: 'error', title: 'Create failed', message: 'Could not create the transformer.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingCreate(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!active) return;
      if (!nameInput || nameInput.trim().length < 2) { setFormError('Enter a valid name'); return; }
      if (capacityInput === '' || typeof capacityInput !== 'number' || capacityInput <= 0) { setFormError('Enter capacity'); return; }
      if (!depotInput || typeof depotInput !== 'number') { setFormError('Select a depot'); return; }
      if (latInput === '' || typeof latInput !== 'number') { setFormError('Enter latitude'); return; }
      if (lngInput === '' || typeof lngInput !== 'number') { setFormError('Enter longitude'); return; }
      setSavingEdit(true);
      setFormError(null);
      await axios.put(`${API_BASE_URL}${TRANSFORMER_PREFIX}/api/v1/transformers/${active.id}`, { name: nameInput.trim(), capacity: capacityInput, isActive: isActiveInput, depotId: depotInput, lat: latInput, lng: lngInput }, { headers });
      setShowEdit(false);
      setActive(null);
      setNameInput('');
      setCapacityInput('');
      setIsActiveInput(true);
      setDepotInput('');
      setLatInput('');
      setLngInput('');
      await fetchTransformers();
      setNotice({ variant: 'success', title: 'Transformer updated', message: 'Changes were saved successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to update transformer');
      setNotice({ variant: 'error', title: 'Update failed', message: 'Could not update the transformer.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteTransformer = async (id: number) => {
    if (!window.confirm('Delete this transformer?')) return;
    try {
      await axios.delete(`${API_BASE_URL}${TRANSFORMER_PREFIX}/api/v1/transformers/${id}`, { headers });
      await fetchTransformers();
      setNotice({ variant: 'success', title: 'Transformer deleted', message: 'The transformer was deleted successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setError('Failed to delete transformer');
      setNotice({ variant: 'error', title: 'Delete failed', message: 'Could not delete the transformer.' });
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const filtered = items.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const depotName = depots.find(x => x.id === (t.depot?.id ?? t.depotId))?.name ?? '';
    return (
      t.name.toLowerCase().includes(q) ||
      String(t.capacity ?? '').toLowerCase().includes(q) ||
      (t.isActive ? 'active' : 'inactive').includes(q) ||
      depotName.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(paginated.map((t) => t.id));
    else setSelectedIds([]);
  };
  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  };

  if (loading) return <div className="p-4">Loading transformers...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {notice && (
        <Alert variant={notice.variant} title={notice.title} message={notice.message} />
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black dark:text-white">Transformers</h2>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add Transformer</button>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm dark:bg-gray-900">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-[240px]" />
            <div className="w-[260px]">
              <SearchableSelect options={depots} value={depotFilter} onChange={(v) => { setDepotFilter(v); setPage(1); }} placeholder="Filter by depot" />
            </div>
            {typeof depotFilter === 'number' && (
              <button onClick={() => setDepotFilter('')} className="rounded bg-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-300">Clear</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCreate} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">New Transformer</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3"><input type="checkbox" aria-label="Select all" checked={paginated.length > 0 && selectedIds.length === paginated.length} onChange={(e) => toggleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-600">
                    No transformers found.
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {/* <button onClick={fetchTransformers} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Refresh</button> */}
                      <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add Transformer</button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((t) => {
                  const depotName = depots.find(x => x.id === (t.depot?.id ?? t.depotId))?.name ?? t.depot?.name ?? '—';
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={(e) => toggleSelectOne(t.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{t.name}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{typeof t.capacity === 'number' ? t.capacity : '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{depotName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="inline-flex items-center gap-3">
                          <button onClick={() => openView(t)} className="text-gray-700 hover:text-gray-900">View</button>
                          <button onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => deleteTransformer(t.id)} className="text-red-600 hover:text-red-900">Delete</button>
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

      <TransformerCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={submitCreate}
        name={nameInput}
        setName={setNameInput}
        capacity={capacityInput}
        setCapacity={setCapacityInput}
        isActive={isActiveInput}
        setIsActive={setIsActiveInput}
        depotId={depotInput}
        setDepotId={setDepotInput}
        lat={latInput}
        setLat={setLatInput}
        lng={lngInput}
        setLng={setLngInput}
        depots={depots}
        saving={savingCreate}
        error={formError}
      />
      <TransformerEditModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={submitEdit}
        name={nameInput}
        setName={setNameInput}
        capacity={capacityInput}
        setCapacity={setCapacityInput}
        isActive={isActiveInput}
        setIsActive={setIsActiveInput}
        depotId={depotInput}
        setDepotId={setDepotInput}
        lat={latInput}
        setLat={setLatInput}
        lng={lngInput}
        setLng={setLngInput}
        depots={depots}
        saving={savingEdit}
        error={formError}
      />
      <TransformerViewModal open={showView} onClose={() => setShowView(false)} transformer={active} depots={depots} />
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

export function TransformerCreateModal({ open, onClose, onSubmit, name, setName, capacity, setCapacity, isActive, setIsActive, depotId, setDepotId, lat, setLat, lng, setLng, depots, saving, error }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void; capacity: number | ''; setCapacity: (v: number | '') => void; isActive: boolean; setIsActive: (v: boolean) => void; depotId: number | ''; setDepotId: (v: number | '') => void; lat: number | ''; setLat: (v: number | '') => void; lng: number | ''; setLng: (v: number | '') => void; depots: DepotOption[]; saving?: boolean; error?: string | null; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Create Transformer</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <div className="relative group">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6v1a6 6 0 11-12 0V8a6 6 0 016-6z"/></svg>
              </span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter transformer name" aria-invalid={!!error} aria-describedby={error ? 'transformer-create-error' : undefined} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm hover:border-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Capacity (MVA) *</label>
            <input type="number" value={capacity === '' ? '' : String(capacity)} onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter capacity" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input id="transformer-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <label htmlFor="transformer-active" className="text-sm text-gray-700">Active</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Depot *</label>
            <SearchableSelect options={depots} value={depotId} onChange={setDepotId} placeholder="Search depot" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Latitude *</label>
              <input type="number" step="any" value={lat === '' ? '' : String(lat)} onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter latitude" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Longitude *</label>
              <input type="number" step="any" value={lng === '' ? '' : String(lng)} onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter longitude" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
            </div>
          </div>
          {error && <div id="transformer-create-error" className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 104 12z"/></svg>
            ) : null}
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function TransformerEditModal({ open, onClose, onSubmit, name, setName, capacity, setCapacity, isActive, setIsActive, depotId, setDepotId, lat, setLat, lng, setLng, depots, saving, error }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; name: string; setName: (v: string) => void; capacity: number | ''; setCapacity: (v: number | '') => void; isActive: boolean; setIsActive: (v: boolean) => void; depotId: number | ''; setDepotId: (v: number | '') => void; lat: number | ''; setLat: (v: number | '') => void; lng: number | ''; setLng: (v: number | '') => void; depots: DepotOption[]; saving?: boolean; error?: string | null; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Edit Transformer</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter transformer name" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Capacity (MVA) *</label>
            <input type="number" value={capacity === '' ? '' : String(capacity)} onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter capacity" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input id="transformer-active-edit" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <label htmlFor="transformer-active-edit" className="text-sm text-gray-700">Active</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Depot *</label>
            <SearchableSelect options={depots} value={depotId} onChange={setDepotId} placeholder="Search depot" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Latitude *</label>
              <input type="number" step="any" value={lat === '' ? '' : String(lat)} onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter latitude" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Longitude *</label>
              <input type="number" step="any" value={lng === '' ? '' : String(lng)} onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter longitude" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
            </div>
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">Save</button>
        </div>
      </form>
    </Modal>
  );
}

export function TransformerViewModal({ open, onClose, transformer, depots }: { open: boolean; onClose: () => void; transformer: Transformer | null; depots: DepotOption[] }) {
  const depotName = transformer ? (depots.find(x => x.id === (transformer.depot?.id ?? transformer.depotId))?.name ?? transformer.depot?.name ?? '—') : '—';
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-black dark:text-white">Transformer</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="text-xs text-gray-500">Name</div>
            <div className="text-sm font-medium text-gray-900">{transformer?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Capacity</div>
            <div className="text-sm font-medium text-gray-900">{typeof transformer?.capacity === 'number' ? transformer?.capacity : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Depot</div>
            <div className="text-sm font-medium text-gray-900">{depotName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Status</div>
            <div className="text-sm font-medium text-gray-900">{transformer?.isActive ? 'Active' : 'Inactive'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Latitude</div>
            <div className="text-sm font-medium text-gray-900">{typeof transformer?.lat === 'number' ? transformer?.lat : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Longitude</div>
            <div className="text-sm font-medium text-gray-900">{typeof transformer?.lng === 'number' ? transformer?.lng : '—'}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Close</button>
        </div>
      </div>
    </Modal>
  );
}
