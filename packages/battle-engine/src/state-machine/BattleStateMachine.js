/**
 * 对战状态机（BattleStateMachine）
 * 
 * 职责：
 * - 管理对战流程的状态转换
 * - 注册和管理各个阶段（Phase）实例
 * - 处理阶段之间的转换逻辑
 * - 提供事件总线用于阶段间通信
 * 
 * 状态转换流程：
 * team-loading → team-preview → pokemon-data → battle → end
 * 
 * 阶段管理：
 * - 每个阶段都是 PhaseBase 的子类
 * - 状态机负责调用阶段的 enter/exit 方法
 * - 阶段可以通过 transitionTo 方法请求转换
 * 
 * 事件系统：
 * - 使用 EventTarget 实现事件总线
 * - 支持 phase-changed 事件监听
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


