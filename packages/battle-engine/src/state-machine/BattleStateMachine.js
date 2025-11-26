/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 对战状态机（BattleStateMachine.js）- 阶段流程控制中心
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * BattleStateMachine 是对战流程的协调中心，负责：
 *   1. 阶段管理
 *      - 注册所有 Phase 实例
 *      - 管理当前活跃阶段
 *      - 处理阶段转换逻辑
 * 
 *   2. 状态转换
 *      - 调用当前阶段的 exit() 方法
 *      - 调用新阶段的 enter() 方法
 *      - 记录转换性能指标
 * 
 *   3. 事件通信
 *      - 使用 EventTarget 实现事件总线
 *      - 发送 phase-changed 事件
 *      - 支持跨阶段通信
 * 
 * 🔄 状态转换流程
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *   team-loading → team-preview → pokemon-data → battle → end
 *        │              │              │           │        │
 *        ▼              ▼              ▼           ▼        ▼
 *    加载队伍      选择首发      加载数据     对战阶段   结束
 * 
 * 转换触发方式：
 *   - Phase 内部调用 this.transitionTo('next-phase')
 *   - 通过协议触发（如 |start| → battle）
 * 
 * 🏗️ 架构设计
 * ──────────────────────────────────────────────────────────────────────────
 * 
 *              BattleStateMachine
 *                     │
 *          ┌──────────┼──────────┐
 *          │          │          │
 *     phases{}   currentPhase  eventBus
 *    (阶段映射)   (当前阶段)   (事件总线)
 *          │          │          │
 *          └──────────┼──────────┘
 *                     │
 *          ┌──────────▼──────────┐
 *          │   Phase 实例        │
 *          │  - TeamLoadingPhase │
 *          │  - TeamPreviewPhase │
 *          │  - PokemonDataPhase │
 *          │  - BattlePhase      │
 *          └─────────────────────┘
 * 
 * ⚠️ 注意事项
 * ──────────────────────────────────────────────────────────────────────────
 * - 所有阶段都继承自 PhaseBase
 * - 阶段转换时会自动记录性能指标
 * - 事件监听器可以监听 phase-changed 事件
 */
class BattleStateMachine {
  /**
   * 构造函数
   * 初始化阶段映射表和事件总线
   */
  constructor() {
    this.currentPhase = null;
    this.phases = {};
    this.eventBus = new EventTarget();
  }

  /**
   * 注册阶段
   */
  registerPhase(name, phaseInstance) {
    this.phases[name] = phaseInstance;
    phaseInstance.setStateMachine(this);
  }

  /**
   * 转换到指定阶段
   */
  transitionTo(phaseName, data = {}) {
    const fromPhase = this.currentPhase?.name || 'null';
    const transitionStartTime = performance.now();
    
    console.log(`[StateMachine] 状态转换: ${fromPhase} -> ${phaseName}`);
    
    // 退出当前阶段
    if (this.currentPhase) {
      this.currentPhase.exit();
    }

    // 进入新阶段
    const nextPhase = this.phases[phaseName];
    if (!nextPhase) {
      console.error(`[StateMachine] 阶段不存在: ${phaseName}`);
      return;
    }

    this.currentPhase = nextPhase;
    this.currentPhase.enter(data);

    // 记录阶段转换时间
    const transitionTime = performance.now() - transitionStartTime;
    try {
      import('../utils/PerformanceMonitor.js').then(({ getGlobalMonitor }) => {
        const monitor = getGlobalMonitor();
        monitor.recordPhaseTransitionTime(fromPhase, phaseName, transitionTime);
      }).catch(() => {
        // 忽略错误
      });
    } catch (error) {
      // 忽略错误
    }

    // 触发状态转换事件
    this.eventBus.dispatchEvent(new CustomEvent('phase-changed', {
      detail: { from: fromPhase, to: phaseName, data }
    }));
  }

  /**
   * 获取当前阶段
   */
  getCurrentPhase() {
    return this.currentPhase;
  }

  /**
   * 添加事件监听
   */
  on(event, handler) {
    this.eventBus.addEventListener(event, handler);
  }

  /**
   * 移除事件监听
   */
  off(event, handler) {
    this.eventBus.removeEventListener(event, handler);
  }
}

export default BattleStateMachine;


