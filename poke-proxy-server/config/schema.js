const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_DATA_ROOT = path.resolve(PROJECT_ROOT, '../data');
const DEFAULT_CACHE_ROOT = path.resolve(PROJECT_ROOT, '../cache');

function toInt(value, fallback, label) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[config] ${label || 'value'} 必须是正整数，收到: ${value}`);
  }
  return parsed;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function resolvePath(base, override, fallback) {
  if (override && typeof override === 'string') {
    return path.resolve(base, override);
  }
  return fallback;
}

function normalizeConfig(raw = {}) {
  const dataRoot = resolvePath(PROJECT_ROOT, raw.DATA_ROOT, DEFAULT_DATA_ROOT);
  const spritesDir = resolvePath(PROJECT_ROOT, raw.SPRITES_DIR, path.join(DEFAULT_CACHE_ROOT, 'sprites'));
  const chineseDex = resolvePath(
    PROJECT_ROOT,
    raw.CHINESE_DATA_PATH,
    path.join(dataRoot, 'chinese/pokedex-cn.json')
  );

  return {
    meta: {
      projectRoot: PROJECT_ROOT,
    },
    server: {
      port: toInt(raw.BATTLE_PORT, 3071, 'BATTLE_PORT'),
    },
    flags: {
      debugAI: toBool(raw.DEBUG_AI, false),
    },
    paths: {
      dataRoot,
      spritesDir,
      chineseDex,
    },
  };
}

module.exports = {
  normalizeConfig,
};


