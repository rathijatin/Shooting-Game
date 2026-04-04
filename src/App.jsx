import React, { useEffect, useRef, useState } from 'react';
import './App.css';

class Player {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.health = 100;
  }
  draw(ctx) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

class Projectile {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }
  draw(ctx) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  update(ctx) {
    this.draw(ctx);
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }
}

class Enemy {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }
  draw(ctx) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  update(ctx) {
    this.draw(ctx);
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }
}

const friction = 0.98;
class Particle {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
    this.alpha = 1;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
  update(ctx) {
    this.draw(ctx);
    this.velocity.x *= friction;
    this.velocity.y *= friction;
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.alpha -= 0.01;
  }
}

// Global game refs to prevent React closure issues
let animationId;
let spawnIntervalId;
let autoShootId;
let gameActive = false;
let score = 0;

export default function App() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameover'
  
  // Game state
  const playerRef = useRef(null);
  const projectilesRef = useRef([]);
  const enemiesRef = useRef([]);
  const particlesRef = useRef([]);
  const keys = useRef({});
  const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const isMouseDown = useRef(false);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      clearInterval(spawnIntervalId);
      clearInterval(autoShootId);
    };
  }, []);

  // Update HUD Manually for Performance
  const updateHUD = (newScore, newHealth) => {
    score = newScore;
    const scoreEl = document.getElementById('scoreEl');
    if (scoreEl) scoreEl.innerText = score;

    const healthEl = document.getElementById('healthEl');
    if (healthEl) {
      healthEl.style.width = `${Math.max(0, newHealth)}%`;
      if (newHealth < 30) healthEl.style.background = '#f43f5e';
      else healthEl.style.background = 'linear-gradient(90deg, #fb7185, #e11d48)';
    }
  };

  const spawnEnemies = (canvas) => {
    spawnIntervalId = setInterval(() => {
      if (!gameActive) return;
      const radius = Math.random() * 20 + 10;
      let x, y;
      
      if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
        y = Math.random() * canvas.height;
      } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
      }

      // Neon colors
      const hslColor = `hsl(${Math.random() * 360}, 100%, 60%)`;
      
      const angle = Math.atan2(
        playerRef.current.y - y,
        playerRef.current.x - x
      );
      
      // Speed scales slowly with score
      const speedMult = 1 + (score / 5000);
      const velocity = {
        x: Math.cos(angle) * 1.5 * speedMult,
        y: Math.sin(angle) * 1.5 * speedMult
      };

      enemiesRef.current.push(new Enemy(x, y, radius, hslColor, velocity));
    }, 1000);
  };

  const shoot = () => {
    if (!gameActive || !playerRef.current) return;
    const angle = Math.atan2(
      mousePos.current.y - playerRef.current.y,
      mousePos.current.x - playerRef.current.x
    );
    const velocity = {
      x: Math.cos(angle) * 12,
      y: Math.sin(angle) * 12
    };
    projectilesRef.current.push(
      new Projectile(playerRef.current.x, playerRef.current.y, 5, '#00f2fe', velocity)
    );
  };

  const startGame = () => {
    const canvas = canvasRef.current;
    
    // Reset Game State
    playerRef.current = new Player(canvas.width / 2, canvas.height / 2, 15, '#fff');
    projectilesRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    gameActive = true;
    updateHUD(0, 100);
    setGameState('playing');

    clearInterval(spawnIntervalId);
    clearInterval(autoShootId);
    cancelAnimationFrame(animationId);
    
    spawnEnemies(canvas);
    animate();

    // Auto-shoot while mouse is held
    autoShootId = setInterval(() => {
      if (isMouseDown.current) {
        shoot();
      }
    }, 150);
  };

  const animate = () => {
    if (!gameActive) return;
    animationId = requestAnimationFrame(animate);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Trail effect
    ctx.fillStyle = 'rgba(11, 15, 25, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const p = playerRef.current;
    
    // Player Movement
    const speed = 5;
    if (keys.current['w'] || keys.current['W']) p.y -= speed;
    if (keys.current['s'] || keys.current['S']) p.y += speed;
    if (keys.current['a'] || keys.current['A']) p.x -= speed;
    if (keys.current['d'] || keys.current['D']) p.x += speed;

    // Boundary constraints
    p.x = Math.max(p.radius, Math.min(canvas.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(canvas.height - p.radius, p.y));

    p.draw(ctx);

    // Particles
    particlesRef.current.forEach((particle, index) => {
      if (particle.alpha <= 0) {
        particlesRef.current.splice(index, 1);
      } else {
        particle.update(ctx);
      }
    });

    // Projectiles
    projectilesRef.current.forEach((projectile, index) => {
      projectile.update(ctx);
      
      // Remove if off screen
      if (
        projectile.x + projectile.radius < 0 ||
        projectile.x - projectile.radius > canvas.width ||
        projectile.y + projectile.radius < 0 ||
        projectile.y - projectile.radius > canvas.height
      ) {
        setTimeout(() => {
          projectilesRef.current.splice(index, 1);
        }, 0);
      }
    });

    // Enemies
    enemiesRef.current.forEach((enemy, index) => {
      // Recalculate velocity towards player
      const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
      const speedMult = 1 + (score / 5000);
      enemy.velocity.x = Math.cos(angle) * 1.5 * speedMult;
      enemy.velocity.y = Math.sin(angle) * 1.5 * speedMult;
      
      enemy.update(ctx);

      // Collision Player & Enemy
      const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      if (dist - enemy.radius - p.radius < 1) {
        // Player hurt visually
        for (let i = 0; i < 5; i++) {
          particlesRef.current.push(
            new Particle(p.x, p.y, Math.random() * 3, '#fb7185', {
              x: (Math.random() - 0.5) * (Math.random() * 6),
              y: (Math.random() - 0.5) * (Math.random() * 6)
            })
          );
        }
        
        // Remove enemy and decrease health
        setTimeout(() => {
          enemiesRef.current.splice(index, 1);
        }, 0);
        
        p.health -= 25;
        updateHUD(score, p.health);

        if (p.health <= 0) {
          gameActive = false;
          updateHUD(score, 0);
          cancelAnimationFrame(animationId);
          setGameState('gameover');
        }
      }

      // Collision Projectile & Enemy
      projectilesRef.current.forEach((projectile, pIndex) => {
        const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
        
        // When projectiles touch enemy
        if (dist - enemy.radius - projectile.radius < 1) {
          
          // Explosion particles
          for (let i = 0; i < enemy.radius * 2; i++) {
            particlesRef.current.push(
              new Particle(
                projectile.x,
                projectile.y,
                Math.random() * 3,
                enemy.color,
                {
                  x: (Math.random() - 0.5) * (Math.random() * 8),
                  y: (Math.random() - 0.5) * (Math.random() * 8)
                }
              )
            );
          }

          if (enemy.radius - 10 > 10) {
            // Shrink enemy
            enemy.radius -= 10;
            updateHUD(score + 100, p.health);
            setTimeout(() => {
              projectilesRef.current.splice(pIndex, 1);
            }, 0);
          } else {
            // Remove completely
            updateHUD(score + 250, p.health);
            setTimeout(() => {
              enemiesRef.current.splice(index, 1);
              projectilesRef.current.splice(pIndex, 1);
            }, 0);
          }
        }
      });
    });
  };

  // Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => { keys.current[e.key] = true; };
    const handleKeyUp = (e) => { keys.current[e.key] = false; };
    
    const handleMouseMove = (e) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
    };

    const handleMouseDown = () => {
      isMouseDown.current = true;
      shoot(); // Initial shot
    };
    
    const handleMouseUp = () => {
      isMouseDown.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    // Ignore right click
    window.addEventListener('contextmenu', e => e.preventDefault());

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', e => e.preventDefault());
    };
  }, []);

  return (
    <div className="app-container">
      <canvas className="game-canvas" ref={canvasRef}></canvas>
      
      {/* UI overlays pointer-events: none */}
      <div className="ui-layer">
        
        {/* HUD: Always rendered, but visibly hidden if not playing */}
        <div className="hud" style={{ display: gameState === 'playing' ? 'flex' : 'none' }}>
          <div>
            <div style={{color: '#94a3b8', fontSize: '1rem', marginBottom: '8px', fontWeight: 'bold'}}>HULL INTEGRITY</div>
            <div className="health-bar-container">
              <div id="healthEl" className="health-bar-fill"></div>
            </div>
          </div>
          
          <div style={{textAlign: 'right'}}>
            <div style={{color: '#94a3b8', fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px'}}>SCORE</div>
            <div className="score-display">
              <span id="scoreEl">0</span>
            </div>
          </div>
        </div>

        {/* Start Menu Overlay */}
        {gameState === 'menu' && (
          <div className="overlay">
            <h1 className="title-text">Neon Survivor</h1>
            <button className="btn-start" onClick={startGame}>Start Mission</button>
            <div className="instructions">
              <p>Use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to move your ship.</p>
              <p>Aim with your Mouse. CLICK and HOLD to shoot.</p>
              <p>Survive as long as possible.</p>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="overlay">
            <h1 className="game-over-text">Mission Failed</h1>
            <div className="final-score">Final Score: {score}</div>
            <button className="btn-start" onClick={startGame}>Restart Mission</button>
          </div>
        )}

      </div>
    </div>
  );
}
