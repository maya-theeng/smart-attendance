import { useState, useEffect } from "react";
import API from "../../api/api";
import { Users, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import "./AdminDashboard.css";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_subjects: 0,
    present_today: 0,
    absent_today: 0,
    weekly_trend: [],
    available_months: [],
    selected_month: "2026-09",
    subject_stats: [],
    available_departments: [],
    sems_for_dept: [],
    selected_dept: "",
    selected_sem: "",
    students_below_threshold: [],
  });
  const [selectedMonth, setSelectedMonth] = useState("2026-09");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [loading, setLoading] = useState(true);

  // Monthly report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const adminName = sessionStorage.getItem("admin_name") || "Admin";
  const adminId = sessionStorage.getItem("admin_username") || "N/A";
  const adminEmail = sessionStorage.getItem("admin_email") || "";

  useEffect(() => {
    const deptParam = selectedDept ? `&dept=${selectedDept}` : "";
    const semParam = selectedSem ? `&sem=${selectedSem}` : "";
    API.get(`admin/dashboard/stats/?month=${selectedMonth}${deptParam}${semParam}`)
      .then((res) => {
        setStats(res.data);
        // Sync dept/sem from server on first load
        if (!selectedDept && res.data.selected_dept) setSelectedDept(res.data.selected_dept);
        if (!selectedSem && res.data.selected_sem) setSelectedSem(res.data.selected_sem);
      })
      .catch((err) => console.error("Admin stats error:", err))
      .finally(() => setLoading(false));
  }, [selectedMonth, selectedDept, selectedSem]);

  // Fetch report data on demand when modal opens
  useEffect(() => {
    if (showReportModal && !reportData) {
      setReportLoading(true);
      API.get("admin/dashboard/monthly-report/")
        .then((res) => setReportData(res.data))
        .catch((err) => console.error("Report fetch error:", err))
        .finally(() => setReportLoading(false));
    }
  }, [showReportModal, reportData]);

  if (loading) return <div className="admin-page-content">Loading...</div>;

  const formatMonthName = (ym) => {
    if (!ym) return "";
    const [y, m] = ym.split("-");
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  const availableMonths = stats.available_months && stats.available_months.length > 0
    ? stats.available_months
    : [selectedMonth];

  const fallbackSubjects = [
    { name: "Data Structures", percentage: 87, code: "CS301" },
    { name: "Operating Systems", percentage: 75, code: "CS302" },
    { name: "Database Management", percentage: 90, code: "CS303" },
    { name: "Computer Networks", percentage: 69, code: "CS304" },
  ];

  const fallbackBelowThreshold = [
    { name: "Suresh BK", student_id: "STU-2024-005", percentage: 68 },
    { name: "Anish Giri", student_id: "STU-2024-009", percentage: 72 },
    { name: "Pooja Shrestha", student_id: "STU-2024-012", percentage: 64 },
  ];

  const weeklyTrendData = stats.weekly_trend || [];

  const subjectStatsData = stats.subject_stats || [];

  const availableDepts = stats.available_departments && stats.available_departments.length > 0
    ? stats.available_departments
    : [];
  const availableSems = stats.sems_for_dept && stats.sems_for_dept.length > 0
    ? stats.sems_for_dept
    : [];

  const studentsBelowData = stats.students_below_threshold && stats.students_below_threshold.length > 0
    ? stats.students_below_threshold
    : fallbackBelowThreshold;

  // Chart 1: Monthly Attendance Trend (Line Chart)
  const lineChartData = {
    labels: weeklyTrendData.map((item) => {
      const d = new Date(item.date);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }),
    datasets: [
      {
        label: `${formatMonthName(selectedMonth)} Attendance Rate (%)`,
        data: weeklyTrendData.map((item) => item.rate ?? item.percentage ?? 0),
        borderColor: "#0bc0e4",
        backgroundColor: "rgba(11, 192, 228, 0.12)",
        borderWidth: 3,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: "#0bc0e4",
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const item = weeklyTrendData[context.dataIndex];
            if (item && item.present !== undefined) {
              return `Attendance: ${context.parsed.y}% (${item.present} Present, ${item.absent} Absent)`;
            }
            return `Attendance Rate: ${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: "#f0fcff" },
        ticks: { color: "#6b8caa" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#6b8caa" },
      },
    },
  };

  // Chart 2: At Risk Doughnut Chart
  const totalCount = stats.total_students || 10;
  const atRiskCount = studentsBelowData.length;
  const safeCount = Math.max(0, totalCount - atRiskCount);

  const doughnutData = {
    labels: ["Safe (≥75%)", "At Risk (<75%)"],
    datasets: [
      {
        data: [safeCount, atRiskCount],
        backgroundColor: ["#10b981", "#ef4444"],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#475569",
          boxWidth: 12,
          padding: 15,
        },
      },
    },
    cutout: "70%",
  };

  return (
    <>
      <header className="admin-page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <h1>Overview</h1>
            <button
              className="admin-report-btn"
              onClick={() => setShowReportModal(true)}
              style={{
                background: "linear-gradient(135deg, #0bc0e4 0%, #0098bc 100%)",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(11, 192, 228, 0.2)",
                transition: "all 0.2s"
              }}
            >
              📊 Generate Monthly Report
            </button>
          </div>
          <p style={{ marginTop: "6px" }}>Welcome back, <strong>{adminName}</strong> — here's today's attendance and system statistics</p>
        </div>
        <div style={{
          background: "#f0fcff",
          border: "1px solid #e8f0f7",
          padding: "10px 18px",
          borderRadius: "12px",
          textAlign: "right",
          fontSize: "14px"
        }}>
          <div style={{ fontWeight: "600", color: "#0a3d5c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Session</div>
          <div style={{ color: "#6b8caa", marginTop: "4px" }}>
            Admin ID: <span style={{ color: "#0bc0e4", fontWeight: "600" }}>{adminId}</span>
          </div>
          {adminEmail && <div style={{ color: "#6b8caa", fontSize: "12px", marginTop: "2px" }}>{adminEmail}</div>}
        </div>
      </header>

      <div className="admin-page-content">
        {/* Metric Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card primary">
            <div className="admin-stat-icon">
              <Users size={32} color="#0bc0e4" />
            </div>
            <div>
              <h3>Total Students</h3>
              <p>{stats.total_students}</p>
            </div>
          </div>
          <div className="admin-stat-card success">
            <div className="admin-stat-icon">
              <CheckCircle size={32} color="#10b981" />
            </div>
            <div>
              <h3>Present Today</h3>
              <p>{stats.present_today}</p>
            </div>
          </div>
          <div className="admin-stat-card danger">
            <div className="admin-stat-icon">
              <XCircle size={32} color="#ef4444" />
            </div>
            <div>
              <h3>Absent Today</h3>
              <p>{stats.absent_today}</p>
            </div>
          </div>

        </div>

        {/* Charts & Risk Panel Row */}
        <div className="admin-dashboard-layout">
          {/* Main Visualizations */}
          <div className="admin-visuals-column">
            <div className="admin-chart-card">
              <div className="admin-chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3>{formatMonthName(selectedMonth)} Attendance Trend</h3>
                  <span className="admin-chart-subtitle">Daily institutional attendance progression across all subjects</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label htmlFor="admin-month-select" style={{ fontSize: "12px", color: "#6b8caa", fontWeight: "600" }}>
                    Month:
                  </label>
                  <select
                    id="admin-month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d0e7f7",
                      background: "#fff",
                      color: "#0a3d5c",
                      fontWeight: "600",
                      fontSize: "12px",
                      cursor: "pointer",
                      outline: "none",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}
                  >
                    {availableMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {formatMonthName(ym)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="chart-container">
                {weeklyTrendData.length > 0 ? (
                  <Line data={lineChartData} options={lineChartOptions} />
                ) : (
                  <div style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6b8caa",
                    gap: "8px",
                    textAlign: "center",
                    padding: "20px"
                  }}>
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>
                      No attendance records logged in {formatMonthName(selectedMonth)}
                    </span>
                    <span style={{ fontSize: "12px" }}>
                      Select another month from the dropdown or record attendance sessions to see the institutional trend.
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* At-Risk Alert Panel */}
          <div className="admin-alerts-column">
            <div className="admin-chart-card alert-summary-card">
              <div className="admin-chart-header">
                <h3>System Alerts</h3>
                <span className="admin-chart-subtitle">Student risk breakdown (Threshold: 75%)</span>
              </div>

              <div className="doughnut-container">
                <Doughnut data={doughnutData} options={doughnutOptions} />
                <div className="doughnut-center-label">
                  <span className="doughnut-number">{atRiskCount}</span>
                  <span className="doughnut-text">At Risk</span>
                </div>
              </div>

              {atRiskCount > 0 ? (
                <div className="admin-risk-alert-box">
                  <div className="admin-alert-banner">
                    <AlertTriangle size={18} color="#ef4444" />
                    <span><strong>Action Required:</strong> {atRiskCount} students have critical attendance.</span>
                  </div>

                  <div className="admin-at-risk-list">
                    {studentsBelowData.map((s, idx) => (
                      <div className="admin-at-risk-item" key={s.id ?? idx}>
                        <div className="admin-risk-info">
                          <span className="admin-risk-name">{s.name}</span>
                          <span className="admin-risk-id">{s.student_id}</span>
                        </div>
                        <span className="admin-risk-pct">{s.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="admin-no-alerts">
                  <CheckCircle size={32} color="#10b981" />
                  <p>All students are above the 75% critical threshold!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Report Modal */}
      {showReportModal && (
        <div className="report-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="report-modal-header">
              <div>
                <h2>Monthly Attendance Analytics Report</h2>
              </div>
              <button className="report-modal-close" onClick={() => setShowReportModal(false)}>&times;</button>
            </header>

            <div className="report-modal-body">
              {reportLoading ? (
                <div className="report-loading-container">
                  <div className="report-spinner"></div>
                  <p>Processing data and generating Matplotlib figures...</p>
                </div>
              ) : reportData ? (
                <>
                  {/* Summary Metric Cards */}
                  <div className="report-summary-grid">
                    <div className="report-summary-card">
                      <h4>Overall Attendance</h4>
                      <p className={`report-metric-value ${reportData.summary.overall_average >= 75 ? "safe" : "danger"}`}>
                        {reportData.summary.overall_average}%
                      </p>
                      <span>Average class presence</span>
                    </div>
                    <div className="report-summary-card">
                      <h4>Total Records</h4>
                      <p className="report-metric-value">{reportData.summary.total_records}</p>
                      <span>Classes checked (last 30d)</span>
                    </div>
                    <div className="report-summary-card">
                      <h4>At-Risk Students</h4>
                      <p className={`report-metric-value ${reportData.summary.at_risk_count > 0 ? "danger" : "safe"}`}>
                        {reportData.summary.at_risk_count}
                      </p>
                      <span>Students below 75%</span>
                    </div>
                    <div className="report-summary-card">
                      <h4>Subject Performance</h4>
                      <div className="report-subject-notes">
                        <div>📈 Top: <strong style={{ color: "#10b981" }}>{reportData.summary.top_subject}</strong></div>
                        <div style={{ marginTop: "4px" }}>📉 Bottom: <strong style={{ color: "#ef4444" }}>{reportData.summary.bottom_subject}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Chart Rendering */}
                  <div className="report-image-container">
                    <h3>Matplotlib Generated Visualizations</h3>
                    <img src={reportData.chart_image} alt="Monthly Attendance Distribution and Trend Report" className="report-matplotlib-img" />
                  </div>
                </>
              ) : (
                <p>Failed to generate report. Please try again.</p>
              )}
            </div>

            <footer className="report-modal-footer">
              <button className="btn-secondary" onClick={() => setShowReportModal(false)}>Close</button>
              {reportData && (
                <button className="btn-primary" onClick={() => window.print()}>
                  🖨️ Print / Save PDF
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
