import {
  BattleEngine,
  StateManager,
  Localization,
  MoveDataHelper,
  PokemonUtils
} from '../src/index.js';

async function run() {
  console.log('[SmokeTest] 初始化 BattleEngine/StateManager');
  const engine = new BattleEngine();
  const state = new StateManager();

  console.log('[SmokeTest] 默认连接状态:', engine.isConnected);
  state.setPlayerTeam([{ name: 'Pikachu', moves: ['thunderbolt'] }]);

console.log('[SmokeTest] Localization 可用:', typeof Localization.init === 'function');
if (typeof Localization._data === 'undefined') {
  Localization._data = { pokedex: {}, moves: {} };
}

  console.log('[SmokeTest] MoveDataHelper 示例:', MoveDataHelper.getMoveName('thunderbolt'));
  console.log('[SmokeTest] PokemonUtils 示例:', PokemonUtils.getDisplayName({ name: 'Charizard' }, 1));

  console.log('[SmokeTest] ✅ 所有模块加载成功');
}

run().catch((error) => {
  console.error('[SmokeTest] ❌ 失败', error);
  process.exitCode = 1;
});

