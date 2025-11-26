import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from 'axios';
import { Link } from 'react-router-dom';

type Group = { id: number; name: string; permissions: number[] };
type Permission = { id: number; name: string; codename: string; content_type: number };

export default function Roles() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [editing, setEditing] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState('');

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
    return <div className="p-4">Loading roles...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  const filteredGroups = groups.filter(group => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (group.name && group.name.toLowerCase().includes(q)) ||
      (group.permissions && group.permissions.length.toString().includes(q)) ||
      (permissions.some(p => p.id === group.permissions[0]) && 
        permissions.find(p => p.id === group.permissions[0])?.codename.toLowerCase().includes(q))
    );
  });

  const paginatedGroups = filteredGroups.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-black dark:text-white">Roles</h2>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {filteredGroups.length} Total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search roles..."
            className="w-56 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          />
          <div className="flex gap-2">
            <input
              className="w-48 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="New role name"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
            />
            <button
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={createRole}
              disabled={!newRoleName.trim()}
            >
              Create Role
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Role Name</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Permissions</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGroups.map(group => (
                <tr key={group.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                  <td className="px-4 py-3">
                    {editing?.id === group.id ? (
                      <input
                        type="text"
                        value={editing.name}
                        onChange={e => setEditing({ ...editing, name: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                      />
                    ) : (
                      <div className="font-medium text-gray-900 dark:text-white">{group.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing?.id === group.id ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto p-2 border border-gray-200 dark:border-gray-700 rounded-md">
                        {permissions.map(permission => (
                          <label key={permission.id} className="flex items-start">
                            <div className="flex h-5 items-center">
                              <input
                                type="checkbox"
                                checked={editing.permissions.includes(permission.id)}
                                onChange={() => togglePermission(permission.id)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                              />
                            </div>
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              {permission.codename}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {group.permissions.length} permission{group.permissions.length !== 1 ? 's' : ''}
                        </span>
                        {group.permissions.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {group.permissions.map((permId, i) => {
                              const perm = permissions.find(p => p.id === permId);
                              return perm ? (
                                <span key={perm.id}>
                                  {perm.codename}
                                  {i < group.permissions.length - 1 ? ', ' : ''}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editing?.id === group.id ? (
                        <>
                          <button
                            onClick={() => updateRole(editing)}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditing(group)}
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRole(group.id)}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Page {page} of {Math.max(1, Math.ceil(filteredGroups.length / pageSize))}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              disabled={page >= Math.max(1, Math.ceil(filteredGroups.length / pageSize))}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};