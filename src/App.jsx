import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  // 1. STATE (The App's Memory)
  const [script, setScript] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  const scrollSpeed = 2; // Adjust this for faster/slower scroll

  // 2. THE ENGINE (The Scrolling Logic)
  // This must stay inside the App function so it can "see" isLive and scrollPosition
  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setScrollPosition((prev) => prev + scrollSpeed);
      }, 50);
    } else {
      setScrollPosition(0); // Reset scroll to top when we stop
    }
    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className="app-container">
      {/* BRANDING HEADER */}
      <header className="header">
        <h1 className="logo">Prompt<span>R</span></h1>
        <p className="tagline">Authority in Every Word.</p>
      </header>

      {/* MAIN CONTENT AREA */}
      {!isLive ? (
        /* DASHBOARD VIEW (Before you start) */
        <main className="dashboard">
          <div className="stencil-box">
            <button className="large-insert-btn" onClick={() => setIsEditorOpen(true)}>
              + INSERT TEXT HERE
            </button>
            {script && (
              <p className="script-status">
                Script Loaded: {script.substring(0, 20)}...
              </p>
            )}
          </div>
          
          {script && (
            <button className="launch-btn" onClick={() => setIsLive(true)}>
              START PROMPTR MODE
            </button>
          )}
        </main>
      ) : (
        /* TELEPROMPTER VIEW (The "Live" Experience) */
        <div className="teleprompter-view">
          <div className="teleprompter-layout">
            {/* MAIN SCRIPT COLUMN (The 3-5 inch window) */}
            <div className="script-column">
              <div 
                className="scrolling-text"
                style={{ transform: `translateY(-${scrollPosition}px)` }}
              >
                {script}
              </div>
            </div>

            {/* PRESENTER NOTES COLUMN (Sidepanel) */}
            <div className="notes-column">
              <h3>Clinical Notes</h3>
              <p>• Maintain eye contact with the lens</p>
              <p>• Pause for emphasis on key steps</p>
              <p>• Project confidence and authority</p>
            </div>
          </div>
          <button className="exit-btn" onClick={() => setIsLive(false)}>
            END SESSION
          </button>
        </div>
      )}

      {/* THE POP-UP EDITOR */}
      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Script Editor</h2>
            <textarea 
              placeholder="Paste your medical lecture or notes here..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
            <div className="modal-actions">
              <button className="accept-btn" onClick={() => setIsEditorOpen(false)}>
                Accept & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App