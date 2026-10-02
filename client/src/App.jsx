import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Public Pages
import Navbar from "./components/Navbar";
import Home from "./pages/public/Home";
import Login from "./pages/public/Login";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";

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
import TeacherSettings from "./pages/teacher/TeacherSettings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Student/Public Routes */}
        <Route path="/" element={<><Navbar /><Home /></>} />
        <Route path="/login" element={<><Navbar /><Login /></>} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
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
          <Route path="settings" element={<TeacherSettings />} />
        </Route>

        <Route path="*" element={<><Navbar /><Home /></>} />
      </Routes>
    </BrowserRouter>
  );
}