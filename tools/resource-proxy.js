// resource-proxy.js
const express = require('express');
const httpProxy = require('express-http-proxy');
const fs = require('fs');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = 3001; // 代理服务器端口，可根据需要调整
app.use('/data', express.static(path.join(__dirname, 'data')));
// 启用压缩以提升性能
app.use(compression());

// 配置静态资源缓存目录
const CACHE_DIR = path.join(__dirname, 'cache', 'sprites');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`缓存目录已创建: ${CACHE_DIR}`);
}

// 代理中间件：优先使用缓存，缓存不存在则从官方服务器获取并缓存
const proxyMiddleware = async (req, res, next) => {
  // 根据请求路径构造缓存文件路径
  const cacheFile = path.join(CACHE_DIR, ...req.path.split('/'));

  // 检查请求的资源是否已缓存
  if (fs.existsSync(cacheFile)) {
    console.log(`[CACHE HIT] ${req.path}`);
    // 设置适当的 Content-Type
    const ext = path.extname(req.path);
    if (ext === '.png') res.type('image/png');
    else if (ext === '.gif') res.type('image/gif');
    return fs.createReadStream(cacheFile).pipe(res);
  }

  console.log(`[CACHE MISS] ${req.path}, fetching from official server...`);

  // 缓存不存在，则从官方服务器获取
  const officialResourceUrl = `https://play.pokemonshowdown.com/sprites${req.path}`;
  try {
    const response = await fetch(officialResourceUrl);
    if (!response.ok) {
      return res.status(response.status).send('Resource not found');
    }

    // 确保目标目录存在
    const cacheDir = path.dirname(cacheFile);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // 转换响应体为Buffer并写入缓存
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(cacheFile, buffer);

    // 返回资源
    res.type(response.headers.get('content-type') || 'application/octet-stream');
    res.send(buffer);
    console.log(`[CACHE SAVED] ${req.path}`);

  } catch (error) {
    console.error(`[ERROR] Failed to fetch ${officialResourceUrl}:`, error.message);
    res.status(500).send('Proxy error occurred');
  }
};

// 将 /sprites 路径的请求指向代理中间件
app.use('/sprites', proxyMiddleware);

app.listen(PORT, () => {
  console.log(`资源代理服务器运行在 http://localhost:${PORT}`);
  console.log(`例如，可以通过 http://localhost:${PORT}/sprites/xyani/pikachu.gif 访问资源`);
});