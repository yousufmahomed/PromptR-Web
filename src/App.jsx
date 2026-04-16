import React, { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  // --- STATE ---
  const [script, setScript] = useState(() => localStorage.getItem("promptr_data") || "");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(45);
  const [opacity, setOpacity] = useState(0.6);
  
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [webcamSize, setWebcamSize] = useState("large"); 
  
  // UI Upgrades
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([
    { role: 'system', text: "Hi! I'm PromptR AI. Need help using the app, or want me to rewrite your script?" }
  ]);

  // --- REFS ---
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem("promptr_data", script);
  }, [script]);

  // 1. Fetch Webcam
  useEffect(() => {
    let stream = null;
    if (isLive) {
      async function enableStream() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setWebcamStream(stream);

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
        } catch (err) { 
          console.error("Camera/Mic access denied", err); 
          alert("We could not access your camera! Please make sure your browser has permission and no other apps (like Zoom) are currently using it.");
        }
      }
      enableStream();
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isLive]);

  // 2. Attach Webcam Safely (BULLETPROOF VERSION)
  // By removing the dependency array, this checks the video feed on *every single render*.
  // If React accidentally unplugs the video when changing classes, this plugs it right back in!
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      if (videoRef.current.srcObject !== webcamStream) {
        videoRef.current.srcObject = webcamStream;
      }
      // Force it to play in case a layout shift paused it
      videoRef.current.play().catch(e => console.log("Autoplay bypass:", e));
    }
  }); 

  // 3. Attach Screen Share Safely
  useEffect(() => {
    if (screenRef.current && screenStream) {
      if (screenRef.current.srcObject !== screenStream) {
        screenRef.current.srcObject = screenStream;
      }
      screenRef.current.play().catch(e => console.log("Autoplay bypass:", e));
    }
  });

  // Keyboard Pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLive && (e.code === 'Space' || e.code === 'Enter') && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault(); 
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLive]);

  // Scroll Engine
  useEffect(() => {
    let interval;
    if (isLive && !isPaused) {
      interval = setInterval(() => {
        setScrollPosition((prev) => prev + (scrollSpeed * 0.4));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed, isPaused]);

  // --- ACTIONS ---
  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(stream);
        stream.getVideoTracks()[0].onended = () => setScreenStream(null);
      } catch (err) { console.error("Screen share denied", err); }
    }
  };

  const startRecording = () => {
    setRecordedChunks([]);
    if (!webcamStream) return alert("Camera not detected.");
    mediaRecorderRef.current = new MediaRecorder(webcamStream, { mimeType: 'video/webm;codecs=vp9,opus' });
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
    alert("Success! Your video has been saved to your computer's 'Downloads' folder.");
    URL.revokeObjectURL(url);
  };

  const exitSession = () => {
    setIsLive(false);
    setIsMeetingMode(false);
    setScrollPosition(0);
    setIsRecording(false);
    setIsPaused(false);
    setIsAiOpen(false);
    setIsSettingsOpen(false);
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  };

  const handleAiSubmit = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    
    const newMessages = [...aiMessages, { role: 'user', text: aiInput }];
    setAiMessages(newMessages);
    setAiInput("");

    setTimeout(() => {
      if (newMessages[newMessages.length - 1].text.toLowerCase().includes("rewrite")) {
        setScript(prev => `[AI REWRITTEN SCRIPT]\n\n${prev}\n\n(This is a smoother, more engaging version of your previous text!)`);
        setAiMessages(prev => [...prev, { role: 'system', text: "I've updated your script! Let me know if you need any other tweaks." }]);
      } else {
        setAiMessages(prev => [...prev, { role: 'system', text: "I am a demo AI right now! Connect me to an API and I'll be fully functional." }]);
      }
    }, 1200);
  };

  // --- RENDER ---
  return (
    <div className={`app-container ${isLive ? 'is-live' : ''} ${isMeetingMode ? 'meeting-active' : ''}`}>
      
      {!isLive && (
        <header className="header">
          <h1 className="logo">Prompt<span>R</span></h1>
        </header>
      )}

      {/* BACKGROUND / FLOATING WEBCAM FEED */}
      {isLive && (
        <video 
          ref={videoRef} 
          autoPlay playsInline muted 
          className={`webcam-feed ${screenStream ? 'pip-mode' : isMeetingMode ? 'meeting-mode-cam' : `size-${webcamSize}`}`} 
        />
      )}

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
          
          <div className={`teleprompter-main-layout ${screenStream ? 'has-screen-share' : ''}`}>
            
            {/* DOCKED SCREEN SHARE SIDEBAR */}
            {screenStream && (
              <div className="screen-share-sidebar">
                <div className="sidebar-label">● LIVE SHARE</div>
                <video ref={screenRef} autoPlay playsInline muted className="sidebar-video" />
              </div>
            )}

            <div className="script-column" style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}>
              <div className="eye-line"></div>
              {isPaused && <div className="paused-watermark">PAUSED</div>}
              <div className="scrolling-text" style={{ transform: `translateY(-${scrollPosition}px)`, fontSize: `${fontSize}px`, textShadow: '2px 2px 4px rgba(0,0,0,1)' }}>
                <div style={{ height: '12vh' }}></div>
                {script}
                <div style={{ height: '80vh' }}></div>
              </div>
            </div>
          </div>

          {/* AI FLOATING BUTTON & PANEL */}
          <button className="ai-fab" onClick={() => setIsAiOpen(!isAiOpen)}>✨ AI</button>
          
          <div className={`ai-panel ${isAiOpen ? 'open' : ''}`}>
            <div className="ai-header">
              <h3>PromptR AI</h3>
              <button onClick={() => setIsAiOpen(false)}>×</button>
            </div>
            <div className="ai-chat-window">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`ai-message ${msg.role}`}>{msg.text}</div>
              ))}
            </div>
            <form onSubmit={handleAiSubmit} className="ai-input-area">
              <input type="text" value={aiInput} onChange={(e)=>setAiInput(e.target.value)} placeholder="e.g. Rewrite my script..." />
              <button type="submit">↑</button>
            </form>
          </div>

          {/* CONTROL BAR */}
          <div className="control-bar-wrapper">
            
            <div className={`settings-popover ${isSettingsOpen ? 'open' : ''}`}>
              <h4>Prompter Settings</h4>
              <div className="control-group">
                <label>Cam Size</label>
                <select className="ui-select" value={webcamSize} onChange={(e) => setWebcamSize(e.target.value)}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Full</option>
                </select>
              </div>
              <div className="control-group"><label>Speed</label><input type="range" min="0" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} /></div>
              <div className="control-group"><label>Text Size</label><input type="range" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} /></div>
              <div className="control-group"><label>Glass Opacity</label><input type="range" min="0" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} /></div>
            </div>

            <div className="control-bar">
              <div className="studio-module">
                <button className={`action-btn pause ${isPaused ? 'active' : ''}`} onClick={() => setIsPaused(!isPaused)}>
                  {isPaused ? "▶ RESUME" : "⏸ PAUSE"}
                </button>

                <button className={`action-btn share ${screenStream ? 'active' : ''}`} onClick={toggleScreenShare}>
                  {screenStream ? "⏹ STOP SHARE" : "🖥 SHARE"}
                </button>

                {!isMeetingMode ? (
                  !isRecording ? <button className="action-btn rec start" onClick={startRecording}>● RECORD</button> 
                               : <button className="action-btn rec stop" onClick={stopRecording}>■ STOP</button>
                ) : (
                   <div className="fathom-notice">
                      <span className="fathom-pulse"></span> Fathom
                   </div>
                )}
              </div>

              <div className="utility-module">
                <div className="mic-monitor">
                  <div className="mic-bar-bg">
                    <div className="mic-bar-fill" style={{ width: `${Math.min(micLevel * 1.5, 100)}%`, backgroundColor: micLevel > 60 ? '#ffcc00' : '#34a853' }}></div>
                  </div>
                </div>
                
                <button className="icon-btn" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>⚙️</button>
                <button className="exit-btn-mini" onClick={exitSession}>EXIT</button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SCRIPT EDITOR OVERLAY */}
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