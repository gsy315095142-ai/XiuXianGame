
import React from 'react';
import { MapNode, NodeType } from '../types';
import { Button } from './Button';

interface AdventureViewProps {
  mapNodes: MapNode[];
  currentLocationId: number | null;
  onNodeClick: (node: MapNode) => void;
  onRetreat: () => void;
}

export const AdventureView: React.FC<AdventureViewProps> = ({ mapNodes, currentLocationId, onNodeClick, onRetreat }) => {
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[url('https://picsum.photos/seed/mountains/1920/1080')] bg-cover bg-center relative">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>

      <div className="relative z-10 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-emerald-100 drop-shadow-lg tracking-widest">秘境探险</h2>
            <Button variant="danger" onClick={onRetreat}>🏃‍♂️ 撤退回府</Button>
        </div>

        <div className="bg-black/40 p-8 rounded-2xl border-2 border-emerald-800/50 backdrop-blur-md shadow-2xl">
            <div className="grid grid-cols-4 gap-4 sm:gap-6">
            {mapNodes.map((node) => {
                const isCurrent = node.id === currentLocationId;
                // Simple adjacency logic for demo: Can click any visited or adjacent node
                // But for "Preview" logic, maybe we allow clicking any node to see what's there?
                // Usually games restrict movement. Let's keep restriction but use the new handler.
                const isAvailable = !node.visited && (currentLocationId === null || Math.abs(node.id - currentLocationId) <= 1); 

                let icon = '❓';
                let bgClass = 'bg-slate-700 border-slate-600';

                if (node.visited) {
                    icon = '👣';
                    bgClass = 'bg-slate-800/50 border-slate-700 opacity-50';
                } else if (node.type === NodeType.BOSS) {
                    icon = '👿';
                    bgClass = 'bg-red-900/80 border-red-500 animate-pulse';
                } else if (node.type === NodeType.TREASURE) {
                    // Usually hidden until visited, but for debug/demo logic we might show hints
                    // icon = '❓'; 
                }

                return (
                <button
                    key={node.id}
                    onClick={() => isAvailable ? onNodeClick(node) : null}
                    disabled={node.visited || !isAvailable}
                    className={`
                        aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-300
                        ${bgClass}
                        ${isCurrent ? 'ring-4 ring-emerald-400 scale-110 z-10 bg-emerald-900' : ''}
                        ${isAvailable && !isCurrent ? 'hover:scale-105 hover:border-emerald-400 cursor-pointer' : ''}
                        ${!isAvailable && !isCurrent ? 'cursor-not-allowed opacity-30' : ''}
                        ${node.visited ? 'cursor-default' : ''}
                    `}
                >
                    <span className="text-2xl sm:text-3xl">{isCurrent ? '🧘' : icon}</span>
                    <span className="text-[10px] mt-1 text-slate-300">
                        {node.visited ? '已探索' : `区域 ${node.id + 1}`}
                    </span>
                </button>
                );
            })}
            </div>
        </div>
        
        <div className="mt-6 text-center text-slate-400 text-sm bg-black/50 p-2 rounded">
            点击 <span className="text-white font-bold">❓</span> 区域进行探索。可能会遇到敌人或宝藏。
        </div>
      </div>
    </div>
  );
};
