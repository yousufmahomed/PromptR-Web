import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  const [opacity, setOpacity] = useState(0.6);
  
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [webcamSize, setWebcamSize] = useState("large"); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const screenRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const chunksRef = useRef([]);

  // --- CAMERA ATTACHMENT LOGIC ---
  // Using a callback ref ensures that the stream is attached 
  // the VERY INSTANT the video element is created in the DOM.
  const webcamRef = useCallback((node) => {
    if (node !== null && webcamStream) {
      node.srcObject = webcamStream;
      node.play().catch(e => console.error("Video play failed:", e));
    }
  }, [webcamStream, isMeetingMode, isPrompterHidden, webcamSize]);

  // --- HARDWARE INITIALIZATION ---
  useEffect(() => {
    let stream = null;
    if (isLive) {
      async function startCamera() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, 
            audio: true 
          });
          setWebcamStream(stream);
          
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const updateMic = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            setMicLevel(sum / dataArray.length);
            animationRef.current = requestAnimationFrame(updateMic);
          };
          updateMic();
        } catch (err) { 
          console.error("Hardware Error:", err);
          alert("Camera access failed. Ensure no other apps (Zoom/Teams) are using it.");
        }
      }
      startCamera();
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isLive]);

  // Screen Share Assignment
  useEffect(() => {
    if (screenRef.current && screenStream) {
      screenRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Scroll Engine
  useEffect(() => {
    let interval;
    if (isLive && !isPaused && !isPrompterHidden) {
      interval = setInterval(() => {
        setScrollPosition(p => p + (scrollSpeed * 0.4));
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

  const startRecording = () => {
    chunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(webcamStream);
    mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PromptR-Recording.webm`;
      a.click();
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const exitSession = () => {
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    setWebcamStream(null);
    setScreenStream(null);
    setIsLive(false);
    setIsMeetingMode(false);
    setIsPrompterHidden(false);
    setIsPaused(false);
    setScrollPosition(0);
  };

  return (
    <div className={`app-container ${isLive ? 'is-live' : ''}`}>
      
      {!isLive && (
        <header className="header">
          <h1 className="logo">Prompt<span>R</span></h1>
        </header>
      )}

      {/* WEBCAM LAYER */}
      {isLive && (
        <video 
          ref={webcamRef} 
          autoPlay 
          playsInline 
          muted 
          className={`webcam-feed ${screenStream ? 'pip-mode' : isMeetingMode ? 'meeting-mode-cam' : `size-${webcamSize}`}`} 
        />
      )}

      {!isLive ? (
        <main className="dashboard">
          <div className="stencil-box">
            <button className="large-insert-btn" onClick={() => setIsEditorOpen(true)}>
              {script ? "EDIT SCRIPT" : "+ INSERT SCRIPT"}
            </button>
          </div>
          <div className="mode-selection">
            <button className="launch-btn" onClick={() => setIsLive(true)}>Standard Mode</button>
            <button className="launch-btn meeting-btn" onClick={() => { setIsMeetingMode(true); setIsLive(true); }}>Meeting Mode</button>
            <button className="launch-btn freetalk-btn" onClick={() => { setIsPrompterHidden(true); setIsLive(true); }}>Free Talk</button>
          </div>
        </main>
      ) : (
        <div className="teleprompter-view">
          <div className={`teleprompter-main-layout ${isPrompterHidden ? 'no-prompter' : ''}`}>
            
            {/* SCREEN SHARE DOCK */}
            {screenStream && (
              <div className="screen-share-sidebar">
                <div className="sidebar-label">● LIVE SHARE</div>
                <video ref={screenRef} autoPlay playsInline muted className="sidebar-video" />
              </div>
            )}

            {!isPrompterHidden && (
              <div className="script-column" style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}>
                <div className="eye-line"></div>
                {isPaused && <div className="paused-watermark">PAUSED</div>}
                <div className="scrolling-text" style={{ transform: `translateY(-${scrollPosition}px)`, fontSize: `${fontSize}px` }}>
                  <div style={{ height: '15vh' }}></div>{script}<div style={{ height: '80vh' }}></div>
                </div>
              </div>
            )}
          </div>

          <button className="ai-fab" onClick={() => setIsAiOpen(!isAiOpen)}>✨ AI</button>
          
          <div className="control-bar-wrapper">
            <div className={`settings-popover ${isSettingsOpen ? 'open' : ''}`}>
              <div className="control-group">
                <label>Cam Size</label>
                <select className="ui-select" value={webcamSize} onChange={(e) => setWebcamSize(e.target.value)}>
                  <option value="small">Small</option><option value="medium">Medium</option><option value="large">Full</option>
                </select>
              </div>
              <div className="control-group"><label>Speed</label><input type="range" min="0.1" max="10" step="0.1" value={scrollSpeed} onChange={(e) => setScrollSpeed(e.target.value)} /></div>
            </div>

            <div className="control-bar">
              <button className="action-btn" onClick={() => setIsPaused(!isPaused)}>{isPaused ? "▶" : "⏸"}</button>
              <button className="action-btn" onClick={toggleScreenShare}>🖥</button>
              {!isMeetingMode && <button className={`action-btn rec ${isRecording ? 'active' : ''}`} onClick={isRecording ? () => setIsRecording(false) : startRecording}>●</button>}
              <button className="icon-btn" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>⚙️</button>
              <button className="exit-btn-mini" onClick={exitSession}>EXIT</button>
            </div>
          </div>
        </div>
      )}

      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <textarea value={script} onChange={(e) => setScript(e.target.value)} />
            <div className="modal-actions"><button onClick={() => setIsEditorOpen(false)}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
export default App;