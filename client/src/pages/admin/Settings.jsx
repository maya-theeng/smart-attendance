export default function Settings() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Settings</h1>
          <p>System configuration and preferences</p>
        </div>
      </header>

      <div className="admin-page-content">
        <div className="admin-card" style={{ maxWidth: 800 }}>
          <h3 style={{ marginBottom: 24, fontSize: 18, color: "#0a3d5c" }}>General Settings</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ padding: 20, background: "#f0fcff", borderRadius: 8, border: "1px solid #c9e8ff" }}>
              <strong style={{ display: "block", marginBottom: 8, color: "#0a3d5c" }}>Attendance Threshold</strong>
              <p style={{ color: "#475569", margin: "0 0 12px 0", fontSize: 14 }}>
                Students falling below this percentage will be flagged for warnings.
              </p>
              <input 
                type="number" 
                defaultValue={75} 
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", width: 100 }} 
              /> <span style={{ color: "#475569", fontWeight: 500 }}>%</span>
            </div>

            <div style={{ padding: 20, background: "#f0fcff", borderRadius: 8, border: "1px solid #c9e8ff" }}>
              <strong style={{ display: "block", marginBottom: 8, color: "#0a3d5c" }}>Camera Settings</strong>
              <p style={{ color: "#475569", margin: "0 0 12px 0", fontSize: 14 }}>
                Adjust face recognition sensitivity threshold (lower is stricter).
              </p>
              <input 
                type="number" 
                step="0.05"
                defaultValue={0.4} 
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", width: 100 }} 
              />
            </div>

            <button className="admin-btn-primary" style={{ alignSelf: "flex-start", marginTop: 10 }}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
