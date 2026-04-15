import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [script, setScript] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // NEW: Controls for a better experience
  const [scrollSpeed, setScrollSpeed] = useState(1); // Default to a slower 1
  const [fontSize, setFontSize] = useState(32); // Large enough to read easily

  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setScrollPosition((prev) => prev + (scrollSpeed * 0.5));
      }, 30); // Smoother frame rate
    } else {
      setScrollPosition(0);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed]);

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
            {script && <p className="script-status">Ready to Record</p>}
          </div>
          {script && <button className="launch-btn" onClick={() => setIsLive(true)}>GO LIVE</button>}
        </main>
      ) : (
        <div className="teleprompter-view">
          {/* CONTROL BAR (Presenter Only) */}
          <div className="control-bar">
            <div className="control-group">
              <label>Speed: {scrollSpeed}</label>
              <input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} />
            </div>
            <div className="control-group">
              <label>Text Size: {fontSize}px</label>
              <input type="range" min="16" max="60" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} />
            </div>
          </div>

          <div className="teleprompter-layout">
            <div className="script-column">
              <div 
                className="scrolling-text"
                style={{ 
                  transform: `translateY(-${scrollPosition}px)`,
                  fontSize: `${fontSize}px` 
                }}
              >
                {script}
              </div>
            </div>

            <div className="notes-column">
              <h3>Presenter Notes</h3>
              <p>• Speak slowly</p>
              <p>• Watch the camera lens</p>
              <p>• Breathe</p>
            </div>
          </div>
          <button className="exit-btn" onClick={() => setIsLive(false)}>END</button>
        </div>
      )}

      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Script Editor</h2>
            <textarea value={script} onChange={(e) => setScript(e.target.value)} />
            <button className="accept-btn" onClick={() => setIsEditorOpen(false)}>Accept</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App