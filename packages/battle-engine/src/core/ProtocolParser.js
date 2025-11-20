/**
 * 协议解析器（ProtocolParser）
 * 
 * 职责：
 * - 解析 Pokemon Showdown 协议消息（以 | 开头的格式）
 * - 提取协议类型和参数
 * - 支持注册协议处理器（观察者模式）
 * - 解析常见协议类型（request, switch, poke, damage, heal, teampreview, start, win, tie）
 * 
 * 协议格式：
 * - 标准格式：|protocol|param1|param2|param3|
 * - 示例：|poke|p1|Charizard, L50, F|
 * - 示例：|request|{"side":{"id":"p1","pokemon":[...]},"active":[...]}|
 * 
 * 使用场景：
 * - 解析从服务器接收到的协议消息
 * - 提取协议数据供其他模块使用
 */
class ProtocolParser {
  /**
   * 构造函数
   * 初始化协议处理器映射表
   */
  constructor() {
    this.handlers = new Map();  // 协议类型 -> 处理器函数数组的映射
  }

  /**
   * 注册协议处理器
   * 
   * 功能：
   * - 为指定的协议类型注册处理函数
   * - 当解析到该协议类型时，会调用所有注册的处理器
   * - 支持为同一协议类型注册多个处理器
   * 
   * @param {string} protocolType - 协议类型（如 'request', 'switch', 'poke'）
   * @param {Function} handler - 处理函数，接收 (parsed: Object) 参数
   */
  registerHandler(protocolType, handler) {
    if (!this.handlers.has(protocolType)) {
      this.handlers.set(protocolType, []);
    }
    this.handlers.get(protocolType).push(handler);
  }

  /**
   * 解析协议消息
   * 
   * 功能：
   * - 将消息块分割成多行，逐行解析
   * - 过滤空行
   * - 调用 parseLine 解析每行协议
   * - 通知所有注册的处理器
   * 
   * @param {string} chunk - 协议消息块（可能包含多行）
   * @returns {Array<Object>} - 解析结果数组，每个元素是一个协议对象
   */
  parse(chunk) {
    const lines = String(chunk).split('\n');
    const results = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = this.parseLine(line);
      if (parsed) {
        results.push(parsed);
        // 调用注册的处理器
        this.notifyHandlers(parsed);
      }
    }

    return results;
  }

  /**
   * 解析单行协议
   * 
   * 功能：
   * - 检查行是否以 | 开头（协议格式标识）
   * - 分割协议类型和参数
   * - 调用 parseSpecificProtocol 解析特定协议类型
   * 
   * @param {string} line - 单行协议字符串
   * @returns {Object|null} - 解析结果对象，包含：
   *   - type: 协议类型
   *   - raw: 原始行
   *   - parts: 参数数组
   *   - 其他协议特定字段（由 parseSpecificProtocol 添加）
   */
  parseLine(line) {
    if (!line.startsWith('|')) {
      return null;
    }

    const parts = line.slice(1).split('|');
    const type = parts[0];

    return {
      type: type,
      raw: line,
      parts: parts.slice(1),
      // 解析常见协议
      ...this.parseSpecificProtocol(type, parts.slice(1))
    };
  }

  /**
   * 解析特定协议类型
   * 
   * 功能：
   * - 根据协议类型，提取特定的数据字段
   * - 处理特殊格式（如 request 协议是 JSON 格式）
   * - 返回协议特定的数据对象
   * 
   * @param {string} type - 协议类型
   * @param {Array<string>} parts - 参数数组
   * @returns {Object} - 协议特定的数据对象
   * 
   * 支持的协议类型：
   * - request: 解析 JSON 格式的请求对象
   * - switch/drag: 提取宝可梦标识、详情、HP状态
   * - poke: 提取玩家、详情、道具
   * - damage/heal: 提取宝可梦标识、状态
   * - teampreview: 标记为队伍预览
   * - start: 标记为对战开始
   * - win: 提取获胜者
   * - tie: 标记为平局
   */
  parseSpecificProtocol(type, parts) {
    switch (type) {
      case 'request':
        try {
          const json = parts.join('|');
          return { request: JSON.parse(json) };
        } catch (e) {
          console.error('[ProtocolParser] 解析 request 失败:', e);
          return {};
        }

      case 'switch':
      case 'drag':
        return {
          pokemonId: parts[0]?.trim(),
          details: parts[1]?.trim(),
          hpStatus: parts[2]?.trim()
        };

      case 'poke':
        return {
          player: parts[0]?.trim(),
          details: parts[1]?.trim(),
          item: parts[2]?.trim()
        };

      case 'damage':
        return {
          pokemonId: parts[0]?.trim(),
          condition: parts[1]?.trim()
        };

      case 'heal':
        return {
          pokemonId: parts[0]?.trim(),
          condition: parts[1]?.trim()
        };

      case 'teampreview':
        return { teamPreview: true };

      case 'start':
        return { battleStarted: true };

      case 'win':
        return { winner: parts[0]?.trim() };

      case 'tie':
        return { tie: true };

      default:
        return {};
    }
  }

  /**
   * 通知处理器
   * 
   * 功能：
   * - 查找该协议类型的所有注册处理器
   * - 依次调用每个处理器，传入解析结果
   * - 捕获并记录处理器执行错误，避免影响其他处理器
   * 
   * @param {Object} parsed - 解析后的协议对象
   */
  notifyHandlers(parsed) {
    const handlers = this.handlers.get(parsed.type) || [];
    handlers.forEach(handler => {
      try {
        handler(parsed);
      } catch (e) {
        console.error(`[ProtocolParser] 处理器执行失败 (${parsed.type}):`, e);
      }
    });
  }
}

export default ProtocolParser;


