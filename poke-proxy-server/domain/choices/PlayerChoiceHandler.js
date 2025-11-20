/**
 * 玩家选择处理器（PlayerChoiceHandler）
 * 
 * 职责：
 * - 处理来自前端的玩家选择命令
 * - 验证选择的格式和有效性
 * - 管理待处理的 request 协议
 * - 设置超时机制（防止玩家长时间不选择）
 * 
 * 工作流程：
 * 1. 收到 request 协议 → 2. 保存到 pendingRequest → 3. 等待前端选择
 * 4. 收到选择命令 → 5. 验证选择 → 6. 发送到对战引擎
 * 
 * 选择格式：
 * - 队伍预览：'default' 或 'team X'（X为1-6）
 * - 对战：'move X'（使用第X个技能）、'switch X'（切换到第X个宝可梦）、'default'
 */
class PlayerChoiceHandler {
  /**
   * 构造函数
   * 
   * @param {string} side - 玩家方标识：'p1' 或 'p2'
   * @param {BattleManager} battleManager - 对战管理器实例
   */
  constructor(side, battleManager) {
    this.side = side; // 'p1' | 'p2'
    this.battleManager = battleManager;
    this.pendingRequest = null;
    this.connection = null; // WebSocket连接
    this.timeout = null;
  }

  /**
   * 设置WebSocket连接
   */
  setConnection(ws) {
    this.connection = ws;
    console.log(`[PlayerChoiceHandler] ${this.side} 连接已设置`);
  }

  /**
   * 处理 request 协议
   */
  handleRequest(request) {
    console.log(`[PlayerChoiceHandler] ${this.side} 收到 request 协议`);
    console.log(`[PlayerChoiceHandler] request 内容:`, JSON.stringify(request).substring(0, 500));
    
    this.pendingRequest = request;

    // 通知前端（通过WebSocket）
    // 注意：request 协议已经通过 omniscient 流转发给前端了
    // 这里不需要再次发送，前端会从 omniscient 流中收到
    // 但我们可以添加额外的元数据
    console.log(`[PlayerChoiceHandler] ${this.side} 等待前端选择`);

    // 设置超时（可选）
    if (request.teamPreview) {
      // 队伍预览：30秒超时
      this.setTimeout(30000, () => {
        if (this.pendingRequest && this.pendingRequest === request) {
          console.log(`[PlayerChoiceHandler] ${this.side} 选择超时，使用默认选择`);
          this.receiveChoice('default');
        }
      });
    }
  }

  /**
   * 接收玩家选择
   */
  receiveChoice(choice) {
    console.log(`[PlayerChoiceHandler] ${this.side} 收到选择: ${choice}`);
    console.log(`[PlayerChoiceHandler] ${this.side} 当前 pendingRequest:`, this.pendingRequest ? '存在' : 'null');
    
    if (!this.pendingRequest) {
      console.warn(`[PlayerChoiceHandler] ${this.side} 没有待处理的 request`);
      console.warn(`[PlayerChoiceHandler] ${this.side} 这可能是因为:`);
      console.warn(`[PlayerChoiceHandler] ${this.side} 1. request 协议还没有到达`);
      console.warn(`[PlayerChoiceHandler] ${this.side} 2. request 协议已被处理但没有保存`);
      console.warn(`[PlayerChoiceHandler] ${this.side} 3. request 协议路由有问题`);
      return false;
    }

    // 验证选择（简单验证）
    if (!this.validateChoice(choice, this.pendingRequest)) {
      console.error(`[PlayerChoiceHandler] ${this.side} 选择无效: ${choice}`);
      return false;
    }

    // 清除超时
    this.clearTimeout();

    // 发送到引擎
    const success = this.battleManager.sendChoice(this.side, choice);
    
    if (success) {
      this.pendingRequest = null;
      console.log(`[PlayerChoiceHandler] ${this.side} 选择已发送到引擎`);
    }

    return success;
  }

  /**
   * 验证选择
   */
  validateChoice(choice, request) {
    // 简单验证：检查选择格式
    if (request.teamPreview) {
      // 队伍预览：允许 'default' 或 'team X'
      return choice === 'default' || /^team \d+$/.test(choice);
    } else if (request.active) {
      // 对战：允许 'move X', 'switch X', 'default' 等
      return /^(move|switch|default)/.test(choice);
    }
    return true;
  }

  /**
   * 设置超时
   */
  setTimeout(ms, callback) {
    this.clearTimeout();
    this.timeout = setTimeout(callback, ms);
  }

  /**
   * 清除超时
   */
  clearTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  /**
   * 处理 switch 协议（状态更新）
   */
  handleSwitch(protocol) {
    // 可以在这里处理状态更新
    // 例如：更新UI、记录日志等
  }
}

module.exports = PlayerChoiceHandler;

