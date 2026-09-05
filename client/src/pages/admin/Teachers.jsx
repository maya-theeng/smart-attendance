import { useState, useEffect, useRef } from "react";
import { Edit2, Trash2, UserCog, Mail, Phone, BookOpen, Camera, ScanFace, CheckCircle, Hourglass, AlertTriangle, Sparkles, Upload, XCircle } from "lucide-react";
import API from "../../api/api";
import "./Students.css";

const DEPARTMENTS = ["BCA", "BIT", "BSc.CSIT"];

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  department: "",
  specialty: "",
  employee_id: "",
  subjects: [],
};

const TeacherForm = ({ data, onChange, onSubmit, onCancel, submitLabel, isEdit }) => (
  <form onSubmit={onSubmit} className="admin-form">
    <div className="form-group mb-4">
      <label>Employee ID</label>
      <input type="text" value={data.employee_id}
        onChange={(e) => onChange({ ...data, employee_id: e.target.value })}
        placeholder="T-001" required />
    </div>
    <div className="form-group mb-4">
      <label>Full Name</label>
      <input type="text" value={data.full_name}
        onChange={(e) => onChange({ ...data, full_name: e.target.value })}
        placeholder="e.g. Ram Prasad Sharma" required />
    </div>
    <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
      <div className="form-group mb-4">
        <label>Email</label>
        <input type="email" value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          placeholder="teacher@college.edu.np" required />
      </div>
      <div className="form-group mb-4">
        <label>{isEdit ? "New Password (optional)" : "Password"}</label>
        <input type="password" value={data.password}
          onChange={(e) => onChange({ ...data, password: e.target.value })}
          placeholder={isEdit ? "Leave empty to keep" : "••••••••"}
          required={!isEdit} />
      </div>
    </div>
    <div className="form-group mb-4">
      <label>Phone (optional)</label>
      <input type="text" value={data.phone}
        onChange={(e) => onChange({ ...data, phone: e.target.value })}
        placeholder="98XXXXXXXX" />
    </div>
    <div className="form-group mb-4">
      <label>Department(s)</label>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "8px" }}>
        {DEPARTMENTS.map((d) => {
          const isChecked = data.department ? data.department.includes(d) : false;
          return (
            <label key={d} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: "normal", color: "#334155" }}>
              <input 
                type="checkbox" 
                checked={isChecked}
                onChange={(e) => {
                  let newDeps = data.department ? data.department.split(', ').filter(Boolean) : [];
                  if (e.target.checked) {
                    if (!newDeps.includes(d)) newDeps.push(d);
                  } else {
                    newDeps = newDeps.filter(dep => dep !== d);
                  }
                  onChange({ ...data, department: newDeps.join(', ') });
                }}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              {d}
            </label>
          );
        })}
      </div>
    </div>
    <div className="form-group mb-4">
      <label>Area of Expertise (optional)</label>
      <input type="text" value={data.specialty}
        onChange={(e) => onChange({ ...data, specialty: e.target.value })}
        placeholder="e.g. Database Systems, Networking" />
    </div>
    <div className="form-actions">
      <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
      <button type="submit" className="admin-btn-primary">{submitLabel}</button>
    </div>
  </form>
);

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: "", ...emptyForm });
  const [subjects, setSubjects] = useState([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTeacher, setAssignTeacher] = useState(null);
  const [assignFilterDept, setAssignFilterDept] = useState("");
  const [assignFilterSem, setAssignFilterSem] = useState("");

  const fetchTeachers = () => {
    setLoading(true);
    API.get("admin/teachers/")
      .then((res) => setTeachers(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchSubjects = () => {
    API.get("admin/subjects/")
      .then((res) => setSubjects(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
  }, []);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    API.post("admin/teachers/", formData)
      .then(() => {
        setShowAddModal(false);
        setFormData(emptyForm);
        fetchTeachers();
      })
      .catch((err) => {
        alert("Failed to add teacher. Employee ID or Email must be unique.");
        console.error(err);
      });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}"?`)) {
      API.delete(`admin/teachers/${id}/`)
        .then(() => fetchTeachers())
        .catch((err) =>
          alert(`Failed to delete: ${err.response?.data?.detail || err.message}`)
        );
    }
  };

  const openEditModal = (teacher) => {
    setEditFormData({
      id: teacher.id,
      full_name: teacher.full_name || "",
      email: teacher.email || "",
      password: "",
      phone: teacher.phone || "",
      department: teacher.department || "",
      specialty: teacher.specialty || "",
      employee_id: teacher.employee_id || "",
      subjects: teacher.subjects || [],
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    API.put(`admin/teachers/${editFormData.id}/`, editFormData)
      .then(() => {
        setShowEditModal(false);
        fetchTeachers();
      })
      .catch((err) => {
        alert("Failed to update teacher.");
        console.error(err);
      });
  };

  const openAssignModal = (teacher) => {
    setAssignTeacher({ id: teacher.id, subjects: teacher.subjects || [] });
    setAssignFilterDept("");
    setAssignFilterSem("");
    setShowAssignModal(true);
  };

  // -------------------------
  // Face Registration Logic
  // -------------------------
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [faceModalMode, setFaceModalMode] = useState("choose");
  const [faceImage, setFaceImage] = useState(null);
  const [registeringFace, setRegisteringFace] = useState(false);
  const [faceError, setFaceError] = useState("");
  const [faceSuccess, setFaceSuccess] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const openFaceModal = (teacher) => {
    setSelectedTeacher(teacher);
    setFaceModalMode("choose");
    setFaceImage(null);
    setFaceError("");
    setFaceSuccess("");
  };

  const closeFaceModal = () => {
    stopWebcam();
    setSelectedTeacher(null);
    setFaceImage(null);
  };

  const startWebcam = async () => {
    setFaceModalMode("webcam");
    setFaceError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setFaceError("Could not access webcam. Try photo upload instead.");
      setFaceModalMode("choose");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0, 320, 240);
      setFaceImage(canvas.toDataURL("image/jpeg", 0.9));
      stopWebcam();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFaceImage(reader.result);
    reader.readAsDataURL(file);
  };

  const submitFaceRegistration = () => {
    if (!faceImage) return;
    setRegisteringFace(true);
    setFaceError("");
    setFaceSuccess("");

    API.post(`admin/teachers/${selectedTeacher.id}/upload-face/`, { image: faceImage })
      .then((res) => {
        setFaceSuccess("Face registered successfully!");
        fetchTeachers();
        setTimeout(() => closeFaceModal(), 1500);
      })
      .catch((err) => {
        setFaceError(err.response?.data?.detail || "Face registration failed.");
      })
      .finally(() => setRegisteringFace(false));
  };
  // -------------------------

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    API.put(`admin/teachers/${assignTeacher.id}/`, { subjects: assignTeacher.subjects })
      .then(() => {
        setShowAssignModal(false);
        fetchTeachers();
      })
      .catch((err) => {
        alert("Failed to assign subjects.");
        console.error(err);
      });
  };



  // For the assign modal
  const filteredSemesters = [...new Set(
    subjects
      .filter(s => !assignFilterDept || s.department === assignFilterDept)
      .map(s => s.semester)
  )].filter(Boolean).sort((a, b) => parseInt(a) - parseInt(b));

  const filteredSubjects = subjects.filter(s =>
    s.department === assignFilterDept && String(s.semester) === String(assignFilterSem)
  );

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Teachers</h1>
          <p>Manage faculty members and staff</p>
        </div>
        <button className="admin-btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Teacher
        </button>
      </header>

      <div className="admin-page-content">
        {loading ? (
          <p>Loading teachers...</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Specialty</th>
                  <th>Face</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td><strong>{teacher.employee_id || "—"}</strong></td>
                    <td>{teacher.full_name}</td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Mail size={13} style={{ opacity: 0.6 }} />
                        {teacher.email}
                      </span>
                    </td>
                    <td>
                      {teacher.phone ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Phone size={13} style={{ opacity: 0.6 }} />
                          {teacher.phone}
                        </span>
                      ) : "—"}
                    </td>
                    <td>{teacher.department || "—"}</td>
                    <td>{teacher.specialty || "—"}</td>
                    <td>
                      {teacher.face_registered ? (
                        <span className="badge success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Yes</span>
                      ) : (
                        <span className="badge warning" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><XCircle size={14} /> No</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn-icon camera" 
                        title="Register Face"
                        onClick={() => openFaceModal(teacher)}
                        style={{ marginRight: 6 }}
                      >
                        <Camera size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => openEditModal(teacher)} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => openAssignModal(teacher)} title="Assign Subjects">
                        <BookOpen size={16} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(teacher.id, teacher.full_name)} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>
                      <UserCog size={32} style={{ display: "block", margin: "0 auto 8px" }} />
                      No teachers found. Add your first faculty member.
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
              <h2>Add New Teacher</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <TeacherForm data={formData} onChange={setFormData}
              onSubmit={handleAddSubmit} onCancel={() => setShowAddModal(false)}
              submitLabel="Save Teacher" />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Edit Teacher</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <TeacherForm data={editFormData} onChange={setEditFormData}
              onSubmit={handleEditSubmit} onCancel={() => setShowEditModal(false)}
              submitLabel="Update Teacher" isEdit={true} />
          </div>
        </div>
      )}

      {/* Assign Subjects Modal */}
      {showAssignModal && assignTeacher && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Assign Subjects</h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <form onSubmit={handleAssignSubmit} className="admin-form">

              <div className="form-group mb-4">
                <label>Course</label>
                <select
                  value={assignFilterDept}
                  onChange={e => { setAssignFilterDept(e.target.value); setAssignFilterSem(""); }}
                >
                  <option value="">-- Select Course --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-group mb-4">
                <label>Semester</label>
                <select
                  value={assignFilterSem}
                  onChange={e => setAssignFilterSem(e.target.value)}
                  disabled={!assignFilterDept}
                >
                  <option value="">-- Select Semester --</option>
                  {filteredSemesters.map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              {assignFilterDept && assignFilterSem && (
                <div className="form-group mb-4">
                  <label>Subjects — {filteredSubjects.length} available (click to select/deselect)</label>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", maxHeight: "220px", overflowY: "auto" }}>
                    {filteredSubjects.length === 0 ? (
                      <p style={{ padding: "16px", color: "#64748b", fontSize: "13px", margin: 0 }}>
                        No subjects found for this course and semester.
                      </p>
                    ) : filteredSubjects.map(sub => {
                      const isSelected = assignTeacher.subjects.includes(sub.id);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            const updated = isSelected
                              ? assignTeacher.subjects.filter(id => id !== sub.id)
                              : [...assignTeacher.subjects, sub.id];
                            setAssignTeacher({ ...assignTeacher, subjects: updated });
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            borderBottom: "1px solid #f1f5f9",
                            background: isSelected ? "#e0f2fe" : "#fff",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "13px",
                            color: isSelected ? "#0369a1" : "#1e293b",
                            fontWeight: isSelected ? "600" : "400",
                          }}
                        >
                          <span><strong>{sub.code}</strong> — {sub.name}</span>
                          {isSelected && <span style={{ color: "#0bc0e4", fontSize: "16px" }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Visual Summary of all selected subjects across all departments */}
              <div className="form-group mb-4" style={{ marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                <label>Currently Assigned ({assignTeacher.subjects.length})</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                  {assignTeacher.subjects.length === 0 ? (
                    <span style={{ fontSize: "13px", color: "#64748b" }}>No subjects assigned yet.</span>
                  ) : (
                    assignTeacher.subjects.map(id => {
                      const s = subjects.find(sub => sub.id === id);
                      if (!s) return null;
                      return (
                        <span key={id} style={{ 
                          background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", 
                          borderRadius: "16px", fontSize: "12px", fontWeight: "500",
                          display: "inline-flex", alignItems: "center", gap: "6px"
                        }}>
                          {s.department}: {s.name}
                          <button type="button" onClick={() => {
                            setAssignTeacher({ 
                              ...assignTeacher, 
                              subjects: assignTeacher.subjects.filter(sid => sid !== id) 
                            });
                          }} style={{ border: "none", background: "transparent", color: "#0284c7", cursor: "pointer", padding: 0, fontSize: "14px", lineHeight: 1 }}>×</button>
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">Save Assignments</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedTeacher && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: 450 }}>
            <div className="admin-modal-header">
              <h2>Register Face: {selectedTeacher.full_name}</h2>
              <button className="close-btn" onClick={closeFaceModal}>×</button>
            </div>
            
            <div className="face-register-modal">
              {faceModalMode === "choose" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", padding: "20px 0" }}>
                  <button className="admin-btn-primary" onClick={startWebcam} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Camera size={18} /> Use Live Webcam
                  </button>
                  <button className="admin-btn-primary" style={{ background: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setFaceModalMode("upload")}>
                    <Upload size={18} /> Upload Photo File
                  </button>
                </div>
              )}

              {faceModalMode === "webcam" && !faceImage && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div className="face-register-preview">
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", transform: "scaleX(-1)" }} />
                  </div>
                  <div className="face-register-actions">
                    <button className="admin-btn-primary" onClick={capturePhoto} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <ScanFace size={18} /> Capture Snapshot
                    </button>
                    <button className="btn-cancel" onClick={() => { stopWebcam(); setFaceModalMode("choose"); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {faceModalMode === "upload" && !faceImage && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", padding: "20px 0" }}>
                  <input type="file" accept="image/*" onChange={handleFileUpload} />
                  <button className="btn-cancel" onClick={() => setFaceModalMode("choose")}>
                    Cancel
                  </button>
                </div>
              )}

              {faceImage && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div className="face-register-preview">
                    <img src={faceImage} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover", transform: faceModalMode === "webcam" ? "scaleX(-1)" : "none" }} />
                  </div>
                  
                  {registeringFace ? (
                    <div style={{ color: "#0bc0e4", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Hourglass size={18} /> Processing and encoding face...</div>
                  ) : (
                    <div className="face-register-actions">
                      <button className="admin-btn-primary" onClick={submitFaceRegistration} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <CheckCircle size={18} /> Register Face
                      </button>
                      <button 
                        className="btn-cancel" 
                        onClick={() => {
                          setFaceImage(null);
                          if (faceModalMode === "webcam") {
                            startWebcam();
                          }
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              )}

              {faceError && (
                <div className="face-register-status error" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", color: "#ef4444", marginTop: 10 }}>
                  <AlertTriangle size={18} /> {faceError}
                </div>
              )}

              {faceSuccess && (
                <div className="face-register-status success" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", color: "#10b981", marginTop: 10 }}>
                  <Sparkles size={18} /> {faceSuccess}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
