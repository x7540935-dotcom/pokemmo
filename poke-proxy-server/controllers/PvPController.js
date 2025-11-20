function createPvPController(deps = {}) {
  const {
    handleCreateRoom,
    handleJoinRoom,
    handlePvPStart,
    handleDisconnect,
  } = deps;

  if (typeof handleCreateRoom !== 'function' || typeof handleJoinRoom !== 'function') {
    throw new Error('[PvPController] 缺少房间处理函数');
  }

  return {
    createRoom: handleCreateRoom,
    joinRoom: handleJoinRoom,
    start: typeof handlePvPStart === 'function' ? handlePvPStart : async () => {},
    handleDisconnect: typeof handleDisconnect === 'function' ? handleDisconnect : () => {},
  };
}

module.exports = createPvPController;


