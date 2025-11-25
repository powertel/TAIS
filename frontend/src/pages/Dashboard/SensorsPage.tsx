import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { Activity, Gauge, Thermometer, Zap, Droplets } from 'lucide-react';

interface Sensor {
  id: number;
  name: string;
  sensor_id: string;
  sensor_type: string;
  description: string;
  is_active: boolean;
  transformer_name?: string;
  transformer_id_display?: string;
}

const SensorsPage: React.FC = () => {
  const { token } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/sensors/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSensors(res.data);
      } catch (err) {
        setError('Failed to fetch sensors');
        console.error('Error fetching sensors:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchSensors();
  }, [token]);

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature': return <Thermometer className="w-5 h-5" />;
      case 'oil_level': return <Droplets className="w-5 h-5" />;
      case 'pressure': return <Gauge className="w-5 h-5" />;
      case 'current': return <Zap className="w-5 h-5" />;
      case 'voltage': return <Activity className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">Sensors</h1>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          {loading && <p>Loading sensors...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Sensor</th>
                    <th className="px-4 py-2 text-left font-semibold">Type</th>
                    <th className="px-4 py-2 text-left font-semibold">Transformer</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map((s) => (
                    <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {getSensorIcon(s.sensor_type)}
                          <div>
                            <div className="font-medium text-gray-800">{s.name}</div>
                            <div className="text-xs text-gray-500">ID: {s.sensor_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 capitalize">{s.sensor_type.replace('_', ' ')}</td>
                      <td className="px-4 py-2">
                        <div className="text-gray-700">{s.transformer_name || '—'}</div>
                        {s.transformer_id_display && (
                          <div className="text-xs text-gray-500">{s.transformer_id_display}</div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SensorsPage;