// ========== 主动技能辅助函数 ==========
// 所有技能逻辑已迁移至 SKILL_DEFS 声明式配置（见 skill-config.js）
// 本文件仅保留无法声明化的全局辅助函数：
//   consumeNerdJamPending - 四眼仔行动干扰消费
//   purifyAllFriendly     - 净化师被动清除负面效果

    // ========== 四眼仔行动干扰消费 ==========
    // 在单位执行移动/攻击/技能前调用，如果 nerdJamPending 为 true 则消耗并无效化本次行动
    function consumeNerdJamPending(unit, actionName) {
        if (!unit || !gameState.nerdJamPending[unit.side]) return false;
        gameState.nerdJamPending[unit.side] = false;
        addLog(trText(`👓 行动干扰生效！${unit.cardName} 的${actionName}被无效化！`, `👓 Action Jam takes effect! ${unit.cardName} of ${actionName} was negated!`));
        showToast(trText(`👓 行动干扰！${unit.cardName} 的${actionName}被无效化`, `👓 Action Jam! ${unit.cardName} of ${actionName} was negated`));
        if (actionName === "技能") clearSkillTarget();
        gameState.selectedUnitId = null;
        renderUI();
        return true;
    }

    // ========== 净化师被动：清除友方所有控制与负面效果 ==========
    function purifyAllFriendly(side) {
        for(let u of gameState.units) {
            if(u.side === side) {
                let cleared = [];
                if(u.stun > 0) { u.stun = 0; u.stunnedBy = null; cleared.push('眩晕'); }
                if(u.silenced > 0) { u.silenced = 0; cleared.push('沉默'); }
                if(u.weakenedTurns > 0) { u.weakenedTurns = 0; cleared.push('弱化'); }
                if(u.eagleEyeTurns > 0) { u.eagleEyeTurns = 0; cleared.push('致盲'); }
                if(u.shaLinBindTurn > 0) { u.shaLinBindTurn = 0; u.shaLinBindRow = -1; u.shaLinBindCol = -1; cleared.push('定身'); }
                if(u.plagueInfected) { u.plagueInfected = false; cleared.push('鼠疫'); }
                if(cleared.length > 0) addLog(trText(`${u.cardName} 被净化：${cleared.join('、')}`, `${u.cardName} was purified: ${cleared.join('、')}`));
            }
        }
        // 清除手牌禁用
        for(let c of gameState.players[side].hand) {
            if(c.disabled) { c.disabled = false; c.disabledBy = null; c.disabledTurns = 0; addLog(trText(trText(`手牌 ${c.name} 的禁用被净化解除。`, `hand ${c.name} of disabled was purified lifted.`), `hand ${c.name} of disabled was purified lifted.`)); }
        }
    }
