/**
 * RAG系统集成模块（RAGIntegration）
 * 
 * 职责：
 * - 在Node.js中调用Python RAG知识库系统
 * - 通过子进程调用Python脚本查询知识库
 * - 解析查询结果并返回结构化数据
 * 
 * RAG系统：
 * - 基于向量数据库的知识检索系统
 * - 包含宝可梦数据、对战策略、技能信息等知识
 * - 使用Python实现，通过命令行接口调用
 * 
 * 查询类型：
 * - query(): 通用查询
 * - queryPokemon(): 查询宝可梦信息
 * - queryMove(): 查询技能信息
 * - queryBattleStrategy(): 查询对战策略
 * 
 * 错误处理：
 * - 如果RAG系统不可用，返回空数组，不影响AI决策
 * - 查询超时（5秒）自动返回空结果
 * 
 * 使用场景：
 * - AdvancedAI和ExpertAI查询相关知识辅助决策
 * - 需要Python RAG系统已安装并配置
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class RAGIntegration {
  /**
   * 构造函数
   * 检查RAG系统是否可用，设置脚本路径
   */
  constructor() {
    // RAG脚本路径
    this.ragScriptPath = path.resolve(__dirname, '../../../RAG/scripts/query.py');
    this.enabled = this.checkRAGAvailable();
    
    if (!this.enabled) {
      console.warn('[RAGIntegration] RAG系统不可用，将跳过RAG查询功能');
    }
  }

  /**
   * 检查RAG系统是否可用
   */
  checkRAGAvailable() {
    try {
      // 检查Python脚本是否存在
      if (!fs.existsSync(this.ragScriptPath)) {
        // 尝试备用路径
        const altPath = path.resolve(__dirname, '../../../../RAG/scripts/query.py');
        if (fs.existsSync(altPath)) {
          this.ragScriptPath = altPath;
          return true;
        }
        return false;
      }
      return true;
    } catch (e) {
      console.error('[RAGIntegration] 检查RAG系统时出错:', e);
      return false;
    }
  }

  /**
   * 查询RAG知识库
   * @param {string} query - 查询文本
   * @param {number} topK - 返回前K个结果（默认3）
   * @returns {Promise<Array>} 查询结果数组
   */
  async query(query, topK = 3) {
    if (!this.enabled) {
      return [];
    }

    return new Promise((resolve, reject) => {
      try {
        // 调用Python脚本查询RAG系统
        const pythonProcess = spawn('python', [
          this.ragScriptPath,
          '--query', query,
          '--top-k', topK.toString()
        ]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.warn(`[RAGIntegration] Python脚本执行失败 (code ${code}): ${stderr}`);
            resolve([]); // 失败时返回空数组，不影响AI决策
            return;
          }

          try {
            // 解析JSON结果
            const results = JSON.parse(stdout);
            resolve(results);
          } catch (e) {
            console.warn('[RAGIntegration] 解析查询结果失败:', e);
            resolve([]);
          }
        });

        pythonProcess.on('error', (err) => {
          console.warn('[RAGIntegration] 启动Python进程失败:', err);
          resolve([]);
        });

        // 设置超时（5秒）
        setTimeout(() => {
          pythonProcess.kill();
          console.warn('[RAGIntegration] 查询超时');
          resolve([]);
        }, 5000);

      } catch (e) {
        console.warn('[RAGIntegration] 查询时出错:', e);
        resolve([]);
      }
    });
  }

  /**
   * 查询宝可梦相关信息
   * @param {string} pokemonName - 宝可梦名称
   * @returns {Promise<Object>} 宝可梦信息
   */
  async queryPokemon(pokemonName) {
    const query = `告诉我关于${pokemonName}的详细信息，包括属性、种族值、常用技能和策略`;
    const results = await this.query(query, 3);
    
    // 提取相关信息
    const info = {
      name: pokemonName,
      types: null,
      stats: null,
      strategies: [],
      moves: []
    };

    if (results && results.length > 0) {
      // 从结果中提取信息（简化处理）
      results.forEach(result => {
        if (result.content) {
          const content = result.content.toLowerCase();
          
          // 提取属性信息
          if (!info.types && (content.includes('type') || content.includes('属性'))) {
            // 尝试解析属性（简化处理）
          }
          
          // 提取策略信息
          if (content.includes('strategy') || content.includes('strategy') || content.includes('策略')) {
            info.strategies.push(result.content.substring(0, 200));
          }
        }
      });
    }

    return info;
  }

  /**
   * 查询技能信息
   * @param {string} moveName - 技能名称
   * @returns {Promise<Object>} 技能信息
   */
  async queryMove(moveName) {
    const query = `告诉我关于技能${moveName}的详细信息，包括威力、命中率、效果和使用场景`;
    const results = await this.query(query, 2);
    
    return {
      name: moveName,
      description: results.length > 0 ? results[0].content : null,
      usage: results.length > 1 ? results[1].content : null
    };
  }

  /**
   * 查询对战策略
   * @param {string} myPokemon - 我方宝可梦
   * @param {string} opponentPokemon - 对手宝可梦
   * @returns {Promise<Array>} 策略建议
   */
  async queryBattleStrategy(myPokemon, opponentPokemon) {
    const query = `在对战中，当我的${myPokemon}面对对手的${opponentPokemon}时，应该采用什么策略？`;
    const results = await this.query(query, 3);
    
    return results.map(r => r.content || '').filter(c => c.length > 0);
  }
}

module.exports = RAGIntegration;

