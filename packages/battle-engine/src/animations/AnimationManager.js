/**
 * AnimationManager
 * 负责统一管理战斗动画（精灵动作、粒子特效等）
 * 支持回合制动画流程：先攻方动画 → 伤害日志 → 结算 → 间隔 → 后攻方动画
 */
class AnimationManager {
  /**
   * @param {Object} options
   * @param {Object} options.sprites - { p1: HTMLElement, p2: HTMLElement }
   * @param {Object} options.layers - { p1: HTMLElement, p2: HTMLElement }
   * @param {number} options.turnInterval - 双方动画之间的间隔时间（毫秒），默认 800ms
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
    
    // 回合管理
    this.currentTurn = null;              // 当前回合数
    this.currentTurnAnimations = [];      // 当前回合的动画队列
    this.turnInterval = options.turnInterval || 800;  // 双方动画间隔
    this.processedMoves = new Set();      // 已处理的 move 动画（用于去重）
    this.lastMoveTime = new Map();        // 每个 side 的最后 move 时间
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

  /**
   * 开始新回合
   * @param {number} turnNumber - 回合数
   */
  startTurn(turnNumber) {
    this.currentTurn = turnNumber;
    this.currentTurnAnimations = [];
    this.processedMoves.clear();
    this.lastMoveTime.clear();
    console.log(`[AnimationManager] 开始回合 ${turnNumber}`);
  }

  /**
   * 结束当前回合，处理回合内的所有动画
   */
  endTurn() {
    if (this.currentTurnAnimations.length === 0) {
      return;
    }
    
    console.log(`[AnimationManager] 结束回合 ${this.currentTurn}，处理 ${this.currentTurnAnimations.length} 个动画`);
    
    // 将回合内的动画按顺序加入队列
    this.currentTurnAnimations.forEach(anim => {
      this.queue.push(anim);
    });
    
    this.currentTurnAnimations = [];
    this.processQueue();
  }

  play(type, payload = {}) {
    // 完善去重机制
    if (this.shouldSkipAnimation(type, payload)) {
      return;
    }
    
    const animation = { type, payload, timestamp: Date.now() };
    
    // 如果是 move 动画，记录到当前回合
    if (type === 'move') {
      const moveKey = `${payload.side}-${payload.moveName || 'unknown'}-${payload.targetSide || ''}`;
      this.processedMoves.add(moveKey);
      this.lastMoveTime.set(payload.side, Date.now());
      
      // 将 move 动画加入当前回合队列
      this.currentTurnAnimations.push(animation);
      console.log(`[AnimationManager] 添加 move 动画到回合 ${this.currentTurn}: ${payload.side} → ${payload.targetSide}`);
    } else {
      // 其他动画直接加入队列
      this.queue.push(animation);
      this.processQueue();
    }
  }

  /**
   * 判断是否应该跳过动画（去重检查）
   */
  shouldSkipAnimation(type, payload) {
    // 1. 检查队列中是否有重复
    if (type !== 'move') {
      const hasDuplicate = this.queue.some(item => 
        item.type === type && 
        item.payload.side === payload.side
      );
      if (hasDuplicate) {
        console.log(`[AnimationManager] 跳过重复的 ${type} 动画 (side: ${payload.side})`);
        return true;
      }
    }
    
    // 2. 检查当前回合动画中是否有重复的 move
    if (type === 'move') {
      const moveKey = `${payload.side}-${payload.moveName || 'unknown'}-${payload.targetSide || ''}`;
      if (this.processedMoves.has(moveKey)) {
        console.log(`[AnimationManager] 跳过重复的 move 动画: ${moveKey}`);
        return true;
      }
      
      // 3. 检查同一 side 的 move 是否在短时间内重复（200ms 内）
      const lastTime = this.lastMoveTime.get(payload.side);
      if (lastTime && Date.now() - lastTime < 200) {
        console.log(`[AnimationManager] 跳过短时间内重复的 move 动画 (side: ${payload.side})`);
        return true;
      }
    }
    
    // 4. 检查当前正在执行的动画
    if (this.isRunning && this.queue.length > 0) {
      const current = this.queue[0];
      if (current.type === type && 
          current.type !== 'move' && 
          current.payload.side === payload.side) {
        console.log(`[AnimationManager] 当前正在执行相同的 ${type} 动画，跳过`);
        return true;
      }
    }
    
    return false;
  }

  processQueue() {
    if (this.isRunning || !this.queue.length) return;
    this.isRunning = true;
    const { type, payload } = this.queue.shift();
    const duration = this.execute(type, payload);
    
    // 如果是 move 动画，在动画结束后添加间隔（用于分隔双方动画）
    const nextDelay = (type === 'move' && this.shouldAddTurnInterval(payload)) 
      ? duration + this.turnInterval 
      : duration;
    
    this.queueTimer = setTimeout(() => {
      this.isRunning = false;
      this.queueTimer = null;
      this.processQueue();
    }, nextDelay || 600);
  }

  /**
   * 判断是否应该在 move 动画后添加回合间隔
   * 规则：如果下一个动画是另一个 side 的 move，则添加间隔
   */
  shouldAddTurnInterval(payload) {
    if (this.queue.length === 0) return false;
    const nextAnim = this.queue[0];
    if (nextAnim.type === 'move' && nextAnim.payload.side !== payload.side) {
      return true;
    }
    return false;
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
    this.currentTurnAnimations = [];
    this.isRunning = false;
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();
    this.processedMoves.clear();
    this.lastMoveTime.clear();
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
