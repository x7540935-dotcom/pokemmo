/**
 * 文本本地化辅助工具（Localization）
 * 
 * 职责：
 * - 加载中文翻译数据（宝可梦、技能、道具、特性）
 * - 提供翻译接口（translatePokemon, translateMove, translateItem, translateAbility）
 * - 标准化 ID 格式（用于查找翻译）
 * 
 * 数据来源：
 * - data/chinese/pokedex.json - 宝可梦名称翻译
 * - data/chinese/moves.json - 技能名称翻译
 * - data/chinese/items.json - 道具名称翻译
 * - data/chinese/abilities.json - 特性名称翻译
 * 
 * 使用方式：
 * 1. 初始化：await Localization.init()
 * 2. 检查就绪：Localization.isReady()
 * 3. 翻译：Localization.translatePokemon('charizard') // 返回 '喷火龙'
 */
class Localization {
  /**
   * 标准化 ID 格式
   * 
   * 功能：
   * - 将各种格式的标识符转换为标准格式（小写、移除特殊字符）
   * - 支持对象输入（自动提取 id, name, species 等字段）
   * 
   * @param {string|Object} value - 要标准化的值或对象
   * @returns {string} 标准化后的 ID（小写、无特殊字符）
   * 
   * 示例：
   * normalizeId('Charizard') -> 'charizard'
   * normalizeId('Charizard-Mega-X') -> 'charizardmegax'
   * normalizeId({ id: 'charizard' }) -> 'charizard'
   */
  static normalizeId(value) {
    if (!value) return '';
    if (typeof value === 'object') {
      return Localization.normalizeId(
        value.id ?? value.name ?? value.species ?? value.speciesid ?? value.nameId ?? value.move
      );
    }
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  /**
   * 初始化本地化系统
   * 
   * 功能：
   * - 异步加载所有中文翻译数据文件
   * - 支持多个数据路径（优先使用 data/chinese，回退到 data/data/chinese）
   * - 标记系统为就绪状态
   * - 使用 Promise 缓存，避免重复加载
   * 
   * @returns {Promise<Object>} 加载的数据对象，包含 pokedex, moves, items, abilities
   * 
   * 错误处理：
   * - 如果某个文件加载失败，返回空对象，不影响其他文件
   * - 记录警告日志，但不抛出错误
   */
  static async init() {
    if (this._initPromise) return this._initPromise;

    this._data = {
      pokedex: {},
      pokedexCn: {},
      moves: {},
      items: {},
      abilities: {},
    };

    const loadJson = async (path) => {
      try {
        const res = await fetch(path);
        if (!res.ok) {
          console.warn(`[Localization] 加载失败: ${path} (${res.status})`);
          return {};
        }
        return await res.json();
      } catch (error) {
        console.warn(`[Localization] 加载异常: ${path}`, error);
        return {};
      }
    };

    const loadAbilities = async () => {
      // abilities 有两个可能路径，优先使用 data/chinese，其次 data/data/chinese
      const primary = await loadJson('data/chinese/abilities.json');
      if (primary && Object.keys(primary).length > 0) return primary;
      return loadJson('data/data/chinese/abilities.json');
    };

    this._initPromise = Promise.all([
      loadJson('data/chinese/pokedex.json').then((data) => (this._data.pokedex = data || {})),
      loadJson('data/chinese/pokedex-cn.json').then((data) => (this._data.pokedexCn = data || {})),
      loadJson('data/chinese/moves.json').then((data) => (this._data.moves = data || {})),
      loadJson('data/chinese/items.json').then((data) => (this._data.items = data || {})),
      loadAbilities().then((data) => (this._data.abilities = data || {})),
    ]).then(() => {
      this._ready = true;
      console.log('[Localization] 中文数据加载完成');
      return this._data;
    }).catch((error) => {
      console.error('[Localization] 初始化失败:', error);
      this._ready = false;
      return this._data;
    });

    return this._initPromise;
  }

  static isReady() {
    return !!this._ready;
  }

  static translatePokemon(identifier) {
    const cnEntry = Localization._getPokedexCnEntry(identifier);
    if (cnEntry?.chineseName) {
      return cnEntry.chineseName;
    }
    return Localization._translate('pokedex', identifier);
  }

  static translateMove(identifier) {
    return Localization._translate('moves', identifier);
  }

  static translateItem(identifier) {
    return Localization._translate('items', identifier);
  }

  static translateAbility(identifier) {
    return Localization._translate('abilities', identifier);
  }

  static translateType(identifier) {
    if (!identifier) return '';
    const id = Localization.normalizeId(identifier);
    return Localization.TYPE_MAP[id] || identifier;
  }

  static translateCategory(category) {
    if (!category) return '';
    const key = String(category).toLowerCase();
    return Localization.CATEGORY_MAP[key] || category;
  }

  static _translate(domain, identifier) {
    if (!identifier) return '';
    const map = this._data?.[domain];
    if (!map) return identifier;
    const id = Localization.normalizeId(identifier);
    if (!id) return identifier;
    return map[id] || identifier;
  }

  /**
   * 获取宝可梦贴图路径（如果有本地资源则优先返回）
   * @param {string|Object} identifier
   * @returns {string} 本地贴图路径或空字符串
   */
  static getPokemonSpritePath(identifier) {
    const entry = Localization._getPokedexCnEntry(identifier);
    if (!entry) return '';
    if (entry.spriteFile) {
      return `cache/sprites/${entry.spriteFile}`;
    }
    if (entry.spriteUrl) {
      return entry.spriteUrl;
    }
    return '';
  }

  static hasChineseName(identifier) {
    if (!identifier) return false;
    const entry = Localization._getPokedexCnEntry(identifier);
    if (entry?.chineseName && entry.chineseName.trim().length > 0) {
      return true;
    }
    const map = this._data?.pokedex;
    if (!map) return false;
    const id = Localization.normalizeId(identifier);
    return !!(id && map[id]);
  }

  static hasSpriteAsset(identifier) {
    if (!identifier) return false;
    const entry = Localization._getPokedexCnEntry(identifier);
    if (!entry) return false;
    const spriteFile = entry.spriteFile?.trim();
    const spriteUrl = entry.spriteUrl?.trim();
    return !!(spriteFile || spriteUrl);
  }

  /**
   * 获取 pokedex-cn 中的原始数据条目
   * @param {string|Object} identifier
   * @returns {Object|null}
   */
  static _getPokedexCnEntry(identifier) {
    if (!identifier) return null;
    const map = this._data?.pokedexCn;
    if (!map) return null;
    const id = Localization.normalizeId(identifier);
    if (id && map[id]) return map[id];
    // 某些数据可能以原始 key 存在（未标准化）
    if (typeof identifier === 'string' && map[identifier]) return map[identifier];
    return null;
  }
}

Localization.TYPE_MAP = {
  normal: '一般',
  fire: '火',
  water: '水',
  electric: '电',
  grass: '草',
  ice: '冰',
  fighting: '格斗',
  poison: '毒',
  ground: '地面',
  flying: '飞行',
  psychic: '超能',
  bug: '虫',
  rock: '岩石',
  ghost: '幽灵',
  dragon: '龙',
  dark: '恶',
  steel: '钢',
  fairy: '妖精'
};

Localization.CATEGORY_MAP = {
  physical: '物理',
  special: '特殊',
  status: '变化'
};

export default Localization;

