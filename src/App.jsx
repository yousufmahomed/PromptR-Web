import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // App State
  const [script, setScript] = useState(() => localStorage.getItem('promptr_data') || 'Welcome to PromptR. Enter your script here.');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  const [isPrompterHidden, setIsPrompterHidden] = useState(false);

  // Teleprompter State
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [fontSize, setFontSize] = useState(45);
  const [isPaused, setIsPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Media Streams
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [webcamSize, setWebcamSize] = useState('large');
  const [cameraMessage, setCameraMessage] = useState('');

  // Refs
  const videoRef = useRef(null);
  const screenRef = useRef(null);

  const getFriendlyCameraErrorMessage = (err) => {
    const errorName = err?.name || '';

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError' || errorName === 'AbortError') {
      return 'Your camera appears to be in use by another app (Zoom, Teams, etc.). Close that app and try again.';
    }

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorName === 'SecurityError') {
      return 'Camera permission was denied. Please allow camera access in your browser settings and try again.';
    }

    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return 'No camera was found on this device. Please connect a camera and try again.';
    }

    if (errorName === 'OverconstrainedError') {
      return 'Camera constraints were not supported by your device. Please try again with a different camera setup.';
    }

    return `We could not start your camera. ${err?.message ? `Details: ${err.message}` : 'Please verify your camera and browser permissions, then retry.'}`;
  };

  // 1. Initialize Webcam
  useEffect(() => {
    let activeStream = null;

    if (!isLive) {
      return undefined;
    }

    async function start() {
      setCameraMessage('');
      setWebcamStream(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraMessage('Your browser does not support camera access (getUserMedia). Please use a modern browser.');
        return;
      }

      try {
        let hasVideoInput = true;
        let hasAudioInput = true;

        // Best-effort device check before requesting media
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          hasVideoInput = devices.some((device) => device.kind === 'videoinput');
          hasAudioInput = devices.some((device) => device.kind === 'audioinput');
        } catch (deviceErr) {
          console.warn('Could not enumerate media devices before requesting permissions:', deviceErr);
        }

        if (!hasVideoInput) {
          setCameraMessage('No camera detected. Please connect a camera and try again.');
          return;
        }

        try {
          // First try: video + audio (when available)
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: hasAudioInput,
          });
          setWebcamStream(activeStream);
        } catch (avError) {
          // Fallback: video only, so app still works without microphone
          try {
            activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setWebcamStream(activeStream);

            if (hasAudioInput) {
              setCameraMessage('Camera started without microphone. You can continue using video-only mode.');
            }
          } catch (videoOnlyError) {
            setCameraMessage(getFriendlyCameraErrorMessage(videoOnlyError));
            console.error('Failed to start camera (A/V and video-only fallback both failed):', {
              avError,
              videoOnlyError,
            });
          }
        }
      } catch (err) {
        setCameraMessage(getFriendlyCameraErrorMessage(err));
        console.error('Unexpected camera initialization error:', err);
      }
    }

    start();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isLive]);

  // 2. Attach Webcam to Video Element
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch((e) => console.error(e));
    }
  }, [webcamStream, isLive, webcamSize, isMeetingMode]);

  // 3. Attach Screen Share to Video Element
  useEffect(() => {
    if (screenRef.current && screenStream) {
      screenRef.current.srcObject = screenStream;
      screenRef.current.play().catch((e) => console.error(e));
    }
  }, [screenStream]);

  // 4. Scrolling Logic
  useEffect(() => {
    let interval;
    if (isLive && !isPaused && !isPrompterHidden) {
      interval = setInterval(() => {
        setScrollPosition((p) => p + scrollSpeed * 0.4);
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isLive, scrollSpeed, isPaused, isPrompterHidden]);

  // Handlers
  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        stream.getVideoTracks()[0].onended = () => setScreenStream(null);
      } catch (err) {
        console.error('Screen share canceled or failed', err);
      }
    }
  };

  const exitSession = () => {
    if (webcamStream) webcamStream.getTracks().forEach((t) => t.stop());
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    setIsLive(false);
    setWebcamStream(null);
    setScreenStream(null);
    setCameraMessage('');
    setScrollPosition(0);
  };

  const saveScript = (newScript) => {
    setScript(newScript);
    localStorage.setItem('promptr_data', newScript);
  };

  return (
    <div className="app-container">
      {!isLive && (
        <div className="landing">
          <h1 className="logo">
            Prompt<span>R</span>
          </h1>

          <button className="pro-btn main" onClick={() => setIsEditorOpen(true)}>
            📝 Edit Script
          </button>

          <div className="mode-selection">
            <button
              className="launch-btn"
              onClick={() => {
                setIsMeetingMode(false);
                setIsLive(true);
              }}
            >
              Standard Mode
            </button>
            <button
              className="launch-btn meeting"
              onClick={() => {
                setIsMeetingMode(true);
                setIsLive(true);
              }}
            >
              Meeting Mode
            </button>
          </div>

          {isEditorOpen && (
            <div className="editor-modal">
              <h2>Edit Script</h2>
              <textarea
                value={script}
                onChange={(e) => saveScript(e.target.value)}
                placeholder="Type or paste your script here..."
              />
              <button onClick={() => setIsEditorOpen(false)}>Save & Close</button>
            </div>
          )}
        </div>
      )}

      {isLive && (
        <div className={`teleprompter-view ${isMeetingMode ? 'meeting-theme' : 'standard-theme'}`}>
          {webcamStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`master-webcam ${screenStream ? 'pip' : isMeetingMode ? 'meeting' : webcamSize}`}
            />
          ) : (
            <div className="master-webcam" style={{ display: 'grid', placeItems: 'center', padding: '1rem', textAlign: 'center' }}>
              <div>
                <strong>Camera preview unavailable.</strong>
                <p style={{ marginTop: '0.5rem' }}>The teleprompter can still be used without camera video.</p>
              </div>
            </div>
          )}

          {cameraMessage && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(20, 20, 20, 0.85)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              zIndex: 1000,
              maxWidth: '90%',
              textAlign: 'center',
            }}>
              {cameraMessage}
            </div>
          )}

          <div className={`layout-engine ${isPrompterHidden ? 'hidden' : ''}`}>
            {screenStream && (
              <div className="sidebar">
                <video ref={screenRef} autoPlay playsInline muted className="screen-video" />
              </div>
            )}

            <div className="script-column">
              <div className="eye-line" />
              <div
                className="scrolling-text"
                style={{
                  transform: `translateY(-${scrollPosition}px)`,
                  fontSize: `${fontSize}px`,
                }}
              >
                <div style={{ height: '40vh' }} />
                {script}
                <div style={{ height: '70vh' }} />
              </div>
            </div>
          </div>

          <div className="controls">
            <button className="icon-btn" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? '▶ Play' : '⏸ Pause'}
            </button>

            <button className="icon-btn" onClick={toggleScreenShare}>
              {screenStream ? '🛑 Stop Share' : '🖥 Share Screen'}
            </button>

            <button className="icon-btn" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
              ⚙️ Settings
            </button>

            <button className="exit-btn" onClick={exitSession}>
              ✖ EXIT
            </button>
          </div>

          {isSettingsOpen && (
            <div className="settings-panel">
              <div className="setting-row">
                <label>Speed ({scrollSpeed})</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                />
              </div>
              <div className="setting-row">
                <label>Font Size ({fontSize}px)</label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
              </div>
              <button className="close-settings" onClick={() => setIsSettingsOpen(false)}>
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;