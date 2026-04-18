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

  // --- UNIVERSAL HARDWARE ENGINE ---
  useEffect(() => {
    let activeStream = null;

    if (isLive) {
      async function start() {
        try {
          // FIX: Using the most basic constraints to prevent "Device Not Found"
          activeStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          setWebcamStream(activeStream);
        } catch (err) { 
          let msg = "Hardware Error: ";
          if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            msg += "No camera or microphone detected. Please plug them in!";
          } else if (err.name === 'NotAllowedError') {
            msg += "Permission denied. Please click the 'Lock' icon in the URL bar and allow Camera.";
          } else {
            msg += err.message;
          }
          alert(msg);
          setIsLive(false);
        }
      }
      start();
    }

    return () => { 
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLive]);

  // --- SYNC FEED TO SCREEN ---
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(e => console.warn("Stream Playback Issue:", e));
    }
  }, [webcamStream, isLive, webcamSize, isMeetingMode]);

  useEffect(() => {
    if (screenRef.current && screenStream) {
      screenRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // --- SCROLL LOGIC ---
  useEffect(() => {
    let interval;
    if (isLive && !isPaused && !isPrompterHidden) {
      interval = setInterval(() => {
        setScrollPosition(prev => prev + (scrollSpeed * 0.4));
      }, 30);
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
  };

  return (
    <div className={`app-container ${isLive ? 'is-live' : ''}`}>
      
      {/* THE HOST VIDEO (Persistent) */}
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
             <button className="pro-insert-btn" onClick={() => setIsEditorOpen(true)}>
               {script ? "EDIT SCRIPT" : "+ INSERT SCRIPT"}
             </button>
          </div>
          <div className="mode-selection">
            <button className="launch-btn" onClick={() => setIsLive(true)}>Standard</button>
            <button className="launch-btn green-glow" onClick={() => { setIsMeetingMode(true); setIsLive(true); }}>Meeting</button>
            <button className="launch-btn purple-glow" onClick={() => { setIsPrompterHidden(true); setIsLive(true); }}>Free Talk</button>
          </div>
        </div>
      ) : (
        <div className="teleprompter-view">
          <div className={`teleprompter-layout ${isPrompterHidden ? 'hidden-prompter' : ''}`}>
            
            {screenStream && (
              <div className="screen-share-sidebar">
                <div className="live-tag">● LIVE SHARE</div>
                <video ref={screenRef} autoPlay playsInline muted />
              </div>
            )}

            {!isPrompterHidden && (
              <div className="script-column">
                <div className="eye-line" />
                <div className="scrolling-text" style={{ transform: `translateY(-${scrollPosition}px)`, fontSize: `${fontSize}px` }}>
                  <div style={{ height: '25vh' }} />{script}<div style={{ height: '75vh' }} />
                </div>
              </div>
            )}
          </div>

          <div className="control-bar-wrapper">
            <div className="control-bar">
               <button onClick={() => setIsPaused(!isPaused)} className="ui-btn">{isPaused ? "▶" : "⏸"}</button>
               <button onClick={toggleScreenShare} className="ui-btn">🖥</button>
               <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="ui-btn">⚙️</button>
               <button className="ui-btn exit-accent" onClick={exitSession}>EXIT</button>
            </div>
            
            {isSettingsOpen && (
              <div className="settings-bubble">
                 <select value={webcamSize} onChange={(e) => setWebcamSize(e.target.value)}>
                   <option value="large">Full Backdrop</option>
                   <option value="medium">Medium Frame</option>
                   <option value="small">Floating Pin</option>
                 </select>
                 <div className="speed-wrap">
                   <span>SPEED</span>
                   <input type="range" min="0.1" max="10" step="0.1" value={scrollSpeed} onChange={(e) => setScrollSpeed(e.target.value)} />
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="Paste your script here..." />
            <button className="save-btn" onClick={() => setIsEditorOpen(false)}>DONE</button>
          </div>
        </div>
      )}
    </div>
  )
}
export default App;