import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  // 1. STATES
  // We check localStorage immediately so your script is there on refresh
  const [script, setScript] = useState(() => {
    return localStorage.getItem("promptr-script") || "";
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(32);
  const [opacity, setOpacity] = useState(0.8);
  const [isMirrored, setIsMirrored] = useState(false); // NEW: Mirror State

  // 2. EFFECTS
  // Save script to memory whenever it changes
  useEffect(() => {
    localStorage.setItem("promptr-script", script);
  }, [script]);

  // Scrolling Logic
  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setScrollPosition((prev) => prev + (scrollSpeed * 0.5));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed]);

  const handleEndSession = () => {
    setIsLive(false);
    setScrollPosition(0);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="logo">Prompt<span>R</span></h1>
        <p className="tagline">Authority in Every Word.</p>
      </header>

      {!isLive ? (
        <main className="dashboard">
          <div className="stencil-box">
            <button className="large-insert-btn" onClick={() => setIsEditorOpen(true)}>
              + INSERT SCRIPT HERE
            </button>
            {script && <p className="script-status">System Ready</p>}
          </div>
          {script && <button className="launch-btn" onClick={() => setIsLive(true)}>START PROMPTR</button>}
        </main>
      ) : (
        <div className="teleprompter-view">
          
          <div className="teleprompter-main-layout">
            {/* 1. THE CENTERED SCRIPT COLUMN (Added mirroring class here) */}
            <div 
              className={`script-column ${isMirrored ? 'mirrored' : ''}`} 
              style={{ backgroundColor: `rgba(0, 11, 20, ${opacity})` }}
            >
              <div className="eye-line"></div>
              <div 
                className="scrolling-text"
                style={{ 
                  transform: `translateY(-${scrollPosition}px)`,
                  fontSize: `${fontSize}px` 
                }}
              >
                <div style={{ height: '40vh' }}></div> {/* Buffer for start */}
                {script}
                <div style={{ height: '80vh' }}></div> {/* Buffer for end */}
              </div>
            </div>

            {/* 2. THE RIGHT-SIDE NOTES */}
            <aside className="notes-column">
              <h3>Presenter Notes</h3>
              <p>• Lock eyes with the lens</p>
              <p>• Breathe between points</p>
              <p>• You are the authority</p>
            </aside>
          </div>

          {/* 3. THE BOTTOM CONTROL BAR */}
          <div className="control-bar">
            <div className="control-group">
              <label>Speed</label>
              <input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} />
            </div>
            <div className="control-group">
              <label>Size</label>
              <input type="range" min="16" max="100" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} />
            </div>
            <div className="control-group">
              <label>Glass</label>
              <input type="range" min="0.2" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} />
            </div>
            
            {/* NEW: Mirror Toggle Button */}
            <button 
              className={`mirror-btn ${isMirrored ? 'active' : ''}`}
              onClick={() => setIsMirrored(!isMirrored)}
            >
              {isMirrored ? "NORMAL VIEW" : "MIRROR VIEW"}
            </button>

            <button className="exit-btn-mini" onClick={handleEndSession}>EXIT</button>
          </div>

        </div>
      )}

      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Script Editor</h2>
            <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="Paste here..." />
            <button className="accept-btn" onClick={() => setIsEditorOpen(false)}>Save Script</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App