// 使用适配层访问 Pokemon Showdown
const showdownAdapter = require('../../adapters/pokemon-showdown/ShowdownAdapter');

class SimplePvPManager {
  constructor(formatid = 'gen9ou', seed = null) {
    this.formatid = formatid;
    this.seed = seed;
    this.battleStream = null;
    this.streams = null;
    this.connections = {};
    this.teams = {};
    this.isInitialized = false;
    this._cachedProtocols = {
      omniscient: [],
      p1: [],
      p2: [],
    };
  }

  async initialize(team1, team2) {
    this.teams.p1 = team1;
    this.teams.p2 = team2;

    this.battleStream = showdownAdapter.createBattleStream();
    this.streams = showdownAdapter.getPlayerStreams(this.battleStream);
    this.startStreamListeners();

    const formatid = this.formatid;
    const seed = this.seed;
    const startConfig = seed ? { formatid, seed } : { formatid };
    const initCommand = `>start ${JSON.stringify(startConfig)}\n>player p1 ${JSON.stringify({ name: 'Player 1', team: team1 })}\n>player p2 ${JSON.stringify({ name: 'Player 2', team: team2 })}`;
    this.battleStream.write(initCommand);
    this.isInitialized = true;
  }

  startStreamListeners() {
    (async () => {
      try {
        for await (const chunk of this.streams.omniscient) {
          const chunkStr = chunk.toString();
          this._cachedProtocols.omniscient.push(chunkStr);
          this.broadcast(chunkStr);
        }
      } catch (error) {
        console.error('[SimplePvPManager] omniscient 流错误:', error);
      }
    })();

    (async () => {
      try {
        for await (const chunk of this.streams.p1) {
          const chunkStr = chunk.toString();
          this._cachedProtocols.p1.push(chunkStr);
          this.sendTo('p1', chunkStr);
        }
      } catch (error) {
        console.error('[SimplePvPManager] p1 流错误:', error);
      }
    })();

    (async () => {
      try {
        for await (const chunk of this.streams.p2) {
          const chunkStr = chunk.toString();
          this._cachedProtocols.p2.push(chunkStr);
          this.sendTo('p2', chunkStr);
        }
      } catch (error) {
        console.error('[SimplePvPManager] p2 流错误:', error);
      }
    })();
  }

  broadcast(message) {
    Object.values(this.connections).forEach((ws) => {
      if (ws && ws.readyState === 1) {
        ws.send(message);
      }
    });
  }

  sendTo(side, message) {
    const ws = this.connections[side];
    if (ws && ws.readyState === 1) {
      ws.send(message);
    }
  }

  addConnection(side, ws) {
    const oldWs = this.connections[side];
    if (oldWs && oldWs.readyState === 1) {
      try {
        oldWs.close(1000, 'Replaced by new connection');
      } catch (e) {
        console.warn('[SimplePvPManager] 关闭旧连接失败:', e);
      }
    }

    this.connections[side] = ws;

    if (oldWs) {
      ws.send(JSON.stringify({ type: 'battle-reconnected', payload: { side, message: '重连成功' } }));
      this.resendCachedProtocols(side, ws);
    } else {
      this.resendCachedProtocols(side, ws);
    }

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'choose') {
          this.handlePlayerChoice(side, message.command);
        }
      } catch (e) {
        const command = data.toString().trim();
        if (command && !command.startsWith('{')) {
          this.handlePlayerChoice(side, command);
        }
      }
    });
  }

  handlePlayerChoice(side, command) {
    if (!this.streams) {
      return false;
    }
    try {
      const stream = side === 'p1' ? this.streams.p1 : this.streams.p2;
      stream.write(command);
      return true;
    } catch (e) {
      console.error(`[SimplePvPManager] 发送选择失败:`, e);
      return false;
    }
  }

  resendCachedProtocols(side, ws) {
    if (!ws || ws.readyState !== 1) {
      return;
    }
    this._cachedProtocols.omniscient.forEach((protocol) => {
      try {
        ws.send(protocol);
      } catch (e) {
        console.error('[SimplePvPManager] 重发 omniscient 协议失败:', e);
      }
    });
    const playerProtocols = side === 'p1' ? this._cachedProtocols.p1 : this._cachedProtocols.p2;
    playerProtocols.forEach((protocol) => {
      try {
        ws.send(protocol);
      } catch (e) {
        console.error('[SimplePvPManager] 重发玩家协议失败:', e);
      }
    });
  }

  removeConnection(side) {
    delete this.connections[side];
  }

  allPlayersConnected() {
    return !!this.connections.p1 && !!this.connections.p2;
  }

  destroy() {
    Object.values(this.connections).forEach((ws) => {
      if (ws && ws.readyState === 1) {
        try {
          ws.close(1000, 'Battle ended');
        } catch (e) {
          // ignore
        }
      }
    });
    this.connections = {};
    this.battleStream = null;
    this.streams = null;
    this.isInitialized = false;
  }
}

module.exports = SimplePvPManager;


