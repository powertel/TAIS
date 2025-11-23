import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

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

export const useUserAccess = () => {
  const { token, user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!token || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get user profile
        const response = await axios.get(`${API_BASE_URL}/user-profiles/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // Find the profile for the current user
        const profile = response.data.find((p: any) => p.user === user.id);
        
        if (profile) {
          setUserProfile(profile);
        } else {
          // If no profile is found, create a basic one
          setUserProfile({
            id: 0,
            user: user.id,
            region: null,
            depot: null,
            is_national_level: false,
            is_region_level: false,
            is_depot_level: false
          });
        }
      } catch (err) {
        setError('Failed to fetch user profile');
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [token, user]);

  const canAccessRegion = (regionId: number) => {
    if (!userProfile) return false;
    
    // National level users can access all regions
    if (userProfile.is_national_level) return true;
    
    // Region level users can access only their assigned region
    if (userProfile.is_region_level) return userProfile.region === regionId;
    
    // Depot level users can access the region of their assigned depot
    if (userProfile.is_depot_level) {
      // This would require additional API call to get the depot's region
      // For now returning false as we don't have this functionality
      return false;
    }
    
    return false;
  };

  const canAccessDepot = (depotId: number) => {
    if (!userProfile) return false;
    
    // National level users can access all depots
    if (userProfile.is_national_level) return true;
    
    // Region level users can access depots in their region
    if (userProfile.is_region_level) {
      // This would require an API call to check if depot belongs to user's region
      // For now returning false as we need to implement this functionality
      return false;
    }
    
    // Depot level users can access only their assigned depot
    if (userProfile.is_depot_level) return userProfile.depot === depotId;
    
    return false;
  };

  const canAccessTransformer = (transformerId: number) => {
    if (!userProfile) return false;
    
    // National level users can access all transformers
    if (userProfile.is_national_level) return true;
    
    // We would need additional API calls to check if transformer is in user's region/depot
    // For now returning based on access level
    return userProfile.is_national_level || 
           userProfile.is_region_level || 
           userProfile.is_depot_level;
  };

  const hasNationalAccess = () => {
    return userProfile?.is_national_level || false;
  };

  const hasRegionAccess = () => {
    return userProfile?.is_region_level || userProfile?.is_national_level || false;
  };

  const hasDepotAccess = () => {
    return userProfile?.is_depot_level || userProfile?.is_region_level || userProfile?.is_national_level || false;
  };

  return {
    userProfile,
    loading,
    error,
    canAccessRegion,
    canAccessDepot,
    canAccessTransformer,
    hasNationalAccess,
    hasRegionAccess,
    hasDepotAccess
  };
};