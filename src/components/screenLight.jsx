import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Maximize, Lock } from 'lucide-react';

// Utility function for color temperature conversion
const kelvinToRGB = (kelvin) => {
  const temp = kelvin / 100;
  let red, green, blue;

  if (temp <= 66) {
    red = 255;
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;
    if (temp <= 19) {
      blue = 0;
    } else {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
    }
  } else {
    red = temp - 60;
    red = 329.698727446 * Math.pow(red, -0.1332047592);
    green = temp - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);
    blue = 255;
  }

  return {
    r: Math.min(Math.max(Math.round(red), 0), 255),
    g: Math.min(Math.max(Math.round(green), 0), 255),
    b: Math.min(Math.max(Math.round(blue), 0), 255)
  };
};

// Slider Component
const Slider = ({ label, value, onChange, min, max, step = 1, unit = '' }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm text-white">{label}</label>
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
    />
    <div className="text-center text-sm text-white">
      {value}{unit}
    </div>
  </div>
);

// Menu Toggle Button
const MenuToggle = ({ isVisible, onClick }) => (
  <button
    onClick={onClick}
    className={`fixed bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full 
    bg-black/40 backdrop-blur flex items-center justify-center transition-opacity
    ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
  >
    <ChevronUp className="w-6 h-6 text-white" />
  </button>
);

// Main App Component
const ScreenLight = () => {
  // State
  const [temperature, setTemperature] = useState(1800);
  const [brightness, setBrightness] = useState(100);
  const [menuVisible, setMenuVisible] = useState(true);
  const [wakeLock, setWakeLock] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [toggleVisible, setToggleVisible] = useState(true);

  // Refs
  const menuTimeout = useRef(null);
  const brightnessTimeout = useRef(null);
  const touchStartRef = useRef({ y: 0, time: 0 });
  const lastTapRef = useRef(0);
  const mouseTimerRef = useRef(null);

  // Calculate background color
  const bgColor = useCallback(() => {
    const rgb = kelvinToRGB(temperature);
    const brightnessMultiplier = brightness / 100;
    return `rgb(${rgb.r * brightnessMultiplier}, ${rgb.g * brightnessMultiplier}, ${rgb.b * brightnessMultiplier})`;
  }, [temperature, brightness]);

  // Menu visibility handlers
  const showMenu = useCallback(() => {
    setMenuVisible(true);
    setToggleVisible(false);
    clearTimeout(menuTimeout.current);
    menuTimeout.current = setTimeout(() => {
      setMenuVisible(false);
      setToggleVisible(true);
    }, 3000);
  }, []);

  const hideMenu = useCallback(() => {
    setMenuVisible(false);
    setToggleVisible(true);
  }, []);

  // Touch handlers
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    const touchEnd = e.changedTouches[0].clientY;
    const touchDuration = Date.now() - touchStartRef.current.time;
    const swipeDistance = touchEnd - touchStartRef.current.y;

    if (touchDuration < 300 && Math.abs(swipeDistance) > 50) {
      if (swipeDistance < 0) {
        showMenu();
      } else {
        hideMenu();
      }
    } else {
      // Double tap detection
      const currentTime = Date.now();
      if (currentTime - lastTapRef.current < 300) {
        setMenuVisible(prev => !prev);
      }
      lastTapRef.current = currentTime;
    }
  };

  // Wake lock handling
  const toggleWakeLock = async () => {
    try {
      if (wakeLock) {
        await wakeLock.release();
        setWakeLock(null);
      } else {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
      }
    } catch (err) {
      console.error('Wake Lock error:', err);
    }
  };

  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Mouse movement handler
  useEffect(() => {
    const handleMouseMove = () => {
      setToggleVisible(true);
      clearTimeout(mouseTimerRef.current);
      mouseTimerRef.current = setTimeout(() => {
        if (!menuVisible) {
          setToggleVisible(false);
        }
      }, 2000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [menuVisible]);

  // Brightness indicator
  useEffect(() => {
    if (brightnessTimeout.current) {
      clearTimeout(brightnessTimeout.current);
    }
    setShowBrightnessIndicator(true);
    brightnessTimeout.current = setTimeout(() => {
      setShowBrightnessIndicator(false);
    }, 1500);
  }, [brightness]);

  return (
    <div 
      className="h-screen w-screen overflow-hidden"
      style={{ backgroundColor: bgColor() }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Brightness Indicator */}
      <div className={`fixed top-5 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 
        rounded-full backdrop-blur transition-opacity duration-300 text-sm
        ${showBrightnessIndicator ? 'opacity-100' : 'opacity-0'}`}>
        Brightness: {brightness}%
      </div>

      {/* Wake Lock Indicator */}
      {wakeLock && (
        <div className="fixed top-5 right-5 bg-black/70 text-white px-4 py-2 
          rounded-full backdrop-blur text-sm">
          Screen Lock Active
        </div>
      )}

      {/* Menu Toggle */}
      <MenuToggle isVisible={toggleVisible && !menuVisible} onClick={showMenu} />

      {/* Control Menu */}
      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-sm 
        bg-black/70 backdrop-blur p-5 rounded-t-xl transition-transform duration-300
        ${menuVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="space-y-4">
          <Slider
            label="Color Temperature"
            value={temperature}
            onChange={setTemperature}
            min={1000}
            max={6500}
            step={100}
            unit="K"
          />
          <Slider
            label="Brightness"
            value={brightness}
            onChange={setBrightness}
            min={0}
            max={100}
            unit="%"
          />
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={toggleWakeLock}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-black"
            >
              <Lock className="w-4 h-4" />
              {wakeLock ? 'Disable Lock' : 'Keep Screen On'}
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-black"
            >
              <Maximize className="w-4 h-4" />
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenLight;