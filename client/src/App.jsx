import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Students from "./pages/admin/Students";
import TakeAttendance from "./pages/admin/TakeAttendance";
import AttendanceRecords from "./pages/admin/AttendanceRecords";
import Subjects from "./pages/admin/Subjects";
import Courses from "./pages/admin/Courses";
import Teachers from "./pages/admin/Teachers";
import Notifications from "./pages/admin/Notifications";
import Settings from "./pages/admin/Settings";

// Teacher Pages
import TeacherLayout from "./pages/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Student/Public Routes */}
        <Route path="/" element={<><Navbar /><Home /></>} />
        <Route path="/login" element={<><Navbar /><Login /></>} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="take-attendance" element={<TakeAttendance />} />
          <Route path="records" element={<AttendanceRecords />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="courses" element={<Courses />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="take-attendance" element={<TakeAttendance />} />
          <Route path="records" element={<AttendanceRecords />} />
          <Route path="subjects" element={<Subjects />} />
        </Route>

        <Route path="*" element={<><Navbar /><Home /></>} />
      </Routes>
    </BrowserRouter>
  );
}