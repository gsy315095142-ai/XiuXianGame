
import React from 'react';
import { Button } from './Button';

interface StartScreenProps {
  onStart: () => void;
  onConfig: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onConfig }) => {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-4 bg-[url('https://picsum.photos/seed/fuxianstart/1920/1080')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      <div className="relative z-10 flex flex-col items-center animate-fade-in">
        <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-yellow-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] mb-2 tracking-wider">
          郭郭修仙
        </h1>
        <div className="text-emerald-400/80 text-xl mb-12 tracking-widest uppercase">
          v0.1.251122
        </div>

        <div className="flex flex-col gap-6 w-full max-w-xs">
          <Button 
            variant="primary" 
            size="lg" 
            className="w-full text-xl py-4 shadow-[0_0_20px_rgba(5,150,105,0.6)] hover:scale-105 transition-transform"
            onClick={onStart}
          >
            开始游戏
          </Button>
          
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full text-lg py-3 border-slate-500 hover:border-slate-300 hover:scale-105 transition-transform"
            onClick={onConfig}
          >
            配置游戏
          </Button>
        </div>

        <div className="mt-24 text-slate-500 text-xs">
          Built with React & Tailwind
        </div>
      </div>
    </div>
  );
};
