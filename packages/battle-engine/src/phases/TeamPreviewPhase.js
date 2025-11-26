import PhaseBase from './PhaseBase.js';
import SpriteLoader from '../utils/SpriteLoader.js';
import Localization from '../utils/Localization.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 阶段 2：队伍预览（TeamPreviewPhase.js）
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📋 核心职责
 * ──────────────────────────────────────────────────────────────────────────
 * TeamPreviewPhase 是队伍预览和首发选择阶段，负责：
 *   1. 队伍展示
 *      - 显示双方队伍的所有宝可梦
 *      - 展示宝可梦的贴图、名称、类型等信息
 *      - 支持鼠标悬停查看详细信息
 * 
 *   2. 首发选择
 *      - 处理玩家选择首发宝可梦
 *      - 验证选择的合法性
 *      - 发送选择命令到服务器
 * 
 *   3. 协议处理
 *      - 处理 |teampreview| 协议（如果有）
 *      - 处理 |request| 协议（包含队伍信息）
 *      - 等待服务器确认后进入下一阶段
 * 
 * ⚠️ 关键修复
 * ──────────────────────────────────────────────────────────────────────────
 * - 使用实际的 playerSide 而不是硬编码 'p1'
 * - 支持 PvP 模式下的双方选择
 * - 确保选择命令格式正确
 */
class TeamPreviewPhase extends PhaseBase {
  constructor(battleEngine, stateManager, ui) {
    super('team-preview');
    this.battleEngine = battleEngine;
    this.stateManager = stateManager;
    this.ui = ui;
    this.playerSelected = false;
    this.aiSelected = false;
    this.pendingChoice = null; // 待处理的选择（等待 request 协议）
  }

  onEnter(data) {
    console.log('[TeamPreviewPhase] 进入队伍预览阶段');
    this.stateManager.updateBattleState({ isTeamPreview: true });
    
    // 显示队伍预览UI
    if (this.ui) {
      this.ui.showTeamPreview();
    }
    
    // 渲染首发选择UI（简化版：直接在阶段中处理）
    this.renderLeadSelection();
    
    // 设置自动选择（收到 request 协议后，如果5秒内还没选择，自动选择）
    // 注意：只有在收到 request 协议后才开始计时
    this.autoSelectTimeout = null;
  }

  /**
   * 渲染首发选择UI（简化版）
   */
  renderLeadSelection() {
    const container = document.getElementById('lead-selection-container');
    if (!container) {
      console.warn('[TeamPreviewPhase] 找不到首发选择容器');
      return;
    }

    const team = this.stateManager.getPlayerTeam();
    if (!team || team.length === 0) {
      container.innerHTML = '<div class="placeholder">队伍未加载</div>';
      return;
    }

    console.log('[TeamPreviewPhase] 渲染首发选择UI，队伍数量:', team.length);
    container.innerHTML = '';

    // 创建标题
    const title = document.createElement('div');
    title.textContent = '选择首发宝可梦';
    title.style.cssText = 'font-weight: bold; margin-bottom: 10px; padding: 8px; background: #f0f0f0; border-radius: 5px;';
    container.appendChild(title);

    // 创建队伍列表
    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    team.forEach((pokemon, index) => {
      const position = index + 1;
      const item = document.createElement('div');
      item.dataset.position = position;
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: #fff;
        border: 2px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      `;

      // 鼠标悬停效果
      item.addEventListener('mouseenter', () => {
        if (!item.classList.contains('selected')) {
          item.style.borderColor = '#3d7dca';
          item.style.background = '#f0f7ff';
        }
      });

      item.addEventListener('mouseleave', () => {
        if (!item.classList.contains('selected')) {
          item.style.borderColor = '#ddd';
          item.style.background = '#fff';
        }
      });

      // 点击选择
      item.addEventListener('click', () => {
        console.log(`[TeamPreviewPhase] 用户点击选择首发: 位置 ${position}`);
        this.selectLead(position);
      });

      // 位置编号
      const positionLabel = document.createElement('div');
      positionLabel.textContent = `${position}.`;
      positionLabel.style.cssText = 'font-weight: bold; color: #666; min-width: 30px;';
      item.appendChild(positionLabel);

      // 精灵图片
      const sprite = document.createElement('img');
      const spriteSpecies = pokemon.name || pokemon.nameId || pokemon.species;
      if (spriteSpecies && typeof SpriteLoader?.applySpriteToImage === 'function') {
        SpriteLoader.applySpriteToImage(sprite, spriteSpecies);
      } else {
        const spriteUrl = SpriteLoader.getPokemonSpriteUrl(spriteSpecies);
        sprite.src = spriteUrl;
      }
      sprite.alt = Localization?.translatePokemon(spriteSpecies) || pokemon.name || 'Pokemon';
      sprite.style.cssText = 'width: 48px; height: 48px; object-fit: contain;';
      item.appendChild(sprite);

      // 精灵名称
      const name = document.createElement('div');
      const translatedName = Localization?.translatePokemon(pokemon.nameId || pokemon.name || pokemon.species);
      name.textContent = translatedName || pokemon.name || pokemon.nameId || pokemon.species || `宝可梦${position}`;
      name.style.cssText = 'flex: 1; font-weight: bold; color: #333;';
      item.appendChild(name);

      // 选中标记
      const checkmark = document.createElement('div');
      checkmark.textContent = '✓';
      checkmark.style.cssText = 'display: none; color: #4caf50; font-weight: bold; font-size: 20px;';
      item.appendChild(checkmark);

      list.appendChild(item);
    });

    container.appendChild(list);
  }

  /**
   * 处理协议消息
   */
  handleProtocol(line) {
    if (line.startsWith('|poke|')) {
      this.handlePokeProtocol(line);
    } else if (line.startsWith('|request|')) {
      this.handleRequestProtocol(line);
    } else if (line.startsWith('|start|')) {
      // 对战开始，进入下一阶段
      console.log('[TeamPreviewPhase] 收到 |start| 协议，对战开始，转换到 pokemon-data 阶段');
      this.transitionTo('pokemon-data');
    } else if (line.startsWith('|switch|') || line.startsWith('|drag|')) {
      // 如果收到 switch，说明已经进入对战
      // 关键修复：在处理 switch 协议时，也要更新宝可梦显示
      console.log('[TeamPreviewPhase] 收到 |switch| 协议，处理中...');
      this.handleSwitchProtocol(line);
      // 转换到 pokemon-data 阶段
      console.log('[TeamPreviewPhase] 转换到 pokemon-data 阶段');
      this.transitionTo('pokemon-data');
    } else if (line.startsWith('|teampreview|')) {
      // 队伍预览标记
      console.log('[TeamPreviewPhase] 收到 |teampreview| 协议');
    }
  }

  /**
   * 处理 |poke| 协议
   */
  handlePokeProtocol(line) {
    const parts = line.slice('|poke|'.length).split('|');
    if (parts.length >= 2) {
      const player = parts[0].trim();
      const details = parts[1].trim();
      const itemHint = parts[2]?.trim() || '';
      
      console.log(`[TeamPreviewPhase] ${player} 队伍预览: ${details}`);
      
      // 更新UI显示队伍
      if (this.ui) {
        this.ui.addPokemonToPreview(player, details, itemHint);
      }
      
      // 关键修复：不要在收到 |poke| 协议时就显示宝可梦
      // 只有在用户选择首发后，或者收到 |switch| 协议后，才显示宝可梦
      // 这样可以避免在用户选择之前就显示第一个宝可梦，导致状态不一致
      // 
      // 注意：|poke| 协议只是用于队伍预览，不应该更新活跃宝可梦
      // 活跃宝可梦应该在收到 |switch| 协议后更新
      console.log(`[TeamPreviewPhase] 收到 ${player} 的 |poke| 协议: ${details}`);
      console.log(`[TeamPreviewPhase] 注意：|poke| 协议仅用于队伍预览，不更新活跃宝可梦`);
      console.log(`[TeamPreviewPhase] 活跃宝可梦将在用户选择首发后或收到 |switch| 协议后更新`);
    }
  }

  /**
   * 处理 |request| 协议（队伍预览请求）
   */
  handleRequestProtocol(line) {
    console.log(`[TeamPreviewPhase] 🔥 收到 request 协议，原始长度: ${line.length}`);
    console.log(`[TeamPreviewPhase] request 协议前200字符: ${line.substring(0, 200)}...`);
    try {
      const req = JSON.parse(line.slice('|request|'.length));
      console.log('[TeamPreviewPhase] ✅ request 协议解析成功');
      console.log('[TeamPreviewPhase] request.side.id:', req?.side?.id);
      console.log('[TeamPreviewPhase] request.teamPreview:', req?.teamPreview);
      console.log('[TeamPreviewPhase] request.active:', req?.active ? '存在' : '不存在');
      
      // 关键修复：在 AI 模式下，玩家总是 p1
      // 在 PvP 模式下，从 URL 参数或 localStorage 获取
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      const isAIMode = mode === 'ai';
      
      let playerSide;
      if (isAIMode) {
        // AI 模式下，玩家总是 p1
        playerSide = 'p1';
        console.log('[TeamPreviewPhase] AI 模式，玩家身份固定为 p1');
      } else {
        // PvP 模式下，从 URL 参数或 localStorage 获取
        const urlSide = urlParams.get('side');
        playerSide = (urlSide && (urlSide === 'p1' || urlSide === 'p2')) 
          ? urlSide 
          : (localStorage.getItem('pvpSide') || 'p1');
        console.log('[TeamPreviewPhase] PvP 模式，玩家身份:', playerSide);
      }
      
      console.log('[TeamPreviewPhase] 最终玩家身份 (playerSide):', playerSide);
      console.log('[TeamPreviewPhase] request.side.id:', req?.side?.id);
      
      // 检查是否是当前玩家的 request 协议
      // 注意：在队伍预览阶段，request 协议可能没有 teamPreview 字段
      // 但是如果有 side.pokemon 数组，说明这是队伍预览的 request
      const isTeamPreviewRequest = req?.teamPreview || (req?.side?.pokemon && Array.isArray(req.side.pokemon) && req.side.pokemon.length > 0);
      const isMyRequest = req && req.side && req.side.id === playerSide;
      
      console.log('[TeamPreviewPhase] 是否是队伍预览请求:', isTeamPreviewRequest);
      console.log('[TeamPreviewPhase] 是否是我的请求:', isMyRequest);
      console.log('[TeamPreviewPhase] request.side.id:', req?.side?.id, 'playerSide:', playerSide);
      
      // 关键修复：在 AI 模式下，如果 request.side.id 是 p1，应该处理
      // 因为 AI 模式下，玩家总是 p1，即使 playerSide 判断错误也要处理
      const shouldProcess = (isAIMode && req?.side?.id === 'p1' && isTeamPreviewRequest) || 
                           (isMyRequest && isTeamPreviewRequest);
      
      if (shouldProcess) {
        // 正常处理我的队伍预览请求
        console.log('[TeamPreviewPhase] ✅ 收到我的队伍预览请求');
        this.stateManager.setCurrentRequest(req);
        if (this.ui) {
          this.ui.updateTeamFromRequest(req.side.id, req.side.pokemon);
        }
        
        // 显示选择UI
        if (this.ui) {
          console.log('[TeamPreviewPhase] 调用 showLeadSelection，传入的pokemon:', req.side.pokemon);
          console.log('[TeamPreviewPhase] req.side.pokemon长度:', req.side.pokemon?.length);
          if (req.side.pokemon && req.side.pokemon.length > 0) {
            console.log('[TeamPreviewPhase] 第一个pokemon的结构:', Object.keys(req.side.pokemon[0]));
            console.log('[TeamPreviewPhase] 第一个pokemon的值:', req.side.pokemon[0]);
          }
          this.ui.showLeadSelection(req.side.pokemon);
        }
        
        // 如果有待处理的选择，立即发送
        if (this.pendingChoice && !this.playerSelected) {
          console.log(`[TeamPreviewPhase] 有待处理的选择: 位置 ${this.pendingChoice}，立即发送`);
          this.selectLead(this.pendingChoice);
        } else if (!this.playerSelected) {
          // 如果没有待处理的选择，设置自动选择（5秒后如果还没选择）
          this.autoSelectTimeout = setTimeout(() => {
            if (!this.playerSelected && this.stateManager.getCurrentRequest()) {
              console.log('[TeamPreviewPhase] 自动选择首发宝可梦（位置1）');
              this.selectLead(1);
            }
          }, 5000);
        }
      } else if (isMyRequest && !isTeamPreviewRequest) {
        // 这是对战中的 request（不是队伍预览），应该转换到对战阶段
        console.log('[TeamPreviewPhase] 收到对战中的 request 协议，转换到对战阶段');
        this.stateManager.setCurrentRequest(req);
        this.transitionTo('battle');
      } else {
        console.log('[TeamPreviewPhase] 忽略非我的 request 协议');
      }
    } catch (e) {
      console.error('[TeamPreviewPhase] 解析 request 失败:', e);
      console.error('[TeamPreviewPhase] 原始数据:', line.substring(0, 500));
    }
  }

  /**
   * 选择首发宝可梦
   */
  selectLead(position) {
    if (this.playerSelected) {
      console.warn('[TeamPreviewPhase] 已经选择过首发');
      return;
    }

    // 检查是否已经收到了 request 协议
    const currentRequest = this.stateManager.getCurrentRequest();
    if (!currentRequest) {
      console.warn('[TeamPreviewPhase] 还没有收到 request 协议，等待中...');
      console.warn('[TeamPreviewPhase] 选择已记录，将在收到 request 协议后发送');
      // 保存选择，等待 request 协议到达后再发送
      this.pendingChoice = position;
      return;
    }

    console.log(`[TeamPreviewPhase] 选择首发宝可梦: 位置 ${position}`);
    console.log(`[TeamPreviewPhase] 当前 request:`, currentRequest);
    this.playerSelected = true;
    this.pendingChoice = null; // 清除待处理的选择
    
    // 关键修复：从 request 协议中获取选中的宝可梦信息并提前显示
    // 这样可以避免等待 |switch| 协议，提供更好的用户体验
    if (currentRequest && currentRequest.side && currentRequest.side.pokemon) {
      const selectedPokemon = currentRequest.side.pokemon[position - 1];
      if (selectedPokemon) {
        console.log(`[TeamPreviewPhase] 从 request 协议获取选中的宝可梦:`, selectedPokemon.ident);
        
        // 关键修复：从 request 协议中获取玩家身份，而不是硬编码 'p1'
        const playerSide = currentRequest.side.id;
        
        // 更新状态
        const pokemonData = {
          ident: selectedPokemon.ident,
          species: SpriteLoader.extractSpeciesFromDetails(selectedPokemon.details),
          details: selectedPokemon.details,
          condition: selectedPokemon.condition || '100/100',
          side: playerSide,
          moves: selectedPokemon.moves || []
        };
        
        this.stateManager.updateActivePokemon(playerSide, pokemonData);
        
        // 更新UI
        if (this.ui) {
          this.ui.updatePokemonDisplay(playerSide, pokemonData);
        }
      }
    }
    
    // 发送选择命令
    // 注意：根据 Pokemon Showdown 标准，可以使用 'team 1' 或 'default'
    // 'default' 表示使用默认首发（通常是第一个）
    // 'team 1' 表示明确选择位置1的宝可梦
    const command = `team ${position}`;
    console.log(`[TeamPreviewPhase] ========== 发送选择命令 ==========`);
    console.log(`[TeamPreviewPhase] 命令: ${command}`);
    console.log(`[TeamPreviewPhase] 当前阶段: ${this.name}`);
    console.log(`[TeamPreviewPhase] playerSelected: ${this.playerSelected}`);
    
    const success = this.battleEngine.sendChoice(command);
    
    if (success) {
      console.log('[TeamPreviewPhase] ✅ 命令发送成功');
      console.log('[TeamPreviewPhase] 等待服务器响应（应该会收到 |switch| 或 |request| 协议）');
    } else {
      console.error('[TeamPreviewPhase] ❌ 命令发送失败');
    }
    
    // 清除自动选择定时器
    if (this.autoSelectTimeout) {
      clearTimeout(this.autoSelectTimeout);
      this.autoSelectTimeout = null;
    }

    // 更新UI
    if (this.ui) {
      this.ui.onLeadSelected(position);
    }
  }

  /**
   * 处理 |switch| 协议
   */
  handleSwitchProtocol(line) {
    try {
      const parts = line.slice(line.startsWith('|switch|') ? '|switch|'.length : '|drag|'.length).split('|');
      if (parts.length >= 3) {
        const ident = parts[0].trim();
        const details = parts[1].trim();
        const condition = parts[2].trim();
        
        // 解析玩家（p1 或 p2）
        const side = ident.includes('p1') ? 'p1' : (ident.includes('p2') ? 'p2' : null);
        if (!side) {
          console.warn(`[TeamPreviewPhase] 无法识别 switch 协议中的玩家: ${ident}`);
          return;
        }
        
        const species = SpriteLoader.extractSpeciesFromDetails(details);
        
        console.log(`[TeamPreviewPhase] ${side} 切换宝可梦: ${species}`);
        
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
      console.error('[TeamPreviewPhase] 解析 switch 协议失败:', e);
    }
  }

  /**
   * 处理用户操作
   */
  handleUserAction(action, data) {
    if (action === 'select-lead') {
      this.selectLead(data.position);
    }
  }

  onExit() {
    if (this.autoSelectTimeout) {
      clearTimeout(this.autoSelectTimeout);
    }
  }
}

export default TeamPreviewPhase;

