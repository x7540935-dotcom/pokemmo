import Localization from './Localization.js';
import SpriteLoader from './SpriteLoader.js';

/**
 * 宝可梦工具函数（PokemonUtils）
 * 
 * 职责：
 * - 统一处理宝可梦相关的工具函数，避免代码重复
 * - 提取和标准化宝可梦数据
 * - 提供翻译和显示名称的便捷方法
 * - 验证宝可梦数据的有效性
 * 
 * 使用场景：
 * - 从协议消息中提取宝可梦信息
 * - 标准化宝可梦 ID 格式
 * - 获取中文翻译名称用于 UI 显示
 */
class PokemonUtils {
  /**
   * 从宝可梦对象中提取species名称
   * 
   * 功能：
   * - 支持从多个字段提取物种名（优先级：details > ident > species > name > nameId）
   * - 处理不同格式的数据（details 格式: "Charizard, L50, F"）
   * - 处理 ident 格式（格式: "p1: Charizard"）
   * 
   * @param {Object} pokemon - 宝可梦对象
   * @param {string} [pokemon.details] - 详细信息（格式: "Charizard, L50, F"）
   * @param {string} [pokemon.ident] - 标识符（格式: "p1: Charizard"）
   * @param {string} [pokemon.species] - 物种名
   * @param {string} [pokemon.name] - 名字
   * @param {string} [pokemon.nameId] - ID格式的名字
   * @returns {string} 提取的species名称，如果无法提取则返回空字符串
   */
  static extractSpeciesName(pokemon) {
    if (!pokemon) return '';
    
    // 优先从 details 提取（格式: "Charizard, L50, F"）
    if (pokemon.details) {
      return SpriteLoader.extractSpeciesFromDetails(pokemon.details);
    }
    
    // 从 ident 提取（格式: "p1: Charizard"）
    if (pokemon.ident) {
      const parts = pokemon.ident.split(':');
      if (parts.length > 1) {
        return parts[1].trim();
      }
      return pokemon.ident;
    }
    
    // 降级到其他字段
    return pokemon.species || pokemon.name || pokemon.nameId || '';
  }

  /**
   * 标准化species ID格式
   * 将species名称转换为标准ID格式（小写、移除特殊字符）
   * 
   * @param {string} speciesName - Species名称
   * @returns {string} 标准化后的ID
   */
  static normalizeSpeciesId(speciesName) {
    if (!speciesName) return '';
    
    // 使用 Localization 的 normalizeId 方法（如果可用）
    if (Localization && typeof Localization.normalizeId === 'function') {
      return Localization.normalizeId(speciesName);
    }
    
    // 降级处理：转换为小写，移除特殊字符
    return speciesName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  /**
   * 翻译宝可梦名称
   * 返回中文翻译，如果翻译失败则返回原始名称
   * 
   * @param {Object} pokemon - 宝可梦对象
   * @returns {string} 翻译后的名称
   */
  static translateSpeciesName(pokemon) {
    const speciesName = this.extractSpeciesName(pokemon);
    if (!speciesName) return '';
    
    // 转换为标准ID
    const speciesId = this.normalizeSpeciesId(speciesName);
    
    // 尝试翻译
    if (Localization && Localization.isReady?.() && speciesId) {
      const translated = Localization.translatePokemon(speciesId);
      // 如果翻译成功（返回值不等于输入值），使用翻译
      if (translated && translated !== speciesId) {
        return translated;
      }
    }
    
    // 翻译失败，返回原始名称
    return speciesName;
  }

  /**
   * 获取宝可梦显示名称（用于UI）
   * 优先使用翻译，失败则使用原始名称
   * 
   * @param {Object} pokemon - 宝可梦对象
   * @param {number} fallbackIndex - 如果都失败，使用的后备索引（如 "宝可梦1"）
   * @returns {string} 显示名称
   */
  static getDisplayName(pokemon, fallbackIndex = null) {
    const translated = this.translateSpeciesName(pokemon);
    if (translated) return translated;
    
    const speciesName = this.extractSpeciesName(pokemon);
    if (speciesName) return speciesName;
    
    if (fallbackIndex !== null) {
      return `宝可梦${fallbackIndex}`;
    }
    
    return 'Unknown';
  }

  /**
   * 验证宝可梦数据
   * 检查必填字段是否存在
   * 
   * @param {Object} pokemon - 宝可梦对象
   * @returns {boolean} 是否有效
   */
  static isValid(pokemon) {
    if (!pokemon) return false;
    
    const name = this.extractSpeciesName(pokemon);
    return name.length > 0;
  }

  /**
   * 从多个字段获取species ID（兼容性方法）
   * 支持多种字段名格式
   * 
   * @param {Object} pokemon - 宝可梦对象
   * @returns {string} Species ID
   */
  static getSpeciesId(pokemon) {
    const speciesName = this.extractSpeciesName(pokemon);
    return this.normalizeSpeciesId(speciesName);
  }
}

export default PokemonUtils;

