import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Users from "./pages/UserManagement/Users";
import Roles from "./pages/UserManagement/Roles";
import Permissions from "./pages/UserManagement/Permissions";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import ItemList from "./components/ItemList";
import RequirePermission from "./components/RequirePermission";

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? (
    <Routes>
      <Route
        path="/"
        element={
          <PermissionProvider>
            <AppLayout />
          </PermissionProvider>
        }
      >
        <Route index element={<Home />} />
        <Route path="signin" element={<Navigate to="/" replace />} />
        <Route path="signup" element={<Navigate to="/" replace />} />
        <Route path="profile" element={<UserProfiles />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="blank" element={<Blank />} />
        <Route path="form-elements" element={<FormElements />} />
        <Route path="basic-tables" element={<BasicTables />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="avatars" element={<Avatars />} />
        <Route path="badge" element={<Badges />} />
        <Route path="buttons" element={<Buttons />} />
        <Route path="images" element={<Images />} />
        <Route path="videos" element={<Videos />} />
        <Route path="line-chart" element={<LineChart />} />
        <Route path="bar-chart" element={<BarChart />} />
        <Route
          path="items"
          element={
            <ProtectedRoute>
              <RequirePermission permission="api.view_item">
                <ItemList />
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute>
              <RequirePermission permission="auth.view_user">
                <Users />
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="roles"
          element={
            <ProtectedRoute>
              <RequirePermission permission="auth.view_group">
                <Roles />
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="permissions"
          element={
            <ProtectedRoute>
              <RequirePermission permission="auth.view_permission">
                <Permissions />
              </RequirePermission>
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  ) : (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="*" element={<Navigate to="/signin" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
