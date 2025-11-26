import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

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

export default function HierarchyTree() {
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
            className="flex items-center py-1 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-700"
            onClick={() => toggleNode(nodeId)}
          >
            {item.depots || item.transformers ? (
              <span className="mr-1">
                {isExpanded ?
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg> :
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                }
              </span>
            ) : (
              <span className="w-4 mr-1"></span>
            )}

            <div className="flex items-center">
              {item.depots ? (
                <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              ) : item.transformers ? (
                <svg className="w-4 h-4 mr-2 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.002 4.002 0 003 15z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              )}

              <span className="font-medium text-black dark:text-white">{item.name}</span>
              {item.sensor_count !== undefined && (
                <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full dark:bg-gray-700">
                  {item.sensor_count} sensors
                </span>
              )}
              {item.capacity !== undefined && (
                <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full dark:bg-gray-700">
                  {item.capacity} MVA
                </span>
              )}
              {item.is_active !== undefined && (
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                  item.is_active ? 'bg-success text-white' : 'bg-danger text-white'
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
                    className="flex items-center py-1 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-700"
                    onClick={() => toggleNode(`${nodeId}-depot-${depot.id}`)}
                  >
                    <span className="mr-1">
                      {expandedNodes[`${nodeId}-depot-${depot.id}`] ?
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg> :
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      }
                    </span>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.002 4.002 0 003 15z"></path>
                      </svg>
                      <span className="text-black dark:text-white">{depot.name}</span>
                    </div>
                  </div>

                  {expandedNodes[`${nodeId}-depot-${depot.id}`] && depot.transformers && (
                    <div className="ml-4">
                      {depot.transformers.map(transformer => (
                        <div key={transformer.id} className="flex items-center py-1 ml-4 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <svg className="w-4 h-4 mr-2 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                          </svg>
                          <span className="text-black dark:text-white">{transformer.name}</span>
                          <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full dark:bg-gray-700">
                            {transformer.sensor_count} sensors
                          </span>
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            transformer.is_active ? 'bg-success text-white' : 'bg-danger text-white'
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
                <div key={transformer.id} className="flex items-center py-1 ml-4 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <svg className="w-4 h-4 mr-2 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  <span className="text-black dark:text-white">{transformer.name}</span>
                  <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full dark:bg-gray-700">
                    {transformer.sensor_count} sensors
                  </span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                    transformer.is_active ? 'bg-success text-white' : 'bg-danger text-white'
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
        <p className="text-gray-500 dark:text-gray-400">No hierarchy data available</p>
      )}
    </div>
  );
};