import { useState, useEffect } from "react";
import API from "../../api/api";
import "../admin/Students.css";
import "../admin/AdminLayout.css";

export default function TeacherSettings() {
  const [profile, setProfile] = useState({
    name:  sessionStorage.getItem("teacher_name") || "Teacher",
    email: sessionStorage.getItem("teacher_email") || "",
    employee_id: "",
    department: "",
    specialty: "",
  });

  const [pwdData, setPwdData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  useEffect(() => {
    API.get("teacher/profile/")
      .then((res) => setProfile(res.data))
      .catch(() => {});
  }, []);

  const handlePwdChange = (e) => setPwdData({ ...pwdData, [e.target.name]: e.target.value });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg("");

    if (pwdData.newPassword !== pwdData.confirmPassword) {
      setPwdMsg("New passwords do not match.");
      return;
    }

    setPwdLoading(true);
    try {
      await API.post("auth/change-password/", {
        old_password: pwdData.oldPassword,
        new_password: pwdData.newPassword,
      });
      setPwdMsg("Success! Password updated successfully.");
      setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwdMsg(err.response?.data?.detail || "Failed to update password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: 12, border: "1px solid #e8f0f7",
    borderRadius: 8, outline: "none", fontSize: 14,
    background: "#f9fdff", boxSizing: "border-box", fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block", fontSize: 13, color: "#6b8caa",
    marginBottom: 6, fontWeight: 500,
  };

  const profileRows = [
    { label: "Full Name",    value: profile.name },
    { label: "Email",        value: profile.email },
    { label: "Employee ID",  value: profile.employee_id },
    { label: "Department",   value: profile.department },
    { label: "Specialty",    value: profile.specialty },
  ];

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account and security preferences</p>
        </div>
      </header>

      <div className="admin-page-content">
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* Teacher Profile */}
          <div className="admin-card" style={{ flex: 1, minWidth: 280 }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a3d5c" }}>Teacher Profile</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Your registered information</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {profileRows.map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f0fcff" }}>
                  <span style={{ fontSize: 13, color: "#6b8caa", fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 14, color: "#1e293b", fontWeight: 600 }}>{item.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Change Password */}
          <div className="admin-card" style={{ flex: 1, minWidth: 280 }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a3d5c" }}>Security &amp; Password</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Update your account password</p>
            </div>
            <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input type="password" name="oldPassword" value={pwdData.oldPassword}
                  onChange={handlePwdChange} placeholder="Enter current password"
                  required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>New Password</label>
                <input type="password" name="newPassword" value={pwdData.newPassword}
                  onChange={handlePwdChange} placeholder="Must be at least 6 characters"
                  required minLength="6" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input type="password" name="confirmPassword" value={pwdData.confirmPassword}
                  onChange={handlePwdChange} placeholder="Re-enter new password"
                  required style={inputStyle} />
              </div>

              {pwdMsg && (
                <div style={{
                  padding: 12, borderRadius: 8, fontSize: 14,
                  background: pwdMsg.includes("Success") ? "#d1fae5" : "#fee2e2",
                  color:      pwdMsg.includes("Success") ? "#065f46"  : "#991b1b",
                }}>
                  {pwdMsg}
                </div>
              )}

              <button type="submit" disabled={pwdLoading} style={{
                marginTop: 8, background: "#0bc0e4", color: "#fff", border: "none",
                padding: 12, borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s ease",
                opacity: pwdLoading ? 0.7 : 1, fontFamily: "inherit",
              }}>
                {pwdLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}
