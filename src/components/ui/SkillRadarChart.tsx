import React from 'react';

export default function SkillDNAReference() {
  return (
    <div className="relative w-full aspect-square max-w-[300px] mx-auto flex items-center justify-center">
      {/* Decorative SVG Web */}
      <svg viewBox="0 0 100 100" className="w-full h-full opacity-20 absolute inset-0">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#F27D26" strokeWidth="0.5" strokeDasharray="2 2" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#F27D26" strokeWidth="0.5" strokeDasharray="2 2" />
        <circle cx="50" cy="50" r="15" fill="none" stroke="#F27D26" strokeWidth="0.5" strokeDasharray="2 2" />
        
        {/* Axis Lines */}
        <line x1="50" y1="5" x2="50" y2="95" stroke="#F27D26" strokeWidth="0.5" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="#F27D26" strokeWidth="0.5" />
        <line x1="18" y1="18" x2="82" y2="82" stroke="#F27D26" strokeWidth="0.5" />
        <line x1="18" y1="82" x2="82" y2="18" stroke="#F27D26" strokeWidth="0.5" />
      </svg>
      
      {/* The "Fixed" DNA Pattern */}
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl relative z-10">
        <polygon 
          points="50,15 80,35 85,65 50,85 15,65 20,35" 
          fill="#F27D26" 
          fillOpacity="0.4" 
          stroke="#F27D26" 
          strokeWidth="2" 
        />
        {/* Highlight points */}
        <circle cx="50" cy="15" r="2" fill="#141414" />
        <circle cx="80" cy="35" r="2" fill="#141414" />
        <circle cx="85" cy="65" r="2" fill="#141414" />
        <circle cx="50" cy="85" r="2" fill="#141414" />
        <circle cx="15" cy="65" r="2" fill="#141414" />
        <circle cx="20" cy="35" r="2" fill="#141414" />
      </svg>

      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Fixed DNA Reference</span>
      </div>
    </div>
  );
}
