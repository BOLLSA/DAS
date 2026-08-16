// ========== UI 渲染器 ==========
// renderUI + 手牌渲染 + 事件绑定

    // 单位点击统一入口（棋盘单位点击 / 远程联机指令重放共用）
    async function handleUnitClick(unit) {
        if (aiActing) { return; }
        // 远程联机：非自己回合只读；客机回合转发给主机执行
        if (networkForward({ type: 'unitClick', id: unit.id, unitId: gameState.selectedUnitId })) return;
        if (unit.isMirror) { showToast(`镜像无法被选中`); return; }
        // ── 装备穿戴选择模式 ──
        if (gameState.awaitingEquipmentTarget) {
            if (unit.side === gameState.equipmentBuyerSide && !hasEquipment(unit) && unit.life > 0) {
                equipUnit(unit);
            } else if (unit.side !== gameState.equipmentBuyerSide) {
                showToast(`只能选择己方单位`);
            } else if (hasEquipment(unit)) {
                showToast(`该单位已穿戴装备`);
            }
            return;
        }
        if (gameState.awaitingSkillTarget && gameState.skillType === "plagueCell") {
            await handleCellClick(unit.row, unit.col);
            return;
        }
        if (gameState.awaitingSkillTarget) {
            const caster = gameState.units.find(u => u.id === gameState.skillCasterId);
            if (caster) {
                dispatchSkillTarget(caster, unit.row, unit.col, unit);
            }
            return;
        }
        if (unit.side === gameState.turn) {
            // 如果该单位已被选中，且同格有敌方单位，则攻击该敌方单位
            if (gameState.selectedUnitId === unit.id) {
                if (unit.cardName === "镜中人") { showToast(`镜中人请使用攻击按钮`); return; }
                const enemiesOnSameCell = getUnitsAt(unit.row, unit.col).filter(u => u.side !== unit.side && u.life > 0);
                if (enemiesOnSameCell.length > 0) {
                    const target = enemiesOnSameCell[0];
                    if (gameState.nerdJamPending[unit.side]) {
                        gameState.nerdJamPending[unit.side] = false;
                        addLog(`👓 行动干扰生效！${unit.cardName} 的攻击被无效化！`);
                        showToast(`👓 行动干扰！${unit.cardName} 的攻击被无效化`);
                        gameState.selectedUnitId = null;
                        renderUI();
                    } else {
                        await performAttack(unit, target);
                        recheckAllWeaponSmithBuffs();
                        gameState.selectedUnitId = null;
                        renderUI();
                    }
                    return;
                }
            }
            gameState.selectedUnitId = unit.id;
            showToast(`📌 已选中: ${unit.cardName}`);
            renderUI();
        } else {
            if (gameState.selectedUnitId !== null) {
                const attacker = gameState.units.find(u => u.id === gameState.selectedUnitId);
                if (attacker && attacker.side === gameState.turn) {
                    if (attacker.cardName === "镜中人") { showToast(`镜中人请使用攻击按钮`); return; }
                    // 四眼仔行动干扰：消耗本方第一次控制单位的攻击
                    if (gameState.nerdJamPending[attacker.side]) {
                        gameState.nerdJamPending[attacker.side] = false;
                        addLog(`👓 行动干扰生效！${attacker.cardName} 的攻击被无效化！`);
                        showToast(`👓 行动干扰！${attacker.cardName} 的攻击被无效化`);
                        gameState.selectedUnitId = null;
                        renderUI();
                    } else {
                        await performAttack(attacker, unit);
                        recheckAllWeaponSmithBuffs();
                        gameState.selectedUnitId = null;
                        renderUI();
                    }
                } else { addLog(`选中的单位无效`); gameState.selectedUnitId = null; renderUI(); }
            } else { showToast(`请先选中己方单位再攻击`); }
        }
    }

    function renderUI(fullRender = true) {
        try {
        _renderUICount++;
        // 清理旧的技能按钮，防止残留
        ['confirmDeclarativeBtn','cancelSkillBtn','skipGlideBtn','mirrorAtkBtn','mirrorSwapBtn','cancelMirrorAtkBtn','riluoReturnBtn','equipActiveBtn-pureSky'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.remove();
        });

        if (fullRender) {
        const grid = document.getElementById('gameGrid');
        grid.innerHTML = '';
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 3; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                const coordSpan = document.createElement('div');
                coordSpan.className = 'coord';
                coordSpan.innerText = `${ROW_NAMES[r].slice(0,2)}-${COLS[c]}`;
                cell.appendChild(coordSpan);
                // 双剑横扫高亮格子（声明式 confirm 模式）
                if (gameState.awaitingSkillTarget && gameState.dualswordAOEHighlight) {
                    const isHighlighted = gameState.dualswordAOEHighlight.some(h => h.row === r && h.col === c);
                    if (isHighlighted) cell.style.background = 'rgba(255, 200, 0, 0.35)';
                }
                if (gameState.awaitingSkillTarget && gameState.skillType === "plagueCell") {
                    cell.style.background = 'rgba(80, 180, 80, 0.25)';
                }
                // 旋风踢落点高亮：原地 + 距离2的格子
                if (gameState.awaitingSkillTarget && gameState.declarativeSelectMode === "grid" && gameState.declarativeGridFilter === "distance2") {
                    const gridCaster = gameState.units.find(u => u.id === gameState.skillCasterId);
                    if (gridCaster) {
                        const gDist = Math.abs(r - gridCaster.row) + Math.abs(c - gridCaster.col);
                        if (gDist === 0 || gDist === 2) cell.style.background = 'rgba(150, 140, 255, 0.28)';
                    }
                }
                // 赫菲斯托斯方块显示
                if ((gameState.hephaestusBlocks || []).some(b => b.row === r && b.col === c)) {
                    cell.style.background = 'rgba(150, 120, 80, 0.55)';
                    cell.style.boxShadow = 'inset 0 0 0 2px rgba(120, 90, 50, 0.8)';
                }
                // 绫罗标记显示
                if (gameState.units.some(u => u.cardName === "绫罗" && u.riluoPlaced && u.riluoRow === r && u.riluoCol === c)) {
                    cell.style.background = 'rgba(240, 130, 160, 0.4)';
                    cell.style.boxShadow = 'inset 0 0 0 2px rgba(200, 80, 120, 0.8)';
                }
                // 镜中人攻击选格高亮
                if (gameState.awaitingMirrorAttack) {
                    const atkUnit = gameState.units.find(u => u.id === gameState.mirrorAttackUnitId);
                    if (atkUnit) {
                        const adist = Math.abs(r - atkUnit.row) + Math.abs(c - atkUnit.col);
                        if (adist <= 1) cell.style.background = 'rgba(255, 180, 80, 0.35)';
                    }
                }
                // 选中己方单位时计算可攻击的敌方单位（用于高亮）
                let attackableUnitIds = [];
                if (gameState.selectedUnitId !== null && !gameState.awaitingSkillTarget && gameState.selectedCardIdx === -1) {
                    const selUnit = gameState.units.find(u => u.id === gameState.selectedUnitId);
                    if (selUnit && selUnit.side === gameState.turn && !selUnit.isCharging && !selUnit.superCharging && !selUnit.isSweepCharging && selUnit.stun <= 0 && selUnit.attacksLeftThisTurn > 0) {
                        const forward = getForwardDelta(selUnit.side);
                        const isWideAttacker = selUnit.cardName === "双刀" || selUnit.cardName === "三刀";
                        for (let enemy of gameState.units) {
                            if (enemy.side === selUnit.side || enemy.life <= 0) continue;
                            const distance = (enemy.row - selUnit.row) * forward;
                            if (distance < 0 || distance > selUnit.range) continue;
                            if (isWideAttacker) {
                                const frontRow = selUnit.row + forward;
                                if (enemy.row !== frontRow) continue;
                            } else {
                                if (enemy.col !== selUnit.col) continue;
                            }
                            // 近战拦截检查：不能跳过更近的敌方单位（掠影除外）
                            if (selUnit.cardName !== "掠影") {
                                const isSameCell = enemy.row === selUnit.row && enemy.col === selUnit.col;
                                if (!isSameCell) {
                                    let nearestRow = selUnit.row + forward;
                                    let blocked = false;
                                    for (let rr = nearestRow; rr !== enemy.row; rr += forward) {
                                        if (gameState.units.some(u => u.col === selUnit.col && u.row === rr && u.side !== selUnit.side)) { blocked = true; break; }
                                    }
                                    if (blocked) continue;
                                }
                            }
                            attackableUnitIds.push(enemy.id);
                        }
                    }
                }
                const unitsHere = getUnitsAt(r, c);
                if (unitsHere.length > 0) {
                    unitsHere.forEach(unit => {
                        const unitDiv = document.createElement('div');
                        unitDiv.className = 'unit';
                        if (unit.isMirror) { unitDiv.classList.add('mirror-unit'); unitDiv.style.opacity = '0.7'; unitDiv.style.borderStyle = 'dashed'; }
                        if (unit.stun > 0) unitDiv.classList.add('stunned');
                        unitDiv.setAttribute('data-side', unit.side);
                        if (gameState.selectedUnitId === unit.id) unitDiv.classList.add('selected-unit');
                        // 技能选中高亮（声明式多选模式）
                        if (gameState.declarativeSelected && gameState.declarativeSelected.includes(unit.id)) unitDiv.style.boxShadow = '0 0 0 2px #ff9800';
                        let isTargetable = false;
                        if (gameState.awaitingSkillTarget) {
                            const caster = gameState.units.find(u => u.id === gameState.skillCasterId);
                            if (caster) {
                                const targetableUnits = getSkillTargetableUnits(caster);
                                if (targetableUnits.some(u => u.id === unit.id)) isTargetable = true;
                            }
                        }
                        if (isTargetable) unitDiv.classList.add('targetable');
                        // 装备穿戴目标高亮
                        if (gameState.awaitingEquipmentTarget) {
                            const eqDef = getEquipmentDef(gameState.equipmentPendingId);
                            if (unit.side === gameState.equipmentBuyerSide && !hasEquipment(unit) && unit.life > 0 && !(unit.isAssimilator && eqDef && eqDef.buffsMaxLife)) {
                                unitDiv.classList.add('targetable');
                            }
                        }
                        // 选中己方单位时高亮可攻击的敌方单位
                        if (attackableUnitIds.includes(unit.id)) unitDiv.classList.add('attackable-enemy');
                        unitDiv.style.setProperty('--unit-bg', unit.side === 0 ? 'linear-gradient(160deg, #3a7dad 0%, #2a5d8a 50%, #1a4568 100%)' : 'linear-gradient(160deg, #a85040 0%, #8b3c2c 50%, #6a2818 100%)');
                        // 蓄力状态光晕
                        if (unit.isCharging) unitDiv.classList.add('charging-normal');
                        if (unit.superCharging) unitDiv.classList.add('charging-super');
                        if (unit.isSweepCharging) unitDiv.classList.add('charging-sweep');
                        // 计算血条比例
                        const maxLife = unit.maxLife || (CARD_LIBRARY.find(c => c.name === unit.cardName)?.life || unit.life);
                        const hpPct = Math.max(0, Math.min(100, (unit.life / maxLife) * 100));
                        const hpColor = hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#fbbf24' : '#ef4444';
                        // 状态图标（规范化，单字符+数字）
                        let statusIcons = '';
                        if (unit.stun > 0) statusIcons += `<span class="si stun" title="眩晕${unit.stun}回合">💫${unit.stun}</span>`;
                        if (unit.silenced > 0) statusIcons += `<span class="si silence" title="沉默${unit.silenced}回合">🔇${unit.silenced}</span>`;
                        if (unit.eagleEyeTurns > 0) statusIcons += `<span class="si blind" title="致盲${unit.eagleEyeTurns}回合">👁️${unit.eagleEyeTurns}</span>`;
                        if (unit.shaLinBindTurn > 0) statusIcons += `<span class="si bind" title="定身${unit.shaLinBindTurn}回合">🔗${unit.shaLinBindTurn}</span>`;
                        if (unit.invincibleTurns > 0) statusIcons += `<span class="si invincible" title="无敌${unit.invincibleTurns}回合">🛡️${unit.invincibleTurns}</span>`;
                        if (unit.absoluteImmunityTurns > 0) statusIcons += `<span class="si absolute" title="绝对免疫${unit.absoluteImmunityTurns}回合">✨${unit.absoluteImmunityTurns}</span>`;
                        if (unit.flagBearerProtectTurn > 0) statusIcons += `<span class="si flag" title="旗手庇护${unit.flagBearerProtectTurn}回合">🚩${unit.flagBearerProtectTurn}</span>`;
                        if (unit.witchProtectReduce > 0) statusIcons += `<span class="si witch" title="魔女庇护法伤-${unit.witchProtectReduce}">🔮-${unit.witchProtectReduce}</span>`;
                        if (unit.hornRecoveryTurns > 0) statusIcons += `<span class="si horn" title="号角庇护${unit.hornRecoveryTurns}回合">📯${unit.hornRecoveryTurns}</span>`;
                        if (unit.plagueInfected) statusIcons += `<span class="si plague" title="鼠疫感染">☣️</span>`;
                        if (unit.transformUsed) statusIcons += `<span class="si transform" title="已变形">🔄</span>`;
                        if (unit.displacedByAllySkillThisTurn) statusIcons += `<span class="si nomove" title="本回合被位移，不可移动">🚫</span>`;
                        if (unit.knightSkillUsed) statusIcons += `<span class="si used" title="秒杀已用">🗡️</span>`;
                        if (unit.nextAttackDouble) statusIcons += `<span class="si boost" title="下次攻击翻倍">🍷</span>`;
                        if (unit.weaponSmithBoosted) statusIcons += `<span class="si smith" title="武器商加持攻速x2">⚙️</span>`;
                        if ((unit.spearmanCharges || 0) > 0) statusIcons += `<span class="si spearman" title="强化普攻${unit.spearmanCharges}次">🔱${unit.spearmanCharges}</span>`;
                        if (unit.braceActive) statusIcons += `<span class="si" title="蓄势反击中">💢</span>`;
                        if ((unit.counterBonus || 0) > 0) statusIcons += `<span class="si" title="反击增伤+${unit.counterBonus}">🔺${unit.counterBonus}</span>`;
                        if ((unit.fireGodBuffTurns || 0) > 0) statusIcons += `<span class="si" title="火神强化中（范围+1，攻击AOE）">🔥</span>`;
                        if (unit.tempAttackBonus > 0) statusIcons += `<span class="si buff" title="鼓舞+${unit.tempAttackBonus}">🎵+${unit.tempAttackBonus}</span>`;
                        if (unit.nextAttackBonus > 0) statusIcons += `<span class="si buff2" title="祭献+${unit.nextAttackBonus}">💪+${unit.nextAttackBonus}</span>`;
                        if (unit.cardName === "士兵" && unit.firstAttackBonus && !unit.bonusUsed) statusIcons += `<span class="si first" title="首击加成">✨</span>`;
                        // 装备显示
                        const eqDisplay = getEquipmentDisplay(unit);
                        if (eqDisplay) statusIcons += `<span class="si equipment" title="${eqDisplay.name}: ${eqDisplay.desc}">${eqDisplay.icon}</span>`;
                        if (unit.pendingRevive) statusIcons += `<span class="si revive" title="复活甲待机：下个我方回合复活">💀⏳</span>`;
                        if ((unit.magicShieldValue || 0) > 0) statusIcons += `<span class="si magicshield" title="法术护盾${unit.magicShieldValue}">🔮🛡${unit.magicShieldValue}</span>`;
                        // 护盾显示（含蓄势护盾）
                        const totalShield = (unit.shieldValue || 0) + (unit.braceShield || 0);
                        const shieldDisplay = totalShield > 0 ? `<span class="unit-shield">🛡️${totalShield}</span>` : '';
                        // 移动/攻击状态
                        const moveIcon = unit.displacedByAllySkillThisTurn ? '🚫' : (unit.moved ? '✓' : '⬆️');
                        const atkCount = unit.attacksLeftThisTurn;
                        const atkIcon = atkCount <= 0 ? '<span class="act-done">⚔</span>' : (atkCount > 1 ? `<span class="act-ok">⚔×${atkCount}</span>` : '<span class="act-ok">⚔</span>');
                        // 蓄力标记
                        let chargeTag = '';
                        if (unit.isCharging) chargeTag = '<span class="charge-tag charge-normal">蓄力</span>';
                        if (unit.superCharging) chargeTag = `<span class="charge-tag charge-super">超蓄${unit.superChargeTurnsLeft}</span>`;
                        if (unit.isSweepCharging) chargeTag = '<span class="charge-tag charge-sweep">横扫</span>';
                        if (unit.motCharging) chargeTag = `<span class="charge-tag charge-sweep">🏍️蓄力${unit.motChargeTurns || 1}/3</span>`;
                        if (unit.braceActive) chargeTag = '<span class="charge-tag charge-sweep">蓄势</span>';
                        if (unit.isMirror) chargeTag = '<span class="charge-tag charge-sweep">镜像</span>';
                        if (unit.isAssimilator) chargeTag = '<span class="charge-tag charge-sweep">同化</span>';
                        // 悬赏标记（3/5/7/9连杀进入悬赏，被移除时对方获得赏金）
                        const bountyTag = (unit.bountyLevel || 0) > 0 ? `<span class="bounty-tag" title="${unit.bountyLevel}级悬赏：被移除时对方获得${unit.bountyLevel}费">💰x${unit.bountyLevel}</span>` : '';
                        // 移动次数
                        const moveCount = (unit.cardName === "骑士" || unit.movesLeftThisTurn > 1) && unit.movesLeftThisTurn > 0 ? `<span class="move-count">${parseFloat(unit.movesLeftThisTurn.toFixed(2))}</span>` : '';
                        unitDiv.innerHTML = `<div class="unit-top"><span class="unit-name">${unit.cardName}</span>${chargeTag}${bountyTag}</div><div class="hp-bar"><div class="hp-fill" style="width:${hpPct}%;background:${hpColor};"></div><span class="hp-text">❤${unit.life}</span></div>${shieldDisplay}<div class="unit-mid"><span class="dmg-stat">${unit.dmgType}${unit.dmgValue}</span><span class="range-stat">📏${unit.range}</span></div><div class="unit-bot"><span class="act-move">${moveIcon}</span>${moveCount}${atkIcon}</div>${statusIcons ? `<div class="status-bar">${statusIcons}</div>` : ''}`;
                        unitDiv.onclick = (e) => { e.stopPropagation(); handleUnitClick(unit); };
                        unitDiv.oncontextmenu = (e) => {
                            e.preventDefault(); e.stopPropagation();
                            const cardDef = CARD_LIBRARY.find(c => c.name === unit.cardName);
                            if (cardDef) {
                                showPokedexDetail(cardDef, null);
                            } else {
                                showToast(`图鉴中没有「${unit.cardName}」`);
                            }
                        };
                        cell.appendChild(unitDiv);
                    });
                } else {
                    const empty = document.createElement('div');
                    empty.innerText = '⬚';
                    empty.style.fontSize = '24px';
                    empty.style.opacity = '0.4';
                    cell.appendChild(empty);
                }
                cell.onclick = async () => { try { await handleCellClick(r, c); } catch(e) { console.error(e); } };
                grid.appendChild(cell);
            }
        }
        } // end fullRender

        const handDiv = document.getElementById('handCards');
        handDiv.innerHTML = '';
        const curHand = gameState.players[gameState.turn]?.hand || [];
        curHand.forEach((card, idx) => {
            const cardEl = document.createElement('div');
            const gradeClass = `grade-${card.grade || 3}`;
            cardEl.className = `card ${gradeClass} ${gameState.selectedCardIdx === idx && !gameState.awaitingSkillTarget ? 'selected-card' : ''}`;
            if (card.disabled) cardEl.classList.add('card-disabled');
            const empMod = gameState.kingCostMod[gameState.turn] || 0;
            let displayCost = Math.max(0, card.cost + empMod);
            if (card.name === "狂战士") {
                const enemyCount = gameState.units.filter(u => u.side !== gameState.turn).length;
                const finalLife = card.life + enemyCount;
                if (finalLife >= 5) displayCost = Math.max(0, 2 + empMod);
            }
            const costExtra = empMod !== 0 ? (empMod > 0 ? `<span class="cost-up">+${empMod}</span>` : `<span class="cost-down">${empMod}</span>`) : '';
            const canAfford = infiniteManaEnabled || gameState.players[gameState.turn].mana >= displayCost;
            const costColor = canAfford ? '#22c55e' : '#6b7280';
            // 被动名缩略（只取名称不取描述）
            let passiveName = '';
            if (card.passive) {
                passiveName = card.passive.split(/[：:，,。]/)[0].slice(0, 8);
                if (card.passive.length > passiveName.length) passiveName += '…';
            }
            cardEl.innerHTML = `<div class="card-cost-badge" style="background:${costColor};">${displayCost}${costExtra}</div><div class="card-key-hint">${idx + 1}</div><div class="card-name">${card.name}</div><div class="card-stats"><span class="cs-hp">❤${card.life}</span><span class="cs-dmg">${card.dmgType}${card.dmgValue}</span><span class="cs-range">📏${card.range}</span></div>${passiveName ? `<div class="card-passive">${passiveName}</div>` : ''}${card.disabled ? '<div class="card-disabled-overlay">🔒</div>' : ''}`;
            const discardBtn = document.createElement('button');
            discardBtn.innerText = '弃';
            discardBtn.className = 'discard-btn';
            discardBtn.onclick = (e) => { e.stopPropagation(); if (aiActing) return; if (networkForward({ type: 'discard', idx })) return; discardCard(gameState.turn, idx); };
            // 新手教程中隐藏弃牌按钮，降低自由度
            if (!(tutorialState && tutorialState.active)) cardEl.appendChild(discardBtn);
            // 无中生有：添加使用按钮（教程中隐藏）
            if (card.name === "无中生有" && !card.disabled && !(tutorialState && tutorialState.active)) {
                const useBtn = document.createElement('button');
                useBtn.innerText = '用';
                useBtn.className = 'discard-btn';
                useBtn.style.right = '28px';
                useBtn.style.background = '#2c6e6e';
                useBtn.onclick = async (e) => { e.stopPropagation(); if (aiActing) return; if (networkForward({ type: 'wuzhong', idx })) return; try { await useWuzhong(gameState.turn, idx); } catch(err) { console.error(err); } };
                cardEl.appendChild(useBtn);
            }
            if (card.name === "鼠疫" && !card.disabled && !(tutorialState && tutorialState.active)) {
                const useBtn = document.createElement('button');
                useBtn.innerText = '用';
                useBtn.className = 'discard-btn';
                useBtn.style.right = '28px';
                useBtn.style.background = '#2c6e2c';
                useBtn.onclick = (e) => { e.stopPropagation(); if (aiActing) return; if (networkForward({ type: 'plague', idx })) return; try { usePlague(gameState.turn, idx); } catch(err) { console.error(err); } };
                cardEl.appendChild(useBtn);
            }
            cardEl.onclick = (e) => {
                if (aiActing) { return; }
                if (e.target === discardBtn || (e.target && e.target.className === 'discard-btn')) return; 
                // 技能选择目标期间，禁止点击手牌
                if (gameState.awaitingSkillTarget) { 
                    showToast(`请先完成技能目标选择或取消技能`); 
                    return; 
                } 
                if (gameState.selectedCardIdx === idx) { 
                    gameState.selectedCardIdx = -1; 
                    addLog("已取消手牌选中"); 
                    showToast('取消手牌选中');
                } else { 
                    gameState.selectedCardIdx = idx; 
                    showToast(`📌 已选手牌: ${card.name}`);
                } 
                renderUI(); 
            };
            cardEl.oncontextmenu = (e) => { e.preventDefault(); showPokedexDetail(card, null); };
            handDiv.appendChild(cardEl);
        });

        // 渲染敌方手牌
        const enemySide = gameState.turn === 0 ? 1 : 0;
        const enemyHandDiv = document.getElementById('enemyHandCards');
        enemyHandDiv.innerHTML = '';
        gameState.players[enemySide].hand.forEach(card => {
            const cardEl = document.createElement('div');
            const gradeClass = `grade-${card.grade || 3}`;
            cardEl.className = `card enemy-card ${gradeClass}`;
            cardEl.innerHTML = `<div class="card-name">${card.name}</div>`;
            cardEl.oncontextmenu = (e) => { e.preventDefault(); showPokedexDetail(card, null); };
            enemyHandDiv.appendChild(cardEl);
        });

        const prepoolDiv = document.getElementById('prepoolList');
        prepoolDiv.innerHTML = '';
        // 联机模式：显示己方预牌堆；本地模式：显示当前回合方预牌堆
        (gameState.players[gameState.turn]?.prepool || []).forEach(card => {
            const p = document.createElement('div');
            p.className = 'prepool-card';
            p.innerText = `${card.name}(${card.cost}费)`;
            p.oncontextmenu = (e) => { e.preventDefault(); showPokedexDetail(card, null); };
            prepoolDiv.appendChild(p);
        });

        document.querySelectorAll('#dynamicSkillBtn,#dynamicSkillBtn2,#dynamicPopBtn,#cancelSkillBtn,#confirmDeclarativeBtn,#mirrorAtkBtn,#mirrorSwapBtn,#equipActiveBtn-pureSky').forEach(b => b?.remove());
        if (gameState.selectedUnitId !== null && !gameState.awaitingSkillTarget) {
            const selectedUnit = gameState.units.find(u => u.id === gameState.selectedUnitId);
            // 只在选中己方单位且是己方回合时才显示操作按钮
            if (selectedUnit && selectedUnit.side === gameState.turn) {
                // 新手教程中不显示爆牌按钮，降低自由度
                if (!(tutorialState && tutorialState.active)) {
                    const popBtn = document.createElement('button');
                    popBtn.id = 'dynamicPopBtn';
                    popBtn.className = 'pop-btn';
                    popBtn.innerText = `💥 爆牌 (移除${selectedUnit.cardName})`;
                    popBtn.style.position = 'fixed';
                    popBtn.style.bottom = '16px';
                    popBtn.style.left = '16px';
                    popBtn.style.zIndex = '1000';
                    popBtn.onclick = () => { if (networkForward({ type: 'pop', id: selectedUnit.id })) return; popUnit(selectedUnit.id); gameState.selectedUnitId = null; renderUI(); };
                    document.body.appendChild(popBtn);
                }
                const cardDef = CARD_LIBRARY.find(c => c.name === selectedUnit.cardName);
                // 新手教程：仅当前步骤允许使用技能时才显示技能按钮
                const tutSkillOk = !(tutorialState && tutorialState.active) || (typeof tutorialAllowAction === 'function' && tutorialAllowAction('skill'));
                if (tutSkillOk && cardDef && cardDef.skill && !(selectedUnit.cardName === "绫罗" && selectedUnit.riluoPlaced)) {
                    const btn = document.createElement('button');
                    btn.id = 'dynamicSkillBtn';
                    btn.className = 'skill-btn';
                    // 按钮文本从 SKILL_DEFS 自动生成
                    btn.innerText = getSkillBtnText(selectedUnit, cardDef.skill);
                    btn.onclick = () => { if (networkForward({ type: 'skill', id: selectedUnit.id, skillName: cardDef.skill })) return; useSelectedUnitSkill(selectedUnit, cardDef.skill); };
                    btn.style.position = 'fixed';
                    btn.style.bottom = '16px';
                    btn.style.right = '16px';
                    btn.style.zIndex = '1000';
                    document.body.appendChild(btn);
                }
                // 绫罗：离身时显示回绫罗按钮
                if (selectedUnit.cardName === "绫罗" && selectedUnit.riluoPlaced) {
                    const returnBtn = document.createElement('button');
                    returnBtn.id = 'riluoReturnBtn';
                    returnBtn.className = 'skill-btn';
                    returnBtn.innerText = `🧵 回绫罗`;
                    returnBtn.onclick = () => { if (networkForward({ type: 'riluoReturn', id: selectedUnit.id })) return; performRiluoReturn(selectedUnit); };
                    returnBtn.style.position = 'fixed';
                    returnBtn.style.bottom = '16px';
                    returnBtn.style.right = '16px';
                    returnBtn.style.zIndex = '1000';
                    document.body.appendChild(returnBtn);
                }
                // 镜中人：攻击按钮 + 换位按钮
                if (selectedUnit.cardName === "镜中人") {
                    const atkBtn = document.createElement('button');
                    atkBtn.id = 'mirrorAtkBtn';
                    atkBtn.className = 'skill-btn';
                    atkBtn.innerText = `⚔️ 攻击`;
                    atkBtn.onclick = () => { if (networkForward({ type: 'mirrorAttack', id: selectedUnit.id })) return; gameState.awaitingMirrorAttack = true; gameState.mirrorAttackUnitId = selectedUnit.id; addLog(`请选择要攻击的格子（自身格或相邻格）`); renderUI(); };
                    atkBtn.style.position = 'fixed';
                    atkBtn.style.bottom = '60px';
                    atkBtn.style.right = '16px';
                    atkBtn.style.zIndex = '1000';
                    document.body.appendChild(atkBtn);
                    const mirror = getMirrorOf(selectedUnit);
                    if (mirror) {
                        const swapBtn = document.createElement('button');
                        swapBtn.id = 'mirrorSwapBtn';
                        swapBtn.className = 'skill-btn';
                        swapBtn.innerText = selectedUnit.mirrorSwappedThisTurn ? '🪞 换位(已用)' : '🪞 换位';
                        swapBtn.onclick = () => { if (networkForward({ type: 'mirrorSwap', id: selectedUnit.id })) return; performMirrorSwap(selectedUnit); };
                        swapBtn.style.position = 'fixed';
                        swapBtn.style.bottom = '104px';
                        swapBtn.style.right = '16px';
                        swapBtn.style.zIndex = '1000';
                        document.body.appendChild(swapBtn);
                    }
                }
                if (cardDef && cardDef.skill2 && !(selectedUnit.cardName === "绫罗" && selectedUnit.riluoPlaced)) {
                    const btn2 = document.createElement('button');
                    btn2.id = 'dynamicSkillBtn2';
                    btn2.className = 'skill-btn';
                    btn2.innerText = getSkillBtnText(selectedUnit, cardDef.skill2);
                    btn2.onclick = () => { if (networkForward({ type: 'skill', id: selectedUnit.id, skillName: cardDef.skill2 })) return; useSelectedUnitSkill(selectedUnit, cardDef.skill2); };
                    btn2.style.position = 'fixed';
                    btn2.style.bottom = '60px';
                    btn2.style.right = '16px';
                    btn2.style.zIndex = '1000';
                    document.body.appendChild(btn2);
                }
                // 装备主动技能按钮（碎镜等）
                const eqActions = getEquipmentActiveActions(selectedUnit);
                for (let action of eqActions) {
                    const eqBtn = document.createElement('button');
                    eqBtn.id = 'equipActiveBtn-' + action.id;
                    eqBtn.className = 'skill-btn';
                    eqBtn.innerText = action.label;
                    eqBtn.title = action.desc;
                    eqBtn.style.position = 'fixed';
                    eqBtn.style.bottom = '148px';
                    eqBtn.style.right = '16px';
                    eqBtn.style.zIndex = '1000';
                    eqBtn.onclick = () => {
                        if (networkForward({ type: 'equipSkill', id: selectedUnit.id })) return;
                        if (action.id === 'pureSky') activatePureSky(selectedUnit);
                    };
                    document.body.appendChild(eqBtn);
                }
            }
        }
        // 声明式技能：通用确认按钮（替代所有技能特定的确认按钮）
        if (gameState.awaitingSkillTarget && gameState.skillType === "declarative") {
            const def = SKILL_DEFS[gameState.declarativeSkillName];
            if (def && (def.confirmButton || (def.selectMode === "multi" && def.toggle))) {
                const confirmBtn = document.createElement('button');
                confirmBtn.id = 'confirmDeclarativeBtn';
                confirmBtn.className = 'skill-btn';
                const selectedCount = (gameState.declarativeSelected || []).length;
                const maxSel = gameState.declarativeMaxSelect || 1;
                confirmBtn.innerText = `✅ 确认 (${selectedCount}/${maxSel === 99 ? '∞' : maxSel})`;
                confirmBtn.style.position = 'fixed';
                confirmBtn.style.bottom = '160px';
                confirmBtn.style.right = '20px';
                confirmBtn.style.zIndex = '1000';
                confirmBtn.onclick = () => { if (networkForward({ type: 'confirmSkill' })) return; confirmDeclarativeSkill(); };
                document.body.appendChild(confirmBtn);
            } else if (def && def.confirmButton && def.targetType === "self") {
                // confirm 模式（如双剑横扫）：无目标选择，直接确认执行
                const confirmBtn = document.createElement('button');
                confirmBtn.id = 'confirmDeclarativeBtn';
                confirmBtn.className = 'skill-btn';
                const cnt = (gameState.dualswordAOEHighlight || []).length;
                confirmBtn.innerText = `✅ 确认${cnt > 0 ? ` (${cnt}格)` : ''}`;
                confirmBtn.style.position = 'fixed';
                confirmBtn.style.bottom = '160px';
                confirmBtn.style.right = '20px';
                confirmBtn.style.zIndex = '1000';
                confirmBtn.onclick = () => { if (networkForward({ type: 'confirmSkill' })) return; confirmDeclarativeSkill(); };
                document.body.appendChild(confirmBtn);
            }
        }
        if (gameState.awaitingSkillTarget) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancelSkillBtn';
            cancelBtn.className = 'cancel-btn';
            cancelBtn.innerText = `❌ 取消技能`;
            cancelBtn.style.position = 'fixed';
            cancelBtn.style.bottom = '80px';
            cancelBtn.style.right = '20px';
            cancelBtn.style.zIndex = '1000';
            cancelBtn.onclick = () => {
                if (networkForward({ type: 'cancelSkill' })) return;
                const caster = gameState.units.find(u => u.id === gameState.skillCasterId);
                if (caster) caster.skillUsedThisTurn = false;
                clearSkillTarget(); renderUI(); addLog("已取消技能释放。");
            };
            document.body.appendChild(cancelBtn);
        }
        if (gameState.awaitingGlide) {
            const glideBtn = document.createElement('button');
            glideBtn.id = 'skipGlideBtn';
            glideBtn.className = 'cancel-btn';
            glideBtn.innerText = `⏭️ 跳过滑步`;
            glideBtn.style.position = 'fixed';
            glideBtn.style.bottom = '80px';
            glideBtn.style.left = '20px';
            glideBtn.style.zIndex = '1000';
            glideBtn.onclick = () => {
                if (networkForward({ type: 'skipGlide' })) return;
                gameState.awaitingGlide = false;
                gameState.glideUnitId = null;
                addLog("跳过滑步。");
                renderUI();
            };
            document.body.appendChild(glideBtn);
        }
        if (gameState.awaitingMirrorAttack) {
            const cancelAtkBtn = document.createElement('button');
            cancelAtkBtn.id = 'cancelMirrorAtkBtn';
            cancelAtkBtn.className = 'cancel-btn';
            cancelAtkBtn.innerText = `❌ 取消攻击`;
            cancelAtkBtn.style.position = 'fixed';
            cancelAtkBtn.style.bottom = '80px';
            cancelAtkBtn.style.left = '20px';
            cancelAtkBtn.style.zIndex = '1000';
            cancelAtkBtn.onclick = () => { if (networkForward({ type: 'cancelMirrorAttack' })) return; gameState.awaitingMirrorAttack = false; gameState.mirrorAttackUnitId = null; renderUI(); };
            document.body.appendChild(cancelAtkBtn);
        }
        } catch(err) {
            _renderUIErrors++;
            console.error('[RENDER_UI] Error:', err.message, err.stack);
            // 在页面上显示渲染错误，方便诊断
            const errDiv = document.getElementById('renderError');
            if (errDiv) errDiv.innerText = '渲染错误: ' + err.message;
            else { const d = document.createElement('div'); d.id = 'renderError'; d.style.cssText = 'position:fixed;top:50%;left:50%;background:rgba(255,0,0,0.8);color:white;padding:20px;z-index:99999;font-size:16px;'; d.innerText = '渲染错误: ' + err.message; document.body.appendChild(d); }
        }
        document.getElementById('p0Hp').innerText = gameState.players[0].hp;
        document.getElementById('p1Hp').innerText = gameState.players[1].hp;
        document.getElementById('p0Mana').innerText = gameState.players[0].mana;
        document.getElementById('p1Mana').innerText = gameState.players[1].mana;
        document.getElementById('p0HandCount').innerText = gameState.players[0].hand.length;
        document.getElementById('p1HandCount').innerText = gameState.players[1].hand.length;
        const enemySide = gameState.turn === 0 ? 1 : 0;
        document.getElementById('enemyHandCount').innerText = gameState.players[enemySide].hand.length;
        document.getElementById('turnText').innerHTML = gameState.turn === 0 ? "🔽 蓝方回合" : "🔴 红方回合";
        // AI 回合指示
        if (aiActing) {
            document.getElementById('turnText').innerHTML += ' <span style="color:#9c6cff">🤖思考中...</span>';
        } else if (aiSide >= 0 && gameState.turn === aiSide) {
            document.getElementById('turnText').innerHTML += ' <span style="color:#9c6cff">🤖</span>';
        }
                        const testBtn = document.getElementById('testModeBtn');
        if (gameMode === 'custom' || gameMode === 'ai') {
            testBtn.style.opacity = '0.4';
            testBtn.title = gameMode === 'ai' ? '人机对战模式下不可用' : '自定义卡组模式下不可用';
        } else {
            testBtn.style.opacity = '1';
            testBtn.title = '';
        }
        // 新手教程高亮（教程激活时在每次渲染后重新应用发光框）
        if (typeof applyTutorialHighlight === 'function' && tutorialState && tutorialState.active) {
            try { applyTutorialHighlight(); } catch(e) { /* 高亮失败不影响游戏 */ }
        }
        // 远程联机：主机渲染后标记脏，由轮询推送状态快照
        if (typeof networkMarkDirty === 'function') { try { networkMarkDirty(); } catch(e) {} }
        // 远程联机：渲染「退出联机」浮动按钮
        if (typeof networkActive === 'function' && networkActive()) {
            if (!document.getElementById('networkExitBtn')) {
                const exitBtn = document.createElement('button');
                exitBtn.id = 'networkExitBtn';
                exitBtn.className = 'cancel-btn';
                exitBtn.innerText = `🌐 退出联机`;
                exitBtn.style.cssText = 'position:fixed;top:8px;right:16px;z-index:950;cursor:pointer;';
                exitBtn.onclick = () => { if (typeof networkExitGame === 'function') networkExitGame(); };
                document.body.appendChild(exitBtn);
            }
        } else {
            const oldExit = document.getElementById('networkExitBtn');
            if (oldExit) oldExit.remove();
        }
    }

    document.getElementById('endTurnBtn').onclick = async () => {
        if (aiActing) { showToast('🤖 AI 正在行动，请稍候'); return; }
        // 远程联机客机：乐观弹窗（确认+预牌+满手牌弃牌本地完成），选择随指令一次直达主机，避免多次往返
        if (networkIsGuest() && gameState.turn === networkMySide()) {
            const confirmed = await showConfirmLocal("是否结束当前回合？");
            if (!confirmed) { addLog("结束回合已取消。"); return; }
            const prepool = gameState.players[gameState.turn].prepool;
            const action = { type: 'endTurn', confirmed: true };
            if (prepool.length > 0) {
                const prepick = await showPrepickPanelLocal(prepool);
                if (prepick === -1) { addLog("结束回合已取消。"); return; }
                action.prepick = prepick;
                // 手牌已满时（预牌将补入手牌触发弃牌），本地先选弃牌，随指令发送给主机（避免弃牌弹窗开在主机端）
                if (gameState.players[gameState.turn].hand.length >= gameState.players[gameState.turn].handMax) {
                    const selectedCard = prepool[prepick];
                    const discardIdx = await discardForNewCardLocal(gameState.turn, selectedCard);
                    action.discardIdx = discardIdx;
                }
            }
            // 预牌堆为空时不带 prepick，主机补牌后走正常转发弹窗
            networkSendAction(action);
            return;
        }
        // 远程联机：非自己回合只读；客机回合转发给主机执行
        if (networkForward({ type: 'endTurn' })) return;
        try { await endTurn(); } catch(e) { console.error(e); }
    };
    document.getElementById('resetGameBtn').onclick = async () => {
        if (aiActing) { showToast('🤖 AI 正在行动，请稍候'); return; }
        // 新手教程：拦截重新开局
        if (tutorialState && tutorialState.active) { tutorialBlock('重新开局'); return; }
        // 远程联机：拦截重新开局（请使用「退出联机」回到模式选择）
        if (networkActive()) { showToast('🌐 联机中无法重新开局，请退出联机后重开'); return; }
        const confirmed = await showConfirm('确定要重新开局吗？当前对局进度将丢失！');
        if (confirmed) {
            await startGame();
        }
    };
    document.getElementById('clearHandBtn').onclick = () => { gameState.selectedCardIdx = -1; addLog("已取消手牌选中"); renderUI(); };
    document.getElementById('pokedexBtn').onclick = () => showPokedex();
    document.getElementById('poolBtn').onclick = () => showCardPool();
    document.getElementById('tutorialBtn').onclick = () => showTutorial();
    document.getElementById('testModeBtn').onclick = () => openTestPanel();
    document.getElementById('equipmentShopBtn').onclick = () => {
        if (aiActing) { showToast('🤖 AI 正在行动，请稍候'); return; }
        // 远程联机：非自己回合只读；客机回合转发给主机执行
        if (networkForward({ type: 'shop' })) return;
        openEquipmentShop();
    };

    // ========== 战斗反馈：浮动伤害数字、受击闪白、攻击路径 ==========

    function showFloatText(row, col, text, type = 'damage') {
        const grid = document.getElementById('gameGrid');
        if (!grid) return;
        const cell = grid.children[row * 3 + col];
        if (!cell) return;
        const rect = cell.getBoundingClientRect();
        const el = document.createElement('div');
        el.className = `float-text ${type}`;
        el.textContent = text;
        el.style.left = (rect.left + rect.width / 2) + 'px';
        el.style.top = (rect.top + rect.height / 2) + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 900);
        // 远程联机：浮动伤害数字同步给客机
        if (typeof networkEffect === 'function') networkEffect('float', [row, col, text, type]);
    }

    function flashCellHit(row, col) {
        const grid = document.getElementById('gameGrid');
        if (!grid) return;
        const cell = grid.children[row * 3 + col];
        if (!cell) return;
        cell.classList.add('cell-hit-flash');
        setTimeout(() => cell.classList.remove('cell-hit-flash'), 350);
        // 远程联机：受击闪白同步给客机
        if (typeof networkEffect === 'function') networkEffect('hit', [row, col]);
    }

    function flashCellAttack(row, col) {
        const grid = document.getElementById('gameGrid');
        if (!grid) return;
        const cell = grid.children[row * 3 + col];
        if (!cell) return;
        cell.classList.add('cell-attack-flash');
        setTimeout(() => cell.classList.remove('cell-attack-flash'), 300);
        // 远程联机：攻击闪白同步给客机
        if (typeof networkEffect === 'function') networkEffect('attack', [row, col]);
    }

    function showAttackBeam(fromRow, fromCol, toRow, toCol) {
        const grid = document.getElementById('gameGrid');
        if (!grid) return;
        const fromCell = grid.children[fromRow * 3 + fromCol];
        const toCell = grid.children[toRow * 3 + toCol];
        if (!fromCell || !toCell) return;
        const r1 = fromCell.getBoundingClientRect();
        const r2 = toCell.getBoundingClientRect();
        const x1 = r1.left + r1.width / 2;
        const y1 = r1.top + r1.height / 2;
        const x2 = r2.left + r2.width / 2;
        const y2 = r2.top + r2.height / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const beam = document.createElement('div');
        beam.className = 'attack-beam';
        beam.style.left = x1 + 'px';
        beam.style.top = y1 + 'px';
        beam.style.width = len + 'px';
        beam.style.transform = `rotate(${angle}deg)`;
        beam.style.transformOrigin = '0 50%';
        document.body.appendChild(beam);
        setTimeout(() => beam.remove(), 500);
        // 远程联机：攻击光束同步给客机
        if (typeof networkEffect === 'function') networkEffect('beam', [fromRow, fromCol, toRow, toCol]);
    }
