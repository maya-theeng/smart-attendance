import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, ShieldCheck, ScanFace, Save, Trash2, VideoOff, CheckCircle, AlertTriangle, XCircle, Info, ShieldAlert, Search } from "lucide-react";
import API from "../../api/api";
import "./TakeAttendance.css";

export default function TakeAttendance() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [date, setDate] = useState(() => {
    // Use local date (Nepal time in browser), not UTC — avoids date being "yesterday"
    const d = new Date();
    return d.toLocaleDateString('en-CA'); // gives YYYY-MM-DD in local timezone
  });

  // Derived: unique, sorted departments from loaded subjects
  const departments = [...new Set(subjects.map((s) => s.department).filter(Boolean))].sort();

  // Derived: semesters available for the chosen department
  const semesters = [
    ...new Set(
      subjects
        .filter((s) => s.department === selectedDept)
        .map((s) => String(s.semester))
        .filter(Boolean)
    ),
  ].sort((a, b) => Number(a) - Number(b));

  // Derived: subjects filtered by dept + semester
  const filteredSubjects = subjects.filter(
    (s) => s.department === selectedDept && String(s.semester) === selectedSem
  );

  // Mode: "student" or "staff"
  const [mode, setMode] = useState("student");
  const isAdmin = sessionStorage.getItem("role") !== "teacher";

  const [cameraActive, setCameraActive] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  const [presentStudents, setPresentStudents] = useState(new Map()); // id -> name
  const [spoofedStudents, setSpoofedStudents] = useState(new Map()); // id -> name
  const [lastScanResults, setLastScanResults] = useState([]);
  const [facesDetected, setFacesDetected] = useState(0);
  const [status, setStatus] = useState({ text: "", type: "info" });

  // Fetch subjects on load
  useEffect(() => {
    const role = sessionStorage.getItem("role");
    // Admin and teacher both use admin/subjects/ (which filters by teacher server-side)
    const endpoint = role === "teacher" ? "teacher/subjects/" : "admin/subjects/";
    API.get(endpoint)
      .then((res) => {
        console.log(`[TakeAttendance] Loaded ${res.data.length} subjects via ${endpoint}`);
        setSubjects(res.data);
      })
      .catch((err) => {
        console.error("[TakeAttendance] Failed to load subjects:", err.response?.status, err.response?.data);
        alert(`Could not load subjects. Error: ${err.response?.data?.detail || err.message}`);
      });
  }, []);

  // Handlers for cascading dropdowns
  const handleDeptChange = (dept) => {
    setSelectedDept(dept);
    setSelectedSem("");
    setSelectedSubject("");
  };

  const handleSemChange = (sem) => {
    setSelectedSem(sem);
    setSelectedSubject("");
  };

  const startCamera = async () => {
    if (mode === "student" && (!selectedDept || !selectedSem || !selectedSubject)) {
      alert("Please select Department, Semester, and Subject first!");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setStatus({ text: "Camera ready. Click 'Scan Frame' to detect faces.", type: "info" });
      }
    } catch (err) {
      console.error(err);
      alert("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
      setRecognizing(false);
      setStatus({ text: "", type: "info" });
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  /**
   * Capture the current webcam frame, send to backend for
   * MTCNN + FaceNet recognition + screen-context liveness check.
   */
  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !cameraActive) return;

    setRecognizing(true);
    setStatus({ text: "Scanning with MTCNN + Anti-Spoof check...", type: "info" });

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const tmp = document.createElement("canvas");
    tmp.width = video.videoWidth;
    tmp.height = video.videoHeight;
    tmp.getContext("2d").drawImage(video, 0, 0);
    const base64Image = tmp.toDataURL("image/jpeg", 0.85);

    const endpoint = mode === "staff" ? "admin/attendance/recognize-staff/" : "admin/attendance/recognize/";

    try {
      const response = await API.post(endpoint, {
        image: base64Image,
      });

      const { faces_detected, faces_matched, results } = response.data;
      setFacesDetected(faces_detected);
      setLastScanResults(results);

      const newPresent = new Map(presentStudents);
      const newSpoofed = new Map(spoofedStudents);
      let localSpoofCount = 0;

      results.forEach((face) => {
        const id_key = mode === "staff" ? face.teacher_id : face.student_id;
        if (face.matched && id_key) {
          if (face.is_live) {
            newPresent.set(id_key, face.name);
            newSpoofed.delete(id_key);
          } else {
            newSpoofed.set(id_key, face.name);
            localSpoofCount++;
          }
        }
      });
      setPresentStudents(newPresent);
      setSpoofedStudents(newSpoofed);

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      results.forEach((face) => {
        const { x, y, w, h } = face.bbox;
        const isMatched = face.matched;
        const isLive = face.is_live !== false;

        let boxColor = "#ef4444";
        let label = `Unknown (${Math.round(face.confidence * 100)}%)`;
        let labelBg = "rgba(239, 68, 68, 0.85)";

        if (isMatched) {
          if (isLive) {
            boxColor = "#10b981";
            label = `${face.name} (${Math.round(face.confidence * 100)}%)`;
            labelBg = "rgba(16, 185, 129, 0.85)";
          } else {
            boxColor = "#f59e0b";
            label = `SPOOF: ${face.name}`;
            labelBg = "rgba(245, 158, 11, 0.9)";
          }
        } else if (!isLive) {
          boxColor = "#f59e0b";
          label = `SPOOF Unknown`;
          labelBg = "rgba(245, 158, 11, 0.9)";
        }

        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 3;
        ctx.setLineDash(!isLive ? [6, 6] : []);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        ctx.font = "bold 14px Inter, sans-serif";
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = labelBg;
        ctx.fillRect(x, y - 24, textWidth + 12, 24);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x + 6, y - 7);
      });

      if (localSpoofCount > 0) {
        setStatus({
          text: `Spoof Detected! ${faces_detected} face(s), ${faces_matched} matched, ${localSpoofCount} spoof(s) blocked.`,
          type: "warning"
        });
      } else {
        const typeStr = mode === "staff" ? "Staff Logged In" : "Present";
        setStatus({
          text: `${faces_detected} face(s) detected, ${faces_matched} matched. ${typeStr}: ${newPresent.size}`,
          type: "success"
        });
      }
    } catch (err) {
      console.error("Recognition error:", err);
      const errMsg =
        err.response?.data?.detail || "Recognition failed. Check server logs.";
      setStatus({ text: errMsg, type: "error" });
    } finally {
      setRecognizing(false);
    }
  }, [cameraActive, presentStudents, spoofedStudents, mode]);

  const submitAttendance = () => {
    if (mode === "staff") {
      alert("Staff check-ins are logged automatically upon recognition!");
      return;
    }
    if (presentStudents.size === 0) {
      alert("No students recognized to mark present.");
      return;
    }

    const studentIds = Array.from(presentStudents.keys()).map(Number);
    const payload = {
      date: date,
      subject_id: parseInt(selectedSubject, 10),
      student_ids: studentIds,
    };
    console.log("[TakeAttendance] Submitting attendance payload:", payload);

    API.post("admin/attendance/mark/", payload)
      .then((res) => {
        alert(res.data.detail);
        setPresentStudents(new Map());
        setSpoofedStudents(new Map());
        setLastScanResults([]);
        setFacesDetected(0);
        setStatus({ text: "Attendance saved successfully!", type: "success" });
      })
      .catch((err) => {
        console.error("[TakeAttendance] Attendance save error:", err.response?.data || err);
        alert(`Failed to save attendance: ${err.response?.data?.detail || err.message}`);
      });
  };


  const clearSession = (resetFilters = false) => {
    setPresentStudents(new Map());
    setSpoofedStudents(new Map());
    setLastScanResults([]);
    setFacesDetected(0);
    setStatus({ text: "Session cleared.", type: "info" });
    if (resetFilters) {
      setSelectedDept("");
      setSelectedSem("");
      setSelectedSubject("");
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Take Attendance</h1>
          <p>
            Use MTCNN + FaceNet facial recognition to automatically mark presence.
          </p>
        </div>
      </header>

      {isAdmin && (
        <div style={{ marginBottom: 20, display: "flex", gap: 10, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
          <button 
            onClick={() => { setMode("student"); clearSession(true); }}
            style={{ 
              padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600,
              background: mode === "student" ? "#0f172a" : "transparent", color: mode === "student" ? "#fff" : "#64748b" 
            }}>
            Student Classroom Scan
          </button>
          <button 
            onClick={() => { setMode("staff"); clearSession(true); }}
            style={{ 
              padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600,
              background: mode === "staff" ? "#0f172a" : "transparent", color: mode === "staff" ? "#fff" : "#64748b" 
            }}>
            Staff Check-in Scanner
          </button>
        </div>
      )}

      <div className="admin-page-content attendance-layout">
        {/* Left Panel: Controls */}
        <div className="attendance-controls">
          <div className="admin-card">
            <h3>1. Session Details</h3>
            
            {mode === "student" ? (
              <>
                {/* Step 1: Department */}
                <div className="form-group mb-4">
                  <label>Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    disabled={cameraActive}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Semester – shown only after dept chosen */}
                {selectedDept && (
                  <div className="form-group mb-4">
                    <label>Semester</label>
                    <select
                      value={selectedSem}
                      onChange={(e) => handleSemChange(e.target.value)}
                      disabled={cameraActive}
                    >
                      <option value="">-- Select Semester --</option>
                      {semesters.map((sem) => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Step 3: Subject – shown only after dept + semester chosen */}
                {selectedDept && selectedSem && (
                  <div className="form-group mb-4">
                    <label>Subject</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      disabled={cameraActive}
                    >
                      <option value="">-- Select Subject --</option>
                      {filteredSubjects.length === 0 ? (
                        <option disabled>No subjects found for this selection</option>
                      ) : (
                        filteredSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))
                      )}
                    </select>
                    {filteredSubjects.length > 0 && (
                      <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>●</span>
                        {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? "s" : ""} available
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="form-group mb-4">
                <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Scanning mode: Master Staff Check-in. Recognized teachers will be logged automatically.</p>
              </div>
            )}

            <div className="form-group mb-4">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={cameraActive}
              />
            </div>
          </div>

          <div className="admin-card">
            <h3>2. Camera Controls</h3>
            <div className="ml-badge">
              <span className="ml-badge-dot"></span>
              MTCNN + FaceNet (Server-side)
              <ShieldCheck size={14} style={{ marginLeft: 6, color: "#f59e0b", flexShrink: 0 }} title="Anti-Spoofing (Liveness) Active" />
            </div>
            {!cameraActive ? (
              <button className="admin-btn-primary w-full" onClick={startCamera} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Camera size={16} /> Start Camera
              </button>
            ) : (
              <div className="camera-active-controls">
                <button
                  className="admin-btn-primary w-full scan-btn"
                  onClick={captureAndRecognize}
                  disabled={recognizing}
                >
                  {recognizing ? (
                    <>
                      <span className="scan-spinner"></span> Scanning...
                    </>
                  ) : (
                    <><ScanFace size={16} style={{ marginRight: 6 }} />Scan Frame</>
                  )}
                </button>
                <button className="btn-cancel w-full mt-2" onClick={stopCamera}>
                  Stop Camera
                </button>
              </div>
            )}
          </div>

          <div className="admin-card">
            <h3>3. Session Summary</h3>
            <div className="summary-stat">
              <span>Faces Detected:</span>
              <strong>{facesDetected}</strong>
            </div>
            <div className="summary-stat">
              <span>{mode === "staff" ? "Staff Matched:" : "Students Matched:"}</span>
              <strong className="matched-count">{presentStudents.size}</strong>
            </div>

            {presentStudents.size > 0 && (
              <div className="recognized-list">
                <p className="recognized-label">{mode === "staff" ? "Recognized Staff:" : "Recognized Students:"}</p>
                <ul>
                  {Array.from(presentStudents.entries()).map(([id, name]) => (
                    <li key={id}>
                      <span className="recognized-dot" style={{ display: "inline-flex", alignItems: "center", marginRight: 4 }}><CheckCircle size={14} color="#10b981" /></span> {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {spoofedStudents.size > 0 && (
              <div className="spoofed-list-alert" style={{
                marginTop: 12,
                padding: 10,
                background: "#fffbeb",
                border: "1px solid #fef3c7",
                borderRadius: 6,
                color: "#b45309"
              }}>
                <p style={{ margin: "0 0 6px 0", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                  <ShieldAlert size={16} color="#b45309" /> Blocked Spoof Attempts:
                </p>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                  {Array.from(spoofedStudents.entries()).map(([id, name]) => (
                    <li key={id} style={{ marginBottom: 2 }}>
                      <strong>{name}</strong> (Failed Liveness)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastScanResults.filter((r) => !r.matched).length > 0 && (
              <div className="unknown-list">
                <p className="unknown-label">
                  Unknown Faces: {lastScanResults.filter((r) => !r.matched).length}
                </p>
              </div>
            )}

            <div className="session-actions">
              {mode !== "staff" && (
                <button
                  className="admin-btn-success w-full"
                  onClick={submitAttendance}
                  disabled={presentStudents.size === 0}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Save size={16} /> Save Attendance ({presentStudents.size})
                </button>
              )}
              {(presentStudents.size > 0 || spoofedStudents.size > 0) && (
                <button
                  className="btn-cancel w-full mt-2"
                  onClick={clearSession}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Trash2 size={16} /> Clear Session
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Camera View */}
        <div className="attendance-camera-view">
          <div className={`video-container ${cameraActive ? "active" : ""}`}>
            {!cameraActive && (
              <div className="video-placeholder">
                <span className="placeholder-icon"><VideoOff size={48} strokeWidth={1.5} /></span>
                <p>Camera is currently off</p>
                <p className="text-small">
                  Select Department → Semester → Subject, then Start Camera
                </p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ display: cameraActive ? "block" : "none" }}
            />
            <canvas ref={canvasRef} className="face-canvas" />
          </div>

          {/* Status bar below camera */}
          {status.text && (
            <div className={`camera-status-bar ${status.type}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {status.type === "info" && status.text.includes("Scanning") ? <Search size={18} /> : 
               status.type === "info" ? <Info size={18} /> :
               status.type === "success" ? <CheckCircle size={18} /> :
               status.type === "warning" ? <AlertTriangle size={18} /> :
               <XCircle size={18} />}
              {status.text}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
