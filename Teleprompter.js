import React, { useState, useEffect } from 'react';

const Teleprompter = ({ text, speed, fontSize, isVisible }) => {
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setScrollPos((prev) => prev + speed);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isVisible, speed]);

  return (
    <div style={{
      width: '400px', // Approx 4-5 inches on most screens
      height: '300px',
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 50, 0.7)', // Your Blue Stencil aesthetic (semi-transparent)
      color: 'white',
      overflow: 'hidden',
      border: '2px solid #00D1FF',
      borderRadius: '8px',
      padding: '15px',
      zIndex: 9999, // Ensures it stays above Zoom/Webcam
      pointerEvents: 'none' // Makes it "click-through" so you can still use your mouse
    }}>
      <div style={{
        transform: `translateY(-${scrollPos}px)`,
        fontSize: `${fontSize}px`,
        lineHeight: '1.5',
        fontWeight: 'bold'
      }}>
        {text}
      </div>
    </div>
  );
};

export default Teleprompter;