// ========== AI 控制器（优化版）==========
// AI 决策：出牌、移动、攻击、技能使用
// 支持三档难度：easy（新手）/ normal（合理）/ hard（策略+连招）
//
// ── 核心系统 ──
//   1. 威胁评估（aiEvaluateThreat）：量化敌方单位危险度
//   2. 集火系统（aiFocusTargetId）：集中火力打高威胁目标
//   3. 组合技识别（aiDetectCombos）：识别并执行卡牌连招
//   4. 防守意识（aiShouldProtect）：保护关键单位
//   5. 费用规划（aiPlanMana）：为combo预留费用
//   6. 难度分层：easy/normal/hard 有真实策略差异

    // ── AI 内部状态（每回合重置）──
    let aiFocusTargetId = null;        // 集火目标ID
    let aiComboPlan = null;             // 当前回合的组合技计划
    let aiReservedMana = 0;             // 预留费用（给combo组件）
    let aiSkipAttackIds = new Set();    // 本回合跳过攻击的单位（为combo留buff）

    function aiSleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ========== 难度行为参数 ==========
    // 不同难度下的行为概率配置
    const AI_DIFFICULTY_CONFIG = {
        easy:   { comboRate: 0,    focusFire: false, manaPlan: false, defense: false, skillUseRate: 0.4, mistakeRate: 0.35, skipActionRate: 0.25 },
        normal: { comboRate: 0.6,  focusFire: true,  manaPlan: false, defense: false, skillUseRate: 0.85, mistakeRate: 0.10, skipActionRate: 0.05 },
        hard:   { comboRate: 0.9,  focusFire: true,  manaPlan: true,  defense: true,  skillUseRate: 0.95, mistakeRate: 0.02, skipActionRate: 0.0  },
        master: { comboRate: 1.0,  focusFire: true,  manaPlan: true,  defense: true,  skillUseRate: 1.0,  mistakeRate: 0,    skipActionRate: 0.0,  predict: true }  // 大师：全参数拉满 + 敌方反击预判
    };
    function aiCfg() { return AI_DIFFICULTY_CONFIG[aiDifficulty] || AI_DIFFICULTY_CONFIG.normal; }
    function aiIsMaster() { return aiDifficulty === 'master'; }

    // AI 计算卡牌费用（含国王征税、狂战士等修正）
    function aiGetCardCost(side, card) {
        let cost = card.cost;
        if (card.name === "狂战士") {
            const enemyCount = gameState.units.filter(u => u.side !== side).length;
            if (card.life + enemyCount >= 5) cost = 2;
        }
        cost = Math.max(0, cost + (gameState.kingCostMod[side] || 0));
        return cost;
    }

    // ========== 威胁评估系统 ==========
    // 评估敌方单位对己方的威胁程度，返回 0~100 分数
    // 综合考虑：攻击力、射程、剩余攻击次数、特殊被动、距城池距离
    function aiEvaluateThreat(unit, mySide) {
        if (!unit || unit.life <= 0) return 0;
        let score = 0;
        score += unit.dmgValue * 3;                    // 攻击力权重
        score += unit.range * 2;                       // 射程权重（远程更危险）
        score += (unit.attacksLeftThisTurn || 0) * 5;  // 剩余攻击次数
        score += unit.life;                            // 生命值（难杀的更持久）

        // ── 特殊单位威胁加成 ──
        if (unit.cardName === "显眼包") score += 30;    // 嘲讽必须优先处理
        if (unit.cardName === "费机") score += 25;      // 费机持续加费不能留
        if (unit.cardName === "武器商") score += 35;    // 武器商 combo 核心
        if (unit.cardName === "三刀") score += 30;      // 三连击高威胁
        if (unit.cardName === "双刀") score += 20;      // 双连击
        if (unit.cardName === "重斧兵" && unit.superCharging) score += 40; // 蓄力中极度危险
        if (unit.cardName === "斧兵" && unit.isCharging) score += 25;
        if (unit.cardName === "弩手" && unit.isCharging) score += 20;
        if (unit.cardName === "双剑" && unit.isSweepCharging) score += 30;   // 横扫蓄力
        if (unit.cardName === "戟兵" && unit.halberdierCharging) score += 25;
        if (unit.cardName === "国王") score += 20;      // 国王征税
        if (unit.cardName === "参谋") score += 18;      // 参谋给对方自由移动
        if (unit.cardName === "血舞") score += 22;      // 远程连击
        if (unit.cardName === "公主") score += 28;      // 无限射程
        if (unit.cardName === "爱妃") score += 15;      // 光环增伤
        if (unit.cardName === "军营") score += 12;      // 扩展放置范围
        if (unit.cardName === "标枪手" && (unit.spearmanCharges || 0) > 0) score += 15; // 强化普攻就绪
        if (unit.cardName === "反击兵" && unit.braceActive) score += 18;   // 蓄势反击中（下回合爆炸）
        if (unit.cardName === "火神" && (unit.fireGodBuffTurns || 0) > 0) score += 25; // 强化中AOE
        if (unit.cardName === "影舞姬") score += 18;                        // 双技能+滑步
        if (unit.cardName === "同化师") score += 20;                        // 同化共享生命
        if (unit.cardName === "绫罗" && unit.riluoPlaced) score += 18;      // 绫罗离身难击杀
        if (unit.cardName === "赫菲斯托斯" && (unit.hephaestusUseCount || 0) < 3) score += 16; // 方块封锁
        // ── 悬赏机制：敌方悬赏单位击杀后有赏金收益，威胁权重提高（1/2/3/4级悬赏） ──
        if ((unit.bountyLevel || 0) > 0) score += unit.bountyLevel * 10 + 6;
        // 暴食者：击杀回血+物伤永久成长，威胁高
        if (unit.cardName === "暴食者") score += 12;
        // 护援兵：瞬移持续给同格友方和自己+2盾，辅助价值高
        if (unit.cardName === "护援兵") score += 12;
        // 麻木者：只掉1血极难击杀，持久骚扰
        if (unit.cardName === "麻木者") score += 14;
        // 枷锁猎手：自带盾+破盾绝对免疫，难处理
        if (unit.cardName === "枷锁猎手" && (unit.shieldValue || 0) > 0) score += 10;

        // ── 距离城池越近越危险 ──
        const myCastleRow = getOwnCastleRow(mySide);
        const distToCastle = Math.abs(unit.row - myCastleRow);
        score += (5 - distToCastle) * 2;

        // ── 已被标记/定身的单位威胁降低 ──
        if (unit.stun > 0) score *= 0.3;               // 眩晕中威胁大减
        if (unit.shaLinBindTurn > 0) score *= 0.7;      // 被定身威胁降低
        if (unit.eagleEyeTurns > 0) score *= 0.5;      // 被致盲技能失效
        if ((unit.invincibleTurns || 0) > 0) score *= 0.55;        // 无敌中（濒死状态）威胁略降
        if ((unit.absoluteImmunityTurns || 0) > 0) score *= 0.6;   // 绝对免疫期间威胁略降
        if (unit.weakenedTurns > 0) score *= 0.6;      // 弱化中下回合伤害无效

        return Math.min(100, Math.max(0, score));
    }

    // ========== 集火目标管理 ==========
    // 获取当前集火目标（如已死亡则重新选择威胁最高的）
    function aiGetFocusTarget(mySide) {
        if (aiFocusTargetId !== null) {
            const target = gameState.units.find(u => u.id === aiFocusTargetId && u.life > 0);
            if (target) return target;
        }
        const enemies = gameState.units.filter(u => u.side !== mySide && u.life > 0);
        if (enemies.length === 0) return null;
        enemies.sort((a, b) => aiEvaluateThreat(b, mySide) - aiEvaluateThreat(a, mySide));
        aiFocusTargetId = enemies[0].id;
        return enemies[0];
    }

    // ========== 攻击目标选择（升级版）==========
    // 优先级：嘲讽强制 > 斩杀线 > 集火目标 > 威胁最高
    function aiSelectAttackTarget(attacker, enemies) {
        if (!enemies || enemies.length === 0) return null;

        // 1. 嘲讽强制目标（显眼包）
        const taunters = enemies.filter(e => e.cardName === "显眼包");
        if (taunters.length > 0) {
            // 多个嘲讽时选威胁最高的
            taunters.sort((a, b) => aiEvaluateThreat(b, attacker.side) - aiEvaluateThreat(a, attacker.side));
            return taunters[0];
        }

        // 2. 斩杀线：能打死的优先（选威胁最高的可击杀目标）
        const canKill = enemies.filter(e => e.life <= aiEstimateDamage(attacker, e));
        if (canKill.length > 0) {
            canKill.sort((a, b) => {
                // 悬赏单位优先击杀（有赏金收益），其次按威胁排序
                const ba = a.bountyLevel || 0, bb = b.bountyLevel || 0;
                if (ba !== bb) return bb - ba;
                return aiEvaluateThreat(b, attacker.side) - aiEvaluateThreat(a, attacker.side);
            });
            return canKill[0];
        }

        // 3. 集火目标（如果集火目标在可攻击范围内）
        if (aiCfg().focusFire) {
            const focus = aiGetFocusTarget(attacker.side);
            if (focus && enemies.some(e => e.id === focus.id)) return focus;
        }

        // 4. 威胁最高的
        enemies.sort((a, b) => aiEvaluateThreat(b, attacker.side) - aiEvaluateThreat(a, attacker.side));
        return enemies[0];
    }

    // ========== 组合技识别系统 ==========
    // 检测手牌中可执行的组合技，返回计划列表
    // 每个 combo: { type, cards, priority, execute }
    function aiDetectCombos(side) {
        const hand = gameState.players[side].hand;
        const units = gameState.units.filter(u => u.side === side && u.life > 0);
        const combos = [];
        const cfg = aiCfg();

        // ── Combo 1: 武器商 + 三刀/双刀 ──
        // 先下武器商，同格下三刀/双刀，本回合攻击次数翻倍
        const hasWeaponSmith = hand.find(c => c.name === "武器商" && !c.disabled);
        const hasTripleBlade = hand.find(c => c.name === "三刀" && !c.disabled);
        const hasDualBlade = hand.find(c => c.name === "双刀" && !c.disabled);
        // 也检查场上是否已有武器商
        const weaponSmithOnBoard = units.some(u => u.cardName === "武器商");

        if (hasWeaponSmith && (hasTripleBlade || hasDualBlade) && Math.random() < cfg.comboRate) {
            const partner = hasTripleBlade || hasDualBlade;
            const partnerCost = aiGetCardCost(side, partner);
            const smithCost = aiGetCardCost(side, hasWeaponSmith);
            if (gameState.players[side].mana >= smithCost + partnerCost) {
                combos.push({
                    type: 'place_pair',
                    name: '武器商+连击',
                    first: { card: hasWeaponSmith, role: 'support' },
                    second: { card: partner, role: 'attacker', sameCell: true },
                    priority: 90
                });
            }
        }
        // 场上已有武器商 + 手牌有三刀/双刀
        if (weaponSmithOnBoard && (hasTripleBlade || hasDualBlade) && Math.random() < cfg.comboRate) {
            const partner = hasTripleBlade || hasDualBlade;
            combos.push({
                type: 'place_on_smith',
                name: '连击+武器商',
                card: partner,
                priority: 75
            });
        }

        // ── Combo 2: 费机 + 高费单位 ──
        // 先下费机，后续回合多费用下高费卡
        const hasFeiji = hand.find(c => c.name === "费机" && !c.disabled);
        const hasHighCost = hand.find(c => c.cost >= 3 && !c.disabled && c.name !== "费机" && c.name !== "护盾" && c.name !== "无中生有" && c.name !== "鼠疫");
        if (hasFeiji && hasHighCost && Math.random() < cfg.comboRate) {
            combos.push({
                type: 'place_first',
                name: '费机+高费',
                card: hasFeiji,
                priority: 70,
                reserveMana: 2  // 困难模式预留费用给高费卡
            });
        }

        // ── Combo 3: 调酒师 + 高攻单位 ──
        // 调酒师给高攻单位送酒，下次攻击翻倍
        const hasBartender = hand.find(c => c.name === "调酒师" && !c.disabled);
        const myAttackers = units.filter(u => u.dmgValue >= 2 && u.attacksLeftThisTurn > 0 && u.cardName !== "调酒师");
        const hasHighAtkInHand = hand.find(c => c.dmgValue >= 2 && !c.disabled && c.name !== "调酒师");
        if (hasBartender && (myAttackers.length > 0 || hasHighAtkInHand) && Math.random() < cfg.comboRate) {
            combos.push({
                type: 'bartender_buff',
                name: '调酒师+高攻',
                card: hasBartender,
                priority: 65,
                // 记录送酒目标偏好
                buffTarget: myAttackers.length > 0
                    ? myAttackers.sort((a, b) => b.dmgValue - a.dmgValue)[0]
                    : null
            });
        }

        // ── Combo 4: 骑士 vs 敌方重斧兵 ──
        // 如果敌方有蓄力中的重斧兵，优先用骑士秒杀
        const enemyHeavyAxeman = gameState.units.find(u =>
            u.side !== side && u.life > 0 && u.cardName === "重斧兵" && u.superCharging);
        const hasKnight = hand.find(c => c.name === "骑士" && !c.disabled);
        const knightOnBoard = units.find(u => u.cardName === "骑士" && !u.knightSkillUsed && u.attacksLeftThisTurn > 0);
        if (enemyHeavyAxeman) {
            if (knightOnBoard) {
                combos.push({
                    type: 'knight_execute',
                    name: '骑士秒杀重斧兵',
                    unit: knightOnBoard,
                    target: enemyHeavyAxeman,
                    priority: 95
                });
            } else if (hasKnight) {
                combos.push({
                    type: 'place_knight',
                    name: '下骑士针对重斧兵',
                    card: hasKnight,
                    priority: 85
                });
            }
        }

        // ── Combo 5: 骑士/技能秒杀敌方高悬赏单位（击杀获得赏金） ──
        const enemyHighBounty = gameState.units.find(u =>
            u.side !== side && u.life > 0 && (u.bountyLevel || 0) >= 3);
        if (enemyHighBounty) {
            if (knightOnBoard) {
                combos.push({
                    type: 'knight_execute',
                    name: '骑士秒杀悬赏单位',
                    unit: knightOnBoard,
                    target: enemyHighBounty,
                    priority: 88
                });
            } else if (hasKnight) {
                combos.push({
                    type: 'place_knight',
                    name: '下骑士针对悬赏单位',
                    card: hasKnight,
                    priority: 80
                });
            }
        }

        // 按优先级排序
        combos.sort((a, b) => b.priority - a.priority);
        return combos;
    }

    // ========== 防守意识 ==========
    // 判断某单位是否需要保护（是否被敌方高威胁单位威胁）
    function aiShouldProtect(unit, side) {
        if (!unit || unit.life <= 0) return false;
        // 关键单位才保护：悬赏单位（>=2级，被移除会送对方赏金）与核心辅助
        const keyUnits = ["费机", "武器商", "国王", "参谋", "调酒师", "鼓手"];
        const isBountyUnit = (unit.bountyLevel || 0) >= 2;
        if (!keyUnits.includes(unit.cardName) && !isBountyUnit) return false;
        // 检查附近是否有能攻击到它的敌方单位
        const enemies = gameState.units.filter(u => u.side !== side && u.life > 0 && u.attacksLeftThisTurn > 0);
        for (let e of enemies) {
            const dist = Math.abs(e.row - unit.row) + Math.abs(e.col - unit.col);
            if (dist <= e.range + 1) return true;  // 可能被攻击到
        }
        return false;
    }

    // ========== 费用规划 ==========
    // 困难模式：如果手牌有combo组件，预留费用
    function aiPlanMana(side) {
        const cfg = aiCfg();
        if (!cfg.manaPlan) return;

        const hand = gameState.players[side].hand;
        aiReservedMana = 0;

        // 如果手牌有高费卡(>=3)且没有费机，预留1费
        const hasHighCost = hand.some(c => c.cost >= 3 && !c.disabled && c.name !== "护盾");
        const hasFeiji = hand.some(c => c.name === "费机" && !c.disabled);
        if (hasHighCost && !hasFeiji) {
            aiReservedMana = 1;
        }

        // 如果手牌有combo对（武器商+三刀），预留足够费用
        const hasWeaponSmith = hand.some(c => c.name === "武器商" && !c.disabled);
        const hasTripleOrDual = hand.some(c => (c.name === "三刀" || c.name === "双刀") && !c.disabled);
        if (hasWeaponSmith && hasTripleOrDual) {
            // 确保至少留4费给combo
            const comboCost = 2 + 3; // 武器商2 + 三刀3 (worst case)
            if (gameState.players[side].mana >= comboCost + 1) {
                aiReservedMana = 1; // 留1费给其他用途
            }
        }
    }

    // ========== 预牌堆选择（升级版）==========
    // 根据当前局势选牌，而非固定公式
    function aiSelectPrepoolCard(prepool) {
        if (!prepool || prepool.length === 0) return 0;
        const side = aiSide;
        const cfg = aiCfg();

        // 简单难度：随机选
        if (aiDifficulty === 'easy') {
            return Math.floor(Math.random() * prepool.length);
        }

        const enemies = gameState.units.filter(u => u.side !== side && u.life > 0);
        const friends = gameState.units.filter(u => u.side === side && u.life > 0);
        const myHp = gameState.players[side].hp;
        const enemyHp = gameState.players[1 - side].hp;

        let bestIdx = 0, bestScore = -Infinity;
        for (let i = 0; i < prepool.length; i++) {
            const c = prepool[i];
            let s = c.dmgValue * 3 + c.life - c.cost * 2;

            // 基础偏好
            if (c.name === "军营") s += 25;
            if (c.name === "费机") s += 20;
            if (c.name === "护盾") s += 12;
            if (c.name === "净化师") s += 15;
            if (c.name === "机车党") s += 10;  // 碰撞+蓄力高速接近
            if (c.range >= 2) s += 5;

            // ── 局势感知（normal/hard）──
            if (cfg.focusFire) {
                // 血量危险时优先防守卡
                if (myHp <= 5) {
                    if (c.name === "守卫") s += 20;
                    if (c.name === "盾兵") s += 18;
                    if (c.name === "护盾") s += 15;
                    if (c.name === "旗手") s += 12;
                }
                // 敌人多时优先AOE/远程
                if (enemies.length >= 4) {
                    if (c.name === "银运") s += 15;  // AOE
                    if (c.name === "骷髅") s += 12;  // 铺场
                    if (c.range >= 2) s += 8;
                }
                // 敌人少且优势时优先进攻
                if (enemies.length <= 2 && enemyHp <= 5) {
                    if (c.dmgValue >= 3) s += 15;
                    if (c.name === "骑士") s += 20;  // 斩杀
                    if (c.name === "重斧兵") s += 18;
                }
                // 有combo组件时优先配套
                const hand = gameState.players[side].hand;
                if (hand.some(h => h.name === "武器商") && (c.name === "三刀" || c.name === "双刀")) s += 25;
                if (hand.some(h => h.name === "三刀" || h.name === "双刀") && c.name === "武器商") s += 25;
                if (hand.some(h => h.name === "调酒师") && c.dmgValue >= 2) s += 15;
                if (hand.some(h => h.name === "费机") && c.cost >= 3) s += 15;
            }

            if (s > bestScore) { bestScore = s; bestIdx = i; }
        }
        return bestIdx;
    }

    // ========== 弃牌选择（升级版）==========
    // 保留combo组件，丢价值最低的非关键牌
    function aiSelectDiscard(side, newCard) {
        const hand = gameState.players[side].hand;
        const cfg = aiCfg();

        // combo关键牌不丢
        const keyCards = ["护盾", "武器商", "费机", "军营"];
        if (cfg.manaPlan) {
            // 困难模式更精明地保留combo对
            const hasWeaponSmith = hand.some(c => c.name === "武器商");
            const hasTripleOrDual = hand.some(c => c.name === "三刀" || c.name === "双刀");
            if (hasWeaponSmith) keyCards.push("三刀", "双刀");
            if (hasTripleOrDual) keyCards.push("武器商");
            const hasBartender = hand.some(c => c.name === "调酒师");
            if (hasBartender && newCard && newCard.dmgValue >= 2) keyCards.push("调酒师");
        }

        let worstIdx = -1, worstScore = Infinity;
        for (let i = 0; i < hand.length; i++) {
            const c = hand[i];
            // 关键牌不丢（除非费用不够）
            if (keyCards.includes(c.name) && gameState.players[side].mana >= c.cost) continue;
            let s = c.dmgValue * 3 + c.life - c.cost * 2;
            if (c.name === "军营") s += 25;
            if (c.name === "费机") s += 20;
            if (c.name === "武器商") s += 20;
            if (c.name === "三刀" || c.name === "双刀") s += 15;
            if (s < worstScore) { worstScore = s; worstIdx = i; }
        }
        if (worstIdx === -1) worstIdx = 0;
        return worstIdx;
    }

    // ========== 卡牌放置优先级（升级版）==========
    function aiCardPlacePriority(card) {
        const cfg = aiCfg();
        let p = 0;
        p -= card.cost * 2;
        p += card.dmgValue * 3;
        p += card.life;
        if (card.name === "军营") p += 35;
        if (card.name === "费机") p += 28;
        if (card.name === "净化师") p += 18;
        if (card.name === "显眼包") p += 16;
        if (card.name === "盾兵") p += 14;
        if (card.name === "守卫") p += 10;
        if (card.name === "武器商") p += 22;  // combo核心提升
        if (card.name === "三刀" || card.name === "双刀") p += 18;
        if (card.name === "影舞姬") p += 16;
        if (card.name === "同化师") p += 15;
        if (card.name === "绫罗") p += 15;
        if (card.name === "反击兵") p += 14;
        if (card.name === "火神") p += 16;
        if (card.name === "赫菲斯托斯") p += 15;
        if (card.name === "机车党") p += 12;  // 碰撞+蓄力高速接近
        if (card.range >= 2) p += 8;
        if (card.name === "护盾" || card.name === "无中生有" || card.name === "鼠疫") p = -1000;

        // 简单难度随机不放置
        if (aiDifficulty === 'easy' && Math.random() < cfg.skipActionRate) p = -1000;
        return p;
    }

    // ========== 最佳放置位置（升级版）==========
    // 增加防AOE堆叠、远程安全位、肉盾前挡策略
    function aiFindBestPlacement(side, card) {
        const castleRow = getOwnCastleRow(side);
        const forward = getForwardDelta(side);
        const belowCastleRow = castleRow + forward;
        let validCells = [];
        if (card.name === "军营") {
            for (let c = 0; c < 3; c++) { validCells.push({row: castleRow, col: c}); validCells.push({row: belowCastleRow, col: c}); }
        } else if (card.name === "稻草人") {
            for (let c = 0; c < 3; c++) { validCells.push({row: castleRow, col: c}); validCells.push({row: belowCastleRow, col: c}); validCells.push({row: 2, col: c}); }
        } else {
            for (let c = 0; c < 3; c++) validCells.push({row: castleRow, col: c});
            const barracks = gameState.units.filter(u => u.side === side && u.cardName === "军营" && u.life > 0);
            for (let b of barracks) {
                for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                    const r = b.row + dr, c = b.col + dc;
                    if (r >= 0 && r <= 4 && c >= 0 && c <= 2 && !validCells.some(v => v.row === r && v.col === c))
                        validCells.push({row: r, col: c});
                }
            }
        }
        let bestPos = null, bestScore = -Infinity;
        const enemyCastleRow = side === 0 ? 0 : 4;
        const cfg = aiCfg();

        for (let cell of validCells) {
            const { row, col } = cell;
            const hasEnemy = gameState.units.some(u => u.row === row && u.col === col && u.side !== side && u.life > 0);
            const canPlaceOnEnemy = ["掠影", "影舞姬"].includes(card.name);
            if (hasEnemy && !canPlaceOnEnemy) continue;
            if (card.name !== "护援兵" && !canAddUnit(row, col, side)) continue;
            if (row === enemyCastleRow && !canPlaceOnEnemy) continue;

            let score = 0;
            // 靠前加分
            const fwd = side === 0 ? (4 - row) : row;
            score += fwd * 10;
            // 同列敌人多加分（进攻向）
            const enemyInCol = gameState.units.filter(u => u.side !== side && u.col === col && u.life > 0).length;
            score += enemyInCol * 5;
            // 同列友方多减分（分散站位）
            const myUnitsInCol = gameState.units.filter(u => u.side === side && u.col === col && u.life > 0).length;
            score -= myUnitsInCol * 3;
            // 同格单位多减分（防AOE）
            const unitsHere = getUnitsAt(row, col).length;
            score -= unitsHere * 2;

            // ── 位置策略升级（normal/hard）──
            if (cfg.defense) {
                // 远程单位（range>=2）放后方
                if (card.range >= 2) {
                    const backRow = side === 0 ? 4 : 0;
                    if (row === backRow) score += 15;
                    else if (Math.abs(row - backRow) <= 1) score += 8;
                    else score -= 5;
                }
                // 肉盾单位（life>=4, dmgValue低）放前方
                if (card.life >= 4 && card.dmgValue <= 1) {
                    const frontRow = side === 0 ? 3 : 1;
                    if (row === frontRow) score += 12;
                    else if (Math.abs(row - frontRow) <= 1) score += 5;
                }
                // 费机/武器商等辅助放城池行
                if (["费机", "武器商", "国王", "参谋"].includes(card.name)) {
                    if (row === castleRow) score += 20;
                }
            }

            // ── 大师预判：评估此位置下回合受敌方反击伤害，脆弱关键单位避开火力 ──
            if (aiIsMaster() && (card.life <= 4 || ["费机", "武器商", "国王", "参谋", "调酒师"].includes(card.name))) {
                const incoming = aiMasterPredictIncomingDamage({ ...card, side }, row, col);
                if (incoming >= card.life) score -= 40;      // 会被集火击杀的位置
                else if (incoming > 0) score -= incoming * 5; // 受火力按伤害减分
            }

            // ── 武器商combo：优先放在已有三刀/双刀同格 ──
            if (card.name === "武器商") {
                const allies = getUnitsAt(row, col).filter(u => u.side === side);
                if (allies.some(u => u.cardName === "三刀" || u.cardName === "双刀")) score += 40;
                if (allies.some(u => u.dmgValue >= 2 && u.attacksLeftThisTurn > 0)) score += 15;
            }
            // 三刀/双刀combo：优先放在已有武器商同格
            if (card.name === "三刀" || card.name === "双刀") {
                const allies = getUnitsAt(row, col).filter(u => u.side === side);
                if (allies.some(u => u.cardName === "武器商")) score += 40;
            }

            if (score > bestScore) { bestScore = score; bestPos = { row, col }; }
        }
        return bestPos;
    }

    // AI 估算伤害（简化版）
    function aiEstimateDamage(attacker, target) {
        let dmg = attacker.dmgValue;
        if (attacker.tempAttackBonus > 0) dmg += attacker.tempAttackBonus;
        if (attacker.nextAttackBonus > 0) dmg += attacker.nextAttackBonus;
        const { bonus } = applyAifeiAura(attacker, true, attacker.dmgType);
        if (bonus > 0) dmg += bonus;
        if (target.shaLinBindTurn > 0) dmg += 1;
        if (target.cardName === "麻木者") dmg = 1;
        // ── 无敌/绝对免疫：本次攻击无法造成有效生命损失 ──
        if ((target.invincibleTurns || 0) > 0) return 0;   // 无敌最低1血，斩杀线判定无效
        if ((target.absoluteImmunityTurns || 0) > 0) return 0;
        // ── 旗手庇护：免疫物伤 ──
        if ((target.flagBearerProtectTurn || 0) > 0 && attacker.dmgType === '⚔️') return 0;
        // ── 装备系统：来源单位装备效果 ──
        const atkEqId = attacker.equipmentId;
        // 星痕之杖：法术伤害×1.5
        if (atkEqId === 'starWand' && attacker.dmgType === '🔮') {
            dmg = Math.ceil(dmg * 1.5);
        }
        // 妖刀：对生命<=50%的敌方物伤×2
        if (atkEqId === 'demonBlade' && attacker.dmgType === '⚔️') {
            const targetMaxLife = target.maxLife || target.life;
            if (target.life <= targetMaxLife * 0.5) {
                dmg *= 2;
            }
        }
        // 凝血之刃：物伤+1
        if (atkEqId === 'coagulationBlade' && attacker.dmgType === '⚔️') dmg += 1;
        // ── 装备系统：目标碎镜减伤30% ──
        if (target.pureSkyDamageReduction) {
            dmg = Math.floor(dmg * 0.7);
        }
        // ── 装备系统：虚无之衣（生命上限>4时受伤-1） ──
        if (target.equipmentId === 'voidCloak' && (target.maxLife || 0) > 4) dmg = Math.max(0, dmg - 1);
        // 戟兵普通攻击为真伤（isUnblockable），无视护盾
        if (attacker.cardName !== "戟兵" && target.shieldValue > 0) {
            // 枷锁猎手：破盾触发绝对免疫且多余伤害被忽略，仅能清盾
            if (target.cardName === "枷锁猎手") dmg = 0;
            else dmg = Math.max(0, dmg - target.shieldValue);
        }
        // 反击兵蓄势护盾
        if (attacker.cardName !== "戟兵" && (target.braceShield || 0) > 0) {
            dmg = Math.max(0, dmg - target.braceShield);
        }
        // ── 装备系统：暗影纱法术护盾 ──
        if (attacker.dmgType === '🔮' && (target.magicShieldValue || 0) > 0) {
            dmg = Math.max(0, dmg - target.magicShieldValue);
        }
        return dmg;
    }

    // ========== 大师难度：敌方反击预判系统 ==========
    // 预测某单位若位于 (row,col)，下回合敌方所有能打到它的单位造成的总伤害
    function aiMasterPredictIncomingDamage(unit, row, col) {
        let total = 0;
        const enemies = gameState.units.filter(u => u.side !== unit.side && u.life > 0 && !u.isMirror);
        for (let e of enemies) {
            const dist = Math.abs(e.row - row) + Math.abs(e.col - col);
            // 当前能攻击到（含剩余攻击次数）
            if ((e.attacksLeftThisTurn || 0) > 0 && dist <= (e.range || 1)) {
                total += aiEstimateDamage(e, unit) * Math.min(e.attacksLeftThisTurn, 2);
                continue;
            }
            // 敌方未行动（本回合没打过的）：下回合可移动1格再攻击
            if (e.moved !== true && dist <= (e.range || 1) + 1) {
                total += aiEstimateDamage(e, unit);
            }
        }
        return total;
    }

    // 大师：攻击某目标后，敌方对我方单位的反击伤害（用于评估交换是否划算）
    function aiMasterTradeEvaluation(unit, target) {
        // 击杀目标则无反击；否则预测目标单位反击
        if (aiEstimateDamage(unit, target) >= target.life) return { kill: true, incoming: 0, net: Infinity };
        let incoming = 0;
        if ((target.attacksLeftThisTurn || 0) > 0) {
            incoming += aiEstimateDamage(target, unit) * Math.min(target.attacksLeftThisTurn, 2);
        } else if (target.moved !== true) {
            // 目标还没动过：下回合可能移动后反击
            const dist = Math.abs(target.row - unit.row) + Math.abs(target.col - unit.col);
            if (dist <= (target.range || 1) + 1) incoming += aiEstimateDamage(target, unit);
        }
        const dealt = aiEstimateDamage(unit, target);
        return { kill: false, incoming, dealt, net: dealt - incoming };
    }

    // ========== AI 尝试攻击（升级版）==========
    // 使用威胁评估 + 集火 + 斩杀线选择目标
    async function aiTryAttack(unit, myGameId) {
        const side = unit.side;
        const enemySide = 1 - side;
        // 大力士：可攻击前一格或后一格同列的敌人（含摔投）
        if (unit.cardName === "大力士") {
            const candidates = gameState.units.filter(u =>
                u.side === enemySide && u.life > 0 && u.col === unit.col &&
                Math.abs(u.row - unit.row) === 1
            );
            if (candidates.length === 0) return false;
            const cfg = aiCfg();
            if (aiDifficulty === 'easy' && Math.random() < cfg.skipActionRate) return false;
            if (aiGameId !== myGameId) return false;
            if (gameState.nerdJamPending[unit.side]) {
                gameState.nerdJamPending[unit.side] = false;
                addLog(`🤖 👓 行动干扰！${unit.cardName} 的攻击被无效化`);
                renderUI(); return true;
            }
            const target = aiSelectAttackTarget(unit, candidates);
            if (!target) return false;
            await performAttack(unit, target);
            recheckAllWeaponSmithBuffs();
            return true;
        }
        // 镜中人：AOE攻击（选中自身格或相邻格，镜像对称再打一次）
        if (unit.cardName === "镜中人") {
            if (unit.attacksLeftThisTurn <= 0) return false;
            const mcells = [[unit.row, unit.col], [unit.row-1, unit.col], [unit.row+1, unit.col], [unit.row, unit.col-1], [unit.row, unit.col+1]];
            let bestCell = null, bestCount = 0;
            for (let [r, c] of mcells) {
                if (r < 0 || r > 4 || c < 0 || c > 2) continue;
                const count = getUnitsAt(r, c).filter(u => u.side !== unit.side && u.life > 0 && !u.isMirror).length;
                if (count > bestCount) { bestCount = count; bestCell = [r, c]; }
            }
            if (!bestCell) return false;
            if (aiGameId !== myGameId) return false;
            if (gameState.nerdJamPending[unit.side]) {
                gameState.nerdJamPending[unit.side] = false;
                addLog(`🤖 👓 行动干扰！${unit.cardName} 的攻击被无效化`);
                renderUI(); return true;
            }
            await performMirrorPersonAttack(unit, bestCell[0], bestCell[1]);
            recheckAllWeaponSmithBuffs();
            return true;
        }
        // 旋斧人：自身九宫格AOE
        if (unit.cardName === "旋斧人") {
            if (unit.attacksLeftThisTurn <= 0) return false;
            const ccellsEnemy = gameState.units.find(u => u.side !== unit.side && u.life > 0 && !u.isMirror && Math.abs(u.row - unit.row) <= 1 && Math.abs(u.col - unit.col) <= 1);
            if (!ccellsEnemy) return false;
            if (aiGameId !== myGameId) return false;
            if (gameState.nerdJamPending[unit.side]) {
                gameState.nerdJamPending[unit.side] = false;
                addLog(`🤖 👓 行动干扰！${unit.cardName} 的攻击被无效化`);
                renderUI(); return true;
            }
            await performAttack(unit, ccellsEnemy);
            recheckAllWeaponSmithBuffs();
            return true;
        }
        // 双剑在冷却中时无法攻击（只能蓄力横扫，冷却1大回合）
        if (unit.cardName === "双剑" && unit.skillCooldown > 0) return false;
        // 标枪手有强化普攻时不能普通攻击，须使用突刺技能
        if (unit.cardName === "标枪手" && (unit.spearmanCharges || 0) > 0) return false;

        // 跳过为combo留buff的单位
        if (aiSkipAttackIds.has(unit.id)) return false;

        // 攻击本体：优先清理「可击杀」或「高悬赏」的敌方单位（悬赏单位击杀有赏金收益）
        const nearbyKillable = gameState.units.some(u =>
            u.side === enemySide && u.life > 0 && !u.isMirror &&
            Math.abs(u.row - unit.row) + Math.abs(u.col - unit.col) <= unit.range + 1 &&
            (aiEstimateDamage(unit, u) >= u.life || (u.bountyLevel || 0) >= 2)
        );
        if (canAttackBase(unit) && unit.cardName !== "大力士" && unit.cardName !== "骑士" && !nearbyKillable) {
            if (aiGameId !== myGameId) return false;
            if (gameState.nerdJamPending[unit.side]) {
                gameState.nerdJamPending[unit.side] = false;
                addLog(`🤖 👓 行动干扰！${unit.cardName} 的攻击被无效化`);
                renderUI(); return true;
            }
            await attackBase(unit);
            return true;
        }

        // 双剑：检查AOE格子内是否有敌人，有则直接蓄力横扫
        if (unit.cardName === "双剑") {
            const aoeCells = calcDualswordAOECells(unit);
            const enemyInAOE = gameState.units.find(u =>
                u.side === enemySide && u.life > 0 &&
                aoeCells.some(c => c.row === u.row && c.col === u.col)
            );
            if (!enemyInAOE) return false;
            const cfg0 = aiCfg();
            if (aiDifficulty === 'easy' && Math.random() < cfg0.skipActionRate) return false;
            if (aiGameId !== myGameId) return false;
            if (gameState.nerdJamPending[unit.side]) {
                gameState.nerdJamPending[unit.side] = false;
                addLog(`🤖 👓 行动干扰！${unit.cardName} 的攻击被无效化`);
                renderUI(); return true;
            }
            await performAttack(unit, enemyInAOE);
            recheckAllWeaponSmithBuffs();
            return true;
        }

        // 查找可攻击的敌人
        const forward = getForwardDelta(side);
        const isWide = unit.cardName === "双刀" || unit.cardName === "三刀";
        let enemies = [];
        if (isWide) {
            const frontRow = unit.row + forward;
            if (frontRow >= 0 && frontRow <= 4)
                enemies = gameState.units.filter(u => u.side === enemySide && u.life > 0 && u.row === frontRow);
        } else {
            for (let e of gameState.units) {
                if (e.side !== enemySide || e.life <= 0 || e.col !== unit.col) continue;
                const dist = (e.row - unit.row) * forward;
                if (dist < 0) continue;
                if (dist === 0) { enemies.push(e); continue; }
                if (dist <= unit.range) {
                    if (unit.cardName !== "掠影") {
                        let blocked = false;
                        for (let r = unit.row + forward; r !== e.row; r += forward)
                            if (gameState.units.some(u => u.col === unit.col && u.row === r && u.side === enemySide && u.life > 0)) { blocked = true; break; }
                        if (blocked) continue;
                    }
                    enemies.push(e);
                }
            }
        }
        // 同格敌人
        getUnitsAt(unit.row, unit.col).filter(u => u.side !== side && u.life > 0).forEach(e => { if (!enemies.includes(e)) enemies.push(e); });
        if (enemies.length === 0) return false;

        // 嘲讽强制目标
        const taunted = enforceAttackTarget(unit, enemies[0]);
        if (taunted && taunted.side !== side) enemies = [taunted];

        // ── 使用升级版目标选择 ──
        let target = aiSelectAttackTarget(unit, enemies);
        if (!target) return false;

        // ── 大师预判：交换评估（攻击后自己被反击的伤害 > 造成的伤害且无法击杀 → 换更安全目标） ──
        if (aiIsMaster()) {
            const trade = aiMasterTradeEvaluation(unit, target);
            if (!trade.kill && trade.incoming > 0 && trade.dealt < trade.incoming && unit.life - trade.incoming <= 0) {
                // 这次攻击会让自己被反杀且不划算：找净收益更好的目标
                let bestAlt = null, bestNet = -Infinity;
                for (let e of enemies) {
                    if (e.id === target.id) continue;
                    const t2 = aiMasterTradeEvaluation(unit, e);
                    const net = t2.kill ? 1000 : t2.dealt - t2.incoming;
                    if (net > bestNet) { bestNet = net; bestAlt = e; }
                }
                if (bestAlt && bestNet > trade.dealt - trade.incoming) target = bestAlt;
            }
        }

        // 简单难度随机跳过
        const cfg = aiCfg();
        if (aiDifficulty === 'easy' && Math.random() < cfg.skipActionRate) return false;

        if (aiGameId !== myGameId) return false;
        if (gameState.nerdJamPending[unit.side]) {
            gameState.nerdJamPending[unit.side] = false;
            addLog(`🤖 👓 行动干扰！${unit.cardName} 的攻击被无效化`);
            renderUI(); return true;
        }
        await performAttack(unit, target);
        recheckAllWeaponSmithBuffs();
        return true;
    }

    // ========== AI 尝试移动（升级版）==========
    // 增加防守意识：保护关键单位、躲AOE
    async function aiTryMove(unit) {
        const side = unit.side;
        const forward = getForwardDelta(side);
        const cfg = aiCfg();
        if (unit.cardName === "军营" || unit.cardName === "稻草人") return false;
        if (unit.shaLinBindTurn > 0) return false;

        // ── 防守意识：如果关键单位受威胁，其他单位尝试挡位 ──
        if (cfg.defense && !unit.moved && (unit.movesLeftThisTurn || 0) > 0) {
            // 检查己方关键单位是否被威胁（含高悬赏单位：被移除会送对方赏金）
            const keyAllies = gameState.units.filter(u =>
                u.side === side && u.life > 0 && u.id !== unit.id &&
                (["费机", "武器商", "国王", "参谋"].includes(u.cardName) || (u.bountyLevel || 0) >= 2)
            );
            for (let ally of keyAllies) {
                if (!aiShouldProtect(ally, side)) continue;
                // 尝试移动到关键单位前方挡位
                const blockRow = ally.row + getForwardDelta(side);  // 关键单位的前方
                const blockCol = ally.col;
                if (blockRow >= 0 && blockRow <= 4 && blockCol >= 0 && blockCol <= 2) {
                    const sideLimit = side === 0 ? blockRow < 1 : blockRow > 3;
                    if (!sideLimit) {
                        const hasEnemy = gameState.units.some(u => u.row === blockRow && u.col === blockCol && u.side !== side && u.life > 0 && u.cardName !== "掠影");
                        if (!hasEnemy && canAddUnit(blockRow, blockCol, side)) {
                            if (await tryMoveUnit(unit, blockRow, blockCol)) return true;
                        }
                    }
                }
            }
        }

        // 向前移动（原有逻辑）
        const tr = unit.row + forward;
        if (tr >= 0 && tr <= 4) {
            const sideLimit = side === 0 ? tr < 1 : tr > 3;
            if (!sideLimit) {
                const hasEnemy = gameState.units.some(u => u.row === tr && u.col === unit.col && u.side !== side && u.life > 0 && u.cardName !== "掠影");
                // 机车党：前方有敌方也主动走进（触发碰撞伤害）
                const canEnter = unit.cardName === "机车党" ? canAddUnit(tr, unit.col, side) : (!hasEnemy && canAddUnit(tr, unit.col, side));
                if (canEnter) {
                    // 悬赏单位自保：hard/master 下不前移到会被击杀的格子（送对方赏金）
                    if (cfg.defense && (unit.bountyLevel || 0) >= 2) {
                        const lethalAfterMove = gameState.units.some(u =>
                            u.side !== side && u.life > 0 && u.attacksLeftThisTurn > 0 &&
                            Math.abs(u.row - tr) + Math.abs(u.col - unit.col) <= u.range + 1 &&
                            aiEstimateDamage(u, unit) >= unit.life
                        );
                        if (lethalAfterMove) return false;
                    }
                    // 大师预判：所有单位移动前评估敌方反击，若会被集火击杀且无击杀收益则不动
                    if (aiIsMaster()) {
                        const incoming = aiMasterPredictIncomingDamage(unit, tr, unit.col);
                        if (incoming >= unit.life && unit.dmgValue < 3) {
                            // 低攻单位不值得冒死推进；高攻单位可牺牲换伤（由交换评估决定）
                            return false;
                        }
                        // 躲避敌方骑士秒杀：高价值单位不走进敌方骑士正前方
                        if ((unit.dmgValue >= 5 || (unit.bountyLevel || 0) >= 2 || ["费机", "武器商", "国王", "参谋"].includes(unit.cardName))) {
                            const enemyKnightFront = gameState.units.some(u =>
                                u.side !== side && u.life > 0 && u.cardName === "骑士" && !u.knightSkillUsed &&
                                Math.abs(u.row - tr) === 1 && u.col === unit.col &&
                                ((side === 0 && tr === u.row + 1) || (side === 1 && tr === u.row - 1))
                            );
                            if (enemyKnightFront) return false;
                        }
                    }
                    if (aiDifficulty === 'easy' && Math.random() < cfg.skipActionRate) return false;
                    if (await tryMoveUnit(unit, tr, unit.col)) return true;
                }
            }
        }
        // 参谋在场或机车党：尝试其他方向
        if (gameState.units.some(u => u.side === side && u.cardName === "参谋" && u.life > 0) || unit.cardName === "机车党") {
            // 机车党：优先尝试「有敌方可碰撞」的格子（碰撞造成1物伤），其次前进方向
            const dirs = unit.cardName === "机车党"
                ? [[-1,0],[1,0],[0,-1],[0,1]].sort((a, b) => {
                    const ra = unit.row + a[0], ca = unit.col + a[1];
                    const rb = unit.row + b[0], cb = unit.col + b[1];
                    const ea = gameState.units.some(u => u.row === ra && u.col === ca && u.side !== side && u.life > 0) ? 1 : 0;
                    const eb = gameState.units.some(u => u.row === rb && u.col === cb && u.side !== side && u.life > 0) ? 1 : 0;
                    return eb - ea;
                })
                : [[-1,0],[1,0],[0,-1],[0,1]];
            for (let [dr, dc] of dirs) {
                const r = unit.row + dr, c = unit.col + dc;
                if (r < 0 || r > 4 || c < 0 || c > 2 || (r === unit.row && c === unit.col)) continue;
                const sideLimit = side === 0 ? r < 1 : r > 3;
                if (sideLimit) continue;
                const hasEnemy = gameState.units.some(u => u.row === r && u.col === c && u.side !== side && u.life > 0 && u.cardName !== "掠影");
                if (hasEnemy) {
                    // 机车党：可主动走进敌方格触发碰撞伤害
                    if (unit.cardName !== "机车党") continue;
                    if (canAddUnit(r, c, side)) {
                        if (await tryMoveUnit(unit, r, c)) return true;
                    }
                    continue;
                }
                if (canAddUnit(r, c, side)) {
                    if (await tryMoveUnit(unit, r, c)) return true;
                }
            }
        }
        return false;
    }

    // ========== AI 选技能目标（升级版）==========
    // 敌方目标用威胁评估，友方目标选收益最大的
    function aiSelectSkillTarget(caster, targets) {
        if (!targets || targets.length === 0) return null;

        // 敌方目标：选威胁最高的（升级版）
        if (targets[0] && targets[0].side !== caster.side) {
            targets.sort((a, b) => aiEvaluateThreat(b, caster.side) - aiEvaluateThreat(a, caster.side));
            return targets[0];
        }

        // 友方目标
        const skillName = gameState.declarativeSkillName;
        // 治疗：选生命最低的（排除麻木者/禁疗单位——无法被治疗）
        if (skillName === 'zhongyiHeal') {
            const healable = targets.filter(t => t.cardName !== "麻木者" && !t.noHeal);
            if (healable.length === 0) return null;
            healable.sort((a, b) => a.life - b.life);
            return healable[0];
        }
        // 调酒师送酒：选攻击力最高的（收益最大）
        if (skillName === 'bartenderBuff') {
            // 排除生命<=1的（会被1法伤打死）
            const safe = targets.filter(t => t.life > 1);
            if (safe.length > 0) {
                safe.sort((a, b) => b.dmgValue - a.dmgValue);
                return safe[0];
            }
            return null;  // 没有安全目标，不使用
        }
        // 鼓手/号角兵：选攻击力最高的友方
        if (skillName === 'drummerBuff' || skillName === 'hornSoldierBuff') {
            targets.sort((a, b) => b.dmgValue - a.dmgValue);
            return targets[0];
        }
        // 旗手免伤：选生命最低或被威胁的友方
        if (skillName === 'flagBearerBuff') {
            // 优先选被威胁的关键单位
            const threatened = targets.filter(t => aiShouldProtect(t, caster.side));
            if (threatened.length > 0) {
                threatened.sort((a, b) => a.life - b.life);
                return threatened[0];
            }
            targets.sort((a, b) => a.life - b.life);
            return targets[0];
        }
        // 默认：选伤害最高的友方（buff 最大收益）
        targets.sort((a, b) => b.dmgValue - a.dmgValue);
        return targets[0];
    }

    // ========== AI 选择格子（升级版）==========
    function aiSelectGridCell(caster, def) {
        const filter = def.gridFilter || "any";
        const skillName = gameState.declarativeSkillName;

        if (def.targetType === "grid" && filter === "noEnemy") {
            // 护援兵瞬移：优先选择「靠近敌人 + 同格有友方（能一起+2盾）」的空格
            const enemies = gameState.units.filter(u => u.side !== caster.side && u.life > 0);
            if (enemies.length === 0) return null;
            let best = null, bestScore = -Infinity;
            for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
                const hasEnemy = gameState.units.some(u => u.row === r && u.col === c && u.side !== caster.side);
                if (hasEnemy) continue;
                if (!canAddUnit(r, c, caster.side) && caster.cardName !== "护援兵") continue;
                const minDist = Math.min(...enemies.map(e => Math.abs(e.row - r) + Math.abs(e.col - c)));
                // 同格友方数：瞬移后每个友方+2盾，收益高
                const alliesHere = getUnitsAt(r, c).filter(u => u.side === caster.side && u.id !== caster.id).length;
                const score = alliesHere * 8 - minDist * 2;
                if (score > bestScore) { bestScore = score; best = {row: r, col: c}; }
            }
            return best;
        }
        if (filter === "any") {
            // 纱琳定身：选有高威胁敌人的格子
            const enemies = gameState.units.filter(u => u.side !== caster.side && u.life > 0);
            if (enemies.length === 0) return null;
            // 选威胁最高的敌人所在格
            enemies.sort((a, b) => aiEvaluateThreat(b, caster.side) - aiEvaluateThreat(a, caster.side));
            const target = enemies[0];
            return {row: target.row, col: target.col};
        }
        return null;
    }

    // ========== AI 尝试使用技能（升级版）==========
    async function aiTrySkill(unit, myGameId) {
        const side = unit.side;
        const cardDef = CARD_LIBRARY.find(c => c.name === unit.cardName);
        if (!cardDef || !cardDef.skill) return false;
        if (unit.skillUsedThisTurn || unit.silenced > 0 || unit.skillCooldown > 0) return false;
        // 致盲：突刺不受致盲影响，其他技能仍被致盲阻止
        const sk0 = cardDef.skill;
        const def0 = SKILL_DEFS[sk0];
        if (unit.eagleEyeTurns > 0 && !(def0 && def0.ignoresBlind)) return false;
        if (unit._aiSkillTried) return false;

        const sk = cardDef.skill;
        const cfg = aiCfg();

        // ── 难度差异化跳过列表 ──
        // 简单/普通跳过过于复杂的技能，困难难度允许使用
        const skipSkills = ['slaveTransform', 'jinWeiDisable', 'cupidCharm', 'singerSwap', 'superMaleSkill', 'scapegoatTransfer', 'counterBrace', 'shadowFan', 'shadowKick', 'mirrorSpawn', 'hephaestusBlock', 'assimilate', 'riluoRelease', 'riluoDash'];
        if (sk === 'zhongyiHeal' && aiDifficulty === 'easy') return false;  // 简单不会用治疗
        if (skipSkills.includes(sk) && aiDifficulty !== 'hard' && aiDifficulty !== 'master') return false;

        // 基本目标检查
        const enemyAlive = gameState.units.filter(u => u.side !== side && u.life > 0);
        const friendAlive = gameState.units.filter(u => u.side === side && u.life > 0 && u.id !== unit.id);
        const def = SKILL_DEFS[sk];
        if (!def) return false;
        if (def.targetType === "enemy" && enemyAlive.length === 0) return false;
        if (def.targetType === "friendly" && friendAlive.length === 0) return false;
        if (sk === 'sirenPull' && !enemyAlive.some(e => canSirenPullTarget(unit, e))) return false;
        if (sk === 'firemanDetonate' && enemyAlive.every(u => u.col !== unit.col)) return false;
        if (sk === 'witchBuff' && !friendAlive.some(u => Math.abs(u.row - unit.row) <= 1 && Math.abs(u.col - unit.col) <= 1)) return false;

        // ── 难度差异化技能使用率 ──
        if (Math.random() > cfg.skillUseRate) return false;

        // ── 调酒师combo：只在有高攻友方时使用 ──
        if (sk === 'bartenderBuff') {
            const hasGoodTarget = friendAlive.some(u => u.dmgValue >= 2 && u.life > 1);
            if (!hasGoodTarget) return false;
        }

        // ── 骑士秒杀：优先打高威胁目标 ──
        if (sk === 'knightExecute') {
            const frontEnemy = enemyAlive.find(e => {
                const forward = getForwardDelta(side);
                return e.row === unit.row + forward && e.col === unit.col;
            });
            if (!frontEnemy) return false;
            // 无敌/绝对免疫目标免疫秒杀，不浪费技能
            if ((frontEnemy.invincibleTurns || 0) > 0 || (frontEnemy.absoluteImmunityTurns || 0) > 0) return false;
            // 只在有值得秒杀的目标时使用（高生命或高威胁或高悬赏——击杀悬赏单位有赏金）
            const frontHasBounty = (frontEnemy.bountyLevel || 0) > 0;
            if (frontEnemy.life <= 2 && frontEnemy.dmgValue <= 1 && !frontHasBounty) return false;  // 普通攻击就能解决
        }

        // ── 标枪手突刺：有强化普攻且前方有敌人或敌方本体时使用 ──
        if (sk === 'spearmanThrust') {
            if ((unit.spearmanCharges || 0) <= 0) return false;
            if (unit.attacksLeftThisTurn <= 0) return false;
            const forward = getForwardDelta(side);
            const frontRow = unit.row + forward;
            if (frontRow < 0 || frontRow > 4) return false;
            const hasEnemy = gameState.units.some(u => u.row === frontRow && u.col === unit.col && u.side !== side && u.life > 0);
            const enemyCastleRow = side === SIDE_PLAYER0 ? 0 : 4;
            const isFrontCastle = (frontRow === enemyCastleRow);
            if (!hasEnemy && !isFrontCastle) return false;
        }

        // ── 机车党蓄力：附近无敌方时蓄力，为高速接近做准备（附近有敌方则直接移动碰撞） ──
        if (sk === 'motorcyclistCharge') {
            if (unit.motCharging || unit.motReleaseTurn) return false;
            if (unit.moved) return false;
            const nearEnemy = gameState.units.some(u => u.side !== side && u.life > 0 && Math.abs(u.row - unit.row) + Math.abs(u.col - unit.col) <= 2);
            if (nearEnemy) return false;
        }

        if (aiGameId !== myGameId) return false;
        if (gameState.nerdJamPending[unit.side]) {
            gameState.nerdJamPending[unit.side] = false;
            addLog(`🤖 👓 行动干扰！${unit.cardName} 的技能被无效化`);
            renderUI(); return true;
        }

        // 记录技能使用前的状态
        const skillUsedBefore = unit.skillUsedThisTurn;
        const skillCdBefore = unit.skillCooldown || 0;
        const chargesBefore = def.chargeField ? (unit[def.chargeField] || 0) : 0;

        await useSelectedUnitSkill(unit);
        await aiSleep(50);

        // 处理需要选目标的声明式技能
        let attempts = 0;
        while (gameState.awaitingSkillTarget && attempts < 8) {
            attempts++;
            const caster = gameState.units.find(u => u.id === gameState.skillCasterId);
            if (!caster) { clearSkillTarget(); break; }
            const def = SKILL_DEFS[gameState.declarativeSkillName];
            if (!def) { clearSkillTarget(); break; }
            const mode = def.selectMode || "single";

            // confirm 模式：直接确认
            if (mode === "confirm" || (def.confirmButton && (def.targetType === "self" || def.targetType === "none"))) {
                confirmDeclarativeSkill();
                break;
            }

            // grid 模式：选择一个格子
            if (mode === "grid" || def.targetType === "grid") {
                const cell = aiSelectGridCell(caster, def);
                if (cell) { dispatchSkillTarget(caster, cell.row, cell.col, null); }
                else { clearSkillTarget(); break; }
                await aiSleep(30);
                break;
            }

            // twoStep 模式
            if (mode === "twoStep") {
                const targetable = getSkillTargetableUnits(caster);
                if (targetable.length > 0) {
                    const target = aiSelectSkillTarget(caster, targetable);
                    if (target) { dispatchSkillTarget(caster, target.row, target.col, target); }
                    else { clearSkillTarget(); break; }
                } else { clearSkillTarget(); break; }
                await aiSleep(30);
                if (gameState.awaitingSkillTarget && gameState.declarativeStep === 2 && def.step2?.type === "grid") {
                    const cell = aiSelectGridCell(caster, def);
                    if (cell) { dispatchSkillTarget(caster, cell.row, cell.col, null); }
                    else { clearSkillTarget(); break; }
                    await aiSleep(30);
                }
                break;
            }

            // multi 模式
            if (mode === "multi") {
                const targetable = getSkillTargetableUnits(caster);
                if (targetable.length > 0) {
                    const target = aiSelectSkillTarget(caster, targetable);
                    if (target) { dispatchSkillTarget(caster, target.row, target.col, target); }
                    else { break; }
                } else {
                    if (def.confirmButton || def.toggle) {
                        confirmDeclarativeSkill();
                        break;
                    }
                    break;
                }
                await aiSleep(30);
                if ((def.confirmButton || def.toggle) && !gameState.awaitingSkillTarget) break;
                continue;
            }

            // single 模式（默认）
            const targetable = getSkillTargetableUnits(caster);
            if (targetable.length > 0) {
                const target = aiSelectSkillTarget(caster, targetable);
                if (target) { dispatchSkillTarget(caster, target.row, target.col, target); }
                else { clearSkillTarget(); break; }
            } else { clearSkillTarget(); break; }
            await aiSleep(30);
            break;
        }

        // 尝试确认需要确认按钮的技能
        if (gameState.awaitingSkillTarget) {
            const def = SKILL_DEFS[gameState.declarativeSkillName];
            if (def && (def.confirmButton || (def.selectMode === "multi" && def.toggle))) {
                confirmDeclarativeSkill();
            } else {
                clearSkillTarget();
            }
            renderUI();
        }
        // 检测技能是否真正生效
        let skillActuallyUsed = unit.skillUsedThisTurn !== skillUsedBefore || (unit.skillCooldown || 0) !== skillCdBefore;
        // 强化普攻类技能：通过消耗次数检测
        if (def.isAttackSubstitute && def.chargeField) {
            const chargesAfter = (unit[def.chargeField] || 0);
            if (chargesAfter < chargesBefore) skillActuallyUsed = true;
        }
        if (!skillActuallyUsed) {
            unit._aiSkillTried = true;
            clearSkillTarget();
            return false;
        }
        unit._aiSkillTried = false;
        return true;
    }

    // ========== AI 放置卡牌阶段（升级版）==========
    // 先执行combo计划，再正常出牌
    async function aiPlaceCards(myGameId) {
        const side = aiSide;
        const cfg = aiCfg();

        // ── 费用规划 ──
        aiPlanMana(side);

        // ── 组合技检测 ──
        aiComboPlan = aiDetectCombos(side);

        // ── 执行combo计划 ──
        if (aiComboPlan && aiComboPlan.length > 0) {
            for (let combo of aiComboPlan) {
                if (aiGameId !== myGameId) return;
                if (combo.type === 'place_pair') {
                    // 武器商+三刀/双刀：先下武器商，再同格下连击单位
                    const firstCard = combo.first.card;
                    const secondCard = combo.second.card;
                    const firstCost = aiGetCardCost(side, firstCard);
                    const secondCost = aiGetCardCost(side, secondCard);
                    if (gameState.players[side].mana >= firstCost) {
                        // 找最佳位置（武器商优先放有连击单位同格的位置）
                        const pos = aiFindBestPlacement(side, firstCard);
                        if (pos) {
                            const idx = gameState.players[side].hand.indexOf(firstCard);
                            if (idx >= 0) {
                                gameState.selectedCardIdx = idx;
                                await placeUnit(side, firstCard, pos.row, pos.col, idx);
                                renderUI();
                                await aiSleep(300);
                            }
                        }
                    }
                    // 下第二个卡到同格
                    if (gameState.players[side].mana >= secondCost && combo.second.sameCell) {
                        const placedSmith = gameState.units.find(u => u.side === side && u.cardName === firstCard.name && u.life > 0);
                        if (placedSmith) {
                            // 找武器商所在格
                            const targetPos = { row: placedSmith.row, col: placedSmith.col };
                            // 检查能否放置
                            if (canAddUnit(targetPos.row, targetPos.col, side) || secondCard.name === "护援兵") {
                                const idx2 = gameState.players[side].hand.indexOf(secondCard);
                                if (idx2 >= 0) {
                                    gameState.selectedCardIdx = idx2;
                                    await placeUnit(side, secondCard, targetPos.row, targetPos.col, idx2);
                                    renderUI();
                                    await aiSleep(300);
                                    addLog(`🤖 combo: ${firstCard.name}+${secondCard.name} 已连携`);
                                }
                            }
                        }
                    }
                } else if (combo.type === 'place_on_smith') {
                    // 场上已有武器商，下连击单位到同格
                    const smith = gameState.units.find(u => u.side === side && u.cardName === "武器商" && u.life > 0);
                    if (smith) {
                        const card = combo.card;
                        const cost = aiGetCardCost(side, card);
                        if (gameState.players[side].mana >= cost && (canAddUnit(smith.row, smith.col, side) || card.name === "护援兵")) {
                            const idx = gameState.players[side].hand.indexOf(card);
                            if (idx >= 0) {
                                gameState.selectedCardIdx = idx;
                                await placeUnit(side, card, smith.row, smith.col, idx);
                                renderUI();
                                await aiSleep(300);
                                addLog(`🤖 combo: ${card.name} 配合武器商`);
                            }
                        }
                    }
                } else if (combo.type === 'place_first') {
                    // 费机优先下
                    const card = combo.card;
                    const cost = aiGetCardCost(side, card);
                    if (gameState.players[side].mana >= cost) {
                        const pos = aiFindBestPlacement(side, card);
                        if (pos) {
                            const idx = gameState.players[side].hand.indexOf(card);
                            if (idx >= 0) {
                                gameState.selectedCardIdx = idx;
                                await placeUnit(side, card, pos.row, pos.col, idx);
                                renderUI();
                                await aiSleep(300);
                                addLog(`🤖 combo: 先下${card.name}为后续高费做准备`);
                            }
                        }
                    }
                } else if (combo.type === 'bartender_buff') {
                    // 调酒师combo：下调酒师，后续在aiUseUnits中送酒
                    const card = combo.card;
                    const cost = aiGetCardCost(side, card);
                    if (gameState.players[side].mana >= cost) {
                        // 调酒师放在高攻单位旁边
                        let bestPos = null, bestScore = -Infinity;
                        const castleRow = getOwnCastleRow(side);
                        for (let c = 0; c < 3; c++) {
                            const r = castleRow;
                            if (!canAddUnit(r, c, side)) continue;
                            // 检查附近八格有无高攻友方
                            let nearbyAtk = 0;
                            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                                const allies = getUnitsAt(r + dr, c + dc).filter(u => u.side === side && u.dmgValue >= 2);
                                nearbyAtk += allies.length;
                            }
                            const score = nearbyAtk * 20 - getUnitsAt(r, c).length * 3;
                            if (score > bestScore) { bestScore = score; bestPos = {row: r, col: c}; }
                        }
                        if (bestPos) {
                            const idx = gameState.players[side].hand.indexOf(card);
                            if (idx >= 0) {
                                gameState.selectedCardIdx = idx;
                                await placeUnit(side, card, bestPos.row, bestPos.col, idx);
                                renderUI();
                                await aiSleep(300);
                                addLog(`🤖 combo: 调酒师就位，准备送酒`);
                            }
                        }
                    }
                } else if (combo.type === 'place_knight') {
                    // 针对重斧兵下骑士
                    const card = combo.card;
                    const cost = aiGetCardCost(side, card);
                    if (gameState.players[side].mana >= cost) {
                        const pos = aiFindBestPlacement(side, card);
                        if (pos) {
                            const idx = gameState.players[side].hand.indexOf(card);
                            if (idx >= 0) {
                                gameState.selectedCardIdx = idx;
                                await placeUnit(side, card, pos.row, pos.col, idx);
                                renderUI();
                                await aiSleep(300);
                                addLog(`🤖 combo: 骑士上场针对重斧兵`);
                            }
                        }
                    }
                }
            }
        }

        // ── 正常出牌阶段 ──
        let placed = true, safety = 0;
        while (placed && safety < 12) {
            placed = false; safety++;
            if (aiGameId !== myGameId) return;
            const hand = gameState.players[side].hand;
            const candidates = [];
            for (let i = 0; i < hand.length; i++) {
                const card = hand[i];
                if (card.name === "护盾" || card.name === "无中生有" || card.name === "鼠疫") continue;
                if (card.disabled) continue;
                const cost = aiGetCardCost(side, card);
                // 费用规划：预留费用时不花光
                const effectiveMana = gameState.players[side].mana - (cfg.manaPlan ? aiReservedMana : 0);
                if (effectiveMana < cost) continue;
                candidates.push({ card, idx: i, cost, priority: aiCardPlacePriority(card) });
            }
            candidates.sort((a, b) => b.priority - a.priority);
            for (let { card, idx, cost } of candidates) {
                if (aiGameId !== myGameId) return;
                const pos = aiFindBestPlacement(side, card);
                if (pos) {
                    gameState.selectedCardIdx = idx;
                    await placeUnit(side, card, pos.row, pos.col, idx);
                    renderUI();
                    placed = true;
                    await aiSleep(300);
                    break;
                }
            }
        }
        // AI 使用无中生有（手牌未满时）
        if (aiGameId !== myGameId) return;
        const wuzhongIdx = gameState.players[side].hand.findIndex(c => c.name === "无中生有" && !c.disabled);
        if (wuzhongIdx >= 0) {
            const wCost = aiGetCardCost(side, gameState.players[side].hand[wuzhongIdx]);
            if (gameState.players[side].mana >= wCost && gameState.players[side].hand.length <= gameState.players[side].handMax - 2) {
                if (aiDifficulty !== 'easy' || Math.random() < 0.5) {
                    try { await useWuzhong(side, wuzhongIdx); renderUI(); await aiSleep(300); } catch(e) {}
                }
            }
        }
        // AI 使用鼠疫（有敌方单位可感染时）
        if (aiGameId !== myGameId) return;
        const plagueIdx = gameState.players[side].hand.findIndex(c => c.name === "鼠疫" && !c.disabled);
        if (plagueIdx >= 0) {
            const pCost = aiGetCardCost(side, gameState.players[side].hand[plagueIdx]);
            if (gameState.players[side].mana >= pCost) {
                let bestCell = null, bestCount = 0;
                for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
                    const enemies = getUnitsAt(r, c).filter(u => u.side !== side && !u.plagueInfected && u.life > 0);
                    if (enemies.length > bestCount) { bestCount = enemies.length; bestCell = {row: r, col: c}; }
                }
                if (bestCell && bestCount >= 1) {
                    if (aiDifficulty !== 'easy' || bestCount >= 2) {
                        try {
                            usePlague(side, plagueIdx);
                            if (!applyPlagueCell(bestCell.row, bestCell.col)) { clearSkillTarget(); }
                            renderUI();
                            await aiSleep(300);
                        } catch(e) { clearSkillTarget(); }
                    }
                }
            }
        }
    }

    // ========== AI 使用单位阶段 ==========
    async function aiUseUnits(myGameId) {
        const side = aiSide;
        let acted = true, iter = 0;
        while (acted && iter < 35) {
            acted = false; iter++;
            if (aiGameId !== myGameId) return;
            const myUnits = gameState.units.filter(u => u.side === side && u.life > 0);
            myUnits.sort((a, b) => {
                const aCan = (a.attacksLeftThisTurn > 0 || (!a.moved && (a.movesLeftThisTurn || 0) > 0)) && a.stun === 0 && !a.isCharging && !a.superCharging && !a.isSweepCharging && !a.motCharging;
                const bCan = (b.attacksLeftThisTurn > 0 || (!b.moved && (b.movesLeftThisTurn || 0) > 0)) && b.stun === 0 && !b.isCharging && !b.superCharging && !b.isSweepCharging && !b.motCharging;
                if (aCan && !bCan) return -1;
                if (!aCan && bCan) return 1;
                return b.dmgValue - a.dmgValue;
            });
            for (let unit of myUnits) {
                if (aiGameId !== myGameId) return;
                if (unit.stun > 0 || unit.isCharging || unit.superCharging || unit.isSweepCharging || unit.motCharging) continue;
                // 攻击
                if (unit.attacksLeftThisTurn > 0) {
                    if (await aiTryAttack(unit, myGameId)) { acted = true; await aiSleep(300); break; }
                }
                if (aiGameId !== myGameId) return;
                // 技能
                {
                    const _cardDef = CARD_LIBRARY.find(c => c.name === unit.cardName);
                    const _skDef = _cardDef && _cardDef.skill ? SKILL_DEFS[_cardDef.skill] : null;
                    const _ignoresBlind = _skDef && _skDef.ignoresBlind;
                    if (!unit.skillUsedThisTurn && !unit._aiSkillTried && unit.silenced <= 0 && unit.skillCooldown <= 0 && (unit.eagleEyeTurns <= 0 || _ignoresBlind)) {
                        if (await aiTrySkill(unit, myGameId)) { acted = true; await aiSleep(300); break; }
                    }
                }
                if (aiGameId !== myGameId) return;
                // 移动
                if (!unit.moved && (unit.movesLeftThisTurn || 0) > 0) {
                    if (await aiTryMove(unit)) { acted = true; await aiSleep(200); break; }
                }
            }
        }
    }

    // ========== AI 回合主函数 ==========
    async function aiTakeTurn(myGameId) {
        if (aiGameId !== myGameId || gameState.turn !== aiSide) return;
        aiActing = true;

        // ── 重置 AI 内部状态 ──
        aiFocusTargetId = null;
        aiComboPlan = null;
        aiReservedMana = 0;
        aiSkipAttackIds = new Set();
        gameState.units.forEach(u => { u._aiSkillTried = false; });

        renderUI();
        try {
            await aiSleep(600);
            if (aiGameId !== myGameId) return;
            await aiPlaceCards(myGameId);
            if (aiGameId !== myGameId) return;
            // 装备购买阶段（出牌后、使用单位前）
            await aiUseEquipment(myGameId);
            if (aiGameId !== myGameId) return;
            // AI 自动激活装备主动技能（碎镜等）
            aiActivateEquipmentSkills(aiSide);
            await aiUseUnits(myGameId);
            if (aiGameId !== myGameId) return;
            renderUI();
            await aiSleep(400);
            if (aiGameId !== myGameId) return;
            // 清除残留状态
            clearSkillTarget();
            gameState.selectedCardIdx = -1;
            gameState.selectedUnitId = null;
            await endTurn();
        } catch(e) {
            console.error('AI 回合执行错误:', e);
            clearSkillTarget();
            gameState.selectedCardIdx = -1;
            gameState.selectedUnitId = null;
        } finally {
            if (aiGameId === myGameId) {
                aiActing = false;
                renderUI();
            }
        }
    }

    // ==================== AI 对战核心逻辑结束 ====================
