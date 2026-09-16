import React, { useState, useRef } from 'react';
import { playWheelTickSound } from '../../utils/audio';
import { Sparkles, Trophy, Play } from 'lucide-react';

export type WheelSegment = {
  id: string;
  label: string;
  chapter: string;
  color: string;
  textColor: string;
  multiplier: number;
};

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 'seg-1', label: 'Chapter 3: Discipline', chapter: 'Chapter 3: Discipline & Due Process', color: '#059669', textColor: '#ffffff', multiplier: 1 },
  { id: 'seg-2', label: 'Chapter 7: Leave', chapter: 'Chapter 7: Leave & Allowances', color: '#0d9488', textColor: '#ffffff', multiplier: 1 },
  { id: 'seg-3', label: 'Chapter 10: Appeals', chapter: 'Chapter 10: Petitions & Appeals', color: '#2563eb', textColor: '#ffffff', multiplier: 1 },
  { id: 'seg-4', label: 'WILDCARD 2X XP!', chapter: 'Chapter 13: Procurement & Public Ethics', color: '#d97706', textColor: '#ffffff', multiplier: 2 },
  { id: 'seg-5', label: 'Chapter 13: Ethics', chapter: 'Chapter 13: Procurement & Public Ethics', color: '#7c3aed', textColor: '#ffffff', multiplier: 1 },
  { id: 'seg-6', label: 'Chapter 15: Promotion', chapter: 'Chapter 15: Promotion & Evaluation', color: '#0284c7', textColor: '#ffffff', multiplier: 1 },
];

interface WheelProps {
  onSpinComplete: (segment: WheelSegment) => void;
}

export const WheelOfRules: React.FC<WheelProps> = ({ onSpinComplete }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<WheelSegment | null>(null);

  const lastTickAngleRef = useRef(0);

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setSelectedSegment(null);

    // Random extra spins (5 to 8 full spins) + random slice angle
    const numSlices = WHEEL_SEGMENTS.length;
    const sliceAngle = 360 / numSlices;
    const randomSliceIdx = Math.floor(Math.random() * numSlices);
    
    // Add extra rotations
    const extraRotations = (5 + Math.floor(Math.random() * 3)) * 360;
    // Calculate final angle pointing to top pointer (270 deg / -90 deg)
    const targetAngle = extraRotations + (360 - (randomSliceIdx * sliceAngle)) - (sliceAngle / 2);
    
    const newTotalRotation = rotationDegree + targetAngle;
    setRotationDegree(newTotalRotation);

    // Sound effect ticks during spin animation
    const startTime = Date.now();
    const duration = 4000;

    const tickInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(tickInterval);
        setIsSpinning(false);
        const winningSeg = WHEEL_SEGMENTS[randomSliceIdx];
        setSelectedSegment(winningSeg);
        onSpinComplete(winningSeg);
      } else {
        playWheelTickSound();
      }
    }, 120);
  };

  const sliceAngle = 360 / WHEEL_SEGMENTS.length;

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-6 animate-fadeIn">
      
      {/* Game Show Wheel Container */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
        
        {/* Outer Glowing Stage Ring */}
        <div className="absolute inset-0 rounded-full border-8 border-amber-400 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 shadow-2xl shadow-amber-500/30 flex items-center justify-center p-2">
          
          {/* Wheel SVG */}
          <div 
            className="w-full h-full rounded-full overflow-hidden transition-all duration-[4000ms] cubic-bezier(0.15, 0.99, 0.24, 1) shadow-inner"
            style={{ transform: `rotate(${rotationDegree}deg)` }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {WHEEL_SEGMENTS.map((seg, idx) => {
                const startAngle = idx * sliceAngle;
                const endAngle = (idx + 1) * sliceAngle;
                const startRad = (Math.PI * startAngle) / 180;
                const endRad = (Math.PI * endAngle) / 180;

                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);

                const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
                
                // Text angle center
                const textAngle = startAngle + sliceAngle / 2;
                const textRad = (Math.PI * textAngle) / 180;
                const textX = 50 + 32 * Math.cos(textRad);
                const textY = 50 + 32 * Math.sin(textRad);

                return (
                  <g key={seg.id}>
                    <path d={pathData} fill={seg.color} stroke="#ffffff" strokeWidth="0.8" />
                    <text
                      x={textX}
                      y={textY}
                      fill={seg.textColor}
                      fontSize="4.2"
                      fontWeight="800"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

        </div>

        {/* Top Pointer Needle */}
        <div className="absolute -top-4 z-20 flex flex-col items-center">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-rose-600 drop-shadow-lg" />
          <div className="w-4 h-4 rounded-full bg-rose-600 border-2 border-white -mt-2 shadow-md" />
        </div>

        {/* Center Spin Wheel Hub Button */}
        <button
          disabled={isSpinning}
          onClick={handleSpin}
          className={`absolute z-30 w-20 h-20 rounded-full border-4 border-white shadow-2xl flex flex-col items-center justify-center font-extrabold text-xs transition-all ${
            isSpinning 
              ? 'bg-amber-400 text-slate-900 animate-pulse cursor-wait' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 cursor-pointer shadow-emerald-600/40'
          }`}
        >
          {isSpinning ? (
            <span className="font-black">SPINNING...</span>
          ) : (
            <>
              <Play className="w-5 h-5 fill-white mb-0.5" />
              <span>SPIN!</span>
            </>
          )}
        </button>

      </div>

      {/* Result Indicator */}
      {selectedSegment && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl text-center shadow-md animate-bounce">
          <div className="inline-flex items-center gap-1.5 text-amber-800 text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Wheel Selection Result</span>
          </div>
          <p className="text-lg font-black text-slate-900">{selectedSegment.label}</p>
          {selectedSegment.multiplier > 1 && (
            <span className="inline-block mt-1 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-extrabold shadow">
              🔥 Double XP Multiplier Active!
            </span>
          )}
        </div>
      )}

    </div>
  );
};
