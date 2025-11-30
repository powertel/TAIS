import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from 'axios';
import type { AxiosError } from 'axios';
import Alert from '../../components/ui/alert/Alert';
import { Modal } from '../../components/ui/modal';

interface User {
  id: number;
  firstname?: string;
  lastname?: string;
  email: string;
  phone?: string;
  role?: string;
  region?: string;
  district?: string;
  depot?: string;
}

 

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const ITEMS_PER_PAGE = 10;

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [active, setActive] = useState<User | null>(null);
  const [firstnameInput, setFirstnameInput] = useState('');
  const [lastnameInput, setLastnameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [regionInput, setRegionInput] = useState('');
  const [districtInput, setDistrictInput] = useState('');
  const [depotInput, setDepotInput] = useState('');
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ variant: 'success' | 'error' | 'info' | 'warning'; title: string; message: string } | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);

  

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = { Authorization: `Bearer ${token}` };
      const usersRes = await axios.get<User[]>(`${API_BASE_URL}/api/v1/auth/users`, { headers });
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data ?? []));
    } catch (err) {
      const error = err as AxiosError;
      setError(error.message || 'Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter and paginate users
  const filteredUsers = users.filter(user => {
    const query = search.toLowerCase();
    if (!query) return true;
    return (
      (user.firstname?.toLowerCase().includes(query) ?? false) ||
      (user.lastname?.toLowerCase().includes(query) ?? false) ||
      user.email.toLowerCase().includes(query) ||
      (user.phone?.toLowerCase().includes(query) ?? false) ||
      (user.role?.toLowerCase().includes(query) ?? false) ||
      (user.region?.toLowerCase().includes(query) ?? false) ||
      (user.district?.toLowerCase().includes(query) ?? false) ||
      (user.depot?.toLowerCase().includes(query) ?? false)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Form handlers
  

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setActive(user);
    setFirstnameInput(user.firstname ?? '');
    setLastnameInput(user.lastname ?? '');
    setEmailInput(user.email ?? '');
    setPhoneInput(user.phone ?? '');
    setRoleInput(user.role ?? '');
    setRegionInput(user.region ?? '');
    setDistrictInput(user.district ?? '');
    setDepotInput(user.depot ?? '');
    setFormError(null);
    setShowEdit(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!firstnameInput.trim()) { setFormError('Enter first name'); return; }
      if (!lastnameInput.trim()) { setFormError('Enter last name'); return; }
      if (!emailInput.trim()) { setFormError('Enter email'); return; }
      setSavingCreate(true);
      setFormError(null);
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
        firstname: firstnameInput.trim(),
        lastname: lastnameInput.trim(),
        email: emailInput.trim(),
        phone: phoneInput.trim(),
        role: roleInput.trim(),
        region: regionInput.trim(),
        district: districtInput.trim(),
        depot: depotInput.trim(),
      }, { headers });
      setShowCreate(false);
      setFirstnameInput('');
      setLastnameInput('');
      setEmailInput('');
      setPhoneInput('');
      setRoleInput('');
      setRegionInput('');
      setDistrictInput('');
      setDepotInput('');
      await fetchData();
      setNotice({ variant: 'success', title: 'User created', message: 'The user was created successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to create user');
      setNotice({ variant: 'error', title: 'Create failed', message: 'Could not create the user.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingCreate(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!active) return;
      if (!firstnameInput.trim()) { setFormError('Enter first name'); return; }
      if (!lastnameInput.trim()) { setFormError('Enter last name'); return; }
      if (!emailInput.trim()) { setFormError('Enter email'); return; }
      setSavingEdit(true);
      setFormError(null);
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      await axios.put(`${API_BASE_URL}/api/v1/auth/update/id/${active.id}`, {
        firstname: firstnameInput.trim(),
        lastname: lastnameInput.trim(),
        email: emailInput.trim(),
        phone: phoneInput.trim(),
        role: roleInput.trim(),
        region: regionInput.trim(),
        district: districtInput.trim(),
        depot: depotInput.trim(),
      }, { headers });
      setShowEdit(false);
      setActive(null);
      setFirstnameInput('');
      setLastnameInput('');
      setEmailInput('');
      setPhoneInput('');
      setRoleInput('');
      setRegionInput('');
      setDistrictInput('');
      setDepotInput('');
      await fetchData();
      setNotice({ variant: 'success', title: 'User updated', message: 'Changes were saved successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setFormError('Failed to update user');
      setNotice({ variant: 'error', title: 'Update failed', message: 'Could not update the user.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingEdit(false);
    }
  };

  

  // Delete action removed: no delete endpoint provided

  

  const openChangePassword = (user: User) => {
    setPasswordTarget(user);
    setCurrentPassword('');
    setNewPassword('');
    setShowChangePassword(true);
  };

  const submitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/v1/auth/change-password/${passwordTarget.email}/${encodeURIComponent(currentPassword)}/${encodeURIComponent(newPassword)}`, null, { headers });
      setShowChangePassword(false);
      setPasswordTarget(null);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      const error = err as AxiosError;
      setError(error.message || 'Failed to change password');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-100 rounded-md">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <Alert variant={notice.variant} title={notice.title} message={notice.message} />
      )}
      {/* Header and search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'User' : 'Users'}
          </span>
        </div>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          
          <button onClick={() => {
            setFirstnameInput('');
            setLastnameInput('');
            setEmailInput('');
            setPhoneInput('');
            setRoleInput('');
            setRegionInput('');
            setDistrictInput('');
            setDepotInput('');
            setActive(null);
            setFormError(null);
            setShowCreate(true);
          }} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Add User</button>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => {
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.firstname ?? ''} {user.lastname ?? ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => { setActive(user); setShowView(true); }} className="text-gray-700 hover:text-gray-900 mr-4">View</button>
                      <button onClick={() => handleEditUser(user)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                      <button onClick={() => openChangePassword(user)} className="text-gray-700 hover:text-gray-900">Change Password</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(page * ITEMS_PER_PAGE, filteredUsers.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredUsers.length}</span> results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">First</span>
                    &laquo;
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">Last</span>
                    &raquo;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {false && (
        <div className="fixed inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" aria-hidden="true" onClick={() => { setShowCreate(false); setShowEdit(false); }}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <form onSubmit={editingUser ? submitEdit : submitCreate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {editingUser ? 'Edit User' : 'Create New User'}
                      </h3>
                      <div className="mt-5 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                          <label htmlFor="firstname" className="block text-sm font-medium text-gray-700">First Name *</label>
                          <div className="mt-1">
                            <input type="text" name="firstname" id="firstname" required value={firstnameInput} onChange={(e) => setFirstnameInput(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                          </div>
                        </div>
                        {formError && (
                          <div className="sm:col-span-6 text-xs text-red-600">{formError}</div>
                        )}

                        {/* Email */}
                        <div className="sm:col-span-3">
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email *
                          </label>
                          <div className="mt-1">
                            <input type="email" name="email" id="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="lastname" className="block text-sm font-medium text-gray-700">Last Name *</label>
                          <div className="mt-1">
                            <input type="text" name="lastname" id="lastname" required value={lastnameInput} onChange={(e) => setLastnameInput(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                          <div className="mt-1">
                            <input type="text" name="phone" id="phone" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                          </div>
                        </div>

                        

                        

                        

                        
                        <div className="sm:col-span-3">
                          <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                          <div className="mt-1">
                            <select name="role" id="role" value={roleInput} onChange={(e) => setRoleInput(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md">
                              <option value="">Select role</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="USER">USER</option>
                            </select>
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <label htmlFor="region" className="block text-sm font-medium text-gray-700">Region</label>
                          <div className="mt-1">
                            <input type="text" name="region" id="region" value={regionInput} onChange={(e) => setRegionInput(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <label htmlFor="district" className="block text-sm font-medium text-gray-700">District</label>
                          <div className="mt-1">
                            <input type="text" name="district" id="district" value={districtInput} onChange={(e) => setDistrictInput(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <label htmlFor="depot" className="block text-sm font-medium text-gray-700">Depot</label>
                          <div className="mt-1">
                            <input type="text" name="depot" id="depot" value={depotInput} onChange={(e) => setDepotInput(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" disabled={editingUser ? savingEdit : savingCreate} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">{editingUser ? 'Update' : 'Create'}</button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setShowEdit(false); }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <Modal isOpen={showCreate || showEdit} onClose={() => { setShowCreate(false); setShowEdit(false); }} className="max-w-3xl w-full p-6" overlayClassName="bg-black/60" backdropBlur={false}>
        <form onSubmit={editingUser ? submitEdit : submitCreate}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">{editingUser ? 'Edit User' : 'Create New User'}</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="firstname" className="block text-sm font-medium text-gray-700">First Name *</label>
                <input type="text" name="firstname" id="firstname" placeholder="Enter first name" required value={firstnameInput} onChange={(e) => setFirstnameInput(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="lastname" className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input type="text" name="lastname" id="lastname" placeholder="Enter last name" required value={lastnameInput} onChange={(e) => setLastnameInput(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
                <input type="email" name="email" id="email" placeholder="Enter email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="text" name="phone" id="phone" placeholder="Enter phone" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                <select name="role" id="role" value={roleInput} onChange={(e) => setRoleInput(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm">
                  <option value="">Select role</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="region" className="block text-sm font-medium text-gray-700">Region</label>
                <input type="text" name="region" id="region" placeholder="Enter region" value={regionInput} onChange={(e) => setRegionInput(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="district" className="block text-sm font-medium text-gray-700">District</label>
                <input type="text" name="district" id="district" placeholder="Enter district" value={districtInput} onChange={(e) => setDistrictInput(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="depot" className="block text-sm font-medium text-gray-700">Depot</label>
                <input type="text" name="depot" id="depot" placeholder="Enter depot" value={depotInput} onChange={(e) => setDepotInput(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
              </div>
              {formError && (
                <div className="sm:col-span-6 text-xs text-red-600">{formError}</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowCreate(false); setShowEdit(false); }} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
              <button type="submit" disabled={editingUser ? savingEdit : savingCreate} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{editingUser ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </form>
      </Modal>

      {false && (
        <div className="fixed inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" aria-hidden="true" onClick={() => setShowChangePassword(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <form onSubmit={submitChangePassword}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Change Password</h3>
                      <div className="mt-5 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Current Password</label>
                          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">New Password</label>
                          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">Update Password</button>
                  <button type="button" onClick={() => setShowChangePassword(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <Modal isOpen={showChangePassword && !!passwordTarget} onClose={() => setShowChangePassword(false)} className="max-w-md w-full p-6" overlayClassName="bg-black/60" backdropBlur={false}>
        <form onSubmit={submitChangePassword}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowChangePassword(false)} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>
              <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Update Password</button>
            </div>
          </div>
        </form>
      </Modal>

      {false && (
        <div className="fixed inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" aria-hidden="true" onClick={() => setShowView(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">User Details</h3>
                    <div className="mt-5 space-y-3 text-sm text-gray-700">
                      <div><span className="font-medium">Name:</span> {(active.firstname ?? '')} {(active.lastname ?? '')}</div>
                      <div><span className="font-medium">Email:</span> {active.email}</div>
                      <div><span className="font-medium">Phone:</span> {active.phone ?? '—'}</div>
                      <div><span className="font-medium">Role:</span> {active.role ?? '—'}</div>
                      <div><span className="font-medium">Region:</span> {active.region ?? '—'}</div>
                      <div><span className="font-medium">District:</span> {active.district ?? '—'}</div>
                      <div><span className="font-medium">Depot:</span> {active.depot ?? '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" onClick={() => setShowView(false)} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Modal isOpen={showView && !!active} onClose={() => setShowView(false)} className="max-w-md w-full p-6" overlayClassName="bg-black/60" backdropBlur={false}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">User Details</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="text-xs text-gray-500">Name</div>
              <div className="text-sm font-medium text-gray-900">{(active?.firstname ?? '')} {(active?.lastname ?? '')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Email</div>
              <div className="text-sm font-medium text-gray-900">{active?.email ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Phone</div>
              <div className="text-sm font-medium text-gray-900">{active?.phone ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Role</div>
              <div className="text-sm font-medium text-gray-900">{active?.role ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Region</div>
              <div className="text-sm font-medium text-gray-900">{active?.region ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">District</div>
              <div className="text-sm font-medium text-gray-900">{active?.district ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Depot</div>
              <div className="text-sm font-medium text-gray-900">{active?.depot ?? '—'}</div>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowView(false)} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Close</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
