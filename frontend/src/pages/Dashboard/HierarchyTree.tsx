import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import DashboardLayout from '../DashboardLayout';
import { ChevronRight, ChevronDown, MapPin, Building2, Power, Activity } from 'lucide-react';

interface HierarchyData {
  id: number;
  name: string;
  description?: string;
  depots?: HierarchyDepot[];
  transformers?: HierarchyTransformer[];
  sensor_count?: number;
  is_active?: boolean;
  capacity?: number;
}

interface HierarchyDepot {
  id: number;
  name: string;
  description: string;
  transformers: HierarchyTransformer[];
}

interface HierarchyTransformer {
  id: number;
  name: string;
  transformer_id: string;
  capacity: number;
  is_active: boolean;
  sensor_count: number;
}

const HierarchyTree: React.FC = () => {
  const { token } = useAuth();
  const [hierarchy, setHierarchy] = useState<HierarchyData[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        setLoading(true);

        const response = await axios.get(`${API_BASE_URL}/dashboard/hierarchy/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setHierarchy(response.data);
      } catch (err) {
        setError('Failed to fetch hierarchy data');
        console.error('Error fetching hierarchy:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchHierarchy();
    }
  }, [token]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const renderHierarchy = (items: HierarchyData[], level = 0) => {
    return items.map(item => {
      const nodeId = `node-${level}-${item.id}`;
      const isExpanded = expandedNodes[nodeId] ?? true; // Default to expanded

      return (
        <div key={item.id} className="ml-4">
          <div
            className="flex items-center py-1 hover:bg-gray-100 cursor-pointer"
            onClick={() => toggleNode(nodeId)}
          >
            {item.depots || item.transformers ? (
              <span className="mr-1">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            ) : (
              <span className="w-4 mr-1"></span>
            )}

            <div className="flex items-center">
              {item.depots ? (
                <Building2 className="w-4 h-4 mr-2 text-blue-500" />
              ) : item.transformers ? (
                <Power className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <MapPin className="w-4 h-4 mr-2 text-blue-500" />
              )}

              <span className="font-medium">{item.name}</span>
              {item.sensor_count !== undefined && (
                <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {item.sensor_count} sensors
                </span>
              )}
              {item.capacity !== undefined && (
                <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {item.capacity} MVA
                </span>
              )}
              {item.is_active !== undefined && (
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                  item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>
          </div>

          {isExpanded && item.depots && (
            <div className="ml-4">
              {item.depots.map(depot => (
                <div key={depot.id} className="ml-4">
                  <div
                    className="flex items-center py-1 hover:bg-gray-100 cursor-pointer"
                    onClick={() => toggleNode(`${nodeId}-depot-${depot.id}`)}
                  >
                    <span className="mr-1">
                      {expandedNodes[`${nodeId}-depot-${depot.id}`] ?
                        <ChevronDown size={16} /> :
                        <ChevronRight size={16} />}
                    </span>
                    <div className="flex items-center">
                      <Power className="w-4 h-4 mr-2 text-yellow-500" />
                      <span>{depot.name}</span>
                    </div>
                  </div>

                  {expandedNodes[`${nodeId}-depot-${depot.id}`] && depot.transformers && (
                    <div className="ml-4">
                      {depot.transformers.map(transformer => (
                        <div key={transformer.id} className="flex items-center py-1 ml-4 hover:bg-gray-100">
                          <Activity className="w-4 h-4 mr-2 text-yellow-500" />
                          <span>{transformer.name}</span>
                          <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">
                            {transformer.sensor_count} sensors
                          </span>
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            transformer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {transformer.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isExpanded && item.transformers && (
            <div className="ml-4">
              {item.transformers.map(transformer => (
                <div key={transformer.id} className="flex items-center py-1 ml-4 hover:bg-gray-100">
                  <Activity className="w-4 h-4 mr-2 text-yellow-500" />
                  <span>{transformer.name}</span>
                  <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {transformer.sensor_count} sensors
                  </span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                    transformer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {transformer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Loading hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      {hierarchy.length > 0 ? (
        renderHierarchy(hierarchy)
      ) : (
        <p className="text-gray-500">No hierarchy data available</p>
      )}
    </div>
  );
};

export default HierarchyTree;