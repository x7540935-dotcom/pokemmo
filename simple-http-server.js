/**
 * 简单的 HTTP 服务器（simple-http-server.js）
 * 
 * 职责：
 * - 托管前端文件，方便在局域网内分享给其他人
 * - 提供静态文件服务（HTML、JS、CSS、图片等）
 * - 自动检测本机IP地址并显示分享链接
 * 
 * 功能：
 * - 支持多种文件类型（HTML、JS、CSS、JSON、图片、字体等）
 * - 自动设置正确的MIME类型
 * - 防止路径遍历攻击（安全检查）
 * - 优雅关闭（Ctrl+C）
 * 
 * 使用方法：
 * node simple-http-server.js [port]
 * 
 * 参数：
 * - port: 可选，服务器端口号（默认：8080）
 * 
 * 使用场景：
 * - 在局域网内分享对战系统给其他玩家
 * - 本地开发和测试
 * - 快速启动一个简单的Web服务器
 * 
 * 注意事项：
 * - 确保防火墙已开放指定端口
 * - 确保对战服务器（端口3071）也在运行
 * - 分享链接格式：http://[本机IP]:8080/pvp-lobby.html?server=ws://[本机IP]:3071
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.argv[2] || 8080;
const ROOT_DIR = path.resolve(__dirname);

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  // 解析 URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

// 默认首页（优先 index.html，回退到 pokemmo.html）
if (pathname === '/') {
  const indexPath = path.join(ROOT_DIR, 'index.html');
  pathname = fs.existsSync(indexPath) ? '/index.html' : '/pokemmo.html';
}

  // 构建文件路径
  const filePath = path.join(ROOT_DIR, pathname);

  // 安全检查：防止路径遍历攻击
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  // 检查文件是否存在
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 文件不存在，返回 404
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>404 - 文件未找到</title>
        </head>
        <body>
          <h1>404 - 文件未找到</h1>
          <p>请求的文件不存在: ${pathname}</p>
          <p><a href="/">返回首页</a></p>
        </body>
        </html>
      `);
      return;
    }

    // 读取文件
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
        return;
      }

      // 获取文件扩展名
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // 设置响应头
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });

      // 发送文件内容
      res.end(data);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  // 获取本机 IP 地址
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = '你的IP';
  
  // 查找 IPv4 地址（排除本地回环）
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== '你的IP') break;
  }
  
  console.log('========================================');
  console.log('  简单 HTTP 服务器已启动');
  console.log('========================================');
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  网络访问: http://${localIP}:${PORT}`);
  console.log('');
  console.log('  分享链接（复制以下链接给其他人）：');
  console.log(`  http://${localIP}:${PORT}/pvp-lobby.html?server=ws://${localIP}:3071`);
  console.log('');
  console.log('  重要提示：');
  console.log('  1. 确保防火墙已开放 8080 和 3071 端口');
  console.log('  2. 确保对战服务器也在运行（端口 3071）');
  console.log('  3. 如果其他人无法访问，请查看故障排除指南');
  console.log('  4. 按 Ctrl+C 停止服务器');
  console.log('========================================');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

