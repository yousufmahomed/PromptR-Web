@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

/* --- BASE STYLES --- */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, sans-serif;
}

body {
  background-color: #09090b; /* Deep modern black */
  color: #f8fafc;
  overflow: hidden; 
}

.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle at center, #18181b 0%, #000000 100%);
}

/* --- GLASSMORPHISM UTILITY --- */
.glass-card {
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* --- LANDING PAGE --- */
.landing {
  z-index: 10;
  width: 100%;
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.landing .glass-card {
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
  max-width: 500px;
}

.logo {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -2px;
}

.logo .accent { color: #10b981; } /* Emerald Green */

.subtitle {
  color: #a1a1aa;
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

/* Buttons */
button {
  cursor: pointer;
  border: none;
  font-weight: 600;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover { transform: translateY(-2px); }
button:active { transform: translateY(0); }

.btn-primary {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  width: 100%;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
}

.btn-primary:hover { box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }

.mode-selection {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.btn-secondary {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
.btn-secondary.meeting { border-color: rgba(139, 92, 246, 0.5); color: #c4b5fd; }

/* --- EDITOR MODAL --- */
.editor-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

.editor-modal {
  width: 90vw;
  max-width: 800px;
  height: 80vh;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.editor-modal textarea {
  flex-grow: 1;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  font-size: 1.2rem;
  border-radius: 12px;
  resize: none;
  line-height: 1.6;
}

.editor-modal textarea:focus { outline: 1px solid #10b981; }

/* --- TELEPROMPTER VIEW --- */
.teleprompter-view {
  width: 100%;
  height: 100%;
  position: relative;
  background: #000;
}

.master-webcam {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: 1;
  transition: opacity 0.3s ease;
}

.master-webcam.pip {
  width: 320px; height: auto;
  bottom: 100px; right: 30px; top: auto; left: auto;
  border-radius: 16px;
  border: 2px solid rgba(255,255,255,0.2);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  z-index: 2;
}

/* Layout Engine */
.layout-engine {
  position: absolute; inset: 0;
  bottom: 80px; 
  display: flex;
  z-index: 5;
}

.sidebar {
  width: 40%;
  padding: 2rem;
  display: flex; align-items: center; justify-content: center;
}

.screen-video {
  width: 100%; border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 25px 50px rgba(0,0,0,0.6);
}

/* --- THE NEW MODERN EYE-LINE --- */
.script-column {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
  mask-image: linear-gradient(transparent 5%, black 40%, black 60%, transparent 95%);
  -webkit-mask-image: linear-gradient(transparent 5%, black 40%, black 60%, transparent 95%);
}

.eye-line-container {
  position: absolute;
  top: 35%; /* Optimal reading position */
  left: 0; width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
  pointer-events: none;
}

.eye-line-glow {
  flex-grow: 1;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);
}

.eye-line-marker {
  width: 30px; height: 3px;
  background: #10b981;
  border-radius: 2px;
}
.eye-line-marker.left { border-top-right-radius: 10px; border-bottom-right-radius: 10px; }
.eye-line-marker.right { border-top-left-radius: 10px; border-bottom-left-radius: 10px; }

/* Text */
.scrolling-text {
  padding: 0 12%;
  white-space: pre-wrap;
  line-height: 1.6;
  font-weight: 700;
  text-align: center;
  color: #fff;
  text-shadow: 0px 4px 12px rgba(0,0,0,1), 0px 2px 4px rgba(0,0,0,1);
  will-change: transform;
}

.spacer { height: 40vh; }
.spacer.bottom { height: 70vh; }

/* --- GLASS CONTROLS & SETTINGS --- */
.controls-bar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  z-index: 20;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.05);
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon:hover { background: rgba(255, 255, 255, 0.15); }
.btn-icon.active { background: rgba(16, 185, 129, 0.2); border-color: #10b981; }

.btn-icon.recording {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}

.rec-dot {
  width: 10px; height: 10px;
  background-color: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 10px #ef4444;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.btn-icon.exit { border-color: rgba(239, 68, 68, 0.4); }
.btn-icon.exit:hover { background: #ef4444; color: white; }

/* Settings */
.settings-panel {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1.5rem;
  width: 320px;
  z-index: 15;
  display: flex; flex-direction: column; gap: 1.25rem;
}

.settings-panel h3 { font-size: 1rem; color: #a1a1aa; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; }

.setting-row { display: flex; flex-direction: column; gap: 0.5rem; }
.setting-row label { font-size: 0.9rem; font-weight: 600; color: #e4e4e7; }

/* Modern Range Slider */
input[type=range] {
  -webkit-appearance: none; width: 100%; background: transparent;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px; width: 16px;
  border-radius: 50%;
  background: #10b981;
  cursor: pointer;
  margin-top: -6px;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}
input[type=range]::-webkit-slider-runnable-track {
  width: 100%; height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

/* Mobile Adjustments */
@media (max-width: 768px) {
  .controls-bar { width: 95%; flex-wrap: wrap; justify-content: center; border-radius: 12px; }
  .btn-icon { flex: 1 1 auto; justify-content: center; font-size: 0.85rem; padding: 0.6rem; }
  .master-webcam.pip { width: 140px; bottom: 130px; right: 10px; }
  .settings-panel { bottom: 130px; }
}