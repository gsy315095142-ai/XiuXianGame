import React from 'react';
import { Button } from './Button';

interface StartScreenProps {
  onStart: () => void;
  onConfig: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onConfig }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background with scrolling effect simulation or static atmospheric image */}
      <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cultivation_sky/1920/1080')] bg-cover bg-center opacity-50 animate-pulse-slow"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl h-full justify-between py-12 md:py-20">
        
        {/* Title Section */}
        <div className="text-center animate-fade-in-down mt-8">
          <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 to-cyan-600 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] tracking-[0.2em] mb-4 font-serif">
            郭郭修仙
          </h1>
          <div className="text-slate-400 font-mono tracking-widest text-sm md:text-base">v0.2.25112301</div>
        </div>

        {/* Visual Centerpiece: Flying Swordsman */}
        <div className="flex-1 flex items-center justify-center w-full my-4 md:my-8 perspective-1000">
           {/* Simple CSS animation for floating */}
           <div className="relative w-64 h-64 md:w-80 md:h-80 animate-float">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-[60px] animate-pulse"></div>
              
              {/* Character/Sword Image Container */}
              <div className="w-full h-full relative flex items-center justify-center">
                  {/* Use a sword image or icon as the base */}
                  <div className="absolute bottom-10 transform -rotate-12 w-64 h-8 bg-gradient-to-r from-gray-300 via-cyan-200 to-transparent rounded-full shadow-[0_0_20px_cyan]"></div>
                  <div className="absolute bottom-10 transform -rotate-12 w-64 h-1 bg-white/80 blur-sm"></div>
                  
                  {/* Character Silhouette/Image */}
                  <img 
                    src="https://picsum.photos/seed/cultivator_hero/400/400" 
                    alt="Cultivator" 
                    className="w-48 h-48 object-cover rounded-full border-2 border-cyan-400/30 shadow-lg relative -top-4 z-10 mask-image-gradient"
                    style={{ clipPath: 'circle(50% at 50% 50%)' }}
                  />

                  {/* Flying particles */}
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                      <div className="absolute top-0 left-1/4 w-1 h-1 bg-white rounded-full animate-ping"></div>
                      <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-cyan-300 rounded-full animate-ping animation-delay-500"></div>
                  </div>
              </div>
              
              {/* Orbiting Elements */}
              <div className="absolute inset-0 animate-spin-slow pointer-events-none">
                 <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl filter drop-shadow-[0_0_5px_cyan] opacity-80">⚔️</div>
                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-3xl filter drop-shadow-[0_0_5px_cyan] opacity-80 rotate-180">⚔️</div>
                 <div className="absolute top-1/2 -left-4 -translate-y-1/2 text-2xl filter drop-shadow-[0_0_5px_cyan] opacity-80 -rotate-90">✨</div>
                 <div className="absolute top-1/2 -right-4 -translate-y-1/2 text-2xl filter drop-shadow-[0_0_5px_cyan] opacity-80 rotate-90">✨</div>
              </div>
           </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-lg animate-fade-in-up px-8 mb-10">
          <Button 
            variant="primary" 
            size="lg" 
            className="flex-1 py-5 text-xl md:text-2xl font-bold tracking-widest shadow-[0_0_30px_rgba(5,150,105,0.5)] border border-emerald-400 hover:scale-105 hover:shadow-[0_0_50px_rgba(5,150,105,0.8)] transition-all bg-gradient-to-r from-emerald-900/80 to-teal-800/80 backdrop-blur-sm"
            onClick={onStart}
          >
            开始修仙
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1 py-5 text-lg md:text-xl tracking-widest border border-slate-500 text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-300 transition-all backdrop-blur-sm"
            onClick={onConfig}
          >
            游戏配置
          </Button>
        </div>

      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .animate-pulse-slow {
            animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};