import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 

const PromptR = () => {
  // --- STATE MANAGEMENT ---
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(true); 
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Teleprompter Controls State
  const [fontSize, setFontSize] = useState(48); 
  const [textWidth, setTextWidth] = useState(350); 
  const [textOpacity, setTextOpacity] = useState(90); 
  const [scrollSpeed, setScrollSpeed] = useState(2); 

  // --- DYNAMIC SCRIPT STATE ---
  const [scriptText, setScriptText] = useState(
`Welcome to PromptR.

Your pasted script will appear right here.

Because the text column is narrow, you can read this entire sentence without your eyes darting left and right.

Adjust the sliders, hit play, and deliver your pitch naturally.`
  );

  // --- AUTO-SCROLL LOGIC ---
  const [scrollY, setScrollY] = useState(0);
  const requestRef = useRef();

  const updateScroll = () => {
    if (isPlaying) {
      setScrollY((prevScroll) => prevScroll + (scrollSpeed * 0.5)); 
    }
    requestRef.current = requestAnimationFrame(updateScroll);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, scrollSpeed]);

  const handleReset = () => {
    setScrollY(0);
    setIsPlaying(false);
  };

  return (
    <div className="app-container">
      <div className="teleprompter-view">
        
        {/* Placeholder for Video Feed */}
        <div className="master-webcam" style={{ backgroundColor: '#18181b' }}>
          {/* Your webcam <video> element goes here */}
        </div>

        {/* --- HIGH VISIBILITY SETTINGS PANEL --- */}
        {showSettings && (
          <div className="settings-panel glass-card dark-panel">
            <h3>PromptR Controls</h3>

            {/* THE TEXT INSERTION BOX */}
            <div className="setting-row">
              <label className="highlight-label">1. Paste Your Script Here:</label>
              <textarea 
                className="script-input-bright"
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Delete this and paste your pitch here..."
              />
            </div>
            
            {/* THE SLIDERS */}
            <div className="setting-row">
              <label>2. Text Width (Narrow = Better Eye Contact)</label>
              <input 
                type="range" min="200" max="800" 
                value={textWidth} 
                onChange={(e) => setTextWidth(Number(e.target.value))} 
              />
            </div>

            <div className="setting-row">
              <label>3. Scroll Speed</label>
              <input 
                type="range" min="1" max="10" 
                value={scrollSpeed} 
                onChange={(e) => setScrollSpeed(Number(e.target.value))} 
              />
            </div>

            <div className="setting-row">
              <label>4. Font Size</label>
              <input 
                type="range" min="24" max="96" 
                value={fontSize} 
                onChange={(e) => setFontSize(Number(e.target.value))} 
              />
            </div>

            <div className="setting-row">
              <label>5. Text Opacity (%)</label>
              <input 
                type="range" min="20" max="100" 
                value={textOpacity} 
                onChange={(e) => setTextOpacity(Number(e.target.value))} 
              />
            </div>
          </div>
        )}

        {/* --- SCRIPT ENGINE --- */}
        <div className="layout-engine">
          <div className="script-column">
            
            {/* The Target Eye-Line */}
            <div className="eye-line-container">
               <div className="eye-line-marker left"></div>
               <div className="eye-line-glow"></div>
               <div className="eye-line-marker right"></div>
            </div>
            
            {/* The Scrolling Text */}
            <div className="scrolling-text-container">
              <div 
                className="scrolling-text"
                style={{
                  maxWidth: `${textWidth}px`,
                  fontSize: `${fontSize}px`,
                  opacity: textOpacity / 100,
                  transform: `translateY(-${scrollY}px)`,
                }}
              >
                <div className="spacer top"></div>
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

          <button 
            className={`btn-icon play-btn ${isPlaying ? 'active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? '⏸ Pause' : '▶️ Play'}
          </button>

          <button className="btn-icon" onClick={handleReset}>
            ⏮ Reset Text
          </button>

          <button 
            className={`btn-icon ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ Settings
          </button>
        </div>

      </div>
    </div>
  );
};

export default PromptR;