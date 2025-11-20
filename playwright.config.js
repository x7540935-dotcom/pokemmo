// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright 配置
 * 
 * 用于 E2E 测试，包括：
 * - AI 对战流程测试
 * - PvP 对战流程测试
 * - UI 渲染验证
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  
  // 测试超时时间
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  // 并行执行
  fullyParallel: false, // E2E 测试建议串行执行，避免资源竞争
  
  // 失败时重试
  retries: process.env.CI ? 2 : 0,
  
  // 工作进程数
  workers: process.env.CI ? 1 : 1,
  
  // 报告配置
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  
  // 共享配置
  use: {
    // 基础 URL（如果前端有开发服务器）
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:8080',
    
    // 浏览器选项
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    
    // 截图和视频
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 追踪
    trace: 'on-first-retry',
  },

  // 项目配置（不同浏览器）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 可选：添加其他浏览器
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web 服务器配置（可选，用于启动开发服务器）
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:8080',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});

