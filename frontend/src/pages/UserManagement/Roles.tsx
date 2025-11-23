import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from 'axios';

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Roles</h2>
      </div>

      <div className="flex gap-2">
        <input
          className="w-full rounded border border-stroke bg-gray px-4.5 py-2 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white flex-grow max-w-md"
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

      <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                  Name
                </th>
                <th className="min-w-[250px] py-4 px-4 font-medium text-black dark:text-white">
                  Permissions
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id} className="border-b border-[#eee] dark:border-strokedark">
                  <td className="py-5 px-4 dark:border-strokedark xl:pl-11">
                    {editing?.id === g.id ? (
                      <input
                        className="w-full rounded border border-stroke bg-gray px-4.5 py-2 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                        value={editing.name}
                        onChange={e => setEditing({ ...editing, name: e.target.value })}
                      />
                    ) : (
                      <p className="text-black dark:text-white">{g.name}</p>
                    )}
                  </td>
                  <td className="py-5 px-4 dark:border-strokedark">
                    {editing?.id === g.id ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto p-2">
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
                      <p className="text-sm text-gray-500">
                        {g.permissions.length} permission{g.permissions.length !== 1 ? 's' : ''} assigned
                      </p>
                    )}
                  </td>
                  <td className="py-5 px-4 dark:border-strokedark">
                    <div className="flex items-center space-x-3.5">
                      {editing?.id === g.id ? (
                        <>
                          <button
                            className="hover:text-primary"
                            onClick={() => updateRole(editing)}
                          >
                            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14.625 5.25L12.75 3.375L3.875 12.25H1.75V15.5H5V13.375L13.875 4.5L14.625 5.25ZM12.0547 4.00488L13.9951 3.00464L14.9954 4.94507L13.0549 5.94531L12.0547 4.00488Z" fill="" />
                            </svg>
                          </button>
                          <button
                            className="hover:text-danger"
                            onClick={() => setEditing(null)}
                          >
                            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14.625 5.25L12.75 3.375L3.875 12.25H1.75V15.5H5V13.375L13.875 4.5L14.625 5.25ZM12.0547 4.00488L13.9951 3.00464L14.9954 4.94507L13.0549 5.94531L12.0547 4.00488Z" fill="" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="hover:text-primary"
                            onClick={() => setEditing(g)}
                          >
                            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14.625 5.25L12.75 3.375L3.875 12.25H1.75V15.5H5V13.375L13.875 4.5L14.625 5.25ZM12.0547 4.00488L13.9951 3.00464L14.9954 4.94507L13.0549 5.94531L12.0547 4.00488Z" fill="" />
                            </svg>
                          </button>
                          <button
                            className="hover:text-danger"
                            onClick={() => deleteRole(g.id)}
                          >
                            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14.625 5.25L12.75 3.375L3.875 12.25H1.75V15.5H5V13.375L13.875 4.5L14.625 5.25ZM12.0547 4.00488L13.9951 3.00464L14.9954 4.94507L13.0549 5.94531L12.0547 4.00488Z" fill="" />
                            </svg>
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
      </div>
    </div>
  );
};