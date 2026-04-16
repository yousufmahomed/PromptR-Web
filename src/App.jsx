import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "promptr-script-v1";

const MODES = [
  { id: "standard", label: "Standard Mode" },
  { id: "meeting", label: "Meeting Mode" },
  { id: "free-talk", label: "Free Talk" },
];

const DEFAULT_SCRIPT = `Welcome to PromptR ✨\n\n- Use Settings to tune speed, font, and opacity.\n- Use Edit Script to update your talk track.\n- Use Record to capture your delivery.\n\nYou can replace this with your own prompt and it will persist locally.`;

function App() {
  const teleprompterRef = useRef(null);
  const webcamVideoRef = useRef(null);
  const screenVideoRef = useRef(null);

  const cameraStreamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recorderChunksRef = useRef([]);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micSourceRef = useRef(null);
  const micRafRef = useRef(null);
  const scrollRafRef = useRef(null);

  const [mode, setMode] = useState("standard");
  const [scriptText, setScriptText] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ?? DEFAULT_SCRIPT;
  });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [lastRecordingUrl, setLastRecordingUrl] = useState("");

  const [scrollSpeed, setScrollSpeed] = useState(28);
  const [fontSize, setFontSize] = useState(34);
  const [scriptOpacity, setScriptOpacity] = useState(0.9);

  const [micLevel, setMicLevel] = useState(0);

  const isAutoScrollOn = !isPaused;

  const clearError = useCallback(() => {
    setErrorMessage("");
  }, []);

  const setError = useCallback((message, err) => {
    console.error(message, err);
    setErrorMessage(message);
    setStatusMessage("Action failed");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, scriptText);
  }, [scriptText]);

  const stopMicMeter = useCallback(() => {
    if (micRafRef.current) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }

    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setMicLevel(0);
  }, []);

  const startMicMeter = useCallback((stream) => {
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      setMicLevel(0);
      return;
    }

    stopMicMeter();

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.85;

    const source = audioContext.createMediaStreamSource(new MediaStream([audioTracks[0]]));
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      let total = 0;
      for (let i = 0; i < data.length; i += 1) {
        total += data[i];
      }
      const avg = total / data.length;
      setMicLevel(Math.min(1, avg / 90));
      micRafRef.current = requestAnimationFrame(tick);
    };

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    micSourceRef.current = source;
    micRafRef.current = requestAnimationFrame(tick);
  }, [stopMicMeter]);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }

    stopMicMeter();
  }, [stopMicMeter]);

  const startCamera = useCallback(async () => {
    clearError();
    setIsCameraLoading(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      cameraStreamRef.current = stream;

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }

      startMicMeter(stream);
      setStatusMessage("Camera ready");
    } catch (err) {
      setError("Unable to access camera/microphone. Check browser permissions.", err);
    } finally {
      setIsCameraLoading(false);
    }
  }, [clearError, setError, startMicMeter]);

  const stopScreenShare = useCallback(() => {
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;
    }

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }

    setIsScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    clearError();

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      displayStreamRef.current = displayStream;

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = displayStream;
      }

      const [videoTrack] = displayStream.getVideoTracks();
      if (videoTrack) {
        videoTrack.addEventListener("ended", () => {
          stopScreenShare();
        });
      }

      setIsScreenSharing(true);
      setStatusMessage("Screen sharing active");
    } catch (err) {
      setError("Unable to start screen share.", err);
    }
  }, [clearError, setError, stopScreenShare]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      setStatusMessage("Screen sharing stopped");
      return;
    }

    await startScreenShare();
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const startRecording = useCallback(() => {
    clearError();

    if (!cameraStreamRef.current) {
      setErrorMessage("Camera stream is unavailable.");
      return;
    }

    try {
      recorderChunksRef.current = [];

      const preferredMime = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = new MediaRecorder(cameraStreamRef.current, preferredMime ? { mimeType: preferredMime } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recorderChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("Recorder error", event.error);
        setErrorMessage("Recording failed. Please try again.");
      };

      recorder.onstop = () => {
        if (!recorderChunksRef.current.length) {
          return;
        }

        const blob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || "video/webm" });
        const recordingUrl = URL.createObjectURL(blob);

        if (lastRecordingUrl) {
          URL.revokeObjectURL(lastRecordingUrl);
        }

        setLastRecordingUrl(recordingUrl);
        setStatusMessage("Recording completed");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setStatusMessage("Recording in progress");
    } catch (err) {
      setError("Could not start recording.", err);
    }
  }, [clearError, lastRecordingUrl, setError]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
    setStatusMessage((prev) => (prev === "Teleprompter paused" ? "Teleprompter running" : "Teleprompter paused"));
  }, []);

  const handleExit = useCallback(() => {
    stopRecording();
    stopScreenShare();
    stopCamera();
    if (lastRecordingUrl) {
      URL.revokeObjectURL(lastRecordingUrl);
    }

    setStatusMessage("Session ended");
    setIsPaused(true);
  }, [lastRecordingUrl, stopCamera, stopRecording, stopScreenShare]);

  // Smooth requestAnimationFrame based autoscroll
  useEffect(() => {
    const teleprompter = teleprompterRef.current;
    if (!teleprompter) return undefined;

    let previousTimestamp = performance.now();

    const step = (timestamp) => {
      if (!isAutoScrollOn) {
        previousTimestamp = timestamp;
        scrollRafRef.current = requestAnimationFrame(step);
        return;
      }

      const elapsed = (timestamp - previousTimestamp) / 1000;
      previousTimestamp = timestamp;
      teleprompter.scrollTop += scrollSpeed * elapsed;
      scrollRafRef.current = requestAnimationFrame(step);
    };

    scrollRafRef.current = requestAnimationFrame(step);

    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [isAutoScrollOn, scrollSpeed]);

  useEffect(() => {
    startCamera();

    return () => {
      stopRecording();
      stopScreenShare();
      stopCamera();
      if (lastRecordingUrl) {
        URL.revokeObjectURL(lastRecordingUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modeLabel = useMemo(() => MODES.find((item) => item.id === mode)?.label ?? "Standard Mode", [mode]);

  return (
    <div className={`app-shell mode-${mode}`}>
      <header className="top-header glass-panel" aria-label="PromptR top navigation">
        <div>
          <h1>PromptR</h1>
          <p className="subtle">Modern teleprompter studio for camera-first workflows</p>
        </div>

        <div className="mode-toggle" role="radiogroup" aria-label="Mode selector">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={mode === item.id}
              className={`pill-btn ${mode === item.id ? "active" : ""}`}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="video-card glass-panel" aria-label="Camera view">
          <div className="card-title-row">
            <h2>Camera</h2>
            <span className={`status-chip ${isRecording ? "recording" : "idle"}`}>
              {isRecording ? "Recording" : "Live"}
            </span>
          </div>

          <div className={`webcam-container ${mode === "meeting" ? "meeting-mode-cam" : ""}`}>
            {isCameraLoading && <div className="overlay-message">Initializing camera…</div>}
            <video ref={webcamVideoRef} autoPlay muted playsInline className="webcam-feed" />
          </div>

          <div className="mic-panel" aria-live="polite">
            <span className="mic-label">Mic level</span>
            <div className="mic-meter" role="meter" aria-valuenow={Math.round(micLevel * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="mic-meter-fill" style={{ transform: `scaleX(${Math.max(0.03, micLevel)})` }} />
            </div>
          </div>
        </section>

        <section className="script-card glass-panel" aria-label="Teleprompter script panel">
          <div className="card-title-row">
            <h2>{modeLabel}</h2>
            <button type="button" className="ghost-btn" onClick={() => setIsEditorOpen(true)}>
              Edit Script
            </button>
          </div>

          <article
            className="teleprompter-text"
            ref={teleprompterRef}
            style={{ fontSize: `${fontSize}px`, opacity: scriptOpacity }}
            aria-label="Auto-scrolling script"
          >
            {scriptText.split("\n").map((line, idx) => (
              <p key={`${line}-${idx}`}>{line || "\u00A0"}</p>
            ))}
          </article>
        </section>

        <section className="share-card glass-panel" aria-label="Screen share area">
          <div className="card-title-row">
            <h2>Screen Share</h2>
            <span className={`status-chip ${isScreenSharing ? "sharing" : "idle"}`}>
              {isScreenSharing ? "Sharing" : "Not sharing"}
            </span>
          </div>

          <div className="screen-share-box">
            {isScreenSharing ? (
              <video ref={screenVideoRef} autoPlay playsInline className="screen-feed" />
            ) : (
              <p className="placeholder">Share your screen to keep references visible while reading.</p>
            )}
          </div>

          {lastRecordingUrl && (
            <a className="download-link" href={lastRecordingUrl} download={`promptr-recording-${Date.now()}.webm`}>
              Download last recording
            </a>
          )}
        </section>
      </main>

      <footer className="control-bar glass-panel" aria-label="Primary controls">
        <button
          type="button"
          className={`icon-btn ${isPaused ? "" : "active"}`}
          onClick={togglePause}
          aria-label={isPaused ? "Resume teleprompter" : "Pause teleprompter"}
          data-tooltip={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? "▶" : "⏸"}
        </button>

        <button
          type="button"
          className={`icon-btn ${isScreenSharing ? "active share" : ""}`}
          onClick={toggleScreenShare}
          aria-label={isScreenSharing ? "Stop screen share" : "Start screen share"}
          data-tooltip={isScreenSharing ? "Stop Share" : "Share"}
        >
          🖥
        </button>

        <button
          type="button"
          className={`icon-btn ${isRecording ? "recording" : ""}`}
          onClick={toggleRecording}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          data-tooltip={isRecording ? "Stop Recording" : "Record"}
        >
          ⏺
        </button>

        <button
          type="button"
          className={`icon-btn ${isSettingsOpen ? "active" : ""}`}
          onClick={() => setIsSettingsOpen((prev) => !prev)}
          aria-label="Open settings"
          data-tooltip="Settings"
        >
          ⚙
        </button>

        <button
          type="button"
          className="icon-btn danger"
          onClick={handleExit}
          aria-label="Exit session"
          data-tooltip="Exit"
        >
          ⎋
        </button>
      </footer>

      {isSettingsOpen && (
        <aside className="floating-panel glass-panel" aria-label="Prompt settings">
          <h3>Prompt Settings</h3>

          <label htmlFor="speed-range">Scroll speed ({Math.round(scrollSpeed)} px/sec)</label>
          <input
            id="speed-range"
            type="range"
            min="10"
            max="120"
            value={scrollSpeed}
            onChange={(e) => setScrollSpeed(Number(e.target.value))}
          />

          <label htmlFor="font-range">Font size ({Math.round(fontSize)} px)</label>
          <input
            id="font-range"
            type="range"
            min="18"
            max="82"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />

          <label htmlFor="opacity-range">Script opacity ({scriptOpacity.toFixed(2)})</label>
          <input
            id="opacity-range"
            type="range"
            min="0.35"
            max="1"
            step="0.01"
            value={scriptOpacity}
            onChange={(e) => setScriptOpacity(Number(e.target.value))}
          />
        </aside>
      )}

      {isEditorOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Script editor">
          <div className="modal-body glass-panel">
            <h3>Edit Script</h3>
            <p className="subtle">Changes are auto-saved to local storage.</p>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="script-editor"
              aria-label="Script text editor"
            />

            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setScriptText(DEFAULT_SCRIPT)}>
                Reset
              </button>
              <button type="button" className="pill-btn active" onClick={() => setIsEditorOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="status-row" aria-live="polite">
        <span>{statusMessage}</span>
        {errorMessage && (
          <button type="button" className="error-pill" onClick={clearError} title={errorMessage}>
            ⚠ {errorMessage}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;