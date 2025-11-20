import Localization from './Localization.js';

/**
 * 精灵图片加载器（SpriteLoader）
 * 
 * 职责：
 * - 生成宝可梦精灵图片的 URL
 * - 从 details 字符串中提取物种名
 * - 处理特殊格式的宝可梦名称（如 Nidoran-F, Nidoran-M）
 * 
 * 图片源：
 * - 使用 Pokemon Showdown 官方图片服务器
 * - URL 格式：https://play.pokemonshowdown.com/sprites/xyani/{nameId}.gif
 */
class SpriteLoader {
  /**
   * 获取宝可梦图片URL
   * 
   * 功能：
   * - 将宝可梦名称转换为标准格式（小写、移除特殊字符）
   * - 处理特殊情况的宝可梦（如 Nidoran-F, Nidoran-M, Farfetch'd）
   * - 生成 Pokemon Showdown 官方图片 URL
   * 
   * @param {string} species - 宝可梦物种名称（如 'Charizard', 'Nidoran-F'）
   * @returns {string} 图片 URL，如果输入为空则返回空字符串
   * 
   * 示例：
   * getPokemonSpriteUrl('Charizard') -> 'https://play.pokemonshowdown.com/sprites/xyani/charizard.gif'
   * getPokemonSpriteUrl('Nidoran-F') -> 'https://play.pokemonshowdown.com/sprites/xyani/nidoranf.gif'
   */
  static getPokemonSpriteUrl(species) {
    if (!species) return '';
    
    // 处理特殊形式
    let nameId = species.toLowerCase()
      .replace(/-/g, '')
      .replace(/[^a-z0-9]/g, '');
    
    // 特殊处理
    const specialCases = {
      'nidoranf': 'nidoranf',
      'nidoranm': 'nidoranm',
      'farfetchd': 'farfetchd',
      'sirfetchd': 'sirfetchd',
      'mrmime': 'mrmime',
      'mimejr': 'mimejr',
      'typenull': 'typenull',
    };
    nameId = specialCases[nameId] || nameId;
    
    return `https://play.pokemonshowdown.com/sprites/xyani/${nameId}.gif`;
  }

  /**
   * 获取本地或备选贴图路径
   * @param {string} species
   * @returns {string}
   */
  static getLocalSpriteUrl(species) {
    if (!species) return '';
    if (Localization?.getPokemonSpritePath) {
      return Localization.getPokemonSpritePath(species) || '';
    }
    return '';
  }

  /**
   * 将贴图应用到图片元素，支持远程优先、本地兜底
   * @param {HTMLImageElement} imgEl
   * @param {string} species
   */
  static applySpriteToImage(imgEl, species) {
    if (!imgEl || !species) return;
    const primary = SpriteLoader.getPokemonSpriteUrl(species);
    const fallback = SpriteLoader.getLocalSpriteUrl(species);
    
    imgEl.dataset.spriteFallbackApplied = '0';
    if (fallback) {
      imgEl.dataset.spriteFallback = fallback;
      imgEl.onerror = () => {
        if (imgEl.dataset.spriteFallbackApplied === '1') {
          imgEl.onerror = null;
          return;
        }
        imgEl.dataset.spriteFallbackApplied = '1';
        imgEl.src = fallback;
      };
    } else {
      imgEl.removeAttribute?.('data-sprite-fallback');
      imgEl.onerror = () => {
        imgEl.onerror = null;
      };
    }
    
    if (primary) {
      imgEl.src = primary;
    } else if (fallback) {
      imgEl.dataset.spriteFallbackApplied = '1';
      imgEl.src = fallback;
    }
  }

  /**
   * 从 details 字符串提取物种名
   * 
   * 功能：
   * - 从 Pokemon Showdown 的 details 格式中提取物种名
   * - details 格式："{Species}, L{Level}, {Gender}"，如 "Charizard, L50, F"
   * - 提取逗号前的部分作为物种名
   * 
   * @param {string} details - 详细信息字符串（如 "Charizard, L50, F"）
   * @returns {string} 提取的物种名（如 "Charizard"），如果输入为空则返回空字符串
   * 
   * 示例：
   * extractSpeciesFromDetails('Charizard, L50, F') -> 'Charizard'
   * extractSpeciesFromDetails('Pikachu, L100, M') -> 'Pikachu'
   */
  static extractSpeciesFromDetails(details) {
    if (!details) return '';
    const match = details.match(/^([^,]+)/);
    return match ? match[1].trim() : details.trim();
  }
}

export default SpriteLoader;


