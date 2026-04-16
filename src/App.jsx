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
  const [opacity, setOpacity] = useState(0.6);
  
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [webcamSize, setWebcamSize] = useState("large"); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([{ role: 'system', text: "Ready to assist." }]);

  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const chunksRef = useRef([]);
  const lastMicLevelRef = useRef(0);

  useEffect(() => {
    let isCancelled = false; 
    let stream = null;
    if (isLive) {
      async function enableStream() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (isCancelled) { stream.getTracks().forEach(t => t.stop()); return; }
          setWebcamStream(stream);
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.fftSize = 256;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMic = () => {
            if (isCancelled) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            if (Math.abs(avg - lastMicLevelRef.current) > 2) {
              setMicLevel(avg);
              lastMicLevelRef.current = avg;
            }
            animationRef.current = requestAnimationFrame(updateMic);
          };
          updateMic();
        } catch (err) { console.error(err); }
      }
      enableStream();
    }
    return () => {
      isCancelled = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isLive]);

  useEffect(() => {
    if (videoRef.current && webcamStream) {
      if (videoRef.current.srcObject !== webcamStream) videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(() => {});
    }
  }, [webcamStream, isMeetingMode, screenStream, webcamSize, isLive]);

  useEffect(() => {
    if (screenRef.current && screenStream) {
      if (screenRef.current.srcObject !== screenStream) screenRef.current.srcObject = screenStream;
      screenRef.current.play().catch(() => {});
    }
  }, [screenStream]);

  useEffect(() => {
    let interval;
    if (isLive && !isPrompterHidden && !isPaused) {
      interval = setInterval(() => {
        setScrollPosition((prev) => prev + (scrollSpeed * 0.4));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed, isPaused, isPrompterHidden]);

  useEffect(() => {
    setScrollPosition(0);
    localStorage.setItem("promptr_data", script);
  }, [script]);

  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(stream);
        stream.getVideoTracks()[0].onended = () => setScreenStream(null);
      } catch (err) { console.error(err); }
    }
  };

  const startRecording = () => {
    chunksRef.current = [];
    if (!webcamStream) return;
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
    mediaRecorderRef.current = new MediaRecorder(webcamStream, { mimeType });
    mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mediaRecorderRef.current.onstop = handleDownload;
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PromptR-${Date.now()}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const exitSession = () => {
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    setWebcamStream(null);
    setScreenStream(null);
    setIsLive(false);
    setIsMeetingMode(false);
    setIsPrompterHidden(false);
    setIsAiOpen(false);
    setIsSettingsOpen(false);
    setIsEditorOpen(false);
    setIsPaused(false);
  };

  return (
    <div className={`app-container ${isLive ? 'is-live' : ''}`}>
      {!isLive && <header className="header"><h1 className="logo">Prompt<span>R</span></h1></header>}
      {isLive && (
        <video ref={videoRef} autoPlay playsInline muted 
          className={`webcam-feed ${screenStream ? 'pip-mode' : isMeetingMode ? 'meeting-mode-cam' : `size-${webcamSize}`}`} 
        />
      )}
      {isRecording && <div className="rec-pulse">REC</div>}
      {!isLive ? (
        <main className="dashboard">
          <div className="stencil-box"><button className="large-insert-btn" onClick={() => setIsEditorOpen(true)}>{script ? "EDIT SCRIPT" : "+ SCRIPT"}</button></div>
          <div className="mode-selection">
            <button className="launch-btn" onClick={() => setIsLive(true)}>Standard</button>
            <button className="launch-btn meeting-btn" onClick={() => { setIsMeetingMode(true); setIsLive(true); }}>Meeting</button>
            <button className="launch-btn freetalk-btn" onClick={() => { setIsPrompterHidden(true); setIsLive(true); }}>Free Talk</button>
          </div>
        </main>
      ) : (
        <div className="teleprompter-view">
          <div className={`teleprompter-main-layout ${isPrompterHidden ? 'no-prompter' : ''}`}>
            {screenStream && (
              <div className="screen-share-sidebar">
                <div className="sidebar-label">● LIVE</div>
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
          <div className={`ai-panel ${isAiOpen ? 'open' : ''}`}>
             <div className="ai-header"><h3>AI Assistant</h3><button onClick={() => setIsAiOpen(false)}>×</button></div>
             <div className="ai-chat-window">{aiMessages.map((m, i) => <div key={i} className={`ai-message ${m.role}`}>{m.text}</div>)}</div>
          </div>
          <div className="control-bar-wrapper">
            <div className={`settings-popover ${isSettingsOpen ? 'open' : ''}`}>
               <label>Cam</label>
               <select value={webcamSize} onChange={(e)=>setWebcamSize(e.target.value)} className="ui-select">
                 <option value="small">S</option><option value="medium">M</option><option value="large">L</option>
               </select>
            </div>
            <div className="control-bar">
               <button onClick={()=>setIsPaused(!isPaused)} className="action-btn">{isPaused?"▶":"⏸"}</button>
               <button onClick={toggleScreenShare} className="action-btn">🖥</button>
               {!isRecording ? <button onClick={startRecording} className="action-btn rec">●</button> : <button onClick={stopRecording} className="action-btn rec active">■</button>}
               <button onClick={()=>setIsSettingsOpen(!isSettingsOpen)} className="action-btn">⚙️</button>
               <button onClick={exitSession} className="exit-btn">EXIT</button>
            </div>
          </div>
        </div>
      )}
      {isEditorOpen && <div className="modal-overlay"><div className="modal-content"><textarea value={script} onChange={(e)=>setScript(e.target.value)}/><button onClick={()=>setIsEditorOpen(false)}>Save</button></div></div>}
    </div>
  );
}

export default App;