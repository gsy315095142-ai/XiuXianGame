
import React, { useEffect, useState, useRef } from 'react';
import { Player, Enemy, Card, CardType, ElementType, Item } from '../types';
import { MAX_HAND_SIZE, DRAW_COUNT_PER_TURN, ELEMENT_CONFIG, generateSkillBook, getRealmName } from '../constants';
import { CardItem } from './CardItem';
import { Button } from './Button';

interface CombatViewProps {
  player: Player;
  enemy: Enemy;
  onWin: (rewards: { exp: number, gold: number, drops: Item[] }, updatedTalismans?: Item[]) => void;
  onLose: () => void;
  cardsConfig: Card[]; // Needed to lookup talisman effects
}

type Turn = 'PLAYER' | 'ENEMY';
type VfxType = 'SLASH' | 'HEAL' | 'SHIELD' | 'BUFF';

interface VisualEffectState {
  id: number;
  type: VfxType;
  target: 'PLAYER' | 'ENEMY';
}

const VisualEffect: React.FC<{ type: VfxType }> = ({ type }) => {
    return (
        <div className={`text-9xl filter drop-shadow-lg opacity-90 ${
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
  const [playerBurn, setPlayerBurn] = useState(0); // Burn Stacks
  
  // Track MAX elements for combat session (for GROWTH cards)
  const [playerMaxElements, setPlayerMaxElements] = useState<Record<ElementType, number>>({...initialPlayer.stats.elementalAffinities});
  // Track CURRENT available elements
  const [playerElements, setPlayerElements] = useState<Record<ElementType, number>>({...initialPlayer.stats.elementalAffinities});
  
  // Talisman Durability Tracking (Local)
  // We need to track durability changes for each specific talisman item ID
  const [talismanState, setTalismanState] = useState<Record<string, number>>({});

  // Inventory (Local copy to track consumables)
  const [combatInventory, setCombatInventory] = useState<Item[]>([...initialPlayer.inventory]);
  const [showBag, setShowBag] = useState(false);

  const [enemyHp, setEnemyHp] = useState(initialEnemy.stats.hp);
  const [enemyBlock, setEnemyBlock] = useState(0);
  const [enemySpirit, setEnemySpirit] = useState(initialEnemy.stats.spirit);
  const [enemyBurn, setEnemyBurn] = useState(0); // Enemy Burn Stacks

  // Enemy elements simplified
  const [enemyElements, setEnemyElements] = useState<Record<ElementType, number>>({...initialEnemy.stats.elementalAffinities});

  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);

  const [turn, setTurn] = useState<Turn>('PLAYER');
  const [combatLog, setCombatLog] = useState<string[]>(['战斗开始!']);

  // UI State for Enemy Move
  const [activeEnemyCard, setActiveEnemyCard] = useState<Card | null>(null);
  
  // VFX State
  const [activeVfx, setActiveVfx] = useState<VisualEffectState | null>(null);

  // Logic Refs (Source of Truth for async sequences)
  const statsRef = useRef({
      playerHp: initialPlayer.stats.hp,
      playerBlock: 0,
      enemyHp: initialEnemy.stats.hp,
      enemyBlock: 0
  });

  const [combatResult, setCombatResult] = useState<{
      win: boolean;
      rewards?: { exp: number; gold: number; drops: Item[] };
  } | null>(null);
  
  const combatEndedRef = useRef(false);
  
  // Define element groups for rendering layout
  const primaryElements = [ElementType.METAL, ElementType.WOOD, ElementType.WATER, ElementType.FIRE, ElementType.EARTH];
  const secondaryElements = [ElementType.LIGHT, ElementType.DARK, ElementType.WIND, ElementType.THUNDER, ElementType.ICE, ElementType.SWORD];

  // Helper to add logs
  const addLog = (msg: string) => {
    setCombatLog(prev => [...prev.slice(-4), msg]);
  };

  // Initialize Combat
  useEffect(() => {
    // Init Deck (Cards + Talismans)
    const baseCards = [...initialPlayer.deck];
    const talismanCards: Card[] = [];
    
    // Init Talisman Durability State
    const initialTalismanState: Record<string, number> = {};

    initialPlayer.talismansInDeck?.forEach(t => {
         const originalCard = cardsConfig.find(c => c.id === t.talismanCardId);
         if (originalCard) {
             initialTalismanState[t.id] = t.durability || 0;
             talismanCards.push({
                 ...originalCard,
                 id: `talisman_${t.id}_${Date.now()}`, // Unique ID for combat flow
                 cost: 0, // Talismans cost 0 spirit
                 elementCost: 0, // Talismans cost 0 element
                 description: `[符箓] ${originalCard.description}`,
                 isTalisman: true,
                 talismanItemId: t.id
             });
         }
    });

    setTalismanState(initialTalismanState);
    
    // Prepare combined deck locally
    const combinedDeck = [...baseCards, ...talismanCards].sort(() => Math.random() - 0.5);

    const pSpeed = initialPlayer.stats.speed;
    const eSpeed = initialEnemy.stats.speed;

    if (pSpeed >= eSpeed) {
      addLog(`你的速度(${pSpeed})快于敌人(${eSpeed})，你先攻！`);
      
      // FIX: Handle Initial Draw Manually to avoid state race condition
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
      setPlayerElements({...initialPlayer.stats.elementalAffinities}); // Reset to initial caps

    } else {
      setDeck(combinedDeck);
      addLog(`敌人速度(${eSpeed})较快，敌人先攻！`);
      setTurn('ENEMY');
      setTimeout(executeEnemyTurn, 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Win/Loss Check
  useEffect(() => {
    if (combatEndedRef.current) return;

    if (enemyHp <= 0) {
      combatEndedRef.current = true;
      addLog('敌人倒下了！胜利！');
      
      // Calculate Rewards Locally
      const drops: Item[] = [];
      // 30% chance to drop Skill Book
      if (Math.random() < 0.3) {
          const elements = Object.values(ElementType);
          const randElem = elements[Math.floor(Math.random() * elements.length)];
          const book = generateSkillBook(initialPlayer.level, randElem);
          drops.push(book);
      }

      const rewards = {
          exp: initialEnemy.dropExp,
          gold: initialEnemy.dropGold,
          drops: drops
      };

      setTimeout(() => {
          setCombatResult({ win: true, rewards });
      }, 1000);
    }

    if (playerHp <= 0) {
      combatEndedRef.current = true;
      addLog('你力竭倒下了...');
      setTimeout(() => {
          setCombatResult({ win: false });
      }, 1000);
    }
  }, [enemyHp, playerHp, initialEnemy, initialPlayer.level]);

  // --- VFX Helper ---
  const triggerVfx = (cardType: CardType, caster: 'PLAYER' | 'ENEMY') => {
      let type: VfxType = 'BUFF';
      let target: 'PLAYER' | 'ENEMY' = caster;

      switch (cardType) {
          case CardType.ATTACK:
              type = 'SLASH';
              target = caster === 'PLAYER' ? 'ENEMY' : 'PLAYER';
              break;
          case CardType.HEAL:
              type = 'HEAL';
              target = caster;
              break;
          case CardType.DEFEND:
              type = 'SHIELD';
              target = caster;
              break;
          case CardType.BUFF:
          case CardType.GROWTH:
              type = 'BUFF';
              target = caster;
              break;
      }

      setActiveVfx({ id: Date.now(), type, target });
      setTimeout(() => setActiveVfx(null), 800); // Clear effect after animation
  };

  // --- Mechanics ---

  // Unified effect resolver
  const resolveCardEffect = (card: Card, source: 'PLAYER' | 'ENEMY') => {
      const isPierce = card.tags?.includes('PIERCE');
      const isBurn = card.tags?.includes('BURN');
      const stats = statsRef.current;

      if (source === 'PLAYER') {
          switch (card.type) {
            case CardType.ATTACK:
                let dmg = Math.max(0, card.value + initialPlayer.stats.attack);
                let blocked = 0;
                if (!isPierce) {
                    blocked = Math.min(dmg, stats.enemyBlock);
                    dmg -= blocked;
                    stats.enemyBlock -= blocked;
                    setEnemyBlock(stats.enemyBlock);
                } else {
                    addLog('>>> 穿刺攻击！无视护盾！');
                }
                stats.enemyHp -= dmg;
                setEnemyHp(stats.enemyHp);
                addLog(`你使用 ${card.name}，造成 ${dmg} 伤害${blocked > 0 ? ` (${blocked} 被格挡)` : ''}`);
                
                // Burn Logic (50% Chance)
                if (isBurn && Math.random() < 0.5) {
                    setEnemyBurn(prev => prev + 1);
                    addLog(`🔥 [灼烧] 触发！敌人获得1层灼烧。`);
                }
                break;
            case CardType.HEAL:
                stats.playerHp = Math.min(initialPlayer.stats.maxHp, stats.playerHp + card.value);
                setPlayerHp(stats.playerHp);
                addLog(`你使用 ${card.name}，恢复 ${card.value} 生命`);
                break;
            case CardType.DEFEND:
                stats.playerBlock += card.value;
                setPlayerBlock(stats.playerBlock);
                addLog(`你使用 ${card.name}，增加 ${card.value} 护盾`);
                break;
            case CardType.BUFF:
                if (card.id === 'c_meditate') {
                    setPlayerSpirit(prev => Math.min(initialPlayer.stats.maxSpirit, prev + card.value));
                    addLog(`你冥想恢复了 ${card.value} 神识`);
                }
                break;
            case CardType.GROWTH:
                setPlayerMaxElements(prev => {
                    const newMax = { ...prev };
                    newMax[card.element] = (newMax[card.element] || 0) + card.value;
                    return newMax;
                });
                setPlayerElements(prev => {
                    const newElems = { ...prev };
                    newElems[card.element] = (newElems[card.element] || 0) + card.value;
                    return newElems;
                });
                addLog(`你运转 ${card.name}，${card.element}属性上限提升 ${card.value} 点！`);
                break;
          }
      } else {
          // Enemy Logic
          switch (card.type) {
            case CardType.ATTACK:
                let dmg = Math.max(0, card.value + initialEnemy.stats.attack);
                let blocked = 0;
                if (!isPierce) {
                     blocked = Math.min(dmg, stats.playerBlock);
                     dmg -= blocked;
                     stats.playerBlock -= blocked;
                     setPlayerBlock(stats.playerBlock);
                } else {
                     addLog('>>> 敌人穿刺攻击！无视你的护盾！');
                }
                stats.playerHp -= dmg;
                setPlayerHp(stats.playerHp);
                addLog(`${initialEnemy.name} 使用 ${card.name}，造成 ${dmg} 伤害${blocked > 0 ? ` (${blocked} 被格挡)` : ''}`);

                // Burn Logic (50% Chance)
                if (isBurn && Math.random() < 0.5) {
                    setPlayerBurn(prev => prev + 1);
                    addLog(`🔥 [灼烧] 触发！你获得了1层灼烧。`);
                }
                break;
            case CardType.HEAL:
                stats.enemyHp = Math.min(initialEnemy.stats.maxHp, stats.enemyHp + card.value);
                setEnemyHp(stats.enemyHp);
                addLog(`${initialEnemy.name} 使用 ${card.name}，恢复 ${card.value} 生命`);
                break;
            case CardType.DEFEND:
                stats.enemyBlock += card.value;
                setEnemyBlock(stats.enemyBlock);
                addLog(`${initialEnemy.name} 使用 ${card.name}，增加 ${card.value} 护盾`);
                break;
            case CardType.BUFF:
                setEnemySpirit(prev => Math.min(initialEnemy.stats.maxSpirit, prev + card.value));
                addLog(`${initialEnemy.name} 恢复了神识`);
                break;
            case CardType.GROWTH:
                addLog(`${initialEnemy.name} 气息暴涨，提升了元素之力！`);
                break;
          }
      }
  }

  const drawCards = (count: number) => {
    let currentDeck = [...deck];
    let currentDiscard = [...discardPile];
    let newHand = [...hand];

    for (let i = 0; i < count; i++) {
      if (currentDeck.length === 0) {
        if (currentDiscard.length === 0) break; 
        currentDeck = [...currentDiscard].sort(() => Math.random() - 0.5);
        currentDiscard = [];
        addLog('洗牌...');
      }
      const card = currentDeck.pop();
      if (card) {
        if (newHand.length < MAX_HAND_SIZE) {
            newHand.push(card);
        } else {
            currentDiscard.push(card);
            addLog('手牌已满，卡牌被丢弃');
        }
      }
    }

    setDeck(currentDeck);
    setDiscardPile(currentDiscard);
    setHand(newHand);
  };

  const startPlayerTurn = () => {
    if (combatEndedRef.current) return;
    setTurn('PLAYER');
    
    // Process Burn Damage on Player Start
    if (playerBurn > 0) {
        const dmg = playerBurn;
        statsRef.current.playerHp -= dmg;
        setPlayerHp(statsRef.current.playerHp);
        addLog(`🔥 灼烧生效！你受到了 ${dmg} 点伤害。`);
        
        // Check death immediately
        if (statsRef.current.playerHp <= 0) {
            combatEndedRef.current = true;
            addLog('你力竭倒下了...');
            setTimeout(() => setCombatResult({ win: false }), 1000);
            return;
        }
    }

    setPlayerSpirit(initialPlayer.stats.maxSpirit); 
    
    // Refill Elements based on CURRENT MAX CAPS (which might have been boosted by GROWTH cards)
    setPlayerElements({...playerMaxElements}); 
    
    // Reset Player Block at start of turn
    statsRef.current.playerBlock = 0;
    setPlayerBlock(0);
    
    drawCards(DRAW_COUNT_PER_TURN); 
  };

  const playCard = (cardIndex: number) => {
    if (turn !== 'PLAYER' || combatEndedRef.current) return;
    const card = hand[cardIndex];

    if (initialPlayer.level < (card.reqLevel || 1)) {
        addLog(`境界不足，无法使用此卡(需Lv.${card.reqLevel})`);
        return;
    }

    // Special handling for Talismans
    if (card.isTalisman && card.talismanItemId) {
         const currentDurability = talismanState[card.talismanItemId] || 0;
         if (currentDurability <= 0) {
             addLog("符箓灵力耗尽，无法激活！");
             // Discard it or remove it? Discard for now so it doesn't block hand
             const newHand = [...hand];
             newHand.splice(cardIndex, 1);
             setHand(newHand);
             return;
         }
         
         // Reduce durability
         setTalismanState(prev => ({...prev, [card.talismanItemId!]: prev[card.talismanItemId!] - 1 }));
         const newDurability = currentDurability - 1;
         
         addLog(`激活符箓 (${newDurability === 0 ? '灵力耗尽' : `剩余耐久 ${newDurability}`})`);
         
         // No spirit/element cost for Talismans
         triggerVfx(card.type, 'PLAYER');
         setTimeout(() => {
             resolveCardEffect(card, 'PLAYER');
         }, 200);

         const newHand = [...hand];
         newHand.splice(cardIndex, 1);
         setHand(newHand);
         
         // If broken, don't return to discard pile? Or return as broken?
         // If broken, effectively removed from deck logic for remainder of combat
         if (newDurability > 0) {
             setDiscardPile(prev => [...prev, card]);
         } else {
             addLog(`${card.name} 碎裂消散了。`);
         }
         return;
    }

    if (playerSpirit < card.cost) {
      addLog('神识不足！');
      return;
    }

    // Check Element Cost
    const currentElemVal = playerElements[card.element] || 0;
    if (currentElemVal < card.elementCost) {
        addLog(`${card.element}属性不足！需要 ${card.elementCost}，当前 ${currentElemVal}`);
        return;
    }

    setPlayerSpirit(prev => prev - card.cost);
    setPlayerElements(prev => ({
        ...prev,
        [card.element]: prev[card.element] - card.elementCost
    }));

    triggerVfx(card.type, 'PLAYER');
    
    // Slight delay for damage number to appear after effect starts
    setTimeout(() => {
        resolveCardEffect(card, 'PLAYER');
    }, 200);

    const newHand = [...hand];
    newHand.splice(cardIndex, 1);
    setHand(newHand);
    setDiscardPile(prev => [...prev, card]);
  };

  const useInventoryItem = (item: Item) => {
      // Logic for old inventory button, mostly superseded by deck talismans but kept for potions if any
      if (turn !== 'PLAYER' || combatEndedRef.current) return;
      
      // ... (Legacy talisman usage code could be removed if purely deck-based now, leaving for compatibility)
      
      setShowBag(false);
  };

  const endTurn = () => {
    if (combatEndedRef.current) return;
    
    // Discard remaining hand
    setDiscardPile(prev => [...prev, ...hand]);
    setHand([]);

    setTurn('ENEMY');
    setShowBag(false); // Close bag on turn end
    setTimeout(executeEnemyTurn, 1000);
  };

  // --- Enemy Mechanics ---

  const executeEnemyTurn = async () => {
    if (combatEndedRef.current || statsRef.current.enemyHp <= 0) return;

    // Process Burn Damage on Enemy Start
    if (enemyBurn > 0) {
        const dmg = enemyBurn;
        statsRef.current.enemyHp -= dmg;
        setEnemyHp(statsRef.current.enemyHp);
        addLog(`🔥 灼烧生效！敌人受到了 ${dmg} 点伤害。`);
        
        // Check death immediately
        if (statsRef.current.enemyHp <= 0) {
             // Death check handled in useEffect, but we should stop execution here
             return; 
        }
    }

    // Reset Enemy Block at start of their turn
    statsRef.current.enemyBlock = 0;
    setEnemyBlock(0);

    setEnemySpirit(initialEnemy.stats.maxSpirit);
    setEnemyElements({...initialEnemy.stats.elementalAffinities});
    
    const enemyDeck = initialEnemy.deck && initialEnemy.deck.length > 0 ? initialEnemy.deck : [];
    
    // Choose actions
    const actionsToPlay: Card[] = [];
    if (enemyDeck.length > 0) {
        let currentSpirit = initialEnemy.stats.maxSpirit; 
        let currentElements = {...initialEnemy.stats.elementalAffinities};
        const maxActions = 2; // AI attempts to play up to 2 cards

        for (let i = 0; i < maxActions; i++) {
            // Filter cards that can be paid for
            const availableCards = enemyDeck.filter(c => 
                c.cost <= currentSpirit && (currentElements[c.element] || 0) >= c.elementCost
            );

            if (availableCards.length > 0) {
                const card = availableCards[Math.floor(Math.random() * availableCards.length)];
                actionsToPlay.push(card);
                currentSpirit -= card.cost;
                currentElements[card.element] -= card.elementCost;
            }
        }
    }

    if (actionsToPlay.length > 0) {
        for (const card of actionsToPlay) {
            if (combatEndedRef.current) break;
            // 1. Show Card
            setActiveEnemyCard(card);
            await new Promise(r => setTimeout(r, 2000)); // Display time: 2 seconds

            // 2. Trigger VFX
            triggerVfx(card.type, 'ENEMY');

            // 3. Resolve Effect
            resolveCardEffect(card, 'ENEMY');
            
            // 4. Hide Card
            setActiveEnemyCard(null);
            await new Promise(r => setTimeout(r, 500)); // Pause between cards
        }
    } else {
        // Fallback Attack
        if (!combatEndedRef.current) {
            // Basic attack visual
            triggerVfx(CardType.ATTACK, 'ENEMY');
            
            setTimeout(() => {
                let dmg = initialEnemy.stats.attack;
                const blockedDmg = Math.min(dmg, statsRef.current.playerBlock);
                dmg -= blockedDmg;
                
                statsRef.current.playerBlock -= blockedDmg;
                setPlayerBlock(statsRef.current.playerBlock);
                
                statsRef.current.playerHp -= dmg;
                setPlayerHp(statsRef.current.playerHp);
                
                addLog(`${initialEnemy.name} 猛扑过来，造成 ${dmg} 伤害!`);
            }, 200);
            
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    startPlayerTurn();
  };

  const handleModalConfirm = () => {
      if (combatResult?.win && combatResult.rewards) {
          // Prepare updated talismans to sync back to App
          const updatedTalismans: Item[] = [];
          
          initialPlayer.talismansInDeck?.forEach(t => {
               const newDur = talismanState[t.id];
               if (newDur !== undefined) {
                   updatedTalismans.push({ ...t, durability: newDur });
               } else {
                   updatedTalismans.push(t);
               }
          });

          onWin(combatResult.rewards, updatedTalismans);
      } else {
          onLose();
      }
  };

  const renderElementBadge = (elem: ElementType, val: number) => {
      const config = ELEMENT_CONFIG[elem];
      return (
          <div key={elem} className={`flex items-center gap-1 px-2 py-0.5 rounded border border-slate-600/50 ${config.bg} ${val === 0 ? 'opacity-40 grayscale' : 'bg-opacity-60'}`} title={`${elem}灵力`}>
              <span className="text-[10px]">{config.icon}</span>
              <span className={`text-xs font-bold ${val > 0 ? config.color : 'text-gray-500'}`}>{val}</span>
          </div>
      );
  };
  
  // Filter items usable in combat (Legacy)
  const combatItems = combatInventory.filter(i => i.type === 'TALISMAN');

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50 overflow-hidden">
        
        {/* VFX Layer */}
        {activeVfx && (
             <div className="absolute inset-0 z-[60] pointer-events-none flex items-center justify-center">
                 <div className={`absolute ${activeVfx.target === 'ENEMY' ? 'top-[20vh]' : 'bottom-[20vh]'}`}>
                     <VisualEffect type={activeVfx.type} />
                 </div>
             </div>
        )}

        {/* Active Enemy Card */}
        {activeEnemyCard && (
            <div className="absolute top-[45vh] left-1/2 -translate-x-1/2 z-[40] pointer-events-none flex flex-col items-center gap-2">
                <div className="transform scale-110 shadow-2xl animate-bounce-slight pointer-events-auto">
                    <CardItem card={activeEnemyCard} isPlayable={false} />
                </div>
                <div className="text-xl font-bold text-red-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] whitespace-nowrap">
                    {initialEnemy.name} 使用了这张卡!
                </div>
            </div>
        )}
        
        {/* Inventory Bag Modal */}
        {showBag && (
            <div className="absolute inset-0 z-[70] bg-black/80 flex items-center justify-center p-8 animate-fade-in">
                <div className="bg-slate-900 border-2 border-slate-600 rounded-xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[80vh] flex flex-col">
                    <button onClick={() => setShowBag(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl">✕</button>
                    <h3 className="text-2xl font-bold text-white mb-4 border-b border-slate-700 pb-2">🎒 战斗物品</h3>
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 p-2 custom-scrollbar">
                        {combatItems.map((item, idx) => (
                            <div key={`${item.id}_${idx}`} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <div className="text-3xl">{item.icon}</div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm text-white truncate">{item.name}</div>
                                        <div className="text-xs text-yellow-400">耐久: {item.durability}/{item.maxDurability}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                                <Button size="sm" onClick={() => useInventoryItem(item)}>使用</Button>
                            </div>
                        ))}
                        {combatItems.length === 0 && (
                            <div className="col-span-3 text-center text-slate-500 py-10">没有可用的战斗物品</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Combat Result Modal */}
        {combatResult && (
            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-slate-900 border-2 border-emerald-600 rounded-xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(5,150,105,0.4)] flex flex-col items-center">
                    <h2 className={`text-4xl font-bold mb-6 ${combatResult.win ? 'text-emerald-400' : 'text-red-500'}`}>
                        {combatResult.win ? '战斗胜利' : '战斗失败'}
                    </h2>
                    
                    {combatResult.win && combatResult.rewards && (
                        <div className="w-full space-y-4 mb-8">
                             <div className="bg-slate-800 p-4 rounded border border-slate-700">
                                <h3 className="text-slate-400 font-bold mb-2 border-b border-slate-600 pb-1">获得奖励</h3>
                                <div className="flex justify-between items-center mb-1">
                                    <span>✨ 修为经验</span>
                                    <span className="font-mono text-emerald-300">+{combatResult.rewards.exp}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>💎 灵石</span>
                                    <span className="font-mono text-yellow-300">+{combatResult.rewards.gold}</span>
                                </div>
                             </div>

                             {combatResult.rewards.drops.length > 0 && (
                                 <div className="bg-slate-800 p-4 rounded border border-slate-700">
                                    <h3 className="text-slate-400 font-bold mb-2 border-b border-slate-600 pb-1">战利品</h3>
                                    <div className="space-y-2">
                                        {combatResult.rewards.drops.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className={`w-8 h-8 flex items-center justify-center rounded bg-slate-700 border border-slate-600 text-xs`}>
                                                    {item.type === 'CONSUMABLE' ? '📚' : item.type === 'TALISMAN_PEN' ? '🖌️' : item.type === 'TALISMAN_PAPER' ? '🟨' : '🎁'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`text-sm font-bold ${item.rarity === 'rare' ? 'text-blue-300' : 'text-white'}`}>{item.name}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                 </div>
                             )}
                        </div>
                    )}

                    {!combatResult.win && (
                        <div className="text-slate-400 mb-8 text-center">
                            你身受重伤，不得不逃回洞府休养生息...<br/>
                            <span className="text-xs text-red-500 mt-2 block">损失了部分当前生命值</span>
                        </div>
                    )}

                    <Button onClick={handleModalConfirm} size="lg" className="w-full">
                        {combatResult.win ? '收入囊中' : '狼狈逃窜'}
                    </Button>
                </div>
            </div>
        )}

        {/* Top: Enemy Area */}
        <div className="h-[40vh] bg-[url('https://picsum.photos/seed/dungeon/1920/600')] bg-cover bg-center relative flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60"></div>
            
            <div className="relative z-10 flex flex-col items-center animate-bounce-slight w-full max-w-md">
                <div className="relative group">
                    <img src={initialEnemy.avatarUrl} className="w-28 h-28 rounded-full border-4 border-red-800 shadow-[0_0_20px_rgba(220,38,38,0.6)] transition-transform group-hover:scale-105" alt="Enemy" />
                    {enemyBlock > 0 && (
                        <div className="absolute -top-2 -right-8 flex items-center text-blue-200 font-bold border border-blue-500 px-2 rounded bg-blue-900/80 z-20 shadow-lg animate-pulse">
                            🛡️ {enemyBlock}
                        </div>
                    )}
                    {enemyBurn > 0 && (
                        <div className="absolute top-8 -right-8 flex items-center text-red-200 font-bold border border-red-500 px-2 rounded bg-red-900/80 z-20 shadow-lg animate-pulse">
                            🔥 {enemyBurn}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-center mt-2 w-full">
                    <h3 className="text-2xl font-bold text-red-200 text-shadow">{initialEnemy.name}</h3>
                    
                    {/* Enemy HP Bar */}
                    <div className="w-full max-w-[300px] h-4 bg-gray-700 rounded-full mt-1 border border-gray-600 overflow-hidden relative shadow-lg">
                        <div 
                            className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" 
                            style={{ width: `${Math.max(0, (enemyHp / initialEnemy.stats.maxHp) * 100)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white text-shadow-sm">
                            {Math.max(0, enemyHp)} / {initialEnemy.stats.maxHp}
                        </span>
                    </div>

                    {/* Enemy Extra Info (Realm, Spirit, Elements) */}
                    <div className="flex flex-wrap justify-center gap-3 mt-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                        <span className="text-xs font-bold text-amber-400">{getRealmName(initialEnemy.level)}</span>
                        <span className="text-xs text-blue-300 font-mono">神识:{enemySpirit}/{initialEnemy.stats.maxSpirit}</span>
                    </div>
                    {/* Enemy Elements (Only > 0) */}
                    <div className="flex gap-1 mt-1 justify-center">
                        {Object.entries(enemyElements).map(([elem, val]) => {
                            const v = val as number;
                            if (v <= 0) return null;
                            const config = ELEMENT_CONFIG[elem as ElementType];
                            return (
                                <div key={elem} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-600/50 ${config.bg} bg-opacity-60" title={`${elem}灵力`}>
                                    <span className="text-[10px]">{config.icon}</span>
                                    <span className={`text-[10px] font-bold ${config.color}`}>{v}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>

        {/* Turn Indicator & Combat Log */}
        <div className="absolute top-[38vh] left-1/2 -translate-x-1/2 z-20 flex items-center">
             <div className={`
                    px-8 py-2 rounded-full font-bold text-lg border-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 flex items-center gap-2 whitespace-nowrap
                    ${turn === 'PLAYER' ? 'bg-emerald-600 border-emerald-400 text-white scale-110' : 'bg-red-900 border-red-700 text-gray-300'}
                `}>
                    {turn === 'PLAYER' ? '🟢 你的回合' : '🔴 敌方回合'}
                    {turn === 'PLAYER' && <Button size="sm" variant="danger" onClick={endTurn} className="ml-4 py-0.5 text-xs">结束</Button>}
             </div>

             {/* Combat Log to the right of the button */}
             <div className="absolute left-full ml-6 w-72 text-left pointer-events-none">
                {combatLog.map((log, i) => (
                    <div key={i} className={`text-sm drop-shadow-md animate-fade-in bg-black/50 p-1.5 mb-1 rounded backdrop-blur-sm border-l-2 ${i === combatLog.length - 1 ? 'text-white border-emerald-400 font-bold scale-105' : 'text-slate-400 border-transparent'}`}>
                        {log}
                    </div>
                ))}
            </div>
        </div>

        {/* Bottom: Player Area */}
        <div className="flex-1 bg-gradient-to-t from-slate-900 to-slate-800 relative overflow-hidden flex flex-col justify-end">
            
            {/* Inventory Button - Absolute Left */}
            <div className="absolute bottom-4 left-4 z-30">
                 <Button onClick={() => setShowBag(true)} className="p-3 rounded-full h-12 w-12 flex items-center justify-center text-2xl shadow-lg border-2 border-slate-500 bg-slate-800" title="物品">
                     🎒
                 </Button>
            </div>

            {/* Hand Cards Area - Middle Lower */}
            <div className="flex-1 flex items-end justify-center pb-52 overflow-hidden z-10 pointer-events-none w-full">
                 <div className="flex gap-3 px-4 pointer-events-auto items-end h-[240px] w-full max-w-[95%] overflow-x-auto no-scrollbar justify-center">
                    {hand.map((card, idx) => (
                        <div key={`${card.id}-${idx}`} className="transform hover:-translate-y-4 transition-transform duration-200 flex-shrink-0 mb-2">
                             <CardItem 
                                card={card} 
                                isPlayable={turn === 'PLAYER' && (card.isTalisman ? true : playerSpirit >= card.cost)}
                                playerLevel={initialPlayer.level}
                                currentElement={playerElements[card.element]}
                                onClick={() => playCard(idx)}
                             />
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats Panel - Bottom Center (Redesigned) */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-full max-w-3xl flex flex-col items-center gap-2 z-20 pointer-events-none">
                
                {/* Avatar & HP - Centered */}
                <div className="flex items-center gap-4 bg-slate-900/90 px-6 py-2 rounded-full border border-slate-600 shadow-xl pointer-events-auto backdrop-blur-md">
                     {/* Avatar + Level */}
                     <div className="relative">
                         <img src={initialPlayer.avatarUrl} className="w-16 h-16 rounded-full border-2 border-emerald-500" alt="Player" />
                         <div className="absolute -bottom-1 -right-1 bg-black text-xs px-1 rounded border border-slate-600 font-bold text-white">
                             Lv.{initialPlayer.level}
                         </div>
                     </div>
                     
                     <div className="flex flex-col gap-1 w-48">
                         <div className="flex justify-between text-xs font-bold text-white">
                             <span>HP</span>
                             <span>{playerHp} / {initialPlayer.stats.maxHp}</span>
                         </div>
                         <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.max(0, (playerHp / initialPlayer.stats.maxHp) * 100)}%` }}></div>
                         </div>
                         
                         <div className="flex justify-between text-xs font-bold text-blue-200 mt-1">
                             <span>神识 (Spirit)</span>
                             <span>{playerSpirit} / {initialPlayer.stats.maxSpirit}</span>
                         </div>
                         <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.max(0, (playerSpirit / initialPlayer.stats.maxSpirit) * 100)}%` }}></div>
                         </div>
                     </div>

                     {playerBlock > 0 && (
                        <div className="flex flex-col items-center justify-center bg-blue-900/80 px-3 py-1 rounded border border-blue-500 animate-pulse">
                            <span className="text-xl">🛡️</span>
                            <span className="text-xs font-bold text-white">{playerBlock}</span>
                        </div>
                     )}
                     {playerBurn > 0 && (
                        <div className="flex flex-col items-center justify-center bg-red-900/80 px-3 py-1 rounded border border-red-500 animate-pulse">
                            <span className="text-xl">🔥</span>
                            <span className="text-xs font-bold text-white">{playerBurn}</span>
                        </div>
                     )}
                </div>

                {/* Elements Bar */}
                <div className="flex gap-2 p-2 bg-black/60 rounded-full backdrop-blur-sm pointer-events-auto overflow-x-auto max-w-full">
                    {primaryElements.map(e => renderElementBadge(e, playerElements[e]))}
                    <div className="w-px h-6 bg-slate-600 mx-1"></div>
                    {secondaryElements.map(e => renderElementBadge(e, playerElements[e]))}
                </div>
            </div>
        </div>
    </div>
  );
};
