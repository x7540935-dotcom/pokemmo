/**
 * AnimationManager
 * 负责统一管理战斗动画（精灵动作、粒子特效等）
 */
class AnimationManager {
  /**
   * @param {Object} options
   * @param {Object} options.sprites - { p1: HTMLElement, p2: HTMLElement }
   * @param {Object} options.layers - { p1: HTMLElement, p2: HTMLElement }
   */
  constructor(options = {}) {
    this.sprites = options.sprites || {};
    this.layers = options.layers || {};
    this.activeTimers = new Map();
    this.queue = [];
    this.isRunning = false;
    this.queueTimer = null;
    this.fxBasePath = options.fxBasePath || './pokemon-showdown-client-master/play.pokemonshowdown.com/fx/';
    this.FX_SPRITES = this.buildFxSpriteMap();
  }

  buildFxSpriteMap() {
    const base = this.ensureTrailingSlash(this.fxBasePath);
    return {
      fire: `${base}flareball.png`,
      water: `${base}waterwisp.png`,
      electric: `${base}electroball.png`,
      grass: `${base}leaf1.png`,
      ice: `${base}iceball.png`,
      rock: `${base}rock2.png`,
      ground: `${base}mudwisp.png`,
      dark: `${base}blackwisp.png`,
      psychic: `${base}energyball.png`,
      ghost: `${base}shadowball.png`,
      dragon: `${base}ultra.png`,
      fairy: `${base}moon.png`,
      steel: `${base}greenmetal1.png`,
      fighting: `${base}fist.png`,
      flying: `${base}feather.png`,
      poison: `${base}poisonwisp.png`,
      bug: `${base}web.png`,
      default: `${base}shine.png`
    };
  }

  ensureTrailingSlash(path = '') {
    if (!path) return '';
    return path.endsWith('/') ? path : `${path}/`;
  }

  setFxBasePath(path) {
    if (!path || path === this.fxBasePath) return;
    this.fxBasePath = path;
    this.FX_SPRITES = this.buildFxSpriteMap();
  }

  setSprites(sprites) {
    this.sprites = sprites || this.sprites;
  }

  setLayers(layers) {
    this.layers = layers || this.layers;
  }

  play(type, payload = {}) {
    // 去重检查：如果队列中已经有相同的动画在等待，跳过
    // 注意：对于move动画，我们允许队列中有多个（因为可能有多个宝可梦同时行动）
    // 但对于其他动画（如damage、hit），如果队列中已有相同类型的，则跳过
    if (type !== 'move') {
      const hasDuplicate = this.queue.some(item => 
        item.type === type && 
        item.payload.side === payload.side
      );
      if (hasDuplicate) {
        console.log(`[AnimationManager] 跳过重复的 ${type} 动画 (side: ${payload.side})`);
        return;
      }
    }
    
    // 检查当前正在执行的动画是否与要添加的相同
    if (this.isRunning && this.queue.length > 0) {
      const current = this.queue[0];
      if (current.type === type && 
          current.type !== 'move' && 
          current.payload.side === payload.side) {
        console.log(`[AnimationManager] 当前正在执行相同的 ${type} 动画，跳过`);
        return;
      }
    }
    
    this.queue.push({ type, payload });
    this.processQueue();
  }

  processQueue() {
    if (this.isRunning || !this.queue.length) return;
    this.isRunning = true;
    const { type, payload } = this.queue.shift();
    const duration = this.execute(type, payload);
    this.queueTimer = setTimeout(() => {
      this.isRunning = false;
      this.queueTimer = null;
      this.processQueue();
    }, duration || 600);
  }

  execute(type, payload) {
    switch (type) {
      case 'move':
        return this.playMoveAnimation(payload);
      case 'hit':
      case 'damage':
        return this.playHitAnimation(payload);
      case 'enter':
      case 'switch':
        return this.playEnterAnimation(payload);
      default:
        return 0;
    }
  }

  playMoveAnimation({
    side = 'p1',
    targetSide = 'p2',
    moveType = 'physical',
    elementType = 'default'
  } = {}) {
    const isStatus = (moveType || '').toLowerCase() === 'status';
    const duration = isStatus ? 700 : 620;
    this.applySpriteClass(side, isStatus ? 'sprite--status' : 'sprite--attack', 360);
    if (isStatus) {
      this.spawnParticleGroup(side, 'status', elementType, 4);
      return duration;
    }
    this.spawnParticleGroup(side, 'charge', elementType, 3);
    setTimeout(() => {
      this.spawnParticleGroup(targetSide, 'hit', elementType, 4);
      this.applySpriteClass(targetSide, 'sprite--hit', 360);
    }, 220);
    return duration;
  }

  playHitAnimation({ side = 'p2', moveType = 'physical', elementType = 'default' } = {}) {
    const duration = 400;
    this.applySpriteClass(side, 'sprite--hit', 360);
    this.spawnParticleGroup(side, moveType === 'status' ? 'charge' : 'hit', elementType, 4);
    return duration;
  }

  playEnterAnimation({ side = 'p1' } = {}) {
    const duration = 450;
    this.applySpriteClass(side, 'sprite--enter', duration);
    this.spawnParticle(side, 'charge', 'default');
    return duration;
  }

  applySpriteClass(side, className, duration = 400) {
    const sprite = this.sprites?.[side];
    if (!sprite) return;
    sprite.classList.remove(className);
    void sprite.offsetWidth; // 强制重绘
    sprite.classList.add(className);
    const key = `${side}-${className}`;
    if (this.activeTimers.has(key)) {
      clearTimeout(this.activeTimers.get(key));
    }
    const timer = setTimeout(() => {
      sprite.classList.remove(className);
      this.activeTimers.delete(key);
    }, duration);
    this.activeTimers.set(key, timer);
  }

  spawnParticle(side, effect = 'hit', elementType = 'default') {
    const layer = this.layers?.[side];
    if (!layer) return;
    const particle = document.createElement('div');
    const key = (elementType || 'default').toLowerCase();
    const spriteUrl = this.FX_SPRITES[key] || this.FX_SPRITES.default;
    let variant = 'hit';
    if (effect === 'charge') {
      variant = 'charge';
    } else if (effect === 'status') {
      variant = 'status';
    }
    particle.className = `particle particle--${variant}`;
    const size = 40 + Math.random() * 20;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${30 + Math.random() * 40}%`;
    particle.style.top = `${30 + Math.random() * 40}%`;
    particle.style.backgroundImage = `url("${spriteUrl}")`;
    particle.style.backgroundSize = 'contain';
    particle.style.backgroundRepeat = 'no-repeat';
    particle.style.backgroundPosition = 'center';
    layer.appendChild(particle);
    setTimeout(() => particle.remove(), 800);
  }

  spawnParticleGroup(side, effect, elementType, count = 3) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.spawnParticle(side, effect, elementType);
      }, i * 60);
    }
  }

  clearQueue() {
    this.queue = [];
    this.isRunning = false;
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();
    if (this.sprites) {
      Object.values(this.sprites).forEach(sprite => {
        if (sprite?.classList) {
          sprite.classList.remove('sprite--attack', 'sprite--hit', 'sprite--enter', 'sprite--status');
        }
      });
    }
    if (this.layers) {
      Object.values(this.layers).forEach(layer => layer?.querySelectorAll('.particle').forEach(el => el.remove()));
    }
  }
}

export default AnimationManager;
