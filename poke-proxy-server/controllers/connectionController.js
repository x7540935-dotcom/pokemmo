const WebSocket = require('ws');
const WebSocketDiagnostics = require('../core/WebSocketDiagnostics');
const createLogger = require('../adapters/logging/Logger');
const { wrapWebSocket } = require('../adapters/metrics/WebSocketMetrics');
const logger = createLogger('ConnectionController');

function createConnectionController(deps = {}) {
  const {
    roomManager,
    aiController,
    pvpController,
    battles,
    handleChoose,
  } = deps;

  if (!aiController || !pvpController) {
    throw new Error('[connectionController] 控制器未注入');
  }

  return function handleConnection(ws, req) {
    logger.info('新的 WebSocket 连接', {
      time: new Date().toISOString(),
      clientIP: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      protocol: ws.protocol,
      extensions: ws.extensions,
      stack: new Error().stack.split('\n').slice(1, 6).join('\n')
    });

    const connectionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    ws._connectionId = connectionId;
    ws._mode = null;
    ws._side = null;
    ws._battleManager = null;
    ws._connectionStartTime = Date.now();

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
          if (ws.bufferedAmount !== undefined && ws.bufferedAmount > 0) {
            logger.warn(`ping 时检测到 ${ws.bufferedAmount} 字节未发送`);
          }
        } catch (e) {
          logger.error('发送 ping 失败', e);
          clearInterval(pingInterval);
        }
      } else {
        clearInterval(pingInterval);
      }
    }, 5000);

    ws.on('pong', () => {
      logger.debug(`收到 pong (连接 ${connectionId})`);
    });

    const diagnostics = new WebSocketDiagnostics(ws, `battle-server-${connectionId}`);
    ws._diagnostics = diagnostics;

    // 包装 WebSocket 以收集指标（初始类型为 unknown，后续会根据模式更新）
    let wsType = 'unknown';
    const metricsTracker = wrapWebSocket(ws, wsType);
    ws._metricsTracker = metricsTracker;

    ws.on('message', async (data) => {
      const dataStr = data.toString();
      logger.debug(`收到消息 (${dataStr.length} 字节)`, { preview: dataStr.substring(0, 200) });

      try {
        const msg = JSON.parse(dataStr);

        switch (msg.type) {
          case 'create-room':
            pvpController.createRoom(ws);
            break;
          case 'join-room':
            pvpController.joinRoom(ws, msg.payload);
            break;
          case 'start': {
            const mode = msg.payload?.mode || 'ai';
            ws._mode = mode;
            // 更新指标类型
            if (ws._metricsTracker) {
              ws._metricsTracker.type = mode === 'pvp' ? 'pvp' : 'ai';
            }
            if (mode === 'pvp') {
              await pvpController.start(ws, msg.payload || {});
            } else {
              await aiController.start(ws, msg.payload || {});
            }
            break;
          }
          case 'choose':
            handleChoose(ws, msg);
            break;
          default:
            logger.warn('未知的消息类型', { type: msg.type });
        }
      } catch (e) {
        logger.error('解析消息失败', e);
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket 错误', error);
      if (ws._diagnostics) {
        ws._diagnostics.generateReport();
      }
      // 记录错误指标
      if (ws._metricsTracker) {
        const errorType = error.code === 'ECONNRESET' ? 'connection' : 'message';
        ws._metricsTracker.onError(errorType, error);
      }
    });

    ws.on('close', (code, reason) => {
      const connectionDuration = ws._connectionStartTime ? Date.now() - ws._connectionStartTime : 0;
      logger.info('连接关闭', {
        connectionId,
        duration: connectionDuration,
        code,
        reason: reason?.toString() || '(无)',
        roomId: ws._roomId || 'N/A',
        side: ws._side || 'N/A',
        mode: ws._mode || 'N/A',
      });

      clearInterval(pingInterval);

      if (ws._diagnostics) {
        ws._diagnostics.generateReport();
      }

      if (ws._roomId) {
        const room = roomManager.getRoom(ws._roomId);
        if (room) {
          const side = ws._side;
          if (side && room.players[side] === ws) {
            room.removePlayer(side);
            console.log(`[battle-server] 已从房间移除玩家 ${side}`);
          }

          if (room.status !== 'battling') {
            room.broadcast({
              type: 'opponent-disconnected',
              payload: {},
            });
          }

          if (!room.players.p1 && !room.players.p2 && room.status !== 'battling') {
            roomManager.deleteRoom(ws._roomId);
          }
        }
      }

      if (battles.has(connectionId)) {
        const battleManager = battles.get(connectionId);
        let shouldKeepBattleManager = false;

        if (ws._roomId) {
          const room = roomManager.getRoom(ws._roomId);
          if (room && room.status === 'battling' && room.battleManager === battleManager) {
            shouldKeepBattleManager = true;
          }
        }

        if (!shouldKeepBattleManager) {
          for (const [cid, bm] of battles.entries()) {
            if (bm === battleManager && cid !== connectionId) {
              shouldKeepBattleManager = true;
              break;
            }
          }
        }

        battles.delete(connectionId);

        if (!shouldKeepBattleManager && battleManager) {
          try {
            battleManager.cleanup();
          } catch (cleanupError) {
            console.error('[battle-server] 对战管理器 cleanup 失败:', cleanupError);
          }
        }
      }

      if (ws._battleManager && battles.has(ws._connectionId)) {
        const battleManager = battles.get(ws._connectionId);
        let hasOtherConnections = false;
        for (const [cid, bm] of battles.entries()) {
          if (bm === battleManager && cid !== ws._connectionId) {
            hasOtherConnections = true;
            break;
          }
        }
        if (!hasOtherConnections) {
          battles.delete(ws._connectionId);
        }
      }

      if (ws._battleManager && typeof ws._battleManager.cleanup === 'function') {
        try {
          ws._battleManager.cleanup();
        } catch (e) {
          console.error('[battle-server] cleanup 失败:', e);
        }
      }

      if (typeof pvpController.handleDisconnect === 'function') {
        pvpController.handleDisconnect(ws, { code, reason });
      }
    });

    try {
      ws.send('|status|connected');
      if (typeof ws.ping === 'function') {
        ws.ping();
      }
    } catch (e) {
      console.error('[battle-server] 发送连接确认消息失败:', e);
    }
  };
}

module.exports = createConnectionController;

