import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type Group = { id: number; name: string; permissions: number[] };
type Permission = { id: number; name: string; codename: string };

export default function Roles() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [editing, setEditing] = useState<Group | null>(null);

  const fetchData = async () => {
    const g = await fetch(`${API_BASE_URL}/groups/`, { headers: { Authorization: `Bearer ${token}` } });
    const p = await fetch(`${API_BASE_URL}/permissions/`, { headers: { Authorization: `Bearer ${token}` } });
    const gData = await g.json();
    const pData = await p.json();
    setGroups(Array.isArray(gData) ? gData : []);
    setPermissions(Array.isArray(pData) ? pData : []);
  };

  useEffect(() => { fetchData(); }, [token]);

  const createRole = async () => {
    const res = await fetch(`${API_BASE_URL}/groups/`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: newRoleName }) });
    if (res.ok) { setNewRoleName(""); fetchData(); }
  };

  const updateRole = async (role: Group) => {
    const res = await fetch(`${API_BASE_URL}/groups/${role.id}/`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: role.name, permissions: role.permissions }) });
    if (res.ok) { setEditing(null); fetchData(); }
  };

  const deleteRole = async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/groups/${id}/`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { fetchData(); }
  };

  const togglePermission = (permId: number) => {
    if (!editing) return;
    const has = editing.permissions.includes(permId);
    const next = has ? editing.permissions.filter(id => id !== permId) : [...editing.permissions, permId];
    setEditing({ ...editing, permissions: next });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Roles</h2>
      <div className="flex gap-2">
        <input className="border rounded p-2" placeholder="Role name" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
        <button className="bg-brand-500 text-white rounded px-4" onClick={createRole}>Create</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50"><th className="p-2 border">Name</th><th className="p-2 border">Permissions</th><th className="p-2 border">Actions</th></tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={g.id} className="border-t">
                <td className="p-2 border">
                  {editing?.id === g.id ? (
                    <input className="border rounded p-1" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                  ) : (
                    g.name
                  )}
                </td>
                <td className="p-2 border">
                  {editing?.id === g.id ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto">
                      {permissions.map(p => (
                        <label key={p.id} className="flex items-center gap-2">
                          <input type="checkbox" checked={editing.permissions.includes(p.id)} onChange={() => togglePermission(p.id)} />
                          <span>{p.codename}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <span className="text-theme-sm">{g.permissions.length} assigned</span>
                  )}
                </td>
                <td className="p-2 border space-x-2">
                  {editing?.id === g.id ? (
                    <>
                      <button className="px-3 py-1 bg-brand-500 text-white rounded" onClick={() => updateRole(editing)}>Save</button>
                      <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => setEditing(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="px-3 py-1 bg-brand-500 text-white rounded" onClick={() => setEditing(g)}>Edit</button>
                      <button className="px-3 py-1 bg-error-500 text-white rounded" onClick={() => deleteRole(g.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}