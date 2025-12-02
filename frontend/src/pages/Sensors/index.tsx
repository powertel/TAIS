import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Modal } from '../../components/ui/modal';
import Alert from '../../components/ui/alert/Alert';

interface Sensor {
  id: number;
  deviceId: string;
  devEui: string;
  name: string;
  type: string;
  transformerId?: number;
  transformer?: { id: number; name: string };
}

interface TransformerOption { id: number; name: string }
const SENSOR_TYPES = ['temperature', 'contact', 'suspicious_tilt', 'motion', 'video', 'controller'] as const;

export default function SensorsIndex() {
  const { token } = useAuth();
  const [items, setItems] = useState<Sensor[]>([]);
  const [transformers, setTransformers] = useState<TransformerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [active, setActive] = useState<Sensor | null>(null);
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [devEuiInput, setDevEuiInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [transformerInput, setTransformerInput] = useState<number | ''>('');
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ variant: 'success' | 'error' | 'info' | 'warning'; title: string; message: string } | null>(null);

  const [transformerFilter, setTransformerFilter] = useState<number | ''>('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

  const normalizeList = (payload: unknown): Sensor[] => {
    if (Array.isArray(payload)) return payload as Sensor[];
    const obj = payload as Record<string, unknown>;
    const candidates = ['data', 'content', 'items', 'records'];
    for (const key of candidates) {
      const v = obj?.[key] as unknown;
      if (Array.isArray(v)) return v as Sensor[];
    }
    return [];
  };

  const fetchTransformerOptions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/transformers`, { headers });
      const arr = Array.isArray(res.data) ? (res.data as TransformerOption[]) : ((res.data?.data as TransformerOption[]) ?? []);
      setTransformers(arr.map((t) => ({ id: t.id, name: t.name })));
    } catch {
      setTransformers([]);
    }
  }, [API_BASE_URL, headers]);

  const fetchSensors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = typeof transformerFilter === 'number'
        ? `${API_BASE_URL}/api/v1/sensors/transformer/${transformerFilter}`
        : `${API_BASE_URL}/api/v1/sensors`;
      const res = await axios.get(url, { headers });
      setItems(normalizeList(res.data));
    } catch {
      setError('Failed to fetch sensors');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, headers, transformerFilter]);

  useEffect(() => {
    if (token) {
      fetchTransformerOptions();
      fetchSensors();
    }
  }, [token, fetchTransformerOptions, fetchSensors]);

  const openCreate = () => {
    setDeviceIdInput('');
    setDevEuiInput('');
    setNameInput('');
    setTypeInput('');
    setTransformerInput('');
    setActive(null);
    setFormError(null);
    setShowCreate(true);
  };

  const openEdit = async (row: Sensor) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/sensors/${row.id}`, { headers });
      const s = (res.data as Sensor) || row;
      setActive(s);
      setDeviceIdInput(s.deviceId);
      setDevEuiInput(s.devEui);
      setNameInput(s.name);
      setTypeInput(s.type);
      setTransformerInput(s.transformer?.id ?? s.transformerId ?? '');
    } catch {
      setActive(row);
      setDeviceIdInput(row.deviceId);
      setDevEuiInput(row.devEui);
      setNameInput(row.name);
      setTypeInput(row.type);
      setTransformerInput(row.transformer?.id ?? row.transformerId ?? '');
    }
    setFormError(null);
    setShowEdit(true);
  };

  const openView = async (row: Sensor) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/sensors/${row.id}`, { headers });
      setActive(res.data as Sensor);
    } catch {
      setActive(row);
    }
    setShowView(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!deviceIdInput.trim()) { setFormError('Enter deviceId'); return; }
      if (!devEuiInput.trim()) { setFormError('Enter devEui'); return; }
      if (!nameInput.trim()) { setFormError('Enter name'); return; }
      if (!SENSOR_TYPES.includes(typeInput as typeof SENSOR_TYPES[number])) { setFormError('Select a valid type'); return; }
      if (!transformerInput || typeof transformerInput !== 'number') { setFormError('Select a transformer'); return; }
      setSavingCreate(true);
      setFormError(null);
      await axios.post(`${API_BASE_URL}/api/v1/sensors/create`, { deviceId: deviceIdInput.trim(), devEui: devEuiInput.trim(), name: nameInput.trim(), type: typeInput.trim(), transformerId: transformerInput }, { headers });
      setShowCreate(false);
      setDeviceIdInput('');
      setDevEuiInput('');
      setNameInput('');
      setTypeInput('');
      setTransformerInput('');
      await fetchSensors();
      setNotice({ variant: 'success', title: 'Sensor created', message: 'The sensor was created successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to create sensor');
      setNotice({ variant: 'error', title: 'Create failed', message: 'Could not create the sensor.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingCreate(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!active) return;
      if (!deviceIdInput.trim()) { setFormError('Enter deviceId'); return; }
      if (!devEuiInput.trim()) { setFormError('Enter devEui'); return; }
      if (!nameInput.trim()) { setFormError('Enter name'); return; }
      if (!SENSOR_TYPES.includes(typeInput as typeof SENSOR_TYPES[number])) { setFormError('Select a valid type'); return; }
      if (!transformerInput || typeof transformerInput !== 'number') { setFormError('Select a transformer'); return; }
      setSavingEdit(true);
      setFormError(null);
      await axios.put(`${API_BASE_URL}/api/v1/sensors/${active.id}`, { deviceId: deviceIdInput.trim(), devEui: devEuiInput.trim(), name: nameInput.trim(), type: typeInput.trim(), transformerId: transformerInput }, { headers });
      setShowEdit(false);
      setActive(null);
      setDeviceIdInput('');
      setDevEuiInput('');
      setNameInput('');
      setTypeInput('');
      setTransformerInput('');
      await fetchSensors();
      setNotice({ variant: 'success', title: 'Sensor updated', message: 'Changes were saved successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to update sensor');
      setNotice({ variant: 'error', title: 'Update failed', message: 'Could not update the sensor.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteSensor = async (id: number) => {
    if (!window.confirm('Delete this sensor?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/sensors/${id}`, { headers });
      await fetchSensors();
      setNotice({ variant: 'success', title: 'Sensor deleted', message: 'The sensor was deleted successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setError('Failed to delete sensor');
      setNotice({ variant: 'error', title: 'Delete failed', message: 'Could not delete the sensor.' });
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const filtered = items.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const tName = transformers.find(x => x.id === (s.transformer?.id ?? s.transformerId))?.name ?? '';
    return (
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      s.deviceId.toLowerCase().includes(q) ||
      s.devEui.toLowerCase().includes(q) ||
      tName.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(paginated.map((s) => s.id));
    else setSelectedIds([]);
  };
  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  };

  if (loading) return <div className="p-4">Loading sensors...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {notice && (
        <Alert variant={notice.variant} title={notice.title} message={notice.message} />
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black dark:text-white">Sensors</h2>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add Sensor</button>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm dark:bg-gray-900">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-[240px]" />
            <div className="w-[260px]">
              <SearchableSelect options={transformers} value={transformerFilter} onChange={(v) => { setTransformerFilter(v); setPage(1); }} placeholder="Filter by transformer" />
            </div>
            {typeof transformerFilter === 'number' && (
              <button onClick={() => setTransformerFilter('')} className="rounded bg-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-300">Clear</button>
            )}
          </div>
          {/* <div className="flex items-center gap-2">
            <button onClick={openCreate} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">New Sensor</button>
          </div> */}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3"><input type="checkbox" aria-label="Select all" checked={paginated.length > 0 && selectedIds.length === paginated.length} onChange={(e) => toggleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DevEUI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transformer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-600">
                    No sensors found.
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button onClick={fetchSensors} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Refresh</button>
                      <button onClick={openCreate} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Add Sensor</button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((s) => {
                  const tName = transformers.find(x => x.id === (s.transformer?.id ?? s.transformerId))?.name ?? s.transformer?.name ?? '—';
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={(e) => toggleSelectOne(s.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300" /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{s.name}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{s.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{s.deviceId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{s.devEui}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{tName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="inline-flex items-center gap-3">
                          <button onClick={() => openView(s)} className="text-gray-700 hover:text-gray-900">View</button>
                          <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => deleteSensor(s.id)} className="text-red-600 hover:text-red-900">Delete</button>
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

      <SensorCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={submitCreate}
        deviceId={deviceIdInput}
        setDeviceId={setDeviceIdInput}
        devEui={devEuiInput}
        setDevEui={setDevEuiInput}
        name={nameInput}
        setName={setNameInput}
        type={typeInput}
        setType={setTypeInput}
        transformerId={transformerInput}
        setTransformerId={setTransformerInput}
        transformers={transformers}
        saving={savingCreate}
        error={formError}
      />
      <SensorEditModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={submitEdit}
        deviceId={deviceIdInput}
        setDeviceId={setDeviceIdInput}
        devEui={devEuiInput}
        setDevEui={setDevEuiInput}
        name={nameInput}
        setName={setNameInput}
        type={typeInput}
        setType={setTypeInput}
        transformerId={transformerInput}
        setTransformerId={setTransformerInput}
        transformers={transformers}
        saving={savingEdit}
        error={formError}
      />
      <SensorViewModal open={showView} onClose={() => setShowView(false)} sensor={active} transformers={transformers} />
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

export function SensorCreateModal({ open, onClose, onSubmit, deviceId, setDeviceId, devEui, setDevEui, name, setName, type, setType, transformerId, setTransformerId, transformers, saving, error }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; deviceId: string; setDeviceId: (v: string) => void; devEui: string; setDevEui: (v: string) => void; name: string; setName: (v: string) => void; type: string; setType: (v: string) => void; transformerId: number | ''; setTransformerId: (v: number | '') => void; transformers: TransformerOption[]; saving?: boolean; error?: string | null; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Create Sensor</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Device ID *</label>
            <input type="text" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="Enter deviceId" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">DevEUI *</label>
            <input type="text" value={devEui} onChange={(e) => setDevEui(e.target.value)} placeholder="Enter devEui" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" aria-invalid={!!error} aria-describedby={error ? 'sensor-create-error' : undefined} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm">
              <option value="">Select type</option>
              {SENSOR_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Transformer *</label>
            <SearchableSelect options={transformers} value={transformerId} onChange={setTransformerId} placeholder="Search transformer" />
          </div>
          {error && <div id="sensor-create-error" className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">Create</button>
        </div>
      </form>
    </Modal>
  );
}

export function SensorEditModal({ open, onClose, onSubmit, deviceId, setDeviceId, devEui, setDevEui, name, setName, type, setType, transformerId, setTransformerId, transformers, saving, error }: { open: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; deviceId: string; setDeviceId: (v: string) => void; devEui: string; setDevEui: (v: string) => void; name: string; setName: (v: string) => void; type: string; setType: (v: string) => void; transformerId: number | ''; setTransformerId: (v: number | '') => void; transformers: TransformerOption[]; saving?: boolean; error?: string | null; }) {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">Edit Sensor</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Device ID *</label>
            <input type="text" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="Enter deviceId" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">DevEUI *</label>
            <input type="text" value={devEui} onChange={(e) => setDevEui(e.target.value)} placeholder="Enter devEui" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm">
              <option value="">Select type</option>
              {SENSOR_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Transformer *</label>
            <SearchableSelect options={transformers} value={transformerId} onChange={setTransformerId} placeholder="Search transformer" />
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

export function SensorViewModal({ open, onClose, sensor, transformers }: { open: boolean; onClose: () => void; sensor: Sensor | null; transformers: TransformerOption[] }) {
  const tName = sensor ? (transformers.find(x => x.id === (sensor.transformer?.id ?? sensor.transformerId))?.name ?? sensor.transformer?.name ?? '—') : '—';
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg w-full p-6" backdropBlur={false}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-black dark:text-white">Sensor</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="text-xs text-gray-500">Name</div>
            <div className="text-sm font-medium text-gray-900">{sensor?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Type</div>
            <div className="text-sm font-medium text-gray-900">{sensor?.type ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Device ID</div>
            <div className="text-sm font-medium text-gray-900">{sensor?.deviceId ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">DevEUI</div>
            <div className="text-sm font-medium text-gray-900">{sensor?.devEui ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Transformer</div>
            <div className="text-sm font-medium text-gray-900">{tName}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Close</button>
        </div>
      </div>
    </Modal>
  );
}
