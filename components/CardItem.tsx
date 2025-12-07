
import React from 'react';
import { Card, CardType, ElementType } from '../types';
import { ELEMENT_CONFIG } from '../constants';

interface CardItemProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  playerLevel?: number; // Optional, to check reqLevel
  currentElement?: number; // Optional: Pass current specific element pool value to check cost
}

export const CardItem: React.FC<CardItemProps> = ({ card, onClick, disabled, isPlayable = true, playerLevel, currentElement }) => {
  
  // Mapping ElementType to Background Gradients
  const elementBgColors: Record<ElementType, string> = {
    [ElementType.METAL]: 'border-yellow-600/50 bg-gradient-to-b from-yellow-900/80 to-slate-900',
    [ElementType.WOOD]: 'border-green-600/50 bg-gradient-to-b from-green-900/80 to-slate-900',
    [ElementType.WATER]: 'border-blue-600/50 bg-gradient-to-b from-blue-900/80 to-slate-900',
    [ElementType.FIRE]: 'border-red-600/50 bg-gradient-to-b from-red-900/80 to-slate-900',
    [ElementType.EARTH]: 'border-[#8B4513]/50 bg-gradient-to-b from-[#3E2723]/90 to-slate-900',
    [ElementType.LIGHT]: 'border-yellow-300/50 bg-gradient-to-b from-yellow-700/80 to-slate-900',
    [ElementType.DARK]: 'border-purple-600/50 bg-gradient-to-b from-purple-900/80 to-slate-900',
    [ElementType.WIND]: 'border-teal-500/50 bg-gradient-to-b from-teal-900/80 to-slate-900',
    [ElementType.THUNDER]: 'border-indigo-500/50 bg-gradient-to-b from-indigo-900/80 to-slate-900',
    [ElementType.ICE]: 'border-cyan-400/50 bg-gradient-to-b from-cyan-900/80 to-slate-900',
    [ElementType.SWORD]: 'border-slate-400/50 bg-gradient-to-b from-slate-700/80 to-slate-900',
  };

  const textColor = {
    [CardType.ATTACK]: 'text-red-200',
    [CardType.DEFEND]: 'text-blue-200',
    [CardType.HEAL]: 'text-green-200',
    [CardType.BUFF]: 'text-amber-200',
    [CardType.GROWTH]: 'text-purple-200',
  };

  // Defensive defaults
  const safeElement = card.element || ElementType.SWORD;
  const safeType = card.type || CardType.ATTACK;

  const levelMet = playerLevel && card.reqLevel ? playerLevel >= card.reqLevel : true;
  const elementMet = currentElement !== undefined ? currentElement >= (card.elementCost || 0) : true;

  const isDisabled = disabled || !levelMet || !elementMet;
  const isPierce = card.tags?.includes('PIERCE');

  const elementInfo = ELEMENT_CONFIG[safeElement] || ELEMENT_CONFIG[ElementType.SWORD];
  const bgStyle = elementBgColors[safeElement] || elementBgColors[ElementType.SWORD];
  const typeTextColor = textColor[safeType] || 'text-gray-200';

  return (
    <div 
      onClick={!isDisabled && isPlayable ? onClick : undefined}
      className={`
        relative w-32 h-48 border-2 rounded-xl p-2 flex flex-col select-none transition-transform duration-200
        ${bgStyle}
        ${isDisabled ? 'opacity-40 cursor-not-allowed scale-95 grayscale-[0.5]' : 'cursor-pointer hover:-translate-y-4 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] shadow-lg'}
        ${!isPlayable && !isDisabled ? 'opacity-70' : ''}
      `}
    >
      {/* Cost Badge (Spirit) */}
      <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-slate-300 z-10 font-bold text-white shadow-md text-sm">
        {card.cost || 0}
      </div>

      {/* Element Badge */}
      <div className={`absolute -top-2 -right-2 w-8 h-8 ${elementInfo.bg} rounded-full flex items-center justify-center border-2 border-slate-300 z-10 font-bold text-white shadow-md text-[10px] flex-col leading-none`}>
         <span>{elementInfo.icon}</span>
         <span>{card.elementCost || 0}</span>
      </div>

      <div className="text-center font-bold text-sm mb-1 border-b border-white/10 pb-1 truncate text-white tracking-wide mt-1">
        {card.name || 'Unknown'}
      </div>
      
      <div className="flex-grow flex items-center justify-center relative">
        <div className={`text-4xl ${typeTextColor} opacity-80 drop-shadow-md`}>
            {safeType === CardType.ATTACK && (isPierce ? '🏹' : '⚔️')}
            {safeType === CardType.DEFEND && '🛡️'}
            {safeType === CardType.HEAL && '💊'}
            {safeType === CardType.BUFF && '✨'}
            {safeType === CardType.GROWTH && '📈'}
        </div>
        
        {!levelMet && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-red-500 font-bold rotate-12 text-sm border border-red-500 p-1 rounded">
                需 Lv.{card.reqLevel}
            </div>
        )}
      </div>

      <div className="text-xs text-center text-gray-200 leading-tight h-12 overflow-hidden flex items-center justify-center flex-col bg-black/20 rounded p-1">
        {isPierce && <div className="text-[9px] text-amber-400 font-bold mb-0.5">[穿刺] 无视护盾</div>}
        <div>{card.description}</div>
      </div>

      <div className="mt-1 flex justify-between items-center text-[10px] text-white/60 uppercase tracking-widest">
        <span>{safeType}</span>
        <span className={elementInfo.color}>{safeElement}</span>
      </div>
    </div>
  );
};
