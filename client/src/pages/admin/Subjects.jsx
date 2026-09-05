import { useState, useEffect } from "react";
import { Edit2, Trash2, Download } from "lucide-react";
import API from "../../api/api";
import "./Students.css";

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", department: "", semester: "" });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: "", name: "", code: "", department: "", semester: "" });

  const fetchSubjects = () => {
    setLoading(true);
    API.get("admin/subjects/")
      .then((res) => setSubjects(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    API.post("admin/subjects/", formData)
      .then(() => {
        setShowAddModal(false);
        setFormData({ name: "", code: "", department: "", semester: "" });
        fetchSubjects();
      })
      .catch((err) => {
        alert("Failed to add subject. Code must be unique.");
        console.error(err);
      });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      API.delete(`admin/subjects/${id}/`)
        .then(() => fetchSubjects())
        .catch((err) => alert(`Failed to delete: ${err.response?.data?.detail || err.message}`));
    }
  };

  const openEditModal = (sub) => {
    setEditFormData({ id: sub.id, name: sub.name, code: sub.code, department: sub.department || "", semester: sub.semester || "" });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    API.put(`admin/subjects/${editFormData.id}/`, editFormData)
      .then(() => {
        setShowEditModal(false);
        fetchSubjects();
      })
      .catch((err) => {
        alert("Failed to update subject. Code must be unique.");
        console.error(err);
      });
  };

  const exportToCSV = () => {
    const headers = ["Code", "Subject Name", "Department", "Semester", "Total Classes"];
    const rows = subjects.map(s => [
      s.code,
      s.name,
      s.department || "",
      s.semester || "",
      s.total_classes
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tu_subjects.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const role = sessionStorage.getItem("role");
  const isAdmin = role === "admin";

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Subjects</h1>
          <p>{isAdmin ? "Manage courses and subject codes" : "Your assigned subjects"}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="admin-btn-primary" style={{ background: "#10b981", display: 'flex', alignItems: 'center', gap: 6 }} onClick={exportToCSV}>
            <Download size={16} /> Export CSV
          </button>
          {isAdmin && (
            <button className="admin-btn-primary" onClick={() => setShowAddModal(true)}>
              + Add Subject
            </button>
          )}
        </div>
      </header>

      <div className="admin-page-content">
        {loading ? (
          <p>Loading subjects...</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Subject Name</th>
                  <th>Course (Dept)</th>
                  <th>Semester</th>
                  <th>Total Classes</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub) => (
                  <tr key={sub.id}>
                    <td><strong>{sub.code}</strong></td>
                    <td>{sub.name}</td>
                    <td>{sub.department || "-"}</td>
                    <td>{sub.semester || "-"}</td>
                    <td>{sub.total_classes}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn-icon" onClick={() => openEditModal(sub)}><Edit2 size={16} /></button>
                        <button className="btn-icon delete" onClick={() => handleDelete(sub.id, sub.name)}><Trash2 size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))}
                {subjects.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? "6" : "5"} style={{ textAlign: "center", padding: "40px" }}>
                      No subjects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Add New Subject</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit} className="admin-form">
              <div className="form-group mb-4">
                <label>Subject Code (e.g. CS101)</label>
                <input 
                  type="text" 
                  value={formData.code} 
                  onChange={(e) => setFormData({...formData, code: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group mb-4">
                <label>Subject Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group mb-4">
                <label>Course / Department</label>
                <select 
                  value={formData.department} 
                  onChange={(e) => setFormData({...formData, department: e.target.value})} 
                  required 
                >
                  <option value="">Select Course</option>
                  <option value="BCA">BCA</option>
                  <option value="BIT">BIT</option>
                  <option value="BSc.CSIT">BSc.CSIT</option>
                </select>
              </div>
              <div className="form-group mb-4">
                <label>Semester</label>
                <select 
                  value={formData.semester} 
                  onChange={(e) => setFormData({...formData, semester: e.target.value})} 
                  required 
                >
                  <option value="">Select Semester</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Edit Subject</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="admin-form">
              <div className="form-group mb-4">
                <label>Subject Code (e.g. CS101)</label>
                <input 
                  type="text" 
                  value={editFormData.code} 
                  onChange={(e) => setEditFormData({...editFormData, code: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group mb-4">
                <label>Subject Name</label>
                <input 
                  type="text" 
                  value={editFormData.name} 
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group mb-4">
                <label>Course / Department</label>
                <select 
                  value={editFormData.department} 
                  onChange={(e) => setEditFormData({...editFormData, department: e.target.value})} 
                  required 
                >
                  <option value="">Select Course</option>
                  <option value="BCA">BCA</option>
                  <option value="BIT">BIT</option>
                  <option value="BSc.CSIT">BSc.CSIT</option>
                </select>
              </div>
              <div className="form-group mb-4">
                <label>Semester</label>
                <select 
                  value={editFormData.semester} 
                  onChange={(e) => setEditFormData({...editFormData, semester: e.target.value})} 
                  required 
                >
                  <option value="">Select Semester</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">Update Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
