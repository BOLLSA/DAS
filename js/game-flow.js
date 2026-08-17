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
                addLog(trText(trText(`${u.cardName} 受武器商加持，攻速×2！（本回合${u.attacksLeftThisTurn}次攻击）`, `${u.cardName} boosted by the Arms Dealer, Attack Count ×2! (this turn: ${u.attacksLeftThisTurn} attacks)`), `${u.cardName} boosted by the Arms Dealer, Attack Count ×2! (this turn: ${u.attacksLeftThisTurn} attacks)`));
                showToast(trText(`⚔️ ${u.cardName} 武器商加持，攻速×2`, `⚔️ ${u.cardName} Arms Dealer enhancement, Attack Count ×2`));
            } else if (!hasSmith && u.weaponSmithBoosted) {
                // 离开武器商范围，不损失攻击次数
                u.weaponSmithBoosted = false;
                addLog(trText(`${u.cardName} 离开武器商范围，攻速恢复（剩余${u.attacksLeftThisTurn}次攻击）`, `${u.cardName} leave Arms Dealer range, Attack Count recovers (left ${u.attacksLeftThisTurn} time attack)`));
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
            addLog(trText(`👓 行动干扰生效！${unit.cardName} 的移动被无效化！`, `👓 Action Jam takes effect! ${unit.cardName} of move was negated!`));
            showToast(trText(`👓 行动干扰！${unit.cardName} 的移动被无效化`, `👓 Action Jam! ${unit.cardName} of move was negated`));
            renderUI();
            return false;
        }
        if (unit.stun > 0) { showToast(trText(`${unit.cardName} 眩晕无法移动`, `${unit.cardName} stun cannot move`)); return false; }
        if (unit.isCharging || unit.superCharging || unit.isSweepCharging || unit.motCharging) { showToast(trText(`蓄力中无法移动`, `while charging cannot move`)); return false; }
        if (unit.cardName === "军营" || unit.cardName === "稻草人") { showToast(trText(`${unit.cardName} 不能移动`, `${unit.cardName} cannot move`)); return false; }
        if (unit.displacedByAllySkillThisTurn) { showToast(trText(`${unit.cardName} 本回合已被友方技能位移，不能再移动`, `${unit.cardName} this turn already ally skill displace, cannot then move`)); return false; }
        if (unit.movesLeftThisTurn !== undefined && unit.movesLeftThisTurn <= 0) {
            // 风女被动：攻击后可自由移动一格（不消耗移速）
            if (unit.cardName === "风女" && unit.windGirlFreeMoveAvailable && !unit.windGirlFreeMoveUsed) {
                // 允许自由移动，跳过移速检查
            } else {
                showToast(trText(`${unit.cardName} 本回合移动次数已用完`, `${unit.cardName} this turn move count exhausted`));
                return false;
            }
        }
        if (unit.shaLinBindTurn > 0 && (targetRow !== unit.shaLinBindRow || targetCol !== unit.shaLinBindCol)) {
            showToast(trText(`🪞 ${unit.cardName} 被纱琳定身，无法离开该格！`, `🪞 ${unit.cardName} rooted by Shalin, cannot leave that tile!`));
            return false;
        }
        // 赫菲斯托斯方块：敌方不可走入 / 不可走出
        if (gameState.hephaestusBlocks.some(b => b.row === targetRow && b.col === targetCol && b.side !== unit.side)) {
            showToast(trText(`该格有敌方方块，无法走入`, `that tile has enemy block, cannot walk into`)); return false;
        }
        if (gameState.hephaestusBlocks.some(b => b.row === unit.row && b.col === unit.col && b.side !== unit.side)) {
            showToast(trText(`处于敌方方块中，无法走出`, `is in enemy block, cannot walk out`)); return false;
        }
        const forward = getForwardDelta(unit.side);
        // 参谋在场或机车党自身或风女风之步：可自由向前后左右移动
        const hasCanMou = gameState.units.some(u => u.side === unit.side && u.cardName === "参谋" && u.life > 0);
        const windGirlFreeMove = unit.cardName === "风女" && unit.windGirlFreeMoveAvailable && !unit.windGirlFreeMoveUsed;
        if (!hasCanMou && unit.cardName !== "机车党" && !windGirlFreeMove) {
            if (targetRow !== unit.row + forward || targetCol !== unit.col) {
                showToast(trText(trText(`只能向前移动一格`, `can only forward move one tile`), `can only forward move one tile`));
                return false;
            }
        } else {
            if (Math.abs(targetRow - unit.row) + Math.abs(targetCol - unit.col) !== 1) {
                showToast(trText(`只能移动一格`, `can only move one tile`));
                return false;
            }
        }
        const hasNonLueyingEnemy = gameState.units.some(u => u.row === targetRow && u.col === targetCol && u.side !== unit.side && u.cardName !== "掠影" && u.cardName !== "影舞姬" && u.cardName !== "镜中人");
        if (hasNonLueyingEnemy && unit.cardName !== "掠影" && unit.cardName !== "影舞姬" && unit.cardName !== "镜中人" && unit.cardName !== "机车党") { showToast(trText(trText(`目标有敌方单位，请攻击`, `target has enemy unit, please attack`), `target has enemy unit, please attack`)); return false; }
        if (!canAddUnit(targetRow, targetCol, unit.side) && unit.cardName !== "护援兵" && unit.cardName !== "镜中人") { showToast(trText(`格子已满 (最多2个单位)`, `tile is full (up to 2 unit)`)); return false; }
        if (unit.side === SIDE_PLAYER0 && targetRow < 1) { showToast(trText(`蓝方单位不能越过红方城下`, `Blue unit cannot pass over Red Gate`)); return false; }
        if (unit.side === SIDE_PLAYER1 && targetRow > 3) { showToast(trText(`红方单位不能越过蓝方城下`, `Red unit cannot pass over Blue Gate`)); return false; }
        // 记录移动方向（unit位置更新前）
        const movedForward = targetRow === unit.row + forward && targetCol === unit.col;
        unit.row = targetRow;
        unit.col = targetCol;
        unit.moved = true;
        addLog(trText(`${unit.cardName} 移动至 (${ROW_NAMES[targetRow]},${COLS[targetCol]})`, `${unit.cardName} move to ( ${ROW_NAMES[targetRow]} , ${COLS[targetCol]} )`));
        showToast(trText(`🚀 ${unit.cardName} 前进`, `🚀 ${unit.cardName} advance`));
        // 风女被动：非前进方向或无移速时使用自由移动（不消耗移速）
        if (unit.cardName === "风女" && unit.windGirlFreeMoveAvailable && !unit.windGirlFreeMoveUsed && (!movedForward || unit.movesLeftThisTurn <= 0)) {
            unit.windGirlFreeMoveUsed = true;
            unit.windGirlFreeMoveAvailable = false;
            addLog(trText(trText(`💨 ${unit.cardName} 发动风之步，自由移动一格！`, `💨 ${unit.cardName} triggers Wind Step, freely move one tile!`), `💨 ${unit.cardName} triggers Wind Step, freely move one tile!`));
            showToast(trText(trText(`💨 风之步！自由移动`, `💨 Wind Step! freely move`), `💨 Wind Step! freely move`));
            unit.moved = (unit.movesLeftThisTurn !== undefined && unit.movesLeftThisTurn > 0) ? false : true;
        } else if (unit.movesLeftThisTurn !== undefined) {
            unit.movesLeftThisTurn--;
            if (unit.movesLeftThisTurn > 0) {
                unit.moved = false;
                addLog(trText(`${unit.cardName} 剩余移动次数 ${parseFloat(unit.movesLeftThisTurn.toFixed(2))}`, `${unit.cardName} left move times ${parseFloat(unit.movesLeftThisTurn.toFixed(2))}`));
                showToast(trText(trText(`🏇 还可移动 ${parseFloat(unit.movesLeftThisTurn.toFixed(2))} 步`, `🏇 still can move ${parseFloat(unit.movesLeftThisTurn.toFixed(2))} step`), `🏇 still can move ${parseFloat(unit.movesLeftThisTurn.toFixed(2))} step`));
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
            addLog(trText(`🪞 镜像移动至 ${ROW_NAMES[mirror.row]}${COLS[mirror.col]}`, `🪞 mirror move to ${ROW_NAMES[mirror.row]} ${COLS[mirror.col]}`));
        }
        // ── 机车党碰撞：主动移动走进敌方所在格，对同格所有敌方造成1物伤（不算攻击，不消耗攻击次数） ──
        if (unit.cardName === "机车党") {
            const collided = getUnitsAt(targetRow, targetCol).filter(u => u.side !== unit.side && u.life > 0 && !u.isMirror);
            for (const e of collided) {
                const source = { cardName: unit.cardName, side: unit.side, dmgType: "⚔️", id: unit.id, fromSkill: true };
                await applyDamageWithSource(e, 1, source, false, "⚔️");
                addLog(trText(`🏍️ ${unit.cardName} 与 ${e.cardName} 重合，碰撞造成1物伤！`, `🏍️ ${unit.cardName} with ${e.cardName} overlap, collision deals 1 physical damage!`));
            }
            if (collided.length > 0) showToast(trText(`🏍️ 机车党碰撞！`, `🏍️ Motorcyclist collision!`));
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
        if (!unit || !unit.riluoPlaced) { showToast(trText(trText(`绫罗在身上`, `Ling Luo is with the owner`), `Ling Luo is with the owner`)); return false; }
        if (!canRiluoReturn(unit)) { showToast(trText(trText(`无法回绫罗（被定身/目标格已满/敌方城池）`, `cannot recall Ling Luo (was rooted /target tile is full /enemy castle)`), `cannot recall Ling Luo (was rooted /target tile is full /enemy castle)`)); return false; }
        unit.row = unit.riluoRow;
        unit.col = unit.riluoCol;
        unit.riluoPlaced = false;
        unit.riluoRow = -1;
        unit.riluoCol = -1;
        applyShaLinCellBinding(unit);
        addLog(trText(trText(`🧵 ${unit.cardName} 回到绫罗处并拾起绫罗`, `🧵 ${unit.cardName} back to Ling Luo and picks up Ling Luo`), `🧵 ${unit.cardName} back to Ling Luo and picks up Ling Luo`));
        showToast(trText(trText(`🧵 回绫罗！`, `🧵 recall Ling Luo!`), `🧵 recall Ling Luo!`));
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
        addLog(trText(trText(`🧵 ${unit.cardName} 受致命伤，绫罗护体，自动回到绫罗处`, `🧵 ${unit.cardName} takes lethal damage, Ling Luo protection, automatically back to Ling Luo`), `🧵 ${unit.cardName} takes lethal damage, Ling Luo protection, automatically back to Ling Luo`));
        showToast(trText(`🧵 绫罗护体！`, `🧵 Ling Luo protection!`));
        renderUI();
        return true;
    }

    async function placeUnit(side, card, row, col, cardIndex) {
        if (side !== gameState.turn) { showToast(trText("不是你的回合", 'Not your turn')); return false; }
        // 新手教程：仅当前步骤允许放置时才放行
        if (typeof tutorialAllowAction === 'function' && !tutorialAllowAction('place')) { tutorialBlock('放置单位'); return false; }
        if (card.name === "护盾") { showToast(trText(trText(`护盾只能在手牌中发挥作用，不能放置到棋盘`, `shield can only at hand take effect, cannot place onto board`), `shield can only at hand take effect, cannot place onto board`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
        if (card.name === "无中生有") { showToast(trText(trText(`无中生有不能放置到场上，请在手中使用`, `Out of Thin Air cannot place onto on board, please from your hand use`), `Out of Thin Air cannot place onto on board, please from your hand use`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
        if (card.name === "鼠疫") { showToast(trText(trText(`鼠疫不能放置到场上，请在手中使用`, `Plague cannot place onto on board, please from your hand use`), `Plague cannot place onto on board, please from your hand use`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
        if (card.name === "军营") {
            const castleRow = getOwnCastleRow(side);
            const belowCastleRow = castleRow + getForwardDelta(side);
            if (row !== castleRow && row !== belowCastleRow) { showToast(trText(`军营只能放置在己方城池（${ROW_NAMES[castleRow]}）或城下（${ROW_NAMES[belowCastleRow]}）`, `Barracks can only place at your castle ( ${ROW_NAMES[castleRow]} ) or gate ( ${ROW_NAMES[belowCastleRow]} )`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
        } else if (card.name === "稻草人") {
            const castleRow = getOwnCastleRow(side);
            const belowCastleRow = castleRow + getForwardDelta(side);
            if (row !== castleRow && row !== belowCastleRow && row !== 2) { showToast(trText(`稻草人只能放置在己方城池（${ROW_NAMES[castleRow]}）、城下（${ROW_NAMES[belowCastleRow]}）或中线上`, `Scarecrow can only place at your castle ( ${ROW_NAMES[castleRow]} ), gate ( ${ROW_NAMES[belowCastleRow]} ) or Mid Line on`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
        } else {
            const isNearBarracks = gameState.units.some(u => u.side === side && u.cardName === "军营" && u.life > 0 && Math.abs(u.row - row) <= 1 && Math.abs(u.col - col) <= 1);
            const enemyCastleRow = side === SIDE_PLAYER0 ? 0 : 4;
            const isEnemyCastleRow = row === enemyCastleRow;
            if (row !== getOwnCastleRow(side) && (!isNearBarracks || isEnemyCastleRow)) { showToast(trText(trText(`只能在你方的城池行（${ROW_NAMES[getOwnCastleRow(side)]}）或军营周围放置，不可在敌方城池行放置`, `can only at your side of castle row ( ${ROW_NAMES[getOwnCastleRow(side)]} ) or Barracks around place, cannot at enemy castle row place`), `can only at your side of castle row ( ${ROW_NAMES[getOwnCastleRow(side)]} ) or Barracks around place, cannot at enemy castle row place`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
        }
        if (card.disabled) { showToast(trText(`此手牌已被禁卫禁用，无法放置`, `this hand already Royal Guard disabled, cannot place`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
        let cost = card.cost;
        if (card.name === "狂战士") {
            const enemyCount = gameState.units.filter(u => u.side !== side).length;
            let finalLife = card.life + enemyCount;
            if (finalLife >= 5) cost = 2;
        }
        // 国王征税修正
        cost = Math.max(0, cost + (gameState.kingCostMod[side] || 0));
        if (!infiniteManaEnabled && gameState.players[side].mana < cost) { showToast(trText(`费用不足，需要 ${cost}`, `not enough mana, needs ${cost}`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
        const hasEnemy = gameState.units.some(u => u.row === row && u.col === col && u.side !== side);
        const canPlaceOnEnemy = ["掠影", "影舞姬", "镜中人"].includes(card.name);
        if (hasEnemy && !canPlaceOnEnemy) { showToast(trText(`格子有敌方单位，无法放置`, `tile has enemy unit, cannot place`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
        if (card.name !== "护援兵" && card.name !== "镜中人" && !canAddUnit(row, col, side)) { showToast(trText(trText(`该格子已有两个我方单位`, `that tile has two your side unit`), `that tile has two your side unit`)); gameState.selectedCardIdx = -1; renderUI(); return false; }
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
            bountyLevel: 0, // 悬赏等级：0=无悬赏，1-4=悬赏状态（3/5/7/9连杀进入），被移除时对方获得对应费
            absoluteImmunityTurns: 0,
            reviveTimesLeft: 0,
            extraAttacks: (card.extraAttacks || 0),
            attacksLeftThisTurn: 0,
            weakenedEnemies: [],
            eagleEyeTargets: [],
            eagleEyeTurns: 0, // 致盲剩余回合（须显式初始化，避免 undefined 与 <= 比较出错）
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
            blazeCharging: false, // 炽炎射手：蓄力中
            blazeChargeTurns: 0,  // 炽炎射手：已蓄力回合数（1-3）
            blazeReleaseTurn: false, // 炽炎射手：蓄力完成回合（不能再蓄力）
            blazeBonusDmg: 0, // 炽炎射手：蓄力释放回合的法伤加成
            qinmoCharging: false, // 琴魔：蓄力中
            qinmoTargetRow: -1, // 琴魔：目标横行
            qinmoReleaseTurn: false, // 琴魔：蓄力完成回合（不能再蓄力或攻击）
            windGirlEnergy: 0, // 风女：能量（0~3，跨回合保存）
            windGirlSkillUsedThisTurn: false, // 风女：本回合已用技能
            windGirlFreeMoveAvailable: false, // 风女：攻击后可自由移动
            windGirlFreeMoveUsed: false, // 风女：本回合已用自由移动
        };
        if (card.name === "枷锁猎手") {
            newUnit.shieldValue = 2;
            newUnit.nativeShieldValue = 2;
            addLog(trText(`${newUnit.cardName} 出场，获得 2 点自带护盾！`, `${newUnit.cardName} on deploy, gains 2 innate shield!`));
            showToast(trText(`🔒 ${newUnit.cardName} 获得2点护盾`, `🔒 ${newUnit.cardName} gains 2 shield`));
        }
        if (card.name === "猫") {
            newUnit.reviveTimesLeft = 8;
            addLog(trText(trText(`${newUnit.cardName} 出场，还有 ${newUnit.reviveTimesLeft} 次复活机会！`, `${newUnit.cardName} on deploy, also ${newUnit.reviveTimesLeft} times revive chance!`), `${newUnit.cardName} on deploy, also ${newUnit.reviveTimesLeft} time revive chance!`));
        }
        if (card.name === "狂战士") {
            const enemyCount = gameState.units.filter(u => u.side !== side).length;
            newUnit.maxLife = card.life + enemyCount; // 出场时生命即为最大生命
            newUnit.life = newUnit.maxLife;
            addLog(trText(`狂战士登场，敌方单位 ${enemyCount} 个，生命+${enemyCount}，当前生命 ${newUnit.life}`, `Berserker deploy, enemy unit ${enemyCount} , HP + ${enemyCount} , current HP ${newUnit.life}`));
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
                addLog(trText(trText(`${friend.cardName} 受武器商加持，攻速×2！（本回合${friend.attacksLeftThisTurn}次攻击）`, `${friend.cardName} boosted by the Arms Dealer, Attack Count ×2! (this turn: ${friend.attacksLeftThisTurn} attacks)`), `${friend.cardName} boosted by the Arms Dealer, Attack Count ×2! (this turn: ${friend.attacksLeftThisTurn} attacks)`));
            }
        }
        // 新放置的单位：如果是当前回合方，初始化本回合攻击次数（必须在骷髅分裂之前，确保副本继承正确的攻击次数）
        if (side === gameState.turn) {
            newUnit.attacksLeftThisTurn = 1 + (newUnit.extraAttacks || 0);
        }
        // 骷髅放置：目标格生成两只，同行另外两格各一只
        if (card.name === "骷髅") {
            addLog(trText(`💀 骷髅分裂放置！`, `💀 Skeleton split place!`));
            // 目标格再生成一只（如果未满）
            if (canAddUnit(row, col, side)) {
                const skel2 = {...newUnit, id: Date.now() + Math.random(), cardName: "骷髅", attacksLeftThisTurn: newUnit.attacksLeftThisTurn, moved: false};
                gameState.units.push(skel2);
                addLog(trText(`  目标格生成额外骷髅`, `target tile spawns extra Skeleton`));
            } else {
                addLog(trText(trText(`  目标格已满，无法生成额外骷髅`, `target tile is full, cannot spawn extra Skeleton`), `target tile is full, cannot spawn extra Skeleton`));
            }
            // 同行另外两格各生成一只
            for (let c = 0; c <= 2; c++) {
                if (c === col) continue;
                const hasEnemy = gameState.units.some(u => u.row === row && u.col === c && u.side !== side);
                if (hasEnemy) {
                    addLog(trText(`  ${ROW_NAMES[row]}${COLS[c]} 有敌方单位，无法生成`, `${ROW_NAMES[row]} ${COLS[c]} has enemy unit, cannot spawn`));
                    continue;
                }
                if (!canAddUnit(row, c, side)) {
                    addLog(trText(trText(`  ${ROW_NAMES[row]}${COLS[c]} 已满，无法生成`, `${ROW_NAMES[row]} ${COLS[c]} is full, cannot spawn`), `${ROW_NAMES[row]} ${COLS[c]} is full, cannot spawn`));
                    continue;
                }
                const skel = {...newUnit, id: Date.now() + Math.random(), cardName: "骷髅", col: c, attacksLeftThisTurn: newUnit.attacksLeftThisTurn, moved: false};
                gameState.units.push(skel);
                addLog(trText(`  ${ROW_NAMES[row]}${COLS[c]} 生成一只骷髅`, `${ROW_NAMES[row]} ${COLS[c]} spawns one Skeleton`));
            }
        }
        // 武器商被动：新放置的单位若与武器商同格，翻倍剩余攻击次数
        if (newUnit.side === gameState.turn && newUnit.cardName !== "武器商") {
            const sameCellSmith = gameState.units.filter(x => x.side === side && x.row === row && x.col === col && x.cardName === "武器商" && x.life > 0);
            if (sameCellSmith.length > 0) {
                newUnit.attacksLeftThisTurn = (newUnit.attacksLeftThisTurn || 0) * 2;
                newUnit.weaponSmithBoosted = true;
                addLog(trText(trText(`${newUnit.cardName} 受武器商加持，攻速×2！（本回合${newUnit.attacksLeftThisTurn}次攻击）`, `${newUnit.cardName} boosted by the Arms Dealer, Attack Count ×2! (this turn: ${newUnit.attacksLeftThisTurn} attacks)`), `${newUnit.cardName} boosted by the Arms Dealer, Attack Count ×2! (this turn: ${newUnit.attacksLeftThisTurn} attacks)`));
            }
        }
        gameState.players[side].hand.splice(cardIndex, 1);
        // 测试模式卡标记传递：从手牌变为单位时继承 _fromTestPanel
        if (card._fromTestPanel) newUnit._fromTestPanel = true;
        // 检查是否放入定身格
        applyShaLinCellBinding(newUnit);
        addLog(trText(trText(`放置 ${card.name} 于 ${ROW_NAMES[row]}${COLS[col]}`, `place ${card.name} at ${ROW_NAMES[row]} ${COLS[col]}`), `place ${card.name} at ${ROW_NAMES[row]} ${COLS[col]}`));
        showToast(trText(`✅ 召唤 ${card.name}`, `✅ summon ${card.name}`));
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
        addLog(trText(trText(`🏍️ ${u.cardName} 蓄力完成！本回合移速+${bonus}（总移速${parseFloat(u.movesLeftThisTurn.toFixed(2))}）`, `🏍️ ${u.cardName} charge complete! this turn Speed + ${bonus} (total Speed ${parseFloat(u.movesLeftThisTurn.toFixed(2))} )`), `🏍️ ${u.cardName} charge complete! this turn Speed + ${bonus} (total Speed ${parseFloat(u.movesLeftThisTurn.toFixed(2))} )`));
        showToast(trText(`🏍️ 蓄力释放！移速+${bonus}`, `🏍️ charge casts! Speed + ${bonus}`));
    }

    // 炽炎射手：释放蓄力，本回合攻速+蓄力回合数，每次攻击+法伤加成（仅本回合有效）
    function releaseBlazeArcher(u) {
        const turns = u.blazeChargeTurns || 0;
        const atkBonus = turns;
        const dmgBonus = turns >= 2 ? 1 : 0;
        u.blazeCharging = false;
        u.blazeChargeTurns = 0;
        u.blazeReleaseTurn = true;
        u.blazeBonusDmg = dmgBonus;
        u.attacksLeftThisTurn = 1 + atkBonus;
        addLog(trText(trText(`🔥 ${u.cardName} 蓄力完成！本回合攻速+${atkBonus}（共${1 + atkBonus}次），每次攻击+${dmgBonus}法伤`, `🔥 ${u.cardName} charge complete! This turn Attack Count +${atkBonus} (total ${1 + atkBonus}), each attack +${dmgBonus} magic damage`), `🔥 ${u.cardName} charge complete! This turn Attack Count +${atkBonus} (total ${1 + atkBonus}), each attack +${dmgBonus} magic damage`));
        showToast(trText(`🔥 蓄力释放！攻速+${atkBonus}，法伤+${dmgBonus}`, `🔥 charge casts! Attack Count + ${atkBonus} , magic damage + ${dmgBonus}`));
    }

    // 琴魔：释放蓄力，对目标横行所有敌人造成3点法伤（蓄力完成回合不能攻击）
    async function releaseQinmo(u) {
        const targetRow = u.qinmoTargetRow;
        u.qinmoCharging = false;
        u.qinmoReleaseTurn = true;
        u.attacksLeftThisTurn = 0;
        const targets = gameState.units.filter(t => t.side !== u.side && t.life > 0 && t.row === targetRow);
        addLog(trText(`🎵 ${u.cardName} 蓄力完成！对${ROW_NAMES[targetRow]}所有敌人造成3点法伤！`, `🎵 ${u.cardName} charge complete! to ${ROW_NAMES[targetRow]} all enemies deals 3 magic damage!`));
        for (const t of targets) {
            await applyDamageWithSource(t, 3, u, false, "🔮");
        }
        u.qinmoTargetRow = -1;
        showToast(trText(`🎵 蓄力释放！对${ROW_NAMES[targetRow]}造成3点法伤`, `🎵 charge casts! to ${ROW_NAMES[targetRow]} deals 3 magic damage`));
    }

    async function startTurn(side) {
        // 回合计数（用于复盘统计）
        if (gameState.matchStats) gameState.matchStats.turnCount++;
        const bigRound = Math.ceil(gameState.matchStats.turnCount / 2);
        const isDeathRound = bigRound >= 25;
        // ── 死亡回合：平局/胜负判定 ──
        if (isDeathRound) {
            const stalemateResult = checkStalemate();
            if (stalemateResult !== null) {
                if (stalemateResult === -1) {
                    addLog(trText(`🤝 死亡回合判定：双方均无法击败对方本体且血量相同（${gameState.players[0].hp} vs ${gameState.players[1].hp}），平局！`, `🤝 Death-round check: neither side can defeat the opponent's base and HP same amount ( ${gameState.players[0].hp} vs ${gameState.players[1].hp} ), Draw!`));
                    showToast(trText(`🤝 平局！`, `🤝 Draw!`));
                    renderUI();
                    if (networkActive()) { try { if (networkIsHost()) networkNotifyGameOver(); } catch (e) {} networkDisconnect('游戏结束'); return; }
                    await showRecapPanel(-1);
                    await startGame();
                    return;
                } else {
                    const winnerSide = stalemateResult;
                    const loserSide = 1 - winnerSide;
                    addLog(trText(`🏆 死亡回合判定：双方均无法击败对方本体，${winnerSide === 0 ? "蓝方" : "红方"}以血量优势获胜（${gameState.players[winnerSide].hp} vs ${gameState.players[loserSide].hp}）！`, `🏆 Death-round check: neither side can defeat the opponent's base, ${winnerSide === 0 ? "蓝方" : "红方"} with an HP advantage wins ( ${gameState.players[winnerSide].hp} vs ${gameState.players[loserSide].hp} )!`));
                    showToast(trText(`🏆 ${winnerSide === 0 ? "蓝方" : "红方"} 获胜！`, `🏆 ${winnerSide === 0 ? "蓝方" : "红方"} wins!`));
                    renderUI();
                    if (networkActive()) { try { if (networkIsHost()) networkNotifyGameOver(); } catch (e) {} networkDisconnect('游戏结束'); return; }
                    await showRecapPanel(winnerSide);
                    await startGame();
                    return;
                }
            }
        }
        // 国王征税：先根据上个大回合的受伤记录计算本回合修正，再记录日志（保证日志与实际扣费一致）
        const kingAlive = gameState.units.some(u => u.side === side && u.cardName === "国王" && u.life > 0);
        gameState.kingCostMod[side] = kingAlive ? (gameState.kingDamagedCount[side] ? 1 : -1) : 0;
        gameState.kingDamagedCount[side] = false;
        const kingCostMod = gameState.kingCostMod[side];
        if (kingCostMod !== 0) {
            addLog(trText(`👑 国王征税：本回合手牌费用${kingCostMod > 0 ? '+' + kingCostMod : kingCostMod}`, `👑 King tax: this turn hand cost ${kingCostMod > 0 ? '+' + kingCostMod : kingCostMod}`));
        }
        // 重置本回合被攻击记录
        gameState.attackedEnemyIds = [];
        // 四眼仔干扰：检查对方是否有激活的行动干扰，若有则本方第一次操作单位将被无效化
        const opponent = 1 - side;
        const jammerUnit = gameState.units.find(u => u.side === opponent && u.nerdJamActive);
        if (jammerUnit) {
            jammerUnit.nerdJamActive = false;
            gameState.nerdJamPending[side] = true;
            addLog(trText(`👓 四眼仔的行动干扰生效！${side === 0 ? "蓝方" : "红方"}本回合第一次控制单位的自主行动将被无效化！`, `👓 Four-Eyes of Action Jam takes effect! ${side === 0 ? "蓝方" : "红方"} this turn once control unit of on its own action was negated!`));
            showToast(trText(`👓 行动干扰！本回合首次操作将被无效化`, `👓 Action Jam! this turn first time action was negated`));
        }
        if (!infiniteManaEnabled) {
            const manaGain = isDeathRound ? 0 : (bigRound >= 6 ? 2 : 1);
            let newMana = gameState.players[side].mana + manaGain;
            if (newMana > gameState.players[side].manaMax) newMana = gameState.players[side].manaMax;
            gameState.players[side].mana = newMana;
            const phaseLabel = isDeathRound ? '（💀死亡回合·不加费）' : (bigRound >= 13 ? '（⚡极速回合）' : (bigRound >= 6 ? '（加速回合）' : ''));
            addLog(trText(`玩家${side === 0 ? "蓝方" : "红方"} 回合开始，费用 +${manaGain}，当前 ${gameState.players[side].mana} 费${phaseLabel}`, `player ${side === 0 ? "蓝方" : "红方"} start of turn, cost + ${manaGain} , current ${gameState.players[side].mana} cost ${phaseLabel}`));
        } else {
            gameState.players[0].mana = gameState.players[0].manaMax;
            gameState.players[1].mana = gameState.players[1].manaMax;
            // 无限费模式下只在首次显示日志
            if (gameState.turn === 0 && side === 0) {
                addLog(trText(`无限费模式：费用保持 ${gameState.players[side].manaMax} 费（无需关注费用显示）`, `Unlimited-mana mode: mana stays at ${gameState.players[side].manaMax} cost (no need to watch mana shows)`));
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
                        if (sweepCaster) { sweepCaster.isSweepCharging = false; addLog(trText(`⚔️ ${sweepCaster.cardName} 横扫蓄力完成`, `⚔️ ${sweepCaster.cardName} sweep charge complete`)); }
                        gameState.dualswordAOEHighlight = null;
                        // 弱化检查：被弱化时延迟AOE伤害无效
                        if (sweepCaster && sweepCaster.weakenedTurns > 0) {
                            addLog(trText(`📉 ${sweepCaster.cardName} 被弱化，双剑延迟AOE伤害无效！`, `📉 ${sweepCaster.cardName} was weakened, Twin Swords delayed AOE damage is negated!`));
                            showToast(trText(`📉 双剑横扫伤害无效`, `📉 Twin Swords sweep damage is negated`));
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
                                addLog(trText(`⚔️ 双剑延迟AOE对 ${e.cardName} 造成 ${dmg} 法伤！`, `⚔️ Twin Swords delayed AOE to ${e.cardName} deals ${dmg} magic damage!`));
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
                    addLog(trText(trText(`💰 费机加费 +1（共 ${u.feijiBonusGiven}/3 次）`, `💰 Mana Engine +1 mana (${u.feijiBonusGiven}/3 used)`), `💰 Mana Engine +1 mana (${u.feijiBonusGiven}/3 used)`));
                }
            }
        }
        for (let u of gameState.units) if (u.side === side && u.stun > 0 && !u.superCharging) { u.moved = true; u.attacksLeftThisTurn = 0; u.skillUsedThisTurn = true; addLog(trText(`${u.cardName} 处于眩晕，无法行动。`, `${u.cardName} is in stun, cannot act.`)); }
        // 重斧兵蓄力期间免疫所有控制和负面效果（霸体）
        // 魔女庇护检查：施法魔女存活且被庇护单位在范围内才保留，否则清除
        for (let u of gameState.units) {
            if (u.witchProtectReduce > 0 && u.witchProtectorId) {
                const protector = gameState.units.find(w => w.id === u.witchProtectorId && w.cardName === "魔女" && w.life > 0);
                if (!protector || Math.abs(u.row - protector.row) > 1 || Math.abs(u.col - protector.col) > 1) {
                    addLog(trText(`${u.cardName} 失去魔女庇护（魔女${!protector ? '已死亡' : '不在范围内'}）`, `${u.cardName} loses Witch shelter (Witch ${!protector ? '已死亡' : '不在范围内'} )`));
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
                if (f.shaLinBindTurn > 0) { f.shaLinBindTurn = 0; f.shaLinBindRow = -1; f.shaLinBindCol = -1; cleared.push('定身'); }
                if (f.weakenedTurns > 0) { f.weakenedTurns = 0; cleared.push('弱化'); }
                if (f.plagueInfected) { f.plagueInfected = false; cleared.push('鼠疫'); }
                if (cleared.length > 0) addLog(trText(trText(`${f.cardName} 被火人同列庇护，${cleared.join('、')}解除！`, `${f.cardName} protected by Fireling in the same column, ${cleared.join('、')} lifted!`), `${f.cardName} protected by Fireling in the same column, ${cleared.join('、')} lifted!`));
            }
        }
        for (let u of [...gameState.units]) if (u.side === side) {
            // 游戏已重置防护：蓄力结算可能触发 showRecapPanel→startGame（旧快照单位不在新局），立即终止避免操作新局状态
            if (!gameState.units.includes(u)) break;
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
            if (u.cardName === "风女") { u.windGirlSkillUsedThisTurn = false; u.windGirlFreeMoveAvailable = false; u.windGirlFreeMoveUsed = false; }
            if (u.equipmentId === 'eagleFeather') { u.eagleFeatherFirstAttackUsed = false; u._guaranteedAttack = false; }
            if (u.cardName === "标枪手") {
                u.spearmanCharges = Math.min(2, (u.spearmanCharges || 0) + 1);
                addLog(trText(`🔱 ${u.cardName} 获得强化普攻（当前${u.spearmanCharges}次）`, `🔱 ${u.cardName} gains empower basic attack (current ${u.spearmanCharges} time)`));
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
                addLog(trText(`🏍️ ${u.cardName} 被控制，蓄力中断！`, `🏍️ ${u.cardName} was controlled, charge interrupted!`));
                showToast(trText(trText(`🏍️ ${u.cardName} 蓄力中断`, `🏍️ ${u.cardName} charge interrupted`), `🏍️ ${u.cardName} charge interrupted`));
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
            if (choice === 0) {
                // 继续蓄力
                u.motChargeTurns += 1;
                u.movesLeftThisTurn = 0;
                u.attacksLeftThisTurn = 0;
                u.moved = true;
                addLog(trText(`🏍️ ${u.cardName} 继续蓄力（${u.motChargeTurns}/3回合）`, `🏍️ ${u.cardName} continue charge ( ${u.motChargeTurns} /3 turns)`));
                showToast(trText(`🏍️ 蓄力 ${u.motChargeTurns}/3 回合`, `🏍️ charge ${u.motChargeTurns} /3 turns`));
            } else {
                // 释放（choice === 1 或取消/弹窗被跳过时默认释放，避免浪费回合）
                releaseMotorcyclist(u);
            }
        }
        // ── 炽炎射手蓄力：回合开始结算（控制中断 / 选择继续蓄力或释放） ──
        for (let u of [...gameState.units]) {
            if (u.side !== side || u.cardName !== "炽炎射手" || u.life <= 0) continue;
            if (!u.blazeCharging) {
                // 蓄力完成回合已过，清除"不能再蓄力"标记和法伤加成
                if (u.blazeReleaseTurn) { u.blazeReleaseTurn = false; u.blazeBonusDmg = 0; }
                continue;
            }
            // 控制类（眩晕/定身/沉默）中断蓄力；位移不中断
            if (u.stun > 0 || u.shaLinBindTurn > 0 || u.silenced > 0) {
                u.blazeCharging = false;
                u.blazeChargeTurns = 0;
                u.blazeReleaseTurn = false;
                u.blazeBonusDmg = 0;
                addLog(trText(`🔥 ${u.cardName} 被控制，蓄力中断！`, `🔥 ${u.cardName} was controlled, charge interrupted!`));
                showToast(trText(trText(`🔥 ${u.cardName} 蓄力中断`, `🔥 ${u.cardName} charge interrupted`), `🔥 ${u.cardName} charge interrupted`));
                continue;
            }
            // 已蓄力3回合：自动释放
            if (u.blazeChargeTurns >= 3) {
                releaseBlazeArcher(u);
                continue;
            }
            // 选择：继续蓄力 / 释放（AI 回合自动选择）
            let choice = -1;
            if (side === aiSide) {
                choice = 0; // AI 策略：继续蓄力至3回合
            } else {
                const dmgPreview = u.blazeChargeTurns >= 2 ? 1 : 0;
                choice = await showSelect(
                    [`继续蓄力（${u.blazeChargeTurns + 1}/3回合）`, `释放（本回合攻速+${u.blazeChargeTurns}，每次攻击+${dmgPreview}法伤）`],
                    `🔥 ${u.cardName} 蓄力 ${u.blazeChargeTurns}/3 回合，选择行动`,
                    {}
                );
                if (!gameState.units.includes(u)) continue;
            }
            // 仅当用户明确选择"继续蓄力"（choice === 0）时继续蓄力；选择"释放"或取消/跳过均释放
            if (choice === 0) {
                u.blazeChargeTurns += 1;
                u.attacksLeftThisTurn = 0;
                addLog(trText(`🔥 ${u.cardName} 继续蓄力（${u.blazeChargeTurns}/3回合）`, `🔥 ${u.cardName} continue charge ( ${u.blazeChargeTurns} /3 turns)`));
                showToast(trText(`🔥 蓄力 ${u.blazeChargeTurns}/3 回合`, `🔥 charge ${u.blazeChargeTurns} /3 turns`));
            } else {
                releaseBlazeArcher(u);
            }
        }
        // ── 琴魔蓄力：回合开始结算（控制中断 / 自动释放） ──
        for (let u of [...gameState.units]) {
            if (u.side !== side || u.cardName !== "琴魔" || u.life <= 0) continue;
            // 蓄力完成回合已过，清除"不能再蓄力"标记
            if (!u.qinmoCharging) {
                if (u.qinmoReleaseTurn) u.qinmoReleaseTurn = false;
                continue;
            }
            // 控制类（眩晕/定身/沉默）中断蓄力
            if (u.stun > 0 || u.shaLinBindTurn > 0 || u.silenced > 0) {
                u.qinmoCharging = false;
                u.qinmoTargetRow = -1;
                u.qinmoReleaseTurn = false;
                addLog(trText(`🎵 ${u.cardName} 被控制，蓄力中断！`, `🎵 ${u.cardName} was controlled, charge interrupted!`));
                showToast(trText(trText(`🎵 ${u.cardName} 蓄力中断`, `🎵 ${u.cardName} charge interrupted`), `🎵 ${u.cardName} charge interrupted`));
                continue;
            }
            // 自动释放（蓄力1回合后自动触发）
            await releaseQinmo(u);
        }
        // 武器商被动：同格友方剩余攻击次数×2
        for (let u of gameState.units) {
            if (u.side === side && u.life > 0 && u.stun === 0) {
                u.weaponSmithBoosted = false;
                const sameCell = gameState.units.filter(x => x.side === side && x.row === u.row && x.col === u.col && x.cardName === "武器商" && x.life > 0);
                if (sameCell.length > 0 && u.cardName !== "武器商") {
                    u.attacksLeftThisTurn = (u.attacksLeftThisTurn || 0) * 2;
                    u.weaponSmithBoosted = true;
                    addLog(trText(trText(`${u.cardName} 受武器商加持，攻速×2！（本回合${u.attacksLeftThisTurn}次攻击）`, `${u.cardName} boosted by the Arms Dealer, Attack Count ×2! (this turn: ${u.attacksLeftThisTurn} attacks)`), `${u.cardName} boosted by the Arms Dealer, Attack Count ×2! (this turn: ${u.attacksLeftThisTurn} attacks)`));
                }
            }
        }
        // 全局状态：每个小回合所有单位统一递减（遍历副本，避免期间 removeUnit 修改数组导致跳过）
        for (let u of [...gameState.units]) {
            if (u.silenced > 0) u.silenced--;
            if (u.eagleEyeTurns > 0) { u.eagleEyeTurns--; if (u.eagleEyeTurns === 0) addLog(trText(`${u.cardName} 致盲结束`, `${u.cardName} blind ends`)); else addLog(trText(`${u.cardName} 致盲剩余 ${u.eagleEyeTurns} 回合（技能失效，被动保留）`, `${u.cardName} blind left ${u.eagleEyeTurns} turn (skill fails, passive keep)`)); }
            if (u.invincibleTurns > 0) { u.invincibleTurns--; addLog(trText(`${u.cardName} 无敌剩余 ${u.invincibleTurns} 回合`, `${u.cardName} invincible left ${u.invincibleTurns} turn`)); if (u.invincibleTurns === 0) { if (u.pendingDeath) { addLog(trText(trText(`🍺 ${u.cardName} 无敌结束，因先前受到的致命伤害死亡！`, `🍺 ${u.cardName}'s invincibility ended; died from the earlier lethal damage!`), `🍺 ${u.cardName}'s invincibility ended; died from the earlier lethal damage!`)); removeUnit(u.id, u.row, u.col, u.side); } else { addLog(trText(`${u.cardName} 无敌结束`, `${u.cardName} invincible ends`)); } } }
            if (u.skillCooldown > 0) { u.skillCooldown--; addLog(trText(`${u.cardName} 技能冷却剩余 ${Math.ceil(u.skillCooldown/2)}大回合`, `${u.cardName} skill cooldown left ${Math.ceil(u.skillCooldown/2)} Big Round`)); }
            if (u.fanCooldown > 0) { u.fanCooldown--; addLog(trText(`${u.cardName} 飞扇冷却剩余 ${Math.ceil(u.fanCooldown/2)}大回合`, `${u.cardName} Flying Fan cooldown left ${Math.ceil(u.fanCooldown/2)} Big Round`)); }
            if (u.kickCooldown > 0) { u.kickCooldown--; addLog(trText(`${u.cardName} 旋风踢冷却剩余 ${Math.ceil(u.kickCooldown/2)}大回合`, `${u.cardName} Tornado Kick cooldown left ${Math.ceil(u.kickCooldown/2)} Big Round`)); }
            if (u.absoluteImmunityTurns > 0) { u.absoluteImmunityTurns--; if (u.absoluteImmunityTurns === 0) addLog(trText(`${u.cardName} 绝对免疫结束`, `${u.cardName} absolute immunity ends`)); else addLog(trText(`${u.cardName} 绝对免疫剩余 ${u.absoluteImmunityTurns} 回合`, `${u.cardName} absolute immunity left ${u.absoluteImmunityTurns} turn`)); }
            if (u.fireGodBuffTurns > 0) { u.fireGodBuffTurns--; if (u.fireGodBuffTurns === 0) { u.range -= 1; addLog(trText(`🔥 ${u.cardName} 的火神强化结束，攻击范围恢复为${u.range}`, `🔥 ${u.cardName} of Fire God empower ends, Attack Range recovers is ${u.range}`)); } }
            if (u.isMirror && u.mirrorTurnsLeft > 0) { u.mirrorTurnsLeft--; if (u.mirrorTurnsLeft === 0) { addLog(trText(`🪞 ${u.cardName} 的镜像消失`, `🪞 ${u.cardName} of mirror vanished`)); removeUnit(u.id, u.row, u.col, u.side); } }
            if (u.hornRecoveryTurns > 0) {
                if (u.hornRecoveryTurns === 1 && (u.hornPendingHeal || 0) > 0 && u.side === side) {
                    const heal = Math.floor((u.hornPendingHeal || 0) / 2);
                    if (heal > 0 && !u.noHeal && u.cardName !== "麻木者") {
                        if (u.isAssimilator) {
                            gameState.assimilatorHp[u.side] = Math.min(gameState.assimilatorHp[u.side] + heal, gameState.assimilatorMaxHp[u.side]);
                            syncAssimilators(u.side);
                            addLog(trText(`🧬 同化者共享生命号角恢复 ${heal} 点！`, `🧬 Assimilator shared HP horn recovers ${heal} point!`));
                        } else {
                            u.life = Math.min(u.life + heal, u.maxLife || u.life);
                            u.pendingDeath = false;
                            addLog(trText(trText(`${u.cardName} 号角庇护恢复 ${heal} 点生命！`, `${u.cardName} horn shelter recovers ${heal} HP!`), `${u.cardName} horn shelter recovers ${heal} HP!`));
                        }
                        showFloatText(u.row, u.col, '+' + heal, 'heal');
                        showToast(trText(`📯 ${u.cardName} 号角恢复${heal}生命`, `📯 ${u.cardName} horn recovers ${heal} HP`));
                    } else if (heal > 0 && (u.noHeal || u.cardName === "麻木者")) {
                        addLog(trText(`🩸 ${u.cardName} 无法回血${u.cardName === "麻木者" ? "（麻木者被动）" : "（禁疗状态）"}，号角庇护无效`, `🩸 ${u.cardName} cannot heal ${u.cardName === "麻木者" ? "（麻木者被动）" : "（禁疗状态）"} , horn shelter invalid`));
                    }
                    u.hornPendingHeal = 0;
                }
                u.hornRecoveryTurns--;
                if (u.hornRecoveryTurns === 0) addLog(trText(`${u.cardName} 号角庇护已结束`, `${u.cardName} horn shelter has ended`));
                else addLog(trText(`${u.cardName} 号角庇护剩余 ${u.hornRecoveryTurns} 回合`, `${u.cardName} horn shelter left ${u.hornRecoveryTurns} turn`));
            }
            // 清理本回合的弱化效果
            if (u.weakenedEnemies && u.weakenedEnemies.length > 0) {
                u.weakenedEnemies = u.weakenedEnemies.filter(e => e.expireTurn !== side);
                if (u.weakenedEnemies.length === 0) addLog(trText(`${u.cardName} 的弱化效果已到期`, `${u.cardName} of weaken effect expires`));
            }
            // 清理本回合的鹰眼效果
            if (u.eagleEyeTargets && u.eagleEyeTargets.length > 0) {
                u.eagleEyeTargets = u.eagleEyeTargets.filter(t => t.expireTurn !== side);
                if (u.eagleEyeTargets.length === 0) addLog(trText(`鹰眼效果已到期`, `Hawkeye effect expires`));
            }
            // 纱琳定身递减
            if (u.shaLinBindTurn > 0) { u.shaLinBindTurn--; if (u.shaLinBindTurn === 0) addLog(trText(`${u.cardName} 定身结束`, `${u.cardName} root ends`)); }
            // 旗手庇护递减
            if (u.flagBearerProtectTurn > 0) { u.flagBearerProtectTurn--; if (u.flagBearerProtectTurn === 0) addLog(trText(`${u.cardName} 旗手庇护结束`, `${u.cardName} Banner Bearer shelter ends`)); }
        }
        // 禁卫手牌禁用递减（每小回合递减）
        for (let p of gameState.players) {
            for (let c of p.hand) {
                if (c.disabledTurns > 0) {
                    c.disabledTurns--;
                    if (c.disabledTurns === 0) {
                        c.disabled = false;
                        c.disabledBy = null;
                        addLog(trText(`手牌 ${c.name} 的禁用已到期，现在可以使用。`, `hand ${c.name} of disabled expires, at can use.`));
                    }
                }
            }
        }
        // 纱琳定身格子递减
        for (let i = gameState.shaLinBoundCells.length - 1; i >= 0; i--) {
            const cell = gameState.shaLinBoundCells[i];
            cell.turnsLeft--;
            if (cell.turnsLeft <= 0) {
                addLog(trText(`🪞 ${ROW_NAMES[cell.row]}${COLS[cell.col]} 格定身效果消失`, `🪞 ${ROW_NAMES[cell.row]} ${COLS[cell.col]} tile root effect vanished`));
                gameState.shaLinBoundCells.splice(i, 1);
            }
        }
        // 赫菲斯托斯方块递减
        for (let i = gameState.hephaestusBlocks.length - 1; i >= 0; i--) {
            const b = gameState.hephaestusBlocks[i];
            b.turnsLeft--;
            if (b.turnsLeft <= 0) {
                addLog(trText(`🧱 ${ROW_NAMES[b.row]}${COLS[b.col]} 的方块消失`, `🧱 ${ROW_NAMES[b.row]} ${COLS[b.col]} of block vanished`));
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
            addLog(trText(`🤖 AI 从预牌堆选了 ${prepool[idx]?.name || '无'}`, `🤖 AI from Pre-Pool chose ${prepool[idx]?.name || '无'}`));
            return idx;
        }
        gameState.isModalOpen = true;
        return new Promise((resolve) => { const overlay = document.createElement('div'); overlay.className = 'prepick-overlay'; const panel = document.createElement('div'); panel.className = 'prepick-panel'; panel.innerHTML = translateText(`<h3>请选择一张预牌加入手牌</h3>`); const btnContainer = document.createElement('div'); btnContainer.className = 'prepick-buttons'; for (let i = 0; i < prepool.length; i++) { const card = prepool[i]; const btn = document.createElement('button'); btn.className = 'prepick-btn'; btn.innerText = translateText(`${card.name} (费${card.cost})   ❤️${card.life}`); btn.onclick = () => { overlay.remove(); gameState.isModalOpen = false; resolve(i); }; btnContainer.appendChild(btn); } panel.appendChild(btnContainer); const cancelBtn = document.createElement('button'); cancelBtn.innerText = translateText('取消结束回合'); cancelBtn.className = 'prepick-btn prepick-cancel'; cancelBtn.onclick = () => { overlay.remove(); gameState.isModalOpen = false; resolve(-1); }; panel.appendChild(cancelBtn); overlay.appendChild(panel); document.body.appendChild(overlay); }); }

    // ========== 极速回合：选2张预牌 ==========
    async function showPrepickPanel2(prepool) {
        if (gameState.isModalOpen) return [-1, -1];
        // 远程联机：转发给远程端（退化为分两步选）
        if (networkActive()) {
            const decisionSide = networkPromptSide !== null ? networkPromptSide : gameState.turn;
            networkPromptSide = null;
            if (networkShouldForwardPrompt(decisionSide)) {
                gameState.isModalOpen = true;
                const answer1 = await networkRequestPrompt({ kind: 'prepick', prepool });
                gameState.isModalOpen = false;
                if (answer1 === -1 || answer1 < 0 || answer1 >= prepool.length) return [-1, -1];
                const remaining = [...prepool];
                remaining.splice(answer1, 1);
                gameState.isModalOpen = true;
                const answer2 = await networkRequestPrompt({ kind: 'prepick', prepool: remaining });
                gameState.isModalOpen = false;
                if (answer2 === -1 || answer2 < 0 || answer2 >= remaining.length) return [-1, -1];
                // 将 answer2 映射回原 prepool 索引
                let realIdx2 = answer2;
                if (answer2 >= answer1) realIdx2 = answer2 + 1;
                return [answer1, realIdx2];
            }
        }
        return await showPrepickPanel2Local(prepool);
    }

    async function showPrepickPanel2Local(prepool) {
        if (gameState.isModalOpen) return [-1, -1];
        // AI 自动选2张
        if (aiActing && typeof aiSelectPrepoolCard2 === 'function') {
            const indices = aiSelectPrepoolCard2(prepool);
            addLog(trText(`🤖 AI 从预牌堆选了 ${indices.map(i => prepool[i]?.name || '无').join('、')}`, `🤖 AI from Pre-Pool chose ${indices.map(i => prepool[i]?.name || '无').join('、')}`));
            return indices;
        }
        gameState.isModalOpen = true;
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'prepick-overlay';
            const panel = document.createElement('div');
            panel.className = 'prepick-panel';
            panel.innerHTML = translateText(`<h3>⚡ 极速回合：请选择 <strong>2</strong> 张预牌加入手牌</h3>`);
            const btnContainer = document.createElement('div');
            btnContainer.className = 'prepick-buttons';
            const selected = new Set();
            const buttons = [];
            for (let i = 0; i < prepool.length; i++) {
                const card = prepool[i];
                const btn = document.createElement('button');
                btn.className = 'prepick-btn';
                btn.innerHTML = translateText(`${card.name} (费${card.cost}) ❤️${card.life}`);
                btn.onclick = () => {
                    if (selected.has(i)) {
                        selected.delete(i);
                        btn.classList.remove('prepick-selected');
                    } else if (selected.size < 2) {
                        selected.add(i);
                        btn.classList.add('prepick-selected');
                    }
                    confirmBtn.disabled = selected.size !== 2;
                    confirmBtn.innerText = translateText(selected.size === 2 ? `✅ 确认选 ${selected.size} 张` : `请选 ${2 - selected.size} 张`);
                };
                buttons.push(btn);
                btnContainer.appendChild(btn);
            }
            panel.appendChild(btnContainer);
            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;margin-top:10px;';
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'prepick-btn';
            confirmBtn.innerText = translateText('请选 2 张');
            confirmBtn.disabled = true;
            confirmBtn.style.cssText = 'flex:1;background:linear-gradient(135deg,#b8862b,#8a6418);color:#fff;font-weight:bold;';
            confirmBtn.onclick = () => {
                if (selected.size !== 2) return;
                overlay.remove();
                gameState.isModalOpen = false;
                resolve([...selected]);
            };
            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = translateText('取消结束回合');
            cancelBtn.className = 'prepick-btn prepick-cancel';
            cancelBtn.style.cssText = 'flex:1;';
            cancelBtn.onclick = () => { overlay.remove(); gameState.isModalOpen = false; resolve([-1, -1]); };
            btnRow.appendChild(confirmBtn);
            btnRow.appendChild(cancelBtn);
            panel.appendChild(btnRow);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
        });
    }

    // ========== 极速回合：手牌满时弃2张 ==========
    async function discardForNewCards2(side, newCards) {
        if (gameState.isModalOpen) return [-1, -1];
        // AI 自动弃2张
        if (aiActing && side === aiSide && typeof aiSelectDiscard2 === 'function') {
            const indices = aiSelectDiscard2(side, newCards);
            addLog(trText(`🤖 AI 弃掉了 ${indices.map(i => gameState.players[side].hand[i]?.name || newCards[i - gameState.players[side].hand.length]?.name).join('、')}`, `🤖 AI discard ${indices.map(i => gameState.players[side].hand[i]?.name || newCards[i - gameState.players[side].hand.length]?.name).join('、')}`));
            return indices;
        }
        // 联机：转发给远程端
        if (typeof networkShouldForwardPrompt === 'function' && networkShouldForwardPrompt(side)) {
            const allCards = [...gameState.players[side].hand, ...newCards];
            const options = allCards.map((c, idx) => `${idx + 1}. ${c.name} (费${c.cost})`);
            // 分两步选弃牌
            const sel1 = await networkRequestPrompt({ kind: 'select', options, title: `手牌已满，请选择第1张弃掉`, opts: {} });
            if (sel1 === -1 || sel1 >= options.length) return [-1, -1];
            const remaining = options.filter((_, i) => i !== sel1);
            const sel2 = await networkRequestPrompt({ kind: 'select', options: remaining, title: `请选择第2张弃掉`, opts: {} });
            if (sel2 === -1 || sel2 >= remaining.length) return [-1, -1];
            // 映射回原索引
            let realIdx2 = sel2;
            if (sel2 >= sel1) realIdx2 = sel2 + 1;
            return [sel1, realIdx2];
        }
        return await discardForNewCards2Local(side, newCards);
    }

    async function discardForNewCards2Local(side, newCards) {
        if (gameState.isModalOpen) return [-1, -1];
        if (aiActing && side === aiSide && typeof aiSelectDiscard2 === 'function') {
            const indices = aiSelectDiscard2(side, newCards);
            addLog(trText(`🤖 AI 弃掉了2张手牌`, `🤖 AI discard 2 hand`));
            return indices;
        }
        gameState.isModalOpen = true;
        const hand = gameState.players[side].hand;
        const allCards = [...hand, ...newCards];
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'discard-overlay';
            const panel = document.createElement('div');
            panel.className = 'discard-panel';
            panel.innerHTML = translateText(`<h3>手牌已满，请选择 <strong>2</strong> 张弃掉</h3><p>（原有手牌 + 新获得的牌）</p>`);
            const btnContainer = document.createElement('div');
            btnContainer.className = 'discard-buttons';
            const selected = new Set();
            const buttons = [];
            allCards.forEach((card, idx) => {
                const btn = document.createElement('button');
                btn.className = 'discard-btn-choice';
                const isNew = idx >= hand.length;
                btn.innerHTML = translateText(`${card.name} (费${card.cost})${isNew ? ' <span style="color:#4ade80">🆕</span>' : ''}`);
                btn.onclick = () => {
                    if (selected.has(idx)) {
                        selected.delete(idx);
                        btn.classList.remove('discard-selected');
                    } else if (selected.size < 2) {
                        selected.add(idx);
                        btn.classList.add('discard-selected');
                    }
                    confirmBtn.disabled = selected.size !== 2;
                };
                buttons.push(btn);
                btnContainer.appendChild(btn);
            });
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'discard-btn-choice';
            confirmBtn.innerText = translateText(`请选 ${2} 张弃掉`);
            confirmBtn.disabled = true;
            confirmBtn.style.cssText = 'background:linear-gradient(135deg,#b8862b,#8a6418);color:#fff;font-weight:bold;';
            confirmBtn.onclick = () => {
                if (selected.size !== 2) return;
                overlay.remove();
                gameState.isModalOpen = false;
                resolve([...selected]);
            };
            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = translateText('取消（放弃新牌）');
            cancelBtn.className = 'discard-btn-choice discard-cancel';
            cancelBtn.onclick = () => { overlay.remove(); gameState.isModalOpen = false; resolve([-1, -1]); };
            panel.appendChild(btnContainer);
            panel.appendChild(confirmBtn);
            panel.appendChild(cancelBtn);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
        });
    }

    // ========== 死亡回合：平局/胜负判定 ==========
    function canSideDamageBase(side, checkMana) {
        // 检查场上单位
        for (const unit of gameState.units) {
            if (unit.side === side && !unit.isMirror && unit.life > 0) {
                if (unit.dmgValue > 0) return true;
                // 临时攻击加成（鼓手鼓舞等）可使物理单位造成伤害
                if (unit.tempAttackBonus > 0 && unit.dmgType === '⚔️') return true;
                // 祭献加成（一次性，仅物理）
                if (unit.nextAttackBonus > 0 && unit.dmgType === '⚔️') return true;
                // 炽炎射手蓄力释放回合有法伤加成
                if ((unit.blazeBonusDmg || 0) > 0) return true;
            }
        }
        // 检查场上是否有鼓手（可鼓舞其他物理单位造成伤害）
        for (const unit of gameState.units) {
            if (unit.side === side && unit.cardName === "鼓手" && unit.life > 0) return true;
        }
        // 死亡回合：手牌和预牌堆需检查费用是否足够打出
        const mana = gameState.players[side].mana;
        // 检查手牌
        for (const card of gameState.players[side].hand) {
            if (card.dmgValue > 0 && (!checkMana || mana >= card.cost)) return true;
        }
        // 检查预牌堆
        for (const card of gameState.players[side].prepool) {
            if (card.dmgValue > 0 && (!checkMana || mana >= card.cost)) return true;
        }
        return false;
    }

    function checkStalemate() {
        const side0CanDamage = canSideDamageBase(0, true);
        const side1CanDamage = canSideDamageBase(1, true);
        if (!side0CanDamage && !side1CanDamage) {
            const hp0 = gameState.players[0].hp;
            const hp1 = gameState.players[1].hp;
            if (hp0 > hp1) return 0;
            if (hp1 > hp0) return 1;
            return -1; // 平局
        }
        return null;
    }

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
            addLog(trText(`🤖 AI 选择: ${options[choice] || '跳过'} (来自: ${title})`, `🤖 AI select: ${options[choice] || '跳过'} (from: ${title} )`));
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
            modal.innerHTML = translateText(`<div class="custom-modal-content"><p>${escapeHtml(title)}</p>${listHtml}<div class="custom-modal-buttons"><button class="custom-modal-btn cancel">取消</button></div></div>`);

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
            modal.innerHTML = `<div class="custom-modal-content"><p>${escapeHtml(translateText(message))}</p><div class="custom-modal-buttons"><button class="custom-modal-btn confirm">${t('common.confirm')}</button><button class="custom-modal-btn cancel">${t('common.cancel')}</button></div></div>`;
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
        if (aiActing && !/胜利|Victory|获胜|wins|Defeat|失败|平局|Draw|Game Over|游戏结束/.test(message)) { return; } // i18n：双语结束消息判断
        gameState.isModalOpen = true;
        return new Promise((resolve) => {
        const modal = document.createElement('div'); modal.className = 'custom-modal'; modal.innerHTML = `<div class="custom-modal-content"><p>${escapeHtml(translateText(message))}</p><div class="custom-modal-buttons"><button class="custom-modal-btn confirm">${t('common.confirm')}</button></div></div>`; modal.querySelector('.confirm').onclick = () => { modal.remove(); gameState.isModalOpen = false; resolve(); }; document.body.appendChild(modal); }); }

    async function endTurn(preselected = null) {
        // 新手教程：仅当前步骤允许结束回合时才放行
        if (typeof tutorialAllowAction === 'function' && !tutorialAllowAction('endTurn')) { tutorialBlock('结束回合'); return; }
        if (gameState.awaitingSkillTarget) { showToast(trText(`正在选择技能目标，请先完成或取消技能`, `currently select skill target, please complete or cancel skill`)); return; }
        if (gameState.awaitingGlide) { showToast(trText(`请先完成或跳过滑步`, `please complete or skip glide`)); return; }
        if (gameState.awaitingMirrorAttack) { showToast(trText(`请先选择攻击目标或取消攻击`, `please select attack target or cancel attack`)); return; }
        // 联机客机乐观流程：确认与预牌选择已由客机本地完成，随指令直达（跳过弹窗往返）
        let confirmed;
        if (preselected && typeof preselected.confirmed === 'boolean') confirmed = preselected.confirmed;
        else confirmed = await showConfirm(trText("是否结束当前回合？", 'End the current turn?'));
        if (!confirmed) { addLog(trText("结束回合已取消。", 'End turn cancelled.')); return; }
        let cur = gameState.turn;
        let prepool = gameState.players[cur].prepool;
        // 确保预牌堆始终尽可能补满至3张（极速回合需至少2张可选）
        while (gameState.players[cur].prepool.length < 3 && gameState.players[cur].deck.length > 0) {
            gameState.players[cur].prepool.push(gameState.players[cur].deck.shift());
        }
        prepool = gameState.players[cur].prepool;
        // ── 极速回合：第13大回合起，每回合选2张预牌 ──
        const currentBigRound = Math.ceil(gameState.matchStats.turnCount / 2);
        const isExtremeSpeed = currentBigRound >= 13;
        if (isExtremeSpeed && prepool.length >= 2) {
            let selectedIndices;
            if (preselected && Array.isArray(preselected.prepick2)) selectedIndices = preselected.prepick2;
            else selectedIndices = await showPrepickPanel2(prepool);
            if (selectedIndices[0] === -1 || selectedIndices[1] === -1) { addLog(trText("结束回合已取消。", 'End turn cancelled.')); return; }
            // 从 prepool 中取出选中的2张牌（按索引降序 splice 避免错位）
            const sortedIdx = [...selectedIndices].sort((a, b) => b - a);
            const newCards = sortedIdx.map(i => prepool.splice(i, 1)[0]);
            const hand = gameState.players[cur].hand;
            const overflow = hand.length + newCards.length - gameState.players[cur].handMax;
            if (overflow <= 0) {
                // 手牌足够空间，直接加入
                for (const c of newCards) { hand.push(c); addLog(trText(`获得 ${c.name}`, `gains ${c.name}`)); }
                showToast(trText(`🃏 获得 ${newCards.map(c => c.name).join('、')}`, `🃏 gains ${newCards.map(c => c.name).join('、')}`));
            } else if (overflow === 1) {
                // 多出1张：沿用已有逻辑（先选1张弃掉，再加入新牌）
                let discardIdx;
                if (preselected && typeof preselected.discardIdx === 'number') discardIdx = preselected.discardIdx;
                else discardIdx = await discardForNewCard(cur, newCards[0]);
                if (discardIdx === -1) { addLog(trText(`放弃获得 ${newCards.map(c => c.name).join('、')}`, `gave up gaining ${newCards.map(c => c.name).join('、')}`)); }
                else { discardCard(cur, discardIdx); for (const c of newCards) hand.push(c); addLog(trText(`获得 ${newCards.map(c => c.name).join('、')}`, `gains ${newCards.map(c => c.name).join('、')}`)); showToast(trText(`🃏 获得 ${newCards.map(c => c.name).join('、')}`, `🃏 gains ${newCards.map(c => c.name).join('、')}`)); }
            } else {
                // 多出2张：新流程（从全部牌中选2张弃掉）
                let discardIndices;
                if (preselected && Array.isArray(preselected.discardIdx2)) discardIndices = preselected.discardIdx2;
                else discardIndices = await discardForNewCards2(cur, newCards);
                if (discardIndices[0] === -1) { addLog(trText(`放弃获得 ${newCards.map(c => c.name).join('、')}`, `gave up gaining ${newCards.map(c => c.name).join('、')}`)); }
                else {
                    // 处理弃牌：hand 区索引 vs newCards 区索引
                    const handLen = hand.length;
                    const handDiscards = [];
                    const newCardDiscards = new Set();
                    for (const idx of discardIndices) {
                        if (idx < handLen) handDiscards.push(idx);
                        else newCardDiscards.add(idx - handLen);
                    }
                    handDiscards.sort((a, b) => b - a);
                    for (const idx of handDiscards) discardCard(cur, idx);
                    for (let i = 0; i < newCards.length; i++) {
                        if (!newCardDiscards.has(i)) { hand.push(newCards[i]); addLog(trText(`获得 ${newCards[i].name}`, `gains ${newCards[i].name}`)); }
                        else addLog(trText(`弃掉 ${newCards[i].name}`, `discard ${newCards[i].name}`));
                    }
                    const gainedCards = newCards.filter((_, i) => !newCardDiscards.has(i));
                    if (gainedCards.length > 0) showToast(trText(`🃏 获得 ${gainedCards.map(c => c.name).join('、')}`, `🃏 gains ${gainedCards.map(c => c.name).join('、')}`));
                    else showToast(trText(`🗑️ 已弃掉2张牌`, `🗑️ discard 2 cards`));
                }
            }
        } else if (prepool.length > 0) {
            // 普通回合：选1张预牌（原有逻辑）
            let selectedIndex;
            if (preselected && typeof preselected.prepick === 'number') selectedIndex = preselected.prepick;
            else selectedIndex = await showPrepickPanel(prepool);
            if (selectedIndex === -1 || selectedIndex < 0 || selectedIndex >= prepool.length) { addLog(trText("结束回合已取消。", 'End turn cancelled.')); return; }
            let selectedCard = prepool.splice(selectedIndex, 1)[0];
            if (gameState.players[cur].hand.length >= gameState.players[cur].handMax) {
                let discardIdx;
                if (preselected && typeof preselected.discardIdx === 'number') discardIdx = preselected.discardIdx;
                else discardIdx = await discardForNewCard(cur, selectedCard);
                if (discardIdx === -1) { addLog(trText(`放弃获得 ${selectedCard.name}`, `gave up gaining ${selectedCard.name}`)); }
                else { discardCard(cur, discardIdx); gameState.players[cur].hand.push(selectedCard); addLog(trText(`获得 ${selectedCard.name}`, `gains ${selectedCard.name}`)); showToast(trText(`🃏 获得 ${selectedCard.name}`, `🃏 gains ${selectedCard.name}`)); }
            } else { gameState.players[cur].hand.push(selectedCard); addLog(trText(`获得 ${selectedCard.name}`, `gains ${selectedCard.name}`)); showToast(trText(`🃏 获得 ${selectedCard.name}`, `🃏 gains ${selectedCard.name}`)); }
        }
        while (gameState.players[cur].prepool.length < 3 && gameState.players[cur].deck.length > 0) gameState.players[cur].prepool.push(gameState.players[cur].deck.shift());
        for (let u of gameState.units) if (u.stun > 0) { u.stun--; if (u.stun === 0) addLog(trText(`${u.cardName} 从眩晕中恢复。`, `${u.cardName} from stun recovers.`)); }
        for (let u of gameState.units) if (u.weakenedTurns > 0) { u.weakenedTurns--; if (u.weakenedTurns === 0) addLog(trText(`${u.cardName} 弱化效果结束。`, `${u.cardName} weaken effect ends.`)); }
        // 回合结束时清除本方未消耗的行动干扰，避免残留到下一回合
        gameState.nerdJamPending[cur] = false;
        let next = cur === 0 ? 1 : 0;
        gameState.turn = next;
        gameState.selectedCardIdx = -1;
        gameState.selectedUnitId = null;
        clearSkillTarget();
        await startTurn(next);
        addLog(trText(`===== 玩家${next === 0 ? "蓝方" : "红方"} 回合 =====`, `===== player ${next === 0 ? "蓝方" : "红方"} turn =====`));
        renderUI();
    }