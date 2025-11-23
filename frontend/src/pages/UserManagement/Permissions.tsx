import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type Permission = { id: number; name: string; codename: string };

export default function Permissions() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const fetchPermissions = async () => {
    const res = await fetch(`${API_BASE_URL}/permissions/`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPermissions(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchPermissions(); }, [token]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Permissions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {permissions.map(p => (
          <div key={p.id} className="border rounded p-3">
            <div className="font-medium">{p.codename}</div>
            <div className="text-gray-500 text-theme-sm">{p.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}