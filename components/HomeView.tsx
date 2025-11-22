
import React, { useState } from 'react';
import { Player, Item } from '../types';
import { Button } from './Button';

interface HomeViewProps {
  player: Player;
  onStartAdventure: () => void;
  onEquipItem: (item: Item) => void;
  onEndGame: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ player, onStartAdventure, onEquipItem, onEndGame }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'bag' | 'deck'>('status');

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between bg-slate-800/80 p-4 rounded-lg border border-emerald-700/50 shadow-lg backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={player.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-xs px-2 py-0.5 rounded-full border border-emerald-400 font-bold">
              Lv.{player.level}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-100">{player.name}的洞府</h1>
            <div className="text-sm text-emerald-400/80">境界: 炼气期 {player.level}层</div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-amber-400 font-mono flex items-center gap-1">
            <span className="text-lg">💰</span> {player.gold} 灵石
          </div>
          <div className="text-xs text-slate-400">版本: 0.1.251122</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        {/* Left Panel: Navigation */}
        <div className="md:col-span-1 bg-slate-800/50 rounded-lg border border-slate-700 p-4 flex flex-col gap-3">
          <h2 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-2">洞府功能</h2>
          <Button 
            variant={activeTab === 'status' ? 'primary' : 'secondary'} 
            onClick={() => setActiveTab('status')}
            className="w-full justify-start"
          >
            📊 属性 & 装备
          </Button>
          <Button 
            variant={activeTab === 'bag' ? 'primary' : 'secondary'} 
            onClick={() => setActiveTab('bag')}
            className="w-full justify-start"
          >
            🎒 储物袋 (背包)
          </Button>
          <Button 
            variant={activeTab === 'deck' ? 'primary' : 'secondary'} 
            onClick={() => setActiveTab('deck')}
            className="w-full justify-start"
          >
            🎴 本命卡组
          </Button>
          
          <div className="border-t border-slate-700 my-2"></div>
          
          <Button 
            variant="primary" 
            size="lg" 
            className="w-full h-16 text-xl shadow-emerald-900/50 animate-pulse"
            onClick={onStartAdventure}
          >
            🏔️ 外出历练
          </Button>

          <div className="flex-grow"></div>

          <Button 
            variant="danger" 
            size="md"
            onClick={onEndGame}
            className="w-full mt-4 opacity-80 hover:opacity-100"
          >
            🚪 结束游戏
          </Button>
        </div>

        {/* Right Panel: Content Area */}
        <div className="md:col-span-2 bg-slate-900/80 rounded-lg border border-slate-700 p-6 min-h-[400px] shadow-inner">
          
          {activeTab === 'status' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-emerald-200 border-b border-emerald-800 pb-2">基础属性</h3>
              <div className="grid grid-cols-2 gap-4">
                <StatRow label="生命 (HP)" value={`${player.stats.hp} / ${player.stats.maxHp}`} icon="❤️" />
                <StatRow label="神识 (MP)" value={`${player.stats.spirit} / ${player.stats.maxSpirit}`} icon="🧠" />
                <StatRow label="攻击力" value={player.stats.attack} icon="⚔️" />
                <StatRow label="防御力" value={player.stats.defense} icon="🛡️" />
                <StatRow label="速度" value={player.stats.speed} icon="👟" />
                <StatRow label="经验值" value={`${player.exp} / ${player.maxExp}`} icon="✨" />
              </div>

              <h3 className="text-xl font-bold text-emerald-200 border-b border-emerald-800 pb-2 mt-8">当前装备</h3>
              <div className="grid grid-cols-3 gap-4">
                <EquipSlot label="武器" item={player.equipment.weapon} />
                <EquipSlot label="护甲" item={player.equipment.armor} />
                <EquipSlot label="法宝" item={player.equipment.accessory} />
              </div>
            </div>
          )}

          {activeTab === 'bag' && (
            <div>
              <h3 className="text-xl font-bold text-emerald-200 border-b border-emerald-800 pb-2 mb-4">储物袋</h3>
              {player.inventory.length === 0 ? (
                <div className="text-slate-500 text-center py-10">空空如也...</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {player.inventory.map((item, idx) => (
                    <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-600 flex justify-between items-center">
                      <div>
                        <div className={`font-bold ${item.rarity === 'legendary' ? 'text-amber-400' : 'text-white'}`}>{item.name}</div>
                        <div className="text-xs text-slate-400">{item.description}</div>
                      </div>
                      {item.type === 'EQUIPMENT' && (
                        <Button size="sm" variant="outline" onClick={() => onEquipItem(item)}>装备</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'deck' && (
            <div>
              <h3 className="text-xl font-bold text-emerald-200 border-b border-emerald-800 pb-2 mb-4">本命卡组 ({player.deck.length} 张)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 h-[400px] overflow-y-auto pr-2">
                 {player.deck.map((card, idx) => (
                   <div key={idx} className="bg-slate-800 p-2 rounded border border-slate-600 text-xs">
                     <div className="font-bold text-emerald-300">{card.name}</div>
                     <div className="text-slate-400">{card.description}</div>
                     <div className="mt-1 text-slate-500">消耗: {card.cost} 神识</div>
                   </div>
                 ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value, icon }: { label: string, value: string | number, icon: string }) => (
  <div className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700/50">
    <span className="text-slate-300 flex items-center gap-2">{icon} {label}</span>
    <span className="font-mono font-bold text-emerald-100">{value}</span>
  </div>
);

const EquipSlot = ({ label, item }: { label: string, item: Item | null }) => (
  <div className="aspect-square bg-slate-800 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center p-2 text-center relative group cursor-help">
    <div className="text-xs text-slate-500 uppercase mb-1">{label}</div>
    {item ? (
      <>
        <div className="text-2xl">🗡️</div>
        <div className={`text-sm font-bold ${item.rarity === 'legendary' ? 'text-amber-400' : 'text-white'}`}>{item.name}</div>
        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 bg-black/90 text-xs p-2 rounded border border-slate-500 hidden group-hover:block z-10">
            {item.description}
        </div>
      </>
    ) : (
      <div className="text-slate-600 text-sm">无</div>
    )}
  </div>
);
