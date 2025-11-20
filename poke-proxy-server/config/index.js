const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { normalizeConfig } = require('./schema');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.resolve(PROJECT_ROOT, '.env');

if (fs.existsSync(ENV_PATH)) {
  dotenv.config({ path: ENV_PATH });
} else {
  dotenv.config();
}

const raw = {
  BATTLE_PORT: process.env.BATTLE_PORT,
  DEBUG_AI: process.env.DEBUG_AI,
  DATA_ROOT: process.env.DATA_ROOT,
  SPRITES_DIR: process.env.SPRITES_DIR,
  CHINESE_DATA_PATH: process.env.CHINESE_DATA_PATH,
};

const config = normalizeConfig(raw);

module.exports = config;


