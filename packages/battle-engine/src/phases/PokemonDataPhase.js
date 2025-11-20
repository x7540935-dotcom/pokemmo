import PhaseBase from './PhaseBase.js';
import SpriteLoader from '../utils/SpriteLoader.js';

/**
 * 阶段3：宝可梦数据阶段（过渡阶段）
 * 负责在队伍预览和对战之间过渡，处理宝可梦数据更新
 * 注意：在新架构中，这个阶段主要是过渡作用，数据应该从 request 协议中获取
 */
class PokemonDataPhase extends PhaseBase {
  constructor(battleEngine, stateManager, ui) {
    super('pokemon-data');
    this.battleEngine = battleEngine;
    this.stateManager = stateManager;
    this.ui = ui;
  }

  onEnter(data) {
    console.log('[PokemonDataPhase] 进入宝可梦数据阶段');
    this.stateManager.updateBattleState({ 
      isTeamPreview: false,
      isPokemonDataLoaded: true 
    });
    
    // 这个阶段主要是过渡，收到 request 或 switch 后立即转换到对战阶段
    console.log('[PokemonDataPhase] 等待对战开始信号...');
  }

  /**
   * 处理协议消息
   */
  handleProtocol(line) {
    console.log(`[PokemonDataPhase] 处理协议: ${line.substring(0, 100)}`);
    
    if (line.startsWith('|request|')) {
      // 收到 request 协议，说明需要选择行动，进入对战阶段
      console.log('[PokemonDataPhase] 收到 request 协议，转换到对战阶段');
      // 先保存 request 到 stateManager，然后转换阶段
      try {
        const req = JSON.parse(line.slice('|request|'.length));
        if (req) {
          this.stateManager.setCurrentRequest(req);
        }
      } catch (e) {
        console.error('[PokemonDataPhase] 解析 request 失败:', e);
      }
      this.transitionTo('battle');
    } else if (line.startsWith('|switch|') || line.startsWith('|drag|')) {
      // 收到 switch 协议，说明宝可梦已切换，处理后再进入对战阶段
      console.log('[PokemonDataPhase] 收到 switch 协议，处理中...');
      this.handleSwitchProtocol(line);
      // 延迟转换，确保数据已更新
      setTimeout(() => {
        this.transitionTo('battle');
      }, 100);
    } else if (line.startsWith('|start|')) {
      // 对战开始标记
      console.log('[PokemonDataPhase] 收到 |start| 协议，转换到对战阶段');
      this.transitionTo('battle');
    }
  }

  /**
   * 处理 switch 协议
   */
  handleSwitchProtocol(line) {
    try {
      const parts = line.slice('|switch|'.length).split('|');
      if (parts.length >= 3) {
        const ident = parts[0].trim();
        const details = parts[1].trim();
        const condition = parts[2].trim();
        
        // 解析玩家（p1 或 p2）
        const side = ident.includes('p1') ? 'p1' : 'p2';
        const species = SpriteLoader.extractSpeciesFromDetails(details);
        
        console.log(`[PokemonDataPhase] ${side} 切换宝可梦: ${species}`);
        
        // 更新状态
        const pokemonData = {
          ident: ident,
          species: species,
          details: details,
          condition: condition,
          side: side
        };
        
        this.stateManager.updateActivePokemon(side, pokemonData);
        
        // 更新UI
        if (this.ui) {
          this.ui.updatePokemonDisplay(side, pokemonData);
        }
      }
    } catch (e) {
      console.error('[PokemonDataPhase] 解析 switch 协议失败:', e);
    }
  }

  /**
   * 处理用户操作
   */
  handleUserAction(action, data) {
    // 这个阶段通常不需要处理用户操作
    console.log(`[PokemonDataPhase] 收到用户操作: ${action}`, data);
  }

  onExit() {
    console.log('[PokemonDataPhase] 退出宝可梦数据阶段');
  }
}

export default PokemonDataPhase;

