import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 

const PromptR = () => {
  // --- CAMERA & SCROLL REFS ---
  const videoRef = useRef(null);
  const requestRef = useRef();

  // --- APP STATE ---
  // Flow: 'landing' -> 'setup' -> ('present' OR 'meeting')
  const [mode, setMode] = useState('landing'); 
  const [targetSession, setTargetSession] = useState('present'); // Remembers what they picked on the landing screen
  const [isRecording, setIsRecording] = useState(false);
  
  // --- TELEPROMPTER SETTINGS ---
  const [fontSize, setFontSize] = useState(48); 
  const [textWidth, setTextWidth] = useState(400); 
  const [scrollSpeed, setScrollSpeed] = useState(3); 
  const [scriptText, setScriptText] = useState("");
  const [scrollY, setScrollY] = useState(0);

  const isActive = mode === 'present' || mode === 'meeting';

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
    if (isActive) {
      setScrollY((prev) => prev + (scrollSpeed * 0.5)); 
    }
    requestRef.current = requestAnimationFrame(updateScroll);
  };

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(updateScroll);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isActive, scrollSpeed]);

  // --- 3. NAVIGATION HANDLERS ---
  const selectMode = (type) => {
    setTargetSession(type);
    setMode('setup');
  };

  const launchSession = () => {
    setScrollY(0);
    setMode(targetSession);
  };

  const endSession = () => {
    setMode('landing');
    setIsRecording(false);
  };

  return (
    <div className="app-container">
      
      {/* =========================================
          BACKGROUND LAYER (Meeting or Solo)
          ========================================= */}
      {mode === 'meeting' && (
        <div className="meeting-background">
          <div className="meeting-placeholder">
            <span>Incoming Screen Share / Participant Feed</span>
          </div>
        </div>
      )}

      {/* LIVE CAMERA */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`master-camera ${mode === 'meeting' ? 'pip' : ''}`} 
      />
      
      {/* DARK OVERLAY FOR CONTRAST */}
      {mode !== 'meeting' && (
        <div className={`camera-overlay ${mode === 'present' ? 'light-dim' : 'heavy-dim'}`}></div>
      )}

      {/* =========================================
          SCREEN 1: THE MODERN LANDING PAGE
          ========================================= */}
      {mode === 'landing' && (
        <div className="landing-screen glass-panel">
          <h1 className="logo">Prompt<span className="accent">R</span></h1>
          <p className="subtitle">Deliver flawless pitches without ever breaking eye contact.</p>
          
          <div className="landing-actions">
            <button className="btn-huge btn-primary" onClick={() => selectMode('present')}>
              <span className="icon">🎙️</span>
              <div className="btn-text">
                <strong>Standard Mode</strong>
                <span>Record Solo Pitch</span>
              </div>
            </button>
            
            <button className="btn-huge btn-secondary" onClick={() => selectMode('meeting')}>
              <span className="icon">👥</span>
              <div className="btn-text">
                <strong>Meeting Mode</strong>
                <span>Live Call with PIP</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* =========================================
          SCREEN 2: SETUP DASHBOARD
          ========================================= */}
      {mode === 'setup' && (
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
          SCREEN 3: ACTIVE TELEPROMPTER ENGINE
          ========================================= */}
      {isActive && (
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

      {/* =========================================
          BOTTOM CONTROLS DOCK
          ========================================= */}
      {mode !== 'landing' && (
        <div className="premium-dock">
          {mode === 'setup' ? (
            <>
              <button className="dock-btn" onClick={() => setMode('landing')}>
                ⬅ Back
              </button>
              <button className="dock-btn primary-action" onClick={launchSession}>
                ▶ Launch {targetSession === 'present' ? 'Standard' : 'Meeting'} Mode
              </button>
            </>
          ) : (
            <>
              <button 
                className={`dock-btn record-btn ${isRecording ? 'is-recording' : ''}`} 
                onClick={() => setIsRecording(!isRecording)}
              >
                <span className="dot"></span>
                {isRecording ? 'Stop Recording' : 'Record'}
              </button>
              <button className="dock-btn primary-action stop-action" onClick={endSession}>
                ⏹ End Session
              </button>
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default PromptR;