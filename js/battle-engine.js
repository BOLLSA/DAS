// File: battle-engine.js
// Section: battle: removeUnit, applyDamage, performAttack
// Lines: 765-1586 (from original Dark Age Saga.html)

    // ========== ⚔️ 战斗引擎（攻击/伤害/死亡） ==========
    // ── 悬赏机制：悬赏单位被移除时，另一方获得对应费用 ──
    function grantBountyOnRemoval(unit) {
        const level = unit.bountyLevel || 0;
        if (level <= 0 || unit.isMirror) return;  // 无悬赏或镜像幽灵不发赏金
        const rewardSide = 1 - unit.side;
        const p = gameState.players[rewardSide];
        p.mana = Math.min(p.manaMax, p.mana + level);
        addLog(`💰 悬赏兑现！${unit.cardName}（${level}级悬赏）被移除，${rewardSide === 0 ? "蓝方" : "红方"}获得 ${level} 费赏金！`);
        showToast(`💰 悬赏 +${level}费`);
    }

    // ── 击杀奖励统一结算（伤害路径与秒杀路径共用）──
    // 暴食者回血增伤 / 血舞攻速 / 连杀计数 / 悬赏升级
    async function resolveKillRewards(source, victim) {
        // 镜中人击杀刷新镜像持续时间
        if (source && source.cardName === "镜中人" && !source.isMirror) {
            const refreshMirror = getMirrorOf(source);
            if (refreshMirror) { refreshMirror.mirrorTurnsLeft = 3; addLog(`🪞 击杀刷新镜像持续时间`); }
        }
        // 暴食者被动：击杀后回满血+永久物伤+1（禁疗则不回血，但仍增伤）
        if (source && source.cardName === "暴食者") {
            if (!source.noHeal) {
                source.life = source.maxLife || 4; // 回满（考虑甘泉/霜痕提升的生命上限）
                addLog(`🍗 暴食者击杀敌方，生命回满，物伤永久+1（当前${source.dmgValue}）`);
            } else {
                addLog(`🍗 暴食者击杀敌方，但处于禁疗状态，无法回血（物伤永久+1）`);
            }
            source.dmgValue += 1;
            showToast(`🍗 暴食者饱餐！物伤+1`);
        }
        // 血舞被动：击杀后攻速+1
        if (source && source.cardName === "血舞") {
            source.extraAttacks = (source.extraAttacks || 0) + 1;
            source.attacksLeftThisTurn = (source.attacksLeftThisTurn || 0) + 1;
            addLog(`💃 血舞击杀敌方，攻速+1（当前额外攻速${source.extraAttacks}）`);
            showToast(`💃 血舞攻速+1`);
        }
        // 连杀系统（秒杀/斩杀路径同样计入连杀与悬赏）
        if (source && source.id !== undefined && source.life > 0) {
            let ks = gameState.killStreakMap[source.id];
            if (ks && ks.unitName === source.cardName) {
                ks.count++;
            } else {
                ks = { count: 1, unitName: source.cardName };
                gameState.killStreakMap[source.id] = ks;
            }
            if (ks.count >= 2) showKillStreak(ks.unitName, ks.count);
            // ── 悬赏机制：3/5/7/9 连杀进入 1/2/3/4 级悬赏状态 ──
            const bountyForStreak = ks.count >= 9 ? 4 : ks.count >= 7 ? 3 : ks.count >= 5 ? 2 : ks.count >= 3 ? 1 : 0;
            if (bountyForStreak > (source.bountyLevel || 0)) {
                source.bountyLevel = bountyForStreak;
                addLog(`💰 悬赏！${source.cardName} 达成 ${ks.count} 连杀，进入 ${bountyForStreak} 级悬赏状态！`);
                showToast(`💰 悬赏 ${bountyForStreak} 级`);
                renderUI();
            }
        }
    }
    function removeUnit(unitId, deathRow, deathCol, deathSide) {
        // 修复：防止循环递归（A 死→触发 B 死→B 也在处理中时跳过）
        if (processingDeathIds.has(unitId)) return null;
        const idx = gameState.units.findIndex(u => u.id === unitId);
        if (idx === -1) return null;
        const unit = gameState.units[idx];
        // ── 装备：复活甲检查（在执行死亡逻辑之前拦截） ──
        if (unit.equipmentId === 'reviveArmor' && !unit.reviveUsed) {
            unit.reviveUsed = true;
            unit.pendingRevive = true;
            unit.life = 0;
            lastDamageDealer = null;  // 复活甲拦截死亡，未发生真实击杀，清除击杀归属
            addLog(`💀 ${unit.cardName} 的复活甲触发，将在下一个我方回合开始时复活！`);
            showToast(`💀 ${unit.cardName} 复活甲触发！`);
            return null;
        }
        // 镜中人死亡：移除其镜像
        const dyingMirror = getMirrorOf(unit);
        if (dyingMirror) {
            const mIdx = gameState.units.findIndex(u => u.id === dyingMirror.id);
            if (mIdx !== -1) gameState.units.splice(mIdx, 1);
            addLog(`🪞 ${unit.cardName} 死亡，镜像消失`);
        }
        delete gameState.killStreakMap[unitId];
        // ── 悬赏机制：悬赏单位被移除（死亡/自爆/同化/无敌结束死亡等），另一方获得赏金 ──
        // 镜像幽灵无悬赏（bountyLevel 恒 0）；复活甲拦截/猫九命复活路径不经过此处（拦截时未 splice）
        grantBountyOnRemoval(unit);
        processingDeathIds.add(unitId);
        gameState.units.splice(idx, 1);
        // 同化者被移除：共享池和上限-3（放在 splice 之后，避免 killAllAssimilators 递归时旧下标二次 splice）
        if (unit.isAssimilator && !unit._assimilatorCleanup) {
            gameState.assimilatorHp[unit.side] -= 3;
            gameState.assimilatorMaxHp[unit.side] -= 3;
            if (gameState.assimilatorHp[unit.side] <= 0) { killAllAssimilators(unit.side); }
            else { syncAssimilators(unit.side); }
        }
        // 击杀归属追踪
        let killerInfo = '';
        if (lastDamageDealer) {
            const stats = gameState.matchStats;
            if (stats && stats.unitKills) {
                const key = lastDamageDealer.name;
                if (!stats.unitKills[key]) stats.unitKills[key] = { count: 0, side: lastDamageDealer.side };
                stats.unitKills[key].count++;
            }
            killerInfo = `（被${lastDamageDealer.side === 0 ? "蓝方" : "红方"} ${lastDamageDealer.name} 击杀）`;
            lastDamageDealer = null;  // 重置，防止误归因后续非战斗死亡
        }
        addLog(`${unit.cardName}（${unit.side === 0 ? "蓝方" : "红方"}）被消灭！${killerInfo}`);
        // 装备系统：单位死亡时清理装备
        if (unit.equipmentId) {
            const eqDef = getEquipmentDef(unit.equipmentId);
            if (eqDef) addLog(`⚒️ ${unit.cardName} 的 ${eqDef.name} 随之消失`);
            if (eqDef && eqDef.onRemove) eqDef.onRemove(unit);
            unit.equipmentId = null;
        }
        triggerDeathPassive(unit, deathRow, deathCol, deathSide);
        triggerPlagueDeath(unit, deathRow, deathCol);
        processingDeathIds.delete(unitId);
        for (let u of gameState.units) {
            if (u.isCharging && u.chargeTargetId === unitId) {
                u.isCharging = false;
                u.chargeTargetId = null;
                addLog(`${u.cardName} 蓄力目标消失，蓄力失败。`);
            }
            if (u.superCharging && u.superChargeTargetId === unitId) {
                u.superChargeTargetId = null;
                addLog(`${u.cardName} 超级蓄力目标消失，蓄力失败。`);
                u.superCharging = false;
                u.superChargeTurnsLeft = 0;
                u.silenced = 0;
            }
        }
        for (let u of gameState.units) {
            if (u.stunnedBy === unitId) { u.stun = 0; u.stunnedBy = null; addLog(`${u.cardName} 的眩晕施法者已死亡，眩晕解除。`); }
        }
        // 爱神共生死：若死亡单位有绑定且对方仍存活，对方也死（带递归深度保护，最多3层）
        if (unit.cupidPair && !unit._cupidChainDepth) {
            const partner = gameState.units.find(u => u.id === unit.cupidPair.partnerId);
            if (partner && partner.life > 0) {
                addLog(`💘 ${partner.cardName} 因共生死跟随 ${unit.cardName} 一同死亡！`);
                showToast(`💘 共生死！`);
                partner.life = 0;
                partner.dyingFromAifei = true;
                partner._cupidChainDepth = (unit._cupidChainDepth || 0) + 1;
                // 深度保护：最多递归3层
                if (partner._cupidChainDepth <= 3 && !processingDeathIds.has(partner.id)) {
                    removeUnit(partner.id, partner.row, partner.col, partner.side);
                } else if (partner._cupidChainDepth > 3) {
                    addLog(`💘 共生死链过长，阻止递归（安全保护）`);
                }
            }
            // 清除所有绑定到这个 unit 的 cupidPair（双向清理），不论 partner 死活
            for (let u of gameState.units) {
                if (u.cupidPair && u.cupidPair.partnerId === unit.id) {
                    u.cupidPair = null;
                }
            }
        }
        for (let p of gameState.players) {
            for (let c of p.hand) {
                if (c.disabledBy === unitId) { c.disabled = false; c.disabledBy = null; c.disabledTurns = 0; addLog(`手牌 ${c.name} 的禁用施法者已死亡，禁用解除。`); }
            }
        }
        // 横扫蓄力者死亡，清除其延迟攻击
        if (unit.isSweepCharging && gameState.dualswordDelayedAttacks) {
            gameState.dualswordDelayedAttacks = gameState.dualswordDelayedAttacks.filter(da => da.fromUnitId !== unit.id);
            gameState.dualswordAOEHighlight = null;
        }
        // 斩月标记清理
        const zIdx = gameState.zhanYueMarkedEnemyIds.indexOf(unitId);
        if (zIdx >= 0) gameState.zhanYueMarkedEnemyIds.splice(zIdx, 1);
        // 武器商死亡后重新检查同格友方的攻速buff
        recheckAllWeaponSmithBuffs();
        return unit;
    }

    function triggerPlagueDeath(unit, deathRow, deathCol) {
        if (!unit.plagueInfected) return;
        const ownerSide = unit.plagueOwnerSide;
        if (ownerSide === null || ownerSide === undefined) return;
        const spreadTargets = gameState.units.filter(u =>
            u.side !== ownerSide &&
            Math.abs(u.row - deathRow) + Math.abs(u.col - deathCol) <= 1 &&
            u.life > 0
        );
        if (spreadTargets.length === 0) {
            addLog(`☣️ ${unit.cardName} 的鼠疫没有扩散目标`);
            return;
        }
        addLog(`☣️ ${unit.cardName} 死亡，鼠疫向所在格及上下左右四格扩散！`);
        for (let target of [...spreadTargets]) {
            if (!gameState.units.some(u => u.id === target.id)) continue;
            if (target.absoluteImmunityTurns > 0) {
                addLog(`  ${target.cardName} 处于绝对免疫，免疫鼠疫伤害与感染`);
                continue;
            }
            if (!target.plagueInfected) {
                target.plagueInfected = true;
                target.plagueOwnerSide = ownerSide;
                addLog(`  ${target.cardName} 感染鼠疫`);
            } else {
                addLog(`  ${target.cardName} 已感染鼠疫，不重复感染`);
            }
            // 无敌：受到伤害但不会死亡（不消耗护盾）
            if (target.invincibleTurns > 0) {
                target.life -= 1;
                if (target.life <= 0) {
                    target.life = 1;
                    target.pendingDeath = true;
                    addLog(`  ${target.cardName} 处于无敌状态，受到致命鼠疫伤害但暂不死亡`);
                } else {
                    addLog(`  ${target.cardName} 处于无敌状态，受到1点鼠疫伤害（剩余❤️${target.life}）`);
                }
                continue;
            }
            // 蓄势护盾吸收
            if ((target.braceShield || 0) > 0) {
                target.braceShield -= 1;
                target.counterBonus = (target.counterBonus || 0) + 1;
                addLog(`🛡️ ${target.cardName} 的蓄势护盾吸收1点鼠疫伤害`);
                continue;
            }
            // 护盾吸收（优先消耗外来护盾，再消耗自带护盾）
            if ((target.shieldValue || 0) > 0) {
                const absorb = absorbUnitShield(target, 1);
                addLog(`${target.cardName} 的护盾吸收1点鼠疫伤害（剩余护盾${target.shieldValue}）`);
                if (absorb.nativeBroken && target.cardName === "枷锁猎手") {
                    triggerChainedHunterImmunity(target);
                    addLog(`${target.cardName} 自带护盾破碎！触发绝对免疫，移速+1，攻速+1！`);
                    showToast(`🔓 ${target.cardName} 护盾破碎，绝对免疫！`);
                }
                continue;
            }
            // 护身符：致命伤免疫
            if (target.equipmentId === 'amulet' && !target.amuletUsed && target.life - 1 <= 0) {
                target.amuletUsed = true;
                const currentTurn = gameState.turn;
                target.absoluteImmunityTurns = (currentTurn === target.side) ? 3 : 2;
                addLog(`🔮 ${target.cardName} 的护身符触发，免疫致命鼠疫伤害并进入绝对免疫状态！`);
                showToast(`🔮 ${target.cardName} 护身符激活！`);
                continue;
            }
            // 绫罗护体：致命伤免疫并自动回绫罗
            if (target.cardName === "绫罗" && target.riluoPlaced && target.life - 1 <= 0 && gameState.turn !== target.side) {
                if (canRiluoReturn(target)) {
                    target.row = target.riluoRow;
                    target.col = target.riluoCol;
                    target.riluoPlaced = false;
                    target.riluoRow = -1;
                    target.riluoCol = -1;
                    applyShaLinCellBinding(target);
                    addLog(`🧵 ${target.cardName} 受致命鼠疫，绫罗护体，自动回到绫罗处`);
                    showToast(`🧵 绫罗护体！`);
                    continue;
                } else {
                    addLog(`🧵 ${target.cardName} 无法回绫罗，绫罗护体失效`);
                }
            }
            target.life = Math.max(0, target.life - 1);
            addLog(`  ${target.cardName} 受到1点鼠疫伤害（剩余❤️${target.life}）`);
            if (target.life <= 0) removeUnit(target.id, target.row, target.col, target.side);
        }
    }
    async function hunterExecute(unit, col) {
        const enemySide = unit.side === SIDE_PLAYER0 ? SIDE_PLAYER1 : SIDE_PLAYER0;
        // 只过滤存活真实单位（排除镜像幽灵与复活甲待复活尸体）
        let enemies = gameState.units.filter(u => u.col === col && u.side === enemySide && u.life > 0 && !u.isMirror);
        if (enemies.length === 0) { addLog(`${unit.cardName} 死亡时本路无敌人，秒杀无效。`); return; }
        enemies.sort((a,b) => a.row - b.row);
        const options = enemies.map((e, idx) => `${idx+1}. ${e.cardName} (❤️${e.life}) 位于 ${ROW_NAMES[e.row]} ${COLS[e.col]}`);
        options.push("❌ 不杀");
        // 联机：秒杀目标由猎手拥有方决定（猎手多数死在对手回合，默认 gameState.turn 会路由到错误一方）
        if (networkActive()) networkPromptSide = unit.side;
        const selectedIdx = await showSelect(options, `请${unit.side === SIDE_PLAYER0 ? "蓝方" : "红方"}玩家选择要秒杀的单位（或选"不杀"）`, { forceShow: true, aiChoice: (opts) => {
            // AI 拥有猎手时：优先秒杀威胁最高/生命最低的真实敌人，无可选则"不杀"
            const realOpts = enemies.filter(e => e.absoluteImmunityTurns <= 0 && e.invincibleTurns <= 0);
            if (realOpts.length === 0) return opts.length - 1;
            let bestIdx = 0, bestScore = -Infinity;
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i];
                if (e.absoluteImmunityTurns > 0 || e.invincibleTurns > 0) continue;
                const score = e.dmgValue * 3 + e.life;
                if (score > bestScore) { bestScore = score; bestIdx = i; }
            }
            return bestIdx;
        } });
        if (selectedIdx === -1 || selectedIdx === options.length-1) {
            addLog(`放弃选择，未进行秒杀。`);
            showToast(`🕊️ 放弃秒杀`);
            return;
        }
        const target = enemies[selectedIdx];
        addLog(`${unit.cardName} 的亡语：选择了 ${target.cardName} 作为秒杀目标。`);
        if (target.absoluteImmunityTurns > 0) {
            addLog(`${target.cardName} 处于绝对免疫，免疫秒杀！`);
            showToast(`🔒 绝对免疫，秒杀无效`);
            return;
        }
        // 无敌：免疫死亡，无敌结束后因秒杀死亡
        if (target.invincibleTurns > 0) {
            addLog(`${target.cardName} 处于无敌状态，免疫秒杀！无敌结束后将死亡。`);
            showToast(`🍺 ${target.cardName} 无敌免疫秒杀`);
            target.life = 1;
            target.pendingDeath = true;
            renderUI();
            return;
        }
        // 枷锁猎手：自带护盾未被击破时受到秒杀，先破盾触发绝对免疫
        if (target.cardName === "枷锁猎手" && (target.nativeShieldValue || 0) > 0) {
            addLog(`${target.cardName} 自带护盾被秒杀击碎！触发绝对免疫！`);
            target.nativeShieldValue = 0;
            recalcShieldValue(target);
            triggerChainedHunterImmunity(target);
            showToast(`🔓 ${target.cardName} 护盾破碎，绝对免疫！`);
            renderUI();
            return;
        }
        // 麻木者被动：秒杀只掉1血
        if (target.cardName === "麻木者") {
            target.life = Math.max(0, target.life - 1);
            addLog(`${target.cardName} 被秒杀，但被动使其只减少1点生命！`);
            showToast(`💤 ${target.cardName} 只掉1血`);
            if (target.life <= 0) { lastDamageDealer = { name: unit.cardName, side: unit.side }; removeUnit(target.id, target.row, target.col, target.side); }
        } else {
            if (tryRiluoLethalEscape(target)) return;
            lastDamageDealer = { name: unit.cardName, side: unit.side };
            target.life = 0;
            removeUnit(target.id, target.row, target.col, target.side);
        }
        renderUI();  // 亡语秒杀/掉血后立即刷新棋盘，避免残留显示
    }

    function triggerDeathPassive(unit, deathRow, deathCol, deathSide) {
        const card = CARD_LIBRARY.find(c => c.name === unit.cardName);
        if (!card || !card.onDeathPassive) return;
        if (card.onDeathPassive === "revive") {
            const isCastle = (deathSide === SIDE_PLAYER0 && deathRow === 4) || (deathSide === SIDE_PLAYER1 && deathRow === 0);
            if (isCastle) { addLog(`${unit.cardName} 死于城池，无法复活。`); showToast(`🏰 ${unit.cardName} 无法复活`); return; }
            const reviveRow = getOwnCastleRow(unit.side);
            const reviveCol = deathCol;
            if (!canAddUnit(reviveRow, reviveCol, unit.side)) { addLog(`${unit.cardName} 复活失败：目标格子已有两个单位。`); return; }
            const newUnit = {
                id: Date.now() + Math.random(),
                cardName: unit.cardName, side: unit.side, row: reviveRow, col: reviveCol, life: card.life, maxLife: card.life,
                dmgType: card.dmgType, dmgValue: card.dmgValue, range: card.range, moved: false, attacksLeftThisTurn: 0,
                firstAttackBonus: false, bonusUsed: false, invincibleTurns: 0, nextAttackDouble: false,
                tempAttackBonus: 0, skillUsedThisTurn: false, isCharging: false, chargeTargetId: null, skillCooldown: 0, stun: 0,
                nextAttackBonus: 0, superCharging: false, superChargeTurnsLeft: 0, superChargeTargetId: null, superChargeIsBase: false, superChargeBaseSide: null,
                knightSkillUsed: false, halberdierSkillUsed: false, halberdierCharging: false, nerdJamUsed: false, nerdJamActive: false, speed: unit.speed, movesLeftThisTurn: 0, displacedByAllySkillThisTurn: false,
                shieldAvailable: false, transformUsed: false, auraBuff: false, silenced: 0, disabled: false, hornRecoveryTurns: 0, hornPendingHeal: 0, isSweepCharging: false,
                shieldValue: 0, nativeShieldValue: 0, externalShieldSources: {},
                eagleEyeTargets: [], eagleEyeTurns: 0,
                bartenderUseCount: 0, drunkardInvincibleUsed: false, bountyLevel: 0
            };
            addUnit(newUnit);
            addLog(`${unit.cardName} 在己方城池复活！`);
            showToast(`🔄 ${unit.cardName} 复活`);
            // 复活时清除爱神绑定（如果 unit 之前被绑定）
            for (let u of gameState.units) {
                if (u.cupidPair && u.cupidPair.partnerId === unit.id) {
                    u.cupidPair = null;
                }
            }
        } else if (card.onDeathPassive === "execute") {
            (async () => { try { await hunterExecute(unit, deathCol); } catch(e) { console.error('hunterExecute error:', e); } })();
        } else if (card.onDeathPassive === "reviveCat") {
            // 检查是否因爱神技能而死
            if (unit.dyingFromAifei) { addLog(`${unit.cardName} 因爱神技能死亡，无法复活。`); return; }
            if (unit.reviveTimesLeft <= 0) { addLog(`${unit.cardName} 复活次数已用完。`); return; }
            // 原地复活
            const newUnit = {
                id: Date.now() + Math.random(),
                cardName: unit.cardName, side: unit.side, row: deathRow, col: deathCol, life: card.life, maxLife: card.life,
                dmgType: card.dmgType, dmgValue: card.dmgValue, range: card.range, moved: false, attacksLeftThisTurn: 0,
                firstAttackBonus: false, bonusUsed: false, invincibleTurns: 0, nextAttackDouble: false,
                tempAttackBonus: 0, skillUsedThisTurn: false, isCharging: false, chargeTargetId: null, skillCooldown: 0, stun: 0,
                nextAttackBonus: 0, superCharging: false, superChargeTurnsLeft: 0, superChargeTargetId: null, superChargeIsBase: false, superChargeBaseSide: null,
                knightSkillUsed: false, speed: card.speed, movesLeftThisTurn: Math.round(card.speed * 100) / 100, displacedByAllySkillThisTurn: false,
                shieldValue: 0, nativeShieldValue: 0, externalShieldSources: {}, absoluteImmunityTurns: 0, reviveTimesLeft: unit.reviveTimesLeft - 1, extraAttacks: (CARD_LIBRARY.find(c => c.name === unit.cardName) || {}).extraAttacks || 0, attacksLeftThisTurn: 0,
                weakenedEnemies: [], eagleEyeTargets: [], eagleEyeTurns: 0, windSkillUsed: false,
                transformUsed: false, auraBuff: false, silenced: 0, disabled: false, hornRecoveryTurns: 0, hornPendingHeal: 0, isSweepCharging: false,
                cupidPair: null, cupidUseCount: 0, shaLinBindTurn: 0, shaLinBindRow: -1, shaLinBindCol: -1, shaLinUseCount: 0, zhongyiHealUsed: false,
                scapegoatUsed: false, scapegoatProtectorId: null, feijiBonusGiven: 0, feizheBonusGiven: 0, flagBearerProtectTurn: 0, witchProtectReduce: 0, witchProtectorId: null,
                bartenderUseCount: 0, drunkardInvincibleUsed: false, bountyLevel: 0
            };
            gameState.units.push(newUnit);
            addLog(`${unit.cardName} 原地复活！剩余复活次数 ${newUnit.reviveTimesLeft}`);
            showToast(`🐱 ${unit.cardName} 复活（剩余${newUnit.reviveTimesLeft}次）`);
            // 猫复活时清除爱神绑定
            for (let u of gameState.units) {
                if (u.cupidPair && u.cupidPair.partnerId === unit.id) {
                    u.cupidPair = null;
                }
            }
        }
    }

    function findGuardToAbsorb(targetUnit, damageAmount) {
        if (targetUnit.cardName === "守卫") return null;
        const sameRowUnits = gameState.units.filter(u => u.row === targetUnit.row && u.side === targetUnit.side);
        const guards = sameRowUnits.filter(u => u.cardName === "守卫" && u !== targetUnit && u.life > 0 && !u.isMirror);
        if (guards.length === 0) return null;
        return guards[0];
    }

    function findShieldGuardToAbsorb(targetUnit, damageAmount) {
        if (targetUnit.cardName === "盾兵") return null;
        const sameColUnits = gameState.units.filter(u => u.col === targetUnit.col && u.side === targetUnit.side);
        const shieldGuards = sameColUnits.filter(u => u.cardName === "盾兵" && u !== targetUnit && u.life > 0 && !u.isMirror);
        if (shieldGuards.length === 0) return null;
        return shieldGuards[0];
    }

    async function tryUseShieldToAbsorb(targetUnit, damageAmount) {
        const player = gameState.players[targetUnit.side];
        const shieldIdx = player.hand.findIndex(c => c.name === "护盾");
        if (shieldIdx === -1) return false;
        const shield = player.hand[shieldIdx];
        if (!infiniteManaEnabled && player.mana < shield.cost) return false;
        // AI 自动决策：关键单位受到致命伤害或费用充裕时使用护盾
        if (targetUnit.side === aiSide) {
            const isLethal = targetUnit.life <= damageAmount;
            const isValuable = targetUnit.dmgValue >= 2 || targetUnit.cardName === "军营" || targetUnit.cardName === "费机";
            const manaPlenty = player.mana >= 5;
            if (isLethal && (isValuable || manaPlenty)) {
                if (!infiniteManaEnabled) player.mana -= shield.cost;
                player.hand.splice(shieldIdx, 1);
                if (gameState.selectedCardIdx === shieldIdx) gameState.selectedCardIdx = -1;
                else if (gameState.selectedCardIdx > shieldIdx) gameState.selectedCardIdx--;
                addLog(`🤖 AI 使用护盾抵挡对 ${targetUnit.cardName} 的 ${damageAmount} 点伤害`);
                return true;
            }
            return false;
        }
        const confirmMsg = `是否使用手牌中的护盾（消耗 ${shield.cost} 费）抵挡对 ${targetUnit.cardName} 的 ${damageAmount} 点伤害？`;
        // 远程联机：防御决策方是被攻击方
        if (networkActive()) networkPromptSide = targetUnit.side;
        const useShield = await showConfirm(confirmMsg, true); // forceShow: 防御提示必须向人类展示
        if (useShield) {
            if (!infiniteManaEnabled) player.mana -= shield.cost;
            player.hand.splice(shieldIdx, 1);
            addLog(`护盾从手牌中消耗（消耗 ${shield.cost} 费），抵挡了 ${damageAmount} 点伤害。`);
            showToast(`🛡️ 护盾抵挡伤害（-${shield.cost}费）`);
            if (gameState.selectedCardIdx === shieldIdx) gameState.selectedCardIdx = -1;
            else if (gameState.selectedCardIdx > shieldIdx) gameState.selectedCardIdx--;
            return true;
        }
        return false;
    }

    // 血舞防御：提取为独立函数，所有伤害路径统一调用
    async function tryYangYuhuanDefend(target, dmg) {
        // 用临时标记防止同一伤害被多次询问
        if (target._yangDefendChecked) return dmg;
        if (target.cardName !== '血舞' || (target.extraAttacks || 0) <= 0) return dmg;  // 非血舞/无额外攻速：不询问也不置标记
        target._yangDefendChecked = true;
        // AI 自动防御：有额外攻速且受伤时始终抵消
        if (target.side === aiSide) {
            if (target.extraAttacks > 0 && dmg > 0) {
                const reduced = Math.min(dmg, 2);
                dmg -= reduced;
                target.extraAttacks--;
                target.attacksLeftThisTurn = Math.max(0, (target.attacksLeftThisTurn || 0) - 1);
                addLog(`🤖 AI 血舞消耗1次额外攻速抵消 ${reduced} 点伤害`);
            }
            target._yangDefendChecked = false;
            return dmg;
        }
        // 远程联机：防御决策方是被攻击方
        if (networkActive()) networkPromptSide = target.side;
        const wantDefend = await showConfirm(`💃 血舞是否消耗1次额外攻速抵消最多2点伤害？（当前额外攻速${target.extraAttacks}）`, true); // forceShow: 防御提示必须向人类展示
        if (wantDefend) {
            const reduced = Math.min(dmg, 2);
            dmg -= reduced;
            target.extraAttacks--;
            target.attacksLeftThisTurn = Math.max(0, (target.attacksLeftThisTurn || 0) - 1);
            addLog(`💃 血舞消耗1次额外攻速，抵消 ${reduced} 点伤害！剩余额外攻速 ${target.extraAttacks}`);
            showToast(`💃 血舞抵消 ${reduced} 伤害`);
        } else {
            addLog(`💃 血舞放弃使用防御`);
        }
        // 重置标记，允许同一回合后续伤害再次触发询问
        target._yangDefendChecked = false;
        return dmg;
    }

    // 枷锁猎手：自带护盾破碎后触发绝对免疫 + 永久移速/攻速加成
    function triggerChainedHunterImmunity(target) {
        target.absoluteImmunityTurns = 2;
        target.extraAttacks = (target.extraAttacks || 0) + 1;
        target.attacksLeftThisTurn = (target.attacksLeftThisTurn || 0) + 1;
        target.speed = target.speed + 1;
        target.movesLeftThisTurn = (target.movesLeftThisTurn || 0) + 1;
    }

    // 计算单位外来护盾总量（按来源汇总）
    function getExternalShieldTotal(unit) {
        const sources = unit.externalShieldSources;
        if (!sources) return 0;
        let total = 0;
        for (const id in sources) total += sources[id];
        return total;
    }

    // 重算总护盾 = 自带护盾 + 外来护盾总量
    function recalcShieldValue(unit) {
        unit.shieldValue = (unit.nativeShieldValue || 0) + getExternalShieldTotal(unit);
    }

    // 护盾吸收：优先消耗外来护盾（按来源逐个扣除），再消耗自带护盾；返回剩余伤害与自带护盾是否破碎
    function absorbUnitShield(target, amount) {
        const nativeShield = target.nativeShieldValue || 0;
        let remaining = amount;
        let absorbedExternal = 0;
        let absorbedNative = 0;

        // 先消耗外来护盾（按来源）
        const sources = target.externalShieldSources;
        if (sources) {
            const toAbsorb = Math.min(getExternalShieldTotal(target), remaining);
            if (toAbsorb > 0) {
                let left = toAbsorb;
                for (const id in sources) {
                    if (left <= 0) break;
                    const take = Math.min(sources[id], left);
                    sources[id] -= take;
                    left -= take;
                    if (sources[id] <= 0) delete sources[id];
                }
                absorbedExternal = toAbsorb;
                remaining -= absorbedExternal;
            }
        }

        // 再消耗自带护盾
        let nativeBroken = false;
        if (nativeShield > 0 && remaining > 0) {
            absorbedNative = Math.min(nativeShield, remaining);
            remaining -= absorbedNative;
            target.nativeShieldValue = nativeShield - absorbedNative;
            nativeBroken = absorbedNative > 0 && absorbedNative >= nativeShield;
        }

        recalcShieldValue(target);
        return { remaining, nativeBroken, absorbedExternal, absorbedNative };
    }

    // 替伤者自身防御结算：守卫/盾兵代为承受时，其护盾、减伤、免疫、无敌正常生效
    // 返回 { remaining, blocked }：blocked=true 表示替伤伤害被完全挡下（无需继续扣血）
    async function applyRedirectTargetDefense(actualTarget, amount, effectiveDmgType, isUnblockable, source) {
        // 碎镜减伤
        if (actualTarget.pureSkyDamageReduction && !isUnblockable) {
            amount = Math.floor(amount * 0.7);
            addLog(`🌌 ${actualTarget.cardName} 碎镜减伤，替伤伤害降至${amount}`);
            if (amount === 0) return { remaining: 0, blocked: true };
        }
        // 虚无之衣：生命上限>4时受伤-1
        if (actualTarget.equipmentId === 'voidCloak' && (actualTarget.maxLife || 0) > 4 && !isUnblockable) {
            amount = Math.max(0, amount - 1);
            addLog(`🫥 ${actualTarget.cardName} 虚无之衣减伤1点（当前伤害${amount}）`);
            if (amount === 0) return { remaining: 0, blocked: true };
        }
        // 绝对免疫：替伤伤害也免疫
        if (actualTarget.absoluteImmunityTurns > 0) {
            addLog(`${actualTarget.cardName} 处于绝对免疫状态，免疫替伤伤害！`);
            showToast(`🔒 ${actualTarget.cardName} 绝对免疫`);
            return { remaining: 0, blocked: true };
        }
        // 无敌：替伤伤害扣血但不会死亡
        if (actualTarget.invincibleTurns > 0) {
            actualTarget.life -= amount;
            showFloatText(actualTarget.row, actualTarget.col, '-' + amount, 'damage');
            flashCellHit(actualTarget.row, actualTarget.col);
            if (source) {
                flashCellAttack(source.row, source.col);
                if (source.row !== actualTarget.row || source.col !== actualTarget.col) {
                    showAttackBeam(source.row, source.col, actualTarget.row, actualTarget.col);
                }
            }
            if (actualTarget.life <= 0) {
                actualTarget.life = 1;
                actualTarget.pendingDeath = true;
                addLog(`${actualTarget.cardName} 处于无敌状态，替伤伤害致命但暂不死亡，无敌结束后将死亡！`);
            } else {
                addLog(`${actualTarget.cardName} 处于无敌状态，替伤 ${amount} 伤害但不会死亡，当前生命 ${actualTarget.life}`);
            }
            return { remaining: 0, blocked: true };
        }
        // 蓄势护盾
        if ((actualTarget.braceShield || 0) > 0 && !isUnblockable) {
            const absorbed = Math.min(actualTarget.braceShield, amount);
            actualTarget.braceShield -= absorbed;
            amount -= absorbed;
            actualTarget.counterBonus = (actualTarget.counterBonus || 0) + absorbed;
            addLog(`🛡️ ${actualTarget.cardName} 的蓄势护盾吸收 ${absorbed} 点替伤伤害，反击增伤 +${absorbed}（当前${actualTarget.counterBonus}）`);
            if (amount <= 0) {
                showFloatText(actualTarget.row, actualTarget.col, '蓄势护盾', 'shield');
                return { remaining: 0, blocked: true };
            }
        }
        // 护盾（外来→自带）
        if ((actualTarget.shieldValue || 0) > 0 && !isUnblockable) {
            const absorb = absorbUnitShield(actualTarget, amount);
            amount = absorb.remaining;
            if (absorb.absorbedExternal > 0) addLog(`${actualTarget.cardName} 的外来护盾抵消了 ${absorb.absorbedExternal} 点替伤伤害`);
            if (absorb.absorbedNative > 0) addLog(`${actualTarget.cardName} 的自带护盾抵消了 ${absorb.absorbedNative} 点替伤伤害`);
            if (absorb.absorbedExternal + absorb.absorbedNative > 0) {
                addLog(`${actualTarget.cardName} 的护盾共抵消了 ${absorb.absorbedExternal + absorb.absorbedNative} 点替伤伤害（剩余护盾 ${actualTarget.shieldValue}）`);
            }
            // 枷锁猎手自带护盾破碎时，触发绝对免疫，忽略多余伤害
            if (absorb.nativeBroken && actualTarget.cardName === "枷锁猎手") {
                triggerChainedHunterImmunity(actualTarget);
                addLog(`${actualTarget.cardName} 自带护盾破碎！触发绝对免疫，移速+1，攻速+1！多余伤害忽略！`);
                showToast(`🔓 ${actualTarget.cardName} 护盾破碎，绝对免疫！`);
                return { remaining: 0, blocked: true };
            }
            if (amount <= 0) return { remaining: 0, blocked: true };
        }
        // 暗影纱法术护盾
        if (effectiveDmgType === '🔮' && (actualTarget.magicShieldValue || 0) > 0 && !isUnblockable) {
            if (actualTarget.magicShieldValue >= amount) {
                actualTarget.magicShieldValue -= amount;
                addLog(`🧥 ${actualTarget.cardName} 的暗影纱抵消了 ${amount} 点替伤法术伤害`);
                showFloatText(actualTarget.row, actualTarget.col, '法术护盾', 'shield');
                return { remaining: 0, blocked: true };
            } else {
                amount -= actualTarget.magicShieldValue;
                addLog(`🧥 ${actualTarget.cardName} 的暗影纱抵消了 ${actualTarget.magicShieldValue} 点替伤法术伤害`);
                actualTarget.magicShieldValue = 0;
            }
        }
        // 手牌护盾
        if (!isUnblockable) {
            const shielded = await tryUseShieldToAbsorb(actualTarget, amount);
            if (shielded) return { remaining: 0, blocked: true };
        }
        return { remaining: amount, blocked: false };
    }

    async function applyDamageWithSource(target, amount, source, isUnblockable = false, dmgTypeOverride = null) {
        const effectiveDmgType = dmgTypeOverride || (source ? source.dmgType : null);
        if (target.isMirror) return;  // 镜像（幽灵实体）无敌

        // ── 装备系统：来源单位装备效果 ──
        const sourceUnit = (source && source.id !== undefined) ? gameState.units.find(u => u.id === source.id && u.life > 0) : null;
        const sourceEqId = sourceUnit ? sourceUnit.equipmentId : null;
        // 苍鹰之羽「必中」：无视手牌护盾及代为承受（但目标自身免疫/绝对免疫仍生效）
        const effectiveUnblockable = isUnblockable || (sourceUnit && sourceUnit._guaranteedAttack === true && !(source && source.fromSkill));
        // 星痕之杖：法术伤害×1.5
        if (sourceEqId === 'starWand' && effectiveDmgType === '🔮') {
            amount = Math.ceil(amount * 1.5);
            addLog(`✨ 星痕之杖：法术伤害提升至${amount}`);
        }
        // 妖刀：对生命<=50%的敌方物伤×2
        if (sourceEqId === 'demonBlade' && effectiveDmgType === '⚔️') {
            const targetMaxLife = target.maxLife || (CARD_LIBRARY.find(c => c.name === target.cardName)?.life || target.life);
            if (target.life <= targetMaxLife * 0.5) {
                amount *= 2;
                addLog(`🗡️ 妖刀：目标生命≤50%，物理伤害翻倍至${amount}`);
            }
        }
        // 雷刃：每攻击2次触发
        if (sourceEqId === 'lightningDagger' && !source.fromSkill && amount > 0 && !sourceUnit._lightningTriggered && !sourceUnit._lightningTriggering) {
            sourceUnit._lightningTriggered = true;
            sourceUnit.lightningCounter = (sourceUnit.lightningCounter || 0) + 1;
            if (sourceUnit.lightningCounter % 2 === 0) {
                sourceUnit._lightningTriggering = true;
                try {
                    await applyDamageWithSource(target, 1, sourceUnit, false, "🔮");
                    const neighbors = gameState.units.filter(u => u.side !== sourceUnit.side && u.life > 0 && u.id !== target.id && !u.isMirror && Math.abs(u.row - target.row) <= 1 && Math.abs(u.col - target.col) <= 1);
                    if (neighbors.length > 0) {
                        const rand = neighbors[Math.floor(Math.random() * neighbors.length)];
                        await applyDamageWithSource(rand, 1, sourceUnit, false, "🔮");
                    }
                    addLog(`⚡ 雷刃触发`);
                } finally {
                    sourceUnit._lightningTriggering = false;
                }
            }
        }
        // 碎镜：受伤减少30%（真伤无视减伤）
        if (target.pureSkyDamageReduction && !isUnblockable) {
            amount = Math.floor(amount * 0.7);
            if (amount === 0) { addLog(`🌌 ${target.cardName} 碎镜减伤，伤害降至0`); return; }
        }
        // 虚无之衣：生命上限>4时，受到的物伤与法伤-1（真伤无视减伤）
        if (target.equipmentId === 'voidCloak' && (target.maxLife || 0) > 4 && !isUnblockable) {
            amount = Math.max(0, amount - 1);
            addLog(`🫥 ${target.cardName} 虚无之衣减伤1点（当前伤害${amount}）`);
            if (amount === 0) return;
        }

        // 绝对免疫：免疫所有伤害和秒杀
        if (target.absoluteImmunityTurns > 0) {
            addLog(`${target.cardName} 处于绝对免疫状态，完全免疫此次伤害！`);
            showToast(`🔒 ${target.cardName} 绝对免疫`);
            return;
        }
        if (target.invincibleTurns > 0) {
            target.life -= amount;
            showFloatText(target.row, target.col, '-' + amount, 'damage');
            flashCellHit(target.row, target.col);
            if (source) {
                flashCellAttack(source.row, source.col);
                if (source.row !== target.row || source.col !== target.col) {
                    showAttackBeam(source.row, source.col, target.row, target.col);
                }
            }
            if (target.life <= 0) {
                target.life = 1;
                target.pendingDeath = true;
                addLog(`${target.cardName} 处于无敌状态，受到致命伤害但暂不死亡，无敌结束后将死亡！`);
            } else {
                addLog(`${target.cardName} 处于无敌状态，受到 ${amount} 伤害但不会死亡，当前生命 ${target.life}`);
            }
            return;
        }
        // 纱琳定身增伤：加入伤害总量后再结算护盾（护盾吸收含增伤，护盾恰好挡满基础伤害时增伤仍生效）
        if (actualTarget.shaLinBindTurn > 0) {
            amount += 1;
            addLog(`🪞 ${actualTarget.cardName} 被纱琳定身，受到的伤害+1`);
        }
        // ── 反击兵蓄势护盾：优先吸收，每吸收1点 → counterBonus+1 ──
        if ((target.braceShield || 0) > 0 && !isUnblockable) {
            const absorbed = Math.min(target.braceShield, amount);
            target.braceShield -= absorbed;
            amount -= absorbed;
            target.counterBonus = (target.counterBonus || 0) + absorbed;
            addLog(`🛡️ ${target.cardName} 的蓄势护盾吸收 ${absorbed} 点伤害，反击增伤 +${absorbed}（当前${target.counterBonus}）`);
            if (amount <= 0) {
                showFloatText(target.row, target.col, '蓄势护盾', 'shield');
                return;
            }
        }
        // 护盾值抵消伤害（优先消耗外来护盾，再消耗自带护盾；真伤无视护盾）
        if ((target.shieldValue || 0) > 0 && !isUnblockable) {
            const absorb = absorbUnitShield(target, amount);
            amount = absorb.remaining;
            if (absorb.absorbedExternal > 0) addLog(`${target.cardName} 的外来护盾抵消了 ${absorb.absorbedExternal} 点伤害`);
            if (absorb.absorbedNative > 0) addLog(`${target.cardName} 的自带护盾抵消了 ${absorb.absorbedNative} 点伤害`);
            if (absorb.absorbedExternal + absorb.absorbedNative > 0) {
                addLog(`${target.cardName} 的护盾共抵消了 ${absorb.absorbedExternal + absorb.absorbedNative} 点伤害（剩余护盾 ${target.shieldValue}）`);
            }
            // 枷锁猎手自带护盾破碎时，触发绝对免疫，忽略多余伤害
            if (absorb.nativeBroken && target.cardName === "枷锁猎手") {
                triggerChainedHunterImmunity(target);
                addLog(`${target.cardName} 自带护盾破碎！触发绝对免疫，移速+1，攻速+1！多余伤害忽略！`);
                showToast(`🔓 ${target.cardName} 护盾破碎，绝对免疫！`);
                return;
            }
            if (amount <= 0) return;
        }
        // ── 装备：暗影纱法术护盾（真伤无视护盾） ──
        if (effectiveDmgType === '🔮' && (target.magicShieldValue || 0) > 0 && !isUnblockable) {
            if (target.magicShieldValue >= amount) {
                target.magicShieldValue -= amount;
                addLog(`🧥 ${target.cardName} 的暗影纱抵消了 ${amount} 点法术伤害`);
                showFloatText(target.row, target.col, '法术护盾', 'shield');
                return;
            } else {
                amount -= target.magicShieldValue;
                addLog(`🧥 ${target.cardName} 的暗影纱抵消了 ${target.magicShieldValue} 点法术伤害`);
                target.magicShieldValue = 0;
            }
        }
        if (!effectiveUnblockable) {
            const shielded = await tryUseShieldToAbsorb(target, amount);
            if (shielded) return;
        }
        let actualTarget = target;
        // 不可格挡伤害跳过血舞防御、守卫/盾兵替伤、替罪羊替死
        if (!effectiveUnblockable) {
            // 血舞自身防御（被攻击时自动弹窗，统一入口）
            amount = await tryYangYuhuanDefend(target, amount);
            if (amount <= 0) { target._yangDefendChecked = false; return; }
            target._yangDefendChecked = false;
            // 旗手庇护：在守卫替伤之前检查原目标，免疫则不需要守卫替伤
            if (target.flagBearerProtectTurn > 0 && effectiveDmgType === "⚔️") {
                addLog(`🚩 旗手庇护：${target.cardName} 免疫物伤！`);
                return;
            }
            let guard = findGuardToAbsorb(target, amount);
            if (guard) {
                actualTarget = guard;
                addLog(`${target.cardName} 受到伤害，由同行的守卫 ${guard.cardName} 代为承受！`);
                showToast(`🛡️ 守卫替伤`);
            } else {
                let shieldGuard = findShieldGuardToAbsorb(target, amount);
                if (shieldGuard) {
                    actualTarget = shieldGuard;
                    addLog(`${target.cardName} 受到伤害，由同列的盾兵 ${shieldGuard.cardName} 代为承受！`);
                    showToast(`🛡️ 盾兵替伤`);
                }
            }
            // ── 替伤者自身防御结算：其护盾/减伤/免疫/无敌正常生效（不再直接扣生命） ──
            if (actualTarget !== target) {
                const defense = await applyRedirectTargetDefense(actualTarget, amount, effectiveDmgType, isUnblockable, source);
                if (defense.blocked) return;
                amount = defense.remaining;
            }
        }
        if (effectiveDmgType === "🔮") {
            // 爱妃法伤减免：检查原目标是否在爱妃正前方两格内（随时生效，不受替伤影响）
            const { reduce } = applyAifeiAura(target, false, "🔮");
            if (reduce > 0) {
                amount -= reduce;
                if (amount <= 0) {
                    addLog(`${actualTarget.cardName} 受到爱妃庇护，法术伤害被完全减免！`);
                    showToast(`💜 爱妃庇护 · 伤害全免`);
                    return;
                }
                addLog(`${actualTarget.cardName} 受到爱妃庇护，法术伤害减免 ${reduce} 点`);
            }
            // 魔女自身法伤-3
            if (actualTarget.cardName === "魔女") { amount = Math.max(0, amount - 3); addLog(`🔮 魔女自身法伤-3`); }
            // 魔女庇护：周围友方本回合受法伤-witchProtectReduce
            if (actualTarget.witchProtectReduce > 0) { amount = Math.max(0, amount - actualTarget.witchProtectReduce); addLog(`🔮 魔女庇护：${actualTarget.cardName} 受法伤-${actualTarget.witchProtectReduce}`); }
            // 法伤减免后伤害为0则提前返回
            if (amount <= 0) {
                addLog(`${actualTarget.cardName} 的法术减伤使伤害完全抵消！`);
                return;
            }
        }
        // 旗手庇护：免疫物伤
        if (actualTarget.flagBearerProtectTurn > 0 && effectiveDmgType === "⚔️") {
            addLog(`🚩 旗手庇护：${actualTarget.cardName} 免疫物伤！`);
            return;
        }
        // 麻木者被动：每次受伤只减1点生命（必须在替罪羊检查之前，否则减伤后不致命但替罪羊错误替死）
        if (actualTarget.cardName === "麻木者" && amount > 1) {
            addLog(`${actualTarget.cardName} 承受伤害，但被动使其只减少1点生命`);
            amount = 1;
        }
        // 替罪羊替死：检查场上是否有 scapegoat 绑定了 actualTarget（使用最终伤害判断是否致命）
        // 不可格挡伤害跳过替罪羊替死
        if (!effectiveUnblockable && actualTarget.life - amount <= 0) {
            const scapeGoat = actualTarget.scapegoatProtectorId ? gameState.units.find(u => u.id === actualTarget.scapegoatProtectorId && u.cardName === "替罪羊" && u.life > 0) : null;
            if (scapeGoat) {
                addLog(`🐑 替罪羊代替 ${actualTarget.cardName} 承受了致死伤害！`);
                showToast(`🐑 替死！`);
                scapeGoat.life = 0;
                actualTarget.scapegoatProtectorId = null;
                removeUnit(scapeGoat.id, scapeGoat.row, scapeGoat.col, scapeGoat.side);
                return; // 目标活着
            }
        }
        // ── 装备：护身符（受到致命伤害时免疫并进入绝对免疫） ──
        if (actualTarget.equipmentId === 'amulet' && !actualTarget.amuletUsed && actualTarget.life - amount <= 0) {
            actualTarget.amuletUsed = true;
            const currentTurn = gameState.turn;
            actualTarget.absoluteImmunityTurns = (currentTurn === actualTarget.side) ? 3 : 2;
            addLog(`🔮 ${actualTarget.cardName} 的护身符触发，免疫致命伤害并进入绝对免疫状态！`);
            showToast(`🔮 ${actualTarget.cardName} 护身符激活！`);
            showFloatText(actualTarget.row, actualTarget.col, '护身符', 'shield');
            flashCellHit(actualTarget.row, actualTarget.col);
            if (source) {
                flashCellAttack(source.row, source.col);
                if (source.row !== actualTarget.row || source.col !== actualTarget.col) {
                    showAttackBeam(source.row, source.col, actualTarget.row, actualTarget.col);
                }
            }
            return;
        }
        // 绫罗：敌方回合受致命伤时免疫并自动回绫罗（真伤/必中等不可阻挡伤害不触发）
        if (actualTarget.cardName === "绫罗" && actualTarget.riluoPlaced && !effectiveUnblockable && actualTarget.life - amount <= 0 && gameState.turn !== actualTarget.side) {
            if (!canRiluoReturn(actualTarget)) {
                addLog(`🧵 ${actualTarget.cardName} 无法回绫罗，绫罗护体失效`);
            } else {
                actualTarget.row = actualTarget.riluoRow;
                actualTarget.col = actualTarget.riluoCol;
                actualTarget.riluoPlaced = false;
                actualTarget.riluoRow = -1;
                actualTarget.riluoCol = -1;
                applyShaLinCellBinding(actualTarget);
                addLog(`🧵 ${actualTarget.cardName} 受致命伤，绫罗护体，自动回到绫罗处`);
                showToast(`🧵 绫罗护体！`);
                showFloatText(actualTarget.row, actualTarget.col, '绫罗护体', 'shield');
                flashCellHit(actualTarget.row, actualTarget.col);
                if (source) {
                    flashCellAttack(source.row, source.col);
                    if (source.row !== actualTarget.row || source.col !== actualTarget.col) {
                        showAttackBeam(source.row, source.col, actualTarget.row, actualTarget.col);
                    }
                }
                return;
            }
        }
        // 号角恢复记录（使用最终伤害金额，护身符/绫罗已免伤的不再记录）
        if (actualTarget.hornRecoveryTurns > 0) {
            actualTarget.hornPendingHeal = (actualTarget.hornPendingHeal || 0) + amount;
            addLog(`${actualTarget.cardName} 号角庇护记录 ${amount} 点伤害，下个友方回合将恢复一半`);
        }
        // 凝血之刃：攻击后目标永久禁疗
        if (sourceEqId === 'coagulationBlade' && !(source && source.fromSkill) && amount > 0) {
            actualTarget.noHeal = true;
            addLog(`🩸 ${actualTarget.cardName} 被凝血之刃命中，永久无法回血`);
        }
        // 甘泉：敌方回合受伤标记（用于下个我方回合判断是否回血）
        if (actualTarget.equipmentId === 'sweetSpring' && gameState.turn !== actualTarget.side && amount > 0) {
            actualTarget.gqDamaged = true;
        }
        // 同化者：伤害打到共享生命池；普通单位：扣个体生命
        if (actualTarget.isAssimilator) {
            gameState.assimilatorHp[actualTarget.side] = Math.max(0, gameState.assimilatorHp[actualTarget.side] - amount);
            syncAssimilators(actualTarget.side);
            addLog(`🧬 同化者 ${actualTarget.cardName} 受到 ${amount} 伤害，共享生命 ${gameState.assimilatorHp[actualTarget.side]}`);
        } else {
            actualTarget.life -= amount;
            addLog(`${actualTarget.cardName} 受到 ${amount} 伤害，剩余生命 ${actualTarget.life}`);
        }
        // 战斗反馈：浮动伤害数字 + 受击闪白 + 攻击路径
        if (amount > 0) {
            showFloatText(actualTarget.row, actualTarget.col, '-' + amount, 'damage');
            flashCellHit(actualTarget.row, actualTarget.col);
            if (source) {
                flashCellAttack(source.row, source.col);
                if (source.row !== actualTarget.row || source.col !== actualTarget.col) {
                    showAttackBeam(source.row, source.col, actualTarget.row, actualTarget.col);
                }
            }
        }
        // 伤害贡献追踪（用于复盘MVP计算）
        if (source && amount > 0 && gameState.matchStats && gameState.matchStats.unitDamage) {
            const key = source.cardName;
            if (!gameState.matchStats.unitDamage[key]) gameState.matchStats.unitDamage[key] = { damage: 0, side: source.side };
            gameState.matchStats.unitDamage[key].damage += amount;
        }
        // 国王受伤追踪
        if (amount > 0 && actualTarget.cardName === "国王") {
            gameState.kingDamagedCount[actualTarget.side] = true;
        }
        // 追刃：记录被攻击的敌方单位（来自普通攻击或技能伤害）
        if (source && amount > 0 && !gameState.attackedEnemyIds.includes(actualTarget.id)) {
            gameState.attackedEnemyIds.push(actualTarget.id);
        }
        // 断脊：普攻对目标额外造成其生命上限15%的物伤（向上取整）
        if (sourceEqId === 'brokenSpine' && !(source && source.fromSkill) && amount > 0 && actualTarget.life > 0 && sourceUnit && !sourceUnit._brokenSpineTriggering) {
            const targetMax = actualTarget.maxLife || (CARD_LIBRARY.find(c => c.name === actualTarget.cardName)?.life) || actualTarget.life;
            const extraDmg = Math.ceil(targetMax * 0.15);
            if (extraDmg > 0) {
                sourceUnit._brokenSpineTriggering = true;
                try {
                    await applyDamageWithSource(actualTarget, extraDmg, sourceUnit, false, "⚔️");
                } finally { sourceUnit._brokenSpineTriggering = false; }
            }
        }
        // ── 装备：血魔指环（造成伤害后回血，禁疗/麻木者则无效） ──
        if (sourceEqId === 'bloodRing' && amount > 0 && sourceUnit && sourceUnit.life > 0 && !sourceUnit.noHeal && sourceUnit.cardName !== "麻木者") {
            const heal = Math.round(amount / 2);
            if (heal > 0) {
                if (sourceUnit.isAssimilator) {
                    // 同化者：吸血回复加到共享生命池
                    gameState.assimilatorHp[sourceUnit.side] = Math.min(gameState.assimilatorHp[sourceUnit.side] + heal, gameState.assimilatorMaxHp[sourceUnit.side]);
                    syncAssimilators(sourceUnit.side);
                    addLog(`💍 血魔指环：同化者共享生命回复 ${heal} 点`);
                } else {
                    const sourceMaxLife = sourceUnit.maxLife || (CARD_LIBRARY.find(c => c.name === sourceUnit.cardName)?.life || sourceUnit.life);
                    sourceUnit.life = Math.min(sourceUnit.life + heal, sourceMaxLife);
                    addLog(`💍 血魔指环：${sourceUnit.cardName} 回复 ${heal} 点生命`);
                }
                showFloatText(sourceUnit.row, sourceUnit.col, '+' + heal, 'heal');
            }
        }
        if (actualTarget.life <= 0) {
            // 防重入：同一伤害链中雷刃/断脊等递归伤害会二次进入本块（目标已死），击杀奖励只结算一次
            if (actualTarget._killRewardDone) { if (source) lastDamageDealer = null; return; }
            actualTarget._killRewardDone = true;
            // 设置击杀归属（用于removeUnit中的unitKills追踪）
            if (source) lastDamageDealer = { name: source.cardName, side: source.side };
            if (actualTarget.isAssimilator) {
                // 同化者共享池归零：全部同化者死亡
                killAllAssimilators(actualTarget.side);
            } else {
                removeUnit(actualTarget.id, actualTarget.row, actualTarget.col, actualTarget.side);
            }
            // ── 装备：复活甲后检查（单位未被移除则跳过击杀奖励） ──
            const revivedUnit = gameState.units.find(u => u.id === actualTarget.id);
            if (revivedUnit && revivedUnit.pendingRevive) {
                lastDamageDealer = null;
                return;
            }
            // 击杀奖励统一结算（暴食者/血舞/连杀/悬赏；秒杀路径也调用本函数，保证连杀与悬赏计数一致）
            await resolveKillRewards(source, actualTarget);
        }
        // ── 装备：霜痕（攻击后冰冻命中的敌人，AOE全冰冻） ──
        if (sourceEqId === 'iceGrip' && sourceUnit && !sourceUnit.iceGripUsed && actualTarget.life > 0 && amount > 0 && !source.fromSkill) {
            actualTarget.stun = 2;
            sourceUnit._iceGripPendingConsume = true;
            addLog(`❄️ ${actualTarget.cardName} 被霜痕冰冻！`);
            showToast(`❄️ 冰冻 ${actualTarget.cardName}`);
        }
        // 费者被动：攻击一次加1费
        if (source && source.cardName === "费者" && source.attacksLeftThisTurn !== undefined && !infiniteManaEnabled) {
            const newMana = Math.min(gameState.players[source.side].manaMax, gameState.players[source.side].mana + 1);
            if (newMana !== gameState.players[source.side].mana) {
                gameState.players[source.side].mana = newMana;
                addLog(`💰 费者攻击加费 +1`);
            }
        }
    }

    async function applyDamage(target, amount, dmgType = null) { return await applyDamageWithSource(target, amount, null, false, dmgType); }
    async function applyUnblockableDamage(target, amount, dmgType = null) { return await applyDamageWithSource(target, amount, null, true, dmgType); }

    // 镜中人普通攻击：自身格+上下左右4格AOE（可空放），镜像对称再打一次
    async function performMirrorPersonAttack(unit, targetRow, targetCol) {
        if (unit.stun > 0) { showToast(`${unit.cardName} 眩晕无法攻击`); return false; }
        if (unit.attacksLeftThisTurn <= 0) { showToast(`${unit.cardName} 已经攻击过`); return false; }
        // 苍鹰之羽：每回合第一次普通攻击必中
        unit._guaranteedAttack = false;
        if (unit.equipmentId === 'eagleFeather' && !unit.eagleFeatherFirstAttackUsed) {
            unit._guaranteedAttack = true;
            unit.eagleFeatherFirstAttackUsed = true;
        }
        let dmg = unit.dmgValue;
        const bonusType = unit.dmgType === "⚔️" ? 'physical' : 'magic';
        if (unit.tempAttackBonus > 0 && canApplyBonus(unit, bonusType)) dmg += unit.tempAttackBonus;
        if (unit.nextAttackBonus > 0 && canApplyBonus(unit, bonusType)) { dmg += unit.nextAttackBonus; unit.nextAttackBonus = 0; }
        if (unit.nextAttackDouble && canApplyBonus(unit, bonusType)) { dmg = dmg * 2; unit.nextAttackDouble = false; }
        const { bonus } = applyAifeiAura(unit, true, unit.dmgType);
        if (bonus > 0 && canApplyBonus(unit, bonusType)) dmg += bonus;
        // 本体攻击：选中格内的所有敌人（单格AOE）
        const targets = getUnitsAt(targetRow, targetCol).filter(u => u.side !== unit.side && u.life > 0 && !u.isMirror);
        for (let t of targets) {
            await applyDamageWithSource(t, dmg, unit);
            if (!gameState.attackedEnemyIds.includes(t.id)) gameState.attackedEnemyIds.push(t.id);
        }
        // 镜像攻击：选中格的对称格内的所有敌人（复制最终伤害，不重复消耗增益）
        const mirror = getMirrorOf(unit);
        if (mirror) {
            const mr = 4 - targetRow, mc = targetCol;
            const mTargets = getUnitsAt(mr, mc).filter(u => u.side !== unit.side && u.life > 0 && !u.isMirror);
            for (let t of mTargets) {
                await applyDamageWithSource(t, dmg, unit);
                if (!gameState.attackedEnemyIds.includes(t.id)) gameState.attackedEnemyIds.push(t.id);
            }
            addLog(`${unit.cardName} 本体命中${targets.length}人，镜像命中${mTargets.length}人`);
        } else {
            addLog(`${unit.cardName} 攻击命中${targets.length}个敌人`);
        }
        unit.attacksLeftThisTurn--;
        renderUI();
        return true;
    }

    // 镜中人换位：与镜像互换，路径敌人受1物伤，本体+1血
    async function performMirrorSwap(unit) {
        const mirror = getMirrorOf(unit);
        if (!mirror) { showToast(`没有镜像`); return false; }
        if (unit.mirrorSwappedThisTurn) { showToast(`本回合已换位`); return false; }
        const oldSelfRow = unit.row, oldSelfCol = unit.col;
        const oldMirrorRow = mirror.row, oldMirrorCol = mirror.col;
        const minRow = Math.min(oldSelfRow, oldMirrorRow);
        const maxRow = Math.max(oldSelfRow, oldMirrorRow);
        const pathTargets = gameState.units.filter(u => u.side !== unit.side && u.life > 0 && !u.isMirror && u.col === oldSelfCol && u.row >= minRow && u.row <= maxRow);
        for (let t of pathTargets) {
            const source = { cardName: unit.cardName, side: unit.side, dmgType: "⚔️", id: unit.id, life: unit.life, fromSkill: true };
            await applyDamageWithSource(t, 1, source, false, "⚔️");
        }
        let newSelfRow = oldMirrorRow;
        const enemyCastleRow = unit.side === SIDE_PLAYER0 ? 0 : 4;
        if (newSelfRow === enemyCastleRow) {
            newSelfRow = unit.side === SIDE_PLAYER0 ? 1 : 3;
        }
        unit.row = newSelfRow;
        unit.col = oldMirrorCol;
        mirror.row = 4 - newSelfRow;  // 换位后立刻重新按中线对称
        mirror.col = oldSelfCol;
        const maxLife = unit.maxLife || (CARD_LIBRARY.find(c => c.name === unit.cardName)?.life || unit.life);
        if (unit.life < maxLife && !unit.noHeal) {
            unit.life = Math.min(unit.life + 1, maxLife);
            addLog(`❤️ ${unit.cardName} 换位回复1点生命（当前${unit.life}）`);
        } else if (unit.life < maxLife && unit.noHeal) {
            addLog(`🩸 ${unit.cardName} 处于禁疗状态，换位无法回血`);
        }
        unit.mirrorSwappedThisTurn = true;
        applyShaLinCellBinding(unit);
        addLog(`🪞 ${unit.cardName} 与镜像互换位置`);
        showToast(`🪞 换位！`);
        recheckAllWeaponSmithBuffs();
        renderUI();
        return true;
    }

    function canApplyBonus(unit, bonusType) {
        if (unit.dmgValue === 0) return false;
        if (unit.cardName === "公主" && bonusType === 'physical') return false; // 公主不受物伤加成
        if (bonusType === 'physical' && unit.dmgType !== "⚔️") return false;
        if (bonusType === 'magic' && unit.dmgType !== "🔮") return false;
        return true;
    }

    function applyAifeiAura(unit, isAttacking = true, damageType = "⚔️") {
        let auraBonus = 0;
        let auraReduce = 0;
        // 爱妃光环不给掠影加伤害（掠影虽为物伤但伤害机制特殊）
        if (unit.cardName === "掠影") return { bonus: 0, reduce: 0 };
        for (let u of gameState.units) {
            if (u.cardName === "爱妃" && u.side === unit.side) {
                const forward = getForwardDelta(u.side);
                const rowDiff = (unit.row - u.row) * forward;
                if (rowDiff > 0 && rowDiff <= 2 && unit.col === u.col) {
                    // 爱妃光环：前方两格内友方普攻/法伤+1（卡牌描述：物伤法伤都+1），受到的法术伤害-1
                    if (isAttacking && damageType === unit.dmgType) auraBonus += 1;
                    else if (!isAttacking && damageType === "🔮") auraReduce += 1;
                }
            }
        }
        return { bonus: auraBonus, reduce: auraReduce };
    }

    function enforceAttackTarget(attacker, targetUnit) {
        const forward = getForwardDelta(attacker.side);
        const range = attacker.range;
        const isWideAttacker = attacker.cardName === "双刀" || attacker.cardName === "三刀";
        const taunters = gameState.units.filter(u => u.side !== attacker.side && u.cardName === "显眼包");
        const validTaunters = taunters.filter(u => {
            const distance = (u.row - attacker.row) * forward;
            if (distance < 0 || distance > range) return false;
            if (isWideAttacker) return true; // 双刀/三刀：前方横行3格内显眼包均嘲讽
            return u.col === attacker.col;
        });
        if (validTaunters.length > 0) {
            if (targetUnit && validTaunters.some(t => t.id === targetUnit.id)) return targetUnit;
            else {
                const forcedTarget = validTaunters[0];
                addLog(`显眼包 ${forcedTarget.cardName} 强制成为攻击目标！`);
                showToast(`🎭 嘲讽!`);
                return forcedTarget;
            }
        }
        return targetUnit;
    }
    function enforceSkillTarget(attacker, targetUnit) {
        const taunters = gameState.units.filter(u => u.side !== attacker.side && u.cardName === "显眼包");
        if (taunters.length > 0) {
            if (targetUnit && taunters.some(t => t.id === targetUnit.id)) return targetUnit;
            else {
                // 检查嘲讽单位是否在技能有效范围内
                const validTargets = getSkillTargetableUnits(attacker);
                const validTaunters = taunters.filter(t => validTargets.some(v => v.id === t.id));
                if (validTaunters.length > 0) {
                    const forcedTarget = validTaunters[0];
                    addLog(`显眼包 ${forcedTarget.cardName} 强制成为技能目标！`);
                    showToast(`🎭 嘲讽!`);
                    return forcedTarget;
                }
            }
        }
        return targetUnit;
    }

    // 火人免疫控制检查：单位是否与火人同列
    function isFireImmune(unit) {
        for (let fm of gameState.units) {
            if (fm.cardName === "火人" && fm.side === unit.side && fm.col === unit.col && fm.life > 0) {
                return true;
            }
        }
        return false;
    }

    // 攻击主逻辑（修复，确保伤害正确）
    async function performAttack(attacker, targetUnit) {
        // 新手教程：仅当前步骤允许攻击时才放行
        if (typeof tutorialAllowAction === 'function' && !tutorialAllowAction('attack')) { tutorialBlock('攻击'); return false; }
        // ── 装备：霜痕延迟消费（上一次攻击触发的冰冻待消费） ──
        if (attacker._iceGripPendingConsume) {
            attacker.iceGripUsed = true;
            attacker._iceGripPendingConsume = false;
        }
        // 机车党：蓄力中无法攻击
        if (attacker.motCharging) { showToast(`🏍️ ${attacker.cardName} 蓄力中无法攻击`); return false; }
        // 重置雷刃本回合（本次攻击）触发标记
        attacker._lightningTriggered = false;
        // 苍鹰之羽：每回合第一次普通攻击必中
        attacker._guaranteedAttack = false;
        if (attacker.equipmentId === 'eagleFeather' && !attacker.eagleFeatherFirstAttackUsed) {
            attacker._guaranteedAttack = true;
            attacker.eagleFeatherFirstAttackUsed = true;
        }
        // 检查弱化效果：造成的伤害无效（整个回合内所有攻击都无效，回合结束时才清除）
        if (attacker.weakenedTurns > 0) {
            addLog(`${attacker.cardName} 被弱化，本回合造成的伤害无效！`);
            showToast(`📉 ${attacker.cardName} 伤害无效`);
            attacker.attacksLeftThisTurn--;
            renderUI();
            return false;
        }
        // 标枪手：有强化普攻时不能普通攻击，必须使用突刺
        if (attacker.cardName === "标枪手" && (attacker.spearmanCharges || 0) > 0) {
            showToast(`🔱 ${attacker.cardName} 有强化普攻，请使用突刺`);
            return false;
        }
        if (attacker.cardName === "大力士") {
            return performHerculesAttack(attacker, targetUnit);
        }
        if (attacker.cardName === "掠影") {
            if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法攻击`); return false; }
            if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经攻击过`); return false; }
            let actualTarget = enforceAttackTarget(attacker, targetUnit);
            if (actualTarget.side === attacker.side) { showToast(`只能攻击敌方单位`); return false; }
            const forward = getForwardDelta(attacker.side);
            let distance = (actualTarget.row - attacker.row) * forward;
            if (distance < 0 || distance > attacker.range) { showToast(`攻击距离不够 (范围${attacker.range})`); return false; }
            if (actualTarget.col !== attacker.col) { showToast(`只能攻击本列敌人`); return false; }
            // 不可攻击敌方城池及其内的敌方
            const enemyBaseRow = attacker.side === SIDE_PLAYER0 ? 0 : 4;
            if (actualTarget.row === enemyBaseRow) { showToast(`掠影不可攻击敌方城池及其内的敌方`); return false; }
            // 先确认目标格有敌人（位移前检查原目标格或同格）
            const targetRow = actualTarget.row, targetCol = actualTarget.col;
            const isSameCell = attacker.row === targetRow && attacker.col === targetCol;
            const enemiesAtTarget = getUnitsAt(targetRow, targetCol).filter(u => u.side !== attacker.side);
            if (enemiesAtTarget.length === 0) { showToast(`目标位置没有敌方单位`); return false; }
            // 位移到目标格（已在同格则不动），需检查目标格友方上限
            if (!isSameCell) {
                if (attacker.shaLinBindTurn > 0) {
                    addLog(`🪞 ${attacker.cardName} 被定身，无法位移至目标格，但仍可攻击`);
                } else {
                    if (!canAddUnit(targetRow, targetCol, attacker.side)) {
                        showToast(`目标格已有2个我方单位，无法位移`); return false;
                    }
                    attacker.row = targetRow;
                    attacker.col = targetCol;
                    addLog(`🗡️ ${attacker.cardName} 位移至 ${ROW_NAMES[targetRow]}${COLS[targetCol]}`);
                    applyShaLinCellBinding(attacker);
                }
            }
            // AOE：对目标格所有敌人造成伤害（定身时未位移，仍按目标格结算而非原格）
            const aoeRow = isSameCell || attacker.shaLinBindTurn <= 0 ? attacker.row : targetRow;
            const aoeCol = isSameCell || attacker.shaLinBindTurn <= 0 ? attacker.col : targetCol;
            const allTargets = getUnitsAt(aoeRow, aoeCol).filter(u => u.side !== attacker.side);
            if (allTargets.length === 0) { showToast(`目标格没有敌方单位`); return false; }
            // 循环外计算一次性加成（掠影自身伤害计算后叠加）
            let baseBonus = 0;
            if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, 'physical')) baseBonus += attacker.tempAttackBonus;
            if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, 'physical')) { baseBonus += attacker.nextAttackBonus; attacker.nextAttackBonus = 0; }
            const shouldDouble = attacker.nextAttackDouble && canApplyBonus(attacker, 'physical');
            if (shouldDouble) attacker.nextAttackDouble = false;
            const { bonus: auraBonus } = applyAifeiAura(attacker, true, "⚔️");
            if (auraBonus > 0 && canApplyBonus(attacker, 'physical')) baseBonus += auraBonus;
            let totalDmg = 0;
            for (let t of allTargets) {
                // 先计算掠影自身伤害：1 + round(已损生命×50%)
                let dmg = attacker.dmgValue;
                const maxLife = t.maxLife || CARD_LIBRARY.find(c => c.name === t.cardName)?.life || t.life;
                const lostLife = maxLife - t.life;
                if (lostLife > 0) {
                    dmg += Math.round(lostLife * 0.5);
                }
                // 再在合并伤害上叠加外部增伤
                dmg += baseBonus;
                // nextAttackDouble：翻倍最终总伤害
                if (shouldDouble) dmg *= 2;
                addLog(`🗡️ ${attacker.cardName} 对 ${t.cardName} 造成 ${dmg} 物伤（基础1 + 已损${lostLife}×50% = ${Math.round(lostLife * 0.5)} + 增伤${baseBonus}${shouldDouble ? ' ×2' : ''}）`);
                await applyDamageWithSource(t, dmg, attacker);
                totalDmg += dmg;
                if (!gameState.attackedEnemyIds.includes(t.id)) gameState.attackedEnemyIds.push(t.id);
            }
            addLog(`🗡️ ${attacker.cardName} AOE攻击 ${allTargets.length} 个敌人，总伤害 ${totalDmg}`);
            attacker.attacksLeftThisTurn--;
            renderUI();
            return true;
        }
        if (attacker.cardName === "银运") {
            if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法攻击`); return false; }
            if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经攻击过`); return false; }
            let actualTarget = enforceAttackTarget(attacker, targetUnit);
            if (actualTarget.side === attacker.side) { showToast(`只能攻击敌方单位`); return false; }
            const forward = getForwardDelta(attacker.side);
            let distance = (actualTarget.row - attacker.row) * forward;
            if (distance <= 0 || distance > attacker.range) { showToast(`攻击距离不够 (范围${attacker.range})`); return false; }
            if (actualTarget.col !== attacker.col) { showToast(`只能攻击正前方同列敌人`); return false; }
            // AOE：命中目标格所有敌人
            const allTargets = getUnitsAt(actualTarget.row, actualTarget.col).filter(u => u.side !== attacker.side);
            if (allTargets.length === 0) { showToast(`目标格没有敌方单位`); return false; }
            // 先计算这回合是否暴击，统一对所有目标生效
            const isCrit = Math.random() < 0.5;
            if (isCrit) addLog(`${attacker.cardName} 触发暴击，伤害翻倍！`);
            let totalDmg = 0;
            // 一次性加成在循环外计算一次，对所有目标生效（与旋斧人/火神/掠影一致）
            let baseBonus = 0;
            if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, 'physical')) baseBonus += attacker.tempAttackBonus;
            if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, 'physical')) { baseBonus += attacker.nextAttackBonus; attacker.nextAttackBonus = 0; }
            const shouldDouble = attacker.nextAttackDouble && canApplyBonus(attacker, 'physical');
            if (shouldDouble) attacker.nextAttackDouble = false;
            const { bonus: auraBonus } = applyAifeiAura(attacker, true, "⚔️");
            if (auraBonus > 0 && canApplyBonus(attacker, 'physical')) baseBonus += auraBonus;
            for (let t of allTargets) {
                let dmg = attacker.dmgValue;
                if (isCrit) dmg *= 2;
                dmg += baseBonus;
                if (shouldDouble) dmg *= 2;
                await applyDamageWithSource(t, dmg, attacker);
                totalDmg += dmg;
                if (!gameState.attackedEnemyIds.includes(t.id)) gameState.attackedEnemyIds.push(t.id);
            }
            addLog(`${attacker.cardName} AOE攻击 ${allTargets.length} 个敌人，总伤害 ${totalDmg}`);
            attacker.attacksLeftThisTurn--;
            renderUI();
            return true;
        }
        if (attacker.cardName === "骑士") {
            if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法攻击`); return false; }
            if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经攻击过`); return false; }
            let actualTarget = enforceAttackTarget(attacker, targetUnit);
            if (actualTarget.side === attacker.side) { showToast(`只能攻击敌方单位`); return false; }
            const forward = getForwardDelta(attacker.side);
            let distance = (actualTarget.row - attacker.row) * forward;
            if (distance <= 0 || distance > attacker.range) { showToast(`攻击距离不够 (范围${attacker.range})`); return false; }
            if (actualTarget.col !== attacker.col) { showToast(`只能攻击正前方同列敌人`); return false; }
            let dmg = attacker.dmgValue;
            if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, 'physical')) dmg += attacker.tempAttackBonus;
            if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, 'physical')) { dmg += attacker.nextAttackBonus; attacker.nextAttackBonus = 0; }
            if (attacker.nextAttackDouble && canApplyBonus(attacker, 'physical')) { dmg = dmg * 2; attacker.nextAttackDouble = false; }
            const { bonus } = applyAifeiAura(attacker, true, "⚔️");
            if (bonus > 0 && canApplyBonus(attacker, 'physical')) dmg += bonus;
            await applyDamageWithSource(actualTarget, dmg, attacker, false);
            attacker.attacksLeftThisTurn--;
            // 追刃：记录被攻击的敌方单位
            if (!gameState.attackedEnemyIds.includes(actualTarget.id)) gameState.attackedEnemyIds.push(actualTarget.id);
            showToast(`⚔️ ${attacker.cardName} 攻击造成 ${dmg} 伤害`);
            renderUI();
            return true;
        }
        // 双刀/三刀：每回合多次攻击，可攻击前方横行3格内任意敌方
        if (attacker.cardName === "双刀" || attacker.cardName === "三刀") {
            if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法攻击`); return false; }
            if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 本回合攻击次数已用完`); return false; }
            let actualTarget = enforceAttackTarget(attacker, targetUnit);
            if (actualTarget.side === attacker.side) { showToast(`只能攻击敌方单位`); return false; }
            const forward = getForwardDelta(attacker.side);
            const frontRow = attacker.row + forward;
            if (actualTarget.row !== frontRow) { showToast(`只能攻击前方横行的敌人`); return false; }
            let dmg = attacker.dmgValue;
            if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, 'physical')) { dmg += attacker.tempAttackBonus; addLog(`${attacker.cardName} 受到鼓手鼓舞，伤害+${attacker.tempAttackBonus}！`); }
            if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, 'physical')) { dmg += attacker.nextAttackBonus; addLog(`${attacker.cardName} 受到祭献加成，伤害+${attacker.nextAttackBonus}！`); attacker.nextAttackBonus = 0; }
            if (attacker.nextAttackDouble && canApplyBonus(attacker, 'physical')) { dmg = dmg * 2; attacker.nextAttackDouble = false; addLog(`${attacker.cardName} 触发酒类强化，伤害翻倍至 ${dmg}！`); }
            const { bonus } = applyAifeiAura(attacker, true, "⚔️");
            if (bonus > 0 && canApplyBonus(attacker, 'physical')) dmg += bonus;
            await applyDamageWithSource(actualTarget, dmg, attacker);
            attacker.attacksLeftThisTurn--;
            if (!gameState.attackedEnemyIds.includes(actualTarget.id)) gameState.attackedEnemyIds.push(actualTarget.id);
            showToast(`⚔️ ${attacker.cardName} 攻击 ${actualTarget.cardName} 造成 ${dmg} 伤害（剩余${attacker.attacksLeftThisTurn}次）`);
            renderUI();
            return true;
        }
        // 旋斧人：自身九宫格AOE（正常攻击流程，点九宫格内任意敌人触发）
        if (attacker.cardName === "旋斧人") {
            if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法攻击`); return false; }
            if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经攻击过`); return false; }
            let actualTarget = enforceAttackTarget(attacker, targetUnit);
            if (actualTarget.side === attacker.side) { showToast(`只能攻击敌方单位`); return false; }
            const dr0 = Math.abs(actualTarget.row - attacker.row);
            const dc0 = Math.abs(actualTarget.col - attacker.col);
            if (dr0 > 1 || dc0 > 1) { showToast(`旋斧人只能攻击自身九宫格内的敌人`); return false; }
            let dmg = attacker.dmgValue;
            const bonusType = attacker.dmgType === "⚔️" ? 'physical' : 'magic';
            if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, bonusType)) dmg += attacker.tempAttackBonus;
            if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, bonusType)) { dmg += attacker.nextAttackBonus; attacker.nextAttackBonus = 0; }
            if (attacker.nextAttackDouble && canApplyBonus(attacker, bonusType)) { dmg = dmg * 2; attacker.nextAttackDouble = false; }
            const { bonus } = applyAifeiAura(attacker, true, attacker.dmgType);
            if (bonus > 0 && canApplyBonus(attacker, bonusType)) dmg += bonus;
            const allTargets = gameState.units.filter(u => u.side !== attacker.side && u.life > 0 && !u.isMirror && Math.abs(u.row - attacker.row) <= 1 && Math.abs(u.col - attacker.col) <= 1);
            let totalDmg = 0;
            for (let t of allTargets) {
                await applyDamageWithSource(t, dmg, attacker);
                totalDmg += dmg;
                if (!gameState.attackedEnemyIds.includes(t.id)) gameState.attackedEnemyIds.push(t.id);
            }
            addLog(`${attacker.cardName} 九宫格AOE攻击 ${allTargets.length} 个敌人，总伤害 ${totalDmg}`);
            attacker.attacksLeftThisTurn--;
            renderUI();
            return true;
        }
        if (attacker.superCharging) {
            showToast(`${attacker.cardName} 处于超级蓄力中，无法普通攻击`);
            return false;
        }
        if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法攻击`); return false; }
        if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经攻击过`); return false; }
        // 斧兵/弩手：点击攻击时自动蓄力（蓄力1回合，下回合自动攻击）
        // _skipAutoCharge 标志用于蓄力释放时跳过自动蓄力，避免重复蓄力无法造成伤害
        if (!attacker._skipAutoCharge && (attacker.cardName === "斧兵" || attacker.cardName === "弩手")) {
            return await autoChargeAttack(attacker, targetUnit);
        }
        // 重斧兵：点击攻击时自动超级蓄力（蓄力2回合，霸体免疫控制，下下回合自动攻击）
        if (!attacker._skipAutoCharge && attacker.cardName === "重斧兵") {
            return await autoSuperChargeAttack(attacker, targetUnit);
        }
        // 双剑：点击攻击时自动蓄力横扫（不可普通攻击，蓄力1回合后AOE）
        if (!attacker._skipAutoCharge && attacker.cardName === "双剑") {
            return await autoDualswordCharge(attacker, targetUnit);
        }
        if (attacker.cardName === "大力士") {
            showToast(`${attacker.cardName} 无法普通攻击，请使用技能蓄力`);
            return false;
        }
        // 火神强化后：普通攻击变为AOE，命中目标格所有敌人
        if (attacker.cardName === "火神" && (attacker.fireGodBuffTurns || 0) > 0) {
            if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法攻击`); return false; }
            if (attacker.attacksLeftThisTurn <= 0) { showToast(`${attacker.cardName} 已经攻击过`); return false; }
            let actualTarget = enforceAttackTarget(attacker, targetUnit);
            if (actualTarget.side === attacker.side) { showToast(`只能攻击敌方单位`); return false; }
            const forward = getForwardDelta(attacker.side);
            let distance = (actualTarget.row - attacker.row) * forward;
            if (distance < 0 || distance > attacker.range) { showToast(`攻击距离不够 (范围${attacker.range})`); return false; }
            if (actualTarget.col !== attacker.col) { showToast(`只能攻击正前方同列敌人`); return false; }
            const isSameCell = actualTarget.row === attacker.row && actualTarget.col === attacker.col;
            if (!isSameCell) {
                let blocked = false;
                for (let r = attacker.row + forward; r !== actualTarget.row; r += forward) {
                    if (gameState.units.some(u => u.col === attacker.col && u.row === r && u.side !== attacker.side)) { blocked = true; break; }
                }
                if (blocked) { showToast(`有更近的敌人挡在前面，无法攻击${actualTarget.cardName}`); return false; }
            }
            // 三格AOE：命中目标格及其前方2格（共3格，沿攻击方向）的敌人
            const allTargets = gameState.units.filter(u => {
                if (u.side === attacker.side || u.life <= 0 || u.col !== actualTarget.col) return false;
                const rel = (u.row - actualTarget.row) * forward;
                return rel >= 0 && rel <= 2;
            });
            if (allTargets.length === 0) { showToast(`目标列没有敌方单位`); return false; }
            let dmg = attacker.dmgValue;
            const bonusType = attacker.dmgType === "⚔️" ? 'physical' : 'magic';
            if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, bonusType)) dmg += attacker.tempAttackBonus;
            if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, bonusType)) { dmg += attacker.nextAttackBonus; attacker.nextAttackBonus = 0; }
            if (attacker.nextAttackDouble && canApplyBonus(attacker, bonusType)) { dmg = dmg * 2; attacker.nextAttackDouble = false; }
            const { bonus } = applyAifeiAura(attacker, true, attacker.dmgType);
            if (bonus > 0 && canApplyBonus(attacker, bonusType)) dmg += bonus;
            let totalDmg = 0;
            for (let t of allTargets) {
                await applyDamageWithSource(t, dmg, attacker);
                totalDmg += dmg;
                if (!gameState.attackedEnemyIds.includes(t.id)) gameState.attackedEnemyIds.push(t.id);
            }
            addLog(`🔥 ${attacker.cardName} 竖排AOE攻击 ${allTargets.length} 个敌人，总伤害 ${totalDmg}`);
            attacker.attacksLeftThisTurn--;
            renderUI();
            return true;
        }
        let actualTarget = enforceAttackTarget(attacker, targetUnit);
        const forward = getForwardDelta(attacker.side);
        let distance = (actualTarget.row - attacker.row) * forward;
        if (distance < 0 || distance > attacker.range) { showToast(`攻击距离不够 (范围${attacker.range})`); return false; }
        if (actualTarget.col !== attacker.col) { showToast(`只能攻击正前方同列敌人`); return false; }
        // 修复：一般情况下只能攻击距离最近的单位（中间有更近的敌方单位时不可跳过），掠影无视就近原则
        if (attacker.cardName !== "掠影") {
            const isSameCell = actualTarget.row === attacker.row && actualTarget.col === attacker.col;
            if (!isSameCell) {
                let nearestRow = attacker.row + forward;
                const nearerEnemy = gameState.units.find(u => u.col === attacker.col && u.side !== attacker.side && u.row === nearestRow);
                if (!nearerEnemy || nearerEnemy.id !== actualTarget.id) {
                    let blocked = false;
                    for (let r = nearestRow; r !== actualTarget.row; r += forward) {
                        if (gameState.units.some(u => u.col === attacker.col && u.row === r && u.side !== attacker.side)) { blocked = true; break; }
                    }
                    if (blocked) { showToast(`有更近的敌人挡在前面，无法攻击${actualTarget.cardName}`); return false; }
                }
            }
        }
        
        if (attacker.cardName === "巫师") {
            const wantTransfer = await showConfirm("是否将本次伤害转移到敌方场上任意单位？（不可抵挡）");
            if (wantTransfer) {
                let targets = [];
                // 只选存活真实单位（排除镜像幽灵与复活甲待复活尸体——镜像转移伤害为0）
                for (let u of gameState.units) { if (u.side !== attacker.side && u.life > 0 && !u.isMirror) targets.push({ type: 'unit', unit: u, name: `${u.cardName} (❤️${u.life})` }); }
                const options = targets.map((t, idx) => `${idx+1}. ${t.name}`);
                // AI 智能选择：优先选血量最低的敌人（最大化击杀概率）
                const aiChoice = (opts) => {
                    let bestIdx = 0, bestHp = Infinity;
                    for (let i = 0; i < targets.length; i++) {
                        if (targets[i].unit.life < bestHp) { bestHp = targets[i].unit.life; bestIdx = i; }
                    }
                    return bestIdx;
                };
                const selectedIdx = await showSelect(options, "选择要转移伤害的目标", { aiChoice });
                if (selectedIdx !== -1 && selectedIdx < targets.length) {
                    const t = targets[selectedIdx];
                    let dmg = attacker.dmgValue;
                    const bonusType = attacker.dmgType === "⚔️" ? 'physical' : 'magic';
                    if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, bonusType)) dmg += attacker.tempAttackBonus;
                    if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, bonusType)) { dmg += attacker.nextAttackBonus; attacker.nextAttackBonus = 0; }
                    if (attacker.nextAttackDouble && canApplyBonus(attacker, bonusType)) { dmg = dmg * 2; attacker.nextAttackDouble = false; }
                    const { bonus } = applyAifeiAura(attacker, true, attacker.dmgType);
                    if (bonus > 0 && canApplyBonus(attacker, bonusType)) dmg += bonus;
                    if (t.type === 'unit') {
                        await applyDamageWithSource(t.unit, dmg, attacker, true);
                    }
                    attacker.attacksLeftThisTurn--;
                    renderUI();
                    return true;
                }
            }
        }
        let dmg = attacker.dmgValue;
        const bonusType = attacker.dmgType === "⚔️" ? 'physical' : 'magic';
        if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, bonusType)) { dmg += attacker.tempAttackBonus; addLog(`${attacker.cardName} 受到鼓手鼓舞，伤害+${attacker.tempAttackBonus}！`); }
        if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, bonusType)) { dmg += attacker.nextAttackBonus; addLog(`${attacker.cardName} 受到祭献加成，伤害+${attacker.nextAttackBonus}！`); attacker.nextAttackBonus = 0; }
        if (attacker.cardName === "士兵" && attacker.firstAttackBonus && !attacker.bonusUsed && canApplyBonus(attacker, bonusType)) { dmg = dmg * 2; attacker.bonusUsed = true; addLog(`${attacker.cardName} 发动首次攻击强化，伤害提升至 ${dmg}！`); }
        if (attacker.nextAttackDouble && canApplyBonus(attacker, bonusType)) { dmg = dmg * 2; attacker.nextAttackDouble = false; addLog(`${attacker.cardName} 触发酒类强化，伤害翻倍至 ${dmg}！`); }
        const { bonus } = applyAifeiAura(attacker, true, attacker.dmgType);
        if (bonus > 0 && canApplyBonus(attacker, bonusType)) dmg += bonus;
        if ((attacker.counterBonus || 0) > 0) {
            dmg += attacker.counterBonus;
            addLog(`🔺 ${attacker.cardName} 触发反击增伤 +${attacker.counterBonus}！`);
            attacker.counterBonus = 0;
        }
        await applyDamageWithSource(actualTarget, dmg, attacker, attacker.cardName === "戟兵");
        attacker.attacksLeftThisTurn--;
        showToast(`⚔️ ${attacker.cardName} 攻击造成 ${dmg} 伤害`);
        renderUI();
        return true;
    }

// ========== 攻击城池 ==========


    function canAttackBase(attacker) {
        if (attacker.cardName === "大力士") return false;
        if (attacker.cardName === "骑士") return false;
        if (attacker.stun > 0) return false;
        // 斧兵/弩手/重斧兵：通过 attackBase → autoChargeAttack 路径触发蓄力攻击本体
        // 必须在敌方城下才能攻击本体（applyCrossbowChargeTarget/applyAxemanChargeTarget 也会强制检查）
        if (attacker.cardName === "斧兵" || attacker.cardName === "弩手" || attacker.cardName === "重斧兵") {
            const enemyCastleFrontRow = attacker.side === SIDE_PLAYER0 ? 1 : 3;
            if (attacker.row !== enemyCastleFrontRow) return false;
            // 城池行同列有敌人时，applyXxxChargeTarget 会自行拒绝并提示"需先消灭敌人"
            return true;
        }
        // 公主：无限射程，只要没有阻挡即可攻击本体
        if (attacker.cardName === "公主") {
            const forward = getForwardDelta(attacker.side);
            for (let r = attacker.row + forward; r >= 0 && r <= 4; r += forward) {
                const blocker = gameState.units.find(u => u.col === attacker.col && u.row === r);
                if (blocker) return false;
            }
            return true;
        }
        const row = attacker.row, side = attacker.side, range = attacker.range;
        let targetRow;
        if (side === SIDE_PLAYER0) {
            if (range === 1 || range === 2) targetRow = 1;
            else if (range === 3 || range === 4) targetRow = 2;
            else if (range >= 5) targetRow = 3;
            else targetRow = 0;
        } else {
            if (range === 1 || range === 2) targetRow = 3;
            else if (range === 3 || range === 4) targetRow = 2;
            else if (range >= 5) targetRow = 1;
            else targetRow = 4;
        }
        if (row !== targetRow) return false;
        // 有同列单位在 attacker 与基地之间（含城池行）时，不可攻击本体
        const forward = getForwardDelta(side);
        for (let r = row + forward; r >= 0 && r <= 4; r += forward) {
            const blocker = gameState.units.find(u => u.col === attacker.col && u.row === r);
            if (blocker) return false; // 有任意单位阻挡（含城池行上的敌人）
        }
        return true;
    }

    async function attackBase(attacker) {
        // 新手教程：不教学攻击基地，拦截
        if (typeof tutorialAllowAction === 'function' && !tutorialAllowAction('attack')) { tutorialBlock('攻击基地'); return false; }
        if (attacker.stun > 0) { showToast(`${attacker.cardName} 眩晕无法攻击本体`); return false; }
        if (attacker.attacksLeftThisTurn <= 0) { showToast(`已经攻击过`); return false; }
        // 标枪手有强化普攻时不能普通攻击本体
        if (attacker.cardName === "标枪手" && (attacker.spearmanCharges || 0) > 0) { showToast(`🔱 ${attacker.cardName} 有强化普攻，请使用突刺`); return false; }
        // 四眼仔行动干扰：消耗本方第一次控制单位的攻击
        if (gameState.nerdJamPending[attacker.side]) {
            gameState.nerdJamPending[attacker.side] = false;
            addLog(`👓 行动干扰生效！${attacker.cardName} 的攻击被无效化！`);
            showToast(`👓 行动干扰！${attacker.cardName} 的攻击被无效化`);
            gameState.selectedUnitId = null;
            renderUI();
            return false;
        }
        // 斧兵/弩手/重斧兵：点击攻击本体时自动蓄力而非直接攻击
        if (attacker.cardName === "斧兵" || attacker.cardName === "弩手") {
            const enemyBaseRow = attacker.side === 0 ? 0 : 4;
            const targetInfo = { type: 'base', row: enemyBaseRow, col: attacker.col, side: attacker.side === 0 ? 1 : 0 };
            return await autoChargeAttack(attacker, targetInfo);
        }
        if (attacker.cardName === "重斧兵") {
            const enemyBaseRow = attacker.side === 0 ? 0 : 4;
            const targetInfo = { type: 'base', row: enemyBaseRow, col: attacker.col, side: attacker.side === 0 ? 1 : 0 };
            return await autoSuperChargeAttack(attacker, targetInfo);
        }
        if (!canAttackBase(attacker)) { showToast(`当前位置无法攻击敌方基地`); return false; }
        let dmg = attacker.dmgValue;
        const bonusType = attacker.dmgType === "⚔️" ? 'physical' : 'magic';
        if (attacker.tempAttackBonus > 0 && canApplyBonus(attacker, bonusType)) dmg += attacker.tempAttackBonus;
        if (attacker.nextAttackBonus > 0 && canApplyBonus(attacker, bonusType)) { dmg += attacker.nextAttackBonus; attacker.nextAttackBonus = 0; }
        if (attacker.cardName === "士兵" && attacker.firstAttackBonus && !attacker.bonusUsed && canApplyBonus(attacker, bonusType)) { dmg = dmg * 2; attacker.bonusUsed = true; }
        if (attacker.nextAttackDouble && canApplyBonus(attacker, bonusType)) { dmg = dmg * 2; attacker.nextAttackDouble = false; }
        const { bonus } = applyAifeiAura(attacker, true, attacker.dmgType);
        if (bonus > 0 && canApplyBonus(attacker, bonusType)) dmg += bonus;
        if ((attacker.counterBonus || 0) > 0) {
            dmg += attacker.counterBonus;
            addLog(`🔺 ${attacker.cardName} 触发反击增伤 +${attacker.counterBonus}！`);
            attacker.counterBonus = 0;
        }
        const enemySide = attacker.side === SIDE_PLAYER0 ? SIDE_PLAYER1 : SIDE_PLAYER0;
        gameState.players[enemySide].hp -= dmg;
        // 战斗反馈：攻击本体
        const enemyBaseRow = attacker.side === SIDE_PLAYER0 ? 0 : 4;
        showFloatText(enemyBaseRow, attacker.col, '-' + dmg, 'damage');
        flashCellHit(enemyBaseRow, attacker.col);
        flashCellAttack(attacker.row, attacker.col);
        showAttackBeam(attacker.row, attacker.col, enemyBaseRow, attacker.col);
        // 本体伤害贡献追踪（用于复盘MVP计算）
        if (gameState.matchStats && gameState.matchStats.unitDamage) {
            const key = attacker.cardName;
            if (!gameState.matchStats.unitDamage[key]) gameState.matchStats.unitDamage[key] = { damage: 0, side: attacker.side };
            gameState.matchStats.unitDamage[key].damage += dmg;
        }
        addLog(`${attacker.side === 0 ? "蓝方" : "红方"} ${attacker.cardName} 攻击对方本体造成 ${dmg} 伤害！剩余❤️ ${gameState.players[enemySide].hp}`);
        showToast(`🏹 攻击本体! 造成${dmg}伤害`);
        attacker.attacksLeftThisTurn--;
        // 费者被动：攻击本体也加1费
        if (attacker.cardName === "费者" && !infiniteManaEnabled) {
            const newMana = Math.min(gameState.players[attacker.side].manaMax, gameState.players[attacker.side].mana + 1);
            if (newMana !== gameState.players[attacker.side].mana) {
                gameState.players[attacker.side].mana = newMana;
                addLog(`💰 费者攻击加费 +1`);
            }
        }
        if (gameState.players[enemySide].hp <= 0) {
            addLog(`🎉 游戏结束！ ${attacker.side === 0 ? "蓝方" : "红方"} 胜利！`);
            // 远程联机：通知对方并断开，双方回到模式选择
            if (networkActive()) {
                renderUI();
                networkPushState();
                try { if (networkIsHost()) networkNotifyGameOver(); } catch (e) {}
                networkDisconnect('游戏结束');
                return true;
            }
            await showRecapPanel(attacker.side);
            await startGame();
            return true;
        }
        renderUI();
        return true;
    }
