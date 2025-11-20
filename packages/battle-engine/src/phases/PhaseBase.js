/**
 * 阶段基类（PhaseBase）
 * 
 * 职责：
 * - 定义所有对战阶段的通用接口和行为
 * - 管理阶段的激活状态
 * - 提供阶段转换的接口
 * - 定义生命周期方法（enter, exit, handleProtocol, handleUserAction）
 * 
 * 阶段系统：
 * - 采用状态机模式，将对战流程分为多个阶段
 * - 每个阶段负责处理特定的对战状态和协议
 * - 阶段之间通过 transitionTo 方法转换
 * 
 * 生命周期：
 * 1. enter(data) - 进入阶段时调用
 * 2. handleProtocol(line) - 处理协议消息
 * 3. handleUserAction(action, data) - 处理用户操作
 * 4. exit() - 退出阶段时调用
 */
class PhaseBase {
  /**
   * 构造函数
   * 
   * @param {string} name - 阶段名称（如 'team-loading', 'team-preview', 'battle'）
   */
  constructor(name) {
    this.name = name;              // 阶段名称
    this.stateMachine = null;       // 状态机引用（由状态机设置）
    this.isActive = false;         // 是否处于激活状态
  }

  /**
   * 设置状态机引用
   * 
   * 功能：
   * - 由状态机调用，建立阶段与状态机的双向引用
   * - 使阶段能够通过 transitionTo 方法转换到其他阶段
   * 
   * @param {BattleStateMachine} stateMachine - 状态机实例
   */
  setStateMachine(stateMachine) {
    this.stateMachine = stateMachine;
  }

  /**
   * 进入阶段
   * 
   * 功能：
   * - 标记阶段为激活状态
   * - 调用子类实现的 onEnter 方法
   * - 记录日志
   * 
   * @param {Object} [data={}] - 传递给阶段的数据（可选）
   */
  enter(data = {}) {
    this.isActive = true;
    console.log(`[Phase] 进入阶段: ${this.name}`, data);
    this.onEnter(data);
  }

  /**
   * 退出阶段
   * 
   * 功能：
   * - 标记阶段为非激活状态
   * - 调用子类实现的 onExit 方法
   * - 记录日志
   */
  exit() {
    this.isActive = false;
    console.log(`[Phase] 退出阶段: ${this.name}`);
    this.onExit();
  }

  /**
   * 处理协议消息
   * 
   * 功能：
   * - 由状态机调用，处理从服务器接收到的协议消息
   * - 子类应该重写此方法来实现特定的协议处理逻辑
   * 
   * @param {string} line - 协议行字符串（如 '|request|{...}|'）
   */
  handleProtocol(line) {
    // 默认不处理，子类重写
  }

  /**
   * 处理用户操作
   * 
   * 功能：
   * - 由 UI 模块调用，处理用户的交互操作
   * - 子类应该重写此方法来实现特定的操作处理逻辑
   * 
   * @param {string} action - 操作类型（如 'use-move', 'switch-pokemon', 'select-lead'）
   * @param {Object} data - 操作数据（如 { moveIndex: 1 }, { position: 2 }）
   */
  handleUserAction(action, data) {
    // 默认不处理，子类重写
  }

  /**
   * 子类实现的进入逻辑
   * 
   * 功能：
   * - 子类必须实现此方法
   * - 在阶段进入时执行初始化操作
   * - 如：加载数据、显示UI、设置定时器等
   * 
   * @param {Object} data - 传递给阶段的数据
   */
  onEnter(data) {
    // 子类实现
  }

  /**
   * 子类实现的退出逻辑
   * 
   * 功能：
   * - 子类可以重写此方法
   * - 在阶段退出时执行清理操作
   * - 如：清理定时器、隐藏UI、保存状态等
   */
  onExit() {
    // 子类实现
  }

  /**
   * 转换到下一个阶段
   * 
   * 功能：
   * - 通过状态机转换到指定的阶段
   * - 传递数据给目标阶段
   * 
   * @param {string} phaseName - 目标阶段名称（如 'team-preview', 'battle'）
   * @param {Object} [data={}] - 传递给目标阶段的数据（可选）
   */
  transitionTo(phaseName, data = {}) {
    if (this.stateMachine) {
      this.stateMachine.transitionTo(phaseName, data);
    }
  }
}

export default PhaseBase;


