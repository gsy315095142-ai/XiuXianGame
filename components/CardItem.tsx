

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
  
  const typeColors = {
    [CardType.ATTACK]: 'border-red-500/50 bg-gradient-to-b from-red-900/80 to-slate-900',
    [CardType.DEFEND]: 'border-blue-500/50 bg-gradient-to-b from-blue-900/80 to-slate-900',
    [CardType.HEAL]: 'border-green-500/50 bg-gradient-to-b from-green-900/80 to-slate-900',
    [CardType.BUFF]: 'border-amber-500/50 bg-gradient-to-b from-amber-900/80 to-slate-900',
    [CardType.GROWTH]: 'border-purple-500/50 bg-gradient-to-b from-purple-900/80 to-slate-900',
  };

  const textColor = {
    [CardType.ATTACK]: 'text-red-200',
    [CardType.DEFEND]: 'text-blue-200',
    [CardType.HEAL]: 'text-green-200',
    [CardType.BUFF]: 'text-amber-200',
    [CardType.GROWTH]: 'text-purple-200',
  };

  const levelMet = playerLevel ? playerLevel >= card.reqLevel : true;
  // If currentElement is passed, check it. If not, assume true (for deck view)
  const elementMet = currentElement !== undefined ? currentElement >= card.elementCost : true;

  const isDisabled = disabled || !levelMet || !elementMet;
  const isPierce = card.tags?.includes('PIERCE');

  const elementInfo = ELEMENT_CONFIG[card.element] || ELEMENT_CONFIG[ElementType.SWORD];

  return (
    <div 
      onClick={!isDisabled && isPlayable ? onClick : undefined}
      className={`
        relative w-32 h-48 border-2 rounded-xl p-2 flex flex-col select-none transition-transform duration-200
        ${typeColors[card.type]}
        ${isDisabled ? 'opacity-40 cursor-not-allowed scale-95 grayscale-[0.5]' : 'cursor-pointer hover:-translate-y-4 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] shadow-lg'}
        ${!isPlayable && !isDisabled ? 'opacity-70' : ''}
      `}
    >
      {/* Cost Badge (Spirit) */}
      <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-slate-300 z-10 font-bold text-white shadow-md text-sm">
        {card.cost}
      </div>

      {/* Element Badge */}
      <div className={`absolute -top-2 -right-2 w-8 h-8 ${elementInfo.bg} rounded-full flex items-center justify-center border-2 border-slate-300 z-10 font-bold text-white shadow-md text-[10px] flex-col leading-none`}>
         <span>{elementInfo.icon}</span>
         <span>{card.elementCost}</span>
      </div>

      <div className="text-center font-bold text-sm mb-1 border-b border-white/10 pb-1 truncate text-white tracking-wide mt-1">
        {card.name}
      </div>
      
      <div className="flex-grow flex items-center justify-center relative">
        <div className={`text-4xl ${textColor[card.type]} opacity-80`}>
            {card.type === CardType.ATTACK && (isPierce ? '🏹' : '⚔️')}
            {card.type === CardType.DEFEND && '🛡️'}
            {card.type === CardType.HEAL && '💊'}
            {card.type === CardType.BUFF && '✨'}
            {card.type === CardType.GROWTH && '📈'}
        </div>
        
        {!levelMet && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-red-500 font-bold rotate-12 text-sm border border-red-500 p-1 rounded">
                需 Lv.{card.reqLevel}
            </div>
        )}
      </div>

      <div className="text-xs text-center text-gray-300 leading-tight h-12 overflow-hidden flex items-center justify-center flex-col">
        {isPierce && <div className="text-[9px] text-amber-400 font-bold mb-0.5">[穿刺] 无视护盾</div>}
        <div>{card.description}</div>
      </div>

      <div className="mt-1 flex justify-between items-center text-[10px] text-white/40 uppercase tracking-widest">
        <span>{card.type}</span>
        <span className={elementInfo.color}>{card.element}</span>
      </div>
    </div>
  );
};