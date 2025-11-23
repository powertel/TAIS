import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from 'axios';
import DashboardLayout from '../../layout/DashboardLayout';

type Group = { id: number; name: string; permissions: number[] };
type Permission = { id: number; name: string; codename: string; content_type: number };

const Roles = () => {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [editing, setEditing] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gRes, pRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/groups/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/permissions/`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setGroups(Array.isArray(gRes.data) ? gRes.data : []);
      setPermissions(Array.isArray(pRes.data) ? pRes.data : []);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const createRole = async () => {
    try {
      await axios.post(`${API_BASE_URL}/groups/`, { name: newRoleName }, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      setNewRoleName("");
      fetchData();
    } catch (err) {
      setError('Failed to create role');
      console.error('Error creating role:', err);
    }
  };

  const updateRole = async (role: Group) => {
    try {
      await axios.put(`${API_BASE_URL}/groups/${role.id}/`, { name: role.name, permissions: role.permissions }, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      setEditing(null);
      fetchData();
    } catch (err) {
      setError('Failed to update role');
      console.error('Error updating role:', err);
    }
  };

  const deleteRole = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      try {
        await axios.delete(`${API_BASE_URL}/groups/${id}/`, { headers: { Authorization: `Bearer ${token}` } });
        fetchData();
      } catch (err) {
        setError('Failed to delete role');
        console.error('Error deleting role:', err);
      }
    }
  };

  const togglePermission = (permId: number) => {
    if (!editing) return;
    const has = editing.permissions.includes(permId);
    const next = has ? editing.permissions.filter(id => id !== permId) : [...editing.permissions, permId];
    setEditing({ ...editing, permissions: next });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading roles...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">Roles Management</h1>
        </div>

        <div className="flex gap-2">
          <input
            className="border rounded p-2 flex-grow max-w-md"
            placeholder="Role name"
            value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white rounded px-4 py-2"
            onClick={createRole}
          >
            Create Role
          </button>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Permissions
                </th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groups.map(g => (
                <tr key={g.id} className="border-t">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editing?.id === g.id ? (
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={editing.name}
                        onChange={e => setEditing({ ...editing, name: e.target.value })}
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{g.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editing?.id === g.id ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto">
                        {permissions.map(p => (
                          <label key={p.id} className="flex items-center gap-2 p-1">
                            <input
                              type="checkbox"
                              checked={editing.permissions.includes(p.id)}
                              onChange={() => togglePermission(p.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{p.codename}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">{g.permissions.length} permissions assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editing?.id === g.id ? (
                      <div className="space-x-2">
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          onClick={() => updateRole(editing)}
                        >
                          Save
                        </button>
                        <button
                          className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="space-x-2">
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          onClick={() => setEditing(g)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          onClick={() => deleteRole(g.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Roles;