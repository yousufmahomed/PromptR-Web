import React, { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import './App.css'; 

const PromptR = () => {
  // --- CAMERA, RECORDING & SCROLL REFS ---
  const videoRef = useRef(null);
  const canvasRef = useRef(null); 
  const requestRef = useRef();
  const mediaRecorderRef = useRef(null);

  // --- APP STATE & MONETIZATION ---
  const [mode, setMode] = useState('landing'); // 'landing' | 'setup' | 'present' | 'paywall'
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false); 
  
  // Tiers: 'free' | 'creator' | 'pro'
  const [tier, setTier] = useState('free'); 
  const [videoCount, setVideoCount] = useState(0);

  // --- TELEPROMPTER SETTINGS ---
  const [fontSize, setFontSize] = useState(48); 
  const [textWidth, setTextWidth] = useState(400); 
  const [scrollSpeed, setScrollSpeed] = useState(3); 
  const [scriptText, setScriptText] = useState("");
  const [scrollY, setScrollY] = useState(0);

  const isActive = mode === 'present';

  // --- INITIALIZATION ---
  useEffect(() => {
    // Load video count from Local Storage
    const savedCount = localStorage.getItem('promptr_video_count');
    if (savedCount) setVideoCount(parseInt(savedCount, 10));

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

  // --- LIMIT CHECKS ---
  const checkLimits = () => {
    if (tier === 'free' && videoCount >= 10) return false;
    if (tier === 'creator' && videoCount >= 30) return false;
    return true;
  };

  // --- SMOOTH SCROLL ENGINE ---
  const updateScroll = () => {
    if (isActive && isRecording) {
      setScrollY((prev) => prev + (scrollSpeed * 0.5)); 
    }
    requestRef.current = requestAnimationFrame(updateScroll);
  };

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(updateScroll);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isActive, scrollSpeed, isRecording]);

  // --- MP4 CONVERSION & SEQUENTIAL NAMING ---
  const convertToMp4 = async (webmBlob, newCount) => {
    setIsConverting(true);
    
    // Format: PromptR_001.mp4
    const fileNumber = String(newCount).padStart(3, '0');
    const finalFileName = `PromptR_${fileNumber}.mp4`;

    try {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      
      await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
      await ffmpeg.exec(['-i', 'input.webm', 'output.mp4']);
      const data = await ffmpeg.readFile('output.mp4');
      
      const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("MP4 Conversion failed. Falling back to WebM.", err);
      const url = URL.createObjectURL(webmBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PromptR_Fallback_${fileNumber}.webm`;
      a.click();
    }
    setIsConverting(false);
  };

  // --- RECORDING HANDLERS WITH TIERED WATERMARK ---
  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      if (!checkLimits()) {
        setMode('paywall');
        return;
      }

      setScrollY(0); // Reset scroll position when recording starts
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const drawFrame = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // FREE TIER ONLY: Draw Watermark
          if (tier === 'free') {
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)"; 
            ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
            ctx.textAlign = "right";
            ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText("PromptR.net", canvas.width - 30, canvas.height - 30);
          }
          
          requestAnimationFrame(drawFrame);
        }
      };

      const watermarkedStream = canvas.captureStream(30);
      const audioTracks = video.srcObject.getAudioTracks();
      if (audioTracks.length > 0) {
        watermarkedStream.addTrack(audioTracks[0]);
      }

      const recorder = new MediaRecorder(watermarkedStream, { mimeType: 'video/webm' });
      let localChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      recorder.onstop = async () => {
        // Increment Counter and save to Local Storage
        const newCount = videoCount + 1;
        setVideoCount(newCount);
        localStorage.setItem('promptr_video_count', newCount);

        await convertToMp4(new Blob(localChunks, { type: 'video/webm' }), newCount); 
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      drawFrame(); 
    }
  };

  // --- NAVIGATION ---
  const launchSession = () => {
    if (!checkLimits()) {
      setMode('paywall');
    } else {
      setScrollY(0);
      setMode('present');
    }
  };

  const endSession = () => {
    setMode('landing');
    if (isRecording) toggleRecording(); 
  };

  // MOCK PAYMENT GATEWAY (For testing limits)
  const upgradeTier = (newTier) => {
    setTier(newTier);
    setMode('landing');
  };

  return (
    <div className="app-container">
      
      {/* MOCK UPGRADE BUTTON FOR TESTING */}
      <div className="dev-tier-toggle">
        <span>Current Tier: {tier.toUpperCase()} | Videos: {videoCount}</span>
        {tier !== 'pro' && <button onClick={() => setMode('paywall')}>Upgrade</button>}
      </div>

      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="master-camera" 
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className={`camera-overlay ${mode === 'present' ? 'light-dim' : 'heavy-dim'}`}></div>

      {/* --- SCREEN 1: LANDING --- */}
      {mode === 'landing' && (
        <div className="centered-wrapper">
          <div className="ambient-glow"></div>
          <div className="landing-content">
            <h1 className="premium-logo">Prompt<span className="accent">R</span></h1>
            <p className="premium-subtitle">Flawless video. Total eye contact.</p>
            
            <button className="glass-card interactive-card main-cta" onClick={() => setMode('setup')}>
              <div className="card-icon blue-glow">🎙️</div>
              <h3>Start Teleprompter</h3>
              <p>Record your script straight to your hard drive.</p>
            </button>
          </div>
        </div>
      )}

      {/* --- SCREEN 2: SETUP --- */}
      {mode === 'setup' && (
        <div className="centered-wrapper scrollable-wrapper">
          <div className="setup-stack">
            
            <div className="glass-card">
              <h2 className="gradient-text">Your Script</h2>
              <textarea 
                className="premium-textarea"
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Paste your script here..."
              />
            </div>

            <div className="glass-card">
              <h3 className="section-title">Adjust Display</h3>
              <div className="slider-group">
                <div className="slider-header"><label>Eye-Line Width</label><span>{textWidth}px</span></div>
                <input type="range" min="200" max="800" value={textWidth} onChange={(e) => setTextWidth(Number(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-header"><label>Scroll Speed</label><span>{scrollSpeed}x</span></div>
                <input type="range" min="1" max="10" value={scrollSpeed} onChange={(e) => setScrollSpeed(Number(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-header"><label>Font Size</label><span>{fontSize}px</span></div>
                <input type="range" min="24" max="96" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
              </div>
            </div>
            <div className="bottom-padding-spacer"></div> 
          </div>
        </div>
      )}

      {/* --- SCREEN 3: ACTIVE TELEPROMPTER --- */}
      {isActive && (
        <div className="presenter-engine">
          <div className="target-eyeline"><div className="glow-bar"></div></div>
          
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

      {/* --- SCREEN 4: THE PAYWALL --- */}
      {mode === 'paywall' && (
        <div className="centered-wrapper">
          <div className="glass-card paywall-card">
            <h2 className="gradient-text">Limit Reached</h2>
            <p>You have recorded {videoCount} videos. Upgrade to continue using PromptR.</p>
            
            <div className="tier-options">
              <button className="tier-btn" onClick={() => upgradeTier('creator')}>
                <strong>Creator Tier ($9/mo)</strong>
                <span>30 Videos • No Watermark</span>
              </button>
              <button className="tier-btn primary-action" onClick={() => upgradeTier('pro')}>
                <strong>Pro Tier ($29/mo)</strong>
                <span>Unlimited • No Watermark</span>
              </button>
            </div>
            
            <button className="dock-btn secondary-btn" style={{marginTop: '20px'}} onClick={() => setMode('landing')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- FLOATING CONTROLS --- */}
      {mode !== 'landing' && mode !== 'paywall' && (
        <div className="floating-dock-container">
          <div className="premium-dock">
            {mode === 'setup' ? (
              <>
                <button className="dock-btn secondary-btn" onClick={() => setMode('landing')}>Back</button>
                <button className="dock-btn primary-action" onClick={launchSession}>Launch Prompter</button>
              </>
            ) : (
              <>
                <button 
                  className={`dock-btn record-btn ${isRecording ? 'is-recording' : ''}`} 
                  onClick={toggleRecording}
                  disabled={isConverting}
                >
                  {isConverting ? 'Processing...' : (
                    <><span className="dot"></span>{isRecording ? 'Stop' : 'Record'}</>
                  )}
                </button>
                <button className="dock-btn secondary-btn stop-action" onClick={endSession}>End</button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PromptR;