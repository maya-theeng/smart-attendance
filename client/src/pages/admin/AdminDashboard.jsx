import { useState, useEffect } from "react";
import API from "../../api/api";
import { Users, CheckCircle, XCircle, BookOpen, AlertTriangle } from "lucide-react";
import "./AdminDashboard.css";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
    subject_stats: [],
    students_below_threshold: [],
  });
  const [loading, setLoading] = useState(true);
  
  // Monthly report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const adminName = sessionStorage.getItem("admin_name") || "Admin";
  const adminId = sessionStorage.getItem("admin_username") || "N/A";
  const adminEmail = sessionStorage.getItem("admin_email") || "";

  useEffect(() => {
    API.get("admin/dashboard/stats/")
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => console.error("Admin stats error:", err))
      .finally(() => setLoading(false));
  }, []);

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

  // Sensible fallback data for design and testing
  const fallbackTrend = [
    { date: "2026-05-20", rate: 85 },
    { date: "2026-05-21", rate: 82 },
    { date: "2026-05-22", rate: 88 },
    { date: "2026-05-23", rate: 79 },
    { date: "2026-05-24", rate: 84 },
    { date: "2026-05-25", rate: 81 },
    { date: "2026-05-26", rate: 83 },
  ];

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

  const weeklyTrendData = stats.weekly_trend && stats.weekly_trend.length > 0
    ? stats.weekly_trend
    : fallbackTrend;

  const subjectStatsData = stats.subject_stats && stats.subject_stats.length > 0
    ? stats.subject_stats
    : fallbackSubjects;

  const studentsBelowData = stats.students_below_threshold && stats.students_below_threshold.length > 0
    ? stats.students_below_threshold
    : fallbackBelowThreshold;

  // Chart 1: Weekly Attendance Trend (Line Chart)
  const lineChartData = {
    labels: weeklyTrendData.map((item) => {
      const d = new Date(item.date);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }),
    datasets: [
      {
        label: "Attendance Rate (%)",
        data: weeklyTrendData.map((item) => item.rate ?? item.percentage ?? 0),
        borderColor: "#0bc0e4",
        backgroundColor: "rgba(11, 192, 228, 0.1)",
        borderWidth: 3,
        tension: 0.4,
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
          label: (context) => `Attendance Rate: ${context.parsed.y}%`,
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

  // Chart 2: Subject-wise Comparison (Bar Chart)
  const barChartData = {
    labels: subjectStatsData.map((item) => item.code ?? item.name.substring(0, 10)),
    datasets: [
      {
        label: "Average Attendance (%)",
        data: subjectStatsData.map((item) => item.percentage),
        backgroundColor: subjectStatsData.map((item) =>
          item.percentage >= 75 ? "rgba(16, 185, 129, 0.85)" : "rgba(239, 68, 68, 0.85)"
        ),
        borderRadius: 8,
        borderWidth: 0,
        maxBarThickness: 32,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            return subjectStatsData[index].name;
          },
          label: (context) => `Attendance: ${context.parsed.y}%`,
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

  // Chart 3: At Risk Doughnut Chart
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
          <div className="admin-stat-card warning">
            <div className="admin-stat-icon">
              <BookOpen size={32} color="#f59e0b" />
            </div>
            <div>
              <h3>Total Subjects</h3>
              <p>{stats.total_subjects}</p>
            </div>
          </div>
        </div>

        {/* Charts & Risk Panel Row */}
        <div className="admin-dashboard-layout">
          {/* Main Visualizations */}
          <div className="admin-visuals-column">
            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3>Attendance Trend</h3>
                <span className="admin-chart-subtitle">Daily overall attendance rate over recent days</span>
              </div>
              <div className="chart-container">
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>

            <div className="admin-chart-card">
              <div className="admin-chart-header">
                <h3>Subject Comparison</h3>
                <span className="admin-chart-subtitle">Average student attendance percentage per subject</span>
              </div>
              <div className="chart-container">
                <Bar data={barChartData} options={barChartOptions} />
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
