import React, { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import './App.css'; 

const PromptR = () => {
  // --- CAMERA, RECORDING & SCROLL REFS ---
  const videoRef = useRef(null);
  const requestRef = useRef();
  const mediaRecorderRef = useRef(null);

  // --- APP STATE ---
  const [mode, setMode] = useState('landing'); 
  const [targetSession, setTargetSession] = useState('present'); 
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false); // NEW: Processing state
  
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

  // --- 3. MP4 CONVERSION LOGIC ---
  const convertToMp4 = async (webmBlob) => {
    setIsConverting(true);
    try {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      
      // Write WebM to FFmpeg memory, convert to MP4, and read it back
      await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
      await ffmpeg.exec(['-i', 'input.webm', 'output.mp4']);
      const data = await ffmpeg.readFile('output.mp4');
      
      // Trigger MP4 Download
      const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'PromptR_Pitch.mp4';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("MP4 Conversion failed (Likely missing Server Headers). Falling back to WebM.", err);
      // FALLBACK: Download WebM if FFmpeg fails
      const url = URL.createObjectURL(webmBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PromptR_Pitch_Fallback.webm';
      a.click();
    }
    setIsConverting(false);
  };

  // --- 4. RECORDING HANDLERS ---
  const toggleRecording = () => {
    if (isRecording) {
      // Stop Recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      // Start Recording
      const stream = videoRef.current.srcObject;
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      let localChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const webmBlob = new Blob(localChunks, { type: 'video/webm' });
        await convertToMp4(webmBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    }
  };

  // --- 5. NAVIGATION HANDLERS ---
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
    if (isRecording) toggleRecording(); // Auto-stop recording if they exit
  };

  return (
    <div className="app-container">
      
      {mode === 'meeting' && (
        <div className="meeting-background">
          <div className="meeting-placeholder">
            <span>Participant Feed</span>
          </div>
        </div>
      )}

      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`master-camera ${mode === 'meeting' ? 'pip' : ''}`} 
      />
      
      {mode !== 'meeting' && (
        <div className={`camera-overlay ${mode === 'present' ? 'light-dim' : 'heavy-dim'}`}></div>
      )}

      {/* --- LANDING PAGE --- */}
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

      {/* --- SETUP DASHBOARD --- */}
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

            <div className="bottom-padding-spacer"></div> 
          </div>
        </div>
      )}

      {/* --- ACTIVE TELEPROMPTER --- */}
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

      {/* --- FLOATING DOCK --- */}
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
                  onClick={toggleRecording}
                  disabled={isConverting}
                >
                  {isConverting ? (
                    'Processing...'
                  ) : (
                    <>
                      <span className="dot"></span>
                      {isRecording ? 'Stop' : 'Record'}
                    </>
                  )}
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