import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [script, setScript] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // PRO CONTROLS
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(32);
  const [opacity, setOpacity] = useState(0.8); // 0 to 1 for transparency

  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setScrollPosition((prev) => prev + (scrollSpeed * 0.5));
      }, 30);
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
            {script && <p className="script-status">Script Verified & Ready</p>}
          </div>
          {script && <button className="launch-btn" onClick={() => setIsLive(true)}>GO LIVE</button>}
        </main>
      ) : (
        <div className="teleprompter-view">
          <div className="control-bar">
            <div className="control-group">
              <label>Speed: {scrollSpeed}</label>
              <input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} />
            </div>
            <div className="control-group">
              <label>Text Size: {fontSize}px</label>
              <input type="range" min="16" max="60" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} />
            </div>
            <div className="control-group">
              <label>Transparency: {Math.round(opacity * 100)}%</label>
              <input type="range" min="0.2" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} />
            </div>
          </div>

          <div className="teleprompter-layout">
            <div className="script-column" style={{ backgroundColor: `rgba(0, 11, 20, ${opacity})` }}>
              {/* THE EYE-LINE INDICATOR */}
              <div className="eye-line"></div>
              
              <div 
                className="scrolling-text"
                style={{ 
                  transform: `translateY(-${scrollPosition}px)`,
                  fontSize: `${fontSize}px` 
                }}
              >
                {/* Adding some empty space at top so the first line starts at the eye-line */}
                <div style={{ height: '150px' }}></div>
                {script}
                <div style={{ height: '400px' }}></div>
              </div>
            </div>

            <div className="notes-column">
              <h3>Presenter Notes</h3>
              <p>• Speak with conviction</p>
              <p>• Eye-line is your anchor</p>
              <p>• Breathe at the end of points</p>
            </div>
          </div>
          <button className="exit-btn" onClick={() => setIsLive(false)}>END SESSION</button>
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