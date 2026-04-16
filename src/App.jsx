import React, { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [script, setScript] = useState(() => localStorage.getItem("promptr_data") || "");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(45);
  const [opacity, setOpacity] = useState(0.6);
  const [isMeetingMode, setIsMeetingMode] = useState(false);

  // RECORDING STATES
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("promptr_data", script);
  }, [script]);

  // UNIVERSAL WEBCAM LOGIC (Standard & Meeting)
  useEffect(() => {
    let stream = null;
    if (isLive) {
      async function enableStream() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) { console.error("Camera/Mic access denied", err); }
      }
      enableStream();
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isLive]);

  // SCROLL ENGINE
  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setScrollPosition((prev) => prev + (scrollSpeed * 0.4));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed]);

  // RECORDING FUNCTIONS
  const startRecording = () => {
    setRecordedChunks([]);
    const stream = videoRef.current.srcObject;
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    mediaRecorderRef.current = new MediaRecorder(stream, options);
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) setRecordedChunks((prev) => [...prev, event.data]);
    };
    
    mediaRecorderRef.current.onstop = handleDownload;
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleDownload = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PromptR-Session-${new Date().getTime()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`app-container ${isMeetingMode ? 'meeting-active' : ''}`}>
      {!isLive && (
        <header className="header">
          <h1 className="logo">Prompt<span>R</span></h1>
        </header>
      )}

      {/* WEBCAM IS NOW UNIVERSAL */}
      {isLive && <video ref={videoRef} autoPlay playsInline muted className="webcam-feed" />}

      {!isLive ? (
        <main className="dashboard">
          <div className="stencil-box">
            <button className="large-insert-btn" onClick={() => setIsEditorOpen(true)}>
              {script ? "EDIT SCRIPT" : "+ INSERT SCRIPT"}
            </button>
          </div>
          {script && (
            <div className="mode-selection">
              <button className="launch-btn" onClick={() => { setIsMeetingMode(false); setIsLive(true); }}>Standard Mode</button>
              <button className="launch-btn meeting-btn" onClick={() => { setIsMeetingMode(true); setIsLive(true); }}>Meeting Mode</button>
            </div>
          )}
        </main>
      ) : (
        <div className="teleprompter-view">
          <div className="teleprompter-main-layout">
            <div 
              className="script-column" 
              style={{ backgroundColor: `rgba(0, 0, 0, ${isMeetingMode ? opacity : 0.8})` }}
            >
              <div className="eye-line"></div>
              <div 
                className="scrolling-text" 
                style={{ 
                  transform: `translateY(-${scrollPosition}px)`, 
                  fontSize: `${fontSize}px`,
                  textShadow: '2px 2px 4px rgba(0,0,0,1)'
                }}
              >
                <div style={{ height: '12vh' }}></div>
                {script}
                <div style={{ height: '80vh' }}></div>
              </div>
            </div>
          </div>

          {isRecording && <div className="rec-pulse">REC</div>}

          <div className="control-bar">
            <div className="control-group"><label>Speed</label><input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} /></div>
            <div className="control-group"><label>Size</label><input type="range" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} /></div>
            
            {/* RECORDING BUTTON */}
            {!isRecording ? (
              <button className="rec-btn start" onClick={startRecording}>● RECORD</button>
            ) : (
              <button className="rec-btn stop" onClick={stopRecording}>■ STOP</button>
            )}

            <button className="exit-btn-mini" onClick={() => { setIsLive(false); setIsMeetingMode(false); setScrollPosition(0); setIsRecording(false); }}>EXIT</button>
          </div>
        </div>
      )}

      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <textarea value={script} onChange={(e) => setScript(e.target.value)} />
            <div className="modal-actions">
              <button className="clear-btn" onClick={() => setScript("")}>Clear</button>
              <button className="accept-btn" onClick={() => setIsEditorOpen(false)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default App;