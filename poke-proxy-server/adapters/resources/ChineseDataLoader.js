/**
 * 中文数据加载器（ChineseDataLoader）
 * 
 * 职责：
 * - 加载和管理中文翻译数据（宝可梦名称、技能、道具、特性等）
 * - 提供缓存机制，避免重复读取文件
 * - 支持文件变更监听（watch），自动重新加载
 * 
 * 数据格式：
 * - 从 JSON 文件加载，格式为 { [identifier]: { chineseName, spriteFile, spriteUrl, ... } }
 * - identifier 为标准化的小写标识符（如 'pikachu', 'charizard'）
 */
const fs = require('fs');
const path = require('path');

class ChineseDataLoader {
  /**
   * 构造函数
   * @param {string} dataPath - 中文数据文件路径
   * @param {Object} [options={}] - 选项
   *   - watch: 是否监听文件变更（默认 false）
   *   - cache: 是否启用缓存（默认 true）
   */
  constructor(dataPath, options = {}) {
    this.dataPath = path.resolve(dataPath);
    this.options = {
      watch: options.watch || false,
      cache: options.cache !== false,
      ...options
    };
    this._data = null;
    this._watcher = null;
    this._loadError = null;
  }

  /**
   * 加载数据
   * @param {boolean} [force=false] - 是否强制重新加载
   * @returns {Object} 中文数据对象
   */
  load(force = false) {
    if (this._data && !force && this.options.cache) {
      return this._data;
    }

    try {
      const content = fs.readFileSync(this.dataPath, 'utf8');
      this._data = JSON.parse(content);
      this._loadError = null;
      return this._data;
    } catch (error) {
      this._loadError = error;
      console.warn(`[ChineseDataLoader] 无法加载中文数据: ${error.message}`);
      return {};
    }
  }

  /**
   * 获取数据（自动加载）
   * @returns {Object} 中文数据对象
   */
  getData() {
    if (!this._data) {
      this.load();
    }
    return this._data || {};
  }

  /**
   * 获取指定标识符的中文数据
   * @param {string} identifier - 标准化标识符（如 'pikachu'）
   * @returns {Object|null} 中文数据条目，不存在返回 null
   */
  getEntry(identifier) {
    const data = this.getData();
    const normalized = this.normalizeIdentifier(identifier);
    return data[normalized] || null;
  }

  /**
   * 获取中文名称
   * @param {string} identifier - 标准化标识符
   * @returns {string|null} 中文名称，不存在返回 null
   */
  getChineseName(identifier) {
    const entry = this.getEntry(identifier);
    return entry?.chineseName || null;
  }

  /**
   * 标准化标识符
   * @param {string} value - 原始值
   * @returns {string} 标准化后的标识符（小写、去除特殊字符）
   */
  normalizeIdentifier(value) {
    if (!value) return '';
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  /**
   * 检查是否有中文数据和贴图
   * @param {string|Object} species - 宝可梦标识符或 species 对象
   * @param {Set<string>} [spriteFileSet] - 贴图文件集合（可选）
   * @returns {boolean} 是否有完整的中文数据和贴图
   */
  hasChineseAndSprite(species, spriteFileSet = null) {
    if (!species) return false;
    
    const identifier = typeof species === 'string' 
      ? this.normalizeIdentifier(species)
      : this.normalizeIdentifier(species.id || species.name);
    
    if (!identifier) return false;
    
    const entry = this.getEntry(identifier);
    if (!entry) return false;
    
    const hasChinese = typeof entry.chineseName === 'string' && entry.chineseName.trim().length > 0;
    if (!hasChinese) return false;
    
    const spriteFile = (entry.spriteFile || '').trim();
    const spriteUrl = (entry.spriteUrl || '').trim();
    
    if (spriteFile && spriteFileSet) {
      if (spriteFileSet.has(spriteFile)) {
        return true;
      }
    }
    
    return spriteUrl.length > 0;
  }

  /**
   * 启动文件监听
   */
  startWatch() {
    if (this._watcher || !this.options.watch) {
      return;
    }

    try {
      this._watcher = fs.watch(this.dataPath, (eventType) => {
        if (eventType === 'change') {
          console.log(`[ChineseDataLoader] 检测到文件变更，重新加载数据`);
          this.load(true);
        }
      });
      console.log(`[ChineseDataLoader] 已启动文件监听: ${this.dataPath}`);
    } catch (error) {
      console.warn(`[ChineseDataLoader] 无法启动文件监听: ${error.message}`);
    }
  }

  /**
   * 停止文件监听
   */
  stopWatch() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
      console.log(`[ChineseDataLoader] 已停止文件监听`);
    }
  }

  /**
   * 获取加载错误
   * @returns {Error|null} 加载错误，无错误返回 null
   */
  getLoadError() {
    return this._loadError;
  }

  /**
   * 获取数据统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const data = this.getData();
    return {
      totalEntries: Object.keys(data).length,
      hasError: !!this._loadError,
      errorMessage: this._loadError?.message || null,
      dataPath: this.dataPath,
      isWatching: !!this._watcher
    };
  }
}

module.exports = ChineseDataLoader;

