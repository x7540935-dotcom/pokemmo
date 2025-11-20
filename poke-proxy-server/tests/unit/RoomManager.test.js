/**
 * RoomManager 单元测试
 * 
 * 测试覆盖：
 * - 房间创建
 * - 房间加入
 * - 房间查找
 * - 房间删除
 * - 超时清理
 * - 队伍验证
 */
const RoomManager = require('../../domain/rooms/RoomManager');
const Room = require('../../domain/rooms/Room');

describe('RoomManager', () => {
  let roomManager;
  let mockWs1;
  let mockWs2;

  beforeEach(() => {
    roomManager = new RoomManager();
    // 创建模拟 WebSocket 对象
    mockWs1 = {
      readyState: 1, // OPEN
      send: jest.fn(),
      close: jest.fn(),
    };
    mockWs2 = {
      readyState: 1,
      send: jest.fn(),
      close: jest.fn(),
    };
  });

  afterEach(() => {
    // 清理所有房间
    if (roomManager.cleanupInterval) {
      clearInterval(roomManager.cleanupInterval);
    }
  });

  describe('createRoom', () => {
    test('应该成功创建房间', () => {
      const room = roomManager.createRoom(mockWs1);
      
      expect(room).toBeInstanceOf(Room);
      expect(room.roomId).toBeDefined();
      expect(room.roomId.length).toBe(6);
      expect(roomManager.getRoom(room.roomId)).toBe(room);
    });

    test('创建的房间应该包含创建者', () => {
      const room = roomManager.createRoom(mockWs1);
      
      expect(room.creator).toBe(mockWs1);
    });

    test('创建的房间应该有超时机制', () => {
      jest.useFakeTimers();
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      
      expect(roomManager.getRoom(roomId)).toBe(room);
      
      // 快进 10 分钟
      jest.advanceTimersByTime(10 * 60 * 1000);
      
      expect(roomManager.getRoom(roomId)).toBeUndefined();
      jest.useRealTimers();
    });
  });

  describe('joinRoom', () => {
    test('应该成功加入房间', () => {
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      
      // 第一个加入的玩家应该是 p1
      const joinedRoom1 = roomManager.joinRoom(roomId, mockWs1);
      expect(joinedRoom1).toBe(room);
      expect(room.players.p1).toBe(mockWs1);
      
      // 第二个加入的玩家应该是 p2
      const joinedRoom2 = roomManager.joinRoom(roomId, mockWs2);
      expect(joinedRoom2).toBe(room);
      expect(room.players.p2).toBe(mockWs2);
    });

    test('创建房间时应该设置创建者', () => {
      const room = roomManager.createRoom(mockWs1);
      
      expect(room).toBeDefined();
      expect(room.creator).toBe(mockWs1);
      // 注意：createRoom 不会自动添加玩家，需要通过 joinRoom 添加
      expect(room.players.p1).toBeUndefined();
    });

    test('第一个加入的玩家应该是 p1，第二个应该是 p2', () => {
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      
      // 第一个加入的玩家
      const joinedRoom1 = roomManager.joinRoom(roomId, mockWs1);
      expect(joinedRoom1.players.p1).toBe(mockWs1);
      
      // 第二个加入的玩家
      const joinedRoom2 = roomManager.joinRoom(roomId, mockWs2);
      expect(joinedRoom2.players.p2).toBe(mockWs2);
    });

    test('房间不存在时应该返回 null', () => {
      const result = roomManager.joinRoom('INVALID', mockWs2);
      
      expect(result).toBeNull();
    });

    test('房间已满时应该返回 null', () => {
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      
      // 手动添加第二个玩家
      room.addPlayer('p2', mockWs2);
      
      const result = roomManager.joinRoom(roomId, {
        readyState: 1,
        send: jest.fn(),
      });
      
      expect(result).toBeNull();
    });

    test('房间状态不是 waiting 时应该返回 null', () => {
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      room.status = 'battling';
      
      const result = roomManager.joinRoom(roomId, mockWs2);
      
      expect(result).toBeNull();
    });
  });

  describe('getRoom', () => {
    test('应该返回存在的房间', () => {
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      
      const foundRoom = roomManager.getRoom(roomId);
      
      expect(foundRoom).toBe(room);
    });

    test('房间不存在时应该返回 undefined', () => {
      const foundRoom = roomManager.getRoom('INVALID');
      
      expect(foundRoom).toBeUndefined();
    });
  });

  describe('deleteRoom', () => {
    test('应该成功删除房间', () => {
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      
      roomManager.deleteRoom(roomId);
      
      expect(roomManager.getRoom(roomId)).toBeUndefined();
    });

    test('删除房间时应该调用 room.destroy()', () => {
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      const destroySpy = jest.spyOn(room, 'destroy');
      
      roomManager.deleteRoom(roomId);
      
      expect(destroySpy).toHaveBeenCalled();
    });

    test('删除不存在的房间不应该报错', () => {
      expect(() => {
        roomManager.deleteRoom('INVALID');
      }).not.toThrow();
    });
  });

  describe('findRoomByConnection', () => {
    test('应该找到包含指定连接的房间', () => {
      const room = roomManager.createRoom(mockWs1);
      roomManager.joinRoom(room.roomId, mockWs2);
      
      const foundRoom = roomManager.findRoomByConnection(mockWs1);
      
      expect(foundRoom).toBe(room);
    });

    test('连接不在任何房间时应该返回 null', () => {
      const mockWs3 = { readyState: 1, send: jest.fn() };
      const foundRoom = roomManager.findRoomByConnection(mockWs3);
      
      expect(foundRoom).toBeNull();
    });
  });

  describe('cleanup', () => {
    test('应该清理超过30分钟的空房间', () => {
      jest.useFakeTimers();
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      
      // 模拟房间创建时间在 31 分钟前
      room.createdAt = Date.now() - 31 * 60 * 1000;
      
      roomManager.cleanup();
      
      expect(roomManager.getRoom(roomId)).toBeUndefined();
      jest.useRealTimers();
    });

    test('不应该清理创建时间少于30分钟的房间', () => {
      const room = roomManager.createRoom(mockWs1);
      const roomId = room.roomId;
      
      roomManager.cleanup();
      
      expect(roomManager.getRoom(roomId)).toBe(room);
    });
  });

  describe('validateTeam', () => {
    test('应该验证有效的队伍', () => {
      const validTeam = [
        { species: 'Pikachu', moves: ['Thunderbolt'] },
        { species: 'Charizard', moves: ['Flamethrower'] },
      ];
      
      const result = roomManager.validateTeam(validTeam);
      
      expect(result.valid).toBe(true);
    });

    test('队伍为空时应该返回无效', () => {
      const result = roomManager.validateTeam([]);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('队伍数量');
    });

    test('队伍超过6只时应该返回无效', () => {
      const invalidTeam = Array(7).fill({ species: 'Pikachu' });
      const result = roomManager.validateTeam(invalidTeam);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('队伍数量');
    });

    test('宝可梦缺少 species 或 name 时应该返回无效', () => {
      const invalidTeam = [{ moves: ['Thunderbolt'] }];
      const result = roomManager.validateTeam(invalidTeam);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('species');
    });

    test('宝可梦技能超过4个时应该返回无效', () => {
      const invalidTeam = [
        { species: 'Pikachu', moves: ['Move1', 'Move2', 'Move3', 'Move4', 'Move5'] },
      ];
      const result = roomManager.validateTeam(invalidTeam);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('技能');
    });
  });
});

