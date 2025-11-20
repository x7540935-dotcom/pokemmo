import Localization from '../utils/Localization.js';
import SpriteLoader from '../utils/SpriteLoader.js';
import PokemonUtils from '../utils/PokemonUtils.js';
import MoveDataHelper from '../utils/MoveDataHelper.js';

/**
 * 对战UI管理器（BattleUI）
 * 
 * 职责：
 * - 负责所有对战UI的更新和交互
 * - 渲染技能按钮、换人选项、宝可梦显示
 * - 处理用户交互（点击技能、选择换人）
 * - 更新HP条、状态显示、战斗日志
 * - 显示对战结果对话框
 * 
 * UI元素：
 * - moves: 技能按钮数组（4个）
 * - switchSelect: 换人下拉列表
 * - switchBtn: 换人确认按钮
 * - playerTeamList/opponentTeamList: 双方队伍卡片容器
 * - playerActive/opponentActive: 当前上场宝可梦信息卡片（名称、类型、HP、状态、道具）
 * - battleLog: 战斗日志容器
 * 
 * 功能：
 * - 显示队伍预览
 * - 显示首发选择
 * - 渲染技能和换人选项
 * - 更新宝可梦显示（图片、名字、HP）
 * - 显示对战结束对话框
 */
class BattleUI {
  constructor(domElements) {
    this.dom = domElements;
    this.onMoveClickCallback = null;
    this.onSwitchClickCallback = null;
    this.teamData = { p1: [], p2: [] };
    this.teamOrder = { p1: [], p2: [] };
    this.teamCache = { p1: {}, p2: {} };
    this.previewKeyMap = { p1: new Map(), p2: new Map() };
    this.activePokemon = { p1: null, p2: null };
    this.switchIndexMap = { p1: {}, p2: {} };
    this.playerSide = 'p1';
    this.canChooseSwitch = false;
    this.showdownData = window.ShowdownData || { moves: {}, pokedex: {}, items: {} };
    this.STATUS_CONFIG = {
      brn: { label: '灼', color: '#ff7043' },
      par: { label: '麻', color: '#ffeb3b', text: '#795548' },
      slp: { label: '眠', color: '#9575cd' },
      psn: { label: '毒', color: '#9ccc65' },
      tox: { label: '剧', color: '#6a1b9a' },
      frz: { label: '冻', color: '#4dd0e1', text: '#004d40' },
      confusion: { label: '乱', color: '#ef6c00' },
      fnt: { label: '倒', color: '#9e9e9e' }
    };
    this.TYPE_COLORS = {
      normal: ['#a8a878', '#6d6d4e'],
      fire: ['#f08030', '#c03028'],
      water: ['#6890f0', '#386ceb'],
      electric: ['#f8d030', '#c19c00'],
      grass: ['#78c850', '#4e8234'],
      ice: ['#98d8d8', '#638d8d'],
      fighting: ['#c03028', '#7d1f1a'],
      poison: ['#a040a0', '#682a68'],
      ground: ['#e0c068', '#a58a4a'],
      flying: ['#a890f0', '#6d5e9c'],
      psychic: ['#f85888', '#a13959'],
      bug: ['#a8b820', '#6d7815'],
      rock: ['#b8a038', '#786824'],
      ghost: ['#705898', '#493963'],
      dragon: ['#7038f8', '#4c08a1'],
      dark: ['#705848', '#49392f'],
      steel: ['#b8b8d0', '#787887'],
      fairy: ['#ee99ac', '#9b6470']
    };
    this.setupEventListeners();
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    for (let i = 0; i < 4; i++) {
      const btn = this.dom.moves[i];
      if (btn) {
        btn.addEventListener('click', () => {
          console.log(`[BattleUI] 技能按钮 ${i + 1} 被点击`);
          console.log(`[BattleUI] 按钮 disabled 状态: ${btn.disabled}`);
          console.log(`[BattleUI] 按钮 display 状态: ${btn.style.display}`);
          if (!btn.disabled) {
            console.log(`[BattleUI] 调用 onMoveClick(${i + 1})`);
            this.onMoveClick(i + 1);
          } else {
            console.warn(`[BattleUI] 按钮已禁用，无法点击`);
          }
        });
      }
    }

    // 换人按钮
    if (this.dom.switchBtn) {
      this.dom.switchBtn.addEventListener('click', () => {
        const val = this.dom.switchSelect?.value;
        if (val && !this.dom.switchBtn.disabled) {
          this.onSwitchClick(val);
        }
      });
    }

    // 换人下拉框变化
    if (this.dom.switchSelect) {
      this.dom.switchSelect.addEventListener('change', () => {
        if (this.dom.switchBtn) {
          this.dom.switchBtn.disabled = !this.dom.switchSelect.value;
        }
      });
    }
  }

  /**
   * 显示队伍预览
   */
  showTeamPreview() {
    if (this.dom.turnStatus) {
      this.dom.turnStatus.textContent = '队伍预览 - 请选择首发宝可梦';
    }
    if (this.dom.leadSelectionContainer) {
      this.dom.leadSelectionContainer.style.display = 'block';
    }
  }

  addPokemonToPreview(player, details, item) {
    const species = SpriteLoader.extractSpeciesFromDetails(details);
    const ident = `${player}: ${species}`;
    this.upsertPreviewPokemon(player, { ident, species, details, item });
  }

  showLeadSelection(pokemonList) {
    if (!this.dom.leadSelectionContainer) return;
    this.dom.leadSelectionContainer.innerHTML = '';
    const title = document.createElement('div');
    title.textContent = '选择首发宝可梦';
    title.style.cssText = 'font-weight: bold; margin-bottom: 10px;';
    this.dom.leadSelectionContainer.appendChild(title);

    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    if (Array.isArray(pokemonList)) {
      pokemonList.forEach((p, idx) => {
        if (p && !p.condition?.includes('fnt')) {
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'btn';
          item.style.justifyContent = 'space-between';
          const position = idx + 1;
          const displayName = PokemonUtils ?
            PokemonUtils.getDisplayName(p, position) :
            (p.name || p.species || `宝可梦${position}`);
          item.textContent = `${position}. ${displayName}`;
          item.addEventListener('click', () => {
            if (this.dom.switchSelect) {
              this.dom.switchSelect.value = String(position);
            }
            if (this.dom.switchBtn) {
              this.dom.switchBtn.disabled = false;
            }
            this.onSwitchClick(String(position));
          });
          list.appendChild(item);
        }
      });
    }
    this.dom.leadSelectionContainer.appendChild(list);

    if (this.dom.switchSelect) {
      this.dom.switchSelect.innerHTML = '<option value="">选择首发宝可梦</option>';
      pokemonList.forEach((p, idx) => {
        if (!p.active && !p.condition?.includes('fnt')) {
          const opt = document.createElement('option');
          opt.value = String(idx + 1);
          const displayName = PokemonUtils ?
            PokemonUtils.getDisplayName(p, idx + 1) :
            (p.name || p.species || `宝可梦${idx + 1}`);
          opt.textContent = `${idx + 1}. ${displayName}`;
          this.dom.switchSelect.appendChild(opt);
        }
      });
      this.dom.switchSelect.disabled = false;
    }
    if (this.dom.switchBtn) {
      this.dom.switchBtn.disabled = true;
    }
  }

  /**
   * 首发已选择
   */
  onLeadSelected(position) {
    if (this.dom.turnStatus) {
      this.dom.turnStatus.textContent = `已选择首发: 位置 ${position}`;
    }
    if (this.dom.leadSelectionContainer) {
      this.dom.leadSelectionContainer.innerHTML = `<div class="placeholder">已选择首发：位置 ${position}</div>`;
    }
  }

  /**
   * 更新宝可梦显示
   */
  updatePokemonDisplay(side, pokemonData) {
    const renderStartTime = performance.now();
    const activeDom = side === 'p1' ? this.dom.playerActive : this.dom.opponentActive;
    if (!activeDom) return;
    const species = pokemonData.species || SpriteLoader.extractSpeciesFromDetails(pokemonData.details);
    const stableIdent = this.normalizeBattleIdent(pokemonData.ident || pokemonData.details || species);
    if (stableIdent) {
      pokemonData.ident = stableIdent;
    }
    this.activePokemon[side] = { ...pokemonData };
    const localizedName = Localization?.translatePokemon(species);
    activeDom.name.textContent = localizedName || pokemonData.name || species;

    if (activeDom.sprite && species) {
      if (typeof SpriteLoader.applySpriteToImage === 'function') {
        SpriteLoader.applySpriteToImage(activeDom.sprite, species);
      } else {
        const fallbackUrl = SpriteLoader.getPokemonSpriteUrl(species);
        activeDom.sprite.src = fallbackUrl;
      }
      activeDom.sprite.style.display = 'block';
      if (typeof activeDom.sprite.style.setProperty === 'function') {
        activeDom.sprite.style.setProperty('--sprite-scale', side === 'p1' ? '-1' : '1');
      } else {
        activeDom.sprite.style.transform = `scaleX(${side === 'p1' ? -1 : 1})`;
      }
    }

    const types = this.getTypesForSpecies(species);
    this.renderTypeBadges(activeDom.types, types);

    const conditionInfo = this.parseCondition(pokemonData.condition);
    this.updateHPBarElement(activeDom.hp, conditionInfo.percent);
    this.renderStatusChips(activeDom.statuses, conditionInfo.statuses);

    if (side === 'p1') {
      const itemName = pokemonData.item || conditionInfo.item;
      if (itemName) {
        this.setItemDisplay(activeDom.item, activeDom.itemIcon, itemName);
      } else if (activeDom.item) {
        activeDom.item.textContent = '无道具';
        if (activeDom.itemIcon) {
          activeDom.itemIcon.style.display = 'none';
        }
      }
    }

    this.updateTeamActiveState(side, pokemonData.ident);
    this.updateTeamConditionByIdent(side, pokemonData.ident, pokemonData.condition, pokemonData.item);
    
    // 记录 UI 渲染时间
    const renderTime = performance.now() - renderStartTime;
    try {
      import('../utils/PerformanceMonitor.js').then(({ getGlobalMonitor }) => {
        const monitor = getGlobalMonitor();
        monitor.recordUIRenderTime('updatePokemonDisplay', renderTime);
      }).catch(() => {
        // 忽略错误
      });
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 更新HP条
   */
  updateHPBarElement(bar, percent) {
    if (!bar) return;
    const value = Math.max(0, Math.min(100, percent ?? 0));
    bar.style.width = `${value}%`;
    bar.style.background = value > 50 ? '#4caf50' : value > 25 ? '#ff9800' : '#f44336';
  }

  /**
   * 更新宝可梦HP
   */
  updatePokemonHP(side, condition, ident) {
    const activeDom = side === 'p1' ? this.dom.playerActive : this.dom.opponentActive;
    if (activeDom?.hp) {
      const info = this.parseCondition(condition);
      this.updateHPBarElement(activeDom.hp, info.percent);
      this.renderStatusChips(activeDom.statuses, info.statuses);
    }
    if (ident) {
      this.updateTeamConditionByIdent(side, ident, condition);
    }
  }

  /**
   * 渲染技能按钮
   */
  renderMoves(moves, canChoose) {
    this.dom.moves.forEach(btn => {
      btn.disabled = true;
      btn.style.display = 'none';
      btn.title = '';
    });
    if (!moves?.length) return;
    moves.forEach((move, index) => {
      if (!this.dom.moves[index]) return;
      const btn = this.dom.moves[index];
      const moveInfo = this.enrichMoveData(move);
      btn.querySelector('.move-name').textContent = moveInfo.displayName;
      btn.querySelector('.move-meta').textContent = this.buildMoveMetaText(moveInfo);
      btn.disabled = !!moveInfo.disabled || !canChoose;
      btn.style.display = 'flex';
      btn.title = this.buildMoveTooltip(moveInfo);
      btn.dataset.moveType = moveInfo.type || '';
      btn.style.background = this.getTypeGradient(moveInfo.type);
    });
  }

  /**
   * 渲染换人选项
   */
  renderSwitchOptions(pokemonList, canChoose) {
    if (!this.dom.switchSelect) return;
    if (Array.isArray(pokemonList)) {
      const map = {};
      pokemonList.forEach((pokemon, index) => {
        if (!pokemon) return;
        const ident = this.normalizeBattleIdent(pokemon.ident || pokemon.details || `${this.playerSide}-${index}`);
        if (ident) {
          map[ident] = index + 1;
        }
      });
      this.switchIndexMap[this.playerSide] = map;
    }
    const commandIndexMap = this.switchIndexMap[this.playerSide] || {};
    this.canChooseSwitch = !!canChoose;
    const currentValue = this.dom.switchSelect.value;
    this.dom.switchSelect.innerHTML = '<option value="">选择要上场的宝可梦（换人）</option>';
    const team = this.teamData[this.playerSide] || [];
    const bench = team.filter(p => !p.active && !p.fainted);
    bench.forEach(p => {
      const commandIndex = commandIndexMap[p.ident];
      if (!commandIndex) return;
      const opt = document.createElement('option');
      opt.value = String(commandIndex);
      opt.textContent = `${p.slot}. ${p.name}`;
      this.dom.switchSelect.appendChild(opt);
    });
    if ([...this.dom.switchSelect.options].some(opt => opt.value === currentValue)) {
      this.dom.switchSelect.value = currentValue;
    } else {
      this.dom.switchSelect.value = '';
    }
    const hasOptions = this.dom.switchSelect.options.length > 1;
    this.dom.switchSelect.disabled = !canChoose || !hasOptions;
    if (this.dom.switchBtn) {
      this.dom.switchBtn.disabled = !canChoose || !hasOptions || !this.dom.switchSelect.value;
    }
  }

  /**
   * 显示强制换人
   */
  showForceSwitch(pokemonList) {
    if (this.dom.turnStatus) {
      this.dom.turnStatus.textContent = '必须换人';
    }
    this.renderSwitchOptions(pokemonList, true);
    this.dom.moves.forEach(btn => {
      btn.disabled = true;
    });
  }

  refreshSwitchOptions() {
    if (!this.dom.switchSelect) return;
    this.renderSwitchOptions(null, this.canChooseSwitch);
  }

  /**
   * 更新回合状态
   */
  updateTurnStatus(text) {
    if (this.dom.turnStatus) {
      this.dom.turnStatus.textContent = text;
    }
  }

  /**
   * 更新回合数
   */
  updateTurnNumber(turn) {
    console.log(`[BattleUI] 回合 ${turn}`);
  }

  /**
   * 禁用所有操作
   */
  disableAllActions() {
    this.dom.moves.forEach(btn => {
      btn.disabled = true;
    });
    if (this.dom.switchBtn) {
      this.dom.switchBtn.disabled = true;
    }
    if (this.dom.switchSelect) {
      this.dom.switchSelect.disabled = true;
    }
    if (this.dom.turnStatus) {
      this.dom.turnStatus.textContent = '等待服务器响应...';
    }
  }

  /**
   * 显示对战结束
   */
  showBattleEnd(result) {
    const messages = {
      win: '你赢了！',
      lose: '你输了！',
      tie: '平局！'
    };
    if (this.dom.turnStatus) {
      this.dom.turnStatus.textContent = messages[result] || '对战结束';
    }
    this.disableAllActions();
    
    // 显示结束对话框
    this.showBattleEndDialog(result, messages[result] || '对战结束！');
  }
  
  showBattleEndDialog(result, message) {
    // 检查是否已经显示过对话框
    if (document.getElementById('battle-end-dialog')) {
      return;
    }
    
    // 获取当前难度（从URL参数）
    const urlParams = new URLSearchParams(window.location.search);
    const currentDifficulty = urlParams.get('difficulty');
    const isAIMode = urlParams.get('mode') === 'ai';
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.id = 'battle-end-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    
    // 添加淡入动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #battle-end-dialog .dialog-content {
        animation: slideUp 0.3s ease;
      }
    `;
    document.head.appendChild(style);
    
    const resultColor = result === 'win' ? '#4caf50' : result === 'lose' ? '#f44336' : '#ff9800';
    const resultIcon = result === 'win' ? '🎉' : result === 'lose' ? '😢' : '🤝';
    
    dialog.innerHTML = `
      <div class="dialog-content" style="
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      ">
        <div style="font-size: 4rem; margin-bottom: 20px;">${resultIcon}</div>
        <h2 style="color: ${resultColor}; font-size: 2rem; margin-bottom: 10px;">${message}</h2>
        <p style="color: #666; margin-bottom: 30px;">对战已结束</p>
        <div style="display: flex; flex-direction: column; gap: 15px;">
          ${isAIMode && currentDifficulty ? `
            <button class="end-dialog-btn" data-action="retry" style="
              background: #3d7dca;
              color: white;
              border: none;
              border-radius: 10px;
              padding: 15px 30px;
              font-size: 1.1rem;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            ">重新挑战当前难度</button>
            <button class="end-dialog-btn" data-action="change-difficulty" style="
              background: #ffcb05;
              color: #333;
              border: none;
              border-radius: 10px;
              padding: 15px 30px;
              font-size: 1.1rem;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            ">选择其他难度</button>
          ` : ''}
          <button class="end-dialog-btn" data-action="home" style="
            background: #f5f5f5;
            color: #333;
            border: 2px solid #ddd;
            border-radius: 10px;
            padding: 15px 30px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          ">返回主页面</button>
        </div>
      </div>
    `;
    
    // 添加按钮悬停效果
    const buttons = dialog.querySelectorAll('.end-dialog-btn');
    const self = this;
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.3)';
      });
      btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
      });
      
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        self.handleBattleEndAction(action, currentDifficulty);
      });
    });
    
    document.body.appendChild(dialog);
  }
  
  handleBattleEndAction(action, currentDifficulty) {
    // 移除对话框
    const dialog = document.getElementById('battle-end-dialog');
    if (dialog) {
      dialog.remove();
    }
    
    switch (action) {
      case 'retry':
        // 重新挑战当前难度
        if (currentDifficulty) {
          window.location.href = `battle.html?mode=ai&difficulty=${currentDifficulty}`;
        } else {
          window.location.href = 'battle.html?mode=ai&difficulty=2';
        }
        break;
      case 'change-difficulty':
        // 选择其他难度
        window.location.href = 'ai-difficulty.html';
        break;
      case 'home':
        // 返回主页面
        window.location.href = 'pokemmo.html';
        break;
      default:
        window.location.href = 'pokemmo.html';
    }
  }

  /**
   * 事件回调（由外部设置）
   */
  onMoveClick(moveIndex) {
    console.log(`[BattleUI] onMoveClick 被调用，moveIndex: ${moveIndex}`);
    console.log(`[BattleUI] onMoveClickCallback 存在: ${!!this.onMoveClickCallback}`);
    if (this.onMoveClickCallback) {
      console.log(`[BattleUI] 调用回调函数`);
      this.onMoveClickCallback(moveIndex);
    } else {
      console.error(`[BattleUI] 错误：onMoveClickCallback 未设置！`);
    }
  }

  onSwitchClick(position) {
    if (this.onSwitchClickCallback) {
      this.onSwitchClickCallback(position);
    }
  }

  /**
   * 设置回调函数
   */
  setMoveClickCallback(callback) {
    this.onMoveClickCallback = callback;
  }

  setSwitchClickCallback(callback) {
    this.onSwitchClickCallback = callback;
  }

  /* ======================== 新增辅助方法 ======================== */

  updateTeamFromRequest(sideId, teamList) {
    if (!Array.isArray(teamList)) return;
    this.playerSide = sideId || this.playerSide;
    this.ensureTeamStorage(sideId);
    if (this.teamOrder[sideId].length === 0) {
      this.teamOrder[sideId] = teamList
        .slice(0, 6)
        .map((pokemon, index) => {
          const baseIdent = this.normalizeBattleIdent(pokemon.ident || pokemon.details);
          return baseIdent || `${sideId}-${index}`;
        });
    }
    teamList.slice(0, 6).forEach((pokemon, index) => {
      if (!pokemon) return;
      const rawIdent = pokemon.ident || pokemon.details || `${sideId}-${index}`;
      const ident = this.normalizeBattleIdent(rawIdent) || rawIdent;
      this.updatePreviewMapping(sideId, pokemon, ident);
      const slot = this.assignSlotForIdent(sideId, ident);
      if (!slot) return;
      const normalized = this.normalizePokemonForTeam(pokemon, index, sideId, slot, ident);
      this.teamCache[sideId][ident] = normalized;
    });
    this.syncTeamData(sideId);
  }

  upsertPreviewPokemon(sideId, info) {
    if (!sideId || !info?.species) return;
    const target = sideId;
    this.ensureTeamStorage(target);
    const species = info.species || SpriteLoader.extractSpeciesFromDetails(info.details || '');
    const rawIdent = info.ident || `${target}: ${species}`;
    const ident = this.normalizeBattleIdent(rawIdent) || rawIdent;
    const slot = this.assignSlotForIdent(target, ident);
    if (!slot) return;
    const key = info.details || info.species;
    if (key && this.previewKeyMap[target].has(key)) {
      const mappedIdent = this.previewKeyMap[target].get(key);
      this.teamCache[target][mappedIdent] = {
        ...this.teamCache[target][mappedIdent],
        sprite: this.teamCache[target][mappedIdent]?.sprite || SpriteLoader.getPokemonSpriteUrl(info.species)
      };
      this.syncTeamData(target);
      return;
    }
    if (key) {
      this.previewKeyMap[target].set(key, ident);
    }
    const normalized = this.normalizePokemonForTeam({
      ident,
      species: info.species,
      name: info.species,
      details: info.details || `${info.species}`,
      item: info.item || '',
      condition: '100/100',
      active: false
    }, slot - 1, target, slot, ident);
    this.teamCache[target][ident] = normalized;
    this.syncTeamData(target);
  }

  ensureTeamStorage(sideId) {
    if (!this.teamOrder[sideId]) this.teamOrder[sideId] = [];
    if (!this.teamCache[sideId]) this.teamCache[sideId] = {};
    if (!this.teamData[sideId]) this.teamData[sideId] = [];
    if (!this.previewKeyMap[sideId]) this.previewKeyMap[sideId] = new Map();
  }

  assignSlotForIdent(sideId, ident) {
    if (!ident) return null;
    const order = this.teamOrder[sideId];
    if (!order) return null;
    const index = order.indexOf(ident);
    if (index !== -1) {
      return index + 1;
    }
    if (order.length >= 6) {
      return null;
    }
    order.push(ident);
    return order.length;
  }

  updatePreviewMapping(sideId, pokemon, ident) {
    const key = pokemon.details || pokemon.species;
    if (!key) return;
    const map = this.previewKeyMap[sideId];
    const previousIdent = map.get(key);
    if (previousIdent && previousIdent !== ident) {
      this.replaceTeamOrderIdent(sideId, previousIdent, ident);
      delete this.teamCache[sideId][previousIdent];
    }
    map.set(key, ident);
  }

  replaceTeamOrderIdent(sideId, oldIdent, newIdent) {
    if (!oldIdent || !newIdent) return;
    const order = this.teamOrder[sideId];
    if (!order) return;
    const index = order.indexOf(oldIdent);
    if (index !== -1) {
      order[index] = newIdent;
    }
  }

  normalizePokemonForTeam(pokemon, index, sideId, slotOverride, identOverride) {
    const species = pokemon.species || SpriteLoader.extractSpeciesFromDetails(pokemon.details || '');
    const displayName = PokemonUtils ?
      PokemonUtils.getDisplayName(pokemon, index + 1) :
      (pokemon.name || pokemon.species || `宝可梦${index + 1}`);
    const conditionInfo = this.parseCondition(pokemon.condition || '100/100');
    const types = this.getTypesForSpecies(species);
    const stableIdent = this.normalizeBattleIdent(identOverride || pokemon.ident || pokemon.details || `${sideId}a: ${species}`);
    return {
      slot: slotOverride || index + 1,
      ident: stableIdent,
      species,
      name: displayName,
      details: pokemon.details || '',
      item: pokemon.item || '',
      condition: pokemon.condition || '100/100',
      statuses: conditionInfo.statuses,
      hpPercent: conditionInfo.percent,
      fainted: conditionInfo.fainted,
      active: !!pokemon.active,
      side: sideId,
      types,
      sprite: SpriteLoader.getPokemonSpriteUrl(species)
    };
  }

  syncTeamData(sideId) {
    const order = this.teamOrder[sideId] || [];
    const cache = this.teamCache[sideId] || {};
    this.teamData[sideId] = order.map(id => cache[id]).filter(Boolean);
    this.renderTeamPanel(sideId);
    if (sideId === this.playerSide) {
      this.refreshSwitchOptions();
    }
  }

  renderTeamPanel(sideId) {
    const listEl = sideId === 'p1' ? this.dom.playerTeamList : this.dom.opponentTeamList;
    const countEl = sideId === 'p1' ? this.dom.playerTeamCount : this.dom.opponentTeamCount;
    if (!listEl) return;
    listEl.innerHTML = '';
    const team = this.teamData[sideId] || [];
    if (countEl) {
      countEl.textContent = `${team.length}/6`;
    }
    if (!team.length) {
      listEl.innerHTML = '<div class="placeholder">尚无队伍信息</div>';
      return;
    }
    team.forEach(pokemon => {
      listEl.appendChild(this.createTeamCard(pokemon));
    });
  }

  createTeamCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    if (pokemon.fainted) card.classList.add('pokemon-card--fainted');
    if (pokemon.active) card.classList.add('pokemon-card--active');

    const header = document.createElement('div');
    header.className = 'pokemon-card__header';

    const nameEl = document.createElement('div');
    nameEl.className = 'pokemon-card__name';
    nameEl.textContent = `${pokemon.slot}. ${pokemon.name}`;
    header.appendChild(nameEl);

    const body = document.createElement('div');
    body.className = 'pokemon-card__body';
    const sprite = document.createElement('img');
    sprite.className = 'pokemon-card__sprite';
    if (pokemon.species && typeof SpriteLoader.applySpriteToImage === 'function') {
      SpriteLoader.applySpriteToImage(sprite, pokemon.species);
    } else if (pokemon.sprite) {
      sprite.src = pokemon.sprite;
    } else if (pokemon.species) {
      sprite.src = SpriteLoader.getPokemonSpriteUrl(pokemon.species);
    } else {
      sprite.style.visibility = 'hidden';
    }
    body.appendChild(sprite);

    const details = document.createElement('div');
    details.className = 'pokemon-card__details';
    const typesEl = document.createElement('div');
    typesEl.className = 'pokemon-card__types';
    this.renderTypeBadges(typesEl, pokemon.types);
    header.appendChild(typesEl);
    details.appendChild(header);
    body.appendChild(details);
    card.appendChild(body);

    const meta = document.createElement('div');
    meta.className = 'pokemon-card__meta';
    const itemEl = document.createElement('div');
    itemEl.className = 'pokemon-card__item';
    const icon = document.createElement('img');
    icon.className = 'item-icon';
    itemEl.appendChild(icon);
    const itemText = document.createElement('span');
    itemEl.appendChild(itemText);
    this.setItemDisplay(itemText, icon, pokemon.item);
    meta.appendChild(itemEl);

    const statusEl = document.createElement('div');
    statusEl.className = 'pokemon-card__statuses';
    this.renderStatusChips(statusEl, pokemon.statuses);
    meta.appendChild(statusEl);
    card.appendChild(meta);

    const hpWrapper = document.createElement('div');
    hpWrapper.className = 'pokemon-card__hp';
    const hpBar = document.createElement('div');
    hpWrapper.appendChild(hpBar);
    this.updateHPBarElement(hpBar, pokemon.hpPercent);
    card.appendChild(hpWrapper);

    return card;
  }

  updateTeamConditionByIdent(side, ident, condition, item) {
    const team = this.teamData[side];
    if (!team) return;
    const stableIdent = this.normalizeBattleIdent(ident);
    const target = (this.teamCache[side] || {})[stableIdent];
    if (!target) return;
    const info = this.parseCondition(condition);
    target.condition = condition;
    target.hpPercent = info.percent;
    target.statuses = info.statuses;
    target.fainted = info.fainted;
    if (item) target.item = item;
    this.syncTeamData(side);
  }

  handleStatusEvent(side, ident, statusId) {
    this.updateStatusOnTeam(side, ident, statusId, true);
  }

  handleCureStatusEvent(side, ident, statusId) {
    this.updateStatusOnTeam(side, ident, statusId, false);
  }

  updateStatusOnTeam(side, ident, statusId, add) {
    const team = this.teamData[side];
    if (!team) return;
    const stableIdent = this.normalizeBattleIdent(ident);
    const target = team.find(p => p.ident === stableIdent);
    if (!target) return;
    const set = new Set(target.statuses || []);
    if (add) {
      if (statusId === 'fnt') {
        target.fainted = true;
        target.hpPercent = 0;
      }
      set.add(statusId);
    } else {
      set.delete(statusId);
    }
    target.statuses = Array.from(set);
    this.renderTeamPanel(side);

    const isActive = target.active;
    if (isActive) {
      const dom = side === 'p1' ? this.dom.playerActive : this.dom.opponentActive;
      if (dom?.statuses) {
        this.renderStatusChips(dom.statuses, target.statuses);
      }
    }
  }

  updateTeamActiveState(side, ident) {
    const cache = this.teamCache[side];
    if (!cache) return;
    const stableIdent = this.normalizeBattleIdent(ident);
    Object.keys(cache).forEach(key => {
      cache[key].active = key === stableIdent;
    });
    this.syncTeamData(side);
  }

  renderTypeBadges(container, types = []) {
    if (!container) return;
    container.innerHTML = '';
    types.forEach(type => {
      const badge = document.createElement('span');
      badge.className = 'type-badge';
      const lower = (type || '').toLowerCase();
      const colors = this.TYPE_COLORS[lower];
      badge.style.background = colors ? colors[0] : '#90a4ae';
      const localized = Localization?.translateType ? Localization.translateType(type) : null;
      badge.textContent = localized || type || '未知';
      container.appendChild(badge);
    });
  }

  renderStatusChips(container, statuses = []) {
    if (!container) return;
    container.innerHTML = '';
    if (!statuses.length) return;
    statuses.forEach(status => {
      const config = this.STATUS_CONFIG[status] || { label: status, color: '#9e9e9e' };
      const chip = document.createElement('span');
      chip.className = 'status-chip';
      chip.textContent = config.label;
      chip.style.background = config.color;
      if (config.text) chip.style.color = config.text;
      container.appendChild(chip);
    });
  }

  setItemDisplay(textEl, iconEl, itemId) {
    const normalizedId = this.normalizeId(itemId);
    const itemData = this.showdownData.items?.[normalizedId];
    const baseName = itemData?.name || itemId || '未知';
    const translated = Localization?.translateItem ? Localization.translateItem(baseName) : '';
    const displayName = itemId ? (translated || baseName) : '无道具';
    if (textEl) {
      textEl.textContent = displayName;
    }
    if (iconEl) {
      if (itemId && normalizedId) {
        iconEl.src = `https://play.pokemonshowdown.com/sprites/itemicons/${normalizedId}.png`;
        iconEl.style.display = 'inline-block';
        iconEl.onerror = () => {
          iconEl.style.display = 'none';
        };
      } else {
        iconEl.style.display = 'none';
      }
    }
  }

  parseCondition(condition = '') {
    const info = { percent: 100, statuses: [], fainted: false };
    if (!condition) return info;
    if (condition.includes('fnt')) {
      info.percent = 0;
      info.statuses = ['fnt'];
      info.fainted = true;
      return info;
    }
    const match = condition.match(/(\d+)\/(\d+)(?:\s([\w]+))?/);
    if (match) {
      const hp = parseInt(match[1], 10);
      const maxhp = parseInt(match[2], 10);
      info.percent = maxhp > 0 ? (hp / maxhp) * 100 : 0;
      if (hp <= 0) {
        info.percent = 0;
        info.fainted = true;
        info.statuses = ['fnt'];
        return info;
      }
      if (match[3]) {
        info.statuses = [match[3].toLowerCase()];
      }
    }
    return info;
  }

  getTypesForSpecies(species) {
    const id = this.normalizeId(species);
    return this.showdownData.pokedex?.[id]?.types || [];
  }

  normalizeId(name = '') {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  normalizeBattleIdent(ident = '') {
    if (!ident) return '';
    const trimmed = ident.trim();
    const match = trimmed.match(/^(p\d)([a-z])?:\s*(.+)$/i);
    if (match) {
      return `${match[1]}: ${match[3]}`.trim();
    }
    return trimmed;
  }

  setShowdownData(data) {
    this.showdownData = data || { moves: {}, pokedex: {}, items: {} };
    this.refreshAllDisplays();
  }

  onLocalizationReady() {
    this.refreshAllDisplays();
  }

  refreshAllDisplays() {
    ['p1', 'p2'].forEach(side => {
      const active = this.activePokemon[side];
      if (active) {
        this.updatePokemonDisplay(side, active);
      } else {
        this.renderTeamPanel(side);
      }
    });
  }

  enrichMoveData(move) {
    const moveId = move.id || move.move || move.name || '';
    const normalizedId = this.normalizeId(moveId);
    const data = this.showdownData.moves?.[normalizedId] || {};
    const ppInfo = move.pp !== undefined && move.maxpp !== undefined
      ? `${move.pp}/${move.maxpp}`
      : data.pp ? `${data.pp}` : '—';
    const type = move.type || data.type || '';
    const typeLabel = Localization?.translateType ? Localization.translateType(type) : type || '未知';
    const category = move.category || data.category || '';
    const categoryLabel = Localization?.translateCategory ? Localization.translateCategory(category) : category || '未知';
    const powerValue = move.basePower ?? data.basePower;
    const powerText = typeof powerValue === 'number'
      ? (powerValue > 0 ? String(powerValue) : '—')
      : '—';
    const accuracyValue = move.accuracy ?? data.accuracy;
    const accuracyText = typeof accuracyValue === 'number'
      ? `${accuracyValue}%`
      : (accuracyValue || '—');
    return {
      ...move,
      id: moveId,
      displayName: MoveDataHelper.getMoveName(moveId),
      type,
      typeLabel,
      category,
      categoryLabel,
      basePowerValue: powerValue,
      basePower: powerText,
      accuracy: accuracyText,
      accuracyValue,
      desc: data.shortDesc || data.desc || '',
      ppText: ppInfo,
      ppDisplay: ppInfo
    };
  }

  buildMoveTooltip(move) {
    return [
      `${move.displayName}`,
      `类型：${move.typeLabel || move.type || '未知'}`,
      `分类：${move.categoryLabel || move.category || '未知'}`,
      `威力：${move.basePowerValue ?? move.basePower ?? '-'}`,
      `命中：${move.accuracyValue ?? move.accuracy ?? '-'}`
    ].concat(move.ppDisplay ? [`PP：${move.ppDisplay}`] : [])
      .concat(move.desc ? ['', move.desc] : [])
      .join('\n');
  }

  buildMoveMetaText(move) {
    return `${move.typeLabel || move.type || '未知'} · ${move.categoryLabel || move.category || '未知'} · 威力${move.basePower} · PP ${move.ppDisplay}`;
  }

  getTypeGradient(type) {
    const colors = this.TYPE_COLORS[(type || '').toLowerCase()];
    if (!colors) return 'linear-gradient(135deg, #546e7a, #455a64)';
    return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
  }
}

export default BattleUI;

