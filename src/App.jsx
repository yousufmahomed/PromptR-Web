import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 

const PromptR = () => {
  const videoRef = useRef(null);
  const requestRef = useRef();

  // --- APP STATE ---
  const [mode, setMode] = useState('landing'); 
  const [targetSession, setTargetSession] = useState('present'); 
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
          BACKGROUND LAYER
          ========================================= */}
      {mode === 'meeting' && (
        <div className="meeting-background">
          <div className="meeting-placeholder">
            <span>Participant Feed</span>
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
      
      {/* MOBILE DARK OVERLAY FOR TEXT CONTRAST */}
      {mode !== 'meeting' && (
        <div className={`camera-overlay ${mode === 'present' ? 'light-dim' : 'heavy-dim'}`}></div>
      )}

      {/* =========================================
          SCREEN 1: MOBILE-CENTERED LANDING
          ========================================= */}
      {mode === 'landing' && (
        <div className="centered-wrapper">
          <div className="ambient-glow"></div>
          <div className="landing-content">
            <h1 className="premium-logo">Prompt<span className="accent">R</span></h1>
            <p className="premium-subtitle">Flawless pitches. Total eye contact.</p>
            
            <div className="mobile-stacked-cards">
              <div className="glass-card interactive-card" onClick={() => selectMode('present')}>
                <div className="card-icon blue-glow">🎙️</div>
                <h3>Standard Mode</h3>
                <p>Record solo pitches with a full-screen prompter.</p>
              </div>
              
              <div className="glass-card interactive-card" onClick={() => selectMode('meeting')}>
                <div className="card-icon purple-glow">👥</div>
                <h3>Meeting Mode</h3>
                <p>Join live calls with a floating PIP camera.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          SCREEN 2: MOBILE-FIRST SETUP DASHBOARD
          ========================================= */}
      {mode === 'setup' && (
        <div className="centered-wrapper scrollable-wrapper">
          <div className="setup-stack">
            
            <div className="glass-card">
              <h2 className="gradient-text">Your Pitch</h2>
              <textarea 
                className="premium-textarea"
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Tap here to paste your script..."
              />
            </div>

            <div className="glass-card">
              <h3 className="section-title">Adjust Display</h3>
              
              <div className="slider-group">
                <div className="slider-header">
                  <label>Eye-Line Width</label>
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

            {/* Empty space so the bottom dock doesn't cover content on small phones */}
            <div className="bottom-padding-spacer"></div> 
          </div>
        </div>
      )}

      {/* =========================================
          SCREEN 3: ACTIVE TELEPROMPTER
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
              {scriptText || "No script entered."}
              <div className="spacer-bottom"></div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          FLOATING BOTTOM DOCK (Mobile Friendly)
          ========================================= */}
      {mode !== 'landing' && (
        <div className="floating-dock-container">
          <div className="premium-dock">
            {mode === 'setup' ? (
              <>
                <button className="dock-btn secondary-btn" onClick={() => setMode('landing')}>
                  Back
                </button>
                <button className="dock-btn primary-action" onClick={launchSession}>
                  Launch Mode
                </button>
              </>
            ) : (
              <>
                <button 
                  className={`dock-btn record-btn ${isRecording ? 'is-recording' : ''}`} 
                  onClick={() => setIsRecording(!isRecording)}
                >
                  <span className="dot"></span>
                  {isRecording ? 'Stop' : 'Record'}
                </button>
                <button className="dock-btn secondary-btn stop-action" onClick={endSession}>
                  End
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PromptR;