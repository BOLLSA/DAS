// ========== UI 浮层（图鉴/教程/测试/快捷键）==========
// showPokedex、showTutorial、openTestPanel、onGlobalKeydown


    function showPokedex() {
        const overlay = document.createElement('div');
        overlay.className = 'pokedex-overlay';
        const panel = document.createElement('div');
        panel.className = 'pokedex-panel';
        panel.innerHTML = `
            <h2>📖 单位图鉴</h2>
            <div class="pokedex-controls">
                <button data-grade="all" class="active">全部</button>
                <button data-grade="1">⭐ 1级</button>
                <button data-grade="2">⭐⭐ 2级</button>
                <button data-grade="3">⭐⭐⭐ 3级</button>
                <input type="text" class="pokedex-search" placeholder="🔍 搜索名称" id="pokedexSearch">
            </div>
            <div class="pokedex-grid" id="pokedexGrid"></div>
            <button class="prepick-cancel" style="margin-top:15px;">关闭</button>
        `;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        let currentGrade = 'all';
        let searchTerm = '';
        function renderGrid() {
            const gridDiv = panel.querySelector('#pokedexGrid');
            let filtered = CARD_LIBRARY.filter(card => {
                if (currentGrade !== 'all' && card.grade != currentGrade) return false;
                if (searchTerm && !card.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                return true;
            });
            filtered.sort((a,b) => a.name.localeCompare(b.name, 'zh'));
            gridDiv.innerHTML = '';
            filtered.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'pokedex-card';
                const gradeLabel = card.grade === 1 ? '传说' : card.grade === 2 ? '史诗' : '普通';
                const gradeIcon = '⭐'.repeat(card.grade || 1);
                cardDiv.innerHTML = `
                    <div class="pokedex-card-header">
                        <b>${card.name}</b>
                        <span class="pokedex-grade-tag grade-${card.grade}">${gradeIcon} ${gradeLabel}</span>
                    </div>
                    <div class="pokedex-card-stats">💰${card.cost} ❤️${card.life} ⚔️${card.dmgType}${card.dmgValue} 📏${card.range} 🏃${card.speed}${card.extraAttacks ? ' ×' + (1 + card.extraAttacks) : ''}</div>
                `;
                cardDiv.onclick = () => showPokedexDetail(card, overlay);
                gridDiv.appendChild(cardDiv);
            });
        }
        const gradeBtns = panel.querySelectorAll('[data-grade]');
        gradeBtns.forEach(btn => {
            btn.onclick = () => {
                gradeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentGrade = btn.getAttribute('data-grade');
                renderGrid();
            };
        });
        const searchInput = panel.querySelector('#pokedexSearch');
        searchInput.oninput = (e) => {
            searchTerm = e.target.value;
            renderGrid();
        };
        renderGrid();
        const closeBtn = panel.querySelector('.prepick-cancel');
        closeBtn.onclick = () => overlay.remove();
    }

    function showPokedexDetail(card, parentOverlay) {
        const existing = document.querySelector('.pokedex-detail-overlay');
        if (existing) existing.remove();
        const detailOverlay = document.createElement('div');
        detailOverlay.className = 'pokedex-detail-overlay';
        const gradeLabel = card.grade === 1 ? '传说' : card.grade === 2 ? '史诗' : '普通';
        const gradeIcon = '⭐'.repeat(card.grade || 1);
        const detailPanel = document.createElement('div');
        detailPanel.className = 'pokedex-detail-panel';
        detailPanel.innerHTML = `
            <button class="pokedex-detail-close" title="关闭 (ESC)">✕</button>
            <div class="pokedex-detail-titlebar grade-${card.grade}">
                <h2>${card.name}</h2>
                <span class="pokedex-grade-tag grade-${card.grade}">${gradeIcon} ${gradeLabel}</span>
            </div>
            <div class="pokedex-detail-stats">
                <div class="stat-pill">💰 <b>${card.cost}</b></div>
                <div class="stat-pill">❤️ <b>${card.life}</b></div>
                <div class="stat-pill">⚔️ <b>${card.dmgType}${card.dmgValue}</b></div>
                <div class="stat-pill">📏 <b>${card.range}</b></div>
                <div class="stat-pill">🏃 <b>${card.speed}</b></div>
                ${card.extraAttacks ? `<div class="stat-pill">⚔️×<b>${1 + card.extraAttacks}</b></div>` : ''}
            </div>
            ${(() => {
                let passiveDesc = '';
                let activeDesc = '';
                if (card.desc) {
                    if (card.desc.startsWith('技能：')) {
                        activeDesc = card.desc.replace(/^技能：/, '');
                    } else {
                        const parts = card.desc.split(/[。；]技能：/);
                        if (parts.length > 1) {
                            passiveDesc = parts[0];
                            activeDesc = parts.slice(1).join('。');
                        } else {
                            passiveDesc = card.desc;
                        }
                    }
                }
                const introParts = [card.passive, card.skill ? card.skillDesc : null].filter(Boolean);
                const introText = introParts.length > 0 ? introParts.join(' · ') : '无';
                let passiveText = '无';
                if (card.passive) {
                    passiveText = passiveDesc || card.passive;
                } else if (passiveDesc && !card.skill) {
                    passiveText = passiveDesc;
                }
                let activeText = '无';
                if (card.skill) {
                    activeText = activeDesc || card.skillDesc || '无';
                }
                return `
            <div class="pokedex-detail-section">
                <h3>📖 简介</h3>
                <p>${introText}</p>
            </div>
            <div class="pokedex-detail-section">
                <h3>🌀 被动技能</h3>
                <p>${passiveText}</p>
            </div>
            <div class="pokedex-detail-section">
                <h3>✨ 主动技能</h3>
                <p>${activeText}</p>
            </div>`;
            })()}
        `;
        detailOverlay.appendChild(detailPanel);
        document.body.appendChild(detailOverlay);

        const closeDetail = () => detailOverlay.remove();
        detailPanel.querySelector('.pokedex-detail-close').onclick = closeDetail;
        detailOverlay.onclick = (e) => { if (e.target === detailOverlay) closeDetail(); };
    }

    function showTutorial() {
        // 新手引导教程进行中：不再叠加打开速查教程
        if (tutorialState && tutorialState.active) { showToast('🎓 已经在新手教程中啦'); return; }
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        const panel = document.createElement('div');
        panel.className = 'tutorial-panel';
        panel.innerHTML = `<h3>📘 黑暗中世纪 · 快速教程</h3>
<div class="tutorial-content">
<p><strong>🎯 胜利目标：</strong>摧毁对方城池（❤️10点生命），同时守住自己的城池。</p>

<h4>🕹️ 基本操作</h4>
<ul>
<li><b>左键手牌</b> → 选中（变黄框）；<b>再次左键己方城池行</b>（蓝方第5行 / 红方第1行）→ 放置单位</li>
<li><b>左键己方单位</b> → 选中（变金框），可看到技能按钮和爆牌按钮</li>
<li>　 ├─ 左键<b>前方空格</b> → 移动（消耗移动次数）</li>
<li>　 ├─ 左键<b>前方敌方单位</b> → 攻击</li>
<li>　 └─ 左键<b>正对城池格</b> → 攻击城池</li>
<li><b>右键任意单位/手牌</b> → 查看详细属性（状态与技能）</li>
<li><b>【❌ 取消选中】</b> → 清空当前选择；<b>【💥 爆牌】</b> → 移除场上己方单位；<b>手牌底部【弃】</b> → 弃掉该手牌</li>
<li><b>【⚡结束回合】</b> → 换对手行动；<b>【📖图鉴】</b> → 查看所有单位属性与技能</li>
</ul>

<h4>⌨️ 快捷键</h4>
<ul>
<li><kbd>1</kbd>~<kbd>6</kbd> → 选中对应手牌（同位置再按取消）</li>
<li><kbd>Alt+E</kbd> → 释放选中单位的主动技能（需先选中己方单位）</li>
<li><kbd>Alt+Q</kbd> → 弃掉选中的手牌 / 爆掉选中的单位（二选一）</li>
<li><strong>注意：</strong>快捷键仅在未输入文本时生效，输入框内不触发</li>
</ul>

<h4>🔄 回合流程</h4>
<ol>
<li>开始回合：费用 +1（上限15），刷新移动/攻击/技能</li>
<li>从预牌堆选1张牌入手牌（手牌上限6，满则需先弃一张）</li>
<li>行动阶段：放置 / 移动 / 攻击 / 技能（顺序自定）</li>
<li>点【结束回合】换对手（未选择预牌可取消结束）</li>
</ol>

<h4>💡 通用机制</h4>
<ul>
<li><b>⏱️ 回合与冷却</b>：双方各行动一次合称一"完整回合"；技能冷却按大回合描述（1大回合=双方各行动一次），持续效果按小回合递减</li>
<li><b>⚔️/🔮 伤害类型</b>：伤害分为物理与法术；部分减伤、护盾只针对特定伤害类型</li>
<li><b>🛡️ 护盾</b>：优先消耗外来护盾、再消耗自带护盾；护盾破碎时可能触发特殊效果（如短时间免疫）</li>
<li><b>⚡ 蓄力</b>：蓄力期间不能移动/攻击，完成后释放强力效果；被控制可能中断蓄力</li>
<li><b>🌀 控制</b>：眩晕（无法行动）、定身（无法位移且受伤+1）、沉默（无法用技能）、致盲（技能失效）</li>
<li><b>✨ 免疫与无敌</b>：绝对免疫无视一切伤害、秒杀、控制与位移；无敌状态受伤但不死亡</li>
<li><b>🔪 真伤</b>：无视护盾与减伤</li>
<li><b>🎯 嘲讽</b>：部分单位会强制敌方优先攻击自己</li>
<li><b>📈 增益 / 📉 减益</b>：鼓舞类加攻、弱化使伤害无效、禁疗使单位无法恢复生命</li>
</ul>

<h4>❓ 常见问题</h4>
<ul>
<li>无法攻击目标？→ 距离不够、前方有敌人阻挡、或被控制无法行动</li>
<li>技能无法使用？→ 冷却中、被沉默/致盲/眩晕、或本回合已使用过技能</li>
<li>手牌满了？→ 先弃一张手牌，再选择预牌</li>
<li>费用不够？→ 每回合自动增长（上限15），或使用带加费能力的单位</li>
</ul>
</div>
<div class="custom-modal-buttons"><button class="custom-modal-btn confirm" id="closeTut">关闭</button></div>`;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        document.getElementById('closeTut').onclick = () => overlay.remove();
    }

    // ════════════ 新手引导教程（与模式选择并列的完整流程引导） ════════════
    let tutorialState = null;   // { active, step(实际进度), viewStep(当前展示步骤，可回顾), snapshot, shopPhase }
    let tutorialTimer = null;
    let tutorialResolve = null; // 教程结束时的 Promise resolve（用于 startGame 循环）

    // 教程步骤定义：requiresAction=true 为需要玩家实际操作（轮询检测完成），否则点按钮推进
    const BEGINNER_TUTORIAL_STEPS = [
        {
            icon: '🎓', title: '欢迎来到黑暗中世纪',
            text: '这是一款<b>双人回合制战棋卡牌游戏</b>。你的目标：<b style="color:#ff8080;">摧毁敌方城池（❤️10点生命）</b>，同时守住自己的城池。<br>本教程会带你亲手走一遍完整流程：放置 → 移动 → 攻击 → 技能 → 结束回合 → 装备商店。跟着发光提示操作即可！',
            buttonText: '🚀 开始教学', requiresAction: false, highlightCells: null, highlightIds: null, check: null
        },
        {
            icon: '🗺️', title: '认识棋盘',
            text: '棋盘是<b>5行×3列</b>的战场。<b style="color:#5aa7ff;">蓝方城池</b>在最下方（第5行），<b style="color:#ff8a80;">红方城池</b>在最上方（第1行）。单位从城池行入场、向前推进，走到敌方城池行就能攻击敌方城池。',
            buttonText: '下一步', requiresAction: false, panelPos: 'bottom',
            highlightCells: () => { const cells = []; for (let c = 0; c < 3; c++) { cells.push({ row: 0, col: c }); cells.push({ row: 4, col: c }); } return cells; },
            highlightIds: null, check: null
        },
        {
            icon: '💰', title: '费用与手牌',
            text: '<b>💰费用</b>：每回合开始自动增加（上限15），放置单位需要消耗费用。<br><b>🃏手牌</b>：底部最多6张；每回合结束时从<b>预牌堆</b>选1张加入手牌。<br>选中手牌（黄框）后点击己方城池行即可放置单位。',
            buttonText: '下一步', requiresAction: false, panelPos: 'bottom',
            highlightCells: null,
            highlightIds: () => ['p0Mana', 'handCards'], check: null
        },
        {
            icon: '🃏', title: '第一步：放置单位',
            text: '现在动手试试：<b>①点击底部手牌中的【士兵】</b>（出现黄框）<b>②再点击最下方一行（蓝方城池行）的中间空格</b>。你的第一个单位就上场了！',
            requiresAction: true, allowedActions: ['place'],
            highlightCells: () => [{ row: 4, col: 1 }],
            highlightIds: () => ['handCards'],
            check: (st) => gameState.units.filter(u => u.side === 0 && u.life > 0).length > st.snapshot.p0Count
        },
        {
            icon: '🚶', title: '第二步：移动',
            text: '点击<b>己方单位</b>（出现金色边框）后，再点击它<b>正前方的空格</b>即可移动一格。试试把【士兵】向前移动。',
            requiresAction: true, allowedActions: ['move'],
            highlightCells: () => {
                const soldier = gameState.units.find(u => u.side === 0 && u.cardName === "士兵" && u.life > 0);
                if (!soldier) return [];
                const r = soldier.row + getForwardDelta(0);
                if (r < 1 || r > 3) return [];
                return [{ row: r, col: soldier.col }];
            },
            highlightIds: null,
            check: (st) => {
                const soldier = gameState.units.find(u => u.side === 0 && u.cardName === "士兵" && u.life > 0);
                if (!soldier) return false;
                return soldier.row !== st.snapshot.soldierRow || soldier.col !== st.snapshot.soldierCol;
            }
        },
        {
            icon: '⚔️', title: '第三步：攻击',
            text: '选中单位后，点击<b>同列前方</b>的敌方单位即可攻击。试试选中【士兵】，攻击前方同列的敌方【弓箭手】（士兵的首次攻击伤害翻倍，正好一击必杀它！）',
            requiresAction: true, allowedActions: ['move', 'attack'],
            highlightCells: () => {
                const archer = gameState.units.find(u => u.side === 1 && u.cardName === "弓箭手" && u.life > 0);
                return archer ? [{ row: archer.row, col: archer.col }] : [];
            },
            highlightIds: null,
            check: (st) => {
                const archer = gameState.units.find(u => u.side === 1 && u.cardName === "弓箭手" && u.life > 0);
                if (!archer) return true;  // 被消灭也算完成
                return archer.life < st.snapshot.archerLife;
            }
        },
        {
            icon: '🚩', title: '第四步：技能单位',
            text: '有些单位拥有<b>主动技能</b>。先在蓝方城池行放置手牌中的【旗手】（点击手牌【旗手】→ 点击城池行的空格，比如中间格左侧）。',
            requiresAction: true, allowedActions: ['place'],
            highlightCells: () => [{ row: 4, col: 0 }],
            highlightIds: () => ['handCards'],
            check: (st) => gameState.units.some(u => u.side === 0 && u.cardName === "旗手" && u.life > 0)
        },
        {
            icon: '✨', title: '第五步：使用技能',
            text: '点击【旗手】→ 点击右下角出现的<b>【🚩免物伤】技能按钮</b> → 再点击【士兵】作为目标。士兵就会获得免疫物伤的保护！',
            requiresAction: true, allowedActions: ['skill'],
            highlightCells: () => {
                const fb = gameState.units.find(u => u.side === 0 && u.cardName === "旗手" && u.life > 0);
                return fb ? [{ row: fb.row, col: fb.col }] : [];
            },
            highlightIds: () => ['dynamicSkillBtn'],
            check: (st) => gameState.units.some(u => u.side === 0 && (u.flagBearerProtectTurn || 0) > 0)
        },
        {
            icon: '⏭️', title: '第六步：结束回合',
            text: '本回合操作完毕后，点击<b>【⚡结束回合】</b>。回合结束时会从<b>预牌堆</b>选1张牌加入手牌（选一张你喜欢的）。',
            requiresAction: true, allowedActions: ['place', 'move', 'attack', 'skill', 'endTurn'],
            highlightCells: null,
            highlightIds: () => ['endTurnBtn'],
            check: (st) => gameState.turn !== 0
        },
        {
            icon: '🔁', title: '对手回合',
            text: '现在轮到对手（教程演示中对手不会行动）。再点击一次<b>【⚡结束回合】</b>，把回合交回你手中。',
            requiresAction: true, allowedActions: ['endTurn'],
            highlightCells: null,
            highlightIds: () => ['endTurnBtn'],
            check: (st) => gameState.turn === 0
        },
        {
            icon: '🛒', title: '第七步：装备商店',
            text: '点击<b>【⚔️装备商店】</b>看看：可以用费用给单位购买装备（复活甲、凝血之刃、妖刀等），买下后选中单位即可穿戴。随意看看，然后关闭商店。',
            requiresAction: true, allowedActions: ['shop'],
            highlightCells: null,
            highlightIds: () => ['equipmentShopBtn'],
            check: (st) => st.shopPhase === 'done'
        },
        {
            icon: '💡', title: '进阶机制速览',
            text: '<b>🛡️护盾</b>：先消耗外来护盾、再消耗自带护盾；枷锁猎手自带护盾破碎时进入绝对免疫。<br><b>⚡蓄力</b>：蓄力期间不能移动，完成后爆发（皮卡/戟兵/机车党）。<br><b>🌀控制</b>：眩晕（无法行动）、定身（无法位移且受伤+1）、沉默（禁用技能）、致盲（技能失效）。<br><b>🎯嘲讽</b>：显眼包会强制敌方攻击它。<br><b>✨绝对免疫</b>：无视一切伤害、秒杀、控制与位移。<br>更多细节随时查看右上角【📖图鉴】！',
            buttonText: '下一步', requiresAction: false, highlightCells: null, highlightIds: null, check: null
        },
        {
            icon: '🎉', title: '教程完成！',
            text: '恭喜你掌握了基本玩法！<b>建议第一步先试【🤖人机对战·简单难度】</b>，在实战中熟悉节奏。祝你旗开得胜！',
            buttonText: '🏁 返回模式选择', requiresAction: false, highlightCells: null, highlightIds: null, check: null
        },
    ];

    // 构造教程演示单位（字段与 placeUnit 保持一致）
    function createTutorialUnit(card, side, row, col) {
        return {
            id: Date.now() + Math.random(), cardName: card.name, side: side, row: row, col: col,
            life: card.life, maxLife: card.life, dmgType: card.dmgType, dmgValue: card.dmgValue, range: card.range, speed: card.speed,
            moved: false, firstAttackBonus: false, bonusUsed: false, invincibleTurns: 0, nextAttackDouble: false,
            tempAttackBonus: 0, skillUsedThisTurn: false, isCharging: false, chargeTargetId: null,
            skillCooldown: 0, stun: 0, nextAttackBonus: 0, chargeIsBase: false, chargeBaseSide: null,
            superCharging: false, superChargeTurnsLeft: 0, superChargeTargetId: null, superChargeIsBase: false, superChargeBaseSide: null,
            knightSkillUsed: false, halberdierSkillUsed: false, halberdierCharging: false, nerdJamUsed: false, nerdJamActive: false,
            movesLeftThisTurn: Math.round(card.speed * 100) / 100, displacedByAllySkillThisTurn: false, silenced: 0, transformUsed: false,
            isSweepCharging: false, hornRecoveryTurns: 0, hornPendingHeal: 0,
            shieldValue: 0, nativeShieldValue: 0, externalShieldSources: {}, absoluteImmunityTurns: 0, reviveTimesLeft: 0,
            extraAttacks: (card.extraAttacks || 0), attacksLeftThisTurn: 0, weakenedEnemies: [], eagleEyeTargets: [], windSkillUsed: false,
            cupidPair: null, cupidUseCount: 0, shaLinBindTurn: 0, shaLinBindRow: -1, shaLinBindCol: -1, shaLinUseCount: 0,
            zhongyiHealUsed: false, scapegoatUsed: false, scapegoatProtectorId: null, feijiBonusGiven: 0, feizheBonusGiven: 0,
            flagBearerProtectTurn: 0, witchProtectReduce: 0, witchProtectorId: null, plagueInfected: false, plagueOwnerSide: null,
            bartenderUseCount: 0, drunkardInvincibleUsed: false, spearmanCharges: 0, braceActive: false, braceShield: 0,
            counterBonus: 0, counterUseCount: 0, fireGodBuffTurns: 0, fireGodSkillUsed: false, fanCooldown: 0, kickCooldown: 0,
            mirrorId: null, mirrorSkillUsed: false, mirrorSwappedThisTurn: false, hephaestusUseCount: 0,
            riluoPlaced: false, riluoRow: -1, riluoCol: -1, riluoReleaseCount: 3, equipmentId: null,
            motCharging: false, motChargeTurns: 0, motReleaseTurn: false,
        };
    }

    // 记录当前步骤的初始快照（用于检测"变化"）
    function tutorialTakeSnapshot() {
        if (!tutorialState) return;
        const soldier = gameState.units.find(u => u.side === 0 && u.cardName === "士兵" && u.life > 0);
        const archer = gameState.units.find(u => u.side === 1 && u.cardName === "弓箭手" && u.life > 0);
        tutorialState.snapshot = {
            p0Count: gameState.units.filter(u => u.side === 0 && u.life > 0).length,
            soldierRow: soldier ? soldier.row : -1,
            soldierCol: soldier ? soldier.col : -1,
            archerLife: archer ? archer.life : -1,
            turn: gameState.turn,
        };
        tutorialState.shopPhase = 'none';
    }

    // 应用教程高亮（renderUI 重绘后调用）
    function applyTutorialHighlight() {
        if (!tutorialState || !tutorialState.active) return;
        const stepDef = BEGINNER_TUTORIAL_STEPS[tutorialState.viewStep];
        if (!stepDef) return;
        document.querySelectorAll('.tutorial-glow').forEach(el => el.classList.remove('tutorial-glow'));
        if (stepDef.highlightCells) {
            const grid = document.getElementById('gameGrid');
            if (grid) {
                const cells = grid.querySelectorAll('.cell');
                const list = stepDef.highlightCells(tutorialState);
                list.forEach(({ row, col }) => {
                    const idx = row * 3 + col;
                    if (cells[idx]) cells[idx].classList.add('tutorial-glow');
                });
            }
        }
        if (stepDef.highlightIds) {
            const ids = stepDef.highlightIds(tutorialState) || [];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('tutorial-glow');
            });
        }
    }

    // 渲染教程引导面板
    function tutorialShowPanel() {
        const old = document.getElementById('tutorialGuidePanel');
        if (old) old.remove();
        if (!tutorialState) return;
        const stepDef = BEGINNER_TUTORIAL_STEPS[tutorialState.viewStep];
        if (!stepDef) return;
        const isReviewing = tutorialState.viewStep < tutorialState.step;
        // 面板位置：步骤声明 panelPos（如高亮在页面顶部则面板放下方，避免遮挡教学区域）
        const posTop = stepDef.panelPos !== 'bottom';
        const panel = document.createElement('div');
        panel.id = 'tutorialGuidePanel';
        panel.style.cssText = `position:fixed;left:50%;${posTop ? 'top:8px;' : 'bottom:8px;'}transform:translateX(-50%);width:min(700px,94vw);background:rgba(30,22,13,0.96);border:2px solid #d4a847;border-radius:14px;padding:12px 18px;z-index:900;box-shadow:0 8px 34px rgba(0,0,0,0.75);color:#f9eec1;font-size:14px;line-height:1.65;box-sizing:border-box;max-height:42vh;overflow-y:auto;`;
        panel.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:20px;">${stepDef.icon}</span>
                <b style="color:#ffd98a;font-size:16px;">${stepDef.title}</b>
                <span style="margin-left:auto;font-size:12px;color:#c8b48a;">步骤 ${tutorialState.viewStep + 1}/${BEGINNER_TUTORIAL_STEPS.length}${isReviewing ? ' · 回顾中' : ''}</span>
            </div>
            <div>${stepDef.text}</div>
            <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
                ${tutorialState.viewStep > 0 ? '<button id="tutPrevBtn" type="button" style="cursor:pointer;background:#4a3a28;border:1px solid #8a7a5a;border-radius:8px;padding:7px 14px;color:#f9eec1;font-size:13px;">上一步</button>' : ''}
                ${(stepDef.requiresAction && !isReviewing) ? '<button id="tutSkipBtn" type="button" style="cursor:pointer;background:#4a3a28;border:1px solid #8a7a5a;border-radius:8px;padding:7px 14px;color:#f9eec1;font-size:13px;">跳过此步</button>' : ''}
                ${(!stepDef.requiresAction || isReviewing) ? `<button id="tutNextBtn" type="button" style="cursor:pointer;background:linear-gradient(135deg,#b8862b,#8a6418);border:none;border-radius:8px;padding:7px 16px;color:#fff;font-size:13px;font-weight:bold;">${isReviewing ? `回到当前步骤（${tutorialState.step + 1}）` : (stepDef.buttonText || '下一步')}</button>` : ''}
                <button id="tutExitBtn" type="button" style="cursor:pointer;background:transparent;border:1px solid #7a5a3a;border-radius:8px;padding:7px 12px;color:#c8b48a;font-size:13px;">退出教程</button>
            </div>`;
        document.body.appendChild(panel);
        const nextBtn = document.getElementById('tutNextBtn');
        if (nextBtn) nextBtn.onclick = () => tutorialNextStep();
        document.getElementById('tutExitBtn').onclick = () => tutorialEnd();
        const prevBtn = document.getElementById('tutPrevBtn');
        if (prevBtn) prevBtn.onclick = () => tutorialPrevStep();
        const skipBtn = document.getElementById('tutSkipBtn');
        if (skipBtn) skipBtn.onclick = () => tutorialNextStep();
        applyTutorialHighlight();
        // 自动滚动到当前教学区域，避免被面板遮挡
        setTimeout(tutorialScrollToTarget, 60);
    }

    // 自动滚动页面，让高亮/教学目标进入视口中部（面板在顶部或底部，不会遮挡它）
    function tutorialScrollToTarget() {
        if (!tutorialState) return;
        const stepDef = BEGINNER_TUTORIAL_STEPS[tutorialState.viewStep];
        if (!stepDef) return;
        let targetEl = null;
        if (stepDef.highlightCells) {
            const cells = stepDef.highlightCells(tutorialState);
            if (cells.length > 0) {
                const grid = document.getElementById('gameGrid');
                const allCells = grid ? grid.querySelectorAll('.cell') : null;
                if (allCells && allCells[cells[0].row * 3 + cells[0].col]) {
                    targetEl = allCells[cells[0].row * 3 + cells[0].col];
                }
            }
        }
        if (!targetEl && stepDef.highlightIds) {
            const ids = stepDef.highlightIds(tutorialState) || [];
            for (const id of ids) {
                const el = document.getElementById(id);
                if (el) { targetEl = el; break; }
            }
        }
        if (targetEl && typeof targetEl.scrollIntoView === 'function') {
            try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* 忽略滚动错误 */ }
        }
    }

    // 推进（回顾中则直接回到当前步骤；否则真正进入下一步）
    function tutorialNextStep() {
        if (!tutorialState) return;
        if (tutorialState.viewStep < tutorialState.step) {
            tutorialState.viewStep = tutorialState.step;
            tutorialShowPanel();
            renderUI();
            return;
        }
        tutorialState.step++;
        tutorialState.viewStep = tutorialState.step;
        if (tutorialState.step >= BEGINNER_TUTORIAL_STEPS.length) {
            tutorialEnd();
            return;
        }
        tutorialTakeSnapshot();
        tutorialShowPanel();
        renderUI();
    }

    // 返回上一步回顾（不影响实际进度与检测）
    function tutorialPrevStep() {
        if (!tutorialState) return;
        if (tutorialState.viewStep > 0) {
            tutorialState.viewStep--;
            tutorialShowPanel();
            renderUI();
        }
    }

    // 轮询检测当前步骤的完成条件（回顾中暂停检测）
    function tutorialPoll() {
        if (!tutorialState || !tutorialState.active) return;
        if (tutorialState.viewStep !== tutorialState.step) return; // 回顾中不检测
        const stepDef = BEGINNER_TUTORIAL_STEPS[tutorialState.step];
        if (!stepDef || !stepDef.check) return;
        // 装备商店：检测"打开过又关闭"
        if (tutorialState.step === 10) {
            const shopOpen = !!document.querySelector('.mode-select-overlay');
            if (tutorialState.shopPhase === 'none' && shopOpen && gameState.isModalOpen) tutorialState.shopPhase = 'opened';
            if (tutorialState.shopPhase === 'opened' && !shopOpen && !gameState.isModalOpen) tutorialState.shopPhase = 'done';
            if (tutorialState.shopPhase === 'done') tutorialNextStep();
            return;
        }
        if (stepDef.check(tutorialState)) tutorialNextStep();
    }

    // 结束教程：清理所有教程痕迹
    function tutorialEnd() {
        if (tutorialTimer) { clearInterval(tutorialTimer); tutorialTimer = null; }
        tutorialState = null;
        infiniteManaEnabled = false;
        const panel = document.getElementById('tutorialGuidePanel');
        if (panel) panel.remove();
        document.querySelectorAll('.tutorial-glow').forEach(el => el.classList.remove('tutorial-glow'));
        renderUI();
        showToast('🎓 教程已结束');
        // 唤醒等待中的 startGame 循环，返回模式选择
        if (tutorialResolve) { const r = tutorialResolve; tutorialResolve = null; r(); }
    }

    // ════════════ 教程操作白名单：降低自由度，拦截与当前步骤无关的操作 ════════════
    // 非教程放行；教程中仅当"正在展示当前实际步骤"且该步骤允许此类操作时放行
    function tutorialAllowAction(action) {
        if (!tutorialState || !tutorialState.active) return true;
        if (tutorialState.viewStep !== tutorialState.step) return false; // 回顾中禁止操作
        const stepDef = BEGINNER_TUTORIAL_STEPS[tutorialState.step];
        if (!stepDef) return false;
        const allowed = stepDef.allowedActions || [];
        return allowed.includes(action);
    }

    function tutorialBlock(what) {
        showToast(`🎓 教程中请按提示操作（${what}暂不可用）`);
    }

    // ════════════ 新手教程入口 ════════════
    async function startBeginnerTutorial() {
        gameMode = 'full';
        // 初始化一个干净的演示对局（双人、无限费、装备齐全）
        const allEquipments = EQUIPMENT_LIBRARY.map(e => e.id);
        await resetGame(null, null, allEquipments, allEquipments);
        infiniteManaEnabled = true;
        // 蓝方手牌：士兵 + 旗手（教程步骤所需）
        const soldier = CARD_LIBRARY.find(c => c.name === "士兵");
        const flagBearer = CARD_LIBRARY.find(c => c.name === "旗手");
        gameState.players[0].hand = soldier && flagBearer ? [{ ...soldier }, { ...flagBearer }] : [{ ...soldier }];
        gameState.players[1].hand = [];
        gameState.players[1].deck = [];
        gameState.players[1].prepool = [];
        gameState.selectedCardIdx = -1;
        gameState.selectedUnitId = null;
        // 演示敌方：红方弓箭手在蓝方前进路线上
        const archer = CARD_LIBRARY.find(c => c.name === "弓箭手");
        if (archer) {
            const enemyUnit = createTutorialUnit(archer, 1, 2, 1);
            gameState.units.push(enemyUnit);
        }
        // 启动教程状态
        tutorialState = { active: true, step: 0, viewStep: 0, snapshot: {}, shopPhase: 'none' };
        tutorialTakeSnapshot();
        tutorialShowPanel();
        renderUI();
        if (tutorialTimer) clearInterval(tutorialTimer);
        tutorialTimer = setInterval(tutorialPoll, 300);
        // 返回 Promise：教程结束时 resolve，让 startGame 循环回到模式选择
        return new Promise((resolve) => { tutorialResolve = resolve; });
    }

    function openTestPanel() {
        if (gameMode === 'custom') { showToast('自定义卡组模式下测试模式不可用'); return; }
        if (gameMode === 'ai') { showToast('人机对战模式下测试模式不可用'); return; }
        if (tutorialState && tutorialState.active) { showToast('新手教程中测试模式不可用'); return; }
        if (networkActive()) { showToast('🌐 远程联机中测试模式不可用'); return; }
        if (testPanelOverlay) {
            testPanelOverlay.remove();
            testPanelOverlay = null;
            return;
        }
        const overlay = document.createElement('div');
        overlay.className = 'test-panel-overlay';
        overlay.id = 'testPanelOverlay';
        const panel = document.createElement('div');
        panel.className = 'test-panel';
        panel.innerHTML = `
            <h3>🧪 测试模式</h3>
            <div class="test-group">
                <h4>调试工具</h4>
                <div class="test-row">
                    <button class="test-btn" id="testClearUnits">🧹 清除所有单位</button>
                    <button class="test-btn" id="testToggleInfiniteMana" style="background:#b85c00;">💰 无限费: OFF</button>
                </div>
                <div class="test-group">
                    <h4>添加手牌</h4>
                    <div class="test-grade-buttons">
                        <button class="test-grade-btn active" data-grade="all">全部</button>
                        <button class="test-grade-btn" data-grade="1">⭐ 1级</button>
                        <button class="test-grade-btn" data-grade="2">⭐⭐ 2级</button>
                        <button class="test-grade-btn" data-grade="3">⭐⭐⭐ 3级</button>
                    </div>
                    <input type="text" class="test-card-search" placeholder="🔍 搜索" id="testCardSearch">
                    <div class="test-card-grid" id="testCardGrid"></div>
                </div>
            </div>
            <div class="test-panel-buttons">
                <button class="custom-modal-btn confirm" id="closeTestPanel">关闭</button>
            </div>
        `;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        testPanelOverlay = overlay;

        const toggleBtn = document.getElementById('testToggleInfiniteMana');
        function updateToggleBtn() {
            toggleBtn.innerText = infiniteManaEnabled ? "💰 无限费: ON" : "💰 无限费: OFF";
            toggleBtn.style.background = infiniteManaEnabled ? "#2c6e6e" : "#b85c00";
        }
        updateToggleBtn();
        document.getElementById('testToggleInfiniteMana').onclick = () => {
            infiniteManaEnabled = !infiniteManaEnabled;
            updateToggleBtn();
            if (infiniteManaEnabled) {
                gameState.players[0].mana = gameState.players[0].manaMax;
                gameState.players[1].mana = gameState.players[1].manaMax;
                showToast(`无限费模式已开启，费用已满`);
                addLog(`无限费模式开启，双方费用设为15`);
            } else {
                showToast(`无限费模式已关闭`);
                addLog(`无限费模式关闭`);
            }
            renderUI();
        };
        document.getElementById('testClearUnits').onclick = () => {
            gameState.units = [];
            addLog(`[测试] 清除所有单位`);
            showToast(`🧹 所有单位已清除`);
            renderUI();
        };
        const cardGrid = document.getElementById('testCardGrid');
        const cardSearch = document.getElementById('testCardSearch');
        let currentTestGrade = 'all';
        function renderCardGrid(filter = '') {
            cardGrid.innerHTML = '';
            let filtered = CARD_LIBRARY.filter(c => {
                if (currentTestGrade !== 'all' && c.grade != currentTestGrade) return false;
                if (filter && !c.name.toLowerCase().includes(filter.toLowerCase())) return false;
                return true;
            });
            // 排序：等级↑ → 费用↑ → 名称
            filtered.sort((a,b) => a.name.localeCompare(b.name, 'zh'));
            filtered.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'test-card-item';
                const gradeStars = '⭐'.repeat(card.grade);
                cardDiv.innerHTML = `<b>${card.name}</b><br><span style="font-size:11px;color:#9a8a6a;">${gradeStars} 💰${card.cost} ❤️${card.life} ${card.dmgType}${card.dmgValue} 🏃${card.speed}${card.extraAttacks ? ' ⚔️×' + (1 + card.extraAttacks) : ''}</span>`;
                cardDiv.onclick = () => {
                    const side = gameState.turn;
                    const newCard = { ...card };
                    if (gameState.players[side].hand.length >= gameState.players[side].handMax) {
                        const discarded = gameState.players[side].hand.shift();
                        addLog(`[测试] 手牌已满，自动弃掉 ${discarded.name} 以便添加 ${card.name}`);
                        showToast(`⚠️ 手牌满，自动弃掉 ${discarded.name}`);
                        if (gameState.selectedCardIdx === 0) gameState.selectedCardIdx = -1;
                        else if (gameState.selectedCardIdx > 0) gameState.selectedCardIdx--;
                    }
                    gameState.players[side].hand.push(newCard);
                    addLog(`[测试] 为${side===0?"蓝方":"红方"}添加手牌: ${card.name}`);
                    showToast(`🧪 添加手牌: ${card.name}`);
                    renderUI();
                };
                cardGrid.appendChild(cardDiv);
            });
        }
        cardSearch.oninput = (e) => renderCardGrid(e.target.value);
        renderCardGrid();
        // 等级筛选按钮
        const gradeBtns = panel.querySelectorAll('.test-grade-btn');
        gradeBtns.forEach(btn => {
            btn.onclick = () => {
                gradeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTestGrade = btn.getAttribute('data-grade');
                renderCardGrid(cardSearch.value);
            };
        });
        document.getElementById('closeTestPanel').onclick = () => {
            overlay.remove();
            testPanelOverlay = null;
        };
    }

    function onGlobalKeydown(e) {
        // ESC 关闭测试模式/教程/图鉴窗口
        if (e.code === 'Escape') {
            if (testPanelOverlay) { testPanelOverlay.remove(); testPanelOverlay = null; return; }
            const pokedexDetail = document.querySelector('.pokedex-detail-overlay');
            if (pokedexDetail) { pokedexDetail.remove(); return; }
            const tutorialOverlay = document.querySelector('.tutorial-overlay');
            if (tutorialOverlay) { tutorialOverlay.remove(); return; }
            const pokedexOverlay = document.querySelector('.pokedex-overlay');
            if (pokedexOverlay) { pokedexOverlay.remove(); return; }
        }
        // 快捷键仅在非模态状态下生效，且不在输入框内
        if (gameState.isModalOpen) return;
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        // AI 回合中屏蔽所有游戏操作快捷键（ESC 关闭浮层除外）
        if (aiActing) return;
        // 镜中人攻击选格 / 影舞姬滑步 / 装备穿戴选择等 pending 态：非 ESC 快捷键一律屏蔽（ESC 由下方分支处理）
        if (e.code !== 'Escape' && (gameState.awaitingMirrorAttack || gameState.awaitingGlide || gameState.awaitingEquipmentTarget)) {
            return;
        }
        if (e.altKey && e.code === 'KeyE') {
            e.preventDefault();
            if (gameState.awaitingSkillTarget) { showToast("正在选择技能目标，请先完成或取消"); return; }
            const selectedUnit = gameState.selectedUnitId ? gameState.units.find(u => u.id === gameState.selectedUnitId) : null;
            if (!selectedUnit || selectedUnit.side !== gameState.turn) { showToast("请先选中一个己方单位"); return; }
            // 远程联机：非自己回合只读；客机回合技能转发给主机
            if (networkForward({ type: 'skill', id: selectedUnit.id })) return;
            useSelectedUnitSkill(selectedUnit);
        }
        else if (e.altKey && e.code === 'KeyQ') {
            e.preventDefault();
            // 新手教程：禁止弃牌/爆牌
            if (tutorialState && tutorialState.active) { tutorialBlock('弃牌/爆牌'); return; }
            if (gameState.awaitingSkillTarget) { showToast(`正在选择技能目标，请先完成或取消`); return; }
            // 远程联机：非自己回合只读；客机回合弃牌/爆牌转发给主机
            if (networkActive()) {
                const ng = networkGate();
                if (ng === 'block') return;
                if (ng === 'forward') {
                    if (gameState.selectedCardIdx !== -1) networkSendAction({ type: 'discard', idx: gameState.selectedCardIdx });
                    else if (gameState.selectedUnitId !== null) networkSendAction({ type: 'pop', id: gameState.selectedUnitId });
                    else showToast("没有选中的手牌或单位");
                    return;
                }
            }
            if (gameState.selectedCardIdx !== -1) discardCard(gameState.turn, gameState.selectedCardIdx);
            else if (gameState.selectedUnitId !== null) {
                const selectedUnit = gameState.units.find(u => u.id === gameState.selectedUnitId);
                if (selectedUnit && selectedUnit.side === gameState.turn) {
                    popUnit(selectedUnit.id);
                    gameState.selectedUnitId = null;
                    renderUI();
                } else showToast("没有选中有效的己方单位");
            } else showToast("没有选中的手牌或单位");
        }
        else if (!e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && /^Digit[1-6]$/.test(e.code)) {
            // 技能选择目标期间，禁止选取手牌
            if (gameState.awaitingSkillTarget) { showToast(`正在选择技能目标，请先完成或取消`); return; }
            // 1~6 数字键直接选取对应手牌
            const idx = parseInt(e.code.replace('Digit', '')) - 1;
            const hand = gameState.players[gameState.turn].hand;
            if (idx < hand.length) {
                if (gameState.selectedCardIdx === idx) {
                    // 再次按相同数字取消选择
                    gameState.selectedCardIdx = -1;
                    showToast(`已取消选择手牌`);
                } else {
                    gameState.selectedCardIdx = idx;
                    gameState.selectedUnitId = null;
                }
                renderUI();
            }
        }
        else if (e.code === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            // ESC 跳过滑步
            if (gameState.awaitingGlide) {
                gameState.awaitingGlide = false;
                gameState.glideUnitId = null;
                addLog("跳过滑步。");
                renderUI();
                return;
            }
            // ESC 取消镜中人攻击
            if (gameState.awaitingMirrorAttack) {
                gameState.awaitingMirrorAttack = false;
                gameState.mirrorAttackUnitId = null;
                addLog("取消攻击。");
                renderUI();
                return;
            }
            // ESC 取消装备购买选择
            if (gameState.awaitingEquipmentTarget) {
                clearEquipmentTarget();
                addLog("已取消装备购买。");
                return;
            }
            // ESC 取消技能选择或手牌选择
            if (gameState.awaitingSkillTarget) {
                const caster = gameState.units.find(u => u.id === gameState.skillCasterId);
                if (caster) caster.skillUsedThisTurn = false;
                clearSkillTarget();
                addLog("已取消技能释放。");
                renderUI();
            } else if (gameState.selectedCardIdx !== -1) {
                gameState.selectedCardIdx = -1;
                showToast("已取消手牌选择");
                renderUI();
            }
        }
    }

    // ========== 奴隶变形选择（拼音排序 + 搜索）==========
    async function showSlaveTransformSelect() {
        const candidates = CARD_LIBRARY.filter(c => c.name !== "奴隶");
        candidates.sort((a, b) => a.name.localeCompare(b.name, 'zh'));  // 按拼音排序

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'mode-select-overlay';
            const panel = document.createElement('div');
            panel.className = 'mode-select-panel';
            panel.style.cssText = 'max-width:420px; padding:16px;';

            const h2 = document.createElement('h2');
            h2.textContent = '选择要变形的单位';
            panel.appendChild(h2);

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = '🔍 搜索单位名称';
            searchInput.style.cssText = 'width:100%; padding:6px 10px; margin:8px 0; border-radius:6px; border:1px solid rgba(212,168,71,0.3); background:rgba(0,0,0,0.4); color:#f9eec1; font-size:13px; box-sizing:border-box;';
            panel.appendChild(searchInput);

            const listDiv = document.createElement('div');
            listDiv.style.cssText = 'max-height:340px; overflow-y:auto;';
            panel.appendChild(listDiv);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'mode-btn';
            closeBtn.textContent = '取消 (ESC)';
            closeBtn.style.cssText = 'margin-top:8px; cursor:pointer;';
            panel.appendChild(closeBtn);

            function render(filter) {
                listDiv.innerHTML = '';
                const filtered = filter
                    ? candidates.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
                    : candidates;
                if (filtered.length === 0) {
                    listDiv.innerHTML = '<div style="color:#999; padding:10px; text-align:center;">无匹配单位</div>';
                    return;
                }
                filtered.forEach(card => {
                    const item = document.createElement('div');
                    item.style.cssText = 'padding:8px 10px; margin:3px 0; border-radius:6px; background:rgba(255,255,255,0.05); cursor:pointer; display:flex; align-items:center; gap:8px;';
                    item.innerHTML = `<span>${card.name}</span><span style="margin-left:auto; font-size:11px; color:#c8b48a;">💰${card.cost} ❤️${card.life} ${card.dmgType}${card.dmgValue} 📏${card.range}</span>`;
                    item.onmouseenter = () => item.style.background = 'rgba(212,168,71,0.15)';
                    item.onmouseleave = () => item.style.background = 'rgba(255,255,255,0.05)';
                    item.onclick = () => { overlay.remove(); document.removeEventListener('keydown', escHandler); resolve(card); };
                    listDiv.appendChild(item);
                });
            }
            searchInput.oninput = () => render(searchInput.value);

            const close = () => {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
                resolve(null);
            };
            closeBtn.onclick = close;
            const escHandler = (e) => { if (e.key === 'Escape') close(); };
            document.addEventListener('keydown', escHandler);

            render('');
            searchInput.focus();
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
        });
    }

    window.addEventListener('keydown', onGlobalKeydown);

    // ========== 对局复盘面板 ==========
    // 游戏结束后展示完整复盘：统计、AI点评、MVP、关键事件
    async function showRecapPanel(winnerSide) {
        const stats = gameState.matchStats || {};
        const events = gameState.matchEvents || [];
        const sideName = s => s === 0 ? '蓝方' : '红方';
        const loserSide = 1 - winnerSide;

        // AI 生成点评
        const commentary = generateRecapCommentary(winnerSide, stats, events);
        // 战术亮点点评
        const tacticalHtml = generateTacticalHighlights(events, stats);
        // 提取关键事件
        const keyEventsHtml = extractKeyEvents(events);
        // 计算 MVP
        const mvpHtml = calculateMVP(events);

        gameState.isModalOpen = true;
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'recap-overlay';

            const panel = document.createElement('div');
            panel.className = 'recap-panel';

            panel.innerHTML = `
                <h2>🏆 对局复盘</h2>
                <div class="recap-winner">🎉 ${sideName(winnerSide)} 胜利！</div>

                <div class="recap-section">
                    <h3>📊 战绩统计</h3>
                    <table class="recap-stats-table">
                        <tr><th>指标</th><th>蓝方</th><th>红方</th></tr>
                        <tr><td>总回合数</td><td colspan="2">${stats.turnCount || 0}</td></tr>
                        <tr><td>出牌数</td><td>${stats.cardsPlayed?.[0] || 0}</td><td>${stats.cardsPlayed?.[1] || 0}</td></tr>
                        <tr><td>击杀数</td><td>${stats.unitsKilled?.[0] || 0}</td><td>${stats.unitsKilled?.[1] || 0}</td></tr>
                        <tr><td>总伤害</td><td>${stats.totalDamage?.[0] || 0}</td><td>${stats.totalDamage?.[1] || 0}</td></tr>
                        <tr><td>本体伤害</td><td>${stats.baseDamage?.[0] || 0}</td><td>${stats.baseDamage?.[1] || 0}</td></tr>
                        <tr><td>技能使用</td><td>${stats.skillsUsed?.[0] || 0}</td><td>${stats.skillsUsed?.[1] || 0}</td></tr>
                        <tr><td>组合技</td><td>${stats.comboCount?.[0] || 0}</td><td>${stats.comboCount?.[1] || 0}</td></tr>
                    </table>
                </div>

                <div class="recap-section">
                    <h3>🎙️ AI 点评</h3>
                    <div class="recap-commentary">${commentary}</div>
                </div>

                ${tacticalHtml ? `<div class="recap-section"><h3>⚡ 战术亮点</h3><div class="recap-tactical">${tacticalHtml}</div></div>` : ''}

                ${mvpHtml ? `<div class="recap-section"><h3>⭐ MVP</h3><div class="recap-mvp">${mvpHtml}</div></div>` : ''}

                <div class="recap-section">
                    <h3>📜 关键事件</h3>
                    <div class="recap-events">${keyEventsHtml}</div>
                </div>

                <div class="recap-buttons">
                    <button class="custom-modal-btn confirm recap-continue">继续</button>
                </div>
            `;

            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            panel.querySelector('.recap-continue').onclick = () => {
                overlay.remove();
                gameState.isModalOpen = false;
                resolve();
            };
        });
    }

    // AI 复盘点评生成：根据统计数据生成分析文本
    function generateRecapCommentary(winnerSide, stats, events) {
        const sideName = s => s === 0 ? '蓝方' : '红方';
        const loserSide = 1 - winnerSide;
        let lines = [];

        // 1. 总体评价（节奏与风格）
        const turns = stats.turnCount || 0;
        if (turns <= 6) {
            lines.push(`本局仅 ${turns} 回合便分出胜负，${sideName(winnerSide)}以凌厉攻势速战速决。`);
        } else if (turns <= 12) {
            lines.push(`本局共 ${turns} 回合，节奏适中。${sideName(winnerSide)}凭借更稳健的运营取得胜利。`);
        } else {
            lines.push(`本局长达 ${turns} 回合，是一场拉锯战。${sideName(winnerSide)}在持久战中展现了更优的资源管理。`);
        }

        // 2. 伤害对比分析
        const dmgWin = stats.totalDamage?.[winnerSide] || 0;
        const dmgLose = stats.totalDamage?.[loserSide] || 0;
        if (dmgWin > dmgLose * 1.5 && dmgWin > 0) {
            lines.push(`伤害输出方面，${sideName(winnerSide)}以 ${dmgWin} 对 ${dmgLose} 形成压制，展现了强大的场面控制力。`);
        } else if (dmgLose > dmgWin * 1.2 && dmgLose > 0) {
            lines.push(`尽管${sideName(loserSide)}总伤害更高(${dmgLose} vs ${dmgWin})，但${sideName(winnerSide)}的伤害更有效率，直击要害。`);
        } else if (dmgWin > 0 || dmgLose > 0) {
            lines.push(`双方伤害输出接近(${dmgWin} vs ${dmgLose})，胜负在于关键时刻的决策。`);
        }

        // 3. 击杀交换分析
        const killWin = stats.unitsKilled?.[winnerSide] || 0;
        const killLose = stats.unitsKilled?.[loserSide] || 0;
        if (killWin > killLose + 2) {
            lines.push(`单位交换上，${sideName(winnerSide)}以 ${killWin}:${killLose} 大幅领先，场面优势明显。`);
        } else if (killWin > 0 || killLose > 0) {
            lines.push(`单位交换 ${killWin}:${killLose}，双方互有取舍。`);
        }

        // 3.5 击杀之王（表扬击杀最多的单位，而非只看攻击本体）
        const unitKills = stats.unitKills || {};
        let topKiller = null, topKills = 0;
        for (let [name, data] of Object.entries(unitKills)) {
            if (data.count > topKills) {
                topKills = data.count;
                topKiller = { name, side: data.side };
            }
        }
        if (topKiller && topKills >= 2) {
            const killerSideName = topKiller.side === 0 ? '蓝方' : '红方';
            lines.push(`⚔️ 击杀之王：${killerSideName}的<b>${topKiller.name}</b>单场击杀${topKills}名敌军，是战场上的核心战力。`);
        }

        // 4. 组合技评价
        const comboWin = stats.comboCount?.[winnerSide] || 0;
        const comboLose = stats.comboCount?.[loserSide] || 0;
        if (comboWin > 0) {
            lines.push(`${sideName(winnerSide)}成功打出 ${comboWin} 次组合技连携，这是取胜的关键因素。`);
        }
        if (comboLose > comboWin && comboLose > 0) {
            lines.push(`${sideName(loserSide)}虽也执行了 ${comboLose} 次组合技，但未能转化为胜势。`);
        }

        // 5. 技能运用评价
        const skillWin = stats.skillsUsed?.[winnerSide] || 0;
        const skillLose = stats.skillsUsed?.[loserSide] || 0;
        if (skillWin > skillLose + 2) {
            lines.push(`技能运用上，${sideName(winnerSide)}更活跃(${skillWin}次 vs ${skillLose}次)，把握了更多战术机会。`);
        } else if (skillWin === 0 && skillLose > 2) {
            lines.push(`${sideName(winnerSide)}未使用任何技能便取得胜利，纯粹靠单位质量碾压。`);
        }

        // 6. 本体伤害分析
        const baseWin = stats.baseDamage?.[winnerSide] || 0;
        const baseLose = stats.baseDamage?.[loserSide] || 0;
        if (baseWin >= 10) {
            lines.push(`${sideName(winnerSide)}对敌方本体累积 ${baseWin} 点伤害，进攻目标明确。`);
        }
        if (baseLose > 0 && baseLose >= 5) {
            lines.push(`${sideName(loserSide)}也造成了 ${baseLose} 点本体伤害，但未能完成致命一击。`);
        }

        // 7. 关键事件亮点（从事件中提取 Combo 和击杀）
        const comboEvents = events.filter(e => e.category === 'combo');
        if (comboEvents.length > 0) {
            const lastCombo = comboEvents[comboEvents.length - 1];
            lines.push(`精彩瞬间：「${lastCombo.msg.replace(/🤖\s*/, '')}」`);
        }
        const killEvents = events.filter(e => e.category === 'skill_kill');
        if (killEvents.length > 0) {
            lines.push(`本场共触发 ${killEvents.length} 次秒杀，关键单位被及时处理。`);
        }

        return lines.map(l => `<p>${l}</p>`).join('');
    }

    // 战术亮点点评：根据识别到的战术事件类型生成生动点评
    function generateTacticalHighlights(events, stats) {
        const sideName = s => s === 0 ? '蓝方' : '红方';
        const tacticalStats = stats.tacticalEvents || {};

        // 按战术类型分组事件，保留首次和末次发生的回合
        const tacticGroups = {};
        events.forEach(e => {
            if (!e.tactic) return;
            if (!tacticGroups[e.tactic]) tacticGroups[e.tactic] = { count: 0, side: e.side, firstTurn: e.turnCount, lastTurn: e.turnCount, msgs: [] };
            const g = tacticGroups[e.tactic];
            g.count++;
            g.side = e.side;
            if (e.turnCount < g.firstTurn) g.firstTurn = e.turnCount;
            if (e.turnCount > g.lastTurn) g.lastTurn = e.turnCount;
            if (g.msgs.length < 3) g.msgs.push(e.msg);
        });

        if (Object.keys(tacticGroups).length === 0) return '';

        // 战术点评模板：每种战术类型对应生动的点评文案
        const TACTIC_COMMENTARY = {
            knight_execute: {
                icon: '⚔️',
                title: '骑士无情斩',
                desc: (g) => `共发动 <b>${g.count}</b> 次秒杀，精准清除关键目标。骑士的秒杀是战场上的死刑判决，让敌方高价值单位无处遁形！`
            },
            zhanyue_execute: {
                icon: '🗡️',
                title: '斩月收割',
                desc: (g) => `斩月标记收割 <b>${g.count}</b> 次，将标记目标一一斩落，展现了致命的连锁击杀艺术！`
            },
            weaponsmith_buff: {
                icon: '🛠️',
                title: '武器商协作',
                desc: (g) => `武器商提供 <b>${g.count}</b> 次攻速加持，让友军化身战场绞肉机，形成压制性火力网！`
            },
            shaLin_lockdown: {
                icon: '🪞',
                title: '纱琳封路',
                desc: (g) => `纱琳施放 <b>${g.count}</b> 次精妙定身，封锁敌方走位并额外增伤，完美掌控战场节奏！`
            },
            wrestler_throw: {
                icon: '💪',
                title: '大力士摔投',
                desc: (g) => `大力士完成 <b>${g.count}</b> 次摔投，将敌人粗暴甩飞，打乱敌方阵型的同时制造孤立击杀机会！`
            },
            pull: {
                icon: '🧲',
                title: '拉拽陷阱',
                desc: (g) => `塞壬拉拽 <b>${g.count}</b> 次，将敌方单位拖入死亡陷阱，让远程输出者无处可逃！`
            },
            cupid_bind: {
                icon: '💘',
                title: '爱神共生死',
                desc: (g) => `爱神缔结 <b>${g.count}</b> 次共生死契约，绑定敌方单位形成连锁死亡威胁，牵一发动全身！`
            },
            scapegoat_save: {
                icon: '🐑',
                title: '替罪羊献身',
                desc: (g) => `替罪羊 <b>${g.count}</b> 次代替友方承受致命伤害，用生命守护关键单位，是忠诚的终极体现！`
            },
            shield_block: {
                icon: '🛡️',
                title: '护盾防御',
                desc: (g) => `护盾成功抵挡 <b>${g.count}</b> 次攻击，为友军争取了宝贵的生存与反击时间！`
            },
            absolute_immunity: {
                icon: '✨',
                title: '绝对免疫',
                desc: (g) => `枷锁猎手护盾破碎后触发 <b>${g.count}</b> 次绝对免疫，化身无敌战神横扫战场！`
            },
            drummer_buff: {
                icon: '🥁',
                title: '鼓手鼓舞',
                desc: (g) => `鼓手 <b>${g.count}</b> 次鼓舞友军，提升攻防属性，用节奏驱动整个团队的战斗力！`
            },
            alcohol_boost: {
                icon: '🍺',
                title: '酒类强化',
                desc: (g) => `酒类强化触发 <b>${g.count}</b> 次，让友军在醉意中爆发出超常战力！`
            },
            critical_hit: {
                icon: '💥',
                title: '致命暴击',
                desc: (g) => `全场触发 <b>${g.count}</b> 次暴击，每一次都是意料之外的致命一击！`
            },
            plague_spread: {
                icon: '🦠',
                title: '鼠疫蔓延',
                desc: (g) => `鼠疫扩散 <b>${g.count}</b> 次，在敌方阵线中播种瘟疫，让感染如野火般蔓延！`
            },
            revive: {
                icon: '🔄',
                title: '起死回生',
                desc: (g) => `猫的复活触发 <b>${g.count}</b> 次，让倒下的单位重返战场，给了敌方致命的意外！`
            },
            nerd_jam: {
                icon: '🤖',
                title: '行动干扰',
                desc: (g) => `书呆子启动 <b>${g.count}</b> 次行动干扰，打乱敌方攻击节奏，让对手的计划化为泡影！`
            },
            jinwei_disable: {
                icon: '🎴',
                title: '禁卫封牌',
                desc: (g) => `禁卫 <b>${g.count}</b> 次禁用敌方手牌，切断对手的战术选择，从信息层面压制对手！`
            },
            stun: {
                icon: '💫',
                title: '眩晕控制',
                desc: (g) => `全场造成 <b>${g.count}</b> 次眩晕，让敌方单位动弹不得，完美创造了集火窗口！`
            },
            sweep_charge: {
                icon: '🌀',
                title: '蓄力横扫',
                desc: (g) => `蓄力横扫释放 <b>${g.count}</b> 次，以蓄势待发的一击横扫整列敌军，AOE火力覆盖全场！`
            },
            blood_dance_kill: {
                icon: '🩸',
                title: '血舞收割',
                desc: (g) => `血舞击杀触发 <b>${g.count}</b> 次，以敌人的鲜血为燃料，越战越勇！`
            },
            hunger_kill: {
                icon: '🍽️',
                title: '饥饿吞噬',
                desc: (g) => `饥饿击杀 <b>${g.count}</b> 次，吞噬敌方单位补充自身，以战养战的恐怖循环！`
            },
            guard_substitute: {
                icon: '🤝',
                title: '守卫替伤',
                desc: (g) => `守卫 <b>${g.count}</b> 次代为承受伤害，用身躯筑起保护后排单位的铜墙铁壁！`
            },
            aifei_aura: {
                icon: '👑',
                title: '爱妃庇护',
                desc: (g) => `爱妃光环 <b>${g.count}</b> 次为法伤英雄加持，让魔法输出更上一层楼！`
            },
            flag_bearer: {
                icon: '旗帜',
                title: '旗手庇护',
                desc: (g) => `旗手 <b>${g.count}</b> 次为友军分担伤害，军旗不倒，士气不灭！`
            }
        };

        // 按出现次数排序，取最多的前12个战术
        const sortedTactics = Object.entries(tacticGroups)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 12);

        const highlights = sortedTactics.map(([key, g]) => {
            const template = TACTIC_COMMENTARY[key];
            if (!template) return null;
            const sn = sideName(g.side);
            return `<div class="tactic-item">
                <div class="tactic-header">${template.icon} <b>${template.title}</b></div>
                <div class="tactic-desc">${sn}方 — ${template.desc(g)}</div>
            </div>`;
        }).filter(h => h !== null);

        return highlights.join('');
    }

    // 提取关键事件用于回放显示（含战术事件高亮）
    function extractKeyEvents(events) {
        const keyCategories = ['game_start', 'game_end', 'combo', 'unit_death', 'base_damage', 'skill_kill'];
        // 战术事件的图标映射
        const TACTIC_ICONS = {
            knight_execute: '⚔️', zhanyue_execute: '🗡️', weaponsmith_buff: '🛠️',
            shaLin_lockdown: '🪞', wrestler_throw: '💪', pull: '🧲',
            cupid_bind: '💘', scapegoat_save: '🐑', shield_block: '🛡️',
            absolute_immunity: '✨', drummer_buff: '🥁', alcohol_boost: '🍺',
            critical_hit: '💥', plague_spread: '🦠', revive: '🔄',
            nerd_jam: '🤖', jinwei_disable: '🎴', stun: '💫',
            sweep_charge: '🌀', blood_dance_kill: '🩸', hunger_kill: '🍽️',
            guard_substitute: '🤝', aifei_aura: '👑', flag_bearer: '🚩'
        };

        // 包含关键类别事件 + 所有战术事件
        const keyEvents = events.filter(e => keyCategories.includes(e.category) || e.tactic);
        const limited = keyEvents.slice(-30);

        if (limited.length === 0) {
            return '<p style="color:#999;">无关键事件记录</p>';
        }

        return limited.map(e => {
            const tacticIcon = e.tactic ? TACTIC_ICONS[e.tactic] || '⚡' : '';
            const tacticClass = e.tactic ? ' tactic-event' : '';
            return `<div class="recap-event-item${tacticClass}"><span class="recap-turn">T${e.turnCount}</span> ${tacticIcon} ${escapeHtml(e.msg)}</div>`;
        }).join('');
    }

    // 计算 MVP：根据 matchStats 中追踪的 per-unit 伤害和击杀数据
    function calculateMVP(events) {
        const stats = gameState.matchStats || {};
        const unitDamage = stats.unitDamage || {};
        const unitKills = stats.unitKills || {};

        // 合并伤害和击杀数据
        const unitScores = {};  // name -> { score, side, damage, kills }

        // 伤害贡献（每点伤害 = 1分）
        for (let [name, data] of Object.entries(unitDamage)) {
            unitScores[name] = {
                score: data.damage,
                side: data.side,
                damage: data.damage,
                kills: 0
            };
        }

        // 击杀贡献（每次击杀 = 8分）
        for (let [name, data] of Object.entries(unitKills)) {
            if (!unitScores[name]) {
                unitScores[name] = { score: 0, side: data.side, damage: 0, kills: 0 };
            }
            unitScores[name].kills = data.count;
            unitScores[name].score += data.count * 8;
            unitScores[name].side = data.side;
        }

        // 找出 MVP
        let mvpName = null, mvpData = null;
        for (let [name, data] of Object.entries(unitScores)) {
            if (!mvpData || data.score > mvpData.score) {
                mvpName = name;
                mvpData = data;
            }
        }

        if (!mvpName || mvpData.score === 0) return null;
        const sideName = mvpData.side === 0 ? '蓝方' : '红方';
        let detail = [];
        if (mvpData.damage > 0) detail.push(`造成伤害${mvpData.damage}`);
        if (mvpData.kills > 0) detail.push(`击杀${mvpData.kills}名敌军`);
        return `<b>${escapeHtml(mvpName)}</b>（${sideName}）— ${detail.join('、')}，累计贡献值 ${mvpData.score}，本局最有价值单位`;
    }
