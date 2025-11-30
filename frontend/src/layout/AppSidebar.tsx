import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";

// Import icons from lucide-react
import {
  Grid,
  MapPinned,
  Warehouse,
  Zap,
  Activity,
  User,
  Calendar,
  FileText,
  Users,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';

interface NavItem {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
}

const navItems: NavItem[] = [
  {
    icon: <Grid className="w-5 h-5" />,
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    icon: <MapPinned className="w-5 h-5" />,
    name: "Regions",
    path: "/regions",
  },
  {
    icon: <MapPinned className="w-5 h-5" />,
    name: "Districts",
    path: "/districts",
  },
  {
    icon: <Warehouse className="w-5 h-5" />,
    name: "Depots",
    path: "/depots",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    name: "Transformers",
    path: "/transformers",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    name: "Sensors",
    path: "/sensors",
  },
  {
    icon: <Users className="w-5 h-5" />,
    name: "User Management",
    path: "/users",
  },
  {
    icon: <User className="w-5 h-5" />,
    name: "Profile",
    path: "/profile",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const isActive = (path: string) => location.pathname === path;

  const toggleSubmenu = (index: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <aside
      className={`fixed left-0 top-0 flex flex-col bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[220px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isExpanded || isMobileOpen ? "" : <MoreHorizontal className="size-6" />}
              </h2>

              <ul className="flex flex-col gap-2">
                {navItems.map((item, index) => (
                  <li key={index}>
                    {item.subItems ? (
                      <button
                        onClick={() => toggleSubmenu(`main-${index}`)}
                        className={`w-full flex items-center py-2 px-3 rounded ${
                          openSubmenus[`main-${index}`]
                            ? "bg-gray-100 text-primary dark:bg-gray-700"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className="mr-3">
                          {item.icon}
                        </span>
                        <span className="flex-1 text-left">
                          {(isExpanded || isMobileOpen) && item.name}
                        </span>
                        {(isExpanded || isMobileOpen) && (
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              openSubmenus[`main-${index}`] ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>
                    ) : (
                      item.path && (
                        <Link
                          to={item.path}
                          className={`flex items-center py-2 px-3 rounded group ${
                            isActive(item.path)
                              ? "bg-blue-600 text-white"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <span className="mr-3">
                            {item.icon}
                          </span>
                          {(isExpanded || isMobileOpen) && (
                            <span>{item.name}</span>
                          )}
                        </Link>
                      )
                    )}
                    {item.subItems && openSubmenus[`main-${index}`] && (
                      <ul className="mt-2 ml-8 space-y-1">
                        {item.subItems.map((subItem, subIndex) => (
                          <li key={subIndex}>
                            <Link
                              to={subItem.path}
                              className={`block py-1.5 px-3 text-sm rounded ${
                                isActive(subItem.path)
                                  ? "bg-blue-500 text-white"
                                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
