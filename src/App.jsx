import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // App State
  const [script, setScript] = useState(() => localStorage.getItem("promptr_data") || "Welcome to PromptR. Look directly at the camera.\n\nUse the settings gear to adjust speed, text size, and background transparency.\n\nHit record when you are ready.");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  const [isPrompterHidden, setIsPrompterHidden] = useState(false);
  
  // Teleprompter State
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [fontSize, setFontSize] = useState(55);
  const [camOpacity, setCamOpacity] = useState(0.4); // Transparency Slider State
  const [isPaused, setIsPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Media Streams & Recording
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Refs
  const videoRef = useRef(null);
  const screenRef = useRef(null);

  // Initialize Webcam
  useEffect(() => {
    let activeStream = null;
    if (isLive) {
      async function start() {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: true });
          setWebcamStream(activeStream);
        } catch (err) { 
          alert("Camera Error: " + err.message);
          setIsLive(false);
        }
      }
      start();
    }
    return () => { if (activeStream) activeStream.getTracks().forEach(t => t.stop()); };
  }, [isLive]);

  // Attach Webcam
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(e => console.error(e));
    }
  }, [webcamStream, isLive, isMeetingMode]);

  // Attach Screen Share
  useEffect(() => {
    if (screenRef.current && screenStream) {
      screenRef.current.srcObject = screenStream;
      screenRef.current.play().catch(e => console.error(e));
    }
  }, [screenStream]);

  // Scrolling Logic
  useEffect(() => {
    let interval;
    if (isLive && !isPaused && !isPrompterHidden) {
      interval = setInterval(() => {
        setScrollPosition(p => p + (scrollSpeed * 0.4));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed, isPaused, isPrompterHidden]);

  // --- RECORDING LOGIC ---
  const handleRecordToggle = () => {
    if (isRecording) {
      // Stop Recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      // Start Recording
      if (!webcamStream) return alert("Camera not active");
      recordedChunksRef.current = [];
      try {
        const options = { mimeType: 'video/webm;codecs=vp9,opus' };
        const recorder = new MediaRecorder(webcamStream, options);
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `PromptR_Recording_${new Date().toISOString().split('T')[0]}.webm`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Recording error:", err);
        alert("Failed to start recording. Browser may not support WebM format.");
      }
    }
  };

  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(stream);
        stream.getVideoTracks()[0].onended = () => setScreenStream(null);
      } catch (err) { console.error("Screen share canceled", err); }
    }
  };

  const exitSession = () => {
    if (isRecording) handleRecordToggle(); // Stop recording if active
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    setIsLive(false);
    setWebcamStream(null);
    setScreenStream(null);
    setScrollPosition(0);
  };

  return (
    <div className="app-container">
      {!isLive ? (
        <div className="landing">
          <div className="glass-card">
            <h1 className="logo">Prompt<span className="accent">R</span></h1>
            <p className="subtitle">The Invisible Video Prompter</p>
            
            <button className="btn-primary" onClick={() => setIsEditorOpen(true)}>
              <span className="icon">📝</span> Edit Script
            </button>
            
            <div className="mode-selection">
              <button className="btn-secondary" onClick={() => { setIsMeetingMode(false); setIsLive(true); }}>
                Standard Rec Mode
              </button>
              <button className="btn-secondary meeting" onClick={() => { setIsMeetingMode(true); setIsLive(true); }}>
                Meeting Mode
              </button>
            </div>
          </div>

          {isEditorOpen && (
            <div className="editor-overlay">
              <div className="editor-modal glass-card">
                <h2>Your Script</h2>
                <textarea 
                  value={script} 
                  onChange={(e) => {
                    setScript(e.target.value);
                    localStorage.setItem("promptr_data", e.target.value);
                  }}
                  placeholder="Paste your script here..."
                />
                <button className="btn-primary" onClick={() => setIsEditorOpen(false)}>Save & Close</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="teleprompter-view">
          {/* Main Webcam (Inline Opacity Slider applied here) */}
          <video 
            ref={videoRef} 
            autoPlay playsInline muted 
            className={`master-webcam ${screenStream ? 'pip' : isMeetingMode ? 'meeting' : ''}`} 
            style={{ opacity: screenStream || isMeetingMode ? 1 : camOpacity }}
          />

          <div className="layout-engine">
            {screenStream && (
              <div className="sidebar">
                <video ref={screenRef} autoPlay playsInline muted className="screen-video" />
              </div>
            )}
            
            <div className="script-column">
              {/* New Modern Eye-Line */}
              <div className="eye-line-container">
                <div className="eye-line-marker left"></div>
                <div className="eye-line-glow"></div>
                <div className="eye-line-marker right"></div>
              </div>

              <div 
                className="scrolling-text" 
                style={{ transform: `translateY(-${scrollPosition}px)`, fontSize: `${fontSize}px` }}
              >
                <div className="spacer" />
                {script}
                <div className="spacer bottom" />
              </div>
            </div>
          </div>

          {/* Settings Overlay */}
          {isSettingsOpen && (
            <div className="settings-panel glass-card">
              <h3>Controls</h3>
              <div className="setting-row">
                <label>Transparency</label>
                <input type="range" min="0.1" max="1" step="0.05" value={camOpacity} onChange={(e) => setCamOpacity(Number(e.target.value))} />
              </div>
              <div className="setting-row">
                <label>Scroll Speed</label>
                <input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(Number(e.target.value))} />
              </div>
              <div className="setting-row">
                <label>Font Size</label>
                <input type="range" min="30" max="120" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
              </div>
            </div>
          )}

          {/* Bottom Glass Controls */}
          <div className="controls-bar glass-card">
            <button className={`btn-icon ${isRecording ? 'recording' : ''}`} onClick={handleRecordToggle}>
              <span className="rec-dot"></span> {isRecording ? "Stop Recording" : "Record"}
            </button>

            <button className="btn-icon" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? "▶ Play Text" : "⏸ Pause Text"}
            </button>
            
            <button className="btn-icon" onClick={toggleScreenShare}>
              {screenStream ? "🛑 Stop Share" : "🖥 Share Screen"}
            </button>

            <button className={`btn-icon ${isSettingsOpen ? 'active' : ''}`} onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
              ⚙️ Settings
            </button>

            <button className="btn-icon exit" onClick={exitSession}>
              ✖ Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;