import Localization from './Localization.js';

/**
 * 技能数据辅助工具（MoveDataHelper）
 * 
 * 职责：
 * - 从技能ID获取技能名称和详细信息
 * - 格式化技能显示文本（包含PP信息）
 * - 规范化技能数据格式（统一不同来源的技能数据）
 * 
 * 使用场景：
 * - 在 BattlePhase 中规范化从 request 协议获取的技能数据
 * - 在 BattleUI 中格式化技能按钮的显示文本
 * 
 * 数据源：
 * - Localization: 中文翻译
 * - BattleMovedex: Pokemon Showdown 的技能数据（如果可用）
 */
class MoveDataHelper {
  /**
   * 获取技能名称
   * 
   * 功能：
   * - 优先使用 Localization 获取中文翻译
   * - 如果翻译失败，使用 BattleMovedex 获取英文名称
   * - 如果都失败，返回ID的首字母大写形式
   * 
   * @param {string} moveId - 技能ID（如 "thunderbolt"）
   * @returns {string} 技能名称（如 "十万伏特" 或 "Thunderbolt"）
   */
  static getMoveName(moveId) {
    if (!moveId) return '未知技能';
    
    if (Localization && Localization.isReady?.()) {
      const localized = Localization.translateMove(moveId);
      if (localized && localized !== moveId) {
        return localized;
      }
    }

    // 如果全局有 BattleMovedex，使用它
    if (typeof window !== 'undefined' && window.BattleMovedex && window.BattleMovedex[moveId]) {
      return window.BattleMovedex[moveId].name || moveId;
    }
    
    // 否则返回ID本身（首字母大写）
    return moveId.charAt(0).toUpperCase() + moveId.slice(1);
  }

  /**
   * 格式化技能显示文本
   * @param {Object} move - 技能对象（可能包含 move, id, name, pp, maxpp 等）
   * @returns {string} 格式化后的文本
   */
  static formatMoveText(move) {
    if (!move) return '未知技能';
    
    // 获取技能名称
    const moveId = move.move || move.id || move.name || '';
    const moveName = this.getMoveName(moveId);
    
    // 获取PP信息
    if (move.pp !== undefined && move.maxpp !== undefined) {
      return `${moveName} (${move.pp}/${move.maxpp})`;
    } else if (move.maxpp !== undefined) {
      return `${moveName} (/${move.maxpp})`;
    }
    
    return moveName;
  }

  /**
   * 处理技能数组，确保格式统一
   * @param {Array} moves - 技能数组（可能包含各种格式）
   * @returns {Array} 统一格式的技能数组
   */
  static normalizeMoves(moves) {
    if (!Array.isArray(moves)) {
      return [];
    }

    return moves.map((move, index) => {
      // 如果已经是对象
      if (typeof move === 'object' && move !== null) {
        return {
          id: move.move || move.id || move.name || `move${index + 1}`,
          name: move.name || this.getMoveName(move.move || move.id || move.name),
          pp: move.pp,
          maxpp: move.maxpp,
          disabled: move.disabled || false,
          target: move.target,
          type: move.type,
          ...move
        };
      }
      
      // 如果是字符串（技能ID）
      if (typeof move === 'string') {
        return {
          id: move,
          name: this.getMoveName(move),
          pp: undefined,
          maxpp: undefined,
          disabled: false
        };
      }
      
      // 默认值
      return {
        id: `move${index + 1}`,
        name: `技能${index + 1}`,
        pp: undefined,
        maxpp: undefined,
        disabled: false
      };
    });
  }
}

export default MoveDataHelper;


