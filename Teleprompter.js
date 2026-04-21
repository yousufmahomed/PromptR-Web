@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, sans-serif;
}

body {
  background-color: #000; 
  color: #fff;
  overflow: hidden; 
}

.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Background Live Video */
.master-webcam {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* Ensures video fills screen without warping */
  z-index: 1;
  background: radial-gradient(circle at center, #18181b 0%, #000 100%);
  transform: scaleX(-1); /* Mirrors the webcam so it feels natural to the user */
}

/* --- FORCED CENTER SCRIPT ENGINE --- */
.layout-engine {
  position: absolute; 
  inset: 0;
  display: flex;
  justify-content: center;
  z-index: 5;
}

.script-column {
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  mask-image: linear-gradient(transparent 2%, black 15%, black 60%, transparent 95%);
  -webkit-mask-image: linear-gradient(transparent 2%, black 15%, black 60%, transparent 95%);
}

.eye-line-container {
  position: absolute;
  top: 15%; 
  width: 100%;
  display: flex;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.eye-line-glow {
  width: 300px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #10b981, transparent);
  box-shadow: 0 0 15px #10b981;
}

.scrolling-text-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.scrolling-text {
  text-align: center;
  white-space: pre-wrap;
  line-height: 1.4;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0px 4px 15px rgba(0,0,0,1);
  will-change: transform;
}

.spacer.top { height: 15vh; }
.spacer.bottom { height: 80vh; }

/* --- MODERN SLEEK SETTINGS PANEL --- */
.settings-panel {
  position: absolute;
  /* INCREASED FROM 110px to 180px: Pushes the panel higher up */
  bottom: 180px; 
  width: 380px;
  padding: 1.5rem;
  background: rgba(15, 15, 18, 0.85); 
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  z-index: 15;
  display: flex; 
  flex-direction: column; 
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 30px 60px rgba(0,0,0,0.8);
}

.settings-panel h3 { 
  font-size: 1rem; 
  font-weight: 600;
  color: #fff; 
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.script-input-modern {
  width: 100%;
  height: 100px;
  background: rgba(255, 255, 255, 0.05); 
  color: #fff; 
  border: 1px solid rgba(255, 255, 255, 0.1); 
  border-radius: 12px;
  padding: 1rem;
  font-size: 0.9rem;
  text-align: center;
  resize: none;
  outline: none;
  transition: all 0.2s ease;
}

.script-input-modern:focus {
  background: rgba(255, 255, 255, 0.1);
  border-color: #10b981;
}

.setting-row { 
  width: 100%;
  display: flex; 
  flex-direction: column; 
  align-items: center;
  gap: 0.5rem; 
}

.setting-row label { 
  font-size: 0.75rem; 
  font-weight: 500; 
  color: #a1a1aa; 
  text-transform: uppercase;
  letter-spacing: 1px;
}

input[type=range] {
  accent-color: #10b981; 
  width: 85%;
  height: 4px; 
  background: rgba(255, 255, 255, 0.2); 
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

/* --- APPLE-STYLE BOTTOM DOCK --- */
.controls-dock {
  position: absolute;
  bottom: 30px;
  padding: 0.5rem;
  background: rgba(15, 15, 18, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  z-index: 20;
  display: flex;
  gap: 0.25rem;
}

.btn-dock {
  background: transparent;
  color: #e4e4e7;
  padding: 0.75rem 1.5rem;
  border-radius: 100px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-dock:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.btn-dock.active { background: rgba(255, 255, 255, 0.15); color: #fff; }

.btn-dock.play-btn {
  background: #10b981;
  color: #000;
}
.btn-dock.play-btn:hover { background: #059669; }

.btn-dock.recording { color: #ef4444; };