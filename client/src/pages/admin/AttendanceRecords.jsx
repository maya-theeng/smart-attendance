import { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Calendar, 
  Download, 
  Trash2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  UserCheck, 
  UserX, 
  Percent,
  RotateCcw
} from "lucide-react";
import API from "../../api/api";
import "./Students.css";
import "./AttendanceRecords.css";

export default function AttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "Present" | "Absent"
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [quickDate, setQuickDate] = useState("all"); // "all" | "today" | "yesterday" | "week"

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Status message / toast
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const role = sessionStorage.getItem("role"); // "admin" | "teacher"
  const endpoint = "admin/attendance/records/";

  const fetchRecords = () => {
    API.get(endpoint)
      .then((res) => {
        setRecords(res.data);
      })
      .catch((err) => {
        console.error("Failed to load records:", err);
        showToast("Error fetching attendance records.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Quick Date Handlers
  const handleQuickDate = (type) => {
    setQuickDate(type);
    setCurrentPage(1);

    const today = new Date();
    const formatYMD = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

    if (type === "all") {
      setDateFilter("");
    } else if (type === "today") {
      setDateFilter(formatYMD(today));
    } else if (type === "yesterday") {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      setDateFilter(formatYMD(yest));
    } else if (type === "week") {
      setDateFilter(""); // Will filter in memory using past 7 days
    }
  };

  // Distinct Subjects for filter dropdown
  const subjectOptions = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      if (r.subject_name) {
        map.set(r.subject_name, r.subject_code ? `${r.subject_code} - ${r.subject_name}` : r.subject_name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const minWeekDate = sevenDaysAgo.toLocaleDateString("en-CA");

    return records.filter((rec) => {
      // Status filter
      if (statusFilter !== "all" && rec.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Subject filter
      if (subjectFilter !== "all" && rec.subject_name !== subjectFilter) {
        return false;
      }

      // Date filter
      if (quickDate === "week") {
        if (rec.date < minWeekDate) return false;
      } else if (dateFilter) {
        if (rec.date !== dateFilter) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (rec.student_name || "").toLowerCase().includes(q);
        const idMatch = (rec.student_id_code || "").toLowerCase().includes(q);
        const subMatch = (rec.subject_name || "").toLowerCase().includes(q);
        const codeMatch = (rec.subject_code || "").toLowerCase().includes(q);
        const deptMatch = (rec.department || "").toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !subMatch && !codeMatch && !deptMatch) {
          return false;
        }
      }

      return true;
    });
  }, [records, statusFilter, subjectFilter, dateFilter, quickDate, searchQuery]);

  // Summary Metrics based on filtered data (or total if none)
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === "Present").length;
    const absent = total - present;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, rate };
  }, [filteredRecords]);

  // Overall Counts for tabs
  const overallCounts = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const absent = total - present;
    return { total, present, absent };
  }, [records]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Toggle Attendance Status
  const handleToggleStatus = (recordId, currentStatus) => {
    const newStatus = currentStatus === "Present" ? "Absent" : "Present";
    API.patch(`admin/attendance/records/${recordId}/`, { status: newStatus })
      .then(() => {
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? { ...r, status: newStatus } : r))
        );
        showToast(`Record updated to ${newStatus}.`);
      })
      .catch((err) => {
        console.error("Failed to update status:", err);
        showToast("Failed to update status.");
      });
  };

  // Delete Attendance Record
  const handleDeleteRecord = (recordId, studentName, date) => {
    if (!window.confirm(`Delete attendance record for ${studentName} on ${date}?`)) {
      return;
    }

    API.delete(`admin/attendance/records/${recordId}/`)
      .then(() => {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
        showToast("Attendance record removed.");
      })
      .catch((err) => {
        console.error("Failed to delete record:", err);
        showToast("Failed to delete record.");
      });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert("No records to export.");
      return;
    }

    const headers = ["Date", "Time", "Student ID", "Student Name", "Department", "Semester", "Subject Code", "Subject Name", "Status"];
    const rows = filteredRecords.map((r) => [
      `"${r.date || ""}"`,
      `"${r.time || ""}"`,
      `"${r.student_id_code || ""}"`,
      `"${(r.student_name || "").replace(/"/g, '""')}"`,
      `"${r.department || ""}"`,
      `"${r.semester || ""}"`,
      `"${r.subject_code || ""}"`,
      `"${(r.subject_name || "").replace(/"/g, '""')}"`,
      `"${r.status || ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_records_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV report downloaded successfully.");
  };

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Attendance Records</h1>
          <p>Comprehensive attendance logs, status verification, and reporting</p>
        </div>
        <div className="attendance-actions">
          <button 
            className="btn-attendance export" 
            onClick={handleExportCSV}
            title="Download filtered records as CSV"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      <div className="admin-page-content">
        {/* Metric KPI Cards */}
        <div className="attendance-stats-grid">
          <div className="attendance-stat-card">
            <div className="attendance-stat-icon blue">
              <Users size={24} />
            </div>
            <div className="attendance-stat-info">
              <div className="attendance-stat-label">Total Logs Displayed</div>
              <div className="attendance-stat-value">{metrics.total}</div>
            </div>
          </div>

          <div className="attendance-stat-card">
            <div className="attendance-stat-icon green">
              <UserCheck size={24} />
            </div>
            <div className="attendance-stat-info">
              <div className="attendance-stat-label">Present Count</div>
              <div className="attendance-stat-value" style={{ color: "#16a34a" }}>
                {metrics.present}
              </div>
            </div>
          </div>

          <div className="attendance-stat-card">
            <div className="attendance-stat-icon red">
              <UserX size={24} />
            </div>
            <div className="attendance-stat-info">
              <div className="attendance-stat-label">Absent Count</div>
              <div className="attendance-stat-value" style={{ color: "#dc2626" }}>
                {metrics.absent}
              </div>
            </div>
          </div>

          <div className="attendance-stat-card">
            <div className="attendance-stat-icon purple">
              <Percent size={24} />
            </div>
            <div className="attendance-stat-info">
              <div className="attendance-stat-label">Attendance Rate</div>
              <div className="attendance-stat-value">{metrics.rate}%</div>
              <div className="attendance-progress-bar-bg">
                <div 
                  className="attendance-progress-bar-fill" 
                  style={{ 
                    width: `${metrics.rate}%`,
                    background: metrics.rate < 75 ? "linear-gradient(90deg, #ef4444, #f97316)" : "linear-gradient(90deg, #10b981, #059669)"
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="attendance-controls-card">
          <div className="attendance-controls-row">
            {/* Search Input */}
            <div className="attendance-search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by student, roll no, subject..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Status Tabs */}
            <div className="attendance-status-tabs">
              <button
                className={`status-tab-btn ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
              >
                All <span className="status-count-badge">{overallCounts.total}</span>
              </button>
              <button
                className={`status-tab-btn ${statusFilter === "Present" ? "active" : ""}`}
                onClick={() => { setStatusFilter("Present"); setCurrentPage(1); }}
              >
                <CheckCircle size={14} color="#16a34a" /> Present 
                <span className="status-count-badge">{overallCounts.present}</span>
              </button>
              <button
                className={`status-tab-btn ${statusFilter === "Absent" ? "active" : ""}`}
                onClick={() => { setStatusFilter("Absent"); setCurrentPage(1); }}
              >
                <XCircle size={14} color="#dc2626" /> Absent 
                <span className="status-count-badge">{overallCounts.absent}</span>
              </button>
            </div>
          </div>

          <div className="attendance-controls-row">
            {/* Subject Dropdown Filter */}
            <div className="attendance-filter-group">
              <select
                className="attendance-select"
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Subjects</option>
                {subjectOptions.map(([name, label]) => (
                  <option key={name} value={name}>{label}</option>
                ))}
              </select>

              {/* Date Input */}
              <input
                type="date"
                className="attendance-date-input"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setQuickDate("custom");
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Quick Date Chips */}
            <div className="attendance-quick-dates">
              <button 
                className={`quick-date-btn ${quickDate === "all" ? "active" : ""}`}
                onClick={() => handleQuickDate("all")}
              >
                All Time
              </button>
              <button 
                className={`quick-date-btn ${quickDate === "today" ? "active" : ""}`}
                onClick={() => handleQuickDate("today")}
              >
                Today
              </button>
              <button 
                className={`quick-date-btn ${quickDate === "yesterday" ? "active" : ""}`}
                onClick={() => handleQuickDate("yesterday")}
              >
                Yesterday
              </button>
              <button 
                className={`quick-date-btn ${quickDate === "week" ? "active" : ""}`}
                onClick={() => handleQuickDate("week")}
              >
                Past 7 Days
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
            <div className="scan-spinner" style={{ margin: "0 auto 12px", borderColor: "rgba(11,192,228,0.3)", borderTopColor: "#0bc0e4" }} />
            <p>Loading attendance records...</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Student Info</th>
                  <th>Programme / Sem</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <div className="table-time-stamp">
                        <span className="table-time-date">{rec.date}</span>
                        <span className="table-time-clock">
                          <Clock size={12} /> {rec.time}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{rec.student_name}</strong>
                      </div>
                      {rec.student_id_code && rec.student_id_code !== "N/A" && (
                        <span className="student-roll-badge">{rec.student_id_code}</span>
                      )}
                    </td>
                    <td>
                      {rec.department ? (
                        <span className="dept-sem-tag">
                          {rec.department} {rec.semester ? `• Sem ${rec.semester}` : ""}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div>
                        {rec.subject_code && (
                          <span className="subject-code-pill">{rec.subject_code}</span>
                        )}
                        <span>{rec.subject_name}</span>
                      </div>
                    </td>
                    <td>
                      {rec.status === "Present" ? (
                        <span className="badge success" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <CheckCircle size={14} /> Present
                        </span>
                      ) : (
                        <span className="badge warning" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <XCircle size={14} /> Absent
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="row-actions-group" style={{ justifyContent: "flex-end" }}>
                        <button
                          className="btn-toggle-status"
                          onClick={() => handleToggleStatus(rec.id, rec.status)}
                          title={`Click to mark as ${rec.status === "Present" ? "Absent" : "Present"}`}
                        >
                          <RotateCcw size={12} style={{ display: "inline", marginRight: 4 }} />
                          Mark {rec.status === "Present" ? "Absent" : "Present"}
                        </button>
                        <button
                          className="btn-delete-record"
                          onClick={() => handleDeleteRecord(rec.id, rec.student_name, rec.date)}
                          title="Delete this record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {paginatedRecords.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
                      <p style={{ fontSize: "16px", fontWeight: 500, marginBottom: "6px" }}>No matching attendance records</p>
                      <p style={{ fontSize: "13px", color: "#94a3b8" }}>Try clearing filters or adjusting search keywords</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredRecords.length > 0 && (
          <div className="attendance-pagination-bar">
            <div className="pagination-info">
              Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, filteredRecords.length)}</strong> to{" "}
              <strong>{Math.min(currentPage * pageSize, filteredRecords.length)}</strong> of{" "}
              <strong>{filteredRecords.length}</strong> records
            </div>

            <div className="pagination-controls">
              <label style={{ fontSize: "13px", color: "#64748b", marginRight: "6px" }}>Rows per page:</label>
              <select
                className="attendance-select"
                style={{ padding: "4px 8px", marginRight: "12px" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="page-indicator">
                {currentPage} / {totalPages}
              </span>
              <button
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Toast Alert Notification */}
        {toast && (
          <div className="attendance-toast">
            <span>{toast}</span>
          </div>
        )}
      </div>
    </>
  );
}
