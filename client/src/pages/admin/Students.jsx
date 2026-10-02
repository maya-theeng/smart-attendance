import { useState, useEffect, useRef } from "react";
import { CheckCircle, XCircle, Camera, Edit2, Trash2, Upload, ScanFace, Hourglass, AlertTriangle, Sparkles } from "lucide-react";
import API from "../../api/api";
import "./Students.css";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    student_id: "",
    department: "",
    semester: "",
    phone: "",
  });

  const [availableSubjects, setAvailableSubjects] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  // Face registration states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [faceModalMode, setFaceModalMode] = useState("choose"); // 'choose', 'webcam', 'upload'
  const [faceImage, setFaceImage] = useState(null); // base64 string
  const [registeringFace, setRegisteringFace] = useState(false);
  const [faceError, setFaceError] = useState("");
  const [faceSuccess, setFaceSuccess] = useState("");
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fetchStudents = () => {
    setLoading(true);
    API.get("admin/students/")
      .then((res) => setStudents(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
    API.get("admin/subjects/")
      .then(res => setAvailableSubjects(res.data))
      .catch(err => console.error(err));
    return () => {
      stopWebcam();
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    API.post("admin/students/", formData)
      .then(() => {
        setShowAddModal(false);
        setFormData({
          first_name: "", last_name: "", email: "", password: "",
          student_id: "", department: "", semester: "", phone: ""
        });
        fetchStudents();
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.detail || "Ensure email and Student ID are unique.";
        alert(`Failed to add student: ${errorMsg}`);
        console.error(err);
      });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      API.delete(`admin/students/${id}/`)
        .then(() => fetchStudents())
        .catch((err) => alert(`Failed to delete: ${err.response?.data?.detail || err.message}`));
    }
  };

  const openEditModal = (student) => {
    const parts = student.name.split(' ');
    setEditFormData({
      id: student.id,
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' ') || '',
      email: student.email,
      student_id: student.student_id,
      department: student.department || '',
      semester: student.semester || '',
      phone: student.phone || '',
      subjects: student.subjects || []
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Compute subjects to preview based on dept+semester
  const getFilteredSubjects = (dept, sem) =>
    availableSubjects.filter(s =>
      s.department?.toLowerCase() === dept?.toLowerCase() &&
      s.semester?.toString() === sem?.toString()
    );

  const handleEditSubmit = (e) => {
    e.preventDefault();
    API.put(`admin/students/${editFormData.id}/`, editFormData)
      .then(() => {
        setShowEditModal(false);
        fetchStudents();
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.detail || err.message;
        alert(`Failed to edit student: ${errorMsg}`);
      });
  };


  // Face registration logic
  const openFaceModal = (student) => {
    setSelectedStudent(student);
    setFaceModalMode("choose");
    setFaceImage(null);
    setFaceError("");
    setFaceSuccess("");
  };

  const closeFaceModal = () => {
    stopWebcam();
    setSelectedStudent(null);
    setFaceImage(null);
  };

  const startWebcam = async () => {
    setFaceModalMode("webcam");
    setFaceError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setFaceError("Could not access webcam. Try photo upload instead.");
      setFaceModalMode("choose");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, 320, 240);
      const base64 = canvas.toDataURL("image/jpeg", 0.9);
      setFaceImage(base64);
      stopWebcam();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFaceImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submitFaceRegistration = () => {
    if (!faceImage) return;

    setRegisteringFace(true);
    setFaceError("");
    setFaceSuccess("");

    API.post(`admin/students/${selectedStudent.id}/upload-face/`, {
      image: faceImage
    })
      .then((res) => {
        setFaceSuccess("Face registered successfully with MTCNN + FaceNet!");
        fetchStudents();
        setTimeout(() => {
          closeFaceModal();
        }, 1500);
      })
      .catch((err) => {
        console.error(err);
        const detail = err.response?.data?.detail || "Face registration failed. Ensure the face is clearly visible.";
        setFaceError(detail);
      })
      .finally(() => {
        setRegisteringFace(false);
      });
  };

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Students Management</h1>
          <p>View, add, and manage student profiles and face data</p>
        </div>
        <button className="admin-btn-primary" onClick={() => setShowAddModal(true)}>
          + Add New Student
        </button>
      </header>

      <div className="admin-page-content">
        {loading ? (
          <p>Loading students...</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Face Registered</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id}>
                    <td><strong>{st.student_id}</strong></td>
                    <td>{st.name}</td>
                    <td>{st.email}</td>
                    <td>{st.department}</td>
                    <td>
                      {st.face_registered ? (
                        <span className="badge success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Yes</span>
                      ) : (
                        <span className="badge warning" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><XCircle size={14} /> No</span>
                      )}
                    </td>
                    <td>
                      {st.is_active ? (
                        <span className="badge active">Active</span>
                      ) : (
                        <span className="badge inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn-icon camera" 
                        title="Register Face"
                        onClick={() => openFaceModal(st)}
                        style={{ marginRight: 6 }}
                      >
                        <Camera size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => openEditModal(st)}><Edit2 size={16} /></button>
                      <button className="btn-icon delete" onClick={() => handleDelete(st.id, st.name)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "40px" }}>
                      No students found. Add one to get started.
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
              <h2>Add New Student</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" name="first_name" required value={formData.first_name} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" name="last_name" required value={formData.last_name} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Temporary Password</label>
                  <input type="password" name="password" required value={formData.password} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Student ID (e.g. STU-001)</label>
                  <input type="text" name="student_id" required value={formData.student_id} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Course / Department</label>
                  <select name="department" value={formData.department} onChange={handleInputChange} required>
                    <option value="">Select Course</option>
                    <option value="BCA">BCA</option>
                    <option value="BIT">BIT</option>
                    <option value="BSc.CSIT">BSc.CSIT</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Semester</label>
                  <select name="semester" value={formData.semester} onChange={handleInputChange} required>
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
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
              </div>
              {/* Auto-assign preview */}
              {formData.department && formData.semester && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={15} style={{ color: '#10b981' }} />
                    Subjects auto-assigned for {formData.department} – Sem {formData.semester}
                  </label>
                  <div style={{ background: '#f0fcff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {getFilteredSubjects(formData.department, formData.semester).length === 0 ? (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No subjects found in DB for this combination.</span>
                    ) : (
                      getFilteredSubjects(formData.department, formData.semester).map(s => (
                        <span key={s.id} style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '2px 8px', fontSize: '0.82rem', fontWeight: 500 }}>
                          {s.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editFormData && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Edit Student</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" name="first_name" required value={editFormData.first_name} onChange={handleEditChange} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" name="last_name" required value={editFormData.last_name} onChange={handleEditChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" required value={editFormData.email} onChange={handleEditChange} />
                </div>
                <div className="form-group">
                  <label>Student ID (e.g. STU-001)</label>
                  <input type="text" name="student_id" required value={editFormData.student_id} onChange={handleEditChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Course / Department</label>
                  <select name="department" value={editFormData.department} onChange={handleEditChange} required>
                    <option value="">Select Course</option>
                    <option value="BCA">BCA</option>
                    <option value="BIT">BIT</option>
                    <option value="BSc.CSIT">BSc.CSIT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <select name="semester" value={editFormData.semester} onChange={handleEditChange} required>
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
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" name="phone" value={editFormData.phone} onChange={handleEditChange} />
                </div>
              </div>
              {/* Auto-assign preview */}
              {editFormData.department && editFormData.semester && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={15} style={{ color: '#10b981' }} />
                    Subjects auto-assigned for {editFormData.department} – Sem {editFormData.semester}
                  </label>
                  <div style={{ background: '#f0fcff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {getFilteredSubjects(editFormData.department, editFormData.semester).length === 0 ? (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No subjects found in DB for this combination.</span>
                    ) : (
                      getFilteredSubjects(editFormData.department, editFormData.semester).map(s => (
                        <span key={s.id} style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '2px 8px', fontSize: '0.82rem', fontWeight: 500 }}>
                          {s.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">Update Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: 450 }}>
            <div className="admin-modal-header">
              <h2>Register Face: {selectedStudent.name}</h2>
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
                    <video ref={videoRef} autoPlay playsInline muted />
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
                    <img src={faceImage} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                <div className="face-register-status error" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <AlertTriangle size={18} /> {faceError}
                </div>
              )}

              {faceSuccess && (
                <div className="face-register-status success" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
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
