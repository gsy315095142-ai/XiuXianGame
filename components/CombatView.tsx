
import React, { useEffect, useState, useRef } from 'react';
import { Player, Enemy, Card, CardType, ElementType, Item } from '../types';
import { MAX_HAND_SIZE, DRAW_COUNT_PER_TURN, ELEMENT_CONFIG, generateSkillBook } from '../constants';
import { CardItem } from './CardItem';
import { Button } from './Button';

interface CombatViewProps {
  player: Player;
  enemy: Enemy;
  onWin: (rewards: { exp: number, gold: number, drops: Item[] }, updatedTalismans?: Item[], updatedArtifacts?: (Item | null)[]) => void;
  onLose: () => void;
  cardsConfig: Card[];
}

type Turn = 'PLAYER' | 'ENEMY';
type VfxType = 'SLASH' | 'HEAL' | 'SHIELD' | 'BUFF';

interface VisualEffectState {
  id: number;
  type: VfxType;
  target: 'PLAYER' | 'ENEMY';
}

const VisualEffect: React.FC<{ type: VfxType, target: 'PLAYER' | 'ENEMY' }> = ({ type, target }) => {
    // Position based on target: Left for Player, Right for Enemy
    const positionClass = target === 'PLAYER' ? 'left-1/4' : 'left-3/4';
    
    return (
        <div className={`text-9xl filter drop-shadow-lg opacity-90 absolute z-50 top-1/3 -translate-y-1/2 -translate-x-1/2 pointer-events-none ${positionClass} ${
            type === 'SLASH' ? 'text-red-500 animate-ping' :
            type === 'HEAL' ? 'text-green-500 animate-bounce' :
            type === 'SHIELD' ? 'text-blue-500 animate-pulse' :
            'text-yellow-400 animate-spin'
        }`}>
            {type === 'SLASH' ? '💥' :
             type === 'HEAL' ? '💚' :
             type === 'SHIELD' ? '🛡️' : '✨'}
        </div>
    );
};

export const CombatView: React.FC<CombatViewProps> = ({ player: initialPlayer, enemy: initialEnemy, onWin, onLose, cardsConfig }) => {
  // Combat State
  const [playerHp, setPlayerHp] = useState(initialPlayer.stats.hp);
  const [playerSpirit, setPlayerSpirit] = useState(initialPlayer.stats.spirit);
  const [playerBlock, setPlayerBlock] = useState(0);
  const [playerMaxElements, setPlayerMaxElements] = useState<Record<ElementType, number>>({...initialPlayer.stats.elementalAffinities});
  const [playerElements, setPlayerElements] = useState<Record<ElementType, number>>({...initialPlayer.stats.elementalAffinities});
  
  // Status Effects
  const [playerBurn, setPlayerBurn] = useState(0);
  const [playerFrostbite, setPlayerFrostbite] = useState(0);
  const [enemyBurn, setEnemyBurn] = useState(0);
  const [enemyFrostbite, setEnemyFrostbite] = useState(0);

  // Talisman & Artifact Durability Tracking (Local)
  const [talismanState, setTalismanState] = useState<Record<string, number>>({});
  const [artifactState, setArtifactState] = useState<Record<string, number>>({});

  const [enemyHp, setEnemyHp] = useState(initialEnemy.stats.hp);
  const [enemyBlock, setEnemyBlock] = useState(0);
  const [enemySpirit, setEnemySpirit] = useState(initialEnemy.stats.spirit);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [enemyElements, setEnemyElements] = useState<Record<ElementType, number>>({...initialEnemy.stats.elementalAffinities});
  
  // Active Cards for Animation
  const [enemyActiveCard, setEnemyActiveCard] = useState<Card | null>(null);
  const [playerActiveCard, setPlayerActiveCard] = useState<Card | null>(null);

  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);

  const [turn, setTurn] = useState<Turn>('PLAYER');
  const [combatLog, setCombatLog] = useState<string[]>(['战斗开始!']);

  const [activeVfx, setActiveVfx] = useState<VisualEffectState | null>(null);
  
  // Victory Modal State
  const [victoryResult, setVictoryResult] = useState<{
      rewards: { exp: number, gold: number, drops: Item[] };
      updatedTalismans?: Item[];
      updatedArtifacts?: (Item | null)[];
  } | null>(null);

  const combatEndedRef = useRef(false);

  const addLog = (msg: string) => {
    setCombatLog(prev => [...prev.slice(-4), msg]);
  };

  const triggerVfx = (cardType: CardType, caster: 'PLAYER' | 'ENEMY') => {
      let type: VfxType = 'BUFF';
      switch (cardType) {
          case CardType.ATTACK: type = 'SLASH'; break;
          case CardType.HEAL: type = 'HEAL'; break;
          case CardType.DEFEND: type = 'SHIELD'; break;
          default: type = 'BUFF';
      }
      // Target is opposite of caster for attacks, self for others
      const target = cardType === CardType.ATTACK 
          ? (caster === 'PLAYER' ? 'ENEMY' : 'PLAYER')
          : caster;

      setActiveVfx({ id: Date.now(), type, target });
      setTimeout(() => setActiveVfx(null), 800); 
  };
  
  // Turn Start Logic
  const startPlayerTurn = () => {
      // 1. Burn/Frostbite Damage
      let damage = 0;
      if (playerBurn > 0) damage += playerBurn;
      if (playerFrostbite > 0) damage += playerFrostbite;
      
      if (damage > 0) {
          setPlayerHp(prev => Math.max(0, prev - damage));
          addLog(`你受到了 ${damage} 点灼烧/冻伤伤害`);
      }

      setPlayerElements({...playerMaxElements});
      setPlayerSpirit(prev => Math.min(initialPlayer.stats.maxSpirit, prev + 1));
      
      // Draw Cards (7)
      const drawCount = DRAW_COUNT_PER_TURN;
      let newHand: Card[] = []; // Clear hand at start of turn
      let currentDeck = [...deck];
      let currentDiscard = [...discardPile];

      for(let i=0; i<drawCount; i++) {
          if (currentDeck.length === 0) {
              if (currentDiscard.length === 0) break;
              currentDeck = [...currentDiscard].sort(() => Math.random() - 0.5);
              currentDiscard = [];
          }
          if (currentDeck.length > 0) {
              newHand.push(currentDeck.pop()!);
          }
      }
      
      setDeck(currentDeck);
      setDiscardPile(currentDiscard);
      setHand(newHand);
      addLog("你的回合！");
  };

  const startEnemyTurnLogic = () => {
       // 1. Burn/Frostbite Damage
      let damage = 0;
      if (enemyBurn > 0) damage += enemyBurn;
      if (enemyFrostbite > 0) damage += enemyFrostbite;
      
      if (damage > 0) {
          setEnemyHp(prev => Math.max(0, prev - damage));
          addLog(`敌人受到了 ${damage} 点灼烧/冻伤伤害`);
      }
  };

  const resolveCardEffect = (card: Card, source: 'PLAYER' | 'ENEMY') => {
      const isPlayer = source === 'PLAYER';
      let val = card.value;

      // Status Application
      const isBurn = card.tags?.includes('BURN');
      const isFrostbite = card.tags?.includes('FROSTBITE');

      if (card.type === CardType.ATTACK) {
          let damage = val;
          // Apply defense
          const targetBlock = isPlayer ? enemyBlock : playerBlock;
          const isPierce = card.tags?.includes('PIERCE');
          
          let actualDamage = damage;
          if (!isPierce) {
              if (targetBlock >= damage) {
                  actualDamage = 0;
                  if (isPlayer) setEnemyBlock(prev => prev - damage);
                  else setPlayerBlock(prev => prev - damage);
              } else {
                  actualDamage = damage - targetBlock;
                  if (isPlayer) setEnemyBlock(0);
                  else setPlayerBlock(0);
              }
          }

          if (isPlayer) {
             setEnemyHp(prev => Math.max(0, prev - actualDamage));
             addLog(`你使用${card.name}，造成 ${actualDamage} 点伤害${isPierce ? '(穿透)' : ''}`);
             
             if (isBurn && Math.random() < 0.5) {
                 setEnemyBurn(prev => prev + 1);
                 addLog("敌人被灼烧了！");
             }
             if (isFrostbite) {
                 setEnemyFrostbite(prev => prev + 1);
                 addLog("敌人被冻伤了！");
             }

          } else {
             setPlayerHp(prev => Math.max(0, prev - actualDamage));
             // addLog(`敌人使用${card.name}，对你造成 ${actualDamage} 点伤害${isPierce ? '(穿透)' : ''}`); 
             // Logic moved to resolve result logging, but we log the action itself earlier now
             if (isBurn && Math.random() < 0.5) {
                 setPlayerBurn(prev => prev + 1);
                 addLog("你被灼烧了！");
             }
             if (isFrostbite) {
                 setPlayerFrostbite(prev => prev + 1);
                 addLog("你被冻伤了！");
             }
          }
      } else if (card.type === CardType.DEFEND) {
          if (isPlayer) {
              setPlayerBlock(prev => prev + val);
              addLog(`你使用${card.name}，获得 ${val} 点护甲`);
          } else {
              setEnemyBlock(prev => prev + val);
              // addLog(`敌人使用${card.name}，获得 ${val} 点护甲`);
          }
      } else if (card.type === CardType.HEAL) {
           if (isPlayer) {
              setPlayerHp(prev => Math.min(initialPlayer.stats.maxHp, prev + val));
              addLog(`你使用${card.name}，恢复 ${val} 点生命`);
          } else {
              setEnemyHp(prev => Math.min(initialEnemy.stats.maxHp, prev + val));
              // addLog(`敌人使用${card.name}，恢复 ${val} 点生命`);
          }
      } else if (card.type === CardType.BUFF) {
           if (isPlayer) {
               setPlayerSpirit(prev => Math.min(initialPlayer.stats.maxSpirit, prev + val));
               addLog(`你使用${card.name}，恢复 ${val} 点神识`);
           }
      } else if (card.type === CardType.GROWTH) {
           if (isPlayer) {
               setPlayerMaxElements(prev => ({...prev, [card.element]: prev[card.element] + val}));
               setPlayerElements(prev => ({...prev, [card.element]: prev[card.element] + val}));
               addLog(`你使用${card.name}，${card.element}属性提升 ${val} 点`);
           }
      }

      triggerVfx(card.type, source);
  };

  const handlePlayerPlayCard = async (card: Card, index: number) => {
      if (turn !== 'PLAYER' || combatEndedRef.current || playerActiveCard) return;
      
      // Cost Check
      if (playerSpirit < card.cost) return; 
      
      // Element Cost Check
      const elemCost = card.elementCost || 0;
      if (elemCost > 0) {
           const currentElem = playerElements[card.element] || 0;
           if (currentElem < elemCost) return;
           setPlayerElements(prev => ({...prev, [card.element]: prev[card.element] - elemCost}));
      }

      setPlayerSpirit(prev => prev - card.cost);
      
      // Handle Talisman/Artifact Durability
      if (card.isTalisman && card.talismanItemId) {
          setTalismanState(prev => {
              const newVal = (prev[card.talismanItemId!] || 0) - 1;
              return { ...prev, [card.talismanItemId!]: newVal };
          });
      }
      if (card.isArtifact && card.artifactId) {
           setArtifactState(prev => {
              const newVal = (prev[card.artifactId!] || 0) - 1;
              return { ...prev, [card.artifactId!]: newVal };
           });
      }

      // 1. Remove from hand visually
      const newHand = [...hand];
      newHand.splice(index, 1);
      setHand(newHand);

      // 2. Show Active Card (Fly In Animation)
      setPlayerActiveCard(card);

      // 3. Wait for fly in
      await new Promise(r => setTimeout(r, 500));

      // 4. Resolve Effect & VFX
      resolveCardEffect(card, 'PLAYER');

      // 5. Wait for display duration
      await new Promise(r => setTimeout(r, 800));

      // 6. Clear Active Card & Add to Discard
      setPlayerActiveCard(null);
      setDiscardPile(prev => [...prev, card]);
  };

  const executeEnemyTurn = async () => {
      if (combatEndedRef.current) return;
      
      startEnemyTurnLogic();
      
      await new Promise(r => setTimeout(r, 1000));
      if (combatEndedRef.current) return;

      const enemyDeck = initialEnemy.deck;
      let playedCard: Card | null = null;

      if (enemyDeck && enemyDeck.length > 0) {
          playedCard = enemyDeck[Math.floor(Math.random() * enemyDeck.length)];
          setEnemyActiveCard(playedCard);
          addLog(`敌人打出了【${playedCard.name}】`);
          
          // Wait 2 seconds showing card
          await new Promise(r => setTimeout(r, 2000));
          setEnemyActiveCard(null);

          resolveCardEffect(playedCard, 'ENEMY');
      } else {
          // Fallback basic attack
          setPlayerHp(prev => Math.max(0, prev - initialEnemy.stats.attack));
          addLog(`敌人攻击，造成 ${initialEnemy.stats.attack} 点伤害`);
          triggerVfx(CardType.ATTACK, 'ENEMY');
      }
      
      await new Promise(r => setTimeout(r, 1000));
      if (combatEndedRef.current) return;

      // End Enemy Turn
      setTurn('PLAYER');
      setPlayerBlock(0);
      
      // Player Turn Start
      startPlayerTurn();
  };

  useEffect(() => {
      if (turn === 'ENEMY' && !combatEndedRef.current) {
          executeEnemyTurn();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn]);

  useEffect(() => {
    // Init Deck (Cards + Talismans + Artifacts)
    const baseCards = [...initialPlayer.deck];
    const talismanCards: Card[] = [];
    const artifactCards: Card[] = [];
    
    // Init Talisman Durability State
    const initialTalismanState: Record<string, number> = {};
    initialPlayer.talismansInDeck?.forEach(t => {
         const originalCard = cardsConfig.find(c => c.id === t.talismanCardId);
         if (originalCard) {
             initialTalismanState[t.id] = t.durability || 0;
             talismanCards.push({
                 ...originalCard,
                 id: `talisman_${t.id}_${Date.now()}`, 
                 cost: 0, 
                 elementCost: 0, 
                 description: `[符箓] ${originalCard.description}`,
                 isTalisman: true,
                 talismanItemId: t.id,
                 name: `[符]${originalCard.name}`
             });
         }
    });

    // Init Artifact State & Cards
    const initialArtifactState: Record<string, number> = {};
    initialPlayer.artifacts.forEach(art => {
        if (!art) return;
        initialArtifactState[art.id] = art.durability || 0;
        
        if (art.combatEffect && (art.durability || 0) > 0) {
             artifactCards.push({
                 id: `art_card_${art.id}_${Date.now()}`,
                 name: `[宝]${art.name}`,
                 cost: art.combatEffect.cost,
                 element: art.combatEffect.element,
                 elementCost: art.combatEffect.elementCost,
                 type: art.combatEffect.type,
                 value: art.combatEffect.value,
                 description: art.combatEffect.description,
                 rarity: 'epic',
                 reqLevel: art.reqLevel,
                 isArtifact: true,
                 artifactId: art.id
             });
        }
    });

    setTalismanState(initialTalismanState);
    setArtifactState(initialArtifactState);
    
    const combinedDeck = [...baseCards, ...talismanCards, ...artifactCards].sort(() => Math.random() - 0.5);

    const pSpeed = initialPlayer.stats.speed;
    const eSpeed = initialEnemy.stats.speed;

    if (pSpeed >= eSpeed) {
      addLog(`你的速度(${pSpeed})快于敌人(${eSpeed})，你先攻！`);
      
      const initialHand: Card[] = [];
      const remainingDeck = [...combinedDeck];
      
      for (let i = 0; i < DRAW_COUNT_PER_TURN; i++) {
          if (remainingDeck.length > 0) {
              initialHand.push(remainingDeck.pop()!);
          }
      }
      
      setDeck(remainingDeck);
      setHand(initialHand);
      setTurn('PLAYER');
      setPlayerSpirit(initialPlayer.stats.maxSpirit);
      setPlayerElements({...initialPlayer.stats.elementalAffinities});

    } else {
      setDeck(combinedDeck);
      addLog(`敌人速度(${eSpeed})较快，敌人先攻！`);
      setTurn('ENEMY');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndTurn = () => {
      if (turn !== 'PLAYER') return;
      setTurn('ENEMY');
      setEnemyBlock(0); 
      // Discard remaining hand
      setDiscardPile(prev => [...prev, ...hand]);
      setHand([]);
  };

  useEffect(() => {
    if (combatEndedRef.current) return;

    if (enemyHp <= 0) {
      combatEndedRef.current = true;
      addLog('敌人倒下了！胜利！');
      
      const drops: Item[] = [];
      if (Math.random() < 0.3) {
          const elements = Object.values(ElementType);
          const randElem = elements[Math.floor(Math.random() * elements.length)];
          const book = generateSkillBook(initialPlayer.level, randElem);
          drops.push(book);
      }

      const updatedTalismans = initialPlayer.talismansInDeck?.map(t => ({
          ...t,
          durability: talismanState[t.id] ?? t.durability
      }));

      const updatedArtifacts = initialPlayer.artifacts.map(a => {
          if(!a) return null;
          const newDur = artifactState[a.id] ?? a.durability;
          if (newDur <= 0) return null; 
          return { ...a, durability: newDur };
      });

      const rewards = {
          exp: initialEnemy.dropExp,
          gold: initialEnemy.dropGold,
          drops: drops
      };

      // Delay to show log then set Victory Result to trigger Modal
      setTimeout(() => {
          setVictoryResult({
              rewards,
              updatedTalismans,
              updatedArtifacts
          });
      }, 1000);

    } else if (playerHp <= 0) {
      combatEndedRef.current = true;
      addLog('你力竭倒下了...');
      setTimeout(() => {
          onLose();
      }, 1500);
    }
  }, [enemyHp, playerHp, initialEnemy, initialPlayer, talismanState, artifactState]);

  // UI Split Helpers
  const primaryElements = [ElementType.METAL, ElementType.WOOD, ElementType.WATER, ElementType.FIRE, ElementType.EARTH];
  const secondaryElements = [ElementType.LIGHT, ElementType.DARK, ElementType.WIND, ElementType.THUNDER, ElementType.ICE, ElementType.SWORD];

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden relative select-none">
        {activeVfx && <VisualEffect type={activeVfx.type} target={activeVfx.target} />}

        {/* Victory Modal */}
        {victoryResult && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                <div className="bg-slate-900 border-2 border-yellow-500 rounded-xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(234,179,8,0.3)] flex flex-col gap-6 items-center transform scale-100 hover:scale-105 transition-transform duration-300">
                    <div className="text-6xl animate-bounce">🏆</div>
                    <h3 className="text-3xl font-bold text-yellow-400 tracking-wider">战斗胜利</h3>
                    
                    <div className="w-full space-y-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex justify-between text-lg items-center">
                            <span className="text-slate-400">获得修为</span>
                            <span className="text-emerald-400 font-bold text-xl">+{victoryResult.rewards.exp}</span>
                        </div>
                        <div className="flex justify-between text-lg items-center">
                            <span className="text-slate-400">获得灵石</span>
                            <span className="text-yellow-400 font-bold text-xl">+{victoryResult.rewards.gold}</span>
                        </div>
                    </div>

                    {victoryResult.rewards.drops.length > 0 && (
                        <div className="w-full">
                            <div className="text-xs text-slate-500 mb-2 text-center uppercase tracking-widest">战利品</div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {victoryResult.rewards.drops.map((item, idx) => (
                                    <div key={idx} className="bg-slate-800 border border-slate-600 px-3 py-2 rounded flex items-center gap-2 shadow-sm animate-fade-in-up" style={{animationDelay: `${idx * 100}ms`}}>
                                        <span className="text-xl">{item.icon}</span>
                                        <span className={`text-sm font-bold ${item.rarity === 'legendary' ? 'text-amber-400' : item.rarity === 'epic' ? 'text-purple-400' : item.rarity === 'rare' ? 'text-blue-300' : 'text-white'}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button 
                        size="lg" 
                        variant="primary" 
                        className="w-full py-4 text-xl font-bold mt-2 shadow-lg border-yellow-600 bg-yellow-700 hover:bg-yellow-600 text-yellow-50"
                        onClick={() => onWin(victoryResult.rewards, victoryResult.updatedTalismans, victoryResult.updatedArtifacts)}
                    >
                        收入囊中
                    </Button>
                </div>
            </div>
        )}

        {/* TOP AREA: BATTLEFIELD */}
        <div className="flex-1 flex items-center relative p-6 bg-[url('https://picsum.photos/seed/battle_bg/1920/1080')] bg-cover bg-center">
             {/* Overlay */}
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
             
             {/* LEFT: PLAYER INFO */}
             <div className="relative z-10 w-1/3 h-full flex flex-col items-center justify-center gap-6 border-r border-slate-700/30 pr-8">
                 <div className="relative">
                    <img src={initialPlayer.avatarUrl} className="w-32 h-32 rounded-full border-4 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" alt="Player" />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-800 text-emerald-300 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500 whitespace-nowrap">
                        {initialPlayer.name}
                    </div>
                 </div>

                 <div className="w-full space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                     <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                         <span>生命</span>
                         <span className="text-red-400">{playerHp} / {initialPlayer.stats.maxHp}</span>
                     </div>
                     <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                         <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(playerHp / initialPlayer.stats.maxHp) * 100}%` }}></div>
                     </div>
                     
                     <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                         <span>神识</span>
                         <span className="text-blue-400">{playerSpirit} / {initialPlayer.stats.maxSpirit}</span>
                     </div>
                     <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                         <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(playerSpirit / initialPlayer.stats.maxSpirit) * 100}%` }}></div>
                     </div>
                     
                     {/* Player Elements - Moved Here */}
                     <div className="mt-2 grid grid-cols-5 gap-1">
                         {primaryElements.map((elem) => {
                             const val = playerElements[elem] || 0;
                             const config = ELEMENT_CONFIG[elem];
                             return (
                                 <div key={elem} className={`flex flex-col items-center justify-center p-1 rounded border border-slate-700/50 bg-slate-800 ${val === 0 ? 'opacity-40' : 'opacity-100'}`}>
                                     <span className="text-sm">{config.icon}</span>
                                     <span className={`text-[10px] font-bold ${config.color}`}>{val}</span>
                                 </div>
                             );
                         })}
                         {secondaryElements.map((elem) => {
                             const val = playerElements[elem] || 0;
                             const config = ELEMENT_CONFIG[elem];
                             return (
                                 <div key={elem} className={`flex flex-col items-center justify-center p-1 rounded border border-slate-700/50 bg-slate-800 ${val === 0 ? 'opacity-40' : 'opacity-100'}`}>
                                     <span className="text-sm">{config.icon}</span>
                                     <span className={`text-[10px] font-bold ${config.color}`}>{val}</span>
                                 </div>
                             );
                         })}
                     </div>
                 </div>

                 {/* Player Status Icons */}
                 <div className="flex gap-2 min-h-[32px]">
                     {playerBlock > 0 && (
                         <div className="bg-blue-600/80 text-white px-2 py-1 rounded-full text-xs font-bold border border-blue-400 flex items-center gap-1 shadow-lg">
                             🛡️ {playerBlock}
                         </div>
                     )}
                     {playerBurn > 0 && (
                         <div className="bg-red-600/80 text-white px-2 py-1 rounded-full text-xs font-bold border border-red-400 flex items-center gap-1 shadow-lg animate-pulse">
                             🔥 {playerBurn}
                         </div>
                     )}
                     {playerFrostbite > 0 && (
                         <div className="bg-cyan-600/80 text-white px-2 py-1 rounded-full text-xs font-bold border border-cyan-400 flex items-center gap-1 shadow-lg animate-pulse">
                             ❄️ {playerFrostbite}
                         </div>
                     )}
                 </div>
             </div>

             {/* CENTER: ACTION AREA */}
             <div className="relative z-10 flex-1 h-full flex flex-col items-center justify-center gap-8">
                  {/* Enemy Active Card Display */}
                  <div className="h-48 w-32 flex items-center justify-center relative absolute top-[45vh]">
                      {enemyActiveCard && (
                          <div className="scale-125 transition-all duration-300 animate-bounce-slight z-50">
                              <CardItem card={enemyActiveCard} isPlayable={false} disableHoverEffect={true} />
                          </div>
                      )}
                  </div>

                  {/* Player Active Card Display (Animation) - Updated Position */}
                   <div className="h-48 w-32 flex items-center justify-center absolute top-[35%] -translate-y-1/2">
                      {playerActiveCard && (
                          <div className="scale-125 transition-all duration-500 animate-fade-in z-50 transform translate-y-0">
                              <CardItem card={playerActiveCard} isPlayable={false} disableHoverEffect={true} />
                          </div>
                      )}
                  </div>
             </div>

             {/* RIGHT: ENEMY INFO */}
             <div className="relative z-10 w-1/3 h-full flex flex-col items-center justify-center gap-6 border-l border-slate-700/30 pl-8">
                 <div className="relative">
                    <img src={initialEnemy.avatarUrl || 'https://via.placeholder.com/150'} className="w-32 h-32 rounded-full border-4 border-red-500 shadow-[0_0_20px_red]" alt="Enemy" />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-800 text-red-300 px-3 py-1 rounded-full text-sm font-bold border border-red-500 whitespace-nowrap">
                        {initialEnemy.name} <span className="text-xs text-white ml-1">Lv.{initialEnemy.level}</span>
                    </div>
                 </div>

                 <div className="w-full space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                     <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                         <span>生命</span>
                         <span className="text-red-400">{enemyHp} / {initialEnemy.stats.maxHp}</span>
                     </div>
                     <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                         <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(enemyHp / initialEnemy.stats.maxHp) * 100}%` }}></div>
                     </div>
                     
                     {/* Enemy Spirit Bar */}
                     <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                         <span>神识</span>
                         <span className="text-blue-400">{enemySpirit} / {initialEnemy.stats.maxSpirit}</span>
                     </div>
                     <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600 mb-2">
                         <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(enemySpirit / initialEnemy.stats.maxSpirit) * 100}%` }}></div>
                     </div>

                     {/* Enemy Elements - Grid Display */}
                     <div className="mt-2 grid grid-cols-5 gap-1">
                         {primaryElements.map((elem) => {
                             const val = enemyElements[elem] || 0;
                             const config = ELEMENT_CONFIG[elem];
                             return (
                                 <div key={elem} className={`flex flex-col items-center justify-center p-1 rounded border border-slate-700/50 bg-slate-800 ${val === 0 ? 'opacity-40' : 'opacity-100'}`}>
                                     <span className="text-sm">{config.icon}</span>
                                     <span className={`text-[10px] font-bold ${config.color}`}>{val}</span>
                                 </div>
                             );
                         })}
                         {secondaryElements.map((elem) => {
                             const val = enemyElements[elem] || 0;
                             const config = ELEMENT_CONFIG[elem];
                             return (
                                 <div key={elem} className={`flex flex-col items-center justify-center p-1 rounded border border-slate-700/50 bg-slate-800 ${val === 0 ? 'opacity-40' : 'opacity-100'}`}>
                                     <span className="text-sm">{config.icon}</span>
                                     <span className={`text-[10px] font-bold ${config.color}`}>{val}</span>
                                 </div>
                             );
                         })}
                     </div>
                 </div>

                 {/* Enemy Status Icons */}
                 <div className="flex gap-2 min-h-[32px] flex-wrap justify-center">
                     {enemyBlock > 0 && (
                         <div className="bg-blue-600/80 text-white px-2 py-1 rounded-full text-xs font-bold border border-blue-400 flex items-center gap-1 shadow-lg">
                             🛡️ {enemyBlock}
                         </div>
                     )}
                     {enemyBurn > 0 && (
                         <div className="bg-red-600/80 text-white px-2 py-1 rounded-full text-xs font-bold border border-red-400 flex items-center gap-1 shadow-lg animate-pulse">
                             🔥 {enemyBurn}
                         </div>
                     )}
                     {enemyFrostbite > 0 && (
                         <div className="bg-cyan-600/80 text-white px-2 py-1 rounded-full text-xs font-bold border border-cyan-400 flex items-center gap-1 shadow-lg animate-pulse">
                             ❄️ {enemyFrostbite}
                         </div>
                     )}
                 </div>
             </div>
        </div>

        {/* BOTTOM AREA: HAND & CONTROLS - Updated Padding and Overflow */}
        <div className="h-[45vh] bg-slate-950 border-t border-slate-700 flex flex-col relative pt-4">
             {/* Controls Container - Absolute Top Right of Bottom Section */}
             <div className="absolute top-6 right-8 z-40 flex flex-col items-end gap-3 w-72 pointer-events-auto">
                 {/* Deck Info */}
                 <div className="text-xs text-slate-500 font-bold bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
                     牌库: {deck.length} | 弃牌: {discardPile.length}
                 </div>

                 {/* Combat Log */}
                 <div className="w-full h-32 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-600 p-2 overflow-hidden flex flex-col justify-end shadow-xl">
                    {combatLog.map((log, i) => (
                        <div key={i} className={`text-sm py-0.5 px-2 text-left ${i === combatLog.length - 1 ? 'text-white font-bold text-base' : 'text-slate-400'}`}>
                            {log}
                        </div>
                    ))}
                 </div>

                 {/* Turn Button */}
                 <Button 
                    variant={turn === 'PLAYER' ? 'primary' : 'secondary'}
                    size="lg"
                    disabled={turn !== 'PLAYER' || !!playerActiveCard}
                    onClick={handleEndTurn}
                    className={`w-full py-4 text-xl font-bold shadow-2xl transition-all ${turn === 'PLAYER' ? 'scale-105 border-emerald-400 ring-2 ring-emerald-500/50' : 'opacity-50 grayscale'}`}
                 >
                    {turn === 'PLAYER' ? '结束回合' : '敌人回合'}
                 </Button>
            </div>

             {/* Hand Cards */}
             <div className="flex-1 flex justify-center items-end gap-3 overflow-x-auto overflow-y-visible pb-8 pt-32 px-4">
                 {hand.map((card, idx) => (
                     <div key={`${card.id}_${idx}`} className="relative transition-all hover:-translate-y-8 hover:scale-110 z-10 hover:z-50 shrink-0">
                         <CardItem 
                            card={card} 
                            isPlayable={turn === 'PLAYER' && !playerActiveCard}
                            playerLevel={initialPlayer.level}
                            currentElement={playerElements[card.element]}
                            disabled={playerSpirit < card.cost}
                            onClick={() => handlePlayerPlayCard(card, idx)}
                         />
                         {(card.isTalisman && card.talismanItemId) && (
                             <div className="absolute top-0 right-0 bg-yellow-600 text-white text-[10px] px-1 rounded-bl shadow-md z-20">
                                 {talismanState[card.talismanItemId]}
                             </div>
                         )}
                         {(card.isArtifact && card.artifactId) && (
                             <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] px-1 rounded-bl shadow-md z-20">
                                 {artifactState[card.artifactId]}
                             </div>
                         )}
                     </div>
                 ))}
                 {hand.length === 0 && <div className="text-slate-500 mb-20 text-xl font-bold">手牌为空</div>}
             </div>
        </div>
    </div>
  );
};
