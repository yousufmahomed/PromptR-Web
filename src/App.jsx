import React, { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [script, setScript] = useState(() => localStorage.getItem("promptr_data") || "");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  const [isPrompterHidden, setIsPrompterHidden] = useState(false);
  
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(45);
  const [isPaused, setIsPaused] = useState(false);
  
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [webcamSize, setWebcamSize] = useState("large"); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const videoRef = useRef(null);
  const screenRef = useRef(null);

  // --- HARDWARE INITIALIZATION ---
  useEffect(() => {
    let activeStream = null;

    if (isLive) {
      async function start() {
        try {
          // Standard request for cam/mic
          activeStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720 }, 
            audio: true 
          });
          setWebcamStream(activeStream);
        } catch (err) { 
          // Advanced Debugging
          let msg = "Hardware Error: ";
          if (err.name === 'NotAllowedError') msg += "Camera Permission Denied.";
          else if (err.name === 'NotReadableError') msg += "Camera is already in use by another app (Zoom/Teams).";
          else if (!window.isSecureContext) msg += "SSL Required. Use HTTPS.";
          else msg += err.message;
          
          alert(msg);
          setIsLive(false);
        }
      }
      start();
    }

    return () => { 
      if (activeStream) activeStream.getTracks().forEach(track => track.stop());
    };
  }, [isLive]);

  // --- PERSISTENT ATTACHMENT ---
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      if (videoRef.current.srcObject !== webcamStream) {
        videoRef.current.srcObject = webcamStream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [webcamStream, isMeetingMode, webcamSize, isLive]);

  // --- SCREEN SHARE ATTACHMENT ---
  useEffect(() => {
    if (screenRef.current && screenStream) {
      screenRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // --- SCROLL ENGINE ---
  useEffect(() => {
    let interval;
    if (isLive && !isPaused && !isPrompterHidden) {
      interval = setInterval(() => setScrollPosition(p => p + (scrollSpeed * 0.4)), 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed, isPaused, isPrompterHidden]);

  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        stream.getVideoTracks()[0].onended = () => setScreenStream(null);
      } catch (err) { console.error(err); }
    }
  };

  const exitSession = () => {
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    setWebcamStream(null);
    setScreenStream(null);
    setIsLive(false);
    setScrollPosition(0);
    setIsPaused(false);
  };

  return (
    <div className={`app-container ${isLive ? 'is-live' : ''}`}>
      
      {/* PERSISTENT HOST VIDEO */}
      {isLive && (
        <video 
          ref={videoRef} 
          autoPlay playsInline muted 
          className={`master-webcam ${screenStream ? 'pip' : isMeetingMode ? 'meeting' : webcamSize}`} 
        />
      )}

      {!isLive ? (
        <div className="landing">
          <h1 className="logo">Prompt<span>R</span></h1>
          <div className="stencil-box">
             <button className="large-insert-btn" onClick={() => setIsEditorOpen(true)}>
               {script ? "EDIT SCRIPT" : "+ INSERT SCRIPT"}
             </button>
          </div>
          <div className="mode-selection">
            <button className="launch-btn" onClick={() => setIsLive(true)}>Standard</button>
            <button className="launch-btn meeting-btn" onClick={() => { setIsMeetingMode(true); setIsLive(true); }}>Meeting</button>
            <button className="launch-btn freetalk-btn" onClick={() => { setIsPrompterHidden(true); setIsLive(true); }}>Free Talk</button>
          </div>
        </div>
      ) : (
        <div className="teleprompter-view">
          <div className={`teleprompter-layout ${isPrompterHidden ? 'center-only' : ''}`}>
            
            {screenStream && (
              <div className="screen-share-sidebar">
                <div className="sidebar-label">● LIVE SHARE</div>
                <video ref={screenRef} autoPlay playsInline muted className="sidebar-video" />
              </div>
            )}

            {!isPrompterHidden && (
              <div className="script-column">
                <div className="eye-line" />
                {isPaused && <div className="paused-watermark">PAUSED</div>}
                <div className="scrolling-text" style={{ transform: `translateY(-${scrollPosition}px)`, fontSize: `${fontSize}px` }}>
                  <div style={{ height: '20vh' }} />{script}<div style={{ height: '80vh' }} />
                </div>
              </div>
            )}
          </div>

          <div className="control-bar-wrapper">
            <div className="control-bar">
               <button onClick={() => setIsPaused(!isPaused)} className="action-btn">{isPaused ? "▶" : "⏸"}</button>
               <button onClick={toggleScreenShare} className="action-btn">🖥</button>
               <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="action-btn">⚙️</button>
               <button className="action-btn exit" onClick={exitSession}>EXIT</button>
            </div>
            
            {isSettingsOpen && (
              <div className="settings-popover">
                 <label>Camera View</label>
                 <select value={webcamSize} onChange={(e) => setWebcamSize(e.target.value)}>
                   <option value="large">Full Screen</option>
                   <option value="medium">Medium</option>
                   <option value="small">Thumbnail</option>
                 </select>
                 <label>Speed</label>
                 <input type="range" min="0.1" max="10" step="0.1" value={scrollSpeed} onChange={(e) => setScrollSpeed(e.target.value)} />
              </div>
            )}
          </div>
        </div>
      )}

      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <textarea value={script} onChange={(e) => setScript(e.target.value)} />
            <button className="save-btn" onClick={() => setIsEditorOpen(false)}>SAVE</button>
          </div>
        </div>
      )}
    </div>
  )
}
export default App;