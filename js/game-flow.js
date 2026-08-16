// ========== 游戏流程管理 ==========
// clearSkillTarget、recheckAllWeaponSmithBuffs、tryMoveUnit、
// placeUnit、startTurn、endTurn、showPrepickPanel、showSelect、showConfirm、showMessage


    // 清除技能目标（统一清理声明式技能状态）
    function clearSkillTarget() {
        gameState.awaitingSkillTarget = false;
        gameState.skillCasterId = null;
        gameState.skillType = null;
        gameState.declarativeSkillName = null;
        gameState.declarativeSelectMode = null;
        gameState.declarativeSelected = [];
        gameState.declarativeMaxSelect = 1;
        gameState.declarativeRange = 0;
        gameState.declarativeToggle = false;
        gameState.declarativeConfirmButton = false;
        gameState.declarativeStep = 1;
        gameState.declarativeFirstTarget = null;
        gameState.declarativeGridRow = null;
        gameState.declarativeGridCol = null;
        gameState.declarativeGridFilter = "any";
        gameState.declarativeWitchReduce = 0;
        gameState.declarativeZhanYueChoice = 0;
        gameState.dualswordAOEHighlight = null;
        gameState.plagueCardIdx = -1;
        gameState.plagueCasterSide = null;
    }

    // 武器商攻速加成：动态检查同格友方的buff状态
    function recheckAllWeaponSmithBuffs() {
        const side = gameState.turn;
        for (let u of gameState.units) {
            if (u.life <= 0 || u.cardName === "武器商" || u.side !== side) continue;
            const hasSmith = gameState.units.some(x =>
                x.side === u.side && x.row === u.row && x.col === u.col &&
                x.cardName === "武器商" && x.life > 0 && x.id !== u.id
            );
            if (hasSmith && !u.weaponSmithBoosted) {
                // 翻倍剩余攻击次数（0*2=0）
                u.attacksLeftThisTurn = (u.attacksLeftThisTurn || 0) * 2;
                u.weaponSmithBoosted = true;
                addLog(`${u.cardName} 受武器商加持，攻速×2！（本回合${u.attacksLeftThisTurn}次攻击）`);
                showToast(`⚔️ ${u.cardName} 武器商加持，攻速×2`);
            } else if (!hasSmith && u.weaponSmithBoosted) {
                // 离开武器商范围，不损失攻击次数
                u.weaponSmithBoosted = false;
                addLog(`${u.cardName} 离开武器商范围，攻速恢复（剩余${u.attacksLeftThisTurn}次攻击）`);
            }
        }
    }

    // 移动逻辑（攻击与移动独立）
    async function tryMoveUnit(unit, targetRow, targetCol) {
        // 新手教程：仅当前步骤允许移动时才放行
        if (typeof tutorialAllowAction === 'function' && !tutorialAllowAction('move')) { tutorialBlock('移动'); return false; }
        // 四眼仔行动干扰：消耗本方第一次控制单位的自主行动
        if (gameState.nerdJamPending[unit.side]) {
            gameState.nerdJamPending[unit.side] = false;
            addLog(`👓 行动干扰生效！${unit.cardName} 的移动被无效化！`);
            showToast(`👓 行动干扰！${unit.cardName} 的移动被无效化`);
            renderUI();
            return false;
        }
        if (unit.stun > 0) { showToast(`${unit.cardName} 眩晕无法移动`); return false; }
        if (unit.isCharging || unit.superCharging || unit.isSweepCharging || unit.motCharging) { showToast(`蓄力中无法移动`); return false; }
        if (unit.cardName === "军营" || unit.cardName === "稻草人") { showToast(`${unit.cardName} 不能移动`); return false; }
        if (unit.displacedByAllySkillThisTurn) { showToast(`${unit.cardName} 本回合已被友方技能位移，不能再移动`); return false; }
        if (unit.movesLeftThisTurn !== undefined && unit.movesLeftThisTurn <= 0) {
            showToast(`${unit.cardName} 本回合移动次数已用完`);
            return false;
        }
        if (unit.shaLinBindTurn > 0 && (targetRow !== unit.shaLinBindRow || targetCol !== unit.shaLinBindCol)) {
            showToast(`🪞 ${unit.cardName} 被纱琳定身，无法离开该格！`);
            return false;
        }
        // 赫菲斯托斯方块：敌方不可走入 / 不可走出
        if (gameState.hephaestusBlocks.some(b => b.row === targetRow && b.col === targetCol && b.side !== unit.side)) {
            showToast(`该格有敌方方块，无法走入`); return false;
        }
        if (gameState.hephaestusBlocks.some(b => b.row === unit.row && b.col === unit.col && b.side !== unit.side)) {
            showToast(`处于敌方方块中，无法走出`); return false;
        }
        const forward = getForwardDelta(unit.side);
        // 参谋在场或机车党自身：可自由向前后左右移动
        const hasCanMou = gameState.units.some(u => u.side === unit.side && u.cardName === "参谋" && u.life > 0);
        if (!hasCanMou && unit.cardName !== "机车党") {
            if (targetRow !== unit.row + forward || targetCol !== unit.col) {
                showToast(`只能向前移动一格`);
                return false;
            }
        } else {
            if (Math.abs(targetRow - unit.row) + Math.abs(targetCol - unit.col) !== 1) {
                showToast(`只能移动一格`);
                return false;
            }
        }
        const hasNonLueyingEnemy = gameState.units.some(u => u.row === targetRow && u.col === targetCol && u.side !== unit.side && u.cardName !== "掠影" && u.cardName !== "影舞姬" && u.cardName !== "镜中人");
        if (hasNonLueyingEnemy && unit.cardName !== "掠影" && unit.cardName !== "影舞姬" && unit.cardName !== "镜中人" && unit.cardName !== "机车党") { showToast(`目标有敌方单位，请攻击`); return false; }
        if (!canAddUnit(targetRow, targetCol, unit.side) && unit.cardName !== "护援兵" && unit.cardName !== "镜中人") { showToast(`格子已满 (最多2个单位)`); return false; }
        if (unit.side === SIDE_PLAYER0 && targetRow < 1) { showToast(`蓝方单位不能越过红方城下`); return false; }
        if (unit.side === SIDE_PLAYER1 && targetRow > 3) { showToast(`红方单位不能越过蓝方城下`); return false; }
        unit.row = targetRow;
        unit.col = targetCol;
        unit.moved = true;
        addLog(`${unit.cardName} 移动至 (${ROW_NAMES[targetRow]},${COLS[targetCol]})`);
        showToast(`🚀 ${unit.cardName} 前进`);
        if (unit.movesLeftThisTurn !== undefined) {
            unit.movesLeftThisTurn--;
            if (unit.movesLeftThisTurn > 0) {
                unit.moved = false;
                addLog(`${unit.cardName} 剩余移动次数 ${parseFloat(unit.movesLeftThisTurn.toFixed(2))}`);
                showToast(`🏇 还可移动 ${parseFloat(unit.movesLeftThisTurn.toFixed(2))} 步`);
            } else {
                unit.moved = true;
            }
        } else {
            unit.moved = true;
        }
        // 镜中人：镜像对称移动
        const mirror = getMirrorOf(unit);
        if (mirror) {
            mirror.row = 4 - targetRow;
            mirror.col = targetCol;
            addLog(`🪞 镜像移动至 ${ROW_NAMES[mirror.row]}${COLS[mirror.col]}`);
        }
        // ── 机车党碰撞：主动移动走进敌方所在格，对同格所有敌方造成1物伤（不算攻击，不消耗攻击次数） ──
        if (unit.cardName === "机车党") {
            const collided = getUnitsAt(targetRow, targetCol).filter(u => u.side !== unit.side && u.life > 0 && !u.isMirror);
            for (const e of collided) {
                const source = { cardName: unit.cardName, side: unit.side, dmgType: "⚔️", id: unit.id, fromSkill: true };
                await applyDamageWithSource(e, 1, source, false, "⚔️");
                addLog(`🏍️ ${unit.cardName} 与 ${e.cardName} 重合，碰撞造成1物伤！`);
            }
            if (collided.length > 0) showToast(`🏍️ 机车党碰撞！`);
        }
        // sendActionSync removed
        recheckAllWeaponSmithBuffs();
        applyShaLinCellBinding(unit);
        renderUI();
        return true;
    }

    // 绫罗回绫罗合法性检查：被定身/敌方城池/己方满员时无法回绫罗
    function canRiluoReturn(unit) {
        if (!unit || unit.cardName !== "绫罗" || !unit.riluoPlaced) return false;
        if (unit.shaLinBindTurn > 0) return false;
        if (unit.side === SIDE_PLAYER0 && unit.riluoRow === 0) return false;
        if (unit.side === SIDE_PLAYER1 && unit.riluoRow === 4) return false;
        if (gameState.units.some(u => u.row === unit.riluoRow && u.col === unit.riluoCol && u.side !== unit.side && u.life > 0)) return false;
        if (!canAddUnit(unit.riluoRow, unit.riluoCol, unit.side)) return false;
        return true;
    }

    // 绫罗回绫罗：瞬移回绫罗处并拾起
    function performRiluoReturn(unit) {
        if (!unit || !unit.riluoPlaced) { showToast(`绫罗在身上`); return false; }
        if (!canRiluoReturn(unit)) { showToast(`无法回绫罗（被定身/目标格已满/敌方城池）`); return false; }
        unit.row = unit.riluoRow;
        unit.col = unit.riluoCol;
        unit.riluoPlaced = false;
        unit.riluoRow = -1;
        unit.riluoCol = -1;
        applyShaLinCellBinding(unit);
        addLog(`🧵 ${unit.cardName} 回到绫罗处并拾起绫罗`);
        showToast(`🧵 回绫罗！`);
        renderUI();
        return true;
    }

    // 绫罗：受致命伤（含秒杀）时免疫并自动回绫罗（仅敌方回合触发）
    function tryRiluoLethalEscape(unit) {
        if (!unit || unit.cardName !== "绫罗" || !unit.riluoPlaced) return false;
        if (gameState.turn === unit.side) return false;
        if (!canRiluoReturn(unit)) return false;
        unit.row = unit.riluoRow;
        unit.col = unit.riluoCol;
        unit.riluoPlaced = false;
        unit.riluoRow = -1;
        unit.riluoCol = -1;
        applyShaLinCellBinding(unit);
        addLog(`🧵 ${unit.cardName} 受致命伤，绫罗护体，自动回到绫罗处`);
        showToast(`🧵 绫罗护体！`);
        renderUI();
        return true;
    }

    async function placeUnit(side, card, row, col, cardIndex) {
        if (side !== gameState.turn) { showToast("不是你的回合"); return false; }
        // 新手教程：仅当前步骤允许放置时才放行
        if (typeof tutorialAllowAction === 'function' && !tutorialAllowAction('place')) { tutorialBlock('放置单位'); return false; }
        if (card.name === "护盾") { showToast(`护盾只能在手牌中发挥作用，不能放置到棋盘`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        if (card.name === "无中生有") { showToast(`无中生有不能放置到场上，请在手中使用`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        if (card.name === "鼠疫") { showToast(`鼠疫不能放置到场上，请在手中使用`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        if (card.name === "军营") {
            const castleRow = getOwnCastleRow(side);
            const belowCastleRow = castleRow + getForwardDelta(side);
            if (row !== castleRow && row !== belowCastleRow) { showToast(`军营只能放置在己方城池（${ROW_NAMES[castleRow]}）或城下（${ROW_NAMES[belowCastleRow]}）`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        } else if (card.name === "稻草人") {
            const castleRow = getOwnCastleRow(side);
            const belowCastleRow = castleRow + getForwardDelta(side);
            if (row !== castleRow && row !== belowCastleRow && row !== 2) { showToast(`稻草人只能放置在己方城池（${ROW_NAMES[castleRow]}）、城下（${ROW_NAMES[belowCastleRow]}）或中线上`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        } else {
            const isNearBarracks = gameState.units.some(u => u.side === side && u.cardName === "军营" && u.life > 0 && Math.abs(u.row - row) <= 1 && Math.abs(u.col - col) <= 1);
            const enemyCastleRow = side === SIDE_PLAYER0 ? 0 : 4;
            const isEnemyCastleRow = row === enemyCastleRow;
            if (row !== getOwnCastleRow(side) && (!isNearBarracks || isEnemyCastleRow)) { showToast(`只能在你方的城池行（${ROW_NAMES[getOwnCastleRow(side)]}）或军营周围放置，不可在敌方城池行放置`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        }
        if (card.disabled) { showToast(`此手牌已被禁卫禁用，无法放置`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        let cost = card.cost;
        if (card.name === "狂战士") {
            const enemyCount = gameState.units.filter(u => u.side !== side).length;
            let finalLife = card.life + enemyCount;
            if (finalLife >= 5) cost = 2;
        }
        // 国王征税修正
        cost = Math.max(0, cost + (gameState.kingCostMod[side] || 0));
        if (!infiniteManaEnabled && gameState.players[side].mana < cost) { showToast(`费用不足，需要 ${cost}`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        const hasEnemy = gameState.units.some(u => u.row === row && u.col === col && u.side !== side);
        const canPlaceOnEnemy = ["掠影", "影舞姬", "镜中人"].includes(card.name);
        if (hasEnemy && !canPlaceOnEnemy) { showToast(`格子有敌方单位，无法放置`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        if (card.name !== "护援兵" && card.name !== "镜中人" && !canAddUnit(row, col, side)) { showToast(`该格子已有两个我方单位`); gameState.selectedCardIdx = -1; renderUI(); return false; }
        if (!infiniteManaEnabled) gameState.players[side].mana -= (cost);
        const newUnit = {
            id: Date.now() + Math.random(),
            cardName: card.name, side: side, row: row, col: col, life: card.life, maxLife: card.life,
            dmgType: card.dmgType, dmgValue: card.dmgValue, range: card.range,
            speed: card.speed,
            moved: false, firstAttackBonus: (card.name === "士兵"),
            bonusUsed: false, invincibleTurns: 0, nextAttackDouble: false,
            skillCooldown: 0, tempAttackBonus: 0, skillUsedThisTurn: false,
            isCharging: false, chargeTargetId: null, stun: 0,
            nextAttackBonus: 0, chargeIsBase: false, chargeBaseSide: null,
            superCharging: false, superChargeTurnsLeft: 0, superChargeTargetId: null, superChargeIsBase: false, superChargeBaseSide: null,
            knightSkillUsed: false,
            halberdierSkillUsed: false, halberdierCharging: false, nerdJamUsed: false, nerdJamActive: false,
            movesLeftThisTurn: Math.round(card.speed * 100) / 100,
            displacedByAllySkillThisTurn: false,
            silenced: 0,
            transformUsed: false,
            isSweepCharging: false,
            hornRecoveryTurns: 0,
            hornPendingHeal: 0,
            shieldValue: 0,
            nativeShieldValue: 0,
            externalShieldSources: {},
            absoluteImmunityTurns: 0,
            reviveTimesLeft: 0,
            extraAttacks: (card.extraAttacks || 0),
            attacksLeftThisTurn: 0,
            weakenedEnemies: [],
            eagleEyeTargets: [],
            windSkillUsed: false,
            cupidPair: null, // 共生死绑定：{ partnerId, partnerSide }
            cupidUseCount: 0, // 技能使用次数（最多2次）
            shaLinBindTurn: 0, // 定身剩余回合
            shaLinBindRow: -1, // 定身锁定行
            shaLinBindCol: -1, // 定身锁定列
            shaLinUseCount: 0,
            zhongyiHealUsed: false,
            scapegoatUsed: false,
            scapegoatProtectorId: null,
            feijiBonusGiven: 0,
            feizheBonusGiven: 0,
            flagBearerProtectTurn: 0,
            witchProtectReduce: 0, witchProtectorId: null,
            plagueInfected: false,
            plagueOwnerSide: null,
            bartenderUseCount: 0,
            drunkardInvincibleUsed: false,
            spearmanCharges: 0,
            braceActive: false,
            braceShield: 0,
            counterBonus: 0,
            counterUseCount: 0,
            fireGodBuffTurns: 0,
            fireGodSkillUsed: false,
            fanCooldown: 0,
            kickCooldown: 0,
            mirrorId: null,
            mirrorSkillUsed: false,
            mirrorSwappedThisTurn: false,
            hephaestusUseCount: 0,
            riluoPlaced: false,
            riluoRow: -1,
            riluoCol: -1,
            riluoReleaseCount: 3,
            equipmentId: null, // 装备系统：当前穿戴的装备ID
            motCharging: false, // 机车党：蓄力中
            motChargeTurns: 0,  // 机车党：已蓄力回合数（1-3）
            motReleaseTurn: false, // 机车党：蓄力完成回合（不能再蓄力）
        };
        if (card.name === "枷锁猎手") {
            newUnit.shieldValue = 2;
            newUnit.nativeShieldValue = 2;
            addLog(`${newUnit.cardName} 出场，获得 2 点自带护盾！`);
            showToast(`🔒 ${newUnit.cardName} 获得2点护盾`);
        }
        if (card.name === "猫") {
            newUnit.reviveTimesLeft = 8;
            addLog(`${newUnit.cardName} 出场，还有 ${newUnit.reviveTimesLeft} 次复活机会！`);
        }
        if (card.name === "狂战士") {
            const enemyCount = gameState.units.filter(u => u.side !== side).length;
            newUnit.maxLife = card.life + enemyCount; // 出场时生命即为最大生命
            newUnit.life = newUnit.maxLife;
            addLog(`狂战士登场，敌方单位 ${enemyCount} 个，生命+${enemyCount}，当前生命 ${newUnit.life}`);
        }
        // ── 装备系统：初始化装备相关字段 ──
        initUnitEquipmentFields(newUnit);
        gameState.units.push(newUnit);
        // 武器商被动：若放置的就是武器商，立即给同格友方翻倍剩余攻击次数
        if (newUnit.cardName === "武器商" && side === gameState.turn) {
            const sameCellFriends = gameState.units.filter(x => x.side === side && x.row === row && x.col === col && x.life > 0 && x.cardName !== "武器商" && x.id !== newUnit.id);
            for (let friend of sameCellFriends) {
                friend.attacksLeftThisTurn = (friend.attacksLeftThisTurn || 0) * 2;
                friend.weaponSmithBoosted = true;
                addLog(`${friend.cardName} 受武器商加持，攻速×2！（本回合${friend.attacksLeftThisTurn}次攻击）`);
            }
        }
        // 新放置的单位：如果是当前回合方，初始化本回合攻击次数（必须在骷髅分裂之前，确保副本继承正确的攻击次数）
        if (side === gameState.turn) {
            newUnit.attacksLeftThisTurn = 1 + (newUnit.extraAttacks || 0);
        }
        // 骷髅放置：目标格生成两只，同行另外两格各一只
        if (card.name === "骷髅") {
            addLog(`💀 骷髅分裂放置！`);
            // 目标格再生成一只（如果未满）
            if (canAddUnit(row, col, side)) {
                const skel2 = {...newUnit, id: Date.now() + Math.random(), cardName: "骷髅", attacksLeftThisTurn: newUnit.attacksLeftThisTurn, moved: false};
                gameState.units.push(skel2);
                addLog(`  目标格生成额外骷髅`);
            } else {
                addLog(`  目标格已满，无法生成额外骷髅`);
            }
            // 同行另外两格各生成一只
            for (let c = 0; c <= 2; c++) {
                if (c === col) continue;
                const hasEnemy = gameState.units.some(u => u.row === row && u.col === c && u.side !== side);
                if (hasEnemy) {
                    addLog(`  ${ROW_NAMES[row]}${COLS[c]} 有敌方单位，无法生成`);
                    continue;
                }
                if (!canAddUnit(row, c, side)) {
                    addLog(`  ${ROW_NAMES[row]}${COLS[c]} 已满，无法生成`);
                    continue;
                }
                const skel = {...newUnit, id: Date.now() + Math.random(), cardName: "骷髅", col: c, attacksLeftThisTurn: newUnit.attacksLeftThisTurn, moved: false};
                gameState.units.push(skel);
                addLog(`  ${ROW_NAMES[row]}${COLS[c]} 生成一只骷髅`);
            }
        }
        // 武器商被动：新放置的单位若与武器商同格，翻倍剩余攻击次数
        if (newUnit.side === gameState.turn && newUnit.cardName !== "武器商") {
            const sameCellSmith = gameState.units.filter(x => x.side === side && x.row === row && x.col === col && x.cardName === "武器商" && x.life > 0);
            if (sameCellSmith.length > 0) {
                newUnit.attacksLeftThisTurn = (newUnit.attacksLeftThisTurn || 0) * 2;
                newUnit.weaponSmithBoosted = true;
                addLog(`${newUnit.cardName} 受武器商加持，攻速×2！（本回合${newUnit.attacksLeftThisTurn}次攻击）`);
            }
        }
        gameState.players[side].hand.splice(cardIndex, 1);
        // 检查是否放入定身格
        applyShaLinCellBinding(newUnit);
        addLog(`放置 ${card.name} 于 ${ROW_NAMES[row]}${COLS[col]}`);
        showToast(`✅ 召唤 ${card.name}`);
        if (card.name === "净化师") { purifyAllFriendly(side); }
        gameState.selectedCardIdx = -1;
        renderUI();
        return true;
    }

    // 机车党：释放蓄力，本回合移速 +3*蓄力回合数（仅本回合有效）
    function releaseMotorcyclist(u) {
        const bonus = 3 * (u.motChargeTurns || 0);
        u.motCharging = false;
        u.motChargeTurns = 0;
        u.motReleaseTurn = true;
        u.movesLeftThisTurn = Math.round(u.speed * 100) / 100 + bonus;
        u.moved = false;
        addLog(`🏍️ ${u.cardName} 蓄力完成！本回合移速+${bonus}（总移速${parseFloat(u.movesLeftThisTurn.toFixed(2))}）`);
        showToast(`🏍️ 蓄力释放！移速+${bonus}`);
    }

    async function startTurn(side) {
        // 回合计数（用于复盘统计）
        if (gameState.matchStats) gameState.matchStats.turnCount++;
        // 国王征税：先根据上个大回合的受伤记录计算本回合修正，再记录日志（保证日志与实际扣费一致）
        const kingAlive = gameState.units.some(u => u.side === side && u.cardName === "国王" && u.life > 0);
        gameState.kingCostMod[side] = kingAlive ? (gameState.kingDamagedCount[side] ? 1 : -1) : 0;
        gameState.kingDamagedCount[side] = false;
        const kingCostMod = gameState.kingCostMod[side];
        if (kingCostMod !== 0) {
            addLog(`👑 国王征税：本回合手牌费用${kingCostMod > 0 ? '+' + kingCostMod : kingCostMod}`);
        }
        // 重置本回合被攻击记录
        gameState.attackedEnemyIds = [];
        // 四眼仔干扰：检查对方是否有激活的行动干扰，若有则本方第一次操作单位将被无效化
        const opponent = 1 - side;
        const jammerUnit = gameState.units.find(u => u.side === opponent && u.nerdJamActive);
        if (jammerUnit) {
            jammerUnit.nerdJamActive = false;
            gameState.nerdJamPending[side] = true;
            addLog(`👓 四眼仔的行动干扰生效！${side === 0 ? "蓝方" : "红方"}本回合第一次控制单位的自主行动将被无效化！`);
            showToast(`👓 行动干扰！本回合首次操作将被无效化`);
        }
        if (!infiniteManaEnabled) {
            // 第6大回合后每回合加2费（turnCount从0开始，第6大回合 = turnCount >= 10，即 bigTurn >= 5）
            const bigTurn = Math.floor(gameState.matchStats.turnCount / 2);
            const manaGain = bigTurn >= 5 ? 2 : 1;
            let newMana = gameState.players[side].mana + manaGain;
            if (newMana > gameState.players[side].manaMax) newMana = gameState.players[side].manaMax;
            gameState.players[side].mana = newMana;
            addLog(`玩家${side === 0 ? "蓝方" : "红方"} 回合开始，费用 +${manaGain}，当前 ${gameState.players[side].mana} 费${bigTurn >= 5 ? '（加速回合）' : ''}`);
        } else {
            gameState.players[0].mana = gameState.players[0].manaMax;
            gameState.players[1].mana = gameState.players[1].manaMax;
            // 无限费模式下只在首次显示日志
            if (gameState.turn === 0 && side === 0) {
                addLog(`无限费模式：费用保持 ${gameState.players[side].manaMax} 费（无需关注费用显示）`);
            }
        }
        // ── 装备系统：复活甲复活 + 回合开始装备效果 ──
        revivePendingUnits(side);
        onTurnStartEquipment(side);
        for (let u of gameState.units) if (u.side === side && u.cardName === "净化师") { purifyAllFriendly(side); break; }
        // 双剑延迟攻击决议
        if (gameState.dualswordDelayedAttacks && gameState.dualswordDelayedAttacks.length > 0) {
            for (let da of gameState.dualswordDelayedAttacks) {
                if (da.side === side) {
                    da.turnsLeft--;
                    if (da.turnsLeft === 0) {
                        // 清除横扫蓄力标记
                        const sweepCaster = gameState.units.find(u => u.id === da.fromUnitId && u.side === da.side);
                        if (sweepCaster) { sweepCaster.isSweepCharging = false; addLog(`⚔️ ${sweepCaster.cardName} 横扫蓄力完成`); }
                        gameState.dualswordAOEHighlight = null;
                        // 弱化检查：被弱化时延迟AOE伤害无效
                        if (sweepCaster && sweepCaster.weakenedTurns > 0) {
                            addLog(`📉 ${sweepCaster.cardName} 被弱化，双剑延迟AOE伤害无效！`);
                            showToast(`📉 双剑横扫伤害无效`);
                            continue;
                        }
                        // 一次性加成在循环外计算一次（祭献/酒类/爱妃光环）
                        let sweepBaseBonus = 0;
                        if (sweepCaster) {
                            if (sweepCaster.tempAttackBonus > 0 && canApplyBonus(sweepCaster, 'magic')) sweepBaseBonus += sweepCaster.tempAttackBonus;
                            if (sweepCaster.nextAttackBonus > 0 && canApplyBonus(sweepCaster, 'magic')) { sweepBaseBonus += sweepCaster.nextAttackBonus; sweepCaster.nextAttackBonus = 0; }
                            const { bonus: auraBonus } = applyAifeiAura(sweepCaster, true, "🔮");
                            if (auraBonus > 0 && canApplyBonus(sweepCaster, 'magic')) sweepBaseBonus += auraBonus;
                        }
                        const sweepShouldDouble = sweepCaster && sweepCaster.nextAttackDouble && canApplyBonus(sweepCaster, 'magic');
                        if (sweepShouldDouble) sweepCaster.nextAttackDouble = false;
                        for (let cell of da.cells) {
                            const enemies = gameState.units.filter(u => u.row === cell.row && u.col === cell.col && u.side !== da.side && u.life > 0);
                            for (let e of enemies) {
                                let dmg = sweepCaster ? sweepCaster.dmgValue : (CARD_LIBRARY.find(c => c.name === da.fromUnit)?.dmgValue || 4);
                                dmg += sweepBaseBonus;
                                if (sweepShouldDouble) dmg = dmg * 2;
                                await applyDamageWithSource(e, dmg, sweepCaster || null, false, "🔮");
                                addLog(`⚔️ 双剑延迟AOE对 ${e.cardName} 造成 ${dmg} 法伤！`);
                            }
                        }
                    }
                }
            }
            gameState.dualswordDelayedAttacks = gameState.dualswordDelayedAttacks.filter(da => da.turnsLeft > 0);
        }
        // 费机被动：每回合给己方加1费（最多3次）
        for (let u of gameState.units) if (u.side === side && u.cardName === "费机" && (u.feijiBonusGiven || 0) < 3) {
            if (!infiniteManaEnabled) {
                const newMana = Math.min(gameState.players[side].manaMax, gameState.players[side].mana + 1);
                if (newMana !== gameState.players[side].mana) {
                    gameState.players[side].mana = newMana;
                    u.feijiBonusGiven = (u.feijiBonusGiven || 0) + 1;
                    addLog(`💰 费机加费 +1（共 ${u.feijiBonusGiven}/3 次）`);
                }
            }
        }
        for (let u of gameState.units) if (u.side === side && u.stun > 0 && !u.superCharging) { u.moved = true; u.attacksLeftThisTurn = 0; u.skillUsedThisTurn = true; addLog(`${u.cardName} 处于眩晕，无法行动。`); }
        // 重斧兵蓄力期间免疫所有控制和负面效果（霸体）
        // 魔女庇护检查：施法魔女存活且被庇护单位在范围内才保留，否则清除
        for (let u of gameState.units) {
            if (u.witchProtectReduce > 0 && u.witchProtectorId) {
                const protector = gameState.units.find(w => w.id === u.witchProtectorId && w.cardName === "魔女" && w.life > 0);
                if (!protector || Math.abs(u.row - protector.row) > 1 || Math.abs(u.col - protector.col) > 1) {
                    addLog(`${u.cardName} 失去魔女庇护（魔女${!protector ? '已死亡' : '不在范围内'}）`);
                    u.witchProtectReduce = 0;
                    u.witchProtectorId = null;
                }
            }
        }
        // 火人本列友方免疫控制（包括自身）：回合开始时清除已有控制（作为兜底，主要免疫在施加时阻止）
        for (let fm of gameState.units) if (fm.cardName === "火人" && fm.life > 0) {
            for (let f of gameState.units) if (f.side === fm.side && f.col === fm.col) {
                let cleared = [];
                if (f.stun > 0) { f.stun = 0; f.stunnedBy = null; cleared.push('眩晕'); }
                if (f.eagleEyeTurns > 0) { f.eagleEyeTurns = 0; cleared.push('致盲'); }
                if (f.silenced > 0) { f.silenced = 0; cleared.push('沉默'); }
                if (f.shaLinBindTurn > 0) { f.shaLinBindTurn = 0; f.shaLinBindRow = null; f.shaLinBindCol = null; cleared.push('定身'); }
                if (f.weakenedTurns > 0) { f.weakenedTurns = 0; cleared.push('弱化'); }
                if (f.plagueInfected) { f.plagueInfected = false; cleared.push('鼠疫'); }
                if (cleared.length > 0) addLog(`${f.cardName} 被火人同列庇护，${cleared.join('、')}解除！`);
            }
        }
        for (let u of [...gameState.units]) if (u.side === side) {
            let chargeResolved = false;
            if (u.isCharging) { chargeResolved = true; if (u.cardName === "弩手") await resolveCrossbowCharge(u); else await resolveAxemanCharge(u); }
            if (u.superCharging) { chargeResolved = true; await resolveHeavyAxemanCharge(u); }
            if (u.halberdierCharging) { chargeResolved = true; await resolveHalberdierCharge(u); }
            if (u.braceActive) { await resolveCounterBrace(u); }
            if (u.stun === 0 && !u.superCharging) {
                u.moved = false;
                if (!chargeResolved) {
                    u.attacksLeftThisTurn = 1 + (u.extraAttacks || 0) + (u.riluoPlaced ? 1 : 0);
                    u.skillUsedThisTurn = false;
                }
            }
            if (u.cardName === "中医") u.zhongyiHealUsed = false;
            if (u.cardName === "替罪羊") u.scapegoatUsed = false;
            if (u.cardName === "四眼仔") u.nerdJamUsed = false;
            if (u.cardName === "镜中人") u.mirrorSwappedThisTurn = false;
            if (u.equipmentId === 'eagleFeather') { u.eagleFeatherFirstAttackUsed = false; u._guaranteedAttack = false; }
            if (u.cardName === "标枪手") {
                u.spearmanCharges = Math.min(2, (u.spearmanCharges || 0) + 1);
                addLog(`🔱 ${u.cardName} 获得强化普攻（当前${u.spearmanCharges}次）`);
            }
            if (u.cardName === "费机") { /* 费机加费由被动处理 */ }
            if (u.cardName === "骑士" || u.movesLeftThisTurn !== undefined) {
                u.movesLeftThisTurn = Math.round(u.speed * 100) / 100;
            } else {
                u.movesLeftThisTurn = 1;
            }
            u.displacedByAllySkillThisTurn = false;
            u.tempAttackBonus = 0;
        }
        // ── 机车党蓄力：回合开始结算（控制中断 / 选择继续蓄力或释放） ──
        for (let u of [...gameState.units]) {
            if (u.side !== side || u.cardName !== "机车党" || u.life <= 0) continue;
            if (!u.motCharging) {
                // 蓄力完成回合已过，清除"不能再蓄力"标记
                if (u.motReleaseTurn) u.motReleaseTurn = false;
                continue;
            }
            // 控制类（眩晕/定身/沉默）中断蓄力；位移不中断（位置改变蓄力继续）
            if (u.stun > 0 || u.shaLinBindTurn > 0 || u.silenced > 0) {
                u.motCharging = false;
                u.motChargeTurns = 0;
                u.motReleaseTurn = false;
                addLog(`🏍️ ${u.cardName} 被控制，蓄力中断！`);
                showToast(`🏍️ ${u.cardName} 蓄力中断`);
                continue;
            }
            // 已蓄力3回合：自动释放（移速+9）
            if (u.motChargeTurns >= 3) {
                releaseMotorcyclist(u);
                continue;
            }
            // 选择：继续蓄力 / 释放（AI 回合自动选择）
            let choice = -1;
            if (side === aiSide) {
                choice = 0; // AI 策略：继续蓄力至3回合
            } else {
                choice = await showSelect(
                    [`继续蓄力（${u.motChargeTurns + 1}/3回合）`, `释放（本回合移速+${3 * u.motChargeTurns}）`],
                    `🏍️ ${u.cardName} 蓄力 ${u.motChargeTurns}/3 回合，选择行动`,
                    {}
                );
                // 弹窗期间游戏可能被重置/单位可能死亡
                if (!gameState.units.includes(u)) continue;
            }
            if (choice === 1) {
                releaseMotorcyclist(u);
            } else {
                // 继续蓄力（取消视为继续）
                u.motChargeTurns += 1;
                u.movesLeftThisTurn = 0;
                u.attacksLeftThisTurn = 0;
                u.moved = true;
                addLog(`🏍️ ${u.cardName} 继续蓄力（${u.motChargeTurns}/3回合）`);
                showToast(`🏍️ 蓄力 ${u.motChargeTurns}/3 回合`);
            }
        }
        // 武器商被动：同格友方剩余攻击次数×2
        for (let u of gameState.units) {
            if (u.side === side && u.life > 0 && u.stun === 0) {
                u.weaponSmithBoosted = false;
                const sameCell = gameState.units.filter(x => x.side === side && x.row === u.row && x.col === u.col && x.cardName === "武器商" && x.life > 0);
                if (sameCell.length > 0 && u.cardName !== "武器商") {
                    u.attacksLeftThisTurn = (u.attacksLeftThisTurn || 0) * 2;
                    u.weaponSmithBoosted = true;
                    addLog(`${u.cardName} 受武器商加持，攻速×2！（本回合${u.attacksLeftThisTurn}次攻击）`);
                }
            }
        }
        // 全局状态：每个小回合所有单位统一递减（遍历副本，避免期间 removeUnit 修改数组导致跳过）
        for (let u of [...gameState.units]) {
            if (u.silenced > 0) u.silenced--;
            if (u.eagleEyeTurns > 0) { u.eagleEyeTurns--; if (u.eagleEyeTurns === 0) addLog(`${u.cardName} 致盲结束`); else addLog(`${u.cardName} 致盲剩余 ${u.eagleEyeTurns} 回合（技能失效，被动保留）`); }
            if (u.invincibleTurns > 0) { u.invincibleTurns--; addLog(`${u.cardName} 无敌剩余 ${u.invincibleTurns} 回合`); if (u.invincibleTurns === 0) { if (u.pendingDeath) { addLog(`🍺 ${u.cardName} 无敌结束，因先前受到的致命伤害死亡！`); removeUnit(u.id, u.row, u.col, u.side); } else { addLog(`${u.cardName} 无敌结束`); } } }
            if (u.skillCooldown > 0) { u.skillCooldown--; addLog(`${u.cardName} 技能冷却剩余 ${Math.ceil(u.skillCooldown/2)}大回合`); }
            if (u.fanCooldown > 0) { u.fanCooldown--; addLog(`${u.cardName} 飞扇冷却剩余 ${Math.ceil(u.fanCooldown/2)}大回合`); }
            if (u.kickCooldown > 0) { u.kickCooldown--; addLog(`${u.cardName} 旋风踢冷却剩余 ${Math.ceil(u.kickCooldown/2)}大回合`); }
            if (u.absoluteImmunityTurns > 0) { u.absoluteImmunityTurns--; if (u.absoluteImmunityTurns === 0) addLog(`${u.cardName} 绝对免疫结束`); else addLog(`${u.cardName} 绝对免疫剩余 ${u.absoluteImmunityTurns} 回合`); }
            if (u.fireGodBuffTurns > 0) { u.fireGodBuffTurns--; if (u.fireGodBuffTurns === 0) { u.range -= 1; addLog(`🔥 ${u.cardName} 的火神强化结束，攻击范围恢复为${u.range}`); } }
            if (u.isMirror && u.mirrorTurnsLeft > 0) { u.mirrorTurnsLeft--; if (u.mirrorTurnsLeft === 0) { addLog(`🪞 ${u.cardName} 的镜像消失`); removeUnit(u.id, u.row, u.col, u.side); } }
            if (u.hornRecoveryTurns > 0) {
                if (u.hornRecoveryTurns === 1 && (u.hornPendingHeal || 0) > 0 && u.side === side) {
                    const heal = Math.floor((u.hornPendingHeal || 0) / 2);
                    if (heal > 0 && !u.noHeal && u.cardName !== "麻木者") {
                        if (u.isAssimilator) {
                            gameState.assimilatorHp[u.side] = Math.min(gameState.assimilatorHp[u.side] + heal, gameState.assimilatorMaxHp[u.side]);
                            syncAssimilators(u.side);
                            addLog(`🧬 同化者共享生命号角恢复 ${heal} 点！`);
                        } else {
                            u.life = Math.min(u.life + heal, u.maxLife || u.life);
                            u.pendingDeath = false;
                            addLog(`${u.cardName} 号角庇护恢复 ${heal} 点生命！`);
                        }
                        showFloatText(u.row, u.col, '+' + heal, 'heal');
                        showToast(`📯 ${u.cardName} 号角恢复${heal}生命`);
                    } else if (heal > 0 && (u.noHeal || u.cardName === "麻木者")) {
                        addLog(`🩸 ${u.cardName} 无法回血${u.cardName === "麻木者" ? "（麻木者被动）" : "（禁疗状态）"}，号角庇护无效`);
                    }
                    u.hornPendingHeal = 0;
                }
                u.hornRecoveryTurns--;
                if (u.hornRecoveryTurns === 0) addLog(`${u.cardName} 号角庇护已结束`);
                else addLog(`${u.cardName} 号角庇护剩余 ${u.hornRecoveryTurns} 回合`);
            }
            // 清理本回合的弱化效果
            if (u.weakenedEnemies && u.weakenedEnemies.length > 0) {
                u.weakenedEnemies = u.weakenedEnemies.filter(e => e.expireTurn !== side);
                if (u.weakenedEnemies.length === 0) addLog(`${u.cardName} 的弱化效果已到期`);
            }
            // 清理本回合的鹰眼效果
            if (u.eagleEyeTargets && u.eagleEyeTargets.length > 0) {
                u.eagleEyeTargets = u.eagleEyeTargets.filter(t => t.expireTurn !== side);
                if (u.eagleEyeTargets.length === 0) addLog(`鹰眼效果已到期`);
            }
            // 纱琳定身递减
            if (u.shaLinBindTurn > 0) { u.shaLinBindTurn--; if (u.shaLinBindTurn === 0) addLog(`${u.cardName} 定身结束`); }
            // 旗手庇护递减
            if (u.flagBearerProtectTurn > 0) { u.flagBearerProtectTurn--; if (u.flagBearerProtectTurn === 0) addLog(`${u.cardName} 旗手庇护结束`); }
        }
        // 禁卫手牌禁用递减（每小回合递减）
        for (let p of gameState.players) {
            for (let c of p.hand) {
                if (c.disabledTurns > 0) {
                    c.disabledTurns--;
                    if (c.disabledTurns === 0) {
                        c.disabled = false;
                        c.disabledBy = null;
                        addLog(`手牌 ${c.name} 的禁用已到期，现在可以使用。`);
                    }
                }
            }
        }
        // 纱琳定身格子递减
        for (let i = gameState.shaLinBoundCells.length - 1; i >= 0; i--) {
            const cell = gameState.shaLinBoundCells[i];
            cell.turnsLeft--;
            if (cell.turnsLeft <= 0) {
                addLog(`🪞 ${ROW_NAMES[cell.row]}${COLS[cell.col]} 格定身效果消失`);
                gameState.shaLinBoundCells.splice(i, 1);
            }
        }
        // 赫菲斯托斯方块递减
        for (let i = gameState.hephaestusBlocks.length - 1; i >= 0; i--) {
            const b = gameState.hephaestusBlocks[i];
            b.turnsLeft--;
            if (b.turnsLeft <= 0) {
                addLog(`🧱 ${ROW_NAMES[b.row]}${COLS[b.col]} 的方块消失`);
                gameState.hephaestusBlocks.splice(i, 1);
            }
        }
        renderUI();
        // 如果是 AI 的回合，延迟触发 AI 行动
        if (side === aiSide && aiSide >= 0 && !aiActing) {
            const gid = aiGameId;
            setTimeout(async () => {
                if (gid === aiGameId && gameState.turn === aiSide) {
                    try { await aiTakeTurn(gid); } catch(e) { console.error('AI 回合出错:', e); aiActing = false; renderUI(); }
                }
            }, 900);
        }
    }

    async function showPrepickPanel(prepool) {
        if (gameState.isModalOpen) return -1;
        // 远程联机：预牌选择决策方为远程玩家时，转发到远程端
        if (networkActive()) {
            const decisionSide = networkPromptSide !== null ? networkPromptSide : gameState.turn;
            networkPromptSide = null;
            if (networkShouldForwardPrompt(decisionSide)) {
                gameState.isModalOpen = true;
                const answer = await networkRequestPrompt({ kind: 'prepick', prepool });
                gameState.isModalOpen = false;
                return answer;
            }
        }
        return await showPrepickPanelLocal(prepool);
    }
    async function showPrepickPanelLocal(prepool) {
        if (gameState.isModalOpen) return -1;
        // AI 自动选牌
        if (aiActing && typeof aiSelectPrepoolCard === 'function') {
            const idx = aiSelectPrepoolCard(prepool);
            addLog(`🤖 AI 从预牌堆选了 ${prepool[idx]?.name || '无'}`);
            return idx;
        }
        gameState.isModalOpen = true;
        return new Promise((resolve) => { const overlay = document.createElement('div'); overlay.className = 'prepick-overlay'; const panel = document.createElement('div'); panel.className = 'prepick-panel'; panel.innerHTML = `<h3>请选择一张预牌加入手牌</h3>`; const btnContainer = document.createElement('div'); btnContainer.className = 'prepick-buttons'; for (let i = 0; i < prepool.length; i++) { const card = prepool[i]; const btn = document.createElement('button'); btn.className = 'prepick-btn'; btn.innerText = `${card.name} (费${card.cost})   ❤️${card.life}`; btn.onclick = () => { overlay.remove(); gameState.isModalOpen = false; resolve(i); }; btnContainer.appendChild(btn); } panel.appendChild(btnContainer); const cancelBtn = document.createElement('button'); cancelBtn.innerText = '取消结束回合'; cancelBtn.className = 'prepick-btn prepick-cancel'; cancelBtn.onclick = () => { overlay.remove(); gameState.isModalOpen = false; resolve(-1); }; panel.appendChild(cancelBtn); overlay.appendChild(panel); document.body.appendChild(overlay); }); }

    // ========== showSelect 和 showConfirm（修复 AI 鬼魂问题） ==========
    // 在 forceShow 弹窗（AI 给人类看的防御弹窗）返回后，如果检测到 aiActing 从 true 变为 false，
    // 说明游戏已在弹窗期间被重置，放弃本次操作，返回默认取消值，防止旧 AI 继续执行。

    async function showSelect(options, title, opts = {}) {
        if (gameState.isModalOpen) return -1;
        // 远程联机：弹窗决策方为远程玩家时，转发到远程端
        if (networkActive()) {
            const decisionSide = networkPromptSide !== null ? networkPromptSide : gameState.turn;
            networkPromptSide = null;
            if (networkShouldForwardPrompt(decisionSide)) {
                gameState.isModalOpen = true;
                const answer = await networkRequestPrompt({ kind: 'select', options, title, opts });
                gameState.isModalOpen = false;
                return answer;
            }
        }
        return await showSelectLocal(options, title, opts);
    }

    async function showSelectLocal(options, title, opts = {}) {
        if (gameState.isModalOpen) return -1;
        // AI 自动选择（除非 forceShow 强制向人类展示）
        if (aiActing && !opts.forceShow) {
            const choice = typeof opts.aiChoice === 'function' ? opts.aiChoice(options) : 0;
            addLog(`🤖 AI 选择: ${options[choice] || '跳过'} (来自: ${title})`);
            return choice;
        }

        // 记录弹窗前的 AI 状态
        const wasActing = aiActing;

        gameState.isModalOpen = true;
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'custom-modal';
            let listHtml = '<div class="select-list">';
            options.forEach((opt, idx) => {
                listHtml += `<div class="select-item" data-index="${idx}">${escapeHtml(opt)}</div>`;
            });
            listHtml += '</div>';
            modal.innerHTML = `<div class="custom-modal-content"><p>${escapeHtml(title)}</p>${listHtml}<div class="custom-modal-buttons"><button class="custom-modal-btn cancel">取消</button></div></div>`;

            const items = modal.querySelectorAll('.select-item');
            items.forEach(item => {
                item.onclick = () => {
                    const idx = parseInt(item.dataset.index);
                    modal.remove();
                    gameState.isModalOpen = false;
                    // 如果游戏在弹窗期间被重置，返回 -1（取消）
                    if (wasActing && !aiActing) {
                        resolve(-1);
                    } else {
                        resolve(idx);
                    }
                };
            });
            modal.querySelector('.cancel').onclick = () => {
                modal.remove();
                gameState.isModalOpen = false;
                if (wasActing && !aiActing) {
                    resolve(-1);
                } else {
                    resolve(-1);
                }
            };
            document.body.appendChild(modal);
        });
    }

    async function showConfirm(message, forceShow = false) {
        if (gameState.isModalOpen) return false;
        // 远程联机：弹窗决策方为远程玩家时，转发到远程端
        if (networkActive()) {
            const decisionSide = networkPromptSide !== null ? networkPromptSide : gameState.turn;
            networkPromptSide = null;
            if (networkShouldForwardPrompt(decisionSide)) {
                gameState.isModalOpen = true;
                const answer = await networkRequestPrompt({ kind: 'confirm', message, forceShow });
                gameState.isModalOpen = false;
                return answer === true || answer === 1;
            }
        }
        return await showConfirmLocal(message, forceShow);
    }

    async function showConfirmLocal(message, forceShow = false) {
        if (gameState.isModalOpen) return false;
        // AI 自动确认（除非 forceShow 强制向人类展示，如防御提示）
        if (aiActing && !forceShow) {
            return true;
        }

        // 记录弹窗前的 AI 状态
        const wasActing = aiActing;

        gameState.isModalOpen = true;
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'custom-modal';
            modal.innerHTML = `<div class="custom-modal-content"><p>${escapeHtml(message)}</p><div class="custom-modal-buttons"><button class="custom-modal-btn confirm">确定</button><button class="custom-modal-btn cancel">取消</button></div></div>`;
            modal.querySelector('.confirm').onclick = () => {
                modal.remove();
                gameState.isModalOpen = false;
                if (wasActing && !aiActing) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            };
            modal.querySelector('.cancel').onclick = () => {
                modal.remove();
                gameState.isModalOpen = false;
                if (wasActing && !aiActing) {
                    resolve(false);
                } else {
                    resolve(false);
                }
            };
            document.body.appendChild(modal);
        });
    }

    async function showMessage(message) {
        if (gameState.isModalOpen) return;
        // AI 自动关闭消息，但游戏结束消息必须向人类展示
        if (aiActing && !message.includes('胜利')) { return; }
        gameState.isModalOpen = true;
        return new Promise((resolve) => {
        const modal = document.createElement('div'); modal.className = 'custom-modal'; modal.innerHTML = `<div class="custom-modal-content"><p>${escapeHtml(message)}</p><div class="custom-modal-buttons"><button class="custom-modal-btn confirm">确定</button></div></div>`; modal.querySelector('.confirm').onclick = () => { modal.remove(); gameState.isModalOpen = false; resolve(); }; document.body.appendChild(modal); }); }

    async function endTurn(preselected = null) {
        // 新手教程：仅当前步骤允许结束回合时才放行
        if (typeof tutorialAllowAction === 'function' && !tutorialAllowAction('endTurn')) { tutorialBlock('结束回合'); return; }
        if (gameState.awaitingSkillTarget) { showToast(`正在选择技能目标，请先完成或取消技能`); return; }
        if (gameState.awaitingGlide) { showToast(`请先完成或跳过滑步`); return; }
        if (gameState.awaitingMirrorAttack) { showToast(`请先选择攻击目标或取消攻击`); return; }
        // 联机客机乐观流程：确认与预牌选择已由客机本地完成，随指令直达（跳过弹窗往返）
        let confirmed;
        if (preselected && typeof preselected.confirmed === 'boolean') confirmed = preselected.confirmed;
        else confirmed = await showConfirm("是否结束当前回合？");
        if (!confirmed) { addLog("结束回合已取消。"); return; }
        let cur = gameState.turn;
        let prepool = gameState.players[cur].prepool;
        if (prepool.length === 0) { let newPre = gameState.players[cur].deck.splice(0, 3); gameState.players[cur].prepool.push(...newPre); prepool = gameState.players[cur].prepool; }
        if (prepool.length > 0) {
            let selectedIndex;
            if (preselected && typeof preselected.prepick === 'number') selectedIndex = preselected.prepick;
            else selectedIndex = await showPrepickPanel(prepool);
            if (selectedIndex === -1 || selectedIndex < 0 || selectedIndex >= prepool.length) { addLog("结束回合已取消。"); return; }
            let selectedCard = prepool.splice(selectedIndex, 1)[0];
            if (gameState.players[cur].hand.length >= gameState.players[cur].handMax) {
                const discardIdx = await discardForNewCard(cur, selectedCard);
                if (discardIdx === -1) { addLog(`放弃获得 ${selectedCard.name}`); } 
                else { discardCard(cur, discardIdx); gameState.players[cur].hand.push(selectedCard); addLog(`获得 ${selectedCard.name}`); showToast(`🃏 获得 ${selectedCard.name}`); }
            } else { gameState.players[cur].hand.push(selectedCard); addLog(`获得 ${selectedCard.name}`); showToast(`🃏 获得 ${selectedCard.name}`); }
        }
        while (gameState.players[cur].prepool.length < 3 && gameState.players[cur].deck.length > 0) gameState.players[cur].prepool.push(gameState.players[cur].deck.shift());
        for (let u of gameState.units) if (u.stun > 0) { u.stun--; if (u.stun === 0) addLog(`${u.cardName} 从眩晕中恢复。`); }
        for (let u of gameState.units) if (u.weakenedTurns > 0) { u.weakenedTurns--; if (u.weakenedTurns === 0) addLog(`${u.cardName} 弱化效果结束。`); }
        // 回合结束时清除本方未消耗的行动干扰，避免残留到下一回合
        gameState.nerdJamPending[cur] = false;
        let next = cur === 0 ? 1 : 0;
        gameState.turn = next;
        gameState.selectedCardIdx = -1;
        gameState.selectedUnitId = null;
        clearSkillTarget();
        await startTurn(next);
        addLog(`===== 玩家${next === 0 ? "蓝方" : "红方"} 回合 =====`);
        renderUI();
    }