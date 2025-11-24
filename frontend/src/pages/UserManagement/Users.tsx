import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from 'axios';
import type { AxiosError } from 'axios';

// Types
interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  is_staff: boolean;
  is_superuser: boolean;
  groups: number[];
}

interface UserProfile {
  id: number;
  user: number;
  region: number | null;
  depot: number | null;
  is_national_level: boolean;
  is_region_level: boolean;
  is_depot_level: boolean;
  region_name?: string;
  depot_name?: string;
}

interface Region {
  id: number;
  name: string;
}

interface Depot {
  id: number;
  name: string;
  region: number;
}

interface Group {
  id: number;
  name: string;
}

interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_active: boolean;
  is_staff: boolean;
  groups: number[];
}

interface ProfileFormData {
  region: number | null;
  depot: number | null;
  is_national_level: boolean;
  is_region_level: boolean;
  is_depot_level: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const ITEMS_PER_PAGE = 10;

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<number, UserProfile>>({});
  const [regions, setRegions] = useState<Region[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    is_active: true,
    is_staff: false,
    groups: [],
  });

  const [profileData, setProfileData] = useState<ProfileFormData>({
    region: null,
    depot: null,
    is_national_level: false,
    is_region_level: false,
    is_depot_level: false,
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = { Authorization: `Bearer ${token}` };
      
      const [
        usersRes,
        profilesRes,
        regionsRes,
        depotsRes,
        groupsRes
      ] = await Promise.all([
        axios.get<User[]>(`${API_BASE_URL}/users/`, { headers }),
        axios.get<UserProfile[]>(`${API_BASE_URL}/user-profiles/`, { headers }),
        axios.get<Region[]>(`${API_BASE_URL}/regions/`, { headers }),
        axios.get<Depot[]>(`${API_BASE_URL}/depots/`, { headers }),
        axios.get<Group[]>(`${API_BASE_URL}/groups/`, { headers })
      ]);

      setUsers(usersRes.data);
      setUserProfiles(
        profilesRes.data.reduce((acc, profile) => ({ ...acc, [profile.user]: profile }), {})
      );
      setRegions(regionsRes.data);
      setDepots(depotsRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      const error = err as AxiosError;
      setError(error.message || 'Failed to fetch data');
      console.error('Error fetching data:', error);
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
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.first_name?.toLowerCase().includes(query) ?? false) ||
      (user.last_name?.toLowerCase().includes(query) ?? false) ||
      (user.is_active ? 'active' : 'inactive').includes(query) ||
      (user.is_staff ? 'staff' : '').includes(query)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Form handlers
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setProfileData(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }));
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: '',
      is_active: user.is_active,
      is_staff: user.is_staff,
      groups: [...user.groups],
    });

    const userProfile = userProfiles[user.id];
    if (userProfile) {
      setProfileData({
        region: userProfile.region,
        depot: userProfile.depot,
        is_national_level: userProfile.is_national_level,
        is_region_level: userProfile.is_region_level,
        is_depot_level: userProfile.is_depot_level,
      });
    }

    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      let userResponse;
      const userPayload = {
        ...formData,
        groups: formData.groups
      };

      if (editingUser) {
        // Update existing user
        userResponse = await axios.patch(
          `${API_BASE_URL}/users/${editingUser.id}/`,
          userPayload,
          { headers }
        );
      } else {
        // Create new user
        userResponse = await axios.post(
          `${API_BASE_URL}/users/`,
          userPayload,
          { headers }
        );
      }

      // Handle user profile
      const userId = userResponse.data.id;
      const profilePayload = {
        user: userId,
        ...profileData,
        region: profileData.region || null,
        depot: profileData.depot || null,
      };

      const existingProfile = Object.values(userProfiles).find(
        p => p.user === userId
      );

      if (existingProfile) {
        await axios.patch(
          `${API_BASE_URL}/user-profiles/${existingProfile.id}/`,
          profilePayload,
          { headers }
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/user-profiles/`,
          profilePayload,
          { headers }
        );
      }

      // Refresh data and reset form
      await fetchData();
      resetForm();
      setShowForm(false);
    } catch (err) {
      const error = err as AxiosError;
      setError(error.message || 'Failed to save user');
      console.error('Error saving user:', error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/users/${userId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData();
    } catch (err) {
      const error = err as AxiosError;
      setError(error.message || 'Failed to delete user');
      console.error('Error deleting user:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      is_active: true,
      is_staff: false,
      groups: [],
    });
    setProfileData({
      region: null,
      depot: null,
      is_national_level: false,
      is_region_level: false,
      is_depot_level: false,
    });
    setEditingUser(null);
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
          
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add User
          </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => {
                const profile = userProfiles[user.id];
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {user.is_superuser ? 'Admin' : user.is_staff ? 'Staff' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
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

      {/* Add/Edit User Modal */}
      {showForm && (
        <div className="fixed inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowForm(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {editingUser ? 'Edit User' : 'Create New User'}
                      </h3>
                      <div className="mt-5 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        {/* Username */}
                        <div className="sm:col-span-3">
                          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                            Username *
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="username"
                              id="username"
                              required
                              value={formData.username}
                              onChange={handleFormChange}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="sm:col-span-3">
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email *
                          </label>
                          <div className="mt-1">
                            <input
                              type="email"
                              name="email"
                              id="email"
                              required
                              value={formData.email}
                              onChange={handleFormChange}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        {/* First Name */}
                        <div className="sm:col-span-3">
                          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                            First Name
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="first_name"
                              id="first_name"
                              value={formData.first_name}
                              onChange={handleFormChange}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        {/* Last Name */}
                        <div className="sm:col-span-3">
                          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                            Last Name
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="last_name"
                              id="last_name"
                              value={formData.last_name}
                              onChange={handleFormChange}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        {/* Password - only show for new users */}
                        {!editingUser && (
                          <div className="sm:col-span-6">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                              Password {!editingUser && '*'}
                            </label>
                            <div className="mt-1">
                              <input
                                type="password"
                                name="password"
                                id="password"
                                required={!editingUser}
                                value={formData.password}
                                onChange={handleFormChange}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                          </div>
                        )}

                        {/* Status */}
                        <div className="sm:col-span-3">
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center">
                              <input
                                id="is_active"
                                name="is_active"
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={handleFormChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                                Active
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="is_staff"
                                name="is_staff"
                                type="checkbox"
                                checked={formData.is_staff}
                                onChange={handleFormChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor="is_staff" className="ml-2 block text-sm text-gray-700">
                                Staff status
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Groups/Roles */}
                        <div className="sm:col-span-3">
                          <label className="block text-sm font-medium text-gray-700">Roles</label>
                          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-2 border rounded">
                            {groups.map((group) => (
                              <div key={group.id} className="flex items-center">
                                <input
                                  id={`group-${group.id}`}
                                  name="groups"
                                  type="checkbox"
                                  checked={formData.groups.includes(group.id)}
                                  onChange={(e) => {
                                    const { checked } = e.target;
                                    setFormData(prev => ({
                                      ...prev,
                                      groups: checked
                                        ? [...prev.groups, group.id]
                                        : prev.groups.filter(id => id !== group.id)
                                    }));
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`group-${group.id}`} className="ml-2 block text-sm text-gray-700">
                                  {group.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* User Profile Section */}
                        <div className="sm:col-span-6 border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-4">User Profile</h4>
                          
                          {/* Access Level */}
                          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3 mb-4">
                            <div className="flex items-center">
                              <input
                                id="is_national_level"
                                name="is_national_level"
                                type="checkbox"
                                checked={profileData.is_national_level}
                                onChange={handleProfileChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor="is_national_level" className="ml-2 block text-sm text-gray-700">
                                National Level
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="is_region_level"
                                name="is_region_level"
                                type="checkbox"
                                checked={profileData.is_region_level}
                                onChange={handleProfileChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor="is_region_level" className="ml-2 block text-sm text-gray-700">
                                Region Level
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="is_depot_level"
                                name="is_depot_level"
                                type="checkbox"
                                checked={profileData.is_depot_level}
                                onChange={handleProfileChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor="is_depot_level" className="ml-2 block text-sm text-gray-700">
                                Depot Level
                              </label>
                            </div>
                          </div>

                          {/* Region and Depot Selection */}
                          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            {/* Region */}
                            <div>
                              <label htmlFor="region" className="block text-sm font-medium text-gray-700">
                                Region
                              </label>
                              <select
                                id="region"
                                name="region"
                                value={profileData.region || ''}
                                onChange={handleProfileChange}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                              >
                                <option value="">Select a region</option>
                                {regions.map((region) => (
                                  <option key={region.id} value={region.id}>
                                    {region.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Depot - filtered by selected region */}
                            <div>
                              <label htmlFor="depot" className="block text-sm font-medium text-gray-700">
                                Depot
                              </label>
                              <select
                                id="depot"
                                name="depot"
                                value={profileData.depot || ''}
                                onChange={handleProfileChange}
                                disabled={!profileData.region}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-50"
                              >
                                <option value="">Select a depot</option>
                                {depots
                                  .filter((depot) => depot.region === profileData.region)
                                  .map((depot) => (
                                    <option key={depot.id} value={depot.id}>
                                      {depot.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
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
    </div>
  );
}