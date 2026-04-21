import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 

const PromptR = () => {
  // --- CAMERA & SCROLL REFS ---
  const videoRef = useRef(null);
  const requestRef = useRef();

  // --- APP STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState('edit'); // 'edit' | 'present'
  
  // --- TELEPROMPTER SETTINGS ---
  const [fontSize, setFontSize] = useState(48); 
  const [textWidth, setTextWidth] = useState(400); 
  const [scrollSpeed, setScrollSpeed] = useState(3); 
  const [scriptText, setScriptText] = useState("");
  const [scrollY, setScrollY] = useState(0);

  // --- 1. WEBCAM INITIALIZATION ---
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied.", err);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // --- 2. SMOOTH SCROLL ENGINE ---
  const updateScroll = () => {
    if (mode === 'present') {
      setScrollY((prev) => prev + (scrollSpeed * 0.5)); 
    }
    requestRef.current = requestAnimationFrame(updateScroll);
  };

  useEffect(() => {
    if (mode === 'present') {
      requestRef.current = requestAnimationFrame(updateScroll);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [mode, scrollSpeed]);

  // --- 3. MODE HANDLERS ---
  const toggleMode = () => {
    if (mode === 'edit') {
      setScrollY(0); // Reset scroll when starting
      setMode('present');
    } else {
      setMode('edit');
    }
  };

  return (
    <div className="app-container">
      
      {/* LIVE CAMERA BACKGROUND */}
      <video ref={videoRef} autoPlay playsInline muted className="master-camera" />
      
      {/* DARK OVERLAY FOR CONTRAST */}
      <div className={`camera-overlay ${mode === 'present' ? 'light-dim' : 'heavy-dim'}`}></div>

      {/* =========================================
          MODE 1: EDIT & SETUP (Vibrant & Clean)
          ========================================= */}
      {mode === 'edit' && (
        <div className="setup-dashboard">
          <div className="glass-panel editor-panel">
            <h2 className="gradient-text">Prepare Your Pitch</h2>
            <textarea 
              className="premium-textarea"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste your script here to get started..."
            />
          </div>

          <div className="glass-panel settings-panel">
            <h3 className="section-title">Display Settings</h3>
            
            <div className="slider-group">
              <div className="slider-header">
                <label>Text Width (Eye-Line)</label>
                <span>{textWidth}px</span>
              </div>
              <input type="range" min="200" max="800" value={textWidth} onChange={(e) => setTextWidth(Number(e.target.value))} />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label>Scroll Speed</label>
                <span>{scrollSpeed}x</span>
              </div>
              <input type="range" min="1" max="10" value={scrollSpeed} onChange={(e) => setScrollSpeed(Number(e.target.value))} />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label>Font Size</label>
                <span>{fontSize}px</span>
              </div>
              <input type="range" min="24" max="96" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODE 2: PRESENTER (Minimalist)
          ========================================= */}
      {mode === 'present' && (
        <div className="presenter-engine">
          <div className="target-eyeline">
            <div className="glow-bar"></div>
          </div>
          
          <div className="scrolling-canvas">
            <div 
              className="scrolling-text"
              style={{
                maxWidth: `${textWidth}px`,
                fontSize: `${fontSize}px`,
                transform: `translateY(-${scrollY}px)`,
              }}
            >
              <div className="spacer-top"></div>
              {scriptText || "You forgot to paste your script!"}
              <div className="spacer-bottom"></div>
            </div>
          </div>
        </div>
      )}

      {/* --- PREMIUM BOTTOM DOCK --- */}
      <div className="premium-dock">
        <button 
          className={`dock-btn record-btn ${isRecording ? 'is-recording' : ''}`} 
          onClick={() => setIsRecording(!isRecording)}
        >
          <span className="dot"></span>
          {isRecording ? 'Stop Recording' : 'Record'}
        </button>

        <button className={`dock-btn primary-action ${mode === 'present' ? 'stop-action' : ''}`} onClick={toggleMode}>
          {mode === 'edit' ? '▶ Start Teleprompter' : '⏹ End Presentation'}
        </button>
      </div>

    </div>
  );
};

export default PromptR;