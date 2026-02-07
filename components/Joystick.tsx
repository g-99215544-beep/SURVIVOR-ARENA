import React, { useEffect, useRef, useState } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, onStart, onEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const touchId = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleStart = (clientX: number, clientY: number) => {
      setActive(true);
      setOrigin({ x: clientX, y: clientY });
      setPosition({ x: 0, y: 0 });
      if (onStart) onStart();
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!active) return;
      const dx = clientX - origin.x;
      const dy = clientY - origin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 50; // Joystick radius
      
      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(dist, maxDist);
      
      const cx = Math.cos(angle) * clampedDist;
      const cy = Math.sin(angle) * clampedDist;
      
      setPosition({ x: cx, y: cy });
      
      // Normalize output -1 to 1
      onMove(cx / maxDist, cy / maxDist);
    };

    const handleEnd = () => {
      setActive(false);
      setPosition({ x: 0, y: 0 });
      onMove(0, 0);
      if (onEnd) onEnd();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchId.current = touch.identifier;
      handleStart(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === touchId.current) {
                handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                break;
            }
        }
    };

    const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
         for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === touchId.current) {
                handleEnd();
                break;
            }
        }
    };
    
    // Mouse fallbacks for desktop testing
    const onMouseDown = (e: MouseEvent) => {
        handleStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
        if(active) handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
        if(active) handleEnd();
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
        container.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
  }, [active, origin, onMove, onStart, onEnd]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-40 cursor-crosshair">
       {active && (
         <div 
           className="absolute w-24 h-24 rounded-full border-2 border-white/20 bg-black/20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 backdrop-blur-sm"
           style={{ left: origin.x, top: origin.y }}
         >
            <div 
              className="absolute w-12 h-12 rounded-full bg-white/20 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.3)] transform -translate-x-1/2 -translate-y-1/2 backdrop-blur-sm"
              style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}
            />
         </div>
       )}
       {!active && (
           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-sm animate-pulse pointer-events-none">
               Touch & Drag to Move
           </div>
       )}
    </div>
  );
};