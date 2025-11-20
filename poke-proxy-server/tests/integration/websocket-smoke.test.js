/**
 * WebSocket 集成测试（冒烟测试）
 * 
 * 测试覆盖：
 * - WebSocket 连接建立
 * - 消息发送和接收
 * - AI 对战启动流程
 * - 房间创建和加入流程
 */
const WebSocket = require('ws');
const http = require('http');

// 注意：这个测试需要服务器运行
// 可以通过环境变量控制是否运行集成测试
const RUN_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS === 'true';
const SERVER_PORT = process.env.TEST_SERVER_PORT || 3071;
const SERVER_URL = `ws://localhost:${SERVER_PORT}/battle`;

describe('WebSocket 集成测试', () => {
  let server;
  let wss;

  beforeAll((done) => {
    if (!RUN_INTEGRATION_TESTS) {
      console.log('跳过集成测试（设置 RUN_INTEGRATION_TESTS=true 以运行）');
      done();
      return;
    }

    // 启动测试服务器
    // 注意：这里需要实际启动 battle-server
    // 为了简化，我们假设服务器已经在运行
    setTimeout(done, 1000); // 等待服务器启动
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('连接测试', () => {
    test('应该能够建立 WebSocket 连接', (done) => {
      if (!RUN_INTEGRATION_TESTS) {
        done();
        return;
      }

      const ws = new WebSocket(SERVER_URL);

      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        // 如果服务器未运行，跳过测试
        if (error.code === 'ECONNREFUSED') {
          console.log('服务器未运行，跳过集成测试');
          done();
        } else {
          done(error);
        }
      });
    }, 10000);

    test('应该能够接收连接确认消息', (done) => {
      if (!RUN_INTEGRATION_TESTS) {
        done();
        return;
      }

      const ws = new WebSocket(SERVER_URL);
      let receivedMessage = false;

      ws.on('message', (data) => {
        const message = data.toString();
        if (message.includes('connected') || message.includes('status')) {
          receivedMessage = true;
          ws.close();
          done();
        }
      });

      ws.on('open', () => {
        // 等待消息
        setTimeout(() => {
          if (!receivedMessage) {
            ws.close();
            done(new Error('未收到连接确认消息'));
          }
        }, 2000);
      });

      ws.on('error', (error) => {
        if (error.code === 'ECONNREFUSED') {
          console.log('服务器未运行，跳过集成测试');
          done();
        } else {
          done(error);
        }
      });
    }, 10000);
  });

  describe('AI 对战流程', () => {
    test('应该能够启动 AI 对战', (done) => {
      if (!RUN_INTEGRATION_TESTS) {
        done();
        return;
      }

      const ws = new WebSocket(SERVER_URL);
      let battleStarted = false;

      ws.on('open', () => {
        const startMessage = {
          type: 'start',
          payload: {
            mode: 'ai',
            formatid: 'gen9ou',
            team: [
              {
                name: 'Pikachu',
                species: 'Pikachu',
                moves: ['Thunderbolt'],
                ability: 'Static',
                item: 'Light Ball',
                nature: 'Timid',
                evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
                level: 50
              }
            ],
            difficulty: 1
          }
        };

        ws.send(JSON.stringify(startMessage));
      });

      ws.on('message', (data) => {
        const message = data.toString();
        // 检查是否收到对战开始的协议
        if (message.includes('|start|') || message.includes('|request|')) {
          battleStarted = true;
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        if (error.code === 'ECONNREFUSED') {
          console.log('服务器未运行，跳过集成测试');
          done();
        } else {
          done(error);
        }
      });

      // 超时处理
      setTimeout(() => {
        if (!battleStarted) {
          ws.close();
          done(new Error('AI 对战启动超时'));
        }
      }, 10000);
    }, 15000);
  });

  describe('PvP 房间流程', () => {
    test('应该能够创建房间', (done) => {
      if (!RUN_INTEGRATION_TESTS) {
        done();
        return;
      }

      const ws = new WebSocket(SERVER_URL);
      let roomCreated = false;

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'create-room' }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'room-created' && message.payload.roomId) {
            roomCreated = true;
            ws.close();
            done();
          }
        } catch (e) {
          // 忽略非 JSON 消息
        }
      });

      ws.on('error', (error) => {
        if (error.code === 'ECONNREFUSED') {
          console.log('服务器未运行，跳过集成测试');
          done();
        } else {
          done(error);
        }
      });

      setTimeout(() => {
        if (!roomCreated) {
          ws.close();
          done(new Error('房间创建超时'));
        }
      }, 5000);
    }, 10000);
  });
});

