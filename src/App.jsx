import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // App State
  const [script, setScript] = useState(() => localStorage.getItem("promptr_data") || "Welcome to PromptR. Enter your script here.");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  const [isPrompterHidden, setIsPrompterHidden] = useState(false);
  
  // Teleprompter State
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [fontSize, setFontSize] = useState(45);
  const [isPaused, setIsPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Media Streams
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [webcamSize, setWebcamSize] = useState("large"); 

  // Refs
  const videoRef = useRef(null);
  const screenRef = useRef(null);

  // 1. Initialize Webcam
  useEffect(() => {
    let activeStream = null;
    if (isLive) {
      async function start() {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setWebcamStream(activeStream);
        } catch (err) { 
          alert("Camera Error: Please ensure permissions are granted. " + err.message);
          setIsLive(false);
        }
      }
      start();
    }
    return () => { 
      if (activeStream) activeStream.getTracks().forEach(t => t.stop()); 
    };
  }, [isLive]);

  // 2. Attach Webcam to Video Element
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(e => console.error(e));
    }
  }, [webcamStream, isLive, webcamSize, isMeetingMode]);

  // 3. Attach Screen Share to Video Element (FIXED)
  useEffect(() => {
    if (screenRef.current && screenStream) {
      screenRef.current.srcObject = screenStream;
      screenRef.current.play().catch(e => console.error(e));
    }
  }, [screenStream]);

  // 4. Scrolling Logic
  useEffect(() => {
    let interval;
    if (isLive && !isPaused && !isPrompterHidden) {
      interval = setInterval(() => {
        setScrollPosition(p => p + (scrollSpeed * 0.4));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed, isPaused, isPrompterHidden]);

  // Handlers
  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        stream.getVideoTracks()[0].onended = () => setScreenStream(null);
      } catch (err) { 
        console.error("Screen share canceled or failed", err); 
      }
    }
  };

  const exitSession = () => {
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop()); // FIXED
    setIsLive(false);
    setWebcamStream(null);
    setScreenStream(null);
    setScrollPosition(0); // Reset scroll on exit
  };

  const saveScript = (newScript) => {
    setScript(newScript);
    localStorage.setItem("promptr_data", newScript);
  };

  return (
    <div className="app-container">
      {/* --- LANDING VIEW --- */}
      {!isLive && (
        <div className="landing">
          <h1 className="logo">Prompt<span>R</span></h1>
          
          <button className="pro-btn main" onClick={() => setIsEditorOpen(true)}>
            📝 Edit Script
          </button>
          
          <div className="mode-selection">
            <button className="launch-btn" onClick={() => { setIsMeetingMode(false); setIsLive(true); }}>
              Standard Mode
            </button>
            <button className="launch-btn meeting" onClick={() => { setIsMeetingMode(true); setIsLive(true); }}>
              Meeting Mode
            </button>
          </div>

          {/* Editor Modal */}
          {isEditorOpen && (
            <div className="editor-modal">
              <h2>Edit Script</h2>
              <textarea 
                value={script} 
                onChange={(e) => saveScript(e.target.value)}
                placeholder="Type or paste your script here..."
              />
              <button onClick={() => setIsEditorOpen(false)}>Save & Close</button>
            </div>
          )}
        </div>
      )}

      {/* --- LIVE TELEPROMPTER VIEW --- */}
      {isLive && (
        <div className={`teleprompter-view ${isMeetingMode ? 'meeting-theme' : 'standard-theme'}`}>
          
          {/* Main Webcam Background */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`master-webcam ${screenStream ? 'pip' : isMeetingMode ? 'meeting' : webcamSize}`} 
          />

          {/* Prompter Engine */}
          <div className={`layout-engine ${isPrompterHidden ? 'hidden' : ''}`}>
            
            {/* Screen Share Sidebar */}
            {screenStream && (
              <div className="sidebar">
                <video ref={screenRef} autoPlay playsInline muted className="screen-video" />
              </div>
            )}
            
            {/* Scrolling Text Column */}
            <div className="script-column">
              <div className="eye-line" />
              <div 
                className="scrolling-text" 
                style={{ 
                  transform: `translateY(-${scrollPosition}px)`, 
                  fontSize: `${fontSize}px` 
                }}
              >
                <div style={{ height: '40vh' }} />
                {script}
                <div style={{ height: '70vh' }} />
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="controls">
            <button className="icon-btn" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? "▶ Play" : "⏸ Pause"}
            </button>
            
            <button className="icon-btn" onClick={toggleScreenShare}>
              {screenStream ? "🛑 Stop Share" : "🖥 Share Screen"}
            </button>

            <button className="icon-btn" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
              ⚙️ Settings
            </button>

            <button className="exit-btn" onClick={exitSession}>
              ✖ EXIT
            </button>
          </div>

          {/* Settings Modal (Overlay) */}
          {isSettingsOpen && (
            <div className="settings-panel">
              <div className="setting-row">
                <label>Speed ({scrollSpeed})</label>
                <input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(Number(e.target.value))} />
              </div>
              <div className="setting-row">
                <label>Font Size ({fontSize}px)</label>
                <input type="range" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
              </div>
              <button className="close-settings" onClick={() => setIsSettingsOpen(false)}>Done</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;