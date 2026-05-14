import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { auth, googleProvider } from './firebase.js';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  fetchUserProfile,
  incrementVideoCount,
  createYocoCheckout,
} from './api.js';
import './App.css';

const PromptR = () => {
  // --- CAMERA, RECORDING & SCROLL REFS ---
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const mediaRecorderRef = useRef(null);

  // --- AUTH STATE ---
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- APP STATE & MONETIZATION ---
  const [mode, setMode] = useState('landing'); // 'landing' | 'setup' | 'present' | 'paywall' | 'auth'
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Tiers: 'free' | 'creator' | 'pro' | 'studio'
  const [tier, setTier] = useState('free');
  const [videoCount, setVideoCount] = useState(0);
  const [maxVideos, setMaxVideos] = useState(10);
  const [canRecord, setCanRecord] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // --- TELEPROMPTER SETTINGS ---
  const [fontSize, setFontSize] = useState(48);
  const [textWidth, setTextWidth] = useState(400);
  const [scrollSpeed, setScrollSpeed] = useState(3);
  const [scriptText, setScriptText] = useState('');
  const [scrollY, setScrollY] = useState(0);

  // --- PAYMENT STATE ---
  const [paymentLoading, setPaymentLoading] = useState(false);

  const isActive = mode === 'present';

  // --- FIREBASE AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthLoading(false);

      if (user) {
        // Fetch profile from backend
        try {
          const profile = await fetchUserProfile();
          setTier(profile.tier);
          setVideoCount(profile.videoCount);
          setMaxVideos(profile.maxVideos);
          setCanRecord(profile.canRecord);
          setProfileLoaded(true);
        } catch (err) {
          console.error('Failed to fetch profile:', err);
          // Fallback to free tier defaults
          setProfileLoaded(true);
        }
      } else {
        // Reset to defaults when signed out
        setTier('free');
        setVideoCount(0);
        setMaxVideos(10);
        setCanRecord(true);
        setProfileLoaded(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- CHECK FOR PAYMENT REDIRECT ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const paymentTier = params.get('tier');

    if (paymentStatus === 'success' && paymentTier) {
      // Payment succeeded – refresh profile to get new tier
      if (authUser) {
        fetchUserProfile().then((profile) => {
          setTier(profile.tier);
          setVideoCount(profile.videoCount);
          setMaxVideos(profile.maxVideos);
          setCanRecord(profile.canRecord);
        });
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Handle Firebase redirect result
    getRedirectResult(auth).catch((err) => {
      console.error('Redirect sign-in error:', err);
    });
  }, [authUser]);

  // --- CAMERA INIT ---
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied.', err);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // --- AUTH HANDLERS ---
  const handleSignIn = async () => {
    try {
      // Try popup first (works on desktop & most browsers)
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        // Fallback to redirect for mobile / blocked popups
        await signInWithRedirect(auth, googleProvider);
      } else {
        console.error('Sign-in error:', err);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setMode('landing');
  };

  // --- LIMIT CHECKS ---
  const checkLimits = () => {
    if (maxVideos === null) return true; // unlimited
    return videoCount < maxVideos;
  };

  // --- SMOOTH SCROLL ENGINE ---
  const updateScroll = () => {
    if (isActive && isRecording) {
      setScrollY((prev) => prev + scrollSpeed * 0.5);
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
      console.error('MP4 Conversion failed. Falling back to WebM.', err);
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

      // Require auth to record
      if (!authUser) {
        setMode('auth');
        return;
      }

      setScrollY(0);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const drawFrame = () => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'recording'
        ) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // FREE TIER ONLY: Draw Watermark
          if (tier === 'free') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
            ctx.textAlign = 'right';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText('PromptR.net', canvas.width - 30, canvas.height - 30);
          }

          requestAnimationFrame(drawFrame);
        }
      };

      const watermarkedStream = canvas.captureStream(30);
      const audioTracks = video.srcObject.getAudioTracks();
      if (audioTracks.length > 0) {
        watermarkedStream.addTrack(audioTracks[0]);
      }

      const recorder = new MediaRecorder(watermarkedStream, {
        mimeType: 'video/webm',
      });
      let localChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      recorder.onstop = async () => {
        // Call backend to increment video count
        try {
          const result = await incrementVideoCount();
          setVideoCount(result.videoCount);
          setCanRecord(result.canRecord);
          await convertToMp4(
            new Blob(localChunks, { type: 'video/webm' }),
            result.videoCount
          );
        } catch (err) {
          console.error('Failed to increment video count:', err);
          // Still convert the video even if API fails
          const fallbackCount = videoCount + 1;
          setVideoCount(fallbackCount);
          await convertToMp4(
            new Blob(localChunks, { type: 'video/webm' }),
            fallbackCount
          );
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      drawFrame();
    }
  };

  // --- NAVIGATION ---
  const launchSession = () => {
    if (!authUser) {
      setMode('auth');
      return;
    }
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

  // --- YOCO PAYMENT ---
  const handleYocoPayment = async (selectedTier) => {
    if (!authUser) {
      setMode('auth');
      return;
    }

    setPaymentLoading(true);
    try {
      const { checkoutUrl } = await createYocoCheckout(selectedTier);
      // Redirect to Yoco checkout
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Payment error:', err);
      alert('Failed to create payment session. Please try again.');
    }
    setPaymentLoading(false);
  };

  // --- TIER DISPLAY HELPERS ---
  const tierLabel = (t) => {
    const labels = { free: 'FREE', creator: 'CREATOR', pro: 'PRO', studio: 'STUDIO' };
    return labels[t] || t.toUpperCase();
  };

  const videoLimitText = () => {
    if (maxVideos === null) return '∞';
    return `${videoCount} / ${maxVideos}`;
  };

  // --- LOADING STATE ---
  if (authLoading) {
    return (
      <div className="app-container">
        <div className="centered-wrapper">
          <h1 className="premium-logo">
            Prompt<span className="accent">R</span>
          </h1>
          <p className="premium-subtitle" style={{ marginTop: '1rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* STATUS BAR */}
      <div className="dev-tier-toggle">
        {authUser ? (
          <>
            <span>
              {tierLabel(tier)} | Videos: {videoLimitText()}
            </span>
            <button onClick={handleSignOut}>Sign Out</button>
          </>
        ) : (
          <button onClick={handleSignIn}>Sign In with Google</button>
        )}
      </div>

      <video ref={videoRef} autoPlay playsInline muted className="master-camera" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div
        className={`camera-overlay ${mode === 'present' ? 'light-dim' : 'heavy-dim'}`}
      ></div>

      {/* --- SCREEN: AUTH PROMPT --- */}
      {mode === 'auth' && (
        <div className="centered-wrapper">
          <div className="glass-card paywall-card">
            <h2 className="gradient-text">Sign In to Continue</h2>
            <p>Create an account to start recording videos with PromptR.</p>
            <button
              className="tier-btn primary-action"
              onClick={handleSignIn}
              style={{ width: '100%', borderRadius: '100px', padding: '1.2rem' }}
            >
              <strong>🔑 Sign In with Google</strong>
            </button>
            <button
              className="dock-btn secondary-btn"
              style={{ marginTop: '20px' }}
              onClick={() => setMode('landing')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- SCREEN 1: LANDING --- */}
      {mode === 'landing' && (
        <div className="centered-wrapper">
          <div className="ambient-glow"></div>
          <div className="landing-content">
            <h1 className="premium-logo">
              Prompt<span className="accent">R</span>
            </h1>
            <p className="premium-subtitle">Flawless video. Total eye contact.</p>

            <button
              className="glass-card interactive-card main-cta"
              onClick={() => setMode('setup')}
            >
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
              <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '10px' }}>
                Tap the box to start typing or paste from your clipboard.
              </p>
              <textarea
                className="premium-textarea"
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Type your script here, or tap to paste..."
                rows="8"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div className="glass-card">
              <h3 className="section-title">Adjust Display</h3>
              <div className="slider-group">
                <div className="slider-header">
                  <label>Eye-Line Width</label>
                  <span>{textWidth}px</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="800"
                  value={textWidth}
                  onChange={(e) => setTextWidth(Number(e.target.value))}
                />
              </div>
              <div className="slider-group">
                <div className="slider-header">
                  <label>Scroll Speed</label>
                  <span>{scrollSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                />
              </div>
              <div className="slider-group">
                <div className="slider-header">
                  <label>Font Size</label>
                  <span>{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="96"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="bottom-padding-spacer"></div>
          </div>
        </div>
      )}

      {/* --- SCREEN 3: ACTIVE TELEPROMPTER --- */}
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
              {scriptText || 'No script entered.'}
              <div className="spacer-bottom"></div>
            </div>
          </div>
        </div>
      )}

      {/* --- SCREEN 4: THE PAYWALL --- */}
      {mode === 'paywall' && (
        <div className="centered-wrapper">
          <div className="glass-card paywall-card">
            <h2 className="gradient-text">
              {!authUser ? 'Sign In to Upgrade' : 'Upgrade Your Plan'}
            </h2>
            <p>
              {!authUser
                ? 'Sign in first, then choose a plan to unlock more videos.'
                : `You've recorded ${videoCount} videos. Upgrade to continue using PromptR.`}
            </p>

            {!authUser ? (
              <button
                className="tier-btn primary-action"
                onClick={handleSignIn}
                style={{ width: '100%', borderRadius: '100px', padding: '1.2rem' }}
              >
                <strong>🔑 Sign In with Google</strong>
              </button>
            ) : (
              <div className="tier-options">
                <button
                  className="tier-btn"
                  onClick={() => handleYocoPayment('creator')}
                  disabled={paymentLoading}
                >
                  <strong>Creator — R25</strong>
                  <span>50 Videos • No Watermark</span>
                </button>
                <button
                  className="tier-btn"
                  onClick={() => handleYocoPayment('pro')}
                  disabled={paymentLoading}
                >
                  <strong>Pro — R50</strong>
                  <span>Unlimited Videos • No Watermark</span>
                </button>
                <button
                  className="tier-btn primary-action"
                  onClick={() => handleYocoPayment('studio')}
                  disabled={paymentLoading}
                >
                  <strong>Studio — R100</strong>
                  <span>Unlimited • Custom Content • Priority Support</span>
                </button>
              </div>
            )}

            <button
              className="dock-btn secondary-btn"
              style={{ marginTop: '20px' }}
              onClick={() => setMode('landing')}
            >
              {paymentLoading ? 'Redirecting...' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* --- FLOATING CONTROLS --- */}
      {mode !== 'landing' && mode !== 'paywall' && mode !== 'auth' && (
        <div className="floating-dock-container">
          <div className="premium-dock">
            {mode === 'setup' ? (
              <>
                <button
                  className="dock-btn secondary-btn"
                  onClick={() => setMode('landing')}
                >
                  Back
                </button>
                <button className="dock-btn primary-action" onClick={launchSession}>
                  Launch Prompter
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
