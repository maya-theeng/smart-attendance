import { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import API from "../../api/api";
import "./Students.css"; // Reuse students table CSS

export default function AttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("admin/attendance/records/")
      .then((res) => setRecords(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Attendance Records</h1>
          <p>History of all marked attendance</p>
        </div>
      </header>

      <div className="admin-page-content">
        {loading ? (
          <p>Loading records...</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id}>
                    <td>{rec.date}</td>
                    <td>{rec.time}</td>
                    <td><strong>{rec.student_name}</strong></td>
                    <td>{rec.subject_name}</td>
                    <td>
                      {rec.status === "Present" ? (
                        <span className="badge success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Present</span>
                      ) : (
                        <span className="badge warning" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><XCircle size={14} /> Absent</span>
                      )}
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
