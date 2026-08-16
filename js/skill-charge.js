// ========== 蓄力 & 特殊攻击 & 手牌技能 ==========
// 自动蓄力(斧兵/弩手/重斧兵)、大力士攻击、双剑延迟AOE计算、
// 七二定身格检查、手牌技能(无中生有/鼠疫)
//
// 所有 use* 技能入口已迁移至 SKILL_DEFS 声明式配置（见 skill-config.js）
// 本文件保留：蓄力攻击机制、大力士摔投、手牌使用、以及辅助函数

    // ========== 斧兵/弩手自动蓄力攻击 ==========
    // 点击攻击敌方目标时自动进入蓄力，不需要手动点技能按钮
    async function autoChargeAttack(attacker, target) {
        if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法蓄力`); return false; }
        if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经行动过`); return false; }
        if (attacker.isCharging) { showToast(`${attacker.cardName} 已经在蓄力中`); return false; }
        if (attacker.silenced > 0) { showToast(`${attacker.cardName} 被沉默，无法蓄力`); return false; }
        if (attacker.eagleEyeTurns > 0) { showToast(`${attacker.cardName} 被致盲，蓄力失效`); return false; }

        const forward = getForwardDelta(attacker.side);
        let targetInfo = null;

        if (target && target.type) {
            targetInfo = target;
        } else if (target && target.row !== undefined && target.col !== undefined) {
            let actualTarget = target;
            if (attacker.cardName === "斧兵") {
                actualTarget = enforceAxemanTarget(attacker, target);
            } else {
                actualTarget = enforceAttackTarget(attacker, target);
            }
            if (actualTarget.side === attacker.side) { showToast(`只能对敌方使用`); return false; }

            if (attacker.cardName === "斧兵") {
                const expectedRow = attacker.row + forward;
                const isSameCell = actualTarget.row === attacker.row && actualTarget.col === attacker.col;
                if (!isSameCell && (actualTarget.row !== expectedRow || actualTarget.col !== attacker.col)) {
                    showToast(`斧兵蓄力目标不在正前方1格内`); return false;
                }
            } else if (attacker.cardName === "弩手") {
                const dirDist = (actualTarget.row - attacker.row) * forward;
                if (dirDist < 0) { showToast(`弩手只能攻击正前方同列敌人`); return false; }
                const distance = Math.abs(actualTarget.row - attacker.row);
                if (distance > attacker.range) { showToast(`弩手蓄力目标超出射程(${attacker.range})`); return false; }
                if (actualTarget.col !== attacker.col) { showToast(`弩手只能攻击正前方同列敌人`); return false; }
                const isSameCell = actualTarget.row === attacker.row && actualTarget.col === attacker.col;
                if (!isSameCell) {
                    let nearestRow = attacker.row + forward;
                    if (nearestRow !== actualTarget.row) {
                        let blocked = false;
                        for (let r = nearestRow; r !== actualTarget.row && r >= 0 && r <= 4; r += forward) {
                            if (gameState.units.some(u => u.col === attacker.col && u.row === r && u.side !== attacker.side && u.id !== actualTarget.id)) { blocked = true; break; }
                        }
                        if (blocked) { showToast(`弩手蓄力目标被更近的敌人阻挡`); return false; }
                    }
                }
            }
            targetInfo = { type: 'unit', unit: actualTarget };
        } else {
            showToast(`请点击敌方目标`); return false;
        }

        if (attacker.cardName === "弩手") {
            return applyCrossbowChargeTarget(attacker, targetInfo);
        } else {
            return applyAxemanChargeTarget(attacker, targetInfo);
        }
    }

    // ========== 重斧兵自动超级蓄力攻击 ==========
    async function autoSuperChargeAttack(attacker, target) {
        if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法蓄力`); return false; }
        if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经行动过`); return false; }
        if (attacker.superCharging) { showToast(`${attacker.cardName} 已经在超级蓄力中`); return false; }
        if (attacker.silenced > 0) { showToast(`${attacker.cardName} 被沉默，无法蓄力`); return false; }
        if (attacker.eagleEyeTurns > 0) { showToast(`${attacker.cardName} 被致盲，蓄力失效`); return false; }

        const forward = getForwardDelta(attacker.side);
        let targetInfo = null;

        if (target && target.type) {
            targetInfo = target;
        } else if (target && target.row !== undefined && target.col !== undefined) {
            let actualTarget = enforceAxemanTarget(attacker, target);
            if (actualTarget.side === attacker.side) { showToast(`只能对敌方使用`); return false; }
            const expectedRow = attacker.row + forward;
            const isSameCell = actualTarget.row === attacker.row && actualTarget.col === attacker.col;
            if (!isSameCell && (actualTarget.row !== expectedRow || actualTarget.col !== attacker.col)) {
                showToast(`重斧兵蓄力目标不在正前方1格内`); return false;
            }
            targetInfo = { type: 'unit', unit: actualTarget };
        } else {
            showToast(`请点击敌方目标`); return false;
        }

        return applyHeavyAxemanChargeTarget(attacker, targetInfo);
    }

    // ========== 大力士攻击（含摔投）==========
    async function performHerculesAttack(attacker, targetUnit) {
        if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法攻击`); return false; }
        if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经攻击过`); return false; }
        const rowDiff = targetUnit.row - attacker.row;
        if (Math.abs(rowDiff) !== 1 || targetUnit.col !== attacker.col) {
            showToast(`大力士只能攻击前一格或后一格的敌人！`);
            return false;
        }
        let actualTarget = enforceAttackTarget(attacker, targetUnit);
        if (actualTarget.side === attacker.side) {
            showToast(`只能攻击敌方单位`);
            return false;
        }
        // 检查定身/横扫蓄力：被定身或横扫蓄力中不能摔投，但仍可造成伤害
        const cannotThrow = actualTarget.shaLinBindTurn > 0 || actualTarget.isSweepCharging;
        if (cannotThrow) {
            if (actualTarget.shaLinBindTurn > 0) showToast(`🪞 ${actualTarget.cardName} 被纱琳定身，无法摔投，但仍可造成伤害`);
            else showToast(`⚔️ ${actualTarget.cardName} 正在横扫蓄力，无法摔投，但仍可造成伤害`);
        }
        let dmg = attacker.dmgValue;
        if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, 'physical')) dmg += attacker.tempAttackBonus;
        if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, 'physical')) { dmg += attacker.nextAttackBonus; attacker.nextAttackBonus = 0; }
        if (attacker.nextAttackDouble && canApplyBonus(attacker, 'physical')) { dmg = dmg * 2; attacker.nextAttackDouble = false; }
        await applyDamageWithSource(actualTarget, dmg, attacker);
        attacker.attacksLeftThisTurn--;
        attacker.skillUsedThisTurn = true;
        showToast(`⚔️ ${attacker.cardName} 攻击造成 ${dmg} 伤害`);
        const targetStillAlive = gameState.units.some(u => u.id === actualTarget.id);
        if (!targetStillAlive || cannotThrow) {
            if (!targetStillAlive) addLog(`${actualTarget.cardName} 被击杀，无法摔投。`);
            renderUI();
            return true;
        }
        // 霸体状态不能摔投
        if (actualTarget.superCharging) {
            addLog(`⚡⚡ ${actualTarget.cardName} 处于霸体状态，无法摔投。`);
            renderUI();
            return true;
        }
        const wantThrow = await showConfirm("是否使用摔投？将敌人摔向相反方向");
        if (!wantThrow) {
            addLog(`${attacker.cardName} 选择不摔投，仅造成伤害。`);
            renderUI();
            return true;
        }
        const newRow = attacker.row + (attacker.row - actualTarget.row);
        const isOutOfBounds = newRow < 0 || newRow > 4;
        const isForbiddenCastle = (attacker.side === SIDE_PLAYER0 && newRow === 4) || (attacker.side === SIDE_PLAYER1 && newRow === 0);
        if (isOutOfBounds) { addLog(`摔落位置超出边界，摔投失败。`); showToast(`❌ 超出边界，无法摔投`); renderUI(); return true; }
        if (isForbiddenCastle) { addLog(`不能将敌人摔入己方城池，摔投失败。`); showToast(`🚫 不能摔入己方城池`); renderUI(); return true; }
        const hasAlly = gameState.units.some(u => u.row === newRow && u.col === actualTarget.col && u.side === attacker.side);
        if (hasAlly) { addLog(`摔落位置有己方单位，摔投失败。`); showToast(`❌ 摔落位置有己方单位`); renderUI(); return true; }
        if (!canAddUnit(newRow, actualTarget.col, actualTarget.side)) { addLog(`摔落位置已满（该方已有2个单位），摔投失败。`); showToast(`❌ 摔落位置已满`); renderUI(); return true; }
        const oldRow = actualTarget.row;
        actualTarget.row = newRow;
        addLog(`${attacker.cardName} 将 ${actualTarget.cardName} 从 ${ROW_NAMES[oldRow]} 摔到 ${ROW_NAMES[newRow]}！`);
        showToast(`💪 ${attacker.cardName} 摔投 ${actualTarget.cardName}`);
        applyShaLinCellBinding(actualTarget);
        renderUI();
        return true;
    }

    // ========== 塞壬拉拽预检查（AI 使用）==========
    function canSirenPullTarget(caster, targetUnit) {
        if (!targetUnit || targetUnit.side === caster.side) return false;
        if (targetUnit.absoluteImmunityTurns > 0) return false;
        if (targetUnit.superCharging) return false;
        if (targetUnit.shaLinBindTurn > 0) return false;
        if (targetUnit.isSweepCharging) return false;
        const moveDir = caster.side === SIDE_PLAYER0 ? 1 : -1;
        const newRow = targetUnit.row + moveDir;
        if (newRow < 0 || newRow > 4) return false;
        const isForbiddenCastle = (caster.side === SIDE_PLAYER0 && newRow === 4) || (caster.side === SIDE_PLAYER1 && newRow === 0);
        if (isForbiddenCastle) return false;
        const hasAlly = gameState.units.some(u => u.row === newRow && u.col === targetUnit.col && u.side === caster.side && !u.isMirror && u.life > 0);
        if (hasAlly) return false;
        // 拉拽目标格须有容量（每格每方上限2），避免把敌方格塞成同方3单位
        if (!canAddUnit(newRow, targetUnit.col, caster.side)) return false;
        return true;
    }

    // ========== 斧兵蓄力机制 ==========
    function enforceAxemanTarget(caster, targetUnit) {
        const forward = getForwardDelta(caster.side);
        const expectedRow = caster.row + forward;
        const taunters = gameState.units.filter(u => u.side !== caster.side && u.cardName === "显眼包" && u.row === expectedRow && u.col === caster.col);
        if (taunters.length > 0) {
            if (targetUnit && taunters.some(t => t.id === targetUnit.id)) return targetUnit;
            else {
                const forcedTarget = taunters[0];
                addLog(`显眼包 ${forcedTarget.cardName} 强制成为蓄力目标！`);
                showToast(`🎭 嘲讽!`);
                return forcedTarget;
            }
        }
        return targetUnit;
    }
    function applyAxemanChargeTarget(caster, targetInfo) {
        if (!targetInfo) return false;
        const forward = getForwardDelta(caster.side);
        const expectedRow = caster.row + forward;
        if (targetInfo.type === 'base') {
            if (expectedRow !== targetInfo.row || caster.col !== targetInfo.col) { showToast(`目标不在正前方1格内，无法蓄力`); return false; }
            const enemySide = targetInfo.side;
            const enemyBaseRow = targetInfo.row;
            const enemyOnBase = gameState.units.some(u => u.col === caster.col && u.row === enemyBaseRow && u.side === enemySide && u.life > 0);
            if (enemyOnBase) { showToast(`敌方城池有敌人，需先消灭敌人才能攻击本体`); return false; }
            if (caster.isCharging) { showToast(`已经在蓄力中`); return false; }
            if (caster.attacksLeftThisTurn <= 0) { showToast(`本回合已经行动过`); return false; }
            if (caster.stun > 0) { showToast(`眩晕无法蓄力`); return false; }
            if (caster.skillUsedThisTurn) { showToast(`本回合已经使用过技能`); return false; }
            caster.isCharging = true;
            caster.chargeTargetId = null;
            caster.chargeIsBase = true;
            caster.chargeBaseSide = targetInfo.side;
            caster.attacksLeftThisTurn--;
            caster.skillUsedThisTurn = true;
            addLog(`${caster.cardName} 开始蓄力，锁定敌方本体，下回合自动攻击。`);
            showToast(`⚡ 斧兵蓄力攻击本体`);
            clearSkillTarget();
            renderUI();
            return true;
        } else if (targetInfo.type === 'unit') {
            let actualTarget = enforceAxemanTarget(caster, targetInfo.unit);
            if (actualTarget.side === caster.side) { showToast(`只能对敌方单位使用`); return false; }
            const isSameCell = actualTarget.row === caster.row && actualTarget.col === caster.col;
            if (!isSameCell && (actualTarget.row !== expectedRow || actualTarget.col !== caster.col)) { showToast(`目标不在正前方1格内，无法蓄力`); return false; }
            if (caster.isCharging) { showToast(`已经在蓄力中`); return false; }
            if (caster.attacksLeftThisTurn <= 0) { showToast(`本回合已经行动过`); return false; }
            if (caster.stun > 0) { showToast(`眩晕无法蓄力`); return false; }
            if (caster.skillUsedThisTurn) { showToast(`本回合已经使用过技能`); return false; }
            caster.isCharging = true;
            caster.chargeTargetId = actualTarget.id;
            caster.chargeIsBase = false;
            caster.attacksLeftThisTurn--;
            caster.skillUsedThisTurn = true;
            addLog(`${caster.cardName} 开始蓄力，锁定目标 ${actualTarget.cardName}，下回合自动攻击。`);
            showToast(`⚡ 斧兵蓄力中`);
            clearSkillTarget();
            renderUI();
            return true;
        }
        return false;
    }
    async function resolveAxemanCharge(unit) {
        if (!unit.isCharging) return;
        if (unit.stun > 0) {
            addLog(`${unit.cardName} 处于眩晕，蓄力攻击失效。`);
            showToast(`😵 眩晕打断蓄力`);
            unit.isCharging = false;
            unit.chargeTargetId = null;
            unit.chargeIsBase = false;
            return;
        }
        if (unit.chargeIsBase) {
            const enemySide = unit.chargeBaseSide;
            const enemyBaseRow = enemySide === 0 ? 4 : 0;
            const enemyOnBase = gameState.units.some(u => u.col === unit.col && u.row === enemyBaseRow && u.side === enemySide && u.life > 0);
            if (enemyOnBase) {
                addLog(`${unit.cardName} 蓄力攻击本体时发现城池有敌人，改为攻击城池敌人！`);
                const baseEnemy = gameState.units.find(u => u.col === unit.col && u.row === enemyBaseRow && u.side === enemySide && u.life > 0);
                if (baseEnemy) {
                    unit.isCharging = false;
                    unit.chargeTargetId = null;
                    unit.chargeIsBase = false;
                    unit.attacksLeftThisTurn = 1;
                    unit._skipAutoCharge = true;
                    try { await performAttack(unit, baseEnemy); } finally { unit._skipAutoCharge = false; }
                    unit.skillCooldown = 4;
                    return;
                }
            }
            if (enemySide !== undefined && gameState.players[enemySide]) {
                let dmg = unit.dmgValue;
                if (unit.tempAttackBonus > 0 && canApplyBonus(unit, 'physical')) dmg += unit.tempAttackBonus;
                if (unit.nextAttackBonus > 0 && canApplyBonus(unit, 'physical')) { dmg += unit.nextAttackBonus; unit.nextAttackBonus = 0; }
                if (unit.nextAttackDouble && canApplyBonus(unit, 'physical')) { dmg = dmg * 2; unit.nextAttackDouble = false; }
                gameState.players[enemySide].hp -= dmg;
                if (gameState.matchStats?.unitDamage) {
                    const k = unit.cardName;
                    if (!gameState.matchStats.unitDamage[k]) gameState.matchStats.unitDamage[k] = { damage: 0, side: unit.side };
                    gameState.matchStats.unitDamage[k].damage += dmg;
                }
                addLog(`${unit.cardName} 蓄力攻击敌方本体造成 ${dmg} 伤害！剩余❤️ ${gameState.players[enemySide].hp}`);
                showToast(`⚡ 斧兵蓄力攻击本体造成 ${dmg} 伤害`);
                if (gameState.players[enemySide].hp <= 0) {
                    addLog(`🎉 游戏结束！ ${unit.side === 0 ? "蓝方" : "红方"} 胜利！`);
                    await showRecapPanel(unit.side);
                    await startGame();
                    return;
                }
            } else {
                addLog(`${unit.cardName} 蓄力目标本体已失效，攻击失效。`);
            }
        } else {
            const target = gameState.units.find(u => u.id === unit.chargeTargetId);
            if (!target) {
                addLog(`${unit.cardName} 蓄力目标已消失，攻击失效。`);
                unit.isCharging = false;
                unit.chargeTargetId = null;
                return;
            }
            addLog(`${unit.cardName} 蓄力完成，攻击 ${target.cardName}！`);
            unit.isCharging = false;
            unit.chargeTargetId = null;
            unit.chargeIsBase = false;
            unit.attacksLeftThisTurn = 1;
            unit._skipAutoCharge = true;
            try { await performAttack(unit, target); } finally { unit._skipAutoCharge = false; }
            showToast(`⚡ 斧兵蓄力攻击释放`);
        }
        unit.isCharging = false;
        unit.chargeTargetId = null;
        unit.chargeIsBase = false;
        unit.skillCooldown = 4;
    }

    // ========== 弩手蓄力机制 ==========
    function applyCrossbowChargeTarget(caster, targetInfo) {
        if (!targetInfo) return false;
        const forward = getForwardDelta(caster.side);
        if (targetInfo.type === 'base') {
            const ownCastle = getOwnCastleRow(caster.side);
            const enemyCastleRow = ownCastle === 4 ? 0 : 4;
            const enemyCastleFrontRow = ownCastle === 4 ? 1 : 3;
            if (caster.row !== enemyCastleFrontRow) { showToast(`必须到敌方城下才能攻击本体`); return false; }
            if (targetInfo.col !== caster.col) { showToast(`只能攻击正前方同列的本体`); return false; }
            const enemySide = caster.side === 0 ? 1 : 0;
            const enemyOnBase = gameState.units.some(u => u.col === caster.col && u.row === enemyCastleRow && u.side === enemySide && u.life > 0);
            if (enemyOnBase) { showToast(`敌方城池有敌人，需先消灭敌人才能攻击本体`); return false; }
            if (caster.isCharging) { showToast(`已经在蓄力中`); return false; }
            caster.isCharging = true;
            caster.chargeTargetId = null;
            caster.chargeIsBase = true;
            caster.chargeBaseSide = targetInfo.side;
            caster.attacksLeftThisTurn--;
            caster.skillUsedThisTurn = true;
            addLog(`${caster.cardName} 开始蓄力，锁定敌方本体，下回合自动攻击。`);
            showToast(`🏹 弩手蓄力攻击本体`);
            clearSkillTarget();
            renderUI();
            return true;
        } else if (targetInfo.type === 'unit') {
            const actualTarget = enforceAttackTarget(caster, targetInfo.unit);
            if (actualTarget.side === caster.side) { showToast(`只能对敌方单位使用`); return false; }
            const dirDist = (actualTarget.row - caster.row) * forward;
            if (dirDist < 0) { showToast(`只能攻击正前方同列敌人`); return false; }
            const distance = Math.abs(actualTarget.row - caster.row);
            if (distance > caster.range) { showToast(`目标距离超过射程(最大${caster.range})`); return false; }
            if (actualTarget.col !== caster.col) { showToast(`只能攻击正前方同列敌人`); return false; }
            const isSameCell = actualTarget.row === caster.row && actualTarget.col === caster.col;
            if (!isSameCell) {
                const step = forward;
                let nearestRow = caster.row + step;
                if (nearestRow !== actualTarget.row) {
                    let blocked = false;
                    for (let r = nearestRow; r !== actualTarget.row && r >= 0 && r <= 4; r += step) {
                        if (gameState.units.some(u => u.col === caster.col && u.row === r && u.side !== caster.side)) { blocked = true; break; }
                    }
                    if (blocked) { showToast(`有更近的敌人挡在前面`); return false; }
                }
            }
            if (caster.isCharging) { showToast(`已经在蓄力中`); return false; }
            caster.isCharging = true;
            caster.chargeTargetId = actualTarget.id;
            caster.chargeIsBase = false;
            caster.attacksLeftThisTurn--;
            caster.skillUsedThisTurn = true;
            addLog(`${caster.cardName} 开始蓄力，锁定目标 ${actualTarget.cardName}，下回合自动攻击。`);
            showToast(`🏹 弩手蓄力中`);
            clearSkillTarget();
            renderUI();
            return true;
        }
        return false;
    }
    async function resolveCrossbowCharge(unit) {
        if (!unit.isCharging) return;
        if (unit.stun > 0) {
            addLog(`${unit.cardName} 处于眩晕，蓄力攻击失效。`);
            showToast(`😵 眩晕打断蓄力`);
            unit.isCharging = false;
            unit.chargeTargetId = null;
            unit.chargeIsBase = false;
            return;
        }
        if (unit.chargeIsBase) {
            const enemySide = unit.chargeBaseSide;
            const enemyBaseRow = enemySide === 0 ? 4 : 0;
            const enemyOnBase = gameState.units.some(u => u.col === unit.col && u.row === enemyBaseRow && u.side === enemySide && u.life > 0);
            if (enemyOnBase) {
                addLog(`${unit.cardName} 蓄力攻击本体时发现城池有敌人，改为攻击城池敌人！`);
                const baseEnemy = gameState.units.find(u => u.col === unit.col && u.row === enemyBaseRow && u.side === enemySide && u.life > 0);
                if (baseEnemy) {
                    unit.isCharging = false;
                    unit.chargeTargetId = null;
                    unit.chargeIsBase = false;
                    unit.attacksLeftThisTurn = 1;
                    unit._skipAutoCharge = true;
                    try { await performAttack(unit, baseEnemy); } finally { unit._skipAutoCharge = false; }
                    unit.skillCooldown = 2;
                    return;
                }
            }
            if (enemySide !== undefined && gameState.players[enemySide]) {
                let dmg = unit.dmgValue;
                if (unit.tempAttackBonus > 0 && canApplyBonus(unit, 'physical')) dmg += unit.tempAttackBonus;
                if (unit.nextAttackBonus > 0 && canApplyBonus(unit, 'physical')) { dmg += unit.nextAttackBonus; unit.nextAttackBonus = 0; }
                if (unit.nextAttackDouble && canApplyBonus(unit, 'physical')) { dmg = dmg * 2; unit.nextAttackDouble = false; }
                gameState.players[enemySide].hp -= dmg;
                if (gameState.matchStats?.unitDamage) {
                    const k = unit.cardName;
                    if (!gameState.matchStats.unitDamage[k]) gameState.matchStats.unitDamage[k] = { damage: 0, side: unit.side };
                    gameState.matchStats.unitDamage[k].damage += dmg;
                }
                addLog(`${unit.cardName} 蓄力攻击敌方本体造成 ${dmg} 伤害！剩余❤️ ${gameState.players[enemySide].hp}`);
                showToast(`🏹 弩手蓄力攻击本体造成 ${dmg} 伤害`);
                if (gameState.players[enemySide].hp <= 0) {
                    addLog(`🎉 游戏结束！ ${unit.side === 0 ? "蓝方" : "红方"} 胜利！`);
                    await showRecapPanel(unit.side);
                    await startGame();
                    return;
                }
            } else {
                addLog(`${unit.cardName} 蓄力目标本体已失效，攻击失效。`);
            }
        } else {
            const target = gameState.units.find(u => u.id === unit.chargeTargetId);
            if (!target) {
                addLog(`${unit.cardName} 蓄力目标已消失，攻击失效。`);
                unit.isCharging = false;
                unit.chargeTargetId = null;
                return;
            }
            addLog(`${unit.cardName} 蓄力完成，攻击 ${target.cardName}！`);
            unit.isCharging = false;
            unit.chargeTargetId = null;
            unit.chargeIsBase = false;
            unit.attacksLeftThisTurn = 1;
            unit._skipAutoCharge = true;
            try { await performAttack(unit, target); } finally { unit._skipAutoCharge = false; }
            showToast(`🏹 弩手蓄力攻击释放`);
        }
        unit.isCharging = false;
        unit.chargeTargetId = null;
        unit.chargeIsBase = false;
        unit.skillCooldown = 2;
    }

    // ========== 双剑横扫格子计算（声明式引擎调用）==========
    function calcDualswordAOECells(unit) {
        const forward = getForwardDelta(unit.side);
        const targets = [];
        for (let dr = 2; dr <= 3; dr++) {
            const dc = 3 - dr;
            const r = unit.row + dr * forward;
            if (r >= 0 && r <= 4) {
                if (unit.col + dc >= 0 && unit.col + dc <= 2) targets.push({ row: r, col: unit.col + dc });
                if (dc > 0 && unit.col - dc >= 0 && unit.col - dc <= 2) targets.push({ row: r, col: unit.col - dc });
            }
        }
        return targets;
    }

    // ========== 纱琳定身格检查（位移后调用）==========
    function applyShaLinCellBinding(unit) {
        if (unit.life <= 0) return;
        if (unit.absoluteImmunityTurns > 0) return;
        if (unit.superCharging) return;
        if (isFireImmune(unit)) return;
        const cell = gameState.shaLinBoundCells.find(c => c.row === unit.row && c.col === unit.col && c.turnsLeft > 0);
        if (!cell) return;
        if (unit.side === cell.side) return;
        if (unit.shaLinBindTurn > 0) return;
        unit.shaLinBindTurn = cell.turnsLeft;
        unit.shaLinBindRow = unit.row;
        unit.shaLinBindCol = unit.col;
        unit.displacedByAllySkillThisTurn = false;
        addLog(`🪞 ${unit.cardName} 走入定身格，被定身！`);
        showToast(`🪞 ${unit.cardName} 被定身！`);
    }

    // ========== 重斧兵超级蓄力机制 ==========
    function applyHeavyAxemanChargeTarget(caster, targetInfo) {
        if (!targetInfo) return false;
        if (caster.superCharging) { showToast(`已经在蓄力中`); return false; }
        if (caster.attacksLeftThisTurn <= 0) { showToast(`本回合已经行动过`); return false; }
        if (caster.stun > 0) { showToast(`眩晕无法蓄力`); return false; }
        if (caster.skillUsedThisTurn) { showToast(`本回合已经使用过技能`); return false; }
        const forward = getForwardDelta(caster.side);
        const expectedRow = caster.row + forward;
        if (targetInfo.type === 'base') {
            if (expectedRow !== targetInfo.row || caster.col !== targetInfo.col) { showToast(`目标不在正前方1格内`); return false; }
            const enemySide = targetInfo.side;
            const enemyBaseRow = targetInfo.row;
            const enemyOnBase = gameState.units.some(u => u.col === caster.col && u.row === enemyBaseRow && u.side === enemySide && u.life > 0);
            if (enemyOnBase) { showToast(`敌方城池有敌人，需先消灭敌人才能攻击本体`); return false; }
            _startHeavyAxemanCharge(caster, null, true, targetInfo.side);
            return true;
        }
        let actualTarget = enforceAxemanTarget(caster, targetInfo.unit);
        if (actualTarget.side === caster.side) { showToast(`只能对敌方单位使用`); return false; }
        const isSameCell = actualTarget.row === caster.row && actualTarget.col === caster.col;
        if (!isSameCell && (actualTarget.row !== expectedRow || actualTarget.col !== caster.col)) { showToast(`目标不在正前方1格内`); return false; }
        _startHeavyAxemanCharge(caster, actualTarget.id, false, null);
        return true;
    }
    function _startHeavyAxemanCharge(caster, targetId, isBase, baseSide) {
        caster.superCharging = true;
        caster.superChargeTurnsLeft = 2;
        caster.superChargeTargetId = targetId;
        caster.superChargeIsBase = isBase;
        caster.superChargeBaseSide = baseSide;
        caster.attacksLeftThisTurn--;
        caster.skillUsedThisTurn = true;
        caster.stun = 0;
        caster.silenced = 0;
        const targetName = isBase ? "敌方本体" : (gameState.units.find(u => u.id === targetId) || {}).cardName || "目标";
        addLog(`${caster.cardName} 开始超级蓄力，锁定${targetName}，2回合后自动攻击，蓄力期间霸体（免疫控制）。`);
        showToast(`⚡⚡ 蓄力中（${caster.superChargeTurnsLeft}回合）霸体`);
        clearSkillTarget();
        renderUI();
    }
    async function resolveHeavyAxemanCharge(unit) {
        if (!unit.superCharging) return;
        unit.superChargeTurnsLeft--;
        addLog(`${unit.cardName} 超级蓄力剩余 ${unit.superChargeTurnsLeft} 回合`);
        if (unit.superChargeTurnsLeft === 0) {
            if (unit.superChargeIsBase) {
                const enemySide = unit.superChargeBaseSide;
                const enemyBaseRow = enemySide === 0 ? 4 : 0;
                const enemyOnBase = gameState.units.some(u => u.col === unit.col && u.row === enemyBaseRow && u.side === enemySide && u.life > 0);
                if (enemyOnBase) {
                    addLog(`${unit.cardName} 超级蓄力攻击本体时发现城池有敌人，改为攻击城池敌人！`);
                    const baseEnemy = gameState.units.find(u => u.col === unit.col && u.row === enemyBaseRow && u.side === enemySide && u.life > 0);
                    if (baseEnemy) {
                        unit.superCharging = false;
                        unit.superChargeTargetId = null;
                        unit.superChargeIsBase = false;
                        unit.attacksLeftThisTurn = 1;
                        unit._skipAutoCharge = true;
                        try { await performAttack(unit, baseEnemy); } finally { unit._skipAutoCharge = false; }
                        unit.skillCooldown = 2;
                        return;
                    }
                }
                if (unit.superChargeBaseSide !== undefined && gameState.players[unit.superChargeBaseSide]) {
                    let dmg = unit.dmgValue;
                    if (unit.tempAttackBonus > 0 && canApplyBonus(unit, 'physical')) dmg += unit.tempAttackBonus;
                    if (unit.nextAttackBonus > 0 && canApplyBonus(unit, 'physical')) { dmg += unit.nextAttackBonus; unit.nextAttackBonus = 0; }
                    if (unit.nextAttackDouble && canApplyBonus(unit, 'physical')) { dmg = dmg * 2; unit.nextAttackDouble = false; }
                    gameState.players[unit.superChargeBaseSide].hp -= dmg;
                    if (gameState.matchStats?.unitDamage) {
                        const k = unit.cardName;
                        if (!gameState.matchStats.unitDamage[k]) gameState.matchStats.unitDamage[k] = { damage: 0, side: unit.side };
                        gameState.matchStats.unitDamage[k].damage += dmg;
                    }
                    addLog(`${unit.cardName} 超级蓄力攻击敌方本体造成 ${dmg} 伤害！剩余❤️ ${gameState.players[unit.superChargeBaseSide].hp}`);
                    showToast(`⚡⚡ 蓄力攻击本体 -${dmg}`);
                    if (gameState.players[unit.superChargeBaseSide].hp <= 0) {
                        addLog(`🎉 游戏结束！ ${unit.side === 0 ? "蓝方" : "红方"} 胜利！`);
                        await showRecapPanel(unit.side);
                        await startGame(); return;
                    }
                }
            } else {
                const target = gameState.units.find(u => u.id === unit.superChargeTargetId);
                if (target) {
                    addLog(`${unit.cardName} 超级蓄力完成，攻击 ${target.cardName}！`);
                    unit.superCharging = false;
                    unit.superChargeTargetId = null;
                    unit.superChargeIsBase = false;
                    unit.attacksLeftThisTurn = 1;
                    unit._skipAutoCharge = true;
                    try { await performAttack(unit, target); } finally { unit._skipAutoCharge = false; }
                    showToast(`⚡⚡ 蓄力攻击释放`);
                }
                else { addLog(`${unit.cardName} 超级蓄力目标已消失`); }
            }
            unit.superCharging = false;
            unit.superChargeTargetId = null;
            unit.superChargeIsBase = false;
            unit.skillCooldown = 2;
        }
    }

    // ========== 手牌技能：无中生有 ==========
    async function useWuzhong(side, cardIdx) {
        if (side !== gameState.turn) { showToast("不是你的回合"); return false; }
        const card = gameState.players[side].hand[cardIdx];
        if (!card || card.name !== "无中生有") { showToast("无效的手牌"); return false; }
        if (card.disabled) { showToast(`此手牌已被禁卫禁用，无法使用`); return false; }
        const cost = Math.max(0, card.cost + (gameState.kingCostMod[side] || 0));
        if (!infiniteManaEnabled && gameState.players[side].mana < cost) { showToast(`费用不足，需要 ${cost}`); return false; }
        const confirmed = await showConfirm(`确定使用"无中生有"吗？将消耗 ${cost} 费，随机获得两张卡组中的牌。`);
        if (!confirmed) return false;
        const deck = gameState.players[side].deck;
        if (deck.length === 0) { showToast("卡组中没有牌了"); return false; }
        if (!infiniteManaEnabled) gameState.players[side].mana -= cost;
        addLog(`✨ 无中生有：消耗 ${cost} 费，从卡组中抽取 ${Math.min(2, deck.length)} 张牌。`);
        const drawCount = Math.min(2, deck.length);
        const drawnCards = [];
        for (let i = 0; i < drawCount; i++) {
            const rIdx = Math.floor(Math.random() * deck.length);
            drawnCards.push(deck.splice(rIdx, 1)[0]);
        }
        addLog(`✨ 无中生有：抽到了 ${drawnCards.map(c => c.name).join("、")}`);
        showToast(`✨ 无中生有（-${cost}费）`);
        gameState.players[side].hand.splice(cardIdx, 1);
        if (gameState.selectedCardIdx === cardIdx) gameState.selectedCardIdx = -1;
        else if (gameState.selectedCardIdx > cardIdx) gameState.selectedCardIdx--;
        for (let c of drawnCards) {
            gameState.players[side].hand.push({...c, disabled: false, disabledBy: null, disabledTurns: 0});
        }
        while (gameState.players[side].hand.length > gameState.players[side].handMax) {
            if (aiActing && side === aiSide && typeof aiSelectDiscard === 'function') {
                const aiIdx = aiSelectDiscard(side, null);
                const removed = gameState.players[side].hand.splice(aiIdx, 1)[0];
                addLog(`🤖 AI 弃掉了 ${removed.name}（手牌超上限）`);
                if (gameState.selectedCardIdx >= gameState.players[side].hand.length) gameState.selectedCardIdx = -1;
                continue;
            }
            const options = gameState.players[side].hand.map((c, i) => `${i+1}. ${c.name} (${c.cost}费)`);
            const discardIdx = await showSelect(options, `手牌超上限(${gameState.players[side].handMax})，请选择一张弃掉`, { forceShow: true });
            if (discardIdx === -1) {
                gameState.players[side].hand.pop();
                addLog("自动弃掉最后一张手牌");
            } else {
                const removed = gameState.players[side].hand.splice(discardIdx, 1)[0];
                addLog(`弃掉了 ${removed.name}`);
                if (gameState.selectedCardIdx >= gameState.players[side].hand.length) gameState.selectedCardIdx = -1;
            }
        }
        renderUI();
        return true;
    }

    // ========== 手牌技能：鼠疫 ==========
    function usePlague(side, cardIdx) {
        if (side !== gameState.turn) { showToast("不是你的回合"); return false; }
        const card = gameState.players[side].hand[cardIdx];
        if (!card || card.name !== "鼠疫") { showToast("无效的手牌"); return false; }
        if (card.disabled) { showToast(`此手牌已被禁卫禁用，无法使用`); return false; }
        const cost = Math.max(0, card.cost + (gameState.kingCostMod[side] || 0));
        if (!infiniteManaEnabled && gameState.players[side].mana < cost) { showToast(`费用不足，需要 ${cost}`); return false; }
        gameState.awaitingSkillTarget = true;
        gameState.skillCasterId = null;
        gameState.skillType = "plagueCell";
        gameState.plagueCardIdx = cardIdx;
        gameState.plagueCasterSide = side;
        gameState.selectedCardIdx = -1;
        addLog(`☣️ ${side === 0 ? "蓝方" : "红方"} 准备使用鼠疫，请点击场上一格`);
        showToast(`☣️ 请选择鼠疫感染格`);
        renderUI();
        return true;
    }

    function applyPlagueCell(row, col) {
        const side = gameState.plagueCasterSide;
        const cardIdx = gameState.plagueCardIdx;
        if (side === null || side === undefined || cardIdx < 0) { clearSkillTarget(); renderUI(); return false; }
        const card = gameState.players[side].hand[cardIdx];
        if (!card || card.name !== "鼠疫") { showToast("鼠疫手牌不存在"); clearSkillTarget(); renderUI(); return false; }
        const cost = Math.max(0, card.cost + (gameState.kingCostMod[side] || 0));
        if (!infiniteManaEnabled && gameState.players[side].mana < cost) { showToast(`费用不足，需要 ${cost}`); clearSkillTarget(); renderUI(); return false; }
        const enemies = getUnitsAt(row, col).filter(u => u.side !== side);
        if (enemies.length === 0) { showToast(`该格没有敌方单位`); return false; }
        let infected = 0, skipped = 0;
        for (let enemy of enemies) {
            if (enemy.plagueInfected) { skipped++; continue; }
            enemy.plagueInfected = true;
            enemy.plagueOwnerSide = side;
            infected++;
        }
        if (infected === 0) { showToast(`该格敌人已感染鼠疫`); return false; }
        if (!infiniteManaEnabled) gameState.players[side].mana -= cost;
        gameState.players[side].hand.splice(cardIdx, 1);
        if (gameState.selectedCardIdx === cardIdx) gameState.selectedCardIdx = -1;
        else if (gameState.selectedCardIdx > cardIdx) gameState.selectedCardIdx--;
        addLog(`☣️ 鼠疫感染 ${ROW_NAMES[row]}${COLS[col]} 的 ${infected} 个敌人${skipped ? `（${skipped}个已感染，跳过）` : ""}`);
        showToast(`☣️ 感染 ${infected} 个敌人`);
        clearSkillTarget();
        renderUI();
        return true;
    }

    // ========== 戟兵蓄力横扫释放 ==========
    // 在下个我方回合开始时自动调用（game-flow.js startTurn）
    async function resolveHalberdierCharge(unit) {
        if (!unit.halberdierCharging) return;
        unit.halberdierCharging = false;
        unit.halberdierSkillUsed = true;

        // 眩晕检查：蓄力被打断
        if (unit.stun > 0) {
            addLog(`${unit.cardName} 处于眩晕，蓄力横扫失效。`);
            showToast(`😵 眩晕打断蓄力横扫`);
            return;
        }

        const forward = getForwardDelta(unit.side);
        const frontRow = unit.row + forward;
        if (frontRow < 0 || frontRow > 4) {
            addLog(`${unit.cardName} 蓄力横扫前方无有效横行，攻击失效。`);
            showToast(`⚔️ 横扫落空`);
            return;
        }

        // 弱化检查：伤害无效
        if (unit.weakenedTurns > 0) {
            addLog(`📉 ${unit.cardName} 被弱化，蓄力横扫伤害无效！`);
            showToast(`📉 横扫伤害无效`);
            return;
        }

        const targets = gameState.units.filter(u => u.row === frontRow && u.side !== unit.side && u.life > 0);
        if (targets.length === 0) {
            addLog(`${unit.cardName} 蓄力横扫完成，但前方横行没有敌人。`);
            showToast(`⚔️ 横扫落空`);
            return;
        }

        addLog(`⚔️ ${unit.cardName} 蓄力横扫释放！对前一横行所有敌人造成3真伤！`);
        showToast(`⚔️ 戟兵横扫！3真伤`);
        for (let t of targets) {
            if (t.absoluteImmunityTurns > 0) {
                addLog(`  ${t.cardName} 处于绝对免疫，免疫横扫伤害`);
                continue;
            }
            const source = { cardName: unit.cardName, side: unit.side, dmgType: "⚔️", row: unit.row, col: unit.col, id: unit.id, fromSkill: true };
            await applyDamageWithSource(t, 3, source, true, "⚔️");
            // 追踪伤害统计
            if (gameState.matchStats?.unitDamage) {
                const k = unit.cardName;
                if (!gameState.matchStats.unitDamage[k]) gameState.matchStats.unitDamage[k] = { damage: 0, side: unit.side };
                gameState.matchStats.unitDamage[k].damage += 3;
            }
            addLog(`  ${t.cardName} 受到3点真伤（剩余❤️${Math.max(0, t.life)}）`);
        }
    }

    // ========== 反击兵蓄势反击爆炸 ==========
    async function resolveCounterBrace(unit) {
        if (!unit.braceActive) return;
        unit.braceActive = false;
        unit.braceShield = 0;
        const targets = gameState.units.filter(u =>
            u.side !== unit.side && u.life > 0 &&
            Math.abs(u.row - unit.row) <= 1 && Math.abs(u.col - unit.col) <= 1
        );
        if (targets.length === 0) {
            addLog(`💢 ${unit.cardName} 蓄势反击爆炸，但周围没有敌方单位。`);
            showToast(`💢 蓄势反击爆炸`);
            return;
        }
        addLog(`💢 ${unit.cardName} 蓄势反击爆炸！对周围 ${targets.length} 个敌人造成1点法伤！`);
        showToast(`💢 蓄势反击爆炸！`);
        for (let t of targets) {
            if (t.absoluteImmunityTurns > 0) {
                addLog(`  ${t.cardName} 处于绝对免疫，免疫爆炸伤害`);
                continue;
            }
            const source = { cardName: unit.cardName, side: unit.side, dmgType: "🔮", row: unit.row, col: unit.col, id: unit.id, fromSkill: true };
            await applyDamageWithSource(t, 1, source, false, "🔮");
        }
    }

    // ========== 双剑自动蓄力横扫（普通攻击形式）==========
    // 点击攻击敌人时自动进入蓄力，下个我方回合自动释放AOE
    async function autoDualswordCharge(attacker, targetUnit) {
        // 基本检查
        if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法蓄力`); return false; }
        if (attacker.isSweepCharging) { showToast(`${attacker.cardName} 已经在蓄力中`); return false; }
        if (attacker.skillCooldown > 0) { showToast(`双剑横扫冷却中，还需${Math.ceil(attacker.skillCooldown/2)}大回合`); return false; }
        if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经行动过`); return false; }
        if (attacker.silenced > 0) { showToast(`${attacker.cardName} 被沉默，无法蓄力`); return false; }
        if (attacker.eagleEyeTurns > 0) { showToast(`${attacker.cardName} 被致盲，蓄力失效`); return false; }

        // 验证目标是敌方
        let actualTarget = enforceAttackTarget(attacker, targetUnit);
        if (actualTarget.side === attacker.side) { showToast(`只能对敌方使用`); return false; }

        // 计算AOE格子
        const targets = calcDualswordAOECells(attacker);
        if (targets.length === 0) {
            showToast(`当前位置无法横扫到任何格子`);
            return false;
        }

        // 设置延迟攻击
        if (!gameState.dualswordDelayedAttacks) gameState.dualswordDelayedAttacks = [];
        gameState.dualswordDelayedAttacks.push({
            cells: targets.map(c => ({ row: c.row, col: c.col })),
            side: attacker.side, turnsLeft: 1,
            fromUnit: attacker.cardName, fromUnitId: attacker.id
        });

        attacker.isSweepCharging = true;
        attacker.skillCooldown = 2;
        attacker.attacksLeftThisTurn--;
        attacker.skillUsedThisTurn = true;

        // 高亮AOE格子供UI显示
        gameState.dualswordAOEHighlight = targets;

        addLog(`⚔️ ${attacker.cardName} 开始蓄力横扫，锁定前方${targets.length}个格子，下个我方回合自动释放AOE！`);
        showToast(`⚔️ 双剑蓄力中...`);

        clearSkillTarget();
        renderUI();
        return true;
    }

    // ========== 标枪手突刺（强化普攻）==========
    // 消耗1次强化普攻：+1物伤，向前突进1格并对前一格所有敌人造成AOE伤害
    // 击杀后本回合普攻次数刷新
    async function performSpearmanThrustEffect(caster) {
        // 强化普攻（突刺）不属于普通攻击，不继承/触发苍鹰之羽的首击必中
        caster._guaranteedAttack = false;
        const forward = getForwardDelta(caster.side);

        // 尝试向前突进1格
        const dashRow = caster.row + forward;
        let dashed = false;
        if (dashRow >= 0 && dashRow <= 4) {
            // 不能突进到敌方城池行
            const isEnemyCastle = (caster.side === SIDE_PLAYER0 && dashRow === 0) || (caster.side === SIDE_PLAYER1 && dashRow === 4);
            if (!isEnemyCastle) {
                // 前方格有敌方单位时不能突进
                const hasEnemy = gameState.units.some(u => u.row === dashRow && u.col === caster.col && u.side !== caster.side && u.life > 0);
                // 前方格己方已满时不能突进
                const cellFull = !canAddUnit(dashRow, caster.col, caster.side);
                if (!hasEnemy && !cellFull) {
                    caster.row = dashRow;
                    dashed = true;
                    addLog(`🔱 ${caster.cardName} 突进至 ${ROW_NAMES[dashRow]}${COLS[caster.col]}！`);
                    showToast(`🔱 ${caster.cardName} 突进！`);
                    applyShaLinCellBinding(caster);
                }
            }
        }
        if (!dashed) {
            addLog(`🔱 ${caster.cardName} 无法突进，原地释放突刺。`);
        }

        // 弱化检查：突进正常发生，但伤害无效
        if (caster.weakenedTurns > 0) {
            addLog(`📉 ${caster.cardName} 被弱化，突刺伤害无效！`);
            showToast(`📉 突刺伤害无效`);
            return;
        }

        // 计算突进后（或原地）的前一格
        const frontRow = caster.row + forward;
        const frontCol = caster.col;

        if (frontRow < 0 || frontRow > 4) {
            addLog(`🔱 ${caster.cardName} 突刺完成，但前方无有效格子。`);
            showToast(`🔱 突刺落空`);
            return;
        }

        // 判断前方是否为敌方城池行
        const enemyCastleRow = caster.side === SIDE_PLAYER0 ? 0 : 4;
        const isFrontCastle = (frontRow === enemyCastleRow);

        // 找到前一格所有敌方单位
        const enemies = gameState.units.filter(u => u.row === frontRow && u.col === frontCol && u.side !== caster.side && u.life > 0);

        // 前方既没有敌人也不是城池 → 落空
        if (enemies.length === 0 && !isFrontCastle) {
            addLog(`🔱 ${caster.cardName} 突刺完成，但前方没有敌人。`);
            showToast(`🔱 突刺落空`);
            return;
        }

        // 有敌方单位时只攻击单位，没有单位时才攻击本体
        if (enemies.length > 0) {
            // 计算伤害：基础物伤 + 1（突刺加成）+ 其他增伤
            let dmg = caster.dmgValue + 1;
            if (caster.tempAttackBonus > 0 && canApplyBonus(caster, 'physical')) { dmg += caster.tempAttackBonus; addLog(`${caster.cardName} 受到鼓手鼓舞，伤害+${caster.tempAttackBonus}！`); }
            if (caster.nextAttackBonus > 0 && canApplyBonus(caster, 'physical')) { dmg += caster.nextAttackBonus; addLog(`${caster.cardName} 受到祭献加成，伤害+${caster.nextAttackBonus}！`); caster.nextAttackBonus = 0; }
            const shouldDouble = caster.nextAttackDouble && canApplyBonus(caster, 'physical');
            if (shouldDouble) { dmg = dmg * 2; caster.nextAttackDouble = false; addLog(`${caster.cardName} 触发酒类强化，伤害翻倍至 ${dmg}！`); }
            const { bonus: auraBonus } = applyAifeiAura(caster, true, "⚔️");
            if (auraBonus > 0 && canApplyBonus(caster, 'physical')) dmg += auraBonus;

            addLog(`🔱 ${caster.cardName} 突刺！对前一格 ${enemies.length} 个敌人造成 ${dmg} 物伤！`);
            showToast(`🔱 突刺！${dmg}伤害`);

            // 对所有敌方单位造成AOE伤害，逐个检测击杀（含守卫/盾兵代为承受导致的击杀）
            const source = { cardName: caster.cardName, side: caster.side, dmgType: "⚔️", row: caster.row, col: caster.col, id: caster.id, life: caster.life };
            let killedCount = 0;
            for (let e of [...enemies]) {
                const enemyId = e.id;
                const enemySide = e.side;
                // 记录此次伤害前该方存活单位数
                const countBefore = gameState.units.filter(u => u.side === enemySide && u.life > 0).length;
                await applyDamageWithSource(e, dmg, source, false, "⚔️");
                // 对比此次伤害后该方存活单位数，减少则表示标枪手此次攻击造成了击杀
                const countAfter = gameState.units.filter(u => u.side === enemySide && u.life > 0).length;
                if (countAfter < countBefore) killedCount++;
                if (!gameState.attackedEnemyIds.includes(enemyId)) gameState.attackedEnemyIds.push(enemyId);
            }

            // 击杀刷新：若造成击杀，本回合普攻次数刷新
            if (killedCount > 0) {
                const refreshVal = 1 + (caster.extraAttacks || 0) + (caster.riluoPlaced ? 1 : 0);
                caster.attacksLeftThisTurn = Math.max(caster.attacksLeftThisTurn, refreshVal);
                addLog(`🔱 ${caster.cardName} 击杀敌人，攻击次数刷新至 ${caster.attacksLeftThisTurn}！`);
                showToast(`🔱 击杀刷新攻击！`);
            }
            renderUI();  // 刷新后更新棋盘上的攻击次数显示
            return;
        }

        // 前方没有敌方单位但为敌方城池行 → 攻击本体
        let dmg = caster.dmgValue + 1;
        if (caster.tempAttackBonus > 0 && canApplyBonus(caster, 'physical')) { dmg += caster.tempAttackBonus; addLog(`${caster.cardName} 受到鼓手鼓舞，伤害+${caster.tempAttackBonus}！`); }
        if (caster.nextAttackBonus > 0 && canApplyBonus(caster, 'physical')) { dmg += caster.nextAttackBonus; addLog(`${caster.cardName} 受到祭献加成，伤害+${caster.nextAttackBonus}！`); caster.nextAttackBonus = 0; }
        const shouldDouble = caster.nextAttackDouble && canApplyBonus(caster, 'physical');
        if (shouldDouble) { dmg = dmg * 2; caster.nextAttackDouble = false; addLog(`${caster.cardName} 触发酒类强化，伤害翻倍至 ${dmg}！`); }
        const { bonus: auraBonus } = applyAifeiAura(caster, true, "⚔️");
        if (auraBonus > 0 && canApplyBonus(caster, 'physical')) dmg += auraBonus;

        const enemySide = caster.side === SIDE_PLAYER0 ? SIDE_PLAYER1 : SIDE_PLAYER0;
        gameState.players[enemySide].hp -= dmg;
        showFloatText(enemyCastleRow, frontCol, '-' + dmg, 'damage');
        flashCellHit(enemyCastleRow, frontCol);
        flashCellAttack(caster.row, caster.col);
        showAttackBeam(caster.row, caster.col, enemyCastleRow, frontCol);
        // 本体伤害贡献追踪
        if (gameState.matchStats && gameState.matchStats.unitDamage) {
            const key = caster.cardName;
            if (!gameState.matchStats.unitDamage[key]) gameState.matchStats.unitDamage[key] = { damage: 0, side: caster.side };
            gameState.matchStats.unitDamage[key].damage += dmg;
        }
        addLog(`🔱 ${caster.cardName} 突刺攻击敌方本体造成 ${dmg} 伤害！剩余❤️ ${gameState.players[enemySide].hp}`);
        showToast(`🔱 突刺本体！${dmg}伤害`);
        if (gameState.players[enemySide].hp <= 0) {
            addLog(`🎉 游戏结束！ ${caster.side === 0 ? "蓝方" : "红方"} 胜利！`);
            await showRecapPanel(caster.side);
            await startGame();
        }
        renderUI();
    }