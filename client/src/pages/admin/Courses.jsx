import { useState, useEffect } from "react";
import { Edit2, Trash2, Library } from "lucide-react";
import API from "../../api/api";
import "./Students.css";

const emptyForm = { name: "", code: "" };

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: "", ...emptyForm });

  const fetchCourses = () => {
    setLoading(true);
    API.get("admin/courses/")
      .then((res) => setCourses(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    API.post("admin/courses/", formData)
      .then(() => {
        setShowAddModal(false);
        setFormData(emptyForm);
        fetchCourses();
      })
      .catch((err) => {
        alert("Failed to add course. Course code must be unique.");
        console.error(err);
      });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      API.delete(`admin/courses/${id}/`)
        .then(() => fetchCourses())
        .catch((err) =>
          alert(`Failed to delete: ${err.response?.data?.detail || err.message}`)
        );
    }
  };

  const openEditModal = (course) => {
    setEditFormData({
      id: course.id,
      name: course.name,
      code: course.code,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    API.put(`admin/courses/${editFormData.id}/`, editFormData)
      .then(() => {
        setShowEditModal(false);
        fetchCourses();
      })
      .catch((err) => {
        alert("Failed to update course. Code must be unique.");
        console.error(err);
      });
  };

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Courses</h1>
          <p>Manage academic programmes and departments</p>
        </div>
        <button className="admin-btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Course
        </button>
      </header>

      <div className="admin-page-content">
        {loading ? (
          <p>Loading courses...</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Course Name</th>
                  <th>Total Semesters</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td><strong>{course.code}</strong></td>
                    <td>{course.name}</td>
                    <td>{course.total_semesters || "8"}</td>
                    <td>{course.description || "—"}</td>
                    <td>
                      <button className="btn-icon" onClick={() => openEditModal(course)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(course.id, course.name)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>
                      <Library size={32} style={{ display: "block", margin: "0 auto 8px" }} />
                      No courses found. Add your first course.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Add New Course</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit} className="admin-form">
              <div className="form-group mb-4">
                <label>Course Code (e.g. BCA)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="BCA"
                  required
                />
              </div>
              <div className="form-group mb-4">
                <label>Course Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bachelor of Computer Applications"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">Save Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Edit Course</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="admin-form">
              <div className="form-group mb-4">
                <label>Course Code</label>
                <input
                  type="text"
                  value={editFormData.code}
                  onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                  required
                />
              </div>
              <div className="form-group mb-4">
                <label>Course Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">Update Course</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
