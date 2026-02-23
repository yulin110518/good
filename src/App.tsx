import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameStatus, GameState, Rocket, Missile, Explosion, City, Turret, Difficulty } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Trophy, RotateCcw, Play, AlertTriangle, Zap, Sword, Flame, Volume2, VolumeX, Coins } from 'lucide-react';

const TARGET_SCORE = 1000;
const EXPLOSION_SPEED = 1.5;
const EXPLOSION_MAX_RADIUS = 45;

// Star background stars
const STARS_COUNT = 150;
interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    coins: 0,
    status: GameStatus.INTRO,
    difficulty: Difficulty.HARD,
    rockets: [],
    missiles: [],
    explosions: [],
    cities: [],
    turrets: [],
    level: 1,
    round: 1,
    totalRocketsInRound: 10,
    rocketsSpawnedInRound: 0,
    rocketsDestroyedInRound: 0,
    upgrades: {
      beamThickness: 0,
      explosionRadius: 0,
      splitShot: 0,
    },
  });

  const stateRef = useRef<GameState>(gameState);
  stateRef.current = gameState;

  // Initialize stars
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < STARS_COUNT; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2,
        opacity: Math.random(),
        speed: Math.random() * 0.5,
      });
    }
    starsRef.current = stars;
  }, []);

  const initGame = useCallback((difficulty: Difficulty, round: number = 1, currentScore: number = 0, currentCoins: number = 0, currentUpgrades?: any) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Difficulty settings
    let rocketCount = 10 + (round * 5);
    if (difficulty === Difficulty.EASY) rocketCount = Math.floor(rocketCount * 0.6);
    if (difficulty === Difficulty.HELL) rocketCount = Math.floor(rocketCount * 1.5);

    const turrets: Turret[] = [
      { id: 't1', x: width * 0.15, y: height - 60, ammo: difficulty === Difficulty.EASY ? 30 : 20, maxAmmo: 20, active: true },
      { id: 't2', x: width * 0.5, y: height - 60, ammo: difficulty === Difficulty.EASY ? 60 : 40, maxAmmo: 40, active: true },
      { id: 't3', x: width * 0.85, y: height - 60, ammo: difficulty === Difficulty.EASY ? 30 : 20, maxAmmo: 20, active: true },
    ];

    const cities: City[] = [
      { id: 'c1', x: width * 0.3, y: height - 40, active: true },
      { id: 'c2', x: width * 0.4, y: height - 40, active: true },
      { id: 'c3', x: width * 0.6, y: height - 40, active: true },
      { id: 'c4', x: width * 0.7, y: height - 40, active: true },
    ];

    setGameState(prev => ({
      ...prev,
      score: currentScore,
      coins: currentCoins,
      status: GameStatus.PLAYING,
      difficulty,
      rockets: [],
      missiles: [],
      explosions: [],
      cities,
      turrets,
      round,
      totalRocketsInRound: rocketCount,
      rocketsSpawnedInRound: 0,
      rocketsDestroyedInRound: 0,
      upgrades: currentUpgrades || (round === 1 ? {
        beamThickness: 0,
        explosionRadius: 0,
        splitShot: 0,
      } : prev.upgrades),
    }));

    if (musicEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
  }, [musicEnabled]);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (stateRef.current.status !== GameStatus.PLAYING) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const { turrets } = stateRef.current;
    let bestTurretIndex = -1;
    let minDistance = Infinity;

    turrets.forEach((t, index) => {
      if (t.active && t.ammo > 0) {
        const dist = Math.sqrt(Math.pow(t.x - clientX, 2) + Math.pow(t.y - clientY, 2));
        if (dist < minDistance) {
          minDistance = dist;
          bestTurretIndex = index;
        }
      }
    });

    if (bestTurretIndex !== -1) {
      const turret = turrets[bestTurretIndex];
      const upgrades = stateRef.current.upgrades;
      
      const createMissile = (targetX: number, targetY: number) => ({
        id: Math.random().toString(36).substr(2, 9),
        startX: turret.x,
        startY: turret.y - 30,
        x: turret.x,
        y: turret.y - 30,
        targetX,
        targetY,
        speed: stateRef.current.difficulty === Difficulty.EASY ? 8 : 12,
        progress: 0,
      });

      const newMissiles: Missile[] = [createMissile(clientX, clientY)];

      // Split shot logic
      if (upgrades.splitShot >= 1) {
        newMissiles.push(createMissile(clientX - 40, clientY));
      }
      if (upgrades.splitShot >= 2) {
        newMissiles.push(createMissile(clientX + 40, clientY));
      }
      if (upgrades.splitShot >= 3) {
        newMissiles.push(createMissile(clientX, clientY - 40));
      }

      setGameState(prev => {
        const newTurrets = [...prev.turrets];
        newTurrets[bestTurretIndex] = { ...turret, ammo: turret.ammo - 1 };
        return {
          ...prev,
          missiles: [...prev.missiles, ...newMissiles],
          turrets: newTurrets,
        };
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const update = () => {
      const state = stateRef.current;
      if (state.status !== GameStatus.PLAYING) return;

      const width = canvas.width;
      const height = canvas.height;

      setGameState(prev => {
        // 1. Spawn Rockets (Dragons)
        const newRockets = [...prev.rockets];
        const spawnChance = prev.difficulty === Difficulty.EASY ? 0.01 : prev.difficulty === Difficulty.HELL ? 0.03 : 0.015;
        
        if (prev.rocketsSpawnedInRound < prev.totalRocketsInRound && Math.random() < spawnChance) {
          const targets = [...prev.cities.filter(c => c.active), ...prev.turrets.filter(t => t.active)];
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            let speed = 1 + (prev.round * 0.2);
            if (prev.difficulty === Difficulty.EASY) speed *= 0.7;
            if (prev.difficulty === Difficulty.HELL) speed *= 1.4;

            newRockets.push({
              id: Math.random().toString(36).substr(2, 9),
              x: Math.random() * width,
              y: -20,
              targetX: target.x,
              targetY: target.y,
              speed,
              progress: 0,
            });
            prev.rocketsSpawnedInRound++;
          }
        }

        // 2. Update Rockets
        const activeRockets: Rocket[] = [];
        const newExplosions = [...prev.explosions];
        const newCities = [...prev.cities];
        const newTurrets = [...prev.turrets];
        
        const currentExplosionMaxRadius = EXPLOSION_MAX_RADIUS + (prev.upgrades.explosionRadius * 20);

        newRockets.forEach(r => {
          const dx = r.targetX - r.x;
          const dy = r.targetY - r.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 5) {
            newExplosions.push({
              id: Math.random().toString(36).substr(2, 9),
              x: r.targetX,
              y: r.targetY,
              radius: 0,
              maxRadius: currentExplosionMaxRadius,
              growing: true,
              alpha: 1,
            });

            const cityIndex = newCities.findIndex(c => Math.abs(c.x - r.targetX) < 20 && Math.abs(c.y - r.targetY) < 20);
            if (cityIndex !== -1) newCities[cityIndex].active = false;
            
            const turretIndex = newTurrets.findIndex(t => Math.abs(t.x - r.targetX) < 20 && Math.abs(t.y - r.targetY) < 20);
            if (turretIndex !== -1) newTurrets[turretIndex].active = false;
          } else {
            const angle = Math.atan2(dy, dx);
            r.x += Math.cos(angle) * r.speed;
            r.y += Math.sin(angle) * r.speed;
            activeRockets.push(r);
          }
        });

        // 3. Update Missiles (Light Beams)
        const activeMissiles: Missile[] = [];
        prev.missiles.forEach(m => {
          const dx = m.targetX - m.startX;
          const dy = m.targetY - m.startY;
          const totalDist = Math.sqrt(dx * dx + dy * dy);
          
          m.progress += m.speed / totalDist;
          
          if (m.progress >= 1) {
            newExplosions.push({
              id: Math.random().toString(36).substr(2, 9),
              x: m.targetX,
              y: m.targetY,
              radius: 0,
              maxRadius: currentExplosionMaxRadius,
              growing: true,
              alpha: 1,
            });
          } else {
            m.x = m.startX + dx * m.progress;
            m.y = m.startY + dy * m.progress;
            activeMissiles.push(m);
          }
        });

        // 4. Update Explosions & Collision
        const activeExplosions: Explosion[] = [];
        let scoreGain = 0;
        let destroyedInThisFrame = 0;
        const remainingRockets: Rocket[] = [];

        newExplosions.forEach(e => {
          if (e.growing) {
            e.radius += EXPLOSION_SPEED;
            if (e.radius >= e.maxRadius) e.growing = false;
          } else {
            e.radius -= EXPLOSION_SPEED * 0.5;
            e.alpha -= 0.02;
          }
          if (e.radius > 0) activeExplosions.push(e);
        });

        activeRockets.forEach(r => {
          const hit = activeExplosions.some(e => {
            const dist = Math.sqrt(Math.pow(r.x - e.x, 2) + Math.pow(r.y - e.y, 2));
            return dist < e.radius;
          });

          if (hit) {
            scoreGain += 20;
            destroyedInThisFrame++;
            activeExplosions.push({
              id: Math.random().toString(36).substr(2, 9),
              x: r.x,
              y: r.y,
              radius: 5,
              maxRadius: currentExplosionMaxRadius * 0.6,
              growing: true,
              alpha: 1,
            });
          } else {
            remainingRockets.push(r);
          }
        });

        // Check Round End / Win / Loss
        let status = prev.status;
        const totalScore = prev.score + scoreGain;
        const totalCoins = prev.coins + destroyedInThisFrame;
        const totalDestroyed = prev.rocketsDestroyedInRound + destroyedInThisFrame;

        if (totalScore >= TARGET_SCORE) {
          status = GameStatus.WON;
        } else if (newTurrets.every(t => !t.active)) {
          status = GameStatus.LOST;
        } else if (prev.rocketsSpawnedInRound >= prev.totalRocketsInRound && remainingRockets.length === 0 && activeExplosions.length === 0) {
          status = GameStatus.ROUND_END;
        }

        return {
          ...prev,
          score: totalScore,
          coins: totalCoins,
          rockets: remainingRockets,
          missiles: activeMissiles,
          explosions: activeExplosions,
          cities: newCities,
          turrets: newTurrets,
          rocketsDestroyedInRound: totalDestroyed,
          status,
        };
      });
    };

    const draw = () => {
      const state = stateRef.current;
      
      // Clear with gradient sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGradient.addColorStop(0, '#020617');
      skyGradient.addColorStop(0.5, '#0f172a');
      skyGradient.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Stars
      starsRef.current.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Ground
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);

      // Draw Cities (Mini Buildings)
      state.cities.forEach(c => {
        if (c.active) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(c.x - 20, c.y - 15, 40, 25);
          // Windows
          ctx.fillStyle = '#fde047';
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
              ctx.fillRect(c.x - 15 + i * 12, c.y - 10 + j * 8, 5, 5);
            }
          }
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(c.x - 20, c.y - 5, 40, 15);
        }
      });

      // Draw Turrets (Ultraman Zero)
      state.turrets.forEach(t => {
        if (t.active) {
          // Ultraman Zero Silhouette/Simplified
          ctx.save();
          ctx.translate(t.x, t.y);
          
          // Body
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.ellipse(0, 0, 15, 25, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Red patterns
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(-10, -10);
          ctx.lineTo(10, -10);
          ctx.lineTo(0, 10);
          ctx.fill();

          // Eyes (Glowing)
          ctx.fillStyle = '#fef08a';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fef08a';
          ctx.beginPath();
          ctx.ellipse(-5, -15, 4, 2, Math.PI/4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(5, -15, 4, 2, -Math.PI/4, 0, Math.PI * 2);
          ctx.fill();
          
          // Sluggers (Horns)
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(-8, -20);
          ctx.lineTo(-12, -35);
          ctx.lineTo(-4, -25);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(8, -20);
          ctx.lineTo(12, -35);
          ctx.lineTo(4, -25);
          ctx.fill();

          ctx.restore();
          
          // Ammo count
          ctx.fillStyle = '#fff';
          ctx.font = '12px "JetBrains Mono"';
          ctx.textAlign = 'center';
          ctx.fillText(t.ammo.toString(), t.x, t.y + 25);
        } else {
          ctx.fillStyle = '#451a03';
          ctx.fillRect(t.x - 15, t.y - 5, 30, 15);
        }
      });

      // Draw Rockets (Evil Black Dragons)
      state.rockets.forEach(r => {
        ctx.save();
        ctx.translate(r.x, r.y);
        const angle = Math.atan2(r.targetY - r.y, r.targetX - r.x);
        ctx.rotate(angle);

        // Evil Black Dragon Body
        ctx.fillStyle = '#0f172a'; // Deep dark blue/black
        ctx.strokeStyle = '#7e22ce'; // Purple outline
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-25, -12);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-25, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Evil Fire trail
        const gradient = ctx.createLinearGradient(-15, 0, -45, 0);
        gradient.addColorStop(0, '#7e22ce'); // Purple
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(-45, -6, 30, 12);

        // Evil Glowing Eyes
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.arc(3, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw Missiles (Thick Light Beams)
      state.missiles.forEach(m => {
        ctx.save();
        const thicknessScale = 1 + (state.upgrades.beamThickness * 0.5);
        
        // Thick Outer Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#22d3ee';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 8 * thicknessScale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.startX, m.startY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        
        // Middle Beam
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 4 * thicknessScale;
        ctx.stroke();

        // Inner white core
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * thicknessScale;
        ctx.stroke();
        ctx.restore();

        // Target X (Larger)
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.targetX - 12, m.targetY - 12);
        ctx.lineTo(m.targetX + 12, m.targetY + 12);
        ctx.moveTo(m.targetX + 12, m.targetY - 12);
        ctx.lineTo(m.targetX - 12, m.targetY + 12);
        ctx.stroke();
      });

      // Draw Explosions
      state.explosions.forEach(e => {
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${e.alpha})`);
        gradient.addColorStop(0.3, `rgba(34, 211, 238, ${e.alpha})`);
        gradient.addColorStop(0.7, `rgba(30, 58, 138, ${e.alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleUpgrade = (type: keyof typeof gameState.upgrades) => {
    const currentLevel = gameState.upgrades[type];
    if (currentLevel >= 3) return;

    const costs = [30, 50, 100];
    const cost = costs[currentLevel];

    if (gameState.coins >= cost) {
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - cost,
        upgrades: {
          ...prev.upgrades,
          [type]: currentLevel + 1
        }
      }));
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none touch-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasClick}
        onTouchStart={handleCanvasClick}
        className="w-full h-full"
      />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-mono uppercase tracking-widest text-white/40">Zero Energy</div>
          <div className="text-3xl font-bold font-mono text-cyan-400 tabular-nums">
            {gameState.score.toString().padStart(5, '0')}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span className="text-sm font-bold font-mono text-yellow-400">{gameState.coins}</span>
            </div>
            <div className="text-[10px] font-mono text-white/20 uppercase">Round {gameState.round}</div>
            <div className="text-[10px] font-mono text-cyan-500/40 uppercase">{gameState.difficulty}</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={() => {
              setMusicEnabled(!musicEnabled);
              if (audioRef.current) {
                if (!musicEnabled) {
                  audioRef.current.play().catch(e => console.log("Audio play blocked", e));
                } else {
                  audioRef.current.pause();
                }
              }
            }}
            className="pointer-events-auto p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
          >
            {musicEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <div className="flex gap-4">
            {gameState.turrets.map((t, i) => (
              <div key={t.id} className={`flex flex-col items-center gap-1 ${!t.active ? 'opacity-30' : ''}`}>
                <div className={`w-10 h-1.5 rounded-full bg-white/10 overflow-hidden`}>
                  <motion.div 
                    initial={false}
                    animate={{ width: `${(t.ammo / t.maxAmmo) * 100}%` }}
                    className={`h-full ${t.ammo > 10 ? 'bg-cyan-400' : t.ammo > 0 ? 'bg-amber-400' : 'bg-red-500'}`} 
                  />
                </div>
                <div className="text-[10px] font-mono text-white/40">ZERO-{i+1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence mode="wait">
        {gameState.status === GameStatus.INTRO && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 p-6 overflow-hidden"
          >
            {/* Enhanced Intro Animation: Zero vs Belial Beams */}
            <div className="relative w-full h-64 flex items-center justify-center mb-12">
              {/* Zero Side */}
              <motion.div 
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute left-10 md:left-20 flex flex-col items-center"
              >
                <div className="w-16 h-24 bg-slate-200 rounded-full relative overflow-hidden border-2 border-cyan-400/30">
                  <div className="absolute top-4 left-2 w-4 h-2 bg-yellow-200 rounded-full blur-[2px]" />
                  <div className="absolute top-4 right-2 w-4 h-2 bg-yellow-200 rounded-full blur-[2px]" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-8 bg-slate-400 rounded-full" />
                </div>
                <div className="text-[10px] font-mono text-cyan-400 mt-2 font-bold">ZERO</div>
              </motion.div>

              {/* Belial Side */}
              <motion.div 
                initial={{ x: 200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute right-10 md:right-20 flex flex-col items-center"
              >
                <div className="w-16 h-24 bg-red-950 rounded-full relative overflow-hidden border-2 border-red-600/30">
                  <div className="absolute top-4 left-2 w-4 h-2 bg-red-500 rounded-full blur-[2px]" />
                  <div className="absolute top-4 right-2 w-4 h-2 bg-red-500 rounded-full blur-[2px]" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-10 bg-red-900 rounded-full" />
                </div>
                <div className="text-[10px] font-mono text-red-600 mt-2 font-bold">BELIAL</div>
              </motion.div>

              {/* Beams Clashing */}
              <motion.div 
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute left-[15%] right-[15%] h-4 flex items-center"
              >
                <div className="flex-1 h-full bg-gradient-to-r from-cyan-400 to-white shadow-[0_0_30px_rgba(34,211,238,1)] rounded-l-full" />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 0.1 }}
                  className="w-8 h-8 bg-white rounded-full shadow-[0_0_40px_white] z-10"
                />
                <div className="flex-1 h-full bg-gradient-to-l from-red-600 to-purple-500 shadow-[0_0_30px_rgba(220,38,38,1)] rounded-r-full" />
              </motion.div>

              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="z-20 text-center mt-48"
              >
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">
                  Galaxy Hegemony
                </h1>
                <p className="text-cyan-400 font-mono text-sm tracking-[0.5em] uppercase mt-2">星系争霸</p>
              </motion.div>
            </div>

            <motion.button 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.8 }}
              onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.GAME_INFO }))}
              className="group relative px-12 py-4 bg-white text-black font-bold uppercase tracking-widest rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              <span className="relative z-10">Start Mission / 开始游戏</span>
              <div className="absolute inset-0 bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </motion.button>
          </motion.div>
        )}

        {gameState.status === GameStatus.GAME_INFO && (
          <motion.div 
            key="game-info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-8 text-center"
          >
            <div className="max-w-2xl bg-slate-900/80 border border-cyan-500/30 p-8 rounded-3xl space-y-6 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
              <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-widest">Game Features / 游戏特色</h2>
              <div className="text-left space-y-4 text-white/80 font-mono text-sm leading-relaxed">
                <p>
                  本游戏采用星空特色，开始以赛罗与贝利亚光线引出游戏，再介绍背景，然后进入选择难度。
                </p>
                <p>
                  发射台采用奥特曼，导弹分别采用光线和黑暗魔龙导弹，一轮一轮进行，难度逐渐增加。
                </p>
                <p>
                  每击灭一个魔龙，获得一个金币，金币可以升级技能，有提升光线粗度，扩大光波爆炸范围，子弹分叉。
                </p>
                <p>
                  另外，配上奇迹再现音乐。在游戏结束之后，将分别出现两段话：
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60">
                  <li>胜利：贝利亚自爆，出现“光明永远不会缺席，光明终将战胜黑暗”。</li>
                  <li>失败：一片漆黑，出现“光明永远不会消失，光明永不畏惧，再战！”。</li>
                </ul>
              </div>
              <button 
                onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.STORY }))}
                className="w-full py-4 bg-cyan-500 text-black font-bold uppercase tracking-widest rounded-full hover:bg-cyan-400 transition-colors active:scale-95"
              >
                I Understand / 我知道了
              </button>
            </div>
          </motion.div>
        )}

        {gameState.status === GameStatus.STORY && (
          <motion.div 
            key="story"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 p-8 text-center"
          >
            <div className="max-w-2xl space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-mono text-cyan-400 tracking-widest uppercase">The Crisis / 宇宙危机</h2>
                <div className="space-y-4 text-lg md:text-xl font-medium leading-relaxed text-white/90">
                  <p>
                    Belial is about to devour the entire galaxy, Ultraman comes to save the universe.
                  </p>
                  <p className="text-red-500 font-bold">
                    贝利亚要吞噬整个星系，奥特曼前来拯救宇宙。
                  </p>
                  <p className="text-white/60 text-base italic">
                    Will light defeat darkness and save the universe, or will darkness cover the light and plunge the universe into endless darkness?
                  </p>
                  <p className="text-cyan-400 font-bold">
                    究竟是光明战胜黑暗，拯救宇宙，还是黑暗覆盖光明，将宇宙陷入永无止境的黑暗？
                  </p>
                </div>
              </motion.div>

              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.DIFFICULTY_SELECT }))}
                className="px-10 py-3 border border-white/20 hover:border-cyan-400 hover:text-cyan-400 text-white font-mono text-sm uppercase tracking-[0.3em] rounded-full transition-all"
              >
                Accept Mission / 接受任务
              </motion.button>
            </div>
          </motion.div>
        )}

        {gameState.status === GameStatus.DIFFICULTY_SELECT && (
          <motion.div 
            key="difficulty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6"
          >
            <h2 className="text-3xl font-bold uppercase italic text-white mb-8 tracking-widest">Select Difficulty / 选择难度</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              {[
                { id: Difficulty.EASY, label: 'Easy / 简单', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'hover:bg-emerald-500/10', desc: 'Fewer dragons, slower speed.' },
                { id: Difficulty.HARD, label: 'Hard / 困难', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'hover:bg-cyan-500/10', desc: 'Standard combat intensity.' },
                { id: Difficulty.HELL, label: 'Hell / 地狱', color: 'text-red-500', border: 'border-red-500/30', bg: 'hover:bg-red-500/10', desc: 'Massive swarm, extreme speed.' }
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => initGame(d.id)}
                  className={`flex flex-col items-center p-8 border-2 ${d.border} rounded-3xl transition-all ${d.bg} group`}
                >
                  <div className={`text-xl font-bold ${d.color} mb-2`}>{d.label}</div>
                  <p className="text-white/40 text-[10px] font-mono text-center uppercase tracking-wider">{d.desc}</p>
                  <div className="mt-6 w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className={`w-4 h-4 fill-current ${d.color}`} />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {gameState.status === GameStatus.ROUND_END && (
          <motion.div 
            key="round-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6"
          >
            <div className="max-w-2xl w-full bg-slate-900 border border-white/10 p-8 rounded-3xl text-center space-y-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold uppercase italic text-cyan-400">Round {gameState.round} Clear</h2>
                <p className="text-white/40 font-mono text-xs uppercase tracking-widest">回合结束 - 升级技能</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                {[
                  { id: 'beamThickness', label: 'Beam Thickness', labelCn: '光线粗度', icon: <Zap className="w-5 h-5" /> },
                  { id: 'explosionRadius', label: 'Explosion Radius', labelCn: '爆炸范围', icon: <Flame className="w-5 h-5" /> },
                  { id: 'splitShot', label: 'Split Shot', labelCn: '子弹分叉', icon: <Sword className="w-5 h-5" /> },
                ].map((upg) => {
                  const level = gameState.upgrades[upg.id as keyof typeof gameState.upgrades];
                  const costs = [30, 50, 100];
                  const cost = level < 3 ? costs[level] : null;
                  const canAfford = cost !== null && gameState.coins >= cost;

                  return (
                    <div key={upg.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center gap-3">
                      <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-400">
                        {upg.icon}
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-white">{upg.label}</div>
                        <div className="text-[10px] text-white/40 uppercase font-mono">{upg.labelCn}</div>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`w-4 h-1 rounded-full ${level >= i ? 'bg-cyan-400' : 'bg-white/10'}`} />
                        ))}
                      </div>
                      {level < 3 ? (
                        <button
                          onClick={() => handleUpgrade(upg.id as keyof typeof gameState.upgrades)}
                          disabled={!canAfford}
                          className={`w-full py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                            canAfford 
                              ? 'bg-yellow-500 text-black hover:scale-105 active:scale-95' 
                              : 'bg-white/5 text-white/20 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Coins className="w-3 h-3" />
                            {cost}
                          </div>
                        </button>
                      ) : (
                        <div className="text-[10px] font-bold text-cyan-400 uppercase font-mono py-2">MAX LEVEL</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                <div className="text-left flex flex-col justify-center">
                  <div className="text-[10px] font-mono text-white/30 uppercase">Coins / 金币</div>
                  <div className="text-2xl font-bold font-mono text-yellow-400 flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    {gameState.coins}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-white/30 uppercase">Dragons Slain</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">{gameState.rocketsDestroyedInRound}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.INTRO }))}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest rounded-2xl transition-colors"
                >
                  Exit / 退出
                </button>
                <button 
                  onClick={() => initGame(gameState.difficulty, gameState.round + 1, gameState.score, gameState.coins, gameState.upgrades)}
                  className="flex-[2] py-4 bg-cyan-500 text-black font-bold uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  Next Round / 下一轮
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState.status === GameStatus.WON && (
          <motion.div 
            key="won"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 p-6"
          >
            {/* Victory Animation: Belial self-destructs */}
            <div className="relative w-full h-64 flex items-center justify-center mb-8">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], rotate: [0, 2, -2, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute left-1/4 w-24 h-40 bg-slate-200 rounded-full flex flex-col items-center p-4 border-2 border-cyan-400"
              >
                <div className="w-full h-2 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,1)] rounded-full mt-10" />
                <div className="text-[8px] font-bold text-black mt-2">ZERO</div>
              </motion.div>
              
              {/* Belial Self-Destructing */}
              <motion.div 
                initial={{ opacity: 1, scale: 1 }}
                animate={{ 
                  opacity: [1, 1, 0], 
                  scale: [1, 1.5, 4],
                  filter: ['blur(0px)', 'blur(10px)', 'blur(40px)']
                }}
                transition={{ duration: 1.5, times: [0, 0.6, 1] }}
                className="absolute right-1/4 w-24 h-40 bg-red-950 border-2 border-red-600 rounded-full flex flex-col items-center p-4"
              >
                <div className="text-[8px] font-bold text-red-500 mt-10">BELIAL</div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 5] }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute inset-0 bg-white rounded-full shadow-[0_0_100px_white]"
                />
              </motion.div>

              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '50%', opacity: [1, 1, 0] }}
                transition={{ duration: 1.2 }}
                className="absolute left-1/3 h-6 bg-gradient-to-r from-cyan-400 to-white shadow-[0_0_40px_rgba(34,211,238,1)] rounded-full"
              />
            </div>

            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.5, type: 'spring' }}
              className="text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-6xl md:text-8xl font-black italic uppercase text-white tracking-tighter">Victory / 胜利</h2>
                <p className="text-cyan-400 font-mono text-lg tracking-widest uppercase">Light will eventually triumph / 光明终将战胜黑暗</p>
              </div>
              
              <div className="max-w-lg mx-auto p-6 border border-cyan-500/30 bg-cyan-500/5 rounded-2xl backdrop-blur-sm">
                <p className="text-xl font-bold text-white leading-relaxed">
                  "Light will never be absent, light will eventually triumph over darkness."
                </p>
                <p className="text-cyan-400 mt-2 font-medium">
                  光明永远不会缺席，光明终将战胜黑暗
                </p>
              </div>

              <button 
                onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.INTRO }))}
                className="mt-4 px-12 py-4 bg-white text-black font-bold uppercase tracking-widest rounded-full active:scale-95 transition-transform hover:bg-cyan-400"
              >
                Play Again / 再玩一次
              </button>
            </motion.div>
          </motion.div>
        )}

        {gameState.status === GameStatus.LOST && (
          <motion.div 
            key="lost"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 p-6"
          >
            {/* Defeat Animation: Total Darkness */}
            <motion.div 
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 bg-red-950/20 pointer-events-none"
            />

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 1 }}
              className="text-center space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-6xl md:text-8xl font-black italic uppercase text-red-600 tracking-tighter drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">Defeat / 失败</h2>
                <p className="text-white/40 font-mono tracking-[1em] uppercase">Darkness Prevails</p>
              </div>

              <div className="max-w-lg mx-auto p-8 border border-red-900/50 bg-red-950/10 rounded-3xl">
                <div className="space-y-4 text-xl font-bold text-white/90 italic">
                  <p>"Light will never disappear, light is never afraid!"</p>
                  <p className="text-red-500 not-italic">光明永远不会消失，光明永不畏惧，再战！</p>
                </div>
              </div>

              <button 
                onClick={() => setGameState(prev => ({ ...prev, status: GameStatus.INTRO }))}
                className="mt-8 px-12 py-4 bg-red-600 text-white font-bold uppercase tracking-widest rounded-full active:scale-95 transition-transform hover:bg-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
              >
                Rematch / 再战
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crosshair hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/10 uppercase tracking-[0.2em] pointer-events-none">
        Protect the Galaxy • 守护银河
      </div>
      {/* Audio Element */}
      <audio 
        ref={audioRef}
        loop
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" // Placeholder for "奇迹再现"
      />
    </div>
  );
}
