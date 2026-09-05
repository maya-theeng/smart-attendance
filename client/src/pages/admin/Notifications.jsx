import { useState } from "react";
import { Mail, Bell, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import API from "../../api/api";
import "./Students.css";

export default function Notifications() {
  // Daily Absence Notices state
  const [loadingAbsent, setLoadingAbsent] = useState(false);
  const [absentResult, setAbsentResult] = useState(null);
  const [absentError, setAbsentError] = useState("");

  // Low Attendance Warnings state
  const [loadingLow, setLoadingLow] = useState(false);
  const [lowResult, setLowResult] = useState(null);
  const [lowError, setLowError] = useState("");

  const handleSendAbsentWarnings = async () => {
    setLoadingAbsent(true);
    setAbsentResult(null);
    setAbsentError("");
    try {
      const res = await API.post("admin/notifications/send-absent-warnings/");
      setAbsentResult(res.data);
    } catch (err) {
      setAbsentError(
        err.response?.data?.detail ||
          "Failed to send absence notices. Make sure the backend is running."
      );
    } finally {
      setLoadingAbsent(false);
    }
  };

  const handleSendLowAttendanceWarnings = async () => {
    setLoadingLow(true);
    setLowResult(null);
    setLowError("");
    try {
      const res = await API.post(
        "admin/notifications/send-low-attendance-warnings/"
      );
      setLowResult(res.data);
    } catch (err) {
      setLowError(
        err.response?.data?.detail ||
          "Failed to send low-attendance warnings. Make sure the backend is running."
      );
    } finally {
      setLoadingLow(false);
    }
  };

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Notifications</h1>
          <p>Send attendance reports, warnings, and absence notices to students</p>
        </div>
      </header>

      <div
        className="admin-page-content"
        style={{ display: "flex", flexDirection: "column", gap: 24 }}
      >
        {/* ── Daily Absence Notifications ── */}
        <div className="admin-card" style={{ maxWidth: 620 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}
          >
            <Bell size={20} color="#0bc0e4" />
            <h3 style={{ margin: 0 }}>Daily Absence Notifications</h3>
          </div>
          <p style={{ color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
            Notify all students who were marked <strong>absent today</strong>.
            They will receive an in-app notification about the missed class.
          </p>

          <button
            className="admin-btn-primary"
            onClick={handleSendAbsentWarnings}
            disabled={loadingAbsent}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            {loadingAbsent ? (
              "Sending..."
            ) : (
              <>
                <Bell size={18} /> Send Today's Absence Notices
              </>
            )}
          </button>

          {absentResult && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: "#dcfce7",
                color: "#166534",
                borderRadius: 8,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <CheckCircle size={18} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{absentResult.detail}</span>
            </div>
          )}
          {absentError && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: 8,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <XCircle size={18} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{absentError}</span>
            </div>
          )}
        </div>

        {/* ── Low Attendance Warnings ── */}
        <div className="admin-card" style={{ maxWidth: 620 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}
          >
            <AlertTriangle size={20} color="#f59e0b" />
            <h3 style={{ margin: 0 }}>Low Attendance Warnings</h3>
          </div>
          <p style={{ color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
            Scan <strong>all students</strong> across all subjects. Anyone with
            attendance below <strong>75%</strong> will receive an in-app warning
            notification. Duplicates are skipped — each student gets at most one
            warning per subject per day.
          </p>

          <button
            className="admin-btn-primary"
            onClick={handleSendLowAttendanceWarnings}
            disabled={loadingLow}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
            }}
          >
            {loadingLow ? (
              "Scanning students..."
            ) : (
              <>
                <Mail size={18} /> Send Low Attendance Warnings
              </>
            )}
          </button>

          {lowResult && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: "#dcfce7",
                color: "#166534",
                borderRadius: 8,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <CheckCircle size={18} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {lowResult.detail}
                </div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {lowResult.notified} notifications sent ·{" "}
                  {lowResult.skipped} already notified today
                </div>
              </div>
            </div>
          )}
          {lowError && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: 8,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <XCircle size={18} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{lowError}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
