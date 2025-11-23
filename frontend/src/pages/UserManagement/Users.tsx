import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from 'axios';

type User = {
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
};

type UserProfile = {
  id: number;
  user: number;
  region: number | null;
  depot: number | null;
  is_national_level: boolean;
  is_region_level: boolean;
  is_depot_level: boolean;
  region_name?: string;
  depot_name?: string;
};

type Region = {
  id: number;
  name: string;
};

type Depot = {
  id: number;
  name: string;
  region: number;
};

type Group = {
  id: number;
  name: string;
};

export default function Users() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const [users, setUsers] = useState<User[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<number, UserProfile>>({});
  const [regions, setRegions] = useState<Region[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    is_active: true,
    is_staff: false,
    groups: [] as number[],
  });

  const [newProfile, setNewProfile] = useState({
    region: null as number | null,
    depot: null as number | null,
    is_national_level: false,
    is_region_level: false,
    is_depot_level: false,
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersResponse = await axios.get(`${API_BASE_URL}/users/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);

      // Fetch user profiles
      const profilesResponse = await axios.get(`${API_BASE_URL}/user-profiles/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Create a map of user_id to profile for quick access
      const profileMap: Record<number, UserProfile> = {};
      profilesResponse.data.forEach((profile: UserProfile) => {
        profileMap[profile.user] = profile;
      });
      setUserProfiles(profileMap);

      // Fetch regions and depots for the form
      const regionsResponse = await axios.get(`${API_BASE_URL}/regions/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setRegions(Array.isArray(regionsResponse.data) ? regionsResponse.data : []);

      const depotsResponse = await axios.get(`${API_BASE_URL}/depots/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setDepots(Array.isArray(depotsResponse.data) ? depotsResponse.data : []);

      // Fetch groups/roles for the form
      const groupsResponse = await axios.get(`${API_BASE_URL}/groups/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setGroups(Array.isArray(groupsResponse.data) ? groupsResponse.data : []);

    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let userResponse;

      if (editingUser) {
        // Update existing user
        userResponse = await axios.patch(`${API_BASE_URL}/users/${editingUser.id}/`, {
          username: newUser.username,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          is_active: newUser.is_active,
          is_staff: newUser.is_staff,
          groups: newUser.groups,
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } else {
        // Create new user
        userResponse = await axios.post(`${API_BASE_URL}/users/`, {
          username: newUser.username,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          password: newUser.password,
          is_active: newUser.is_active,
          is_staff: newUser.is_staff,
          groups: newUser.groups,
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      // Update or create profile
      const userId = editingUser ? editingUser.id : userResponse.data.id;
      const profileData = {
        user: userId,
        region: newProfile.region,
        depot: newProfile.depot,
        is_national_level: newProfile.is_national_level,
        is_region_level: newProfile.is_region_level,
        is_depot_level: newProfile.is_depot_level,
      };

      // Check if profile already exists
      const existingProfile = userProfiles[userId];
      if (existingProfile) {
        // Update existing profile
        await axios.patch(`${API_BASE_URL}/user-profiles/${existingProfile.id}/`, profileData, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } else {
        // Create new profile
        await axios.post(`${API_BASE_URL}/user-profiles/`, profileData, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      // Refresh data
      fetchData();

      // Reset form
      setShowForm(false);
      setEditingUser(null);
      setNewUser({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        is_active: true,
        is_staff: false,
        groups: [],
      });
      setNewProfile({
        region: null,
        depot: null,
        is_national_level: false,
        is_region_level: false,
        is_depot_level: false,
      });

    } catch (err) {
      setError('Failed to save user');
      console.error('Error saving user:', err);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);

    // Pre-fill form with user data
    setNewUser({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: "",
      is_active: user.is_active,
      is_staff: user.is_staff,
      groups: user.groups || [],
    });

    // Pre-fill profile data if exists
    const profile = userProfiles[user.id];
    if (profile) {
      setNewProfile({
        region: profile.region,
        depot: profile.depot,
        is_national_level: profile.is_national_level,
        is_region_level: profile.is_region_level,
        is_depot_level: profile.is_depot_level,
      });
    } else {
      setNewProfile({
        region: null,
        depot: null,
        is_national_level: false,
        is_region_level: false,
        is_depot_level: false,
      });
    }

    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await axios.delete(`${API_BASE_URL}/users/${id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // Remove from state
        setUsers(users.filter(user => user.id !== id));
        const newProfiles = { ...userProfiles };
        delete newProfiles[id];
        setUserProfiles(newProfiles);
      } catch (err) {
        setError('Failed to delete user');
        console.error('Error deleting user:', err);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setNewUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    // Special handling for access level checkboxes
    if (name === 'is_national_level' || name === 'is_region_level' || name === 'is_depot_level') {
      setNewProfile(prev => ({
        ...prev,
        [name]: checked,
        // Reset other access levels if this one is checked
        ...(checked ? {
          is_national_level: name === 'is_national_level' ? true : false,
          is_region_level: name === 'is_region_level' ? true : false,
          is_depot_level: name === 'is_depot_level' ? true : false,
        } : {}),
      }));
    } else {
      setNewProfile(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }));
    }
  };

  if (loading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Users</h2>
        <button
          onClick={() => {
            setEditingUser(null);
            setNewUser({
              username: "",
              email: "",
              first_name: "",
              last_name: "",
              password: "",
              is_active: true,
              is_staff: false,
              groups: [],
            });
            setNewProfile({
              region: null,
              depot: null,
              is_national_level: false,
              is_region_level: false,
              is_depot_level: false,
            });
            setShowForm(true);
          }}
          className="bg-blue-600 text-white rounded px-4 py-2"
        >
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                  User
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Email
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Access Level
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Status
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Roles
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const profile = userProfiles[user.id];
                let accessLevel = 'Limited';
                if (profile?.is_national_level) accessLevel = 'National';
                else if (profile?.is_region_level) accessLevel = 'Region';
                else if (profile?.is_depot_level) accessLevel = 'Depot';

                // Get role names for this user
                const userRoleNames = user.groups?.map(groupId => {
                  const group = groups.find(g => g.id === groupId);
                  return group ? group.name : '';
                }).filter(name => name) || [];

                return (
                  <tr key={user.id} className="border-b border-[#eee] dark:border-strokedark">
                    <td className="py-5 px-4 dark:border-strokedark xl:pl-11">
                      <div className="flex items-center">
                        <p className="text-black dark:text-white">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{user.username}</p>
                      </div>
                    </td>
                    <td className="py-5 px-4 dark:border-strokedark">
                      <p className="text-black dark:text-white">{user.email}</p>
                    </td>
                    <td className="py-5 px-4 dark:border-strokedark">
                      <p className="text-black dark:text-white">
                        {accessLevel}
                        {profile?.region_name && `: ${profile.region_name}`}
                        {profile?.depot_name && `: ${profile.depot_name}`}
                      </p>
                    </td>
                    <td className="py-5 px-4 dark:border-strokedark">
                      <p className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-xs font-medium ${user.is_active ? 'bg-success text-success' : 'bg-danger text-danger'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </td>
                    <td className="py-5 px-4 dark:border-strokedark">
                      <div className="flex flex-wrap gap-1">
                        {userRoleNames.map(role => (
                          <span key={role} className="inline-flex rounded-full bg-purple-100 text-purple-800 text-xs px-2 py-1">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-5 px-4 dark:border-strokedark">
                      <div className="flex items-center space-x-3.5">
                        <button
                          onClick={() => handleEdit(user)}
                          className="hover:text-primary"
                        >
                          <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.625 5.25L12.75 3.375L3.875 12.25H1.75V15.5H5V13.375L13.875 4.5L14.625 5.25ZM12.0547 4.00488L13.9951 3.00464L14.9954 4.94507L13.0549 5.94531L12.0547 4.00488Z" fill="" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="hover:text-danger"
                        >
                          <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.625 5.25L12.75 3.375L3.875 12.25H1.75V15.5H5V13.375L13.875 4.5L14.625 5.25ZM12.0547 4.00488L13.9951 3.00464L14.9954 4.94507L13.0549 5.94531L12.0547 4.00488Z" fill="" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={newUser.username}
                      onChange={handleInputChange}
                      className="w-full rounded border border-stroke bg-gray px-4.5 py-2 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newUser.email}
                      onChange={handleInputChange}
                      className="w-full rounded border border-stroke bg-gray px-4.5 py-2 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={newUser.first_name}
                      onChange={handleInputChange}
                      className="w-full rounded border border-stroke bg-gray px-4.5 py-2 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={newUser.last_name}
                      onChange={handleInputChange}
                      className="w-full rounded border border-stroke bg-gray px-4.5 py-2 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    />
                  </div>

                  {!editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={newUser.password}
                        onChange={handleInputChange}
                        className="w-full rounded border border-stroke bg-gray px-4.5 py-2 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                        required={!editingUser}
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={newUser.is_active}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Active User
                      </label>
                    </div>

                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        name="is_staff"
                        checked={newUser.is_staff}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Staff User (Can Access Admin)
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Roles/Groups
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-auto p-2 border border-gray-300 rounded-md">
                      {groups.map(group => (
                        <label key={group.id} className="flex items-center p-1">
                          <input
                            type="checkbox"
                            checked={newUser.groups.includes(group.id)}
                            onChange={() => {
                              const newGroups = newUser.groups.includes(group.id)
                                ? newUser.groups.filter(id => id !== group.id)
                                : [...newUser.groups, group.id];
                              setNewUser(prev => ({ ...prev, groups: newGroups }));
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{group.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Access Level</h3>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_national_level"
                        checked={newProfile.is_national_level}
                        onChange={handleProfileChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        National Level (Full Access)
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_region_level"
                        checked={newProfile.is_region_level}
                        onChange={handleProfileChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Region Level
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_depot_level"
                        checked={newProfile.is_depot_level}
                        onChange={handleProfileChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Depot Level
                      </label>
                    </div>
                  </div>

                  {/* Conditional region/dept selection */}
                  {newProfile.is_region_level && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Region
                      </label>
                      <select
                        name="region"
                        value={newProfile.region || ''}
                        onChange={handleProfileChange}
                        className="w-full rounded border border-stroke bg-gray px-4.5 py-2 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                      >
                        <option value="">Select Region</option>
                        {regions.map(region => (
                          <option key={region.id} value={region.id}>
                            {region.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {newProfile.is_depot_level && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Depot
                      </label>
                      <select
                        name="depot"
                        value={newProfile.depot || ''}
                        onChange={handleProfileChange}
                        className="w-full rounded border border-stroke bg-gray px-4.5 py-2 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                      >
                        <option value="">Select Depot</option>
                        {depots.map(depot => (
                          <option key={depot.id} value={depot.id}>
                            {depot.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};"export default Users;" 
