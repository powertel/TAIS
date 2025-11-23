import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
};

export default function Users() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{ username: string; email: string; first_name: string; last_name: string; password: string }>({ username: "", email: "", first_name: "", last_name: "", password: "" });
  const [editing, setEditing] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch(`${API_BASE_URL}/users/`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/users/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ username: "", email: "", first_name: "", last_name: "", password: "" });
      fetchUsers();
    }
  };

  const updateUser = async (user: User) => {
    const res = await fetch(`${API_BASE_URL}/users/${user.id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: user.username, email: user.email, first_name: user.first_name, last_name: user.last_name, is_active: user.is_active }),
    });
    if (res.ok) {
      setEditing(null);
      fetchUsers();
    }
  };

  const deleteUser = async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/users/${id}/`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Users</h2>
      <form onSubmit={createUser} className="grid gap-3 grid-cols-1 md:grid-cols-5">
        <input className="border rounded p-2" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
        <input className="border rounded p-2" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input className="border rounded p-2" placeholder="First Name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
        <input className="border rounded p-2" placeholder="Last Name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
        <input className="border rounded p-2" type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <button className="bg-brand-500 text-white rounded p-2 md:col-span-5">Create</button>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">Username</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Active</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-2 border">
                  {editing?.id === u.id ? (
                    <input className="border rounded p-1" value={editing.username} onChange={e => setEditing({ ...editing, username: e.target.value })} />
                  ) : (
                    u.username
                  )}
                </td>
                <td className="p-2 border">
                  {editing?.id === u.id ? (
                    <input className="border rounded p-1" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} />
                  ) : (
                    u.email
                  )}
                </td>
                <td className="p-2 border">
                  {editing?.id === u.id ? (
                    <div className="flex gap-2">
                      <input className="border rounded p-1" value={editing.first_name} onChange={e => setEditing({ ...editing, first_name: e.target.value })} />
                      <input className="border rounded p-1" value={editing.last_name} onChange={e => setEditing({ ...editing, last_name: e.target.value })} />
                    </div>
                  ) : (
                    `${u.first_name} ${u.last_name}`
                  )}
                </td>
                <td className="p-2 border">
                  {editing?.id === u.id ? (
                    <input type="checkbox" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
                  ) : (
                    <span>{u.is_active ? "Yes" : "No"}</span>
                  )}
                </td>
                <td className="p-2 border space-x-2">
                  {editing?.id === u.id ? (
                    <>
                      <button className="px-3 py-1 bg-brand-500 text-white rounded" onClick={() => updateUser(editing)}>Save</button>
                      <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => setEditing(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="px-3 py-1 bg-brand-500 text-white rounded" onClick={() => setEditing(u)}>Edit</button>
                      <button className="px-3 py-1 bg-error-500 text-white rounded" onClick={() => deleteUser(u.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div>Loading...</div>}
    </div>
  );
}