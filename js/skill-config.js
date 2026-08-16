// ========== 技能配置表 & 声明式效果引擎 ==========
// SKILL_DEFS：技能配置表（全部声明式，无需 use* 函数）
// checkSkillPrerequisites：统一前置检查
// resolveSkillEffects：声明式效果执行器
// useSelectedUnitSkill：技能释放入口（自动走声明式路径）
//
// ── 新增技能方式 ──
//   只需在 SKILL_DEFS 添加 effects 数组，无需写任何函数
//
// ── 支持的效果类型 ──
//   damage         - { type: "damage", value, dmgType, unblockable, sourceName }
//   heal           - { type: "heal", value, clearPendingDeath }
//   kill           - { type: "kill" }
//   stun           - { type: "stun", turns }
//   buff           - { type: "buff", buff, value, addMode? }
//   debuff         - { type: "debuff", debuff, turns, checkFireImmune? }
//   reduceCooldown - { type: "reduceCooldown", value }
//   selfDestruct   - { type: "selfDestruct" }
//   setFlag        - { type: "setFlag", flag, value }
//   setNerdJam     - { type: "setNerdJam" }
//   pushBack       - { type: "pushBack", value, target: "allEnemies" }
//   pullForward    - { type: "pullForward", value }
//   pullToCaster   - { type: "pullToCaster", target: "frontRowEnemies" }
//   moveToGrid     - { type: "moveToGrid" }
//   swapPositions  - { type: "swapPositions" }
//   teleportToGrid - { type: "teleportToGrid" }
//   teleportToTarget - { type: "teleportToTarget" }
//   addShield      - { type: "addShield", value, target: "sameCellFriendlies" }
//   setScapegoat   - { type: "setScapegoat" }
//   setCupidPair   - { type: "setCupidPair" }
//   setShaLinBind   - { type: "setShaLinBind" }
//   transform      - { type: "transform" }
//   disableHandCard - { type: "disableHandCard" }
//   startCharge    - { type: "startCharge", chargeType: "halberdier"|"dualsword" }
//   sacrifice      - { type: "sacrifice", buff: "nextAttackBonus" }
//   knightKill     - { type: "knightKill" }
//   witchProtect   - { type: "witchProtect" }
//   zhanYue        - { type: "zhanYue" }
//   modifyAttacks  - { type: "modifyAttacks", value, target: "self" }
//   modifyMoves    - { type: "modifyMoves", value, target: "self" }
//
// ── 效果目标覆盖（默认为技能选中的目标）──
//   { ..., target: "self" }            - 施法者自身
//   { ..., target: "columnEnemies" }   - 同列所有敌方
//   { ..., target: "allEnemies" }      - 全场敌方
//   { ..., target: "frontRowEnemies" } - 前一横行敌方
//   { ..., target: "sameCellFriendlies" } - 同格友方
//
// ── 目标选择模式 (selectMode) ──
//   "single" (默认) - 选择一个单位
//   "multi"  - 多选（maxSelect, range, toggle, confirmButton）
//   "twoStep" - 两步选择（step1 → step2，step2 可为 grid）
//   "grid"   - 选择一个格子
//
// ── 目标类型 (targetType) ──
//   "self" | "enemy" | "friendly" | "none" | "grid" | "any"
//
// ── 目标过滤 (targetFilter) ──
//   sameColumn, attackedOnly, frontAdjacent, excludeSelf, checkBind, pullable, noEnemy
//
// ── 前置检查 (preCheck) ──
//   preCheck: (unit) => boolean
//
// ── 预选择 (preSelect) ──
//   preSelect: async (unit) => boolean（在目标选择前执行，如弹窗选择）

    // ========== ⚙️ 技能配置表 ==========
    // 每个技能包含：icon, label（按钮文本）, targetType, cooldown, effects 等
    // 按钮状态文本由 getSkillBtnText() 自动根据 cooldown/oneTime/useCount 等字段生成
    // 技能取消哨兵：效果执行中途取消时抛出，用于跳过技能结算（不消耗次数/一次性标志）
    const SKILL_CANCELLED = {};
    const SKILL_DEFS = {
        // ════════ 已有声明式技能 ════════
        bartenderBuff: {
            icon: "🍷", label: "送酒", targetType: "friendly", cooldown: 4,
            useCountField: "bartenderUseCount", useCountMax: 2,
            desc: "给友方1点法伤，下次攻击×2（每个调酒师限2次）",
            effects: [
                { type: "damage", value: 1, dmgType: "🔮", sourceName: "调酒师" },
                { type: "buff", buff: "nextAttackDouble", value: true }
            ]
        },
        hypnotistStun: {
            icon: "😵", label: "催眠", targetType: "enemy", cooldown: 0,
            desc: "眩晕敌方2回合（每回合1次）",
            effects: [
                { type: "stun", turns: 2 }
            ]
        },
        weakenerSkill: {
            icon: "📉", label: "弱化", targetType: "enemy", cooldown: 0,
            desc: "弱化敌方，下回合伤害无效",
            targetFilter: { sameColumn: true },
            effects: [
                { type: "debuff", debuff: "weakenedTurns", turns: 2, checkFireImmune: true }
            ]
        },
        eagleEyeSkill: {
            icon: "🦅", label: "致盲", targetType: "enemy", cooldown: 0,
            desc: "致盲敌方，下一个敌方回合技能失效",
            effects: [
                { type: "debuff", debuff: "eagleEyeTurns", turns: 2 }
            ]
        },
        drunkardInvincible: {
            icon: "🍺", label: "醉意无敌", targetType: "self", cooldown: 0, oneTime: "drunkardInvincibleUsed",
            desc: "两回合内免疫死亡（仅一次）",
            preCheck: (unit) => {
                if (unit.invincibleTurns > 0) { showToast(`已处于无敌状态`); return false; }
                return true;
            },
            effects: [
                { type: "buff", buff: "invincibleTurns", value: 4 },
                { type: "buff", buff: "pendingDeath", value: false }
            ]
        },
        chaserExecute: {
            icon: "🔪", label: "追击", targetType: "enemy", cooldown: 0,
            desc: "对被攻击过的敌人追加1真伤",
            targetFilter: { attackedOnly: true },
            preCheck: (unit) => {
                const has = (gameState.attackedEnemyIds || []).length > 0;
                if (!has) { showToast(`本回合没有敌方被攻击过`); return false; }
                return true;
            },
            effects: [
                { type: "damage", value: 1, dmgType: "⚔️", unblockable: true }
            ]
        },
        firemanDetonate: {
            icon: "🔥", label: "自爆", targetType: "self", cooldown: 0,
            desc: "自爆对本列所有敌方造成1法伤",
            preCheck: (unit) => {
                const has = gameState.units.some(u => u.side !== unit.side && u.col === unit.col && u.life > 0);
                if (!has) { showToast(`同列没有敌方单位，无法自爆`); return false; }
                return true;
            },
            effects: [
                // 卡牌描述为「1法伤」（无真伤/不可抵挡字样），不走 unblockable：血舞/手牌护盾/护盾/替伤等正常抵挡
                { type: "damage", value: 1, dmgType: "🔮", target: "columnEnemies" },
                { type: "selfDestruct" }
            ]
        },
        nerdJam: {
            icon: "👓", label: "行动干扰", targetType: "none", cooldown: 0,
            desc: "干扰敌方下回合首次行动",
            perTurnField: "nerdJamUsed", activeField: "nerdJamActive",
            preCheck: (unit) => {
                if (unit.nerdJamUsed) { showToast(`本回合已使用过干扰`); return false; }
                return true;
            },
            effects: [
                { type: "setFlag", flag: "nerdJamActive", value: true },
                { type: "setFlag", flag: "nerdJamUsed", value: true },
                { type: "setNerdJam" }
            ]
        },

        // ════════ 新迁移声明式技能 ════════

        // --- 位移类 ---
        windSoldierSkill: {
            icon: "🌬️", label: "狂风", targetType: "self", cooldown: 0, oneTime: "windSkillUsed",
            desc: "全场敌人击退2格（仅一次）",
            preCheck: (unit) => {
                if (unit.windSkillUsed) { showToast(`狂风技能仅限一次`); return false; }
                const enemies = gameState.units.filter(u => u.side !== unit.side && u.life > 0);
                if (enemies.length === 0) { showToast(`场上没有敌方单位`); return false; }
                return true;
            },
            effects: [
                { type: "pushBack", value: 2, target: "allEnemies" }
            ]
        },
        scarecrowAttract: {
            icon: "🎃", label: "吸引", targetType: "self", cooldown: 0,
            desc: "吸引前一横行所有敌人到面前",
            preCheck: (unit) => {
                const forward = getForwardDelta(unit.side);
                const frontRow = unit.row + forward;
                if (frontRow < 0 || frontRow > 4) { showToast(`前方没有横行`); return false; }
                const has = gameState.units.some(u => u.side !== unit.side && u.row === frontRow);
                if (!has) { showToast(`前方横行没有敌人`); return false; }
                return true;
            },
            effects: [
                { type: "pullToCaster", target: "frontRowEnemies" }
            ]
        },
        sirenPull: {
            icon: "🧜‍♀️", label: "拉拽", targetType: "enemy", cooldown: 4,
            desc: "将敌方向前拉一格",
            targetFilter: { pullable: true },
            effects: [
                { type: "pullForward", value: 1 }
            ]
        },
        correspondentMove: {
            icon: "📡", label: "位移至友方", targetType: "friendly", cooldown: 0,
            desc: "位移至任一友方处",
            targetFilter: { excludeSelf: true },
            preCheck: (unit) => {
                if (unit.shaLinBindTurn > 0) { showToast(`🪞 ${unit.cardName} 被纱琳定身，无法位移！`); return false; }
                return true;
            },
            effects: [
                { type: "teleportToTarget" }
            ]
        },
        huYuanBingTeleport: {
            icon: "📡", label: "瞬移+护盾", targetType: "grid", cooldown: 4, selectMode: "grid",
            desc: "瞬移至任意格，同格友方+2护盾",
            gridFilter: "noEnemy",
            preCheck: (unit) => {
                if (unit.shaLinBindTurn > 0) { showToast(`🪞 ${unit.cardName} 被纱琳定身，无法瞬移！`); return false; }
                return true;
            },
            effects: [
                { type: "teleportToGrid" },
                { type: "addShield", value: 2, target: "sameCellFriendlies" }
            ]
        },
        cowboyPull: {
            icon: "🤠", label: "拉人", targetType: "friendly", cooldown: 4, selectMode: "twoStep",
            desc: "将友方拉至自己所在横线",
            step1: { type: "friendly", excludeSelf: true },
            step2: { type: "grid", gridFilter: "casterRow" },
            effects: [
                { type: "moveToGrid" }
            ]
        },
        singerSwap: {
            icon: "🎤", label: "换位", targetType: "friendly", cooldown: 4, selectMode: "twoStep",
            desc: "交换两个友方位置",
            step1: { type: "friendly", excludeSelf: true, checkBind: true },
            step2: { type: "friendly", excludeSelf: true, checkBind: true },
            effects: [
                { type: "swapPositions" }
            ]
        },
        cupidCharm: {
            icon: "💘", label: "共生死", targetType: "any", cooldown: 0, selectMode: "twoStep",
            desc: "共生死绑定两个单位（每回合1次，限2次）",
            useCountField: "cupidUseCount", useCountMax: 2,
            step1: { type: "any", excludeSelf: true },
            step2: { type: "any", excludeSelf: true },
            preCheck: (unit) => {
                if ((unit.cupidUseCount || 0) >= 2) { showToast(`爱神技能已用完（最多2次）`); return false; }
                const others = gameState.units.filter(u => u.id !== unit.id);
                if (others.length < 2) { showToast(`场上需要至少2个其他单位`); return false; }
                return true;
            },
            effects: [
                { type: "setCupidPair" }
            ]
        },
        shaLinBind: {
            icon: "🪞", label: "定身", targetType: "grid", cooldown: 4, selectMode: "grid",
            desc: "定身格内敌人至下个我方回合（限2次）",
            useCountField: "shaLinUseCount", useCountMax: 2,
            gridFilter: "any",
            preCheck: (unit) => {
                if ((unit.shaLinUseCount || 0) >= 2) { showToast(`纱琳技能已用完（最多2次）`); return false; }
                return true;
            },
            effects: [
                { type: "setShaLinBind" }
            ]
        },

        // --- 增益类 ---
        flagBearerBuff: {
            icon: "🚩", label: "免物伤", targetType: "friendly", cooldown: 0,
            desc: "使友方下个敌方回合免疫物伤",
            effects: [
                { type: "buff", buff: "flagBearerProtectTurn", value: 2 }
            ]
        },
        drummerBuff: {
            icon: "🥁", label: "鼓舞", targetType: "friendly", cooldown: 0, selectMode: "multi",
            desc: "周围八格内两个友方物伤+1",
            maxSelect: 2, range: 1, excludeSelf: true,
            preCheck: (unit) => {
                const friends = gameState.units.filter(u => u.side === unit.side && u !== unit && Math.abs(u.row - unit.row) <= 1 && Math.abs(u.col - unit.col) <= 1);
                if (friends.length < 2) { showToast(`鼓手周围友方不足2个`); return false; }
                return true;
            },
            effects: [
                { type: "buff", buff: "tempAttackBonus", value: 1, addMode: true }
            ]
        },
        hornSoldierBuff: {
            icon: "📯", label: "吹号", targetType: "friendly", cooldown: 4, selectMode: "multi",
            desc: "自身+2队友移速+1，下回合恢复半伤",
            maxSelect: 2, range: 1, excludeSelf: true, confirmButton: true,
            effects: [
                { type: "buff", buff: "movesLeftThisTurn", value: 1, addMode: true, target: "self" },
                { type: "buff", buff: "hornRecoveryTurns", value: 2, target: "self" },
                { type: "buff", buff: "movesLeftThisTurn", value: 1, addMode: true },
                { type: "buff", buff: "hornRecoveryTurns", value: 2 }
            ]
        },
        zhongyiHeal: {
            icon: "💊", label: "治疗", targetType: "friendly", cooldown: 0, selectMode: "multi", oneTime: "zhongyiHealUsed",
            desc: "治疗3个友方+1血（每回合1次）",
            maxSelect: 3,
            preCheck: (unit) => {
                if (unit.zhongyiHealUsed) { showToast(`${unit.cardName} 本回合已治疗`); return false; }
                return true;
            },
            effects: [
                { type: "heal", value: 1, clearPendingDeath: true }
            ]
        },
        witchBuff: {
            icon: "🔮", label: "法伤庇护", targetType: "friendly", cooldown: 0, selectMode: "multi",
            desc: "周围友方本回合受法伤-3/2/1",
            range: 1, excludeSelf: true, confirmButton: true,
            preSelect: async (unit) => {
                const countOpts = ["1", "2", "3"];
                const sel = await showSelect(countOpts.map(c => `${c}. 庇护${c}个友方（每人法伤-${4-parseInt(c)}）`), `魔女选择庇护人数`);
                if (sel === -1) { showToast(`取消庇护`); return false; }
                gameState.declarativeMaxSelect = parseInt(countOpts[sel]);
                gameState.declarativeWitchReduce = 4 - parseInt(countOpts[sel]);
                return true;
            },
            effects: [
                { type: "witchProtect" }
            ]
        },

        // --- 献祭/替死类 ---
        superMaleSkill: {
            icon: "💪", label: "祭献", targetType: "friendly", cooldown: 0, selectMode: "multi",
            desc: "献祭周围友方，提升下次攻击",
            maxSelect: 99, range: 1, excludeSelf: true, toggle: true, confirmButton: true,
            effects: [
                { type: "sacrifice", buff: "nextAttackBonus" }
            ]
        },
        scapegoatTransfer: {
            icon: "🐑", label: "替死", targetType: "friendly", cooldown: 0, selectMode: "multi", oneTime: "scapegoatUsed",
            desc: "替友方承受致死伤害（最多2个）",
            maxSelect: 2, excludeSelf: true, toggle: true, confirmButton: true,
            effects: [
                { type: "setScapegoat" }
            ]
        },

        // --- 蓄力类 ---
        halberdierCharge: {
            icon: "⚔️", label: "蓄力横扫", targetType: "self", cooldown: 0, oneTime: "halberdierSkillUsed",
            chargingField: "halberdierCharging",
            desc: "蓄力横扫，下回合3真伤（仅一次）",
            preCheck: (unit) => {
                if (unit.halberdierSkillUsed) { showToast(`戟兵已经使用过蓄力横扫`); return false; }
                if (unit.attacksLeftThisTurn <= 0) { showToast(`本回合已经行动过，无法蓄力`); return false; }
                return true;
            },
            effects: [
                { type: "startCharge", chargeType: "halberdier" },
                { type: "modifyAttacks", value: -1, target: "self" }
            ]
        },
        // 机车党蓄力：点击技能进入蓄力，每个我方回合开始选择继续蓄力或释放
        motorcyclistCharge: {
            icon: "🏍️", label: "蓄力", targetType: "self", cooldown: 0, selectMode: "self",
            chargingField: "motCharging",
            desc: "蓄力1/2/3回合，蓄力完成的回合移速+3/6/9（蓄力期间不能移动，蓄力完成的回合不能再蓄力）",
            preCheck: (unit) => {
                if (unit.motCharging) { showToast(`${unit.cardName} 正在蓄力中`); return false; }
                if (unit.motReleaseTurn) { showToast(`${unit.cardName} 蓄力完成的回合不能再蓄力`); return false; }
                if (unit.moved) { showToast(`${unit.cardName} 已经移动过，无法蓄力`); return false; }
                return true;
            },
            effects: [
                { type: "motorcyclistCharge" }
            ]
        },
        // 双剑已改为普通攻击形式（点击敌人自动蓄力），不再需要技能按钮
        // dualswordAOE 的蓄力逻辑由 performAttack → autoDualswordCharge 处理

        // --- 特殊类 ---
        knightExecute: {
            icon: "🗡️", label: "秒杀前一格", targetType: "enemy", cooldown: 0, oneTime: "knightSkillUsed",
            desc: "秒杀正前方1格敌人（仅一次）",
            targetFilter: { frontAdjacent: true },
            preCheck: (unit) => {
                if (unit.attacksLeftThisTurn <= 0) { showToast(`${unit.cardName} 已经攻击过，不能使用秒杀`); return false; }
                if (unit.knightSkillUsed) { showToast(`骑士已经使用过秒杀技能`); return false; }
                return true;
            },
            effects: [
                { type: "knightKill" },
                { type: "buff", buff: "speed", value: 1, target: "self" },
                { type: "modifyAttacks", value: -1, target: "self" }
            ]
        },
        slaveTransform: {
            icon: "⛓️", label: "变形", targetType: "self", cooldown: 0, oneTime: "transformUsed",
            desc: "消耗三张奴隶变形为任意单位",
            preCheck: (unit) => {
                if (unit.transformUsed) { showToast(`已经使用过变形技能`); return false; }
                const slaveCards = gameState.players[unit.side].hand.filter(c => c.name === "奴隶");
                if (slaveCards.length < 2) { showToast(`手牌中需要至少两张奴隶卡牌才能变形`); return false; }
                return true;
            },
            effects: [
                { type: "transform" }
            ]
        },
        jinWeiDisable: {
            icon: "🔒", label: "禁用对手手牌", targetType: "none", cooldown: 0,
            desc: "禁用对手一张手牌（持续1大回合）",
            preCheck: (unit) => {
                const enemySide = unit.side === SIDE_PLAYER0 ? SIDE_PLAYER1 : SIDE_PLAYER0;
                if (gameState.players[enemySide].hand.length === 0) { showToast(`对手没有手牌可以禁用`); return false; }
                return true;
            },
            effects: [
                { type: "disableHandCard" }
            ]
        },
        zhanYueSkill: {
            icon: "🔪", label: "斩月", targetType: "self", cooldown: 0,
            desc: "标记/斩杀标记中HP≤2的敌人",
            preSelect: async (unit) => {
                const marked = gameState.zhanYueMarkedEnemyIds || [];
                const hasMarked = marked.length > 0;
                const options = [];
                if (!hasMarked) options.push("标记：自动标记前两行所有敌人");
                else {
                    options.push("标记：追加标记前两行敌人");
                    const executable = gameState.units.filter(u => marked.includes(u.id) && u.life > 0 && u.life <= 2);
                    if (executable.length > 0) options.push(`斩杀：消灭${executable.length}个被标记且HP≤2的敌人`);
                }
                if (options.length === 0) { showToast(`没有可执行的操作`); return false; }
                const aiChoice = (opts) => {
                    for (let i = 0; i < opts.length; i++) { if (opts[i].includes('斩杀')) return i; }
                    return 0;
                };
                const choice = await showSelect(options, `🔪 斩月：选择操作`, { aiChoice });
                if (choice === -1) { showToast(`取消斩月技能`); return false; }
                gameState.declarativeZhanYueChoice = choice;
                return true;
            },
            effects: [
                { type: "zhanYue" }
            ]
        },
        // --- 标枪手突刺（强化普攻） ---
        spearmanThrust: {
            icon: "🔱", label: "突刺", targetType: "self", cooldown: 0,
            isAttackSubstitute: true,
            chargeField: "spearmanCharges",
            ignoresBlind: true,
            desc: "消耗1次强化普攻，+1物伤，向前突进1格并对前一格所有敌人造成AOE伤害。击杀后本回合普攻次数刷新。",
            preCheck: (unit) => {
                if ((unit.spearmanCharges || 0) <= 0) { showToast(`没有强化普攻可用`); return false; }
                if (unit.attacksLeftThisTurn <= 0) { showToast(`本回合攻击次数已用完`); return false; }
                return true;
            },
            effects: [
                { type: "modifyAttacks", value: -1, target: "self" },
                { type: "spearmanThrust" }
            ]
        },
        // --- 反击兵蓄势反击 ---
        counterBrace: {
            icon: "🛡️", label: "蓄势反击", targetType: "self", cooldown: 0,
            useCountField: "counterUseCount", useCountMax: 2,
            desc: "自己获得2点护盾，本回合禁止移动和普通攻击；下回合爆炸；护盾损耗转化为下次普攻增伤",
            preCheck: (unit) => {
                if ((unit.counterUseCount || 0) >= 2) { showToast(`蓄势反击已用完（最多2次）`); return false; }
                if (unit.braceActive) { showToast(`已经处于蓄势反击状态`); return false; }
                return true;
            },
            effects: [
                { type: "counterBrace" }
            ]
        },
        // --- 火神强化 ---
        fireGodEmpower: {
            icon: "🔥", label: "强化", targetType: "self", cooldown: 0, oneTime: "fireGodSkillUsed",
            desc: "本回合及下两个我方回合内攻击范围+1，普通攻击变为竖排3格AOE（目标及前方2格，仅一次）",
            preCheck: (unit) => {
                if (unit.fireGodSkillUsed) { showToast(`火神强化已使用（仅一次）`); return false; }
                return true;
            },
            effects: [
                { type: "fireGodEmpower" }
            ]
        },
        // --- 影舞姬：飞扇 ---
        shadowFan: {
            icon: "🪭", label: "飞扇", targetType: "enemy", cooldown: 4, cooldownField: "fanCooldown",
            desc: "对正前方同列距离3内的一个敌方造成2点法伤（无可选目标则空放）",
            targetFilter: { shadowFanRange: true },
            preCheck: (unit) => {
                if ((unit.fanCooldown || 0) > 0) { showToast(`飞扇冷却中`); return false; }
                if (unit.attacksLeftThisTurn <= 0) { showToast(`本回合已经攻击过，无法使用飞扇`); return false; }
                return true;
            },
            preSelect: async (unit) => {
                const forward = getForwardDelta(unit.side);
                const hasTarget = gameState.units.some(u => u.side !== unit.side && u.life > 0 && !u.isMirror && u.absoluteImmunityTurns <= 0 && u.col === unit.col && (u.row - unit.row) * forward > 0 && (u.row - unit.row) * forward <= 3);
                if (!hasTarget) {
                    addLog(`🪭 ${unit.cardName} 飞扇空放（无目标）`);
                    showToast(`🪭 飞扇空放`);
                    unit.attacksLeftThisTurn = Math.max(0, unit.attacksLeftThisTurn - 1);
                    unit.fanCooldown = 4;
                    if (unit.life > 0) {
                        gameState.awaitingGlide = true;
                        gameState.glideUnitId = unit.id;
                        showToast(`💃 可自由滑步1格`);
                    }
                    return 'consumed';
                }
                return true;
            },
            effects: [
                { type: "modifyAttacks", value: -1, target: "self" },
                { type: "damage", value: 2, dmgType: "🔮" }
            ]
        },
        // --- 影舞姬：旋风踢 ---
        shadowKick: {
            icon: "🦵", label: "旋风踢", targetType: "grid", cooldown: 4, cooldownField: "kickCooldown", selectMode: "grid",
            gridFilter: "distance2",
            desc: "位移2格（任意方向，可原地释放），对终点所在横行的所有敌方造成1点法伤并眩晕2回合",
            preCheck: (unit) => {
                if ((unit.kickCooldown || 0) > 0) { showToast(`旋风踢冷却中`); return false; }
                if (unit.attacksLeftThisTurn <= 0) { showToast(`本回合已经攻击过，无法使用旋风踢`); return false; }
                if (unit.shaLinBindTurn > 0) { showToast(`🪞 ${unit.cardName} 被纱琳定身，无法位移！`); return false; }
                return true;
            },
            effects: [
                { type: "modifyAttacks", value: -1, target: "self" },
                { type: "shadowKick" }
            ]
        },
        // --- 镜中人：生成镜像 ---
        mirrorSpawn: {
            icon: "🪞", label: "生成镜像", targetType: "self", cooldown: 0, oneTime: "mirrorSkillUsed",
            desc: "以中线为对称轴生成镜像（仅一次）",
            preCheck: (unit) => {
                if (unit.mirrorSkillUsed) { showToast(`生成镜像已使用（仅一次）`); return false; }
                if (getMirrorOf(unit)) { showToast(`已有镜像`); return false; }
                return true;
            },
            effects: [
                { type: "mirrorSpawn" }
            ]
        },
        // --- 赫菲斯托斯：锻造方块 ---
        hephaestusBlock: {
            icon: "🧱", label: "锻造方块", targetType: "grid", cooldown: 0, selectMode: "grid",
            useCountField: "hephaestusUseCount", useCountMax: 3,
            gridFilter: "notEnemyCastle",
            desc: "在非敌方城池格生成方块（敌方不可走入/走出），对方块格及十字4格敌人造成1法伤",
            preCheck: (unit) => {
                if ((unit.hephaestusUseCount || 0) >= 3) { showToast(`锻造方块已用完（最多3次）`); return false; }
                return true;
            },
            effects: [
                { type: "hephaestusBlock" }
            ]
        },
        // --- 同化师：同化 ---
        assimilate: {
            icon: "🧬", label: "同化", targetType: "friendly", cooldown: 0, excludeSelf: true,
            targetFilter: { notAssimilator: true },
            desc: "将一个友方变为同化者（3血1法伤，共享生命）",
            preCheck: (unit) => {
                const friends = gameState.units.filter(u => u.side === unit.side && u.id !== unit.id && u.life > 0 && !u.isAssimilator);
                if (friends.length === 0) { showToast(`没有可同化的友方单位`); return false; }
                return true;
            },
            effects: [
                { type: "assimilate" }
            ]
        },
        // --- 绫罗：放绫罗 ---
        riluoRelease: {
            icon: "🧵", label: "放绫罗", targetType: "grid", cooldown: 0, selectMode: "grid",
            gridFilter: "nearby1",
            desc: "将绫罗放至所在格及九宫格内任一格",
            preCheck: (unit) => {
                if ((unit.riluoReleaseCount || 0) <= 0) { showToast(`绫罗已放出3次，无法再放出`); return false; }
                if (unit.riluoPlaced) { showToast(`绫罗已离身，只能回绫罗`); return false; }
                return true;
            },
            effects: [
                { type: "riluoRelease" }
            ]
        },
        // --- 绫罗：位移留绫罗 ---
        riluoDash: {
            icon: "💨", label: "位移留绫罗", targetType: "grid", cooldown: 0, selectMode: "grid",
            gridFilter: "adjacent1",
            desc: "位移至周围一格并将绫罗留在原地",
            preCheck: (unit) => {
                if ((unit.riluoReleaseCount || 0) <= 0) { showToast(`绫罗已放出3次，无法再放出`); return false; }
                if (unit.riluoPlaced) { showToast(`绫罗已离身，只能回绫罗`); return false; }
                return true;
            },
            effects: [
                { type: "riluoDash" }
            ]
        },
    };

    // ========== 自动生成技能按钮文本 ==========
    // 从 SKILL_DEFS 的 icon/label/cooldown/oneTime/useCountField 等字段自动推导
    function getSkillBtnText(unit, skillName) {
        const def = SKILL_DEFS[skillName];
        if (!def) return skillName;
        let text = `${def.icon || ""} ${def.label || skillName}`;
        // 状态后缀（优先级从高到低）
        const cdField = def.cooldownField || 'skillCooldown';
        if (def.cooldown > 0 && (unit[cdField] || 0) > 0) {
            text += ` (冷却${Math.ceil((unit[cdField] || 0) / 2)}大回合)`;
        } else if (def.oneTime && unit[def.oneTime]) {
            text += " (已使用)";
        } else if (def.useCountField && def.useCountMax) {
            const used = unit[def.useCountField] || 0;
            if (used >= def.useCountMax) text += " (已用完)";
            else text += ` (${used}/${def.useCountMax})`;
        } else if (def.chargingField && unit[def.chargingField]) {
            text += " (蓄力中)";
        } else if (def.activeField && unit[def.activeField]) {
            text += " (生效中)";
        } else if (def.perTurnField && unit[def.perTurnField]) {
            text += " (已使用)";
        } else if (def.chargeField) {
            const charges = unit[def.chargeField] || 0;
            if (charges <= 0) text += " (无强化)";
            else text += ` (${charges}次)`;
        } else if (unit.skillUsedThisTurn) {
            text += " (已使用)";
        }
        return text;
    }

    // ========== 统一前置检查 ==========
    function checkSkillPrerequisites(unit, skillName) {
        const def = SKILL_DEFS[skillName];
        if (!def) return true;
        if (unit.stun > 0) { showToast(`${unit.cardName} 眩晕无法使用技能`); return false; }
        if (unit.silenced > 0) { showToast(`${unit.cardName} 被沉默，无法使用技能`); return false; }
        if (unit.eagleEyeTurns > 0 && !def.ignoresBlind) { showToast(`${unit.cardName} 被致盲，技能失效`); return false; }
        const _cdField = def.cooldownField || 'skillCooldown';
        if (def.cooldown > 0 && (unit[_cdField] || 0) > 0) {
            showToast(`技能冷却中，还需 ${Math.ceil((unit[_cdField] || 0)/2)}大回合`); return false;
        }
        if (!def.isAttackSubstitute && unit.skillUsedThisTurn) { showToast(`本回合已经使用过技能`); return false; }
        if (def.preCheck && !def.preCheck(unit)) return false;
        return true;
    }

    // ========== 免疫检查 ==========

    function isControlImmune(target, effect) {
        if (target.absoluteImmunityTurns > 0) {
            addLog(`${target.cardName} 绝对免疫！`); return true;
        }
        if (target.superCharging) {
            addLog(`${target.cardName} 霸体免疫控制！`); return true;
        }
        if ((effect.type === "stun" || effect.checkFireImmune) && isFireImmune(target)) {
            addLog(`${target.cardName} 火人同列免疫控制！`); return true;
        }
        return false;
    }

    function isDisplacementImmune(target) {
        if (target.absoluteImmunityTurns > 0) {
            addLog(`${target.cardName} 绝对免疫，免疫位移！`); return true;
        }
        if (target.superCharging) {
            addLog(`⚡⚡ ${target.cardName} 处于霸体状态，免疫位移！`); return true;
        }
        if (target.shaLinBindTurn > 0) {
            addLog(`🪞 ${target.cardName} 被纱琳定身，免疫位移！`); return true;
        }
        if (target.isSweepCharging) {
            addLog(`⚔️ ${target.cardName} 正在横扫蓄力，免疫位移！`); return true;
        }
        return false;
    }

    function canPullForward(caster, target) {
        if (!target || target.side === caster.side) return false;
        if (target.absoluteImmunityTurns > 0) return false;
        if (target.superCharging) return false;
        if (target.shaLinBindTurn > 0) return false;
        if (target.isSweepCharging) return false;
        const moveDir = caster.side === SIDE_PLAYER0 ? 1 : -1;
        const newRow = target.row + moveDir;
        if (newRow < 0 || newRow > 4) return false;
        const isForbiddenCastle = (caster.side === SIDE_PLAYER0 && newRow === 4) || (caster.side === SIDE_PLAYER1 && newRow === 0);
        if (isForbiddenCastle) return false;
        const hasAlly = gameState.units.some(u => u.row === newRow && u.col === target.col && u.side === caster.side);
        if (hasAlly) return false;
        return true;
    }

    // ========== 声明式效果执行器 ==========

    async function applyEffect(caster, effect, target, ctx) {
        // ── 施法者自身效果（不受 target 影响）──
        if (effect.type === "selfDestruct") {
            caster.life = 0;
            removeUnit(caster.id, caster.row, caster.col, caster.side);
            renderUI();  // 自爆后立即刷新棋盘，避免单位残留显示
            return;
        }
        if (effect.type === "counterBrace") {
            caster.braceActive = true;
            caster.braceShield = 2;
            caster.moved = true;
            caster.movesLeftThisTurn = 0;
            caster.attacksLeftThisTurn = 0;
            addLog(`🛡️ ${caster.cardName} 发动蓄势反击，获得2点护盾，本回合无法移动和普通攻击`);
            showToast(`🛡️ 蓄势反击！+2护盾`);
            return;
        }
        if (effect.type === "fireGodEmpower") {
            caster.fireGodBuffTurns = 6;  // 3个我方回合 = 6个小回合
            caster.range += 1;
            addLog(`🔥 ${caster.cardName} 强化自身：攻击范围+1（当前${caster.range}），普通攻击变为AOE，持续3个我方回合`);
            showToast(`🔥 火神强化！范围+1，攻击变AOE`);
            return;
        }
        if (effect.type === "shadowFan") {
            const forward = getForwardDelta(caster.side);
            let target = null, bestDist = Infinity;
            for (let u of gameState.units) {
                if (u.side === caster.side || u.life <= 0 || u.col !== caster.col) continue;
                const d = (u.row - caster.row) * forward;
                if (d >= 0 && d <= 3 && d < bestDist) { bestDist = d; target = u; }
            }
            if (!target) {
                addLog(`🪭 ${caster.cardName} 飞扇空放（无目标）`);
                showToast(`🪭 飞扇空放`);
                return;
            }
            const source = { cardName: caster.cardName, side: caster.side, dmgType: "🔮", id: caster.id, fromSkill: true };
            await applyDamageWithSource(target, 2, source, false, "🔮");
            addLog(`🪭 ${caster.cardName} 飞扇命中 ${target.cardName}，造成2点法伤`);
            showToast(`🪭 飞扇！2法伤`);
            return;
        }
        if (effect.type === "shadowKick") {
            const gridRow = gameState.declarativeGridRow;
            const gridCol = gameState.declarativeGridCol;
            if (gridRow === null || gridCol === null) { showToast(`请选择旋风踢的落点`); return; }
            const dr = Math.abs(gridRow - caster.row), dc = Math.abs(gridCol - caster.col);
            const totalDist = dr + dc;
            if (totalDist !== 0 && totalDist !== 2) { showToast(`旋风踢只能位移2格或原地释放`); return; }
            if (totalDist === 2) {
                if (!canAddUnit(gridRow, gridCol, caster.side)) { showToast(`目标格己方已满`); return; }
                if (caster.side === SIDE_PLAYER0 && gridRow < 1) { showToast(`不能进入敌方城池`); return; }
                if (caster.side === SIDE_PLAYER1 && gridRow > 3) { showToast(`不能进入敌方城池`); return; }
            }
            caster.row = gridRow;
            caster.col = gridCol;
            addLog(`🦵 ${caster.cardName} 旋风踢位移至 ${ROW_NAMES[gridRow]}${COLS[gridCol]}`);
            applyShaLinCellBinding(caster);
            const targets = gameState.units.filter(u => u.side !== caster.side && u.life > 0 && u.row === gridRow);
            for (let t of targets) {
                const source = { cardName: caster.cardName, side: caster.side, dmgType: "🔮", id: caster.id, fromSkill: true };
                await applyDamageWithSource(t, 1, source, false, "🔮");
                if (gameState.units.some(u => u.id === t.id) && !isControlImmune(t, { type: "stun" })) {
                    t.stun = 2;
                    t.stunnedBy = caster.id;
                    addLog(`  ${t.cardName} 被眩晕2回合`);
                }
            }
            showToast(`🦵 旋风踢！`);
            return;
        }
        if (effect.type === "mirrorSpawn") {
            const mirrorRow = 4 - caster.row;
            const mirrorCol = caster.col;
            const mirror = createMirrorUnit(caster, mirrorRow, mirrorCol);
            gameState.units.push(mirror);
            caster.mirrorId = mirror.id;
            addLog(`🪞 ${caster.cardName} 生成镜像（${ROW_NAMES[mirrorRow]}${COLS[mirrorCol]}）`);
            showToast(`🪞 镜像生成！`);
            return;
        }
        if (effect.type === "hephaestusBlock") {
            const gridRow = gameState.declarativeGridRow;
            const gridCol = gameState.declarativeGridCol;
            if (gridRow === null || gridCol === null) { showToast(`请选择方块位置`); return; }
            const enemyCastleRow = caster.side === SIDE_PLAYER0 ? 0 : 4;
            if (gridRow === enemyCastleRow) { showToast(`不能放在敌方城池`); return; }
            gameState.hephaestusBlocks.push({ row: gridRow, col: gridCol, turnsLeft: 2, side: caster.side });
            addLog(`🧱 ${caster.cardName} 在 ${ROW_NAMES[gridRow]}${COLS[gridCol]} 生成方块`);
            showToast(`🧱 方块生成！`);
            const cells = [[gridRow, gridCol], [gridRow-1, gridCol], [gridRow+1, gridCol], [gridRow, gridCol-1], [gridRow, gridCol+1]];
            const targets = gameState.units.filter(u => u.side !== caster.side && u.life > 0 && !u.isMirror && cells.some(([r,c]) => u.row === r && u.col === c));
            for (let t of targets) {
                const source = { cardName: caster.cardName, side: caster.side, dmgType: "🔮", id: caster.id, fromSkill: true };
                await applyDamageWithSource(t, 1, source, false, "🔮");
            }
            return;
        }
        if (effect.type === "riluoRelease") {
            const gridRow = gameState.declarativeGridRow;
            const gridCol = gameState.declarativeGridCol;
            if (gridRow === null || gridCol === null) { showToast(`请选择绫罗位置`); return; }
            if (caster.side === SIDE_PLAYER0 && gridRow === 0) { showToast(`不能把绫罗放到敌方城池`); return; }
            if (caster.side === SIDE_PLAYER1 && gridRow === 4) { showToast(`不能把绫罗放到敌方城池`); return; }
            caster.riluoPlaced = true;
            caster.riluoRow = gridRow;
            caster.riluoCol = gridCol;
            caster.riluoReleaseCount = Math.max(0, (caster.riluoReleaseCount || 0) - 1);
            addLog(`🧵 ${caster.cardName} 放出绫罗（${ROW_NAMES[gridRow]}${COLS[gridCol]}）`);
            showToast(`🧵 放出绫罗！`);
            return;
        }
        if (effect.type === "riluoDash") {
            const gridRow = gameState.declarativeGridRow;
            const gridCol = gameState.declarativeGridCol;
            if (gridRow === null || gridCol === null) { showToast(`请选择位移位置`); return; }
            if (caster.shaLinBindTurn > 0) { showToast(`🪞 ${caster.cardName} 被纱琳定身，无法位移！`); return; }
            if (caster.side === SIDE_PLAYER0 && gridRow === 0) { showToast(`不能进入敌方城池`); return; }
            if (caster.side === SIDE_PLAYER1 && gridRow === 4) { showToast(`不能进入敌方城池`); return; }
            if (gameState.units.some(u => u.row === gridRow && u.col === gridCol && u.side !== caster.side && u.life > 0)) { showToast(`目标格有敌方单位`); return; }
            if (!canAddUnit(gridRow, gridCol, caster.side)) { showToast(`目标格己方已满`); return; }
            const oldRow = caster.row, oldCol = caster.col;
            caster.row = gridRow;
            caster.col = gridCol;
            caster.riluoPlaced = true;
            caster.riluoRow = oldRow;
            caster.riluoCol = oldCol;
            caster.riluoReleaseCount = Math.max(0, (caster.riluoReleaseCount || 0) - 1);
            addLog(`💨 ${caster.cardName} 位移至 ${ROW_NAMES[gridRow]}${COLS[gridCol]}，绫罗留在原地`);
            showToast(`💨 位移留绫罗！`);
            applyShaLinCellBinding(caster);
            return;
        }
        if (effect.type === "setFlag") {
            caster[effect.flag] = effect.value;
            return;
        }
        if (effect.type === "setNerdJam") {
            const enemySide = caster.side === SIDE_PLAYER0 ? SIDE_PLAYER1 : SIDE_PLAYER0;
            gameState.nerdJamPending[enemySide] = true;
            addLog(`👓 ${caster.cardName} 启动行动干扰！`);
            return;
        }
        if (effect.type === "startCharge") {
            if (effect.chargeType === "halberdier") {
                caster.halberdierCharging = true;
                addLog(`${caster.cardName} 开始蓄力横扫，下回合对前一横行所有敌人造成3真伤！`);
                showToast(`⚔️ 戟兵蓄力中...`);
            }
            return;
        }
        if (effect.type === "motorcyclistCharge") {
            caster.motCharging = true;
            caster.motChargeTurns = 1;
            caster.movesLeftThisTurn = 0;
            caster.attacksLeftThisTurn = 0;
            caster.moved = true;
            addLog(`🏍️ ${caster.cardName} 开始蓄力（1/3回合）！蓄力期间不能移动。`);
            showToast(`🏍️ ${caster.cardName} 蓄力中...`);
            return;
        }
        if (effect.type === "modifyAttacks") {
            const t = effect.target === "self" ? caster : target;
            if (t) t.attacksLeftThisTurn = Math.max(0, (t.attacksLeftThisTurn || 0) + effect.value);
            return;
        }
        if (effect.type === "modifyMoves") {
            const t = effect.target === "self" ? caster : target;
            if (t) {
                const oldMoves = t.movesLeftThisTurn;
                t.movesLeftThisTurn = Math.max(0, oldMoves + effect.value);
                if (oldMoves > 1 && t.movesLeftThisTurn > 0) {
                    addLog(`${t.cardName} 剩余移动次数降至 ${parseFloat(t.movesLeftThisTurn.toFixed(2))}`);
                }
            }
            return;
        }
        if (effect.type === "spearmanThrust") {
            await performSpearmanThrustEffect(caster);
            return;
        }
        if (effect.type === "transform") {
            const targetCard = await showSlaveTransformSelect();
            if (!targetCard) { showToast(`取消变形`); throw SKILL_CANCELLED; }
            let removed = 0;
            for (let i = gameState.players[caster.side].hand.length-1; i >=0 && removed<2; i--) {
                if (gameState.players[caster.side].hand[i].name === "奴隶") {
                    gameState.players[caster.side].hand.splice(i,1);
                    removed++;
                }
            }
            caster.cardName = targetCard.name;
            caster.life = targetCard.life;
            caster.maxLife = targetCard.life;
            caster.dmgType = targetCard.dmgType;
            caster.dmgValue = targetCard.dmgValue;
            caster.range = targetCard.range;
            caster.speed = targetCard.speed;
            caster.extraAttacks = targetCard.extraAttacks || 0;
            caster.firstAttackBonus = (targetCard.name === "士兵");
            caster.bonusUsed = false;
            caster.skill = targetCard.skill;
            caster.skill2 = targetCard.skill2;
            caster.skillDesc = targetCard.skillDesc;
            caster.skill2Desc = targetCard.skill2Desc;
            caster.skillTargetType = targetCard.skillTargetType;
            caster.skill2TargetType = targetCard.skill2TargetType;
            caster.passive = targetCard.passive;
            caster.desc = targetCard.desc;
            caster.skillCooldown = 0;
            addLog(`奴隶消耗自身+两张手牌变形为 ${targetCard.name}！`);
            showToast(`🔄 奴隶变形为 ${targetCard.name}`);
            return;
        }
        if (effect.type === "disableHandCard") {
            const enemySide = caster.side === SIDE_PLAYER0 ? SIDE_PLAYER1 : SIDE_PLAYER0;
            const enemyHand = gameState.players[enemySide].hand;
            const options = enemyHand.map((c, idx) => `${idx+1}. ${c.name}`);
            const selectedIdx = await showSelect(options, `选择要禁用的对手手牌`);
            if (selectedIdx === -1) { showToast(`取消禁用`); throw SKILL_CANCELLED; }
            const targetCard = enemyHand[selectedIdx];
            targetCard.disabled = true;
            targetCard.disabledBy = caster.id;
            targetCard.disabledTurns = 2;
            addLog(`禁卫禁用了对手的手牌 ${targetCard.name}，该牌不能放置（持续1大回合），但可以弃牌。`);
            showToast(`🔒 禁用 ${targetCard.name}`);
            return;
        }
        if (effect.type === "zhanYue") {
            const choice = gameState.declarativeZhanYueChoice || 0;
            const marked = gameState.zhanYueMarkedEnemyIds || [];
            const hasMarked = marked.length > 0;
            if (!hasMarked || choice === 0) {
                // 标记
                const forward = getForwardDelta(caster.side);
                const frontRows = [caster.row + forward, caster.row + 2 * forward].filter(r => r >= 0 && r <= 4);
                let newMarked = 0;
                for (let r of frontRows) {
                    for (let c = 0; c <= 2; c++) {
                        const enemies = gameState.units.filter(u => u.row === r && u.col === c && u.side !== caster.side && u.life > 0);
                        for (let e of enemies) {
                            if (!gameState.zhanYueMarkedEnemyIds.includes(e.id)) {
                                gameState.zhanYueMarkedEnemyIds.push(e.id);
                                newMarked++;
                            }
                        }
                    }
                }
                addLog(`🔪 斩月标记了 ${newMarked} 个新敌人（共${gameState.zhanYueMarkedEnemyIds.length}个标记）`);
                showToast(`🔪 标记 ${newMarked} 个敌人`);
            } else {
                // 斩杀
                const executable = gameState.units.filter(u => marked.includes(u.id) && u.life > 0 && u.life <= 2);
                let killed = 0;
                for (let e of executable) {
                    if (e.absoluteImmunityTurns > 0) { addLog(`🔪 ${e.cardName} 处于绝对免疫，跳过斩杀`); continue; }
                    // 无敌：免疫死亡，无敌结束后因斩杀死亡
                    if (e.invincibleTurns > 0) {
                        addLog(`🔪 ${e.cardName} 处于无敌状态，免疫斩杀！无敌结束后将死亡。`);
                        showToast(`🍺 ${e.cardName} 无敌免疫斩杀`);
                        e.life = 1;
                        e.pendingDeath = true;
                        continue;
                    }
                    if (tryRiluoLethalEscape(e)) continue;
                    // 枷锁猎手：自带护盾未被击破时受到秒杀，先破盾触发绝对免疫
                    if (e.cardName === "枷锁猎手" && (e.nativeShieldValue || 0) > 0) {
                        addLog(`🔪 ${e.cardName} 自带护盾被斩月击碎！触发绝对免疫！`);
                        e.nativeShieldValue = 0;
                        recalcShieldValue(e);
                        triggerChainedHunterImmunity(e);
                        showToast(`🔓 ${e.cardName} 护盾破碎，绝对免疫！`);
                        continue;
                    }
                    // 麻木者被动：每次受伤（含秒杀）只减少1点生命
                    if (e.cardName === "麻木者") {
                        e.life = Math.max(0, e.life - 1);
                        addLog(`🔪 ${e.cardName} 被斩月斩杀，但被动使其只减少1点生命！`);
                        showToast(`💙 ${e.cardName} 只掉1血`);
                        if (e.life <= 0) {
                            lastDamageDealer = { name: caster.cardName, side: caster.side };
                            removeUnit(e.id, e.row, e.col, e.side);
                            killed++;
                            const nIdx = gameState.zhanYueMarkedEnemyIds.indexOf(e.id);
                            if (nIdx >= 0) gameState.zhanYueMarkedEnemyIds.splice(nIdx, 1);
                        }
                        continue;
                    }
                    addLog(`🔪 斩月斩杀 ${e.cardName}！`);
                    lastDamageDealer = { name: caster.cardName, side: caster.side };
                    e.life = 0;
                    removeUnit(e.id, e.row, e.col, e.side);
                    killed++;
                    const idx = gameState.zhanYueMarkedEnemyIds.indexOf(e.id);
                    if (idx >= 0) gameState.zhanYueMarkedEnemyIds.splice(idx, 1);
                }
                addLog(`🔪 斩月共斩杀 ${killed} 个敌人`);
                showToast(`🔪 斩杀 ${killed} 个敌人`);
            }
            return;
        }

        // ── 确定效果的执行目标 ──
        let targets = [];
        if (effect.target === "self") {
            targets = [caster];
        } else if (effect.target === "columnEnemies") {
            targets = gameState.units.filter(u => u.side !== caster.side && u.col === caster.col && u.life > 0 && u.absoluteImmunityTurns <= 0);
        } else if (effect.target === "allEnemies") {
            targets = gameState.units.filter(u => u.side !== caster.side && u.life > 0);
        } else if (effect.target === "frontRowEnemies") {
            const forward = getForwardDelta(caster.side);
            const frontRow = caster.row + forward;
            targets = gameState.units.filter(u => u.side !== caster.side && u.row === frontRow && u.life > 0);
        } else if (effect.target === "sameCellFriendlies") {
            targets = getUnitsAt(caster.row, caster.col).filter(u => u.side === caster.side);
        } else if (target) {
            targets = [target];
        } else {
            targets = [caster];
        }

        // ── 逐个目标执行效果 ──
        for (const t of targets) {
            switch (effect.type) {
                case "damage": {
                    // 酒鬼被动「免疫饮酒debuff」：调酒师的送酒不造成伤害（buff 仍生效）
                    if (t.cardName === "酒鬼" && (effect.sourceName === "调酒师" || caster.cardName === "调酒师")) {
                        addLog(`🍺 ${t.cardName} 免疫饮酒伤害（送酒只加buff不扣血）`);
                        break;
                    }
                    const source = { dmgType: effect.dmgType || caster.dmgType, cardName: effect.sourceName || caster.cardName, side: caster.side, id: caster.id, fromSkill: true };
                    await applyDamageWithSource(t, effect.value, source, effect.unblockable || false, effect.dmgType);
                    break;
                }
                case "heal": {
                    if (t.noHeal || t.cardName === "麻木者") {
                        addLog(`🩸 ${t.cardName} 无法被治疗${t.cardName === "麻木者" ? "（麻木者被动）" : "（禁疗状态）"}`);
                        break;
                    }
                    if (t.isAssimilator) {
                        // 同化者：治疗加到共享生命池
                        gameState.assimilatorHp[t.side] = Math.min(gameState.assimilatorHp[t.side] + effect.value, gameState.assimilatorMaxHp[t.side]);
                        syncAssimilators(t.side);
                        addLog(`🧬 同化者共享生命恢复${effect.value}点（当前${gameState.assimilatorHp[t.side]}）`);
                    } else {
                        const maxLife = t.maxLife || (CARD_LIBRARY.find(c => c.name === t.cardName)?.life || t.life + effect.value);
                        t.life = Math.min(t.life + effect.value, maxLife);
                        if (effect.clearPendingDeath) t.pendingDeath = false;
                        addLog(`${t.cardName} 恢复${effect.value}点生命`);
                    }
                    break;
                }
                case "kill": {
                    if (t.absoluteImmunityTurns > 0) { addLog(`${t.cardName} 绝对免疫，免于秒杀！`); break; }
                    // 无敌：免疫死亡，无敌结束后因秒杀死亡
                    if (t.invincibleTurns > 0) {
                        addLog(`${t.cardName} 处于无敌状态，免疫秒杀！无敌结束后将死亡。`);
                        showToast(`🍺 ${t.cardName} 无敌免疫秒杀`);
                        t.life = 1;
                        t.pendingDeath = true;
                        break;
                    }
                    if (tryRiluoLethalEscape(t)) break;
                    // 枷锁猎手：自带护盾未被击破时受到秒杀，先破盾触发绝对免疫
                    if (t.cardName === "枷锁猎手" && (t.nativeShieldValue || 0) > 0) {
                        addLog(`${t.cardName} 自带护盾被秒杀击碎！触发绝对免疫！`);
                        t.nativeShieldValue = 0;
                        recalcShieldValue(t);
                        triggerChainedHunterImmunity(t);
                        showToast(`🔓 ${t.cardName} 护盾破碎，绝对免疫！`);
                        break;
                    }
                    // 麻木者被动：每次受伤（含秒杀）只减少1点生命
                    if (t.cardName === "麻木者") {
                        t.life = Math.max(0, t.life - 1);
                        addLog(`${t.cardName} 被秒杀，但被动使其只减少1点生命！`);
                        showToast(`💙 ${t.cardName} 只掉1血`);
                        if (t.life <= 0) { lastDamageDealer = { name: caster.cardName, side: caster.side }; removeUnit(t.id, t.row, t.col, t.side); }
                        break;
                    }
                    lastDamageDealer = { name: caster.cardName, side: caster.side };
                    t.life = 0;
                    removeUnit(t.id, t.row, t.col, t.side);
                    break;
                }
                case "assimilate": {
                    if (t.isAssimilator) { showToast(`该单位已是同化者`); break; }
                    const oldName = t.cardName;
                    t.cardName = "同化者";
                    t.isAssimilator = true;
                    t.dmgType = "🔮";
                    t.dmgValue = 1;
                    t.range = 1;
                    t.speed = 1;
                    t.skill = null;
                    t.skill2 = null;
                    t.passive = "共享生命";
                    t.desc = "所有同阵营同化者共享生命，生命归零时全部死亡";
                    t.equipmentId = null;
                    // 清空残留的护盾/减伤/负面状态，同化者只保留共享生命
                    t.shieldValue = 0;
                    t.nativeShieldValue = 0;
                    t.externalShieldSources = {};
                    t.magicShieldValue = 0;
                    t.braceShield = 0;
                    t.braceActive = false;
                    t.pureSkyDamageReduction = false;
                    t.absoluteImmunityTurns = 0;
                    t.invincibleTurns = 0;
                    t.stun = 0;
                    t.silenced = 0;
                    t.eagleEyeTurns = 0;
                    t.weakenedTurns = 0;
                    t.shaLinBindTurn = 0;
                    t.shaLinBindRow = -1;
                    t.shaLinBindCol = -1;
                    t.flagBearerProtectTurn = 0;
                    t.witchProtectReduce = 0;
                    t.noHeal = false;
                    t.gqDamaged = false;
                    // 机车党：清除蓄力状态
                    t.motCharging = false;
                    t.motChargeTurns = 0;
                    t.motReleaseTurn = false;
                    // 清空残留的绑定关系（共生死/替死），避免被同化后仍保留旧绑定
                    if (t.cupidPair) {
                        const partner = gameState.units.find(x => x.id === t.cupidPair.partnerId);
                        if (partner && partner.cupidPair && partner.cupidPair.partnerId === t.id) partner.cupidPair = null;
                        t.cupidPair = null;
                    }
                    for (let u of gameState.units) {
                        if (u.scapegoatProtectorId === t.id) u.scapegoatProtectorId = null;
                    }
                    t.scapegoatProtectorId = null;
                    gameState.assimilatorHp[t.side] += 3;
                    gameState.assimilatorMaxHp[t.side] += 3;
                    syncAssimilators(t.side);
                    addLog(`🧬 ${caster.cardName} 将 ${oldName} 同化为同化者（共享生命 ${gameState.assimilatorHp[t.side]}）`);
                    showToast(`🧬 同化！`);
                    break;
                }
                case "stun": {
                    if (isControlImmune(t, effect)) break;
                    t.stun = effect.turns;
                    t.stunnedBy = caster.id;
                    addLog(`${t.cardName} 被眩晕${effect.turns}回合`);
                    break;
                }
                case "buff": {
                    if (effect.addMode) {
                        t[effect.buff] = (t[effect.buff] || 0) + effect.value;
                    } else {
                        t[effect.buff] = effect.value;
                    }
                    break;
                }
                case "debuff": {
                    if (isControlImmune(t, effect)) break;
                    t[effect.debuff] = effect.turns;
                    addLog(`${t.cardName} 被施加${effect.debuff}`);
                    break;
                }
                case "reduceCooldown": {
                    t.skillCooldown = Math.max(0, (t.skillCooldown || 0) - effect.value);
                    break;
                }
                case "pushBack": {
                    if (isDisplacementImmune(t)) break;
                    const moveDir = caster.side === SIDE_PLAYER0 ? -1 : 1;
                    const newRow = t.row + moveDir * effect.value;
                    if (newRow < 0 || newRow > 4) {
                        t.row = t.side === SIDE_PLAYER0 ? 4 : 0;
                        addLog(`${t.cardName} 被击退到城池！`);
                    } else {
                        t.row = newRow;
                    }
                    applyShaLinCellBinding(t);
                    break;
                }
                case "pullForward": {
                    if (isDisplacementImmune(t)) break;
                    const moveDir = caster.side === SIDE_PLAYER0 ? 1 : -1;
                    const newRow = t.row + moveDir * effect.value;
                    if (newRow < 0 || newRow > 4) { showToast(`不能拉出棋盘边界`); break; }
                    const isForbiddenCastle = (caster.side === SIDE_PLAYER0 && newRow === 4) || (caster.side === SIDE_PLAYER1 && newRow === 0);
                    if (isForbiddenCastle) { showToast(`不能将敌人拉入己方城池`); break; }
                    const hasAlly = gameState.units.some(u => u.row === newRow && u.col === t.col && u.side === caster.side);
                    if (hasAlly) { showToast(`目标格子有己方单位，无法拉拽`); break; }
                    const oldRow = t.row;
                    t.row = newRow;
                    addLog(`${caster.cardName} 将 ${t.cardName} 从 ${ROW_NAMES[oldRow]} 拉到 ${ROW_NAMES[newRow]}！`);
                    showToast(`🧜‍♀️ ${caster.cardName} 拉拽 ${t.cardName}`);
                    applyShaLinCellBinding(t);
                    break;
                }
                case "pullToCaster": {
                    if (isDisplacementImmune(t)) break;
                    const forward = getForwardDelta(caster.side);
                    t.row = caster.row + forward;
                    t.col = caster.col;
                    t.moved = true;
                    addLog(`  ${t.cardName} 被吸引至 (${ROW_NAMES[caster.row + forward]},${COLS[caster.col]})`);
                    applyShaLinCellBinding(t);
                    break;
                }
                case "moveToGrid": {
                    if (isDisplacementImmune(t)) break;
                    const gridRow = gameState.declarativeGridRow;
                    const gridCol = gameState.declarativeGridCol;
                    const hasEnemy = gameState.units.some(u => u.row === gridRow && u.col === gridCol && u.side !== caster.side);
                    if (hasEnemy) { showToast(`目标格有敌方单位，无法拉动`); break; }
                    if (!canAddUnit(gridRow, gridCol, t.side)) { showToast(`目标格己方已满，无法拉动`); break; }
                    const oldRow = t.row, oldCol = t.col;
                    t.row = gridRow;
                    t.col = gridCol;
                    addLog(`🤠 ${caster.cardName} 将 ${t.cardName} 从 (${ROW_NAMES[oldRow]},${COLS[oldCol]}) 拉至 (${ROW_NAMES[gridRow]},${COLS[gridCol]})`);
                    showToast(`🤠 拉动 ${t.cardName}`);
                    t.displacedByAllySkillThisTurn = true;
                    applyShaLinCellBinding(t);
                    break;
                }
                case "swapPositions": {
                    const first = ctx && ctx.firstTarget;
                    if (!first || !t) break;
                    if (isDisplacementImmune(first)) { showToast(`${first.cardName} 无法位移！`); break; }
                    if (isDisplacementImmune(t)) { showToast(`${t.cardName} 无法位移！`); break; }
                    const fr = first.row, fc = first.col, tr = t.row, tc = t.col;
                    first.row = tr; first.col = tc;
                    t.row = fr; t.col = fc;
                    addLog(`🎤 ${caster.cardName} 将 ${first.cardName} 与 ${t.cardName} 的位置互换`);
                    showToast(`🎤 交换位置`);
                    first.displacedByAllySkillThisTurn = true;
                    t.displacedByAllySkillThisTurn = true;
                    applyShaLinCellBinding(first);
                    applyShaLinCellBinding(t);
                    break;
                }
                case "teleportToGrid": {
                    const gridRow = gameState.declarativeGridRow;
                    const gridCol = gameState.declarativeGridCol;
                    const hasEnemy = gameState.units.some(u => u.row === gridRow && u.col === gridCol && u.side !== caster.side);
                    if (hasEnemy) { showToast(`目标格有敌方单位，无法瞬移`); break; }
                    caster.row = gridRow;
                    caster.col = gridCol;
                    addLog(`72瞬移至 (${ROW_NAMES[gridRow]},${COLS[gridCol]})`);
                    applyShaLinCellBinding(caster);
                    break;
                }
                case "teleportToTarget": {
                    if (caster.shaLinBindTurn > 0) { showToast(`🪞 ${caster.cardName} 被纱琳定身，无法位移！`); break; }
                    if (!canAddUnit(t.row, t.col, caster.side)) { showToast(`目标格已有2个我方单位，无法位移`); break; }
                    const oldRow = caster.row, oldCol = caster.col;
                    caster.row = t.row;
                    caster.col = t.col;
                    addLog(`📡 通讯员从 (${ROW_NAMES[oldRow]},${COLS[oldCol]}) 位移至 (${ROW_NAMES[t.row]},${COLS[t.col]})`);
                    showToast(`📡 通讯员位移至友方`);
                    caster.moved = true;
                    caster.movesLeftThisTurn = 0;
                    applyShaLinCellBinding(caster);
                    break;
                }
                case "addShield": {
                    if (!t.externalShieldSources) t.externalShieldSources = {};
                    const sourceId = String(caster.id);
                    const cur = t.externalShieldSources[sourceId] || 0;
                    // 每个来源（每个护援兵）独立上限 = effect.value（护援兵为 2），不同护援兵可各自叠加
                    t.externalShieldSources[sourceId] = Math.min(cur + effect.value, effect.value);
                    recalcShieldValue(t);
                    addLog(`${t.cardName} 获得来自 ${caster.cardName} 的外来护盾（当前总护盾${t.shieldValue}）`);
                    break;
                }
                case "setScapegoat": {
                    t.scapegoatProtectorId = caster.id;
                    addLog(`🐑 ${t.cardName} 被替罪羊绑定替死`);
                    break;
                }
                case "setCupidPair": {
                    const first = ctx && ctx.firstTarget;
                    if (!first || !t) break;
                    if (first.id === t.id) { showToast(`两个单位必须不同`); break; }
                    if (first.cupidPair) { showToast(`${first.cardName} 已被爱神绑定`); break; }
                    if (t.cupidPair) { showToast(`${t.cardName} 已被爱神绑定`); break; }
                    first.cupidPair = { partnerId: t.id, partnerSide: t.side };
                    t.cupidPair = { partnerId: first.id, partnerSide: first.side };
                    addLog(`💘 ${first.cardName} 和 ${t.cardName} 被爱神绑定共生死！`);
                    showToast(`💘 共生死绑定！`);
                    break;
                }
                case "setShaLinBind": {
                    const gridRow = gameState.declarativeGridRow;
                    const gridCol = gameState.declarativeGridCol;
                    const cellTargets = gameState.units.filter(u => u.row === gridRow && u.col === gridCol && u.side !== caster.side);
                    let bound = 0;
                    for (let ct of cellTargets) {
                        if (isControlImmune(ct, { type: "stun" })) continue;
                        ct.shaLinBindTurn = 3;
                        ct.shaLinBindRow = gridRow;
                        ct.shaLinBindCol = gridCol;
                        bound++;
                        ct.displacedByAllySkillThisTurn = false;
                    }
                    const existing = gameState.shaLinBoundCells.find(c => c.row === gridRow && c.col === gridCol);
                    if (!existing) {
                        gameState.shaLinBoundCells.push({ row: gridRow, col: gridCol, turnsLeft: 4, side: caster.side });
                    } else {
                        existing.turnsLeft = 4;
                        existing.side = caster.side;
                    }
                    if (bound === 0) { addLog(`🪞 纱琳对该格下咒，走入的敌人会被定身`); showToast(`🪞 该格被下咒！`); }
                    else { addLog(`🪞 纱琳将 ${bound} 个敌人定身！下个敌方+我方回合内不能位移，受到物伤法伤+1`); showToast(`🪞 定身！`); }
                    break;
                }
                case "knightKill": {
                    if (t.absoluteImmunityTurns > 0) {
                        addLog(`${t.cardName} 处于绝对免疫，免疫秒杀！`);
                        showToast(`🔒 绝对免疫，秒杀无效`);
                        break;
                    }
                    // 无敌：免疫死亡，无敌结束后因秒杀死亡
                    if (t.invincibleTurns > 0) {
                        addLog(`${t.cardName} 处于无敌状态，免疫秒杀！无敌结束后将死亡。`);
                        showToast(`🍺 ${t.cardName} 无敌免疫秒杀`);
                        t.life = 1;
                        t.pendingDeath = true;
                        break;
                    }
                    // 绫罗：致命伤免疫并自动回绫罗
                    if (tryRiluoLethalEscape(t)) break;
                    // 枷锁猎手：自带护盾未被击破时受到秒杀，先破盾触发绝对免疫
                    if (t.cardName === "枷锁猎手" && (t.nativeShieldValue || 0) > 0) {
                        addLog(`${t.cardName} 自带护盾被秒杀击碎！触发绝对免疫！`);
                        t.nativeShieldValue = 0;
                        recalcShieldValue(t);
                        triggerChainedHunterImmunity(t);
                        showToast(`🔓 ${t.cardName} 护盾破碎，绝对免疫！`);
                        break;
                    }
                    showToast(`⚔️ 骑士秒杀！`);
                    // 麻木者被动：秒杀只掉1血
                    if (t.cardName === "麻木者") {
                        t.life = Math.max(0, t.life - 1);
                        addLog(`${t.cardName} 被秒杀，但被动使其只减少1点生命！`);
                        showToast(`💙 ${t.cardName} 只掉1血`);
                        if (t.life <= 0) { lastDamageDealer = { name: caster.cardName, side: caster.side }; removeUnit(t.id, t.row, t.col, t.side); }
                    } else {
                        addLog(`${caster.cardName} 使用技能秒杀 ${t.cardName}！`);
                        lastDamageDealer = { name: caster.cardName, side: caster.side };
                        t.life = 0;
                        removeUnit(t.id, t.row, t.col, t.side);
                    }
                    break;
                }
                case "sacrifice": {
                    // 对多选目标的献祭效果：每个目标受到1真伤，施法者获得加成
                    let damageDealt = 0;
                    const selectedIds = gameState.declarativeSelected || [];
                    for (let id of selectedIds) {
                        const target = gameState.units.find(u => u.id === id);
                        if (target && target.side === caster.side) {
                            await applyUnblockableDamage(target, 1);
                            damageDealt++;
                        }
                    }
                    caster[effect.buff] = (caster[effect.buff] || 0) + damageDealt;
                    addLog(`${caster.cardName} 献祭了 ${damageDealt} 个友方单位，${effect.buff} +${damageDealt}！`);
                    showToast(`💪 超雄祭献 ${damageDealt} 友方，下次攻击+${damageDealt}`);
                    break;
                }
                case "witchProtect": {
                    const reduce = gameState.declarativeWitchReduce || 1;
                    const selectedIds = gameState.declarativeSelected || [];
                    let count = 0;
                    for (let id of selectedIds) {
                        const target = gameState.units.find(u => u.id === id);
                        if (target && target.side === caster.side) {
                            target.witchProtectReduce = reduce;
                            target.witchProtectorId = caster.id;
                            count++;
                        }
                    }
                    addLog(`🔮 魔女庇护了 ${count} 个友方，本回合受法伤-${reduce}`);
                    showToast(`🔮 庇护${count}人！`);
                    break;
                }
            }
        }
    }

    // 按顺序执行所有效果（单目标）
    async function resolveSkillEffects(caster, def, target, ctx) {
        let actualTarget = target;
        if (target && def.targetType === "enemy") {
            actualTarget = enforceSkillTarget(caster, target);
        }
        for (const effect of def.effects) {
            await applyEffect(caster, effect, actualTarget, ctx);
        }
    }

    // 按顺序执行所有效果（多目标）
    async function resolveSkillEffectsMulti(caster, def) {
        const selectedIds = gameState.declarativeSelected || [];
        for (const effect of def.effects) {
            // target: "self" 的效果只对施法者执行一次
            if (effect.target === "self") {
                await applyEffect(caster, effect, caster, null);
            } else if (effect.type === "sacrifice" || effect.type === "witchProtect") {
                // 对于多目标效果（sacrifice, witchProtect），只执行一次
                await applyEffect(caster, effect, null, null);
            } else {
                // 对每个选中目标执行效果
                for (const id of selectedIds) {
                    const target = gameState.units.find(u => u.id === id);
                    if (target) {
                        await applyEffect(caster, effect, target, null);
                    }
                }
            }
        }
    }

    // 按顺序执行所有效果（格子）
    async function resolveSkillEffectsGrid(caster, def) {
        for (const effect of def.effects) {
            await applyEffect(caster, effect, null, null);
        }
    }

    // 声明式技能收尾：设置冷却/一次性标志，清理状态
    function finishDeclarativeSkill(caster, def) {
        if (def.cooldown > 0) caster[def.cooldownField || 'skillCooldown'] = def.cooldown;
        if (def.oneTime) caster[def.oneTime] = true;
        if (def.useCountField) caster[def.useCountField] = (caster[def.useCountField] || 0) + 1;
        if (def.chargeField) caster[def.chargeField] = Math.max(0, (caster[def.chargeField] || 0) - 1);
        if (!def.isAttackSubstitute) caster.skillUsedThisTurn = true;
        clearSkillTarget();
        recheckAllWeaponSmithBuffs();
        // 影舞姬被动滑步：使用主动技能后进入滑步选择
        if (caster.cardName === "影舞姬" && caster.life > 0) {
            gameState.awaitingGlide = true;
            gameState.glideUnitId = caster.id;
            showToast(`💃 可自由滑步1格`);
        }
        renderUI();
    }

    // 确认多选技能
    function confirmDeclarativeMulti() {
        const caster = gameState.units.find(u => u.id === gameState.skillCasterId);
        if (!caster) { clearSkillTarget(); renderUI(); return; }
        const def = SKILL_DEFS[gameState.declarativeSkillName];
        if (!def) { clearSkillTarget(); renderUI(); return; }
        // 检查是否需要至少选一个
        const selectedIds = gameState.declarativeSelected || [];
        if (selectedIds.length === 0 && def.effects.some(e => e.type === "sacrifice" || e.type === "witchProtect")) {
            showToast(`请至少选择一个目标`);
            return;
        }
        if (selectedIds.length === 0 && def.effects.some(e => e.type === "setScapegoat")) {
            showToast(`请至少选择一个友方`);
            return;
        }
        (async () => {
            try {
                await resolveSkillEffectsMulti(caster, def);
                if (!gameState.units.includes(caster)) return; // 游戏已重置
                finishDeclarativeSkill(caster, def);
            } catch(e) {
                console.error('declarative multi skill error:', e);
                clearSkillTarget();
                renderUI();
            }
        })();
    }

    // 启动声明式技能
    function startDeclarativeSkill(unit, skillName) {
        const def = SKILL_DEFS[skillName];
        if (!def || !def.effects) return false;

        if (!def.isAttackSubstitute) unit.skillUsedThisTurn = true;

        // 如有 preSelect（弹窗选择），先执行
        if (def.preSelect) {
            (async () => {
                try {
                    const result = await def.preSelect(unit);
                    if (!result) {
                        unit.skillUsedThisTurn = false;
                        renderUI();
                        return;
                    }
                    if (result === 'consumed') {
                        // 空放：preSelect 内已消耗攻击次数/冷却/滑步，标记已使用，直接返回
                        renderUI();
                        return;
                    }
                    _startDeclarativePhase2(unit, skillName);
                } catch(e) {
                    console.error('preSelect error:', e);
                    unit.skillUsedThisTurn = false;
                    renderUI();
                }
            })();
            return true;
        }

        return _startDeclarativePhase2(unit, skillName);
    }

    // 声明式技能第二阶段：根据 selectMode 决定执行方式
    function _startDeclarativePhase2(unit, skillName) {
        const def = SKILL_DEFS[skillName];
        const mode = def.selectMode || "single";

        // 无需选择目标，立即执行（但 multi 模式即使是 self 也要进入选择流程）
        if ((def.targetType === "self" || def.targetType === "none") && def.selectMode !== "multi") {
            if (def.confirmButton) {
                // 需要确认按钮的自身技能
                gameState.awaitingSkillTarget = true;
                gameState.skillCasterId = unit.id;
                gameState.skillType = "declarative";
                gameState.declarativeSkillName = skillName;
                gameState.declarativeSelectMode = "confirm";
                renderUI();
                return true;
            }
            // 立即执行
            (async () => {
                try {
                    await resolveSkillEffects(unit, def, null, null);
                    if (!gameState.units.includes(unit)) return; // 游戏已重置
                    finishDeclarativeSkill(unit, def);
                } catch (e) {
                    if (e === SKILL_CANCELLED) {
                        unit.skillUsedThisTurn = false;
                        renderUI();
                    } else {
                        console.error('declarative self skill error:', e);
                        clearSkillTarget();
                        renderUI();
                    }
                }
            })();
            return true;
        }

        // 格子选择模式
        if (mode === "grid" || def.targetType === "grid") {
            gameState.awaitingSkillTarget = true;
            gameState.skillCasterId = unit.id;
            gameState.skillType = "declarative";
            gameState.declarativeSkillName = skillName;
            gameState.declarativeSelectMode = "grid";
            gameState.declarativeGridFilter = def.gridFilter || "any";
            addLog(`请点击棋盘上一个格子`);
            renderUI();
            return true;
        }

        // 多选模式
        if (mode === "multi") {
            gameState.awaitingSkillTarget = true;
            gameState.skillCasterId = unit.id;
            gameState.skillType = "declarative";
            gameState.declarativeSkillName = skillName;
            gameState.declarativeSelectMode = "multi";
            gameState.declarativeSelected = [];
            if (def.maxSelect) gameState.declarativeMaxSelect = def.maxSelect;
            gameState.declarativeRange = def.range || 0;
            gameState.declarativeToggle = def.toggle || false;
            gameState.declarativeConfirmButton = def.confirmButton || false;
            const targetText = def.targetType === "enemy" ? "敌方" : "友方";
            if (def.confirmButton) {
                addLog(`请选择${targetText}单位（可多选），完成后点击确认按钮`);
            } else {
                addLog(`请依次点击${def.maxSelect}个${targetText}单位`);
            }
            renderUI();
            return true;
        }

        // 两步选择模式
        if (mode === "twoStep") {
            gameState.awaitingSkillTarget = true;
            gameState.skillCasterId = unit.id;
            gameState.skillType = "declarative";
            gameState.declarativeSkillName = skillName;
            gameState.declarativeSelectMode = "twoStep";
            gameState.declarativeStep = 1;
            gameState.declarativeFirstTarget = null;
            const step1Type = def.step1?.type || "friendly";
            const step1Text = step1Type === "enemy" ? "敌方" : step1Type === "any" ? "" : "友方";
            addLog(`请点击第一个${step1Text}单位`);
            renderUI();
            return true;
        }

        // 单选模式（默认）
        gameState.awaitingSkillTarget = true;
        gameState.skillCasterId = unit.id;
        gameState.skillType = "declarative";
        gameState.declarativeSkillName = skillName;
        gameState.declarativeSelectMode = "single";
        const targetTypeText = def.targetType === "enemy" ? "敌方" : def.targetType === "friendly" ? "友方" : def.targetType === "any" ? "" : "友方";
        addLog(`请点击一个${targetTypeText}单位`);
        renderUI();
        return true;
    }

    // ========== 技能释放入口 ==========
    async function useSelectedUnitSkill(unit, skillName = null) {
        // 新手教程：仅当前步骤允许使用技能时才放行
        if (typeof tutorialAllowAction === 'function' && !tutorialAllowAction('skill')) { tutorialBlock('使用技能'); return false; }
        const cardDef = CARD_LIBRARY.find(c => c.name === unit.cardName);
        const sk = skillName || (cardDef && cardDef.skill);
        if (!cardDef || !sk) { showToast("该单位没有主动技能"); return false; }
        if (consumeNerdJamPending(unit, "技能")) return false;
        if (!checkSkillPrerequisites(unit, sk)) return false;

        const def = SKILL_DEFS[sk];
        if (!def || !def.effects) { showToast("未知技能"); return false; }

        try {
            return startDeclarativeSkill(unit, sk);
        } catch (err) {
            console.error(err);
            showToast("技能执行出错，请查看控制台");
            return false;
        }
    }
