// ========== 游戏状态管理 ==========
// gameState 全局状态 + initPlayerDeck + 工具函数

    let infiniteManaEnabled = false;

    function initPlayerDeck(cardNames = null) {
        let deck = [];
        const gradeLimit = { 1: 1, 2: 2, 3: 3 };
        // customNames: 传入的卡名列表（只含需要的卡），按全卡池的 grade limit 添加拷贝
        const source = cardNames
            ? CARD_LIBRARY.filter(c => cardNames.includes(c.name))
            : CARD_LIBRARY;
        for (let card of source) {
            const limit = gradeLimit[card.grade];
            for (let i = 0; i < limit; i++) deck.push({ ...card });
        }
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        let hand = deck.splice(0, 3);
        let prepool = deck.splice(0, 3);
        return { deck, hand, prepool };
    }

    let gameState = {
        turn: 0,
        players: [
            { hp: 10, mana: 3, hand: [], deck: [], prepool: [], handMax: 6, manaMax: 15 },
            { hp: 10, mana: 3, hand: [], deck: [], prepool: [], handMax: 6, manaMax: 15 }
        ],
        units: [],
        selectedCardIdx: -1,
        selectedUnitId: null,
        awaitingSkillTarget: false,
        skillCasterId: null,
        skillType: null,
        declarativeSkillName: null,
        declarativeSelectMode: null,
        declarativeSelected: [],
        declarativeMaxSelect: 1,
        declarativeRange: 0,
        declarativeToggle: false,
        declarativeConfirmButton: false,
        declarativeStep: 1,
        declarativeFirstTarget: null,
        declarativeGridRow: null,
        declarativeGridCol: null,
        declarativeGridFilter: "any",
        declarativeWitchReduce: 0,
        declarativeZhanYueChoice: 0,
        isModalOpen: false,
        dualswordDelayedAttacks: [],
        dualswordAOEHighlight: null,
        attackedEnemyIds: [],
        killStreakMap: {},  // unitId -> {count, unitName, lifeSnapshot}
        kingDamagedCount: {0: false, 1: false},
        kingCostMod: {0: 0, 1: 0},
        zhanYueMarkedEnemyIds: [],
        shaLinBoundCells: [],  // {row, col, turnsLeft} 纱琳定身格子
        hephaestusBlocks: [],  // {row, col, turnsLeft, side} 赫菲斯托斯方块
        nerdJamPending: {0: false, 1: false},
        plagueCardIdx: -1,
        plagueCasterSide: null,
        awaitingGlide: false,
        glideUnitId: null,
        awaitingMirrorAttack: false,
        mirrorAttackUnitId: null,
        assimilatorHp: {0: 0, 1: 0},
        assimilatorMaxHp: {0: 0, 1: 0},
        // ===== 对局复盘数据 =====
        matchEvents: [],
        matchStats: {
            turnCount: 0,
            startTime: 0,
            totalDamage: {0: 0, 1: 0},
            unitsKilled: {0: 0, 1: 0},
            cardsPlayed: {0: 0, 1: 0},
            skillsUsed: {0: 0, 1: 0},
            unitsLost: {0: 0, 1: 0},
            baseDamage: {0: 0, 1: 0},
            comboCount: {0: 0, 1: 0},
            unitKills: {},  // 单位名 -> {count, side}
            unitDamage: {}, // 单位名 -> {damage, side}
            tacticalEvents: {}, // tactic类型 -> {count, side}
        },
    };
    let gameMode = 'full'; // 'full' | 'custom'
    let customDecks = null; // null | {p0: [...names], p1: [...names]}

    // ===== AI 对战模式全局状态 =====
    let aiSide = -1;            // -1=无人机; 0=蓝方是AI; 1=红方是AI
    let aiDifficulty = 'normal'; // 'easy' | 'normal' | 'hard'
    let aiActing = false;        // AI 正在执行回合时为 true，用于自动响应弹窗
    let aiGameId = 0;            // 每次重置游戏递增，防止旧 AI 回合在新游戏中继续执行

    let processingDeathIds = new Set();
    let lastDamageDealer = null;   // {name, side} 记录最近一次造成伤害/秒杀的单位（用于击杀归属）
    let tooltip = null;
    let tooltipTimeout = null;
    let testPanelOverlay = null;
    let activeToast = null;
    let _renderUICount = 0;
    let _renderUIErrors = 0;

    function showToast(msg, duration = 1800) {
        if (activeToast) { activeToast.classList.add('toast-out'); const old = activeToast; setTimeout(() => { if (old && old.parentNode) old.remove(); }, 300); activeToast = null; }
        const toast = document.createElement('div');
        toast.className = 'game-toast';
        toast.innerText = msg;
        document.body.appendChild(toast);
        activeToast = toast;
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.classList.add('toast-out');
                setTimeout(() => { if (toast && toast.parentNode) toast.remove(); }, 300);
            }
            if (activeToast === toast) activeToast = null;
        }, duration);
        // 远程联机：主机 toast 立即同步给客机（独立 fx 消息）
        if (typeof networkToast === 'function') networkToast('toast', [msg, duration]);
    }

    function showKillStreak(killerName, count) {
        const labels = ['','二杀','三杀','四杀','五杀','六杀','七杀','八杀','九杀','十杀'];
        if (count < 2) return;
        const text = count <= 10 ? labels[count] : `${count}杀`;
        const el = document.createElement('div');
        let cls = 'kill-streak-toast';
        if (count >= 7) cls += ' legendary';
        else if (count >= 5) cls += ' penta';
        el.className = cls;
        el.innerHTML = `${text}<br><span style="font-size:13px;font-weight:400;letter-spacing:2px;opacity:0.85">${killerName}</span>`;
        document.body.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.remove(); }, 3000);
        // 远程联机：连杀特效立即同步给客机（独立 fx 消息）
        if (typeof networkToast === 'function') networkToast('streak', [killerName, count]);
    }

    function addLog(msg) {
        const logDiv = document.getElementById('log');
        const p = document.createElement('div');
        p.innerText = msg;
        logDiv.appendChild(p);
        logDiv.scrollTop = logDiv.scrollHeight;
        if (logDiv.children.length > 30) logDiv.removeChild(logDiv.children[0]);
        console.log(msg);
        recordMatchEvent(msg);
        // 远程联机：主机日志缓冲，随状态快照同步给客机
        if (typeof networkLog === 'function') networkLog(msg);
    }

    // ========== 对局事件记录系统（用于复盘）==========
    // 将日志消息分类为结构化事件，用于复盘分析和AI点评
    function recordMatchEvent(msg) {
        if (!gameState.matchEvents) return;
        const cat = categorizeEvent(msg);
        const event = {
            turn: gameState.turn,
            turnCount: gameState.matchStats ? gameState.matchStats.turnCount : 0,
            msg: msg,
            category: cat.category,
            tactic: cat.tactic || null,
            side: cat.side,
            timestamp: Date.now()
        };
        gameState.matchEvents.push(event);
        updateMatchStats(event);
    }

    // 战术事件识别：从日志消息中识别具体的战术行为类型
    function detectTactic(msg) {
        if (msg.includes('使用技能秒杀')) return 'knight_execute';
        if (msg.includes('斩月斩杀') || msg.includes('斩月共斩杀')) return 'zhanyue_execute';
        if (msg.includes('受武器商加持')) return 'weaponsmith_buff';
        if ((msg.includes('纱琳将') && msg.includes('定身')) || msg.includes('纱琳对该格下咒') || msg.includes('被纱琳定身')) return 'shaLin_lockdown';
        if (msg.includes('摔到')) return 'wrestler_throw';
        if (msg.includes('拉至')) return 'pull';
        if (msg.includes('共生死')) return 'cupid_bind';
        if (msg.includes('替罪羊代替') || msg.includes('替罪羊绑定替死')) return 'scapegoat_save';
        if (msg.includes('护盾') && (msg.includes('抵消') || msg.includes('抵挡'))) return 'shield_block';
        if (msg.includes('自带护盾破碎') && msg.includes('绝对免疫')) return 'absolute_immunity';
        if (msg.includes('鼓手鼓舞')) return 'drummer_buff';
        if (msg.includes('酒类强化')) return 'alcohol_boost';
        if (msg.includes('触发暴击')) return 'critical_hit';
        if (msg.includes('鼠疫') && (msg.includes('扩散') || msg.includes('感染'))) return 'plague_spread';
        if (msg.includes('复活') && !msg.includes('无法') && !msg.includes('失败') && !msg.includes('用完') && !msg.includes('次数')) return 'revive';
        if (msg.includes('行动干扰生效') || msg.includes('启动行动干扰')) return 'nerd_jam';
        if (msg.includes('禁卫禁用')) return 'jinwei_disable';
        if (msg.includes('被眩晕')) return 'stun';
        if (msg.includes('蓄力横扫') || msg.includes('横扫蓄力') || msg.includes('双剑延迟AOE对')) return 'sweep_charge';
        if (msg.includes('血舞击杀')) return 'blood_dance_kill';
        if (msg.includes('饥饿击杀')) return 'hunger_kill';
        if (msg.includes('代为承受')) return 'guard_substitute';
        if (msg.includes('爱妃庇护')) return 'aifei_aura';
        if (msg.includes('旗手庇护')) return 'flag_bearer';
        return null;
    }

    // 事件分类：根据日志内容判断事件类型，side 为当前回合方
    function categorizeEvent(msg) {
        let category = 'other';
        const actingSide = gameState.turn;

        if (msg.includes('游戏开始')) category = 'game_start';
        else if (msg.includes('游戏结束')) category = 'game_end';
        else if (msg.includes('回合开始')) category = 'turn';
        else if (msg.includes('放置')) category = 'card_play';
        else if (msg.includes('combo') || msg.includes('连携')) category = 'combo';
        else if (msg.includes('攻击对方本体') || msg.includes('蓄力攻击敌方本体') || msg.includes('超级蓄力攻击敌方本体')) category = 'base_damage';
        else if (msg.includes('被消灭')) category = 'unit_death';
        else if (msg.includes('秒杀')) category = 'skill_kill';
        else if (msg.includes('蓄力')) category = 'charge';
        else if (msg.match(/技能|送酒|治疗|净化|定身|拉拽|弱化|致盲|眩晕|护盾|拉至|摔到|瞬移|标记|斩杀/)) category = 'skill';
        else if (msg.includes('攻击造成') || msg.includes('AOE攻击')) category = 'damage';
        else if (msg.includes('移动至')) category = 'move';

        return { category, side: actingSide };
    }

    // 更新比赛统计数据
    function updateMatchStats(event) {
        const stats = gameState.matchStats;
        if (!stats) return;
        const side = event.side;

        // 记录战术事件统计
        if (event.tactic) {
            if (!stats.tacticalEvents[event.tactic]) {
                stats.tacticalEvents[event.tactic] = { count: 0, side: side };
            }
            stats.tacticalEvents[event.tactic].count++;
            stats.tacticalEvents[event.tactic].side = side;
        }

        switch (event.category) {
            case 'game_start':
                stats.startTime = Date.now();
                break;
            case 'card_play':
                if (side >= 0) stats.cardsPlayed[side]++;
                break;
            case 'unit_death':
                // 击杀方为当前回合方，被击杀方为对方
                if (side >= 0) { stats.unitsKilled[side]++; stats.unitsLost[1 - side]++; }
                break;
            case 'base_damage':
                if (side >= 0) {
                    const m = event.msg.match(/(\d+)\s*伤害/);
                    if (m) { stats.baseDamage[side] += parseInt(m[1]); stats.totalDamage[side] += parseInt(m[1]); }
                }
                break;
            case 'damage':
                if (side >= 0) {
                    const m = event.msg.match(/(\d+)\s*伤害/);
                    if (m) stats.totalDamage[side] += parseInt(m[1]);
                }
                break;
            case 'skill':
            case 'skill_kill':
            case 'charge':
                if (side >= 0) stats.skillsUsed[side]++;
                break;
            case 'combo':
                if (side >= 0) stats.comboCount[side]++;
                break;
        }
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function showTooltip(content, x, y) {
        if (!tooltip) { tooltip = document.createElement('div'); tooltip.className = 'tooltip'; document.body.appendChild(tooltip); }
        tooltip.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
        tooltip.style.left = (x + 12) + 'px';
        tooltip.style.top = (y + 12) + 'px';
        tooltip.style.display = 'block';
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => { if (tooltip) tooltip.style.display = 'none'; }, 4000);
    }

    function getOwnCastleRow(side) { return side === SIDE_PLAYER0 ? 4 : 0; }
    function getForwardDelta(side) { return side === SIDE_PLAYER0 ? -1 : 1; }
    function getUnitsAt(row, col) { return gameState.units.filter(u => u.row === row && u.col === col); }
    function unitNonOccupying(u) { return u.cardName === "护援兵" || u.cardName === "镜中人" || u.isMirror === true; }
    function getSideUnitCountAt(row, col, side) { return gameState.units.filter(u => u.row === row && u.col === col && u.side === side && !unitNonOccupying(u)).length; }
    function canAddUnit(row, col, side) { return getSideUnitCountAt(row, col, side) < 2; }
    function getMirrorOf(unit) { return gameState.units.find(u => u.isMirror === true && u.mirrorSourceId === unit.id); }
    function syncAssimilators(side) {
        const pool = gameState.assimilatorHp[side] || 0;
        const maxPool = gameState.assimilatorMaxHp[side] || 0;
        for (let u of gameState.units) {
            if (u.isAssimilator && u.side === side) { u.life = pool; u.maxLife = maxPool; }
        }
    }
    function killAllAssimilators(side) {
        const all = gameState.units.filter(u => u.isAssimilator && u.side === side);
        for (let a of [...all]) { a._assimilatorCleanup = true; removeUnit(a.id, a.row, a.col, a.side); }
        gameState.assimilatorHp[side] = 0;
        gameState.assimilatorMaxHp[side] = 0;
    }
    function createMirrorUnit(source, row, col) {
        return {
            id: Date.now() + Math.random(),
            cardName: source.cardName, side: source.side, row: row, col: col,
            life: 0, maxLife: 0, dmgType: source.dmgType, dmgValue: source.dmgValue, range: source.range, speed: source.speed,
            isMirror: true, mirrorSourceId: source.id, mirrorTurnsLeft: 3,
            moved: false, attacksLeftThisTurn: 0, movesLeftThisTurn: 0,
            firstAttackBonus: false, bonusUsed: false, invincibleTurns: 0, nextAttackDouble: false,
            tempAttackBonus: 0, skillUsedThisTurn: false, isCharging: false, chargeTargetId: null, skillCooldown: 0, stun: 0,
            nextAttackBonus: 0, chargeIsBase: false, chargeBaseSide: null,
            superCharging: false, superChargeTurnsLeft: 0, superChargeTargetId: null, superChargeIsBase: false, superChargeBaseSide: null,
            knightSkillUsed: false, halberdierSkillUsed: false, halberdierCharging: false, nerdJamUsed: false, nerdJamActive: false,
            displacedByAllySkillThisTurn: false, silenced: 0, transformUsed: false, isSweepCharging: false,
            hornRecoveryTurns: 0, hornPendingHeal: 0, shieldValue: 0, nativeShieldValue: 0, externalShieldSources: {}, absoluteImmunityTurns: 0,
            bountyLevel: 0, // 悬赏等级（镜像恒0）
            extraAttacks: 0, weakenedEnemies: [], eagleEyeTargets: [], windSkillUsed: false,
            cupidPair: null, cupidUseCount: 0, shaLinBindTurn: 0, shaLinBindRow: -1, shaLinBindCol: -1, shaLinUseCount: 0,
            zhongyiHealUsed: false, scapegoatUsed: false, scapegoatProtectorId: null, feijiBonusGiven: 0, feizheBonusGiven: 0,
            flagBearerProtectTurn: 0, witchProtectReduce: 0, witchProtectorId: null, plagueInfected: false, plagueOwnerSide: null,
            bartenderUseCount: 0, drunkardInvincibleUsed: false, spearmanCharges: 0,
            braceActive: false, braceShield: 0, counterBonus: 0, counterUseCount: 0,
            fireGodBuffTurns: 0, fireGodSkillUsed: false, fanCooldown: 0, kickCooldown: 0,
            mirrorId: null, mirrorSkillUsed: false, mirrorSwappedThisTurn: false,
            equipmentId: null,
        };
    }
    function addUnit(unit) { gameState.units.push(unit); }
    function popUnit(unitId) {
        const idx = gameState.units.findIndex(u => u.id === unitId);
        if (idx === -1) return;
        const unit = gameState.units[idx];
        // 悬赏机制：爆牌/主动移除悬赏单位，另一方获得赏金
        if (typeof grantBountyOnRemoval === 'function') grantBountyOnRemoval(unit);
        gameState.units.splice(idx, 1);
        // 同化者被移除：共享池和上限-3
        if (unit.isAssimilator && !unit._assimilatorCleanup) {
            gameState.assimilatorHp[unit.side] -= 3;
            gameState.assimilatorMaxHp[unit.side] -= 3;
            if (gameState.assimilatorHp[unit.side] <= 0) { killAllAssimilators(unit.side); }
            else { syncAssimilators(unit.side); }
        }
        addLog(`爆牌：${unit.cardName} 被主动移除。`);
        showToast(`💥 移除 ${unit.cardName}`);
        renderUI();
    }

    async function discardForNewCard(side, newCard) {
        if (gameState.isModalOpen) return -1;
        // AI 自动弃牌：丢弃价值最低的牌
        if (aiActing && side === aiSide && typeof aiSelectDiscard === 'function') {
            const idx = aiSelectDiscard(side, newCard);
            if (idx >= 0) { addLog(`🤖 AI 弃掉了 ${gameState.players[side].hand[idx].name} 以腾出空间`); }
            return idx;
        }
        gameState.isModalOpen = true;
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'discard-overlay';
            const panel = document.createElement('div');
            panel.className = 'discard-panel';
            panel.innerHTML = `<h3>手牌已满 (${gameState.players[side].hand.length}/6)</h3><p>请选择一张手牌弃掉，以便获得新牌 ${newCard.name}</p>`;
            const btnContainer = document.createElement('div');
            btnContainer.className = 'discard-buttons';
            const hand = gameState.players[side].hand;
            hand.forEach((card, idx) => {
                const btn = document.createElement('button');
                btn.className = 'discard-btn-choice';
                btn.innerText = `${card.name} (费${card.cost})`;
                btn.onclick = () => { overlay.remove(); gameState.isModalOpen = false; resolve(idx); };
                btnContainer.appendChild(btn);
            });
            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = '放弃获得新牌';
            cancelBtn.className = 'discard-btn-choice discard-cancel';
            cancelBtn.onclick = () => { overlay.remove(); gameState.isModalOpen = false; resolve(-1); };
            btnContainer.appendChild(cancelBtn);
            panel.appendChild(btnContainer);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
        });
    }

    function discardCard(side, cardIndex) {
        const expectedSide = gameState.turn;
        if (side !== expectedSide) { showToast("不是你的回合"); addLog("不是你的回合，不能弃牌"); return; }
        const card = gameState.players[side].hand[cardIndex];
        if (!card) return;
        gameState.players[side].hand.splice(cardIndex, 1);
        addLog(`弃牌：${card.name} 从手牌中弃掉。`);
        showToast(`🗑️ 弃掉 ${card.name}`);
        if (gameState.selectedCardIdx === cardIndex) gameState.selectedCardIdx = -1;
        else if (gameState.selectedCardIdx > cardIndex) gameState.selectedCardIdx--;
        renderUI();
    }
