import {
  BattleEngine,
  ProtocolParser,
  StateManager,
  Localization,
  Logger,
  MoveDataHelper,
  PokemonUtils,
  SpriteLoader,
  AnimationManager,
  BattleStateMachine,
  PhaseBase,
  TeamLoadingPhase,
  TeamPreviewPhase,
  PokemonDataPhase,
  BattlePhase,
  BattleUI
} from './index.js';

const globalScope = typeof window !== 'undefined' ? window : globalThis;

const legacyExports = {
  BattleEngine,
  ProtocolParser,
  StateManager,
  Localization,
  Logger,
  MoveDataHelper,
  PokemonUtils,
  SpriteLoader,
  AnimationManager,
  BattleStateMachine,
  PhaseBase,
  TeamLoadingPhase,
  TeamPreviewPhase,
  PokemonDataPhase,
  BattlePhase,
  BattleUI,
};

Object.entries(legacyExports).forEach(([key, value]) => {
  if (value && !globalScope[key]) {
    globalScope[key] = value;
  }
});

if (!globalScope.PokemmoBattleEngine) {
  globalScope.PokemmoBattleEngine = legacyExports;
}

