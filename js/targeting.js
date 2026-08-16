// ========== 技能目标系统（全声明式） ==========
// getSkillTargetableUnits：判断技能合法目标（统一走 declarative 路径）
// handleCellClick：单元格点击处理（技能目标/放置手牌/移动单位/攻击城池）
// SKILL_TARGET_HANDLERS：仅保留 declarative + 蓄力攻击（axeman/heavyAxeman/crossbow）
// dispatchSkillTarget：技能目标分发器

// --- 目标判定 & 点击处理 ---

    // 判断某单位是否是某技能的合法目标
    function getSkillTargetableUnits(caster) {
        if (!gameState.awaitingSkillTarget) return [];
        const skillType = gameState.skillType;
        if (!skillType) return [];

        // ── 蓄力攻击目标（axeman/heavyAxeman/crossbow）：保留原有逻辑 ──
        if (skillType === "axeman" || skillType === "heavyAxeman" || skillType === "crossbow") {
            return gameState.units.filter(unit => unit.side !== caster.side && unit.absoluteImmunityTurns <= 0);
        }

        // ── 声明式技能目标过滤 ──
        if (skillType !== "declarative") return [];
        const def = SKILL_DEFS[gameState.declarativeSkillName];
        if (!def) return [];

        const mode = def.selectMode || "single";

        // 格子选择模式 / confirm 模式：不高亮单位
        if (mode === "grid" || def.targetType === "grid" || mode === "confirm") return [];

        // twoStep 模式：根据当前 step 决定目标类型
        let effectiveTargetType = def.targetType;
        let effectiveFilter = def.targetFilter;
        let effectiveExcludeSelf = false;
        let effectiveRange = 0;
        if (mode === "twoStep") {
            const stepDef = gameState.declarativeStep === 2 ? def.step2 : def.step1;
            effectiveTargetType = stepDef?.type || "friendly";
            effectiveExcludeSelf = stepDef?.excludeSelf || false;
            effectiveRange = 0;
            effectiveFilter = {};
            if (stepDef?.checkBind) effectiveFilter.checkBind = true;
        } else {
            effectiveExcludeSelf = def.excludeSelf || false;
            effectiveRange = def.range || 0;
        }

        // multi 模式：已经选中的不高亮（除非 toggle）
        if (mode === "multi" && !def.toggle) {
            const selected = gameState.declarativeSelected || [];
            if (selected.length >= (gameState.declarativeMaxSelect || 1)) return [];
        }

        return gameState.units.filter(unit => {
            // excludeSelf
            if (effectiveExcludeSelf && unit.id === caster.id) return false;

            // 目标类型过滤
            if (effectiveTargetType === "enemy") {
                if (unit.side === caster.side) return false;
                if (unit.absoluteImmunityTurns > 0) return false;
                const hasStun = def.effects.some(e => e.type === "stun");
                if (hasStun && unit.superCharging) return false;
            } else if (effectiveTargetType === "friendly") {
                if (unit.side !== caster.side) return false;
            } else if (effectiveTargetType === "any") {
                // 任何单位都可以
            }

            // range 过滤（multi 模式）
            if (effectiveRange > 0) {
                const dr = Math.abs(unit.row - caster.row);
                const dc = Math.abs(unit.col - caster.col);
                if (dr > effectiveRange || dc > effectiveRange) return false;
            }

            // targetFilter 过滤
            if (effectiveFilter) {
                if (effectiveFilter.sameColumn && unit.col !== caster.col) return false;
                if (effectiveFilter.attackedOnly && !(gameState.attackedEnemyIds || []).includes(unit.id)) return false;
                if (effectiveFilter.frontAdjacent) {
                    const forward = getForwardDelta(caster.side);
                    if (unit.row !== caster.row + forward || unit.col !== caster.col) return false;
                }
                if (effectiveFilter.pullable && !canPullForward(caster, unit)) return false;
                if (effectiveFilter.checkBind && (unit.shaLinBindTurn > 0 || unit.isSweepCharging || unit.superCharging)) return false;
                if (effectiveFilter.notAssimilator && unit.isAssimilator) return false;
                if (effectiveFilter.shadowFanRange) {
                    const forward = getForwardDelta(caster.side);
                    const d = (unit.row - caster.row) * forward;
                    if (unit.col !== caster.col || d <= 0 || d > 3 || unit.isMirror || unit.life <= 0) return false;
                }
            }

            // multi + toggle：已选中的仍然高亮（可以取消选择）
            if (mode === "multi" && def.toggle) {
                return true; // 已选中的也显示高亮
            }

            // multi 非 toggle：已选中的不高亮
            if (mode === "multi") {
                const selected = gameState.declarativeSelected || [];
                if (selected.includes(unit.id)) return false;
            }

            return true;
        });
    }

    async function handleCellClick(row, col) {
        if (aiActing) { return; }
        // 远程联机：非自己回合只读；客机回合转发给主机执行
        if (networkForward({ type: 'cellClick', row, col, cardIdx: gameState.selectedCardIdx, unitId: gameState.selectedUnitId })) return;
        // 镜中人攻击选格：自身格或相邻1格
        if (gameState.awaitingMirrorAttack) {
            const atkUnit = gameState.units.find(u => u.id === gameState.mirrorAttackUnitId);
            if (!atkUnit) { gameState.awaitingMirrorAttack = false; gameState.mirrorAttackUnitId = null; renderUI(); return; }
            const adist = Math.abs(row - atkUnit.row) + Math.abs(col - atkUnit.col);
            if (adist > 1) { showToast(`只能攻击自身格或相邻格`); return; }
            gameState.awaitingMirrorAttack = false;
            gameState.mirrorAttackUnitId = null;
            await performMirrorPersonAttack(atkUnit, row, col);
            return;
        }
        // 影舞姬滑步：选择相邻格位移，并对终点格所有敌方造成1法伤
        if (gameState.awaitingGlide) {
            const glideUnit = gameState.units.find(u => u.id === gameState.glideUnitId);
            if (!glideUnit) { gameState.awaitingGlide = false; gameState.glideUnitId = null; renderUI(); return; }
            const dist = Math.abs(row - glideUnit.row) + Math.abs(col - glideUnit.col);
            if (dist !== 1) { showToast(`滑步只能位移1格`); return; }
            if (glideUnit.shaLinBindTurn > 0) { showToast(`🪞 ${glideUnit.cardName} 被纱琳定身，无法滑步`); return; }
            if (!canAddUnit(row, col, glideUnit.side)) { showToast(`目标格己方已满`); return; }
            if (glideUnit.side === SIDE_PLAYER0 && row < 1) { showToast(`不能进入敌方城池`); return; }
            if (glideUnit.side === SIDE_PLAYER1 && row > 3) { showToast(`不能进入敌方城池`); return; }
            glideUnit.row = row;
            glideUnit.col = col;
            addLog(`💃 ${glideUnit.cardName} 滑步至 ${ROW_NAMES[row]}${COLS[col]}`);
            const targets = getUnitsAt(row, col).filter(u => u.side !== glideUnit.side && u.life > 0);
            for (let t of targets) {
                const source = { cardName: glideUnit.cardName, side: glideUnit.side, dmgType: "🔮", id: glideUnit.id, fromSkill: true };
                await applyDamageWithSource(t, 1, source, false, "🔮");
            }
            applyShaLinCellBinding(glideUnit);
            recheckAllWeaponSmithBuffs();
            gameState.awaitingGlide = false;
            gameState.glideUnitId = null;
            renderUI();
            return;
        }
        // 装备穿戴选择模式：只允许点击己方单位（单位点击在ui.js中处理）
        if (gameState.awaitingEquipmentTarget) {
            showToast(`请点击己方单位穿戴装备，或按ESC取消`);
            return;
        }
        if (gameState.awaitingSkillTarget) {
            if (gameState.skillType === "plagueCell") {
                applyPlagueCell(row, col);
                return;
            }
            const caster = gameState.units.find(u => u.id === gameState.skillCasterId);
            if (!caster) { clearSkillTarget(); renderUI(); return; }
            if (dispatchSkillTarget(caster, row, col, null)) return;
        }
        // 技能选择目标期间，禁止放置手牌单位
        if (gameState.awaitingSkillTarget) {
            showToast(`请先完成技能目标选择或取消技能`);
            return;
        }
        if (gameState.selectedCardIdx !== -1) {
            const card = gameState.players[gameState.turn].hand[gameState.selectedCardIdx];
            if (card) {
                const ownRow = getOwnCastleRow(gameState.turn);
                if (card.name === "无中生有") { showToast(`无中生有不能放置到场上，请在手中使用`); gameState.selectedCardIdx = -1; renderUI(); return; }
                if (card.name === "鼠疫") { showToast(`鼠疫不能放置到场上，请在手中使用`); gameState.selectedCardIdx = -1; renderUI(); return; }
                if (card.name === "军营") {
                    const belowCastleRow = ownRow + getForwardDelta(gameState.turn);
                    if (row !== ownRow && row !== belowCastleRow) { showToast(`军营只能放置在己方城池（${ROW_NAMES[ownRow]}）或城下（${ROW_NAMES[belowCastleRow]}）`); gameState.selectedCardIdx = -1; renderUI(); return; }
                } else if (card.name === "稻草人") {
                    const belowCastleRow = ownRow + getForwardDelta(gameState.turn);
                    if (row !== ownRow && row !== belowCastleRow && row !== 2) { showToast(`稻草人只能放置在己方城池（${ROW_NAMES[ownRow]}）、城下（${ROW_NAMES[belowCastleRow]}）或中线上`); gameState.selectedCardIdx = -1; renderUI(); return; }
                } else {
                    const nearBarracks = gameState.units.some(u => u.side === gameState.turn && u.cardName === "军营" && u.life > 0 && Math.abs(u.row - row) <= 1 && Math.abs(u.col - col) <= 1);
                    const enemyCastleRow = gameState.turn === SIDE_PLAYER0 ? 0 : 4;
                    const isEnemyCastleRow = row === enemyCastleRow;
                    if (row !== ownRow && (!nearBarracks || isEnemyCastleRow)) { showToast(`只能在你方的城池行（${ROW_NAMES[ownRow]}）或军营周围放置，不可在敌方城池行放置`); gameState.selectedCardIdx = -1; renderUI(); return; }
                }
                showToast(`放置: ${card.name} → ${ROW_NAMES[row]}${COLS[col]} (side=${gameState.turn})`);
                await placeUnit(gameState.turn, card, row, col, gameState.selectedCardIdx);
                renderUI();
                return;
            } else { gameState.selectedCardIdx = -1; renderUI(); showToast('⚠️ 选中的手牌不存在！'); return; }
        }
        if (gameState.selectedUnitId !== null) {
            const unit = gameState.units.find(u => u.id === gameState.selectedUnitId);
            if (!unit || unit.side !== gameState.turn) { gameState.selectedUnitId = null; renderUI(); return; }
            const enemyBaseRow = unit.side === SIDE_PLAYER0 ? 0 : 4;
            if (row === enemyBaseRow && col === unit.col && canAttackBase(unit)) { await attackBase(unit); gameState.selectedUnitId = null; renderUI(); return; }
            if (unit.shaLinBindTurn > 0) { showToast(`🪞 ${unit.cardName} 被纱琳定身，不能移动`); gameState.selectedUnitId = null; renderUI(); return; }
            if (unit.cardName === "掠影" && row === enemyBaseRow && col === unit.col) { showToast(`掠影不可攻击敌方城池及其内的敌方`); gameState.selectedUnitId = null; renderUI(); return; }
            await tryMoveUnit(unit, row, col);
            gameState.selectedUnitId = null;
            renderUI();
            return;
        }
        showToast(`请先点击手牌或己方单位`);
    }

// --- 技能目标分发表（仅 declarative + 蓄力攻击） ---

    const SKILL_TARGET_HANDLERS = {
        // ========== 声明式技能统一处理 ==========
        declarative(caster, row, col, clickedUnit) {
            const def = SKILL_DEFS[gameState.declarativeSkillName];
            if (!def) { clearSkillTarget(); renderUI(); return; }
            const mode = def.selectMode || "single";

            // ── confirm 模式：点击格子无效，需用确认按钮 ──
            if (mode === "confirm") {
                showToast(`请点击"确认"按钮执行技能`);
                return;
            }

            // ── grid 模式：选择一个格子 ──
            if (mode === "grid" || def.targetType === "grid") {
                handleDeclarativeGrid(caster, def, row, col);
                return;
            }

            // ── multi 模式：多选切换 ──
            if (mode === "multi") {
                handleDeclarativeMulti(caster, def, row, col, clickedUnit);
                return;
            }

            // ── twoStep 模式：两步选择 ──
            if (mode === "twoStep") {
                handleDeclarativeTwoStep(caster, def, row, col, clickedUnit);
                return;
            }

            // ── single 模式（默认）：选择一个单位 ──
            handleDeclarativeSingle(caster, def, row, col, clickedUnit);
        },

        // ========== 蓄力攻击（axeman/heavyAxeman/crossbow）==========
        axeman(caster, row, col, clickedUnit) {
            const enemyUnit = (clickedUnit && clickedUnit.side !== caster.side) ? clickedUnit : getUnitsAt(row, col).find(u => u.side !== caster.side);
            if (enemyUnit) { applyAxemanChargeTarget(caster, { type: 'unit', unit: enemyUnit }); return; }
            const forward = getForwardDelta(caster.side);
            if (row === caster.row + forward && col === caster.col) {
                if (caster.side === SIDE_PLAYER0 && row === 0) { applyAxemanChargeTarget(caster, { type: 'base', row, col, side: SIDE_PLAYER1 }); return; }
                if (caster.side === SIDE_PLAYER1 && row === 4) { applyAxemanChargeTarget(caster, { type: 'base', row, col, side: SIDE_PLAYER0 }); return; }
            }
            showToast(`请点击正前方1格内的敌方单位或敌方城池格子`);
        },
        heavyAxeman(caster, row, col, clickedUnit) {
            const enemyUnit = (clickedUnit && clickedUnit.side !== caster.side) ? clickedUnit : getUnitsAt(row, col).find(u => u.side !== caster.side);
            if (enemyUnit) { applyHeavyAxemanChargeTarget(caster, { type: 'unit', unit: enemyUnit }); return; }
            const forward = getForwardDelta(caster.side);
            if (row === caster.row + forward && col === caster.col) {
                if (caster.side === SIDE_PLAYER0 && row === 0) { applyHeavyAxemanChargeTarget(caster, { type: 'base', row, col, side: SIDE_PLAYER1 }); return; }
                if (caster.side === SIDE_PLAYER1 && row === 4) { applyHeavyAxemanChargeTarget(caster, { type: 'base', row, col, side: SIDE_PLAYER0 }); return; }
            }
            showToast(`请点击正前方1格内的敌方单位或敌方城池格子`);
        },
        crossbow(caster, row, col, clickedUnit) {
            const enemyUnit = (clickedUnit && clickedUnit.side !== caster.side) ? clickedUnit : getUnitsAt(row, col).find(u => u.side !== caster.side);
            if (enemyUnit) { applyCrossbowChargeTarget(caster, { type: 'unit', unit: enemyUnit }); return; }
            const forward = getForwardDelta(caster.side);
            if (row === caster.row + forward && col === caster.col) {
                if (caster.side === SIDE_PLAYER0 && row === 0) { applyCrossbowChargeTarget(caster, { type: 'base', row, col, side: SIDE_PLAYER1 }); return; }
                if (caster.side === SIDE_PLAYER1 && row === 4) { applyCrossbowChargeTarget(caster, { type: 'base', row, col, side: SIDE_PLAYER0 }); return; }
            }
            showToast(`请点击正前方1格内的敌方单位或敌方城池格子`);
        },
    };

    // ========== 声明式：single 模式 ==========
    function handleDeclarativeSingle(caster, def, row, col, clickedUnit) {
        const needEnemy = def.targetType === "enemy";
        const needFriendly = def.targetType === "friendly";
        const needAny = def.targetType === "any";

        // 优先使用 clickedUnit
        let u = clickedUnit;
        if (!u) {
            const unitsHere = getUnitsAt(row, col);
            if (needEnemy) u = unitsHere.find(x => x.side !== caster.side);
            else if (needFriendly) u = unitsHere.find(x => x.side === caster.side);
            else if (needAny) u = unitsHere[0];
        }

        if (!u) { showToast(`请点击一个${needEnemy ? "敌方" : needFriendly ? "友方" : ""}单位！`); return; }

        // 目标类型校验
        if (needEnemy && u.side === caster.side) { showToast(`请点击一个敌方单位！`); return; }
        if (needFriendly && u.side !== caster.side) { showToast(`请点击一个友方单位！`); return; }
        if (def.excludeSelf && u.id === caster.id) { showToast(`不能选择自身！`); return; }

        // targetFilter 校验
        if (def.targetFilter) {
            if (def.targetFilter.sameColumn && u.col !== caster.col) { showToast(`目标必须与施法者同列！`); return; }
            if (def.targetFilter.attackedOnly && !(gameState.attackedEnemyIds || []).includes(u.id)) { showToast(`目标必须本回合被攻击过！`); return; }
            if (def.targetFilter.frontAdjacent) {
                const forward = getForwardDelta(caster.side);
                if (u.row !== caster.row + forward || u.col !== caster.col) { showToast(`目标必须在正前方1格！`); return; }
            }
            if (def.targetFilter.pullable && !canPullForward(caster, u)) { showToast(`该目标无法被拉拽！`); return; }
            if (def.targetFilter.notAssimilator && u.isAssimilator) { showToast(`该单位已是同化者`); return; }
            if (def.targetFilter.shadowFanRange) {
                const forward = getForwardDelta(caster.side);
                const d = (u.row - caster.row) * forward;
                if (u.col !== caster.col || d <= 0 || d > 3 || u.isMirror || u.life <= 0 || u.absoluteImmunityTurns > 0) { showToast(`飞扇只能攻击正前方同列距离3内的敌人`); return; }
            }
        }

        (async () => {
            try {
                await resolveSkillEffects(caster, def, u);
                if (!gameState.units.includes(caster)) return; // 游戏已重置
                finishDeclarativeSkill(caster, def);
            } catch(e) {
                console.error('declarative single skill error:', e);
                clearSkillTarget();
                renderUI();
            }
        })();
    }

    // ========== 声明式：multi 模式 ==========
    function handleDeclarativeMulti(caster, def, row, col, clickedUnit) {
        const needEnemy = def.targetType === "enemy";
        const needFriendly = def.targetType === "friendly";

        let u = clickedUnit;
        if (!u) {
            const unitsHere = getUnitsAt(row, col);
            if (needEnemy) u = unitsHere.find(x => x.side !== caster.side);
            else if (needFriendly) u = unitsHere.find(x => x.side === caster.side);
            else u = unitsHere.find(x => x.id !== caster.id);
        }

        if (!u) { showToast(`请点击一个单位！`); return; }
        if (needEnemy && u.side === caster.side) { showToast(`请点击敌方单位！`); return; }
        if (needFriendly && u.side !== caster.side) { showToast(`请点击友方单位！`); return; }
        if (def.excludeSelf && u.id === caster.id) { showToast(`不能选择自身！`); return; }

        // range 检查
        if (def.range > 0) {
            const dr = Math.abs(u.row - caster.row);
            const dc = Math.abs(u.col - caster.col);
            if (dr > def.range || dc > def.range) { showToast(`目标不在范围内！`); return; }
        }

        const selected = gameState.declarativeSelected || [];
        const idx = selected.indexOf(u.id);

        if (idx === -1) {
            // 添加选择
            const maxSel = gameState.declarativeMaxSelect || 1;
            if (!def.toggle && selected.length >= maxSel) {
                // 非 toggle 模式：达到上限后替换最早的
                selected.shift();
            } else if (def.toggle && selected.length >= maxSel) {
                showToast(`最多选择${maxSel}个目标`);
                return;
            }
            selected.push(u.id);
            addLog(`已选中 ${u.cardName}（${selected.length}/${maxSel}）`);
        } else {
            // 取消选择
            selected.splice(idx, 1);
            addLog(`取消选中 ${u.cardName}（${selected.length}）`);
        }

        gameState.declarativeSelected = selected;
        renderUI();

        // 非 toggle 且无 confirmButton：达到上限自动确认
        if (!def.toggle && !def.confirmButton && selected.length >= (gameState.declarativeMaxSelect || 1)) {
            confirmDeclarativeMulti();
        }
    }

    // ========== 声明式：twoStep 模式 ==========
    function handleDeclarativeTwoStep(caster, def, row, col, clickedUnit) {
        const step = gameState.declarativeStep || 1;
        const stepDef = step === 2 ? def.step2 : def.step1;
        const stepType = stepDef?.type || "friendly";

        // step2 可能是 grid
        if (step === 2 && stepDef?.type === "grid") {
            handleDeclarativeTwoStepGrid(caster, def, row, col);
            return;
        }

        // 单位选择
        let u = clickedUnit;
        if (!u) {
            const unitsHere = getUnitsAt(row, col);
            if (stepType === "enemy") u = unitsHere.find(x => x.side !== caster.side);
            else if (stepType === "friendly") u = unitsHere.find(x => x.side === caster.side);
            else if (stepType === "any") u = unitsHere.find(x => x.id !== caster.id);
        }

        if (!u) { showToast(`请点击一个单位！`); return; }
        if (stepType === "enemy" && u.side === caster.side) { showToast(`请点击敌方单位！`); return; }
        if (stepType === "friendly" && u.side !== caster.side) { showToast(`请点击友方单位！`); return; }
        if (stepDef?.excludeSelf && u.id === caster.id) { showToast(`不能选择自身！`); return; }
        if (stepDef?.checkBind && (u.shaLinBindTurn > 0 || u.isSweepCharging || u.superCharging)) {
            showToast(`${u.cardName} 无法被位移！`); return;
        }

        if (step === 1) {
            gameState.declarativeFirstTarget = u;
            gameState.declarativeStep = 2;
            const step2Type = def.step2?.type || "friendly";
            const step2Text = step2Type === "enemy" ? "敌方" : step2Type === "any" ? "" : "友方";
            const step2IsGrid = def.step2?.type === "grid";
            if (step2IsGrid) {
                const gridHint = def.step2?.gridFilter === "casterRow" ? `（须在${ROW_NAMES[caster.row]}横线）` : "";
                addLog(`请点击一个格子${gridHint}`);
            } else {
                addLog(`请点击第二个${step2Text}单位`);
            }
            renderUI();
        } else {
            // step 2：执行技能
            const first = gameState.declarativeFirstTarget;
            if (!first) { showToast(`第一个目标已失效`); clearSkillTarget(); renderUI(); return; }
            if (first.id === u.id) { showToast(`两个目标必须不同！`); return; }

            (async () => {
                try {
                    const ctx = { firstTarget: first };
                    await resolveSkillEffects(caster, def, u, ctx);
                    if (!gameState.units.includes(caster)) return; // 游戏已重置
                    finishDeclarativeSkill(caster, def);
                } catch(e) {
                    console.error('declarative twoStep skill error:', e);
                    clearSkillTarget();
                    renderUI();
                }
            })();
        }
    }

    // ========== 声明式：twoStep 的第二步为格子 ==========
    function handleDeclarativeTwoStepGrid(caster, def, row, col) {
        const step2 = def.step2;
        if (step2?.gridFilter === "casterRow" && row !== caster.row) {
            showToast(`只能选择施法者所在横线（${ROW_NAMES[caster.row]}）`);
            return;
        }
        // 存储格子坐标，然后执行
        gameState.declarativeGridRow = row;
        gameState.declarativeGridCol = col;

        const first = gameState.declarativeFirstTarget;
        if (!first) { showToast(`第一个目标已失效`); clearSkillTarget(); renderUI(); return; }

        (async () => {
            try {
                // moveToGrid 效果使用 declarativeGridRow/Col
                const ctx = { firstTarget: first };
                await resolveSkillEffects(caster, def, first, ctx);
                if (!gameState.units.includes(caster)) return; // 游戏已重置
                finishDeclarativeSkill(caster, def);
            } catch(e) {
                console.error('declarative twoStep grid skill error:', e);
                clearSkillTarget();
                renderUI();
            }
        })();
    }

    // ========== 声明式：grid 模式 ==========
    function handleDeclarativeGrid(caster, def, row, col) {
        const filter = gameState.declarativeGridFilter || "any";

        // 格子过滤
        if (filter === "noEnemy") {
            const hasEnemy = gameState.units.some(u => u.row === row && u.col === col && u.side !== caster.side);
            if (hasEnemy) { showToast(`目标格有敌方单位，无法选择`); return; }
        }
        if (filter === "distance2") {
            const dist = Math.abs(row - caster.row) + Math.abs(col - caster.col);
            if (dist !== 0 && dist !== 2) { showToast(`旋风踢只能位移2格或原地释放`); return; }
        }
        if (filter === "notEnemyCastle") {
            const enemyCastleRow = caster.side === SIDE_PLAYER0 ? 0 : 4;
            if (row === enemyCastleRow) { showToast(`不能放在敌方城池`); return; }
        }
        if (filter === "nearby1") {
            const dist = Math.abs(row - caster.row) + Math.abs(col - caster.col);
            if (dist > 1) { showToast(`只能放至所在格及九宫格内`); return; }
            if (caster.side === SIDE_PLAYER0 && row === 0) { showToast(`不能把绫罗放到敌方城池`); return; }
            if (caster.side === SIDE_PLAYER1 && row === 4) { showToast(`不能把绫罗放到敌方城池`); return; }
        }
        if (filter === "adjacent1") {
            const dist = Math.abs(row - caster.row) + Math.abs(col - caster.col);
            if (dist !== 1) { showToast(`只能位移至周围一格`); return; }
        }

        gameState.declarativeGridRow = row;
        gameState.declarativeGridCol = col;

        (async () => {
            try {
                await resolveSkillEffectsGrid(caster, def);
                if (!gameState.units.includes(caster)) return; // 游戏已重置
                finishDeclarativeSkill(caster, def);
            } catch(e) {
                console.error('declarative grid skill error:', e);
                clearSkillTarget();
                renderUI();
            }
        })();
    }

    // ========== 声明式：confirm 模式确认 ==========
    function confirmDeclarativeSkill() {
        const caster = gameState.units.find(u => u.id === gameState.skillCasterId);
        if (!caster) { clearSkillTarget(); renderUI(); return; }
        const def = SKILL_DEFS[gameState.declarativeSkillName];
        if (!def) { clearSkillTarget(); renderUI(); return; }
        const mode = def.selectMode || "single";

        if (mode === "multi") {
            confirmDeclarativeMulti();
            return;
        }

        // confirm 模式：需要确认按钮的自身技能
        if (mode === "confirm" || def.confirmButton) {
            if (consumeNerdJamPending(caster, "技能")) return;
            (async () => {
                try {
                    await resolveSkillEffects(caster, def, null, null);
                    if (!gameState.units.includes(caster)) return; // 游戏已重置
                    finishDeclarativeSkill(caster, def);
                } catch(e) {
                    console.error('declarative confirm skill error:', e);
                    clearSkillTarget();
                    renderUI();
                }
            })();
        }
    }

    function dispatchSkillTarget(caster, row, col, clickedUnit) {
        const handler = SKILL_TARGET_HANDLERS[gameState.skillType];
        if (handler && consumeNerdJamPending(caster, "技能")) return true;
        if (handler) { handler(caster, row, col, clickedUnit); recheckAllWeaponSmithBuffs(); return true; }
        return false;
    }
