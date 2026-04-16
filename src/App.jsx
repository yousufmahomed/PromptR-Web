import React, { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [script, setScript] = useState(() => localStorage.getItem("promptr_data") || "");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(45);
  const [opacity, setOpacity] = useState(0.85);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("promptr_data", script);
  }, [script]);

  // Persistent Webcam Logic
  useEffect(() => {
    if (isMeetingMode && isLive) {
      const startWebcam = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
          console.error("Webcam Error:", err);
        }
      };
      startWebcam();
    } else {
      // Stop webcam when not in meeting mode
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [isMeetingMode, isLive]);

  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setScrollPosition((prev) => prev + (scrollSpeed * 0.5));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed]);

  const stopSession = () => {
    setIsLive(false);
    setIsMeetingMode(false);
    setScrollPosition(0);
  };

  return (
    <div className="app-container">
      {!isLive && (
        <header className="header">
          <h1 className="logo">Prompt<span>R</span></h1>
        </header>
      )}

      {!isLive ? (
        <main className="dashboard">
          <div className="stencil-box">
            <button className="large-insert-btn" onClick={() => setIsEditorOpen(true)}>
              {script ? "EDIT SCRIPT" : "+ INSERT SCRIPT"}
            </button>
          </div>
          {script && (
            <div className="mode-selection">
              <button className="launch-btn" onClick={() => setIsLive(true)}>Standard View</button>
              <button className="launch-btn meeting-btn" onClick={() => { setIsMeetingMode(true); setIsLive(true); }}>Meeting View</button>
            </div>
          )}
        </main>
      ) : (
        <div className="teleprompter-view">
          {isMeetingMode && <video ref={videoRef} autoPlay playsInline className="webcam-bg" />}
          
          <div className="teleprompter-main-layout">
            <div className={`script-column ${isMirrored ? 'mirrored' : ''}`} 
                 style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}>
              
              <div className="eye-line"></div>
              
              <div className="scrolling-text" style={{ transform: `translateY(-${scrollPosition}px)`, fontSize: `${fontSize}px` }}>
                <div style={{ height: '15vh' }}></div> {/* Keeps text near the top eye-line */}
                {script}
                <div style={{ height: '80vh' }}></div>
              </div>
            </div>

            {!isMeetingMode && (
              <aside className="notes-column">
                <h3>Notes</h3>
                <p>• Lens eye-contact</p>
                <p>• Speak slowly</p>
              </aside>
            )}
          </div>

          <div className="control-bar">
            <div className="control-group"><label>Speed</label><input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} /></div>
            <div className="control-group"><label>Size</label><input type="range" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} /></div>
            <div className="control-group"><label>Glass</label><input type="range" min="0" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} /></div>
            <button className="exit-btn-mini" onClick={stopSession}>EXIT</button>
          </div>
        </div>
      )}

      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <textarea value={script} onChange={(e) => setScript(e.target.value)} />
            <div className="modal-actions">
              <button className="clear-btn" onClick={() => setScript("")}>Clear</button>
              <button className="accept-btn" onClick={() => setIsEditorOpen(false)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default App;