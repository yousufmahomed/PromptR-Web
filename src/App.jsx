import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import './App.css'; 

const PromptR = () => {
  // --- CAMERA, RECORDING & SCROLL REFS ---
  const videoRef = useRef(null);
  const canvasRef = useRef(null); 
  const requestRef = useRef();
  const mediaRecorderRef = useRef(null);

  // --- APP STATE & MONETIZATION ---
  const [mode, setMode] = useState('landing'); // 'landing' | 'setup' | 'present' | 'review' | 'paywall'
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false); 
  
  // Tiers & Add-ons
  const [tier, setTier] = useState('free'); // 'free' | 'creator' | 'pro'
  const [removeWatermarkAddon, setRemoveWatermarkAddon] = useState(false); // The $10 Add-on
  const [videoCount, setVideoCount] = useState(0);

  // --- TELEPROMPTER SETTINGS ---
  const [fontSize, setFontSize] = useState(48); 
  const [textWidth, setTextWidth] = useState(400); 
  const [scrollSpeed, setScrollSpeed] = useState(3); 
  const [scriptText, setScriptText] = useState("");
  const [scrollY, setScrollY] = useState(0);

  // --- REVIEW STATE ---
  const [reviewUrl, setReviewUrl] = useState(null);
  const [rawVideoBlob, setRawVideoBlob] = useState(null);

  const isActive = mode === 'present';

  // --- INITIALIZATION ---
  useEffect(() => {
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


  // --- CLOUD API CONVERSION (LOOM SPEED) ---
  const uploadAndConvert = async () => {
    if (!rawVideoBlob) return;
    setIsConverting(true); 
    
    const formData = new FormData();
    formData.append('file', rawVideoBlob);
    
    // ⚠️ REPLACE THESE WITH YOUR CLOUDINARY INFO ⚠️
    formData.append('upload_preset', 'YOUR_UNSIGNED_PRESET_NAME'); 
    const cloudName = 'YOUR_CLOUD_NAME'; 

    try {
      // 1. Blast it to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      
      // 2. Cloudinary converts to MP4 automatically
      const finalMp4Url = data.secure_url.replace('.webm', '.mp4');
      
      // 3. Trigger Native Download / Save
      window.open(finalMp4Url, '_blank'); 
      
    } catch (err) {
      console.error("Cloud API Error. Falling back to local WebM.", err);
      // Fallback: Give them the local file so they don't lose the video
      const backupUrl = URL.createObjectURL(rawVideoBlob);
      window.open(backupUrl, '_blank');
    }

    setIsConverting(false);
    setReviewUrl(null);
    setRawVideoBlob(null);
    setMode('setup'); // Send back to start after saving
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

      setScrollY(0); 
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const drawFrame = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // SMART WATERMARK LOGIC
          const showWatermark = tier === 'free' || (tier === 'creator' && !removeWatermarkAddon);
          
          if (showWatermark) {
            // Free = 24px (100%), Creator = 12px (50%)
            const watermarkSize = tier === 'free' ? 24 : 12; 
            
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)"; 
            ctx.font = `bold ${watermarkSize}px 'Plus Jakarta Sans', sans-serif`;
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
      if (audioTracks.length > 0) watermarkedStream.addTrack(audioTracks[0]);

      const recorder = new MediaRecorder(watermarkedStream, { mimeType: 'video/webm' });
      let localChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      // WHEN RECORDING STOPS -> GO TO REVIEW MODE
      recorder.onstop = () => {
        const newCount = videoCount + 1;
        setVideoCount(newCount);
        localStorage.setItem('promptr_video_count', newCount);

        const finalBlob = new Blob(localChunks, { type: 'video/webm' });
        setRawVideoBlob(finalBlob);
        setReviewUrl(URL.createObjectURL(finalBlob));
        setMode('review'); 
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      drawFrame(); 
    }
  };

  // --- NAVIGATION ---
  const launchSession = () => {
    if (!checkLimits()) setMode('paywall');
    else { setScrollY(0); setMode('present'); }
  };

  const endSession = () => {
    if (isRecording) toggleRecording(); 
    else setMode('landing');
  };

  const upgradeTier = (newTier) => {
    setTier(newTier);
    setMode('landing');
  };

  return (
    <div className="app-container">
      
      {/* DEV TOGGLE BANNER */}
      <div className="dev-tier-toggle">
        <span>{tier.toUpperCase()} | Vids: {videoCount} {removeWatermarkAddon && '| Addon: ON'}</span>
        {tier !== 'pro' && <button onClick={() => setMode('paywall')}>Upgrade</button>}
      </div>

      <video ref={videoRef} autoPlay playsInline muted className="master-camera" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className={`camera-overlay ${(mode === 'present' || mode === 'review') ? 'light-dim' : 'heavy-dim'}`}></div>

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
              <p>Type your script. Record flawlessly.</p>
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
                placeholder="Type your script here, or paste from your clipboard..."
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

      {/* --- SCREEN 4: INSTANT REVIEW --- */}
      {mode === 'review' && (
        <div className="centered-wrapper">
          <div className="glass-card">
            <h2 className="gradient-text">Review Your Take</h2>
            <video src={reviewUrl} controls autoPlay className="review-player" />
            
            <div className="dock-btn-group" style={{ marginTop: '1rem' }}>
              <button 
                className="dock-btn secondary-btn" 
                onClick={() => { setReviewUrl(null); setRawVideoBlob(null); setMode('setup'); }}
                disabled={isConverting}
              >
                Discard
              </button>
              <button 
                className="dock-btn primary-action" 
                onClick={uploadAndConvert}
                disabled={isConverting}
              >
                {isConverting ? 'Processing Cloud...' : 'Save & Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SCREEN 5: THE PAYWALL --- */}
      {mode === 'paywall' && (
        <div className="centered-wrapper scrollable-wrapper">
          <div className="glass-card paywall-card">
            <h2 className="gradient-text">Upgrade PromptR</h2>
            <p>Unlock flawless presentations.</p>
            
            <div className="tier-options">
              <button className="tier-btn" onClick={() => upgradeTier('creator')}>
                <strong>Creator Tier ($9/mo)</strong>
                <span>30 Videos • 50% Smaller Watermark</span>
              </button>
              
              {tier === 'creator' && !removeWatermarkAddon && (
                <button className="tier-btn" onClick={() => { setRemoveWatermarkAddon(true); setMode('setup'); }}>
                  <strong>+$10 Add-on (Creator Only)</strong>
                  <span>Remove Watermark Completely</span>
                </button>
              )}

              <button className="tier-btn primary-action" onClick={() => { upgradeTier('pro'); setRemoveWatermarkAddon(false); }}>
                <strong>Pro Tier ($29/mo)</strong>
                <span>Unlimited • 100% White-Label</span>
              </button>
            </div>
            
            <button className="dock-btn secondary-btn" style={{marginTop: '20px'}} onClick={() => setMode('landing')}>
              Cancel
            </button>
          </div>
          <div className="bottom-padding-spacer"></div> 
        </div>
      )}

      {/* --- FLOATING CONTROLS --- */}
      {mode !== 'landing' && mode !== 'paywall' && mode !== 'review' && (
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
                >
                  <span className="dot"></span>{isRecording ? 'Stop' : 'Record'}
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