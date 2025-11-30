import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

export default function SiteIndex() {
  const { token } = useAuth();
  const [items, setItems] = useState<Transformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transformer | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_BASE_URL}/api/v1/transformers`, { headers });
        setItems(normalizeList(res.data));
      } catch {
        setError('Failed to load transformers');
      } finally {
        setLoading(false);
      }
    };
    if (token) run();
  }, [token, API_BASE_URL, headers]);

  const withCoords = items.filter(t => typeof t.lat === 'number' && typeof t.lng === 'number');

  if (loading) return <div className="p-4">Loading site map...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Site Map</h2>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <MapContainer
          center={[-19.015, 29.154]}
          zoom={6}
          scrollWheelZoom
          style={{ height: 500, width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {withCoords.map((t) => (
            <CircleMarker
              key={t.id}
              center={[t.lat as number, t.lng as number]}
              radius={6}
              color={t.isActive ? '#22c55e' : '#ef4444'}
              fillColor={t.isActive ? '#22c55e' : '#ef4444'}
              fillOpacity={0.85}
              eventHandlers={{ click: () => setSelected(t) }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-medium">{t.name}</div>
                  <div>Capacity: {typeof t.capacity === 'number' ? t.capacity : '—'}</div>
                  <div>Status: {t.isActive ? 'Active' : 'Inactive'}</div>
                  <div>Lat/Lng: {t.lat}, {t.lng}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {selected && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-gray-500">Name</div>
              <div className="text-sm font-medium text-gray-900">{selected.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Capacity</div>
              <div className="text-sm font-medium text-gray-900">{typeof selected.capacity === 'number' ? selected.capacity : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Depot</div>
              <div className="text-sm font-medium text-gray-900">{selected.depot?.name ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <div className="text-sm font-medium text-gray-900">{selected.isActive ? 'Active' : 'Inactive'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Latitude</div>
              <div className="text-sm font-medium text-gray-900">{selected.lat}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Longitude</div>
              <div className="text-sm font-medium text-gray-900">{selected.lng}</div>
            </div>
          </div>
          <div className="mt-4">
            <a href={`/transformer/${selected.id}`} className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">View details</a>
          </div>
        </div>
      )}
    </div>
  );
}
