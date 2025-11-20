/**
 * LLM客户端（LLMClient）
 * 
 * 职责：
 * - 封装阿里云百炼平台的LLM API调用
 * - 使用Node.js内置https模块，无需额外依赖
 * - 处理API请求、响应解析、错误处理
 * - 提供超时机制和日志记录
 * 
 * 配置：
 * - apiKey: API密钥（从环境变量 ALIBABA_BAILIAN_API_KEY 获取）
 * - baseUrl: API基础URL（默认：阿里云百炼平台）
 * - model: 模型名称（默认：'qwen-plus'）
 * - temperature: 温度参数（默认：0.7）
 * - maxTokens: 最大token数（默认：2048）
 * - timeout: 请求超时时间（默认：10秒）
 * 
 * 使用场景：
 * - ExpertAI（难度5）使用LLM进行智能决策
 * - 如果API密钥未配置，isEnabled() 返回 false
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');

class LLMClient {
  /**
   * 构造函数
   * 
   * @param {Object} [config={}] - 配置对象
   *   - apiKey: API密钥
   *   - baseUrl: API基础URL
   *   - model: 模型名称
   *   - temperature: 温度参数
   *   - maxTokens: 最大token数
   *   - timeout: 超时时间（毫秒）
   */
  constructor(config = {}) {
    // 默认配置
    this.config = {
      apiKey: config.apiKey || process.env.ALIBABA_BAILIAN_API_KEY || '',
      baseUrl: config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: config.model || 'qwen-plus',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048,
      timeout: config.timeout || 10000, // 10秒超时
      ...config
    };
    
    this.logger = this.createLogger();
    this.enabled = !!this.config.apiKey;
    
    if (!this.enabled) {
      this.logger.warn('LLM客户端未配置API密钥，LLM功能将不可用');
    } else {
      this.logger.info(`LLM客户端初始化完成，模型: ${this.config.model}`);
    }
  }

  /**
   * 创建日志记录器
   */
  createLogger() {
    const logDir = require('path').resolve(__dirname, '../../../logs');
    const fs = require('fs');
    
    // 确保日志目录存在
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (e) {
      // 忽略创建目录失败
    }
    
    const logFile = require('path').join(logDir, 'expert-ai.log');
    
    // 定义 log 函数
    const log = (level, message, data = null) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
      
      // 控制台输出
      if (level === 'ERROR') {
        console.error(logMessage);
      } else if (level === 'WARN') {
        console.warn(logMessage);
      } else {
        console.log(logMessage);
      }
      
      // 写入文件（异步，不阻塞）
      try {
        fs.appendFile(logFile, logMessage + '\n', (err) => {
          if (err) {
            // 忽略文件写入错误，避免影响主流程
          }
        });
      } catch (e) {
        // 忽略文件写入错误
      }
    };
    
    return {
      log: log,
      info: (message, data) => log('INFO', message, data),
      warn: (message, data) => log('WARN', message, data),
      error: (message, data) => log('ERROR', message, data),
      debug: (message, data) => log('DEBUG', message, data)
    };
  }

  /**
   * 调用LLM API
   * @param {string} prompt - 提示词
   * @param {Object} options - 额外选项
   * @returns {Promise<string>} LLM响应文本
   */
  async call(prompt, options = {}) {
    if (!this.enabled) {
      this.logger.warn('LLM未启用，返回空响应');
      return null;
    }

    const startTime = Date.now();
    this.logger.info('开始调用LLM API', { model: this.config.model, promptLength: prompt.length });

    try {
      const url = new URL(`${this.config.baseUrl}/chat/completions`);
      const requestBody = JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的宝可梦对战AI助手，擅长分析对战局势并给出最佳决策建议。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || this.config.temperature,
        max_tokens: options.maxTokens || this.config.maxTokens,
        stream: false
      });

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: this.config.timeout
      };

      const response = await this.makeRequest(requestOptions, requestBody);
      const elapsed = Date.now() - startTime;
      
      this.logger.info('LLM API调用成功', { elapsed: `${elapsed}ms`, responseLength: response.length });
      
      return response;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error('LLM API调用失败', {
        error: error.message,
        stack: error.stack,
        elapsed: `${elapsed}ms`
      });
      throw error;
    }
  }

  /**
   * 发送HTTP请求（使用内置https模块）
   */
  makeRequest(options, body) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              const errorData = JSON.parse(data);
              reject(new Error(`API调用失败: ${res.statusCode} - ${errorData.error?.message || data}`));
              return;
            }

            const response = JSON.parse(data);
            
            // 解析响应
            if (response.choices && response.choices.length > 0) {
              const content = response.choices[0].message?.content;
              if (content) {
                resolve(content);
              } else {
                reject(new Error('LLM响应格式异常：缺少content字段'));
              }
            } else {
              reject(new Error('LLM响应格式异常：缺少choices字段'));
            }
          } catch (e) {
            this.logger.error('解析LLM响应失败', { error: e.message, response: data.substring(0, 500) });
            reject(new Error(`解析响应失败: ${e.message}`));
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error('HTTP请求错误', { error: error.message });
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      // 写入请求体
      req.write(body);
      req.end();
    });
  }

  /**
   * 检查LLM是否可用
   */
  isEnabled() {
    return this.enabled;
  }
}

module.exports = LLMClient;

