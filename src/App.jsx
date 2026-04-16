import React, { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [script, setScript] = useState(() => localStorage.getItem("promptr_data") || "");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(45);
  const [opacity, setOpacity] = useState(0.6);
  
  // NEW: PAUSE STATE
  const [isPaused, setIsPaused] = useState(false);

  // STUDIO STATES
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("promptr_data", script);
  }, [script]);

  // UNIVERSAL STUDIO FEED
  useEffect(() => {
    let stream = null;
    if (isLive) {
      async function enableStream() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (videoRef.current) videoRef.current.srcObject = stream;

          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.fftSize = 256;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateMic = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            setMicLevel(sum / dataArray.length);
            animationRef.current = requestAnimationFrame(updateMic);
          };
          updateMic();

        } catch (err) { console.error("Camera/Mic access denied", err); }
      }
      enableStream();
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isLive]);

  // NEW: KEYBOARD LISTENER (Spacebar & Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only pause if we are Live, and NOT typing in the script editor
      if (isLive && (e.code === 'Space' || e.code === 'Enter') && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault(); // Stops the spacebar from scrolling the whole webpage down
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLive]);

  // SCROLL ENGINE (Now respects the isPaused clutch)
  useEffect(() => {
    let interval;
    if (isLive && !isPaused) {
      interval = setInterval(() => {
        setScrollPosition((prev) => prev + (scrollSpeed * 0.4));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed, isPaused]);

  const startRecording = () => {
    setRecordedChunks([]);
    const stream = videoRef.current.srcObject;
    if (!stream) return alert("Camera/Mic not detected.");
    
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
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

  const exitSession = () => {
    setIsLive(false);
    setIsMeetingMode(false);
    setScrollPosition(0);
    setIsRecording(false);
    setIsPaused(false); // Reset pause state
  };

  return (
    <div className={`app-container ${isLive ? 'is-live' : ''} ${isMeetingMode ? 'meeting-active' : ''}`}>
      
      {!isLive && (
        <header className="header">
          <h1 className="logo">Prompt<span>R</span></h1>
        </header>
      )}

      {isLive && <video ref={videoRef} autoPlay playsInline muted className="webcam-feed" />}
      {isRecording && <div className="rec-pulse">REC</div>}

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
            <div className="script-column" style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}>
              <div className="eye-line"></div>
              
              {/* PAUSED WATERMARK */}
              {isPaused && <div className="paused-watermark">PAUSED</div>}

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

          <div className="control-bar">
            <div className="studio-module">
              <div className="mic-monitor">
                <span className="mic-icon">🎤</span>
                <div className="mic-bar-bg">
                  <div className="mic-bar-fill" style={{ width: `${Math.min(micLevel * 1.5, 100)}%`, backgroundColor: micLevel > 60 ? '#ffcc00' : '#34a853' }}></div>
                </div>
              </div>
              
              {!isRecording ? (
                <button className="rec-btn start" onClick={startRecording}>● RECORD</button>
              ) : (
                <button className="rec-btn stop" onClick={stopRecording}>■ STOP</button>
              )}
            </div>

            <div className="settings-module">
              {/* NEW PAUSE BUTTON FOR TOUCHSCREENS */}
              <button className="pause-toggle-btn" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? "▶ PLAY" : "⏸ PAUSE"}
              </button>

              <div className="control-group"><label>Speed</label><input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} /></div>
              <div className="control-group"><label>Size</label><input type="range" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} /></div>
              <div className="control-group"><label>Glass</label><input type="range" min="0" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} /></div>
            </div>

            <button className="exit-btn-mini" onClick={exitSession}>EXIT</button>
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