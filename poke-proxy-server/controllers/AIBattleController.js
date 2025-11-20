function createAIBattleController(deps = {}) {
  const { handleAIStart } = deps;
  if (typeof handleAIStart !== 'function') {
    throw new Error('[AIBattleController] handleAIStart 未提供');
  }

  return {
    async start(ws, payload) {
      return handleAIStart(ws, payload);
    },
  };
}

module.exports = createAIBattleController;


