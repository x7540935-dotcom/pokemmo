/**
 * 性能监控初始化脚本
 * 
 * 在 HTML 页面中引入此脚本以自动启动性能监控
 * 
 * 使用方式：
 * ```html
 * <script type="module">
 *   import './packages/battle-engine/src/utils/performance-init.js';
 * </script>
 * ```
 */

import { getGlobalMonitor } from './PerformanceMonitor.js';
import { getGlobalReporter } from './PerformanceReporter.js';
import { getGlobalVitalsReporter } from './WebVitalsReporter.js';

// 获取服务器地址（从当前页面 URL 或配置）
function getServerUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3071';
  
  const urlParams = new URLSearchParams(window.location.search);
  const serverParam = urlParams.get('server');
  
  if (serverParam) {
    // 从 WebSocket URL 提取 HTTP URL
    if (serverParam.startsWith('ws://')) {
      return serverParam.replace('ws://', 'http://').replace('/battle', '');
    } else if (serverParam.startsWith('wss://')) {
      return serverParam.replace('wss://', 'https://').replace('/battle', '');
    }
    return `http://${serverParam.replace('/battle', '')}`;
  }
  
  // 使用当前域名
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname;
  const port = window.location.port || (protocol === 'https:' ? '443' : '80');
  return `${protocol}//${hostname}:${port === '80' || port === '443' ? '' : port}`;
}

// 初始化性能监控
const monitor = getGlobalMonitor({
  onMetric: (name, metric) => {
    // 自动上报到后端
    const reporter = getGlobalReporter({
      endpoint: '/api/metrics',
      serverUrl: getServerUrl()
    });
    reporter.report({
      name,
      ...metric,
      type: name.startsWith('custom.') ? 'custom' : 'web-vital'
    });
  }
});

// 启动 Web Vitals 监控
const vitalsReporter = getGlobalVitalsReporter({
  autoReport: true
});
vitalsReporter.start();

console.log('[Performance] 性能监控已启动');

// 导出到全局，方便调试
if (typeof window !== 'undefined') {
  window.PerformanceMonitor = monitor;
  window.PerformanceReporter = getGlobalReporter();
  window.WebVitalsReporter = vitalsReporter;
}


