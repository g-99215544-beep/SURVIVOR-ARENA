import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './services/GameEngine';
import { Joystick } from './components/Joystick';
import { CONFIG, POWERUPS } from './constants';
import { GameStats, PersistentData } from './types';
import { soundManager } from './services/SoundManager';

const DEFAULT_PERSISTENCE: PersistentData = {
  lifetimeCoins: 0,
  upgrades: { damage: 0, maxHp: 0, defense: 0 }
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'levelup' | 'shop' | 'gameover'>('menu');
  
  // Game Stats for UI
  const [stats, setStats] = useState<GameStats>({
      hp: 100, maxHp: 100, xp: 0, xpToLevel: 100, level: 1, 
      coins: 0, wave: 1, time: 0, kills: 0, fps: 60
  });

  const [persistentData, setPersistentData] = useState<PersistentData>(DEFAULT_PERSISTENCE);
  const [upgradeOptions, setUpgradeOptions] = useState<string[]>([]);
  const [runResults, setRunResults] = useState<any>(null);

  // Load Data
  useEffect(() => {
    const saved = localStorage.getItem('survivor_data');
    if (saved) {
        setPersistentData(JSON.parse(saved));
    }
  }, []);

  // Save Data
  useEffect(() => {
    if (persistentData.lifetimeCoins > 0 || persistentData.upgrades.damage > 0) {
        localStorage.setItem('survivor_data', JSON.stringify(persistentData));
    }
  }, [persistentData]);

  // Init Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new GameEngine(canvasRef.current, persistentData);
    engineRef.current = engine;

    engine.onStateUpdate = (s) => setStats(s);
    engine.onLevelUp = (opts) => {
        setUpgradeOptions(opts);
        setGameState('levelup');
    };
    engine.onGameOver = (results) => {
        setRunResults(results);
        // Consolidate coins
        setPersistentData(prev => ({
            ...prev,
            lifetimeCoins: prev.lifetimeCoins + results.coins
        }));
        setGameState('gameover');
    };
    engine.onWaveComplete = (wave) => {
        // Optional: show wave toast
    };

    return () => {
        engine.cleanup();
    };
  }, []); // Run once on mount, engine internally handles resize/reset

  // Effect to update engine data when persistent data changes (mainly for shop)
  useEffect(() => {
      // Re-instantiating engine on every upgrade is expensive, 
      // but simpler for this prototype than syncing shop state.
      // However, engine reads persistent data by reference or constructor.
      // Since we only change shop in 'menu' or 'shop' state, it's fine.
      if (engineRef.current && gameState === 'menu') {
          // Re-create engine to ensure clean state with new upgrades
          engineRef.current.cleanup();
          const engine = new GameEngine(canvasRef.current!, persistentData);
          engineRef.current = engine;
          // Re-bind
          engine.onStateUpdate = (s) => setStats(s);
          engine.onLevelUp = (opts) => { setUpgradeOptions(opts); setGameState('levelup'); };
          engine.onGameOver = (results) => {
             setRunResults(results);
             setPersistentData(prev => ({ ...prev, lifetimeCoins: prev.lifetimeCoins + results.coins }));
             setGameState('gameover');
          };
      }
  }, [persistentData, gameState]);


  const startGame = () => {
    soundManager.init();
    if (engineRef.current) {
        engineRef.current.start();
        // Explicitly set state to playing since start() now equips a weapon instead of showing level up selection
        setGameState('playing');
    }
  };

  const handleJoystick = (x: number, y: number) => {
    if (engineRef.current) {
        engineRef.current.input.dx = x;
        engineRef.current.input.dy = y;
        engineRef.current.input.isActive = (x !== 0 || y !== 0);
    }
  };

  const selectUpgrade = (id: string) => {
      engineRef.current?.upgradePowerup(id);
      setGameState('playing');
  };
  
  const buyShopItem = (key: 'damage' | 'maxHp' | 'defense') => {
      const level = persistentData.upgrades[key];
      const cost = CONFIG.UPGRADE_COSTS[key][level];
      if (level < 5 && persistentData.lifetimeCoins >= cost) {
          setPersistentData(prev => ({
              ...prev,
              lifetimeCoins: prev.lifetimeCoins - cost,
              upgrades: {
                  ...prev.upgrades,
                  [key]: prev.upgrades[key] + 1
              }
          }));
          soundManager.play('coin');
      }
  };

  // --- RENDER HELPERS ---

  const renderHUD = () => (
      <div className="absolute top-0 left-0 w-full p-4 pointer-events-none z-20 flex flex-col gap-2">
          {/* Top Bar */}
          <div className="flex justify-between items-start">
              {/* HP & XP */}
              <div className="flex flex-col gap-1 w-64">
                  {/* HP */}
                  <div className="h-6 bg-black/60 border border-white/20 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300" 
                        style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }} 
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                          {Math.ceil(stats.hp)} / {Math.ceil(stats.maxHp)}
                      </span>
                  </div>
                  {/* XP */}
                  <div className="h-4 bg-black/60 border border-white/20 rounded-full overflow-hidden relative">
                       <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300" 
                        style={{ width: `${(stats.xp / stats.xpToLevel) * 100}%` }} 
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                          LVL {stats.level}
                      </span>
                  </div>
              </div>
              
              {/* Stats */}
              <div className="flex flex-col items-end gap-1">
                  <div className="bg-black/60 border border-yellow-500/50 rounded px-3 py-1 text-yellow-400 font-bold font-mono">
                      💰 {stats.coins}
                  </div>
                  <div className="bg-black/60 border border-emerald-500/50 rounded px-3 py-1 text-emerald-400 font-bold font-mono">
                      {String(Math.floor(stats.time / 60)).padStart(2,'0')}:{String(stats.time % 60).padStart(2,'0')}
                  </div>
                  <div className="text-white/70 text-sm font-bold">WAVE {stats.wave}</div>
              </div>
          </div>
      </div>
  );

  const renderMenu = () => (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 text-white">
          <h1 className="text-6xl font-black bg-gradient-to-br from-blue-400 to-purple-600 bg-clip-text text-transparent mb-2">SURVIVOR</h1>
          <h2 className="text-2xl text-slate-400 mb-8 tracking-widest">ARENA REACT</h2>
          
          <div className="flex flex-col gap-4 w-64">
            <button 
                onClick={startGame}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
                START GAME
            </button>
            <button 
                onClick={() => setGameState('shop')}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl border border-slate-600 transition-all"
            >
                UPGRADES
            </button>
          </div>
          <div className="mt-8 text-slate-500 text-sm">
              Total Coins: <span className="text-yellow-400 font-bold">{persistentData.lifetimeCoins}</span>
          </div>
      </div>
  );

  const renderShop = () => (
      <div className="absolute inset-0 z-50 flex flex-col bg-slate-900 text-white overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-slate-700 bg-slate-800">
              <h1 className="text-2xl font-bold text-yellow-400">UPGRADE SHOP</h1>
              <div className="font-mono bg-black/40 px-4 py-2 rounded-lg">
                  💰 {persistentData.lifetimeCoins}
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 flex flex-wrap gap-4 content-start justify-center">
              {Object.entries(CONFIG.UPGRADE_COSTS).map(([key, costs]) => {
                   const level = persistentData.upgrades[key as keyof typeof persistentData.upgrades];
                   const cost = costs[level];
                   const isMax = level >= costs.length;
                   const canAfford = !isMax && persistentData.lifetimeCoins >= cost;
                   
                   let icon = '';
                   let label = '';
                   if (key === 'damage') { icon = '💪'; label = 'Attack Damage'; }
                   if (key === 'maxHp') { icon = '❤️'; label = 'Max Health'; }
                   if (key === 'defense') { icon = '🛡️'; label = 'Defense'; }

                   return (
                       <div key={key} className={`w-full max-w-xs bg-slate-800 border-2 ${isMax ? 'border-emerald-500' : 'border-slate-600'} rounded-xl p-6 flex flex-col items-center`}>
                           <div className="text-4xl mb-2">{icon}</div>
                           <h3 className="text-xl font-bold mb-1">{label}</h3>
                           <div className="text-slate-400 text-sm mb-4">Level {level} / {costs.length}</div>
                           
                           {isMax ? (
                               <div className="text-emerald-400 font-bold py-2">MAXED OUT</div>
                           ) : (
                               <button 
                                   onClick={() => buyShopItem(key as any)}
                                   disabled={!canAfford}
                                   className={`w-full py-3 rounded-lg font-bold transition-all ${
                                       canAfford 
                                       ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20' 
                                       : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                   }`}
                               >
                                   Upgrade ({cost})
                               </button>
                           )}
                       </div>
                   )
              })}
          </div>
          
          <div className="p-6 border-t border-slate-700 bg-slate-800">
              <button 
                onClick={() => setGameState('menu')}
                className="w-full bg-slate-600 hover:bg-slate-500 py-3 rounded-xl font-bold"
              >
                  BACK TO MENU
              </button>
          </div>
      </div>
  );

  const renderLevelUp = () => (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-start md:justify-center pt-10 md:pt-0 bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200 overflow-y-auto">
          <h2 className="text-4xl font-bold text-yellow-400 mb-2 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] shrink-0">
             {stats.time === 0 ? "CHOOSE STARTING GEAR" : "LEVEL UP!"}
          </h2>
          <p className="text-slate-300 mb-8 shrink-0">Choose a reward</p>
          
          <div className="flex flex-col md:flex-row flex-wrap gap-4 w-full max-w-7xl justify-center">
              {upgradeOptions.map(id => {
                  const def = POWERUPS[id];
                  // Safe access to private property for UI check (React prototype shortcut)
                  const existing = (engineRef.current as any)?.powerups.get(id); 
                  
                  return (
                      <button 
                        key={id}
                        onClick={() => selectUpgrade(id)}
                        className="flex-1 min-w-[200px] bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-blue-500 rounded-xl p-6 text-left transition-all hover:-translate-y-1 group"
                      >
                          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">{def.icon}</div>
                          <div className="font-bold text-lg text-white mb-1">{def.name}</div>
                          <div className="text-xs font-bold text-yellow-500 mb-2 uppercase tracking-wide">
                              {def.type}
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed">{def.description}</p>
                          {existing && (
                             <div className="mt-3 text-emerald-400 text-sm font-bold">
                                Current Lvl: {existing.level}
                             </div>
                          )}
                      </button>
                  )
              })}
          </div>
      </div>
  );

  const renderGameOver = () => (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/90 backdrop-blur-md text-white">
          <h1 className="text-6xl font-black text-red-500 mb-8 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]">GAME OVER</h1>
          
          <div className="bg-black/40 p-8 rounded-2xl border border-red-500/30 w-full max-w-sm">
              <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-300">Time Survived</span>
                  <span className="font-mono font-bold">{String(Math.floor(runResults?.time / 60)).padStart(2,'0')}:{String(runResults?.time % 60).padStart(2,'0')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-300">Level Reached</span>
                  <span className="font-mono font-bold text-blue-400">{runResults?.level}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-slate-300">Enemies Defeated</span>
                  <span className="font-mono font-bold text-red-400">{runResults?.kills}</span>
              </div>
              <div className="flex justify-between py-4">
                  <span className="text-yellow-400 font-bold">Coins Earned</span>
                  <span className="font-mono font-bold text-yellow-400 text-xl">+{runResults?.coins}</span>
              </div>
          </div>
          
          <button 
            onClick={() => setGameState('menu')}
            className="mt-8 bg-white text-red-900 font-bold py-4 px-12 rounded-full hover:scale-105 transition-transform shadow-xl"
          >
              CONTINUE
          </button>
      </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {gameState === 'playing' && <Joystick onMove={handleJoystick} />}
      {gameState === 'playing' && renderHUD()}
      {gameState === 'levelup' && renderLevelUp()}
      {gameState === 'menu' && renderMenu()}
      {gameState === 'shop' && renderShop()}
      {gameState === 'gameover' && renderGameOver()}
    </div>
  );
}
