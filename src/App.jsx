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
  const [isMeetingMode, setIsMeetingMode] = useState(false); // NEW
  
  const videoRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("promptr_data", script);
  }, [script]);

  // Handle Webcam for Meeting Mode
  useEffect(() => {
    if (isMeetingMode && isLive) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(err => console.error("Webcam blocked", err));
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

  return (
    <div className={`app-container ${isMeetingMode ? 'meeting-active' : ''}`}>
      {!isMeetingMode && (
        <header className="header">
          <h1 className="logo">Prompt<span>R</span></h1>
          <p className="tagline">Authority in Every Word.</p>
        </header>
      )}

      {!isLive ? (
        <main className="dashboard">
          <div className="stencil-box">
            <button className="large-insert-btn" onClick={() => setIsEditorOpen(true)}>
              {script ? "EDIT SCRIPT" : "+ INSERT SCRIPT HERE"}
            </button>
          </div>
          {script && (
            <div style={{display: 'flex', gap: '15px'}}>
              <button className="launch-btn" onClick={() => { setIsMeetingMode(false); setIsLive(true); }}>Standard Mode</button>
              <button className="launch-btn meeting-btn" onClick={() => { setIsMeetingMode(true); setIsLive(true); }}>Meeting Mode</button>
            </div>
          )}
        </main>
      ) : (
        <div className="teleprompter-view">
          {isMeetingMode && <video ref={videoRef} autoPlay className="webcam-bg" />}
          
          <div className="teleprompter-main-layout">
            <div className={`script-column ${isMirrored ? 'mirrored' : ''}`} 
                 style={{ backgroundColor: `rgba(0, 11, 20, ${opacity})` }}>
              <div className="eye-line"></div>
              <div className="scrolling-text" style={{ transform: `translateY(-${scrollPosition}px)`, fontSize: `${fontSize}px` }}>
                <div style={{ height: '30vh' }}></div>
                {script}
                <div style={{ height: '80vh' }}></div>
              </div>
            </div>

            {!isMeetingMode && (
              <aside className="notes-column">
                <h3>Presenter Notes</h3>
                <p>• Eye-contact with lens</p>
                <p>• Natural pauses</p>
              </aside>
            )}
          </div>

          <div className="control-bar">
            <div className="control-group"><label>Speed</label><input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} /></div>
            <div className="control-group"><label>Size</label><input type="range" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} /></div>
            <div className="control-group"><label>Glass</label><input type="range" min="0" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} /></div>
            <button className="mirror-btn" onClick={() => setIsMirrored(!isMirrored)}>{isMirrored ? "NORMAL" : "MIRROR"}</button>
            <button className="exit-btn-mini" onClick={() => { setIsLive(false); setIsMeetingMode(false); setScrollPosition(0); }}>EXIT</button>
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