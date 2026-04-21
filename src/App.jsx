import React, { useState } from 'react';
import './App.css'; // Ensure this points to your CSS file

const PromptR = () => {
  // --- STATE MANAGEMENT ---
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Teleprompter Controls State
  const [fontSize, setFontSize] = useState(48); 
  const [textWidth, setTextWidth] = useState(600); 
  const [textOpacity, setTextOpacity] = useState(90); 

  // Mock Script Content
  const scriptText = `Welcome to PromptR. 

This is your integrated teleprompter and web-conferencing tool. 

Notice how adjusting the "Text Width" slider pulls the margins in. 
By keeping this text narrow, your eyes remain fixed directly under the webcam lens.

No more darting back and forth. No more obvious reading. 
Just confident, natural delivery.`;

  return (
    <div className="app-container">
      <div className="teleprompter-view">
        
        {/* Placeholder for Video Feed */}
        <div className="master-webcam" style={{ backgroundColor: '#18181b' }}>
          {/* Your webcam <video> element goes here */}
        </div>

        {/* --- SETTINGS PANEL (Toggled via button) --- */}
        {showSettings && (
          <div className="settings-panel glass-card">
            <h3>Teleprompter Settings</h3>
            
            <div className="setting-row">
              <label>Text Margins (Reduce to stop eye-tracking)</label>
              <input 
                type="range" 
                min="300" max="1000" 
                value={textWidth} 
                onChange={(e) => setTextWidth(e.target.value)} 
              />
            </div>

            <div className="setting-row">
              <label>Font Size</label>
              <input 
                type="range" 
                min="24" max="96" 
                value={fontSize} 
                onChange={(e) => setFontSize(e.target.value)} 
              />
            </div>

            <div className="setting-row">
              <label>Text Opacity</label>
              <input 
                type="range" 
                min="20" max="100" 
                value={textOpacity} 
                onChange={(e) => setTextOpacity(e.target.value)} 
              />
            </div>
          </div>
        )}

        {/* --- LAYOUT ENGINE & SCRIPT COLUMN --- */}
        <div className="layout-engine">
          <div className="script-column">
            
            {/* The Target Eye-Line */}
            <div className="eye-line-container">
               <div className="eye-line-marker left"></div>
               <div className="eye-line-glow"></div>
               <div className="eye-line-marker right"></div>
            </div>
            
            {/* The Scrolling Text Container */}
            <div className="scrolling-text-container">
              <div 
                className="scrolling-text"
                style={{
                  maxWidth: `${textWidth}px`,
                  fontSize: `${fontSize}px`,
                  opacity: textOpacity / 100,
                  // Note: To implement actual scrolling, you would add logic to update a 
                  // state variable over time, and apply it here like:
                  // transform: `translateY(-${scrollY}px)`
                }}
              >
                <div className="spacer"></div>
                {scriptText}
                <div className="spacer bottom"></div>
              </div>
            </div>
          </div>
        </div>

        {/* --- BOTTOM CONTROLS BAR --- */}
        <div className="controls-bar glass-card">
          <button 
            className={`btn-icon ${isRecording ? 'recording' : ''}`}
            onClick={() => setIsRecording(!isRecording)}
          >
            {isRecording ? <div className="rec-dot"></div> : '⏺'} 
            {isRecording ? 'Stop' : 'Record'}
          </button>

          <button className="btn-icon">
            ⏯ Play / Pause
          </button>

          <button 
            className={`btn-icon ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ Settings
          </button>

          <button className="btn-icon exit">
            Leave Call
          </button>
        </div>

      </div>
    </div>
  );
};

export default PromptR;
}