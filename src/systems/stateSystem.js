import { GAME_STATES, CONFIG } from '../config/constants.js?v=29';

export class StateSystem {
    constructor(engine) {
        this.engine = engine;
        this.currentState = GAME_STATES.INITIAL;
        this.menuSelection = 2; // Default to 'Touch' (index 2)
        this.updateDuringPause = true;
        
        this.btnBounds = {
            restart: { x: 0, y: 0, w: 200, h: 60 },
            mainMenu: { x: 0, y: 0, w: 200, h: 60 },
            zoomOut: { x: 0, y: 0, w: 50, h: 40 },
            zoomIn: { x: 0, y: 0, w: 50, h: 40 },
            modeTouch: { x: 0, y: 0, w: 240, h: 50 },
            modeKeyboard: { x: 0, y: 0, w: 240, h: 50 },
            modeKeyboardFire: { x: 0, y: 0, w: 240, h: 50 }
        };
        this.pauseBtnBounds = { x: 20, y: 20, w: 60, h: 60 };
        this.sessionActive = false;
        this.gameOverSelection = 0; // 0 for Try Again, 1 for Main Menu
    }

    update(deltaTime, worldState) {
        const { input } = worldState;

        // If a game start was requested by a previous frame's click/key,
        // execute it NOW at the very top of this update cycle - BEFORE any
        // other system has iterated over the entity list.
        if (this.pendingStart) {
            this.pendingStart = false;
            this.sessionActive = true;
            this.currentState = GAME_STATES.PLAYING;
            this.engine.gameState = GAME_STATES.PLAYING;
            this.engine.entityManager.clear();

            // Clear bloom canvas so menu explosion particles are wiped
            const rs = this.engine.systemManager.renderSystems.find(s => s.bloomCtx);
            if (rs) rs.bloomCtx.clearRect(0, 0, rs.bloomCanvas.width, rs.bloomCanvas.height);

            this.engine.score = 0;
            this.engine.coins = 0;
            this.engine.enemiesDestroyed = 0;
            this.engine.warpLevelKillCount = 0;
            this.engine.warpTimer = 0;

            this.engine.player = this.engine.entityManager.get('player', 0, 0);
            if (this.engine.camera) {
                this.engine.camera.follow(this.engine.player);
            }
            // Note: No early return - let all subsequent systems run this frame 
            // so SpawnSystem and others can initialize entities immediately.
        }

        // Menu navigation cooldown
        if (this.menuCooldown === undefined) this.menuCooldown = 0;
        if (this.menuCooldown > 0) this.menuCooldown -= deltaTime;
        
        // Handle Clicks
        if (input.clicks && input.clicks.length > 0) {
            const rect = this.engine.canvas.getBoundingClientRect();
            for (const click of input.clicks) {
                const mouseX = click.x - rect.left;
                const mouseY = click.y - rect.top;
                this.handleClick(mouseX, mouseY, worldState);
            }
        }

        // Keyboard fallbacks & Menu Navigation
        if (this.currentState === GAME_STATES.INITIAL && this.menuCooldown <= 0) {
            if (input.keys.w || input.keys.arrowup || (input.joystickLeft && input.joystickLeft.active && input.joystickLeft.y < -0.5)) {
                this.menuSelection--;
                if (this.menuSelection < 0) this.menuSelection = 4;
                this.menuCooldown = 200;
                if (worldState.audioSystem) worldState.audioSystem.playShoot();
            } else if (input.keys.s || input.keys.arrowdown || (input.joystickLeft && input.joystickLeft.active && input.joystickLeft.y > 0.5)) {
                this.menuSelection++;
                if (this.menuSelection > 4) this.menuSelection = 0;
                this.menuCooldown = 200;
                if (worldState.audioSystem) worldState.audioSystem.playShoot();
            } else if (input.keys.enter || input.virtualBeamButton) {
                this.activateMenuSelection(worldState);
                this.menuCooldown = 200;
            }
        } else if (this.currentState === GAME_STATES.PLAYING) {
            if (input.keys.p) {
                this.currentState = GAME_STATES.PAUSED;
                this.engine.gameState = GAME_STATES.PAUSED;
                input.keys.p = false;
            }
        } else if (this.currentState === GAME_STATES.PAUSED) {
            if (input.keys.p) {
                this.currentState = GAME_STATES.PLAYING;
                this.engine.gameState = GAME_STATES.PLAYING;
                input.keys.p = false;
            }
        } else if (this.currentState === GAME_STATES.GAME_OVER && this.menuCooldown <= 0) {
            // Reset selection if first time entering Game Over this session
            if (!this.gameOverInitialized) {
                this.gameOverSelection = 0;
                this.gameOverInitialized = true;
            }

            if (input.keys.w || input.keys.arrowup) {
                this.gameOverSelection = 0;
                this.menuCooldown = 200;
            } else if (input.keys.s || input.keys.arrowdown) {
                this.gameOverSelection = 1;
                this.menuCooldown = 200;
            }
            
            if (input.keys.enter) {
                input.keys.enter = false; 
                this.menuCooldown = 500;
                if (this.gameOverSelection === 0) {
                    this.startGame();
                } else {
                    this.currentState = GAME_STATES.INITIAL;
                }
            }
        }

        this.engine.gameState = this.currentState;
        worldState.stateSystem = this;
    }

    handleClick(mouseX, mouseY, worldState) {
        if (this.currentState === GAME_STATES.PLAYING || this.currentState === GAME_STATES.PAUSED) {
            const pb = this.pauseBtnBounds;
            if (mouseX >= pb.x && mouseX <= pb.x + pb.w && mouseY >= pb.y && mouseY <= pb.y + pb.h) {
                if (this.currentState === GAME_STATES.PLAYING) {
                    this.currentState = GAME_STATES.PAUSED;
                    this.engine.gameState = GAME_STATES.PAUSED;
                } else {
                    this.currentState = GAME_STATES.PLAYING;
                    this.engine.gameState = GAME_STATES.PLAYING;
                }
                if (worldState.audioSystem) worldState.audioSystem.playCollect();
                return;
            }
        }

        if (this.currentState === GAME_STATES.INITIAL) {
            // Zoom
            const bZoomOut = this.btnBounds.zoomOut;
            if (mouseX >= bZoomOut.x && mouseX <= bZoomOut.x + bZoomOut.w && mouseY >= bZoomOut.y && mouseY <= bZoomOut.y + bZoomOut.h) {
                if (window.zoomLevel > 0.5) {
                    window.zoomLevel = parseFloat((window.zoomLevel - 0.1).toFixed(1));
                    if (this.engine.camera) {
                        this.engine.camera.zoom = window.zoomLevel;
                        this.createExplosion(bZoomOut.x + bZoomOut.w / 2, bZoomOut.y + bZoomOut.h / 2, '#ff8500', 10, worldState, true);
                    }
                }
                return;
            }

            const bZoomIn = this.btnBounds.zoomIn;
            if (mouseX >= bZoomIn.x && mouseX <= bZoomIn.x + bZoomIn.w && mouseY >= bZoomIn.y && mouseY <= bZoomIn.y + bZoomIn.h) {
                if (window.zoomLevel < 2.0) {
                    window.zoomLevel = parseFloat((window.zoomLevel + 0.1).toFixed(1));
                    if (this.engine.camera) {
                        this.engine.camera.zoom = window.zoomLevel;
                        this.createExplosion(bZoomIn.x + bZoomIn.w / 2, bZoomIn.y + bZoomIn.h / 2, '#ff8500', 10, worldState, true);
                    }
                }
                return;
            }

            const modes = [
                { bounds: this.btnBounds.modeTouch, mode: 'touch', color: '#00ff88', index: 2 },
                { bounds: this.btnBounds.modeKeyboard, mode: 'keyboard', color: '#00d4ff', index: 3 },
                { bounds: this.btnBounds.modeKeyboardFire, mode: 'keyboardFire', color: '#ff00ff', index: 4 }
            ];

            for (let m of modes) {
                const b = m.bounds;
                if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
                    this.menuSelection = m.index;
                    this.activateMenuSelection(worldState);
                    return;
                }
            }
        } else if (this.currentState === GAME_STATES.GAME_OVER) {
            const b = this.btnBounds.restart;
            if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
                this.startGame();
                if (worldState.audioSystem) worldState.audioSystem.playCollect();
            }

            const bMenu = this.btnBounds.mainMenu;
            if (mouseX >= bMenu.x && mouseX <= bMenu.x + bMenu.w && mouseY >= bMenu.y && mouseY <= bMenu.y + bMenu.h) {
                this.currentState = GAME_STATES.INITIAL;
                if (window.gameEngine && window.gameEngine.audioSystem) window.gameEngine.audioSystem.resume();
                if (worldState.audioSystem) worldState.audioSystem.playCollect();
            }
        }
    }

    activateMenuSelection(worldState) {
        if (worldState.audioSystem) worldState.audioSystem.resume();
        if (this.engine.audioSystem) this.engine.audioSystem.resume();
        if (this.menuSelection === 0) {
            // Zoom Out
            if (window.zoomLevel > 0.5) {
                window.zoomLevel = parseFloat((window.zoomLevel - 0.1).toFixed(1));
                if (this.engine.camera) {
                    this.engine.camera.zoom = window.zoomLevel;
                    const b = this.btnBounds.zoomOut;
                    this.createExplosion(b.x + b.w / 2, b.y + b.h / 2, '#ff8500', 10, worldState, true);
                }
            }
        } else if (this.menuSelection === 1) {
            // Zoom In
            if (window.zoomLevel < 2.0) {
                window.zoomLevel = parseFloat((window.zoomLevel + 0.1).toFixed(1));
                if (this.engine.camera) {
                    this.engine.camera.zoom = window.zoomLevel;
                    const b = this.btnBounds.zoomIn;
                    this.createExplosion(b.x + b.w / 2, b.y + b.h / 2, '#ff8500', 10, worldState, true);
                }
            }
        } else if (this.menuSelection >= 2) {
            const modeMap = { 2: 'touch', 3: 'keyboard', 4: 'keyboardFire' };
            const colorMap = { 2: '#00ff88', 3: '#00d4ff', 4: '#ff00ff' };
            const boundsMap = { 2: this.btnBounds.modeTouch, 3: this.btnBounds.modeKeyboard, 4: this.btnBounds.modeKeyboardFire };
            
            window.inputMode = modeMap[this.menuSelection];
            window.dispatchEvent(new Event('inputModeChanged'));

            const el = document.documentElement;
            const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
            if (rfs) {
                rfs.call(el).catch(err => console.log('Fullscreen denied:', err));
            }

            if (this.sessionActive) {
                this.currentState = GAME_STATES.PLAYING;
                this.engine.gameState = GAME_STATES.PLAYING;
            } else {
                this.startGame();
            }

            // Draw explosion AFTER game starts so clearing entities doesn't remove it
            const b = boundsMap[this.menuSelection];
            this.createExplosion(b.x + b.w / 2, b.y + b.h / 2, colorMap[this.menuSelection], 30, worldState, true);
        }
    }

    createExplosion(screenX, screenY, color, count, worldState, isScreenCoord = false) {
        if (worldState.audioSystem) worldState.audioSystem.playExplosion();
        let worldX = screenX;
        let worldY = screenY;
        
        if (isScreenCoord && this.engine.camera) {
            worldX = (screenX / this.engine.camera.zoom) + this.engine.camera.x;
            worldY = (screenY / this.engine.camera.zoom) + this.engine.camera.y;
        }

        for (let i = 0; i < count; i++) {
            const size = Math.random() * 10 + 10;
            worldState.entityManager.get('particle', worldX, worldY, color, size);
        }
    }

    startGame() {
        // Signal that the next update frame should perform the actual game start.
        // This ensures we don't clear the entity array while SystemManager is
        // mid-iteration over it, which caused silent crashes.
        this.pendingStart = true;
    }

    gameOver() {
        this.sessionActive = false;
        this.currentState = GAME_STATES.GAME_OVER;
        this.engine.gameState = GAME_STATES.GAME_OVER;
        this.gameOverInitialized = false;
    }

    render(worldState) {
        const { ctx, width, height } = worldState;
        
        if (this.currentState === GAME_STATES.INITIAL) {
            this.drawStartScreen(ctx, width, height);
        } else if (this.currentState === GAME_STATES.PAUSED) {
            this.drawOverlay(ctx, width, height, 'PAUSED', 'Press P to Resume');
        } else if (this.currentState === GAME_STATES.GAME_OVER) {
            this.drawGameOverScreen(ctx, width, height);
        }
        
        if (this.currentState === GAME_STATES.PLAYING) {
            this.drawMinimap(ctx, worldState);
            this.drawHUD(ctx, worldState);
        }
    }

    drawStartScreen(ctx, width, height) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);

        const scale = Math.max(0.5, height / 1080);
        const titleSize = Math.floor(60 * scale);
        const versionSize = Math.floor(16 * scale);
        const instructionSize = Math.floor(20 * scale);
        const buttonTextSize = Math.floor(18 * scale);
        const spacing = 70 * scale;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const cx = width / 2;
        const cy = height / 2;

        ctx.fillStyle = CONFIG.COLORS.PLAYER;
        ctx.font = `bold ${titleSize}px "Outfit", sans-serif`;
        ctx.shadowBlur = 20 * scale;
        ctx.shadowColor = CONFIG.COLORS.PLAYER;
        ctx.fillText('NEON HUNTER', cx, cy - 200 * scale);

        ctx.shadowBlur = 0;
        ctx.font = `bold ${versionSize}px "Outfit", sans-serif`;
        ctx.fillStyle = CONFIG.COLORS.PLAYER;
        ctx.fillText('v1.27.0-lunar-wave (Refactored)', cx, cy - 150 * scale);

        const bZoomOut = this.btnBounds.zoomOut;
        bZoomOut.w = 50 * scale; bZoomOut.h = 40 * scale;
        bZoomOut.x = cx - 40 * scale - bZoomOut.w;
        bZoomOut.y = cy - 120 * scale;
        this.drawButton(ctx, bZoomOut, '-', '#ff8500', this.menuSelection === 0, buttonTextSize);

        const currentZoom = window.zoomLevel || 1.0;
        ctx.fillStyle = CONFIG.COLORS.PLAYER;
        ctx.font = `bold ${20 * scale}px "Outfit", sans-serif`;
        ctx.fillText(`${currentZoom.toFixed(1)}x`, cx, cy - 100 * scale);

        const bZoomIn = this.btnBounds.zoomIn;
        bZoomIn.w = 50 * scale; bZoomIn.h = 40 * scale;
        bZoomIn.x = cx + 40 * scale;
        bZoomIn.y = cy - 120 * scale;
        this.drawButton(ctx, bZoomIn, '+', '#ff8500', this.menuSelection === 1, buttonTextSize);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${instructionSize}px "Outfit", sans-serif`;
        ctx.fillText('Choose how you want to play:', cx, cy - 40 * scale);

        const btnW = 220 * scale; const btnH = 50 * scale;

        const bTouch = this.btnBounds.modeTouch;
        bTouch.w = btnW; bTouch.h = btnH;
        bTouch.x = cx - btnW / 2; bTouch.y = cy;
        this.drawButton(ctx, bTouch, 'Touch Joysticks', '#00ff88', this.menuSelection === 2, buttonTextSize);

        const bKeyboard = this.btnBounds.modeKeyboard;
        bKeyboard.w = btnW; bKeyboard.h = btnH;
        bKeyboard.x = cx - btnW / 2; bKeyboard.y = cy + spacing;
        this.drawButton(ctx, bKeyboard, 'WASD + Mouse', '#00d4ff', this.menuSelection === 3, buttonTextSize);
        
        const bKeyboardFire = this.btnBounds.modeKeyboardFire;
        bKeyboardFire.w = btnW; bKeyboardFire.h = btnH;
        bKeyboardFire.x = cx - btnW / 2; bKeyboardFire.y = cy + 2 * spacing;
        this.drawButton(ctx, bKeyboardFire, 'WASD + IJKL', '#ff00ff', this.menuSelection === 4, buttonTextSize);

        ctx.restore();
    }

    drawGameOverScreen(ctx, width, height) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, height);

        const scale = Math.max(0.5, height / 1080);
        const titleSize = Math.floor(60 * scale);
        const statsSize = Math.floor(30 * scale);
        const buttonTextSize = Math.floor(18 * scale);
        const spacing = 80 * scale;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#ff4444';
        ctx.font = `bold ${titleSize}px "Outfit", sans-serif`;
        ctx.shadowBlur = 20 * scale;
        ctx.shadowColor = '#ff4444';
        ctx.fillText('GAME OVER', width / 2, height / 2 - 120 * scale);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = `${statsSize}px "Outfit", sans-serif`;
        ctx.fillText(`Final Score: ${this.engine.score}`, width / 2, height / 2 - 40 * scale);
        ctx.fillText(`Coins Collected: ${this.engine.coins}`, width / 2, height / 2 + 10 * scale);

        const btnW = 200 * scale;
        const btnH = 60 * scale;

        const b = this.btnBounds.restart;
        b.w = btnW; b.h = btnH;
        b.x = width / 2 - b.w / 2;
        b.y = height / 2 + spacing;
        this.drawButton(ctx, b, 'TRY AGAIN', '#00ff88', this.gameOverSelection === 0, buttonTextSize);

        const bMenu = this.btnBounds.mainMenu;
        bMenu.w = btnW; bMenu.h = btnH;
        bMenu.x = width / 2 - bMenu.w / 2;
        bMenu.y = b.y + spacing;
        this.drawButton(ctx, bMenu, 'MAIN MENU', '#00d4ff', this.gameOverSelection === 1, buttonTextSize);

        ctx.restore();
    }

    drawOverlay(ctx, width, height, title, subtitle) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        ctx.textAlign = 'center';
        ctx.fillStyle = CONFIG.COLORS.PLAYER;
        ctx.font = 'bold 60px Outfit';
        ctx.shadowBlur = 20;
        ctx.shadowColor = CONFIG.COLORS.PLAYER;
        ctx.fillText(title, width / 2, height / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '24px Outfit';
        ctx.fillText(subtitle, width / 2, height / 2 + 40);
        ctx.restore();
    }

    drawButton(ctx, bounds, text, color, highlight = false, fontSize = 18) {
        ctx.save();
        const borderRadius = 15;
        if (highlight) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bounds.x, bounds.y, bounds.w, bounds.h, borderRadius);
        else ctx.rect(bounds.x, bounds.y, bounds.w, bounds.h);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px "Outfit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (!highlight) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
        }
        ctx.fillText(text, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
        ctx.restore();
    }

    drawHUD(ctx, worldState) {
        const { engine } = worldState;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Outfit';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        ctx.fillText(`Score: ${engine.score}`, 20, 20);
        ctx.fillText(`Coins: ${engine.coins}`, 20, 45);
        
        if (engine.player) {
            ctx.fillText(`Kills: ${engine.enemiesDestroyed}`, 20, 70);
            
            // Speeds
            const playerSpeed = Math.round(engine.player.speed);
            // Get average or representative enemy speed if exists
            const enemies = engine.entityManager.getEntitiesByType('enemy');
            const enemySpeed = enemies.length > 0 ? Math.round(enemies[0].speed) : CONFIG.ENEMY_BASE_SPEED;
            
            ctx.fillText(`P-Base Speed: ${playerSpeed}`, 20, 95);
            ctx.fillText(`E-Base Speed: ${enemySpeed}`, 20, 120);

            // Vector Hearts for Lives
            const heartSize = 18;
            const startX = 25;
            const startY = 160;
            for (let i = 0; i < engine.player.lives; i++) {
                this.drawHeart(ctx, startX + i * 30, startY, heartSize);
            }
        }

        // FPS Display (Top Left, near stats)
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 18px Outfit';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${engine.fps}`, 150, 20); 
        ctx.textAlign = 'left';

        // Warp Level (Center Top)
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = CONFIG.COLORS.PLAYER;
        ctx.font = 'bold 30px Outfit';
        ctx.fillText(`WARP ${engine.warpLevel}`, worldState.width / 2, 50);

        // Warp Progress Bar
        const barW = 200;
        const barH = 10;
        const bx = (worldState.width - barW) / 2;
        const by = 70;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(bx, by, barW, barH);
        
        const killsToNext = 100; 
        const progress = Math.min(1, engine.warpLevelKillCount / killsToNext);
        ctx.fillStyle = CONFIG.COLORS.PLAYER;
        ctx.fillRect(bx, by, barW * progress, barH);
        ctx.restore();

        // Draw Pause Button placeholder
        ctx.save();
        const pb = this.pauseBtnBounds;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(pb.x + 15, pb.y + 15, 10, 30);
        ctx.fillRect(pb.x + 35, pb.y + 15, 10, 30);
        ctx.restore();
    }

    drawMinimap(ctx, worldState) {
        const { width, entityManager, engine } = worldState;
        const minimapSize = 200;
        const margin = 20;
        const x = width - minimapSize - margin;
        const y = margin;

        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, minimapSize, minimapSize);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(0, 0, minimapSize, minimapSize);

        const scale = minimapSize / CONFIG.WORLD_WIDTH;
        const center = minimapSize / 2;

        // World Border on Minimap
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        const wb = minimapSize; // World is square 4000x4000, minimap is 200x200
        ctx.strokeRect(0, 0, wb, wb);

        // Entities
        for (const entity of entityManager.entities) {
            if (!entity.active) continue;
            const ex = center + entity.x * scale;
            const ey = center + entity.y * scale;
            
            if (entity.type === 'player') {
                ctx.fillStyle = '#fff';
                ctx.fillRect(ex - 2, ey - 2, 4, 4);
                
                // Draw Laser Beam on minimap
                if (entity.isChargingBeam && entity.beamLength > 0) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 3; // Thicker on minimap
                    ctx.beginPath();
                    ctx.moveTo(ex, ey);
                    ctx.lineTo(ex + entity.fireDirection.x * entity.beamLength * scale, ey + entity.fireDirection.y * entity.beamLength * scale);
                    ctx.stroke();
                    
                    ctx.strokeStyle = '#ff00ff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            } else if (entity.type === 'enemy') {
                ctx.fillStyle = CONFIG.COLORS.ENEMY;
                ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
            } else if (entity.type === 'food') {
                ctx.fillStyle = CONFIG.COLORS.FOOD;
                ctx.fillRect(ex - 1, ey - 1, 2, 2);
            }
        }
        
        // Viewport and Spawn Area Indicators
        if (engine.camera) {
            const camW = worldState.width / engine.camera.zoom;
            const camH = worldState.height / engine.camera.zoom;
            const vx = center + engine.camera.x * scale;
            const vy = center + engine.camera.y * scale;
            const vw = camW * scale;
            const vh = camH * scale;

            // 1. Viewport Rectangle
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(vx, vy, vw, vh);

            // 2. Spawn Area (Enemies spawn +/- 100px from viewport)
            const margin = 100 * scale;
            ctx.strokeStyle = '#ff4444'; // Solid red
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            ctx.strokeRect(vx - margin, vy - margin, vw + 2 * margin, vh + 2 * margin);
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }

    drawHeart(ctx, x, y, size) {
        ctx.save();
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        const topCurveHeight = size * 0.3;
        ctx.moveTo(x, y + topCurveHeight);
        // Left side of heart
        ctx.bezierCurveTo(
            x, y, 
            x - size / 2, y, 
            x - size / 2, y + topCurveHeight
        );
        ctx.bezierCurveTo(
            x - size / 2, y + (size + topCurveHeight) / 2, 
            x, y + (size + topCurveHeight) / 2, 
            x, y + size
        );
        // Right side of heart
        ctx.bezierCurveTo(
            x, y + (size + topCurveHeight) / 2, 
            x + size / 2, y + (size + topCurveHeight) / 2, 
            x + size / 2, y + topCurveHeight
        );
        ctx.bezierCurveTo(
            x + size / 2, y, 
            x, y, 
            x, y + topCurveHeight
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}
