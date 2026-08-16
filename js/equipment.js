// ========== 装备系统 ==========
// 装备数据定义、购买/穿戴逻辑、装备效果接口
// 装备在单位存活期间永久生效，单位死亡时消失
//
// 依赖：gameState, CARD_LIBRARY, addLog, showToast, renderUI, showConfirm
// 被引用：ui.js（商店弹窗+装备显示）、targeting.js（穿戴选择）、
//          game-flow.js（placeUnit初始化）、battle-engine.js（效果触发）、ai.js（AI购买）

    // ========== 装备数据库 ==========
    // 每个装备定义：id, name, cost, icon, triggerType, desc
    // triggerType: "permanent" | "onAttack" | "onDamaged" | "onDeath" | "onLethalDamage" | "active"
    // 可选回调：apply(unit), onTurnStart(unit), onAttack(source,target,amount), onRemove(unit)
    const EQUIPMENT_LIBRARY = [
        // ── 复活甲 ──
        {
            id: "reviveArmor", name: "复活甲", cost: 3, icon: "💀", short: "满血复活",
            triggerType: "onDeath", buffsMaxLife: true,
            desc: "单位死亡后会在下一个我方回合开始时原地满血复活（所有属性恢复初始状态），只能触发一次",
        },
        // ── 星痕之杖 ──
        {
            id: "starWand", name: "星痕之杖", cost: 3, icon: "✨", short: "法伤×1.5",
            triggerType: "onAttack",
            desc: "单位造成的法术伤害（包括普攻和技能）×1.5（向上取整）",
        },
        // ── 暗影纱 ──
        {
            id: "witchCloak", name: "暗影纱", cost: 1, icon: "🧥", short: "法术护盾",
            triggerType: "permanent",
            desc: "单位在每回合开始时获得一点只能抵挡法伤的护盾",
            onTurnStart: (unit) => {
                unit.magicShieldValue = (unit.magicShieldValue || 0) + 1;
                addLog(`🧥 ${unit.cardName} 的暗影纱获得1点法术护盾`);
            },
        },
        // ── 护身符 ──
        {
            id: "amulet", name: "护身符", cost: 3, icon: "🔮", short: "免疫致命伤",
            triggerType: "onLethalDamage",
            desc: "单位受到致命伤害时免疫这次伤害并进入绝对免疫状态直至下一个我方回合结束，只能触发一次",
        },
        // ── 妖刀 ──
        {
            id: "demonBlade", name: "妖刀", cost: 3, icon: "🗡️", short: "低血量物伤×2",
            triggerType: "onAttack",
            desc: "单位对生命≤50%的敌方单位造成的物理伤害×2",
        },
        // ── 碎镜 ──
        {
            id: "pureSky", name: "碎镜", cost: 2, icon: "🌌", short: "减伤30%",
            triggerType: "active",
            desc: "单位可以主动使用减伤技能（仅限一次），使用后受到的伤害减少30%（永久）（向下取整）",
        },
        // ── 血魔指环 ──
        {
            id: "bloodRing", name: "血魔指环", cost: 2, icon: "💍", short: "伤害吸血",
            triggerType: "onAttack",
            desc: "单位每造成一次伤害，获得伤害一半数值的回血（四舍五入）",
        },
        // ── 霜痕 ──
        {
            id: "iceGrip", name: "霜痕", cost: 2, icon: "❄️", short: "冰冻+生命+1",
            triggerType: "permanent", buffsMaxLife: true,
            desc: "穿戴上后单位生命及生命上限+1，下一次攻击可冰冻命中的敌人一回合（冰冻效果与晕眩相同）",
            apply: (unit) => {
                const cardDef = CARD_LIBRARY.find(c => c.name === unit.cardName);
                const baseLife = cardDef ? cardDef.life : unit.life;
                unit.maxLife = baseLife + 1;
                unit.life = Math.min(unit.life + 1, unit.maxLife);
                unit.iceGripUsed = false;
            },
        },
        // ── 雷刃 ──
        {
            id: "lightningDagger", name: "雷刃", cost: 2, icon: "⚡", short: "每2次攻击闪电",
            triggerType: "onAttack",
            desc: "每攻击2次，对被攻击的敌方造成1点法伤，并对其周围九宫格内随机一个敌方造成1点法伤",
        },
        // ── 苍鹰之羽 ──
        {
            id: "eagleFeather", name: "苍鹰之羽", cost: 3, icon: "🪶", short: "攻速+1，首击必中",
            triggerType: "permanent",
            desc: "单位攻击次数+1，且每回合第一次普通攻击必中（无视手牌护盾及代为承受，但目标自身免疫/绝对免疫仍生效）",
            apply: (unit) => {
                unit.extraAttacks = (unit.extraAttacks || 0) + 1;
                unit.eagleFeatherFirstAttackUsed = false;
            },
        },
        // ── 甘泉 ──
        {
            id: "sweetSpring", name: "甘泉", cost: 3, icon: "💧", short: "生命×1.3，回合回复",
            triggerType: "permanent", buffsMaxLife: true,
            desc: "生命及生命上限变为原先的1.3倍（向上取整）；若上个敌方回合未受到伤害，则这个我方回合恢复15%生命上限的生命（向上取整）",
            apply: (unit) => {
                const baseMax = unit.maxLife || unit.life;
                unit.maxLife = Math.ceil(baseMax * 1.3);
                unit.life = Math.min(Math.ceil(unit.life * 1.3), unit.maxLife);
                unit.gqDamaged = false;
            },
            onTurnStart: (unit) => {
                if (!unit.noHeal && unit.cardName !== "麻木者" && !unit.gqDamaged) {
                    const heal = Math.ceil(unit.maxLife * 0.15);
                    unit.life = Math.min(unit.life + heal, unit.maxLife);
                    addLog(`💧 ${unit.cardName} 的甘泉恢复 ${heal} 点生命`);
                } else if (unit.noHeal || unit.cardName === "麻木者") {
                    addLog(`🩸 ${unit.cardName} 无法回血${unit.cardName === "麻木者" ? "（麻木者被动）" : "（禁疗状态）"}，甘泉无效`);
                }
                unit.gqDamaged = false;
            },
        },
        // ── 虚无之衣 ──
        {
            id: "voidCloak", name: "虚无之衣", cost: 3, icon: "🫥", short: "上限>4受伤-1",
            triggerType: "permanent",
            desc: "若单位的生命上限大于4，穿戴单位受到的物伤与法伤-1",
        },
        // ── 断脊 ──
        {
            id: "brokenSpine", name: "断脊", cost: 3, icon: "🦴", short: "普攻附加目标15%上限物伤",
            triggerType: "onAttack",
            desc: "每次普通攻击/强化普通攻击对敌方额外造成一次其生命上限15%的物伤（向上取整）",
        },
        // ── 凝血之刃 ──
        {
            id: "coagulationBlade", name: "凝血之刃", cost: 2, icon: "🩸", short: "物伤+1，禁疗",
            triggerType: "permanent",
            desc: "单位物伤+1；被该单位攻击的敌人永久无法回血（禁疗，拦截一切恢复生命）",
            apply: (unit) => {
                unit.dmgValue = (unit.dmgValue || 0) + 1;
            },
        },
    ];

    // ========== 获取装备定义 ==========
    function getEquipmentDef(eqId) {
        return EQUIPMENT_LIBRARY.find(e => e.id === eqId);
    }

    // ========== 检查单位是否已穿戴装备 ==========
    function hasEquipment(unit) {
        return !!(unit.equipmentId);
    }

    // ========== 获取单位装备定义 ==========
    function getUnitEquipment(unit) {
        if (!unit.equipmentId) return null;
        return getEquipmentDef(unit.equipmentId);
    }

    // ========== 购买装备（入口） ==========
    // 选中一件装备，进入"选择穿戴单位"状态
    function buyEquipment(side, eqId) {
        const eqDef = getEquipmentDef(eqId);
        if (!eqDef) { showToast(`装备不存在`); return false; }

        const player = gameState.players[side];
        if (player.mana < eqDef.cost) {
            showToast(`费用不足（需要${eqDef.cost}，当前${player.mana}）`);
            return false;
        }

        // 检查是否有可穿戴的己方单位（同化者不能装配增益生命的装备）
        const available = gameState.units.filter(u => u.side === side && u.life > 0 && !hasEquipment(u) && !(u.isAssimilator && eqDef.buffsMaxLife));
        if (available.length === 0) {
            showToast(`没有可穿戴装备的己方单位`);
            return false;
        }

        // 进入装备穿戴选择模式
        gameState.awaitingEquipmentTarget = true;
        gameState.equipmentBuyerSide = side;
        gameState.equipmentPendingId = eqId;
        addLog(`🛒 ${side === 0 ? '蓝方' : '红方'} 选择了装备 ${eqDef.name}，请点击要穿戴的己方单位`);
        renderUI();
        return true;
    }

    // ========== 确认穿戴装备 ==========
    function equipUnit(unit) {
        if (!gameState.awaitingEquipmentTarget) return false;
        const side = gameState.equipmentBuyerSide;
        const eqId = gameState.equipmentPendingId;
        const eqDef = getEquipmentDef(eqId);

        if (!eqDef) { clearEquipmentTarget(); return false; }
        if (unit.side !== side) { showToast(`只能选择己方单位`); return false; }
        if (hasEquipment(unit)) { showToast(`该单位已穿戴装备`); return false; }
        if (unit.isAssimilator && eqDef.buffsMaxLife) { showToast(`同化者不能装配影响生命的装备`); return false; }

        // 扣费
        gameState.players[side].mana -= eqDef.cost;

        // 穿戴装备
        unit.equipmentId = eqId;

        // 永久生效类：立即应用效果
        if (eqDef.triggerType === 'permanent' && eqDef.apply) {
            eqDef.apply(unit);
        }

        addLog(`⚒️ ${unit.cardName} 穿戴了 ${eqDef.name}`);
        showToast(`⚒️ ${unit.cardName} 装备 ${eqDef.name}`);

        clearEquipmentTarget();
        renderUI();
        return true;
    }

    // ========== 取消装备购买 ==========
    function clearEquipmentTarget() {
        gameState.awaitingEquipmentTarget = false;
        gameState.equipmentBuyerSide = null;
        gameState.equipmentPendingId = null;
        renderUI();
    }

    // ========== 获取可穿戴装备的单位列表（用于UI高亮） ==========
    function getEquipTargetableUnits(side) {
        const eqDef = getEquipmentDef(gameState.equipmentPendingId);
        return gameState.units.filter(u => u.side === side && u.life > 0 && !hasEquipment(u) && !(u.isAssimilator && eqDef && eqDef.buffsMaxLife));
    }

    // ========== 装备商店弹窗 ==========
    async function showEquipmentShop(side) {
        const available = gameState.equipmentShop[side] || [];
        if (available.length === 0) {
            showToast(`本局没有装备可用`);
            return;
        }

        // ── 远程联机：远程玩家（客机）通过远程弹窗完成购买流程 ──
        if (networkActive() && side === networkGuestSide()) {
            const eqOptions = available.map(eqId => {
                const eqDef = getEquipmentDef(eqId);
                return `${eqDef.icon} ${eqDef.name}（${eqDef.cost}费）：${eqDef.short || ''}`;
            });
            eqOptions.push('❌ 取消购买');
            const eqChoice = await networkRequestPrompt({ kind: 'select', options: eqOptions, title: `⚒️ 装备商店（当前${gameState.players[side].mana}费）：选择要购买的装备` });
            if (eqChoice === -1 || eqChoice === eqOptions.length - 1) return null;
            const eqId = available[eqChoice];
            const eqDef = getEquipmentDef(eqId);
            if (!eqDef) return null;
            if (gameState.players[side].mana < eqDef.cost) { showToast(`费用不足（需要${eqDef.cost}）`); return null; }
            const candidates = gameState.units.filter(u => u.side === side && u.life > 0 && !hasEquipment(u) && !(u.isAssimilator && eqDef.buffsMaxLife));
            if (candidates.length === 0) { showToast(`没有可穿戴装备的己方单位`); return null; }
            const unitOptions = candidates.map(u => `${u.cardName}（${ROW_NAMES[u.row]}${COLS[u.col]}，❤️${u.life}）`);
            unitOptions.push('❌ 取消购买');
            const uChoice = await networkRequestPrompt({ kind: 'select', options: unitOptions, title: `选择为哪个单位穿戴 ${eqDef.name}` });
            if (uChoice === -1 || uChoice === unitOptions.length - 1) return null;
            const target = candidates[uChoice];
            // 扣费 + 穿戴
            gameState.players[side].mana -= eqDef.cost;
            target.equipmentId = eqId;
            if (eqDef.triggerType === 'permanent' && eqDef.apply) eqDef.apply(target);
            if (eqDef.onEquip) eqDef.onEquip(target);
            addLog(`🛒 ${side === 0 ? '蓝方' : '红方'} 为 ${target.cardName} 购买了 ${eqDef.name}`);
            showToast(`🛒 ${target.cardName} 穿戴了 ${eqDef.name}`);
            renderUI();
            return null;
        }

        gameState.isModalOpen = true;
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'mode-select-overlay';
            overlay.style.zIndex = '10000';

            const panel = document.createElement('div');
            panel.className = 'mode-select-panel';
            panel.style.cssText = 'max-width:720px; padding:20px;';

            let escHandler = null;
            const closePanel = (result) => {
                if (escHandler) document.removeEventListener('keydown', escHandler);
                overlay.remove();
                gameState.isModalOpen = false;
                resolve(result);
            };

            const h2 = document.createElement('h2');
            h2.textContent = `⚒️ 装备商店`;
            panel.appendChild(h2);

            const manaP = document.createElement('p');
            manaP.textContent = `💰 当前费用：${gameState.players[side].mana}`;
            manaP.style.cssText = 'margin:0 0 10px 0; font-size:13px;';
            panel.appendChild(manaP);

            // 装备网格容器：每行2~3个
            const gridDiv = document.createElement('div');
            gridDiv.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; justify-content:center;';

            available.forEach(eqId => {
                const eqDef = getEquipmentDef(eqId);
                if (!eqDef) return;

                const canAfford = gameState.players[side].mana >= eqDef.cost;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.style.cssText = 'display:flex; align-items:center; gap:6px; width:330px; text-align:left; margin:0; padding:6px 8px; cursor:pointer; border:1px solid rgba(212,168,71,0.3); border-radius:6px; background:rgba(255,255,255,0.05); color:#f9eec1; font-size:13px;';

                if (!canAfford) {
                    btn.style.opacity = '0.4';
                    btn.style.cursor = 'not-allowed';
                }

                // 左侧：emoji + 名称 + 费用 + 简介（分行）
                const leftDiv = document.createElement('div');
                leftDiv.style.cssText = 'flex-shrink:0; min-width:80px; text-align:center;';

                const iconLine = document.createElement('div');
                iconLine.textContent = eqDef.icon;
                iconLine.style.cssText = 'font-size:20px;';
                leftDiv.appendChild(iconLine);

                const nameLine = document.createElement('div');
                nameLine.textContent = eqDef.name;
                nameLine.style.cssText = 'font-size:12px; font-weight:bold; margin-top:1px;';
                leftDiv.appendChild(nameLine);

                const costLine = document.createElement('div');
                costLine.innerHTML = `<span style="color:#f0c050;">💰${eqDef.cost}</span>`;
                costLine.style.cssText = 'font-size:11px; margin-top:1px;';
                leftDiv.appendChild(costLine);

                const shortLine = document.createElement('div');
                shortLine.textContent = eqDef.short || '';
                shortLine.style.cssText = 'font-size:10px; color:#c8b48a; margin-top:2px;';
                leftDiv.appendChild(shortLine);

                btn.appendChild(leftDiv);

                // 右侧：详细描述
                const rightDiv = document.createElement('div');
                rightDiv.style.cssText = 'flex:1; min-width:0; padding-left:8px; border-left:1px solid rgba(212,168,71,0.2);';

                const descLine = document.createElement('div');
                descLine.textContent = eqDef.desc;
                descLine.style.cssText = 'font-size:11px; color:#c8b48a; line-height:1.4;';
                rightDiv.appendChild(descLine);

                btn.appendChild(rightDiv);

                btn.onmouseenter = () => { if (canAfford) btn.style.background = 'rgba(212,168,71,0.15)'; };
                btn.onmouseleave = () => { btn.style.background = 'rgba(255,255,255,0.05)'; };

                btn.onclick = () => {
                    if (!canAfford) { showToast(`费用不足（需要${eqDef.cost}）`); return; }
                    closePanel(eqId);
                };

                gridDiv.appendChild(btn);
            });
            panel.appendChild(gridDiv);

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'mode-btn';
            cancelBtn.textContent = '取消 (ESC)';
            cancelBtn.style.cssText = 'margin-top:8px; padding:8px 14px; cursor:pointer; font-size:13px;';
            cancelBtn.onclick = () => {
                closePanel(null);
            };
            panel.appendChild(cancelBtn);

            // ESC 快捷键关闭（统一走 closePanel，关闭时移除监听，避免累积泄漏）
            escHandler = (e) => {
                if (e.key === 'Escape') {
                    closePanel(null);
                }
            };
            document.addEventListener('keydown', escHandler);

            overlay.appendChild(panel);
            document.body.appendChild(overlay);
        });
    }

    // ========== 装备商店入口（玩家点击按钮） ==========
    async function openEquipmentShop() {
        if (aiActing) { showToast('🤖 AI 正在行动，请稍候'); return; }
        // 新手教程：仅当前步骤允许打开装备商店时才放行
        if (typeof tutorialAllowAction === 'function' && !tutorialAllowAction('shop')) { tutorialBlock('装备商店'); return; }
        const side = gameState.turn;

        const eqId = await showEquipmentShop(side);
        if (eqId === null) return; // 玩家取消

        buyEquipment(side, eqId);
    }

    // ========== 单位死亡时移除装备 ==========
    function onUnitDeathEquipmentCleanup(unit) {
        if (unit.equipmentId) {
            const eqDef = getEquipmentDef(unit.equipmentId);
            if (eqDef && eqDef.onRemove) {
                eqDef.onRemove(unit);
            }
            unit.equipmentId = null;
        }
    }

    // ========== 战前装备选择 ==========
    // 玩家从装备池中选择3~5种装备加入本局商店
    const EQUIPMENT_SELECT_MIN = 3;
    const EQUIPMENT_SELECT_MAX = 5;

    async function showEquipmentSelect(playerLabel, side) {
        if (EQUIPMENT_LIBRARY.length === 0) {
            // 装备池为空，直接返回空数组
            return [];
        }

        gameState.isModalOpen = true;
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'mode-select-overlay';
            overlay.style.zIndex = '10000';

            const panel = document.createElement('div');
            panel.className = 'mode-select-panel';
            panel.style.maxWidth = '600px';

            const h2 = document.createElement('h2');
            h2.textContent = `⚒️ ${playerLabel} 选择装备`;
            panel.appendChild(h2);

            const p = document.createElement('p');
            p.textContent = `从装备池中选择 ${EQUIPMENT_SELECT_MIN}~${EQUIPMENT_SELECT_MAX} 种装备加入本局商店`;
            panel.appendChild(p);

            const selected = new Set();

            EQUIPMENT_LIBRARY.forEach(eqDef => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mode-btn';
                btn.style.cssText = 'text-align:left; margin:6px 0; padding:10px 14px; cursor:pointer; transition: background 0.2s;';

                const main = document.createElement('div');
                main.innerHTML = `${eqDef.icon} ${eqDef.name} <span style="color:#fbbf24;">💰${eqDef.cost}</span>`;
                btn.appendChild(main);

                const desc = document.createElement('small');
                desc.style.cssText = 'display:block; color:#aaa; margin-top:4px;';
                desc.textContent = eqDef.desc;
                btn.appendChild(desc);

                btn.onclick = () => {
                    if (selected.has(eqDef.id)) {
                        selected.delete(eqDef.id);
                        btn.style.background = '';
                    } else {
                        if (selected.size >= EQUIPMENT_SELECT_MAX) {
                            showToast(`最多选择${EQUIPMENT_SELECT_MAX}种装备`);
                            return;
                        }
                        selected.add(eqDef.id);
                        btn.style.background = 'rgba(74, 222, 128, 0.3)';
                    }
                    updateConfirm();
                };

                panel.appendChild(btn);
            });

            // 确认按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'mode-btn';
            confirmBtn.textContent = `确认（${selected.size}/${EQUIPMENT_SELECT_MAX}）`;
            confirmBtn.style.cssText = 'margin-top:10px; cursor:pointer;';
            const updateConfirm = () => {
                confirmBtn.textContent = `确认（${selected.size}/${EQUIPMENT_SELECT_MAX}）`;
                confirmBtn.disabled = selected.size < EQUIPMENT_SELECT_MIN;
                confirmBtn.style.opacity = selected.size < EQUIPMENT_SELECT_MIN ? '0.5' : '1';
            };
            confirmBtn.onclick = () => {
                if (selected.size < EQUIPMENT_SELECT_MIN) {
                    showToast(`至少选择${EQUIPMENT_SELECT_MIN}种装备`);
                    return;
                }
                overlay.remove();
                gameState.isModalOpen = false;
                resolve([...selected]);
            };

            panel.appendChild(confirmBtn);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
            updateConfirm();
        });
    }

    // ========== 获取装备简短显示名（用于UI） ==========
    function getEquipmentDisplay(unit) {
        const eqDef = getUnitEquipment(unit);
        if (!eqDef) return null;
        return { icon: eqDef.icon, name: eqDef.name, desc: eqDef.desc };
    }

    // ========== 碎镜主动激活 ==========
    function canActivatePureSky(unit) {
        return unit.equipmentId === 'pureSky' && !unit.pureSkyUsed && unit.life > 0;
    }
    function activatePureSky(unit) {
        if (!canActivatePureSky(unit)) return;
        unit.pureSkyUsed = true;
        unit.pureSkyDamageReduction = true;
        addLog(`🌌 ${unit.cardName} 激活了碎镜，受到伤害永久减少30%`);
        showToast(`🌌 ${unit.cardName} 碎镜激活！`);
        renderUI();
    }

    // ========== 获取装备可用的主动技能（用于UI按钮渲染） ==========
    function getEquipmentActiveActions(unit) {
        const actions = [];
        if (canActivatePureSky(unit)) {
            actions.push({ id: 'pureSky', label: '🌌减伤', desc: '碎镜：受到伤害减少30%（永久）' });
        }
        return actions;
    }

    // ========== 装备系统：初始化单位装备字段 ==========
    function initUnitEquipmentFields(unit) {
        unit.magicShieldValue = 0;
        unit.pureSkyUsed = false;
        unit.pureSkyDamageReduction = false;
        unit.amuletUsed = false;
        unit.reviveUsed = false;
        unit.pendingRevive = false;
        unit.iceGripUsed = false;
    }

    // ========== 装备系统：复活甲复活 ==========
    function revivePendingUnits(side) {
        for (let u of gameState.units) {
            if (u.side === side && u.pendingRevive) {
                const cardDef = CARD_LIBRARY.find(c => c.name === u.cardName);
                if (cardDef) {
                    u.life = cardDef.life;
                    u.maxLife = cardDef.life;
                    u.dmgValue = cardDef.dmgValue;
                    u.dmgType = cardDef.dmgType;
                    u.speed = cardDef.speed;
                    u.range = cardDef.range;
                    u.extraAttacks = cardDef.extraAttacks || 0;
                }
                u.pendingRevive = false;
                u.stun = 0;
                u.silenced = 0;
                u.eagleEyeTurns = 0;
                u.weakenedTurns = 0;
                u._killRewardDone = false;  // 击杀奖励防重入标记：复活后重置（复活甲拦截时已置位）
                u.bountyLevel = 0;          // 复活重置悬赏等级（避免反复兑现赏金）
                if (gameState.killStreakMap) delete gameState.killStreakMap[u.id];  // 复活重置连杀计数
                u.shieldValue = 0;
                u.nativeShieldValue = 0;
                u.externalShieldSources = {};
                // 枷锁猎手：复活重新触发「出场自带2点护盾」
                if (u.cardName === "枷锁猎手") {
                    u.shieldValue = 2;
                    u.nativeShieldValue = 2;
                    addLog(`🔒 ${u.cardName} 复活重新获得 2 点自带护盾！`);
                }
                // 机车党：清除蓄力状态
                u.motCharging = false;
                u.motChargeTurns = 0;
                u.motReleaseTurn = false;
                u.magicShieldValue = 0;
                u.invincibleTurns = 0;
                u.absoluteImmunityTurns = 0;
                u.pendingDeath = false;
                // 恢复初始状态：重置技能/一次性/次数类标记，避免复活后仍保留已使用状态
                u.skillCooldown = 0;
                u.skillUsedThisTurn = false;
                u.moved = false;
                u.firstAttackBonus = (u.cardName === "士兵");
                u.bonusUsed = false;
                u.nextAttackDouble = false;
                u.tempAttackBonus = 0;
                u.nextAttackBonus = 0;
                u.isCharging = false;
                u.chargeTargetId = null;
                u.chargeIsBase = false;
                u.chargeBaseSide = null;
                u.superCharging = false;
                u.superChargeTurnsLeft = 0;
                u.superChargeTargetId = null;
                u.superChargeIsBase = false;
                u.superChargeBaseSide = null;
                u.knightSkillUsed = false;
                u.halberdierSkillUsed = false;
                u.halberdierCharging = false;
                u.nerdJamUsed = false;
                u.nerdJamActive = false;
                u.transformUsed = false;
                u.isSweepCharging = false;
                u.hornRecoveryTurns = 0;
                u.hornPendingHeal = 0;
                u.weakenedEnemies = [];
                u.eagleEyeTargets = [];
                u.windSkillUsed = false;
                u.cupidUseCount = 0;
                u.shaLinBindTurn = 0;
                u.shaLinBindRow = -1;
                u.shaLinBindCol = -1;
                u.shaLinUseCount = 0;
                u.zhongyiHealUsed = false;
                u.scapegoatUsed = false;
                u.scapegoatProtectorId = null;
                u.feijiBonusGiven = 0;
                u.feizheBonusGiven = 0;
                u.flagBearerProtectTurn = 0;
                u.witchProtectReduce = 0;
                u.witchProtectorId = null;
                u.plagueInfected = false;
                u.plagueOwnerSide = null;
                u.bartenderUseCount = 0;
                u.drunkardInvincibleUsed = false;
                u.spearmanCharges = 0;
                u.braceActive = false;
                u.braceShield = 0;
                u.counterBonus = 0;
                u.counterUseCount = 0;
                u.fireGodBuffTurns = 0;
                u.fireGodSkillUsed = false;
                u.fanCooldown = 0;
                u.kickCooldown = 0;
                u.mirrorId = null;
                u.mirrorSkillUsed = false;
                u.mirrorSwappedThisTurn = false;
                u.hephaestusUseCount = 0;
                u.riluoPlaced = false;
                u.riluoRow = -1;
                u.riluoCol = -1;
                u.riluoReleaseCount = 3;
                // 清除装备及其残留状态，恢复初始状态（复活甲已消耗，允许后续再次穿戴新装备）
                u.equipmentId = null;
                u.reviveUsed = false;
                u.pureSkyUsed = false;
                u.pureSkyDamageReduction = false;
                u.amuletUsed = false;
                u.noHeal = false;
                u.gqDamaged = false;
                u.iceGripUsed = false;
                // 爱神共生死绑定：双向清除，避免残留指向
                if (u.cupidPair) {
                    const partner = gameState.units.find(x => x.id === u.cupidPair.partnerId);
                    if (partner && partner.cupidPair && partner.cupidPair.partnerId === u.id) {
                        partner.cupidPair = null;
                    }
                    u.cupidPair = null;
                }
                addLog(`💀 ${u.cardName} 的复活甲激活，满血复活！`);
                showToast(`💀 ${u.cardName} 复活！`);
            }
        }
    }

    // ========== 装备系统：回合开始装备效果 ==========
    function onTurnStartEquipment(side) {
        for (let u of gameState.units) {
            if (u.side === side && u.life > 0) {
                const eqDef = getUnitEquipment(u);
                if (eqDef && eqDef.onTurnStart) {
                    eqDef.onTurnStart(u);
                }
            }
        }
    }

    // ========== AI 自动选择装备（战前） ==========
    function aiAutoSelectEquipments() {
        if (EQUIPMENT_LIBRARY.length === 0) return [];
        const pool = [...EQUIPMENT_LIBRARY];
        // 随机选3种
        const count = Math.min(3, pool.length);
        const result = [];
        for (let i = 0; i < count; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            result.push(pool[idx].id);
            pool.splice(idx, 1);
        }
        return result;
    }

    // ========== AI 装备价值评估（按装备效果强度打分） ==========
    function aiEquipmentValue(eqDef) {
        const v = {
            reviveArmor: 95,        // 满血复活，最高价值
            starWand: 70,           // 法伤×1.5
            demonBlade: 65,         // 低血物伤×2
            coagulationBlade: 68,   // 物伤+1+禁疗（2费高性价比）
            amulet: 55,             // 免疫一次致死
            brokenSpine: 58,        // 普攻额外15%
            lightningDagger: 52,    // 每2攻闪电
            eagleFeather: 62,       // 攻速+1+必中
            iceGrip: 50,            // +生命+冰冻
            bloodRing: 48,          // 吸血
            voidCloak: 56,          // 受伤-1
            pureSky: 54,            // 减伤30%
            sweetSpring: 46,        // 生命×1.3+回合回血
            witchCloak: 40,         // 每回合法盾
        };
        return v[eqDef.id] ?? 50;
    }

    // ========== AI 选择装备穿戴单位（按装备类型匹配） ==========
    function aiPickEquipmentUnit(eqDef, candidates, side) {
        // 物伤类装备：给物伤高攻单位
        if (["demonBlade", "coagulationBlade", "brokenSpine", "lightningDagger", "eagleFeather", "iceGrip"].includes(eqDef.id)) {
            const phys = candidates.filter(u => u.dmgType === '⚔️' && u.dmgValue >= 2);
            if (phys.length > 0) {
                phys.sort((a, b) => b.dmgValue - a.dmgValue);
                return phys[0];
            }
        }
        // 法伤类装备：给法伤单位
        if (eqDef.id === 'starWand') {
            const mag = candidates.filter(u => u.dmgType === '🔮');
            if (mag.length > 0) {
                mag.sort((a, b) => b.dmgValue - a.dmgValue);
                return mag[0];
            }
        }
        // 复活甲：给关键单位（高价值辅助或高攻）
        if (eqDef.id === 'reviveArmor') {
            const keyNames = ["费机", "武器商", "国王", "参谋", "机车党", "重斧兵", "骑士", "枷锁猎手"];
            const key = candidates.filter(u => keyNames.includes(u.cardName));
            if (key.length > 0) {
                key.sort((a, b) => b.dmgValue - a.dmgValue || b.life - a.life);
                return key[0];
            }
        }
        // 默认：生命最高的（存活最久，收益最大）
        candidates.sort((a, b) => b.life - a.life);
        return candidates[0];
    }

    // ========== AI 局内购买装备 ==========
    // AI 在出牌阶段后、使用单位阶段前调用
    async function aiUseEquipment(myGameId) {
        const side = aiSide;
        if (side < 0) return;
        const cfg = aiCfg();
        const buyRate = side === aiSide ? (aiDifficulty === 'easy' ? 0.15 : aiDifficulty === 'normal' ? 0.40 : aiDifficulty === 'hard' ? 0.70 : 1.0) : 0;
        if (Math.random() > buyRate) return;

        const shop = gameState.equipmentShop[side] || [];
        if (shop.length === 0) return;

        // 费用检查：至少有4费才考虑买装备（保留出单位费用）
        const minMana = 4;
        if (gameState.players[side].mana < minMana) return;

        // 查找可穿戴装备的单位
        const available = gameState.units.filter(u => u.side === side && u.life > 0 && !hasEquipment(u));
        if (available.length === 0) return;

        // 从商店中选择AI能买得起的装备
        const affordable = shop.filter(eqId => {
            const eqDef = getEquipmentDef(eqId);
            return eqDef && gameState.players[side].mana >= eqDef.cost;
        });
        if (affordable.length === 0) return;

        // 简单策略：选价值最高的装备，保留剩余费用出单位
        // easy难度随机选，normal/hard按价值评估选择
        let chosenEqId;
        if (aiDifficulty === 'easy') {
            chosenEqId = affordable[Math.floor(Math.random() * affordable.length)];
        } else {
            affordable.sort((a, b) => {
                const va = aiEquipmentValue(getEquipmentDef(a));
                const vb = aiEquipmentValue(getEquipmentDef(b));
                // 价值相近时优先便宜的（保留费用出单位）
                if (Math.abs(va - vb) <= 8) return getEquipmentDef(a).cost - getEquipmentDef(b).cost;
                return vb - va;
            });
            chosenEqId = affordable[0];
        }

        const eqDef = getEquipmentDef(chosenEqId);
        if (!eqDef) return;

        // 同化者不能装配增益生命的装备
        const candidates = eqDef.buffsMaxLife ? available.filter(u => !u.isAssimilator) : available;
        if (candidates.length === 0) return;

        // 选择最合适的单位穿戴（按装备类型匹配）
        let bestUnit;
        if (aiDifficulty === 'easy') {
            bestUnit = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
            bestUnit = aiPickEquipmentUnit(eqDef, candidates, side);
        }

        if (!bestUnit) return;

        // 扣费 + 穿戴
        gameState.players[side].mana -= eqDef.cost;
        bestUnit.equipmentId = chosenEqId;

        // 永久生效类：立即应用
        if (eqDef.triggerType === 'permanent' && eqDef.apply) {
            eqDef.apply(bestUnit);
        }

        addLog(`🤖 🛒 ${side === 0 ? '蓝方' : '红方'} AI 为 ${bestUnit.cardName} 购买了 ${eqDef.name}`);
        showToast(`🤖 AI 装备 ${eqDef.name}`);
        renderUI();
        await aiSleep(300);
    }

    // ========== AI 自动激活装备主动技能（碎镜等） ==========
    function aiActivateEquipmentSkills(side) {
        for (let u of gameState.units) {
            if (u.side === side && u.life > 0 && canActivatePureSky(u)) {
                activatePureSky(u);
            }
        }
    }
