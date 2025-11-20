/**
 * 贴图文件管理器（SpriteFileManager）
 * 
 * 职责：
 * - 管理本地贴图文件目录
 * - 提供贴图文件存在性检查
 * - 缓存文件列表，避免重复读取目录
 * 
 * 使用场景：
 * - 检查宝可梦贴图是否已缓存
 * - 生成缺失贴图报告
 * - 为前端提供贴图 URL
 */
const fs = require('fs');
const path = require('path');

class SpriteFileManager {
  /**
   * 构造函数
   * @param {string} spritesDir - 贴图目录路径
   * @param {Object} [options={}] - 选项
   *   - cache: 是否启用缓存（默认 true）
   *   - watch: 是否监听目录变更（默认 false）
   */
  constructor(spritesDir, options = {}) {
    this.spritesDir = path.resolve(spritesDir);
    this.options = {
      cache: options.cache !== false,
      watch: options.watch || false,
      ...options
    };
    this._fileSet = null;
    this._lastScanTime = null;
  }

  /**
   * 扫描目录并构建文件集合
   * @param {boolean} [force=false] - 是否强制重新扫描
   * @returns {Set<string>} 文件名集合
   */
  scan(force = false) {
    if (this._fileSet && !force && this.options.cache) {
      return this._fileSet;
    }

    try {
      const files = fs.readdirSync(this.spritesDir);
      this._fileSet = new Set(files);
      this._lastScanTime = Date.now();
      return this._fileSet;
    } catch (error) {
      console.warn(`[SpriteFileManager] 无法读取贴图目录: ${error.message}`);
      this._fileSet = new Set();
      return this._fileSet;
    }
  }

  /**
   * 获取文件集合（自动扫描）
   * @returns {Set<string>} 文件名集合
   */
  getFileSet() {
    if (!this._fileSet) {
      this.scan();
    }
    return this._fileSet;
  }

  /**
   * 检查文件是否存在
   * @param {string} filename - 文件名
   * @returns {boolean} 文件是否存在
   */
  hasFile(filename) {
    const fileSet = this.getFileSet();
    return fileSet.has(filename);
  }

  /**
   * 获取文件完整路径
   * @param {string} filename - 文件名
   * @returns {string} 文件完整路径
   */
  getFilePath(filename) {
    return path.join(this.spritesDir, filename);
  }

  /**
   * 检查文件是否存在（通过文件系统）
   * @param {string} filename - 文件名
   * @returns {boolean} 文件是否存在
   */
  fileExists(filename) {
    try {
      const filePath = this.getFilePath(filename);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * 获取所有文件列表
   * @returns {Array<string>} 文件名数组
   */
  getAllFiles() {
    const fileSet = this.getFileSet();
    return Array.from(fileSet);
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const fileSet = this.getFileSet();
    return {
      totalFiles: fileSet.size,
      spritesDir: this.spritesDir,
      lastScanTime: this._lastScanTime,
      isCached: !!this._fileSet
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this._fileSet = null;
    this._lastScanTime = null;
  }
}

module.exports = SpriteFileManager;

