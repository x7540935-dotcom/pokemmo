const WebSocket = require('ws');

/**
 * 房间类（Room）
 *
 * 职责：
 * - 管理真人对战（PvP）的房间状态
 * - 跟踪房间中的玩家连接和队伍
 * - 管理房间生命周期（waiting → ready → battling → ended）
 * - 提供广播消息功能
 */
class Room {
  constructor(roomId, creator) {
    this.roomId = roomId;
    this.creator = creator;
    this.players = {};
    this.teams = {};
    this.status = 'waiting';
    this.battleManager = null;
    this.createdAt = Date.now();
    this.timeout = null;
  }

  addPlayer(side, ws) {
    if (this.players[side]) {
      return false;
    }
    this.players[side] = ws;
    ws._side = side;
    ws._roomId = this.roomId;
    return true;
  }

  removePlayer(side) {
    if (this.players[side]) {
      delete this.players[side];
    }
  }

  setTeam(side, team) {
    this.teams[side] = team;
  }

  isReady() {
    return !!(this.players.p1 && this.players.p2 &&
      this.teams.p1 && this.teams.p2 &&
      (this.status === 'waiting' || this.status === 'ready'));
  }

  getStatus() {
    return {
      roomId: this.roomId,
      status: this.status,
      players: {
        p1: {
          connected: !!this.players.p1,
          teamReady: !!this.teams.p1,
        },
        p2: {
          connected: !!this.players.p2,
          teamReady: !!this.teams.p2,
        },
      },
    };
  }

  broadcast(message) {
    const msgStr = JSON.stringify(message);
    const sides = ['p1', 'p2'];
    sides.forEach((side) => {
      const ws = this.players[side];
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(msgStr);
        } catch (e) {
          console.error(`[Room] 发送消息到 ${side} 失败:`, e);
        }
      }
    });
  }

  destroy() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    if (this.battleManager) {
      this.battleManager = null;
    }
  }
}

module.exports = Room;


