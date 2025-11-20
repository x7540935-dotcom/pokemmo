/**
 * Room 单元测试
 * 
 * 测试覆盖：
 * - 玩家添加/移除
 * - 队伍设置
 * - 状态管理
 * - 广播消息
 */
const Room = require('../../domain/rooms/Room');

describe('Room', () => {
  let room;
  let mockWs1;
  let mockWs2;

  beforeEach(() => {
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
    room = new Room('TEST01', mockWs1);
  });

  describe('构造函数', () => {
    test('应该正确初始化房间', () => {
      expect(room.roomId).toBe('TEST01');
      expect(room.creator).toBe(mockWs1);
      expect(room.players).toEqual({});
      expect(room.teams).toEqual({});
      expect(room.status).toBe('waiting');
      expect(room.createdAt).toBeDefined();
    });
  });

  describe('addPlayer', () => {
    test('应该成功添加玩家', () => {
      const result = room.addPlayer('p1', mockWs1);
      
      expect(result).toBe(true);
      expect(room.players.p1).toBe(mockWs1);
    });

    test('应该能够添加两个玩家', () => {
      room.addPlayer('p1', mockWs1);
      room.addPlayer('p2', mockWs2);
      
      expect(room.players.p1).toBe(mockWs1);
      expect(room.players.p2).toBe(mockWs2);
    });

    test('替换已存在的玩家应该返回 false', () => {
      room.addPlayer('p1', mockWs1);
      const result = room.addPlayer('p1', mockWs2);
      
      expect(result).toBe(false);
      expect(room.players.p1).toBe(mockWs1); // 原玩家保持不变
    });
  });

  describe('removePlayer', () => {
    test('应该成功移除玩家', () => {
      room.addPlayer('p1', mockWs1);
      room.removePlayer('p1');
      
      expect(room.players.p1).toBeUndefined();
    });

    test('移除不存在的玩家不应该报错', () => {
      expect(() => {
        room.removePlayer('p1');
      }).not.toThrow();
    });
  });

  describe('setTeam', () => {
    test('应该成功设置队伍', () => {
      const team = [{ species: 'Pikachu' }];
      room.setTeam('p1', team);
      
      expect(room.teams.p1).toBe(team);
    });
  });

  describe('isReady', () => {
    test('两个玩家都有队伍时应该返回 true', () => {
      room.addPlayer('p1', mockWs1);
      room.addPlayer('p2', mockWs2);
      room.setTeam('p1', [{ species: 'Pikachu' }]);
      room.setTeam('p2', [{ species: 'Charizard' }]);
      
      expect(room.isReady()).toBe(true);
    });

    test('缺少玩家时应该返回 false', () => {
      room.addPlayer('p1', mockWs1);
      room.setTeam('p1', [{ species: 'Pikachu' }]);
      
      expect(room.isReady()).toBe(false);
    });

    test('缺少队伍时应该返回 false', () => {
      room.addPlayer('p1', mockWs1);
      room.addPlayer('p2', mockWs2);
      
      expect(room.isReady()).toBe(false);
    });
  });

  describe('getStatus', () => {
    test('应该返回房间状态', () => {
      room.addPlayer('p1', mockWs1);
      room.addPlayer('p2', mockWs2);
      room.setTeam('p1', [{ species: 'Pikachu' }]);
      room.setTeam('p2', [{ species: 'Charizard' }]);
      
      const status = room.getStatus();
      
      expect(status.roomId).toBe('TEST01');
      expect(status.status).toBe('waiting');
      expect(status.players).toHaveProperty('p1');
      expect(status.players).toHaveProperty('p2');
      expect(status.players.p1.connected).toBe(true);
      expect(status.players.p1.teamReady).toBe(true);
      expect(status.players.p2.connected).toBe(true);
      expect(status.players.p2.teamReady).toBe(true);
    });
  });

  describe('broadcast', () => {
    test('应该向所有玩家广播消息', () => {
      room.addPlayer('p1', mockWs1);
      room.addPlayer('p2', mockWs2);
      
      const message = { type: 'test', payload: {} };
      room.broadcast(message);
      
      expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    test('应该跳过已关闭的连接', () => {
      mockWs2.readyState = 3; // CLOSED
      room.addPlayer('p1', mockWs1);
      room.addPlayer('p2', mockWs2);
      
      const message = { type: 'test', payload: {} };
      room.broadcast(message);
      
      expect(mockWs1.send).toHaveBeenCalled();
      expect(mockWs2.send).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    test('应该清理超时和资源', () => {
      room.timeout = setTimeout(() => {}, 1000);
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      room.destroy();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});

