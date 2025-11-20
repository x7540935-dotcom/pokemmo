const Room = require('./Room');
const createLogger = require('../../adapters/logging/Logger');
const logger = createLogger('RoomManager');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return roomId;
  }

  createRoom(ws) {
    const roomId = this.generateRoomId();
    const room = new Room(roomId, ws);
    room.timeout = setTimeout(() => {
      this.deleteRoom(roomId);
    }, 10 * 60 * 1000);
    this.rooms.set(roomId, room);
    logger.info(`创建房间: ${roomId}`);
    return room;
  }

  joinRoom(roomId, ws) {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`房间不存在: ${roomId}`);
      return null;
    }
    if (room.status !== 'waiting') {
      logger.warn(`房间状态不是waiting: ${room.status}`);
      return null;
    }
    // 检查房间是否已满（必须在尝试添加之前检查）
    if (room.players.p1 && room.players.p2) {
      logger.warn(`房间已满: ${roomId}`);
      return null;
    }
    let side = null;
    if (!room.players.p1) {
      side = 'p1';
    } else if (!room.players.p2) {
      side = 'p2';
    } else {
      // 理论上不应该到达这里，因为上面已经检查了
      logger.warn(`房间已满: ${roomId}`);
      return null;
    }
    if (room.addPlayer(side, ws)) {
      if (room.timeout) clearTimeout(room.timeout);
      logger.info(`玩家加入房间: ${roomId}, side: ${side}`);
      return room;
    }
    return null;
  }

  findRoomByConnection(ws) {
    for (const room of this.rooms.values()) {
      // 检查是否是房间中的玩家
      if (room.players.p1 === ws || room.players.p2 === ws) {
        return room;
      }
      // 检查是否是房间创建者（即使还没有通过 addPlayer 添加）
      if (room.creator === ws) {
        return room;
      }
    }
    return null;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.broadcast({
        type: 'room-closed',
        payload: { reason: 'timeout' },
      });
      room.destroy();
      this.rooms.delete(roomId);
      logger.info(`删除房间: ${roomId}`);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.status === 'waiting' && now - room.createdAt > 30 * 60 * 1000) {
        this.deleteRoom(roomId);
      }
    }
  }

  validateTeam(team) {
    if (!Array.isArray(team) || team.length === 0 || team.length > 6) {
      return { valid: false, error: '队伍数量必须在1-6之间' };
    }
    for (const pokemon of team) {
      if (!pokemon.species && !pokemon.name) {
        return { valid: false, error: '宝可梦缺少species或name字段' };
      }
      if (pokemon.moves && pokemon.moves.length > 4) {
        return { valid: false, error: '每个宝可梦最多4个技能' };
      }
    }
    return { valid: true };
  }

  /**
   * 获取房间统计信息
   * @returns {Object} 统计结果
   */
  getStats() {
    const stats = {
      totalRooms: this.rooms.size,
      waitingRooms: 0,
      readyRooms: 0,
      battlingRooms: 0,
      endedRooms: 0,
      roomsWithOpenSlot: 0,
      players: {
        total: 0,
        waiting: 0,
      },
    };

    for (const room of this.rooms.values()) {
      switch (room.status) {
        case 'waiting':
          stats.waitingRooms += 1;
          break;
        case 'ready':
          stats.readyRooms += 1;
          break;
        case 'battling':
          stats.battlingRooms += 1;
          break;
        case 'ended':
          stats.endedRooms += 1;
          break;
        default:
          break;
      }

      const players = ['p1', 'p2'];
      let connectedPlayers = 0;
      players.forEach((side) => {
        if (room.players[side]) {
          stats.players.total += 1;
          connectedPlayers += 1;
        }
      });

      if (room.status === 'waiting' || connectedPlayers < 2) {
        stats.roomsWithOpenSlot += 1;
        stats.players.waiting += Math.max(0, 2 - connectedPlayers);
      }
    }

    return stats;
  }
}

module.exports = RoomManager;


