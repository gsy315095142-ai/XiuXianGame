
import React from 'react';
import { Button } from './Button';

interface StartScreenProps {
  onStart: () => void;
  onConfig: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onConfig }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-white">
      {/* Dynamic Background: Mountains */}
      <div 
        className="absolute inset-0 bg-cover bg-center animate-pan-background"
        style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920&auto=format&fit=crop')",
            filter: 'brightness(0.5) contrast(1.2)'
        }}
      ></div>

      {/* Atmospheric Fog/Cloud Layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-950/60"></div>
      
      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center w-full h-full justify-between py-12 md:py-20 min-h-screen">
        
        {/* Title */}
        <div className="text-center mt-4 md:mt-10 animate-fade-in-down">
           <h1 className="text-6xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)] font-serif tracking-widest">
             修仙
           </h1>
           <div className="flex items-center justify-center gap-4 mt-2">
               <div className="h-px w-12 bg-cyan-500/50"></div>
               <div className="text-cyan-400 tracking-[0.4em] text-sm md:text-xl uppercase font-bold">Cultivation Journey</div>
               <div className="h-px w-12 bg-cyan-500/50"></div>
           </div>
        </div>

        {/* The Flying Stick Figure Animation */}
        <div className="flex-1 w-full flex items-center justify-center relative my-8">
            <div className="relative animate-fly transform scale-125 md:scale-150">
                {/* Wind lines */}
                <div className="absolute -left-32 top-10 w-48 h-0.5 bg-white/10 blur-[1px] animate-wind rounded-full"></div>
                <div className="absolute -left-20 top-24 w-32 h-0.5 bg-white/20 blur-[1px] animate-wind animation-delay-500 rounded-full"></div>
                <div className="absolute -left-40 top-40 w-56 h-0.5 bg-white/5 blur-[1px] animate-wind animation-delay-700 rounded-full"></div>

                {/* SVG Stickman */}
                <svg width="300" height="300" viewBox="0 0 200 200" className="drop-shadow-[0_0_20px_cyan]">
                    <defs>
                        <linearGradient id="swordGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f1f5f9" />
                            <stop offset="50%" stopColor="#94a3b8" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    
                    {/* Sword Aura Trail */}
                    <path d="M20,135 Q-20,140 -40,120" stroke="cyan" strokeWidth="2" fill="none" opacity="0.4" className="animate-pulse" />

                    {/* Group Rotated for Flight Angle */}
                    <g transform="rotate(-10, 100, 100)">
                        {/* The Sword */}
                        <path d="M40,110 L160,90 L170,88 L160,95 L40,115 Z" fill="url(#swordGrad)" filter="url(#glow)" />
                        <line x1="40" y1="112" x2="160" y2="92" stroke="cyan" strokeWidth="1" opacity="0.8" />
                        
                        {/* Stick Man */}
                        {/* Back Leg (Kneeling/Flying pose) */}
                        <line x1="85" y1="95" x2="75" y2="80" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        
                        {/* Front Leg (Standing on sword) */}
                        <line x1="100" y1="92" x2="105" y2="75" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        
                        {/* Torso */}
                        <line x1="90" y1="75" x2="98" y2="50" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        
                        {/* Head */}
                        <circle cx="100" cy="42" r="9" fill="white" stroke="white" strokeWidth="1" />
                        
                        {/* Back Arm (Balance) */}
                        <line x1="95" y1="55" x2="70" y2="60" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        
                        {/* Front Arm (Spell casting/Pointing) */}
                        <line x1="95" y1="55" x2="125" y2="48" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        
                        {/* Flowing Scarf/Hair */}
                        <path d="M98,42 Q70,40 50,35" stroke="cyan" strokeWidth="1.5" fill="none" opacity="0.9" className="animate-flutter" />
                    </g>
                </svg>
            </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-4 w-full max-w-md px-8 mb-8 md:mb-12 animate-fade-in-up">
           <Button 
             variant="primary" 
             size="lg" 
             onClick={onStart}
             className="w-full py-5 text-xl tracking-[0.5em] font-bold border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] bg-slate-900/80 hover:bg-cyan-900/80 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] transition-all duration-300 backdrop-blur-sm text-cyan-100"
           >
             开始修仙
           </Button>
           <Button 
             variant="secondary" 
             size="lg" 
             onClick={onConfig}
             className="w-full py-4 text-lg tracking-[0.3em] font-bold bg-black/40 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/60 backdrop-blur-sm transition-all"
           >
             游戏配置
           </Button>
           
           <div className="text-center text-slate-600 text-xs font-mono mt-4">
               Ver 0.3.25120701
           </div>
        </div>
      </div>
      
      <style>{`
        @keyframes pan-background {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes fly {
            0%, 100% { transform: translateY(0) translateX(0); }
            50% { transform: translateY(-15px) translateX(5px); }
        }
        @keyframes wind {
            0% { transform: translateX(100px); opacity: 0; }
            20% { opacity: 0.6; }
            100% { transform: translateX(-100px); opacity: 0; }
        }
        @keyframes flutter {
             0%, 100% { d: path("M98,42 Q70,40 50,35"); }
             50% { d: path("M98,42 Q70,45 50,40"); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-pan-background {
            animation: pan-background 80s ease-in-out infinite;
        }
        .animate-fly {
            animation: fly 3s ease-in-out infinite;
        }
        .animate-wind {
            animation: wind 1.5s linear infinite;
        }
        .animate-flutter {
            animation: flutter 0.4s ease-in-out infinite;
        }
        .animate-fade-in-down {
          animation: fadeInDown 1s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out 0.5s both;
        }
        .animation-delay-500 {
            animation-delay: 500ms;
        }
        .animation-delay-700 {
            animation-delay: 700ms;
        }
      `}</style>
    </div>
  );
};
