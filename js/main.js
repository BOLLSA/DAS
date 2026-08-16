// ========== 入口 & 启动 ==========

    async function startGame() {
        // 重置 AI 状态
        aiSide = -1; aiDifficulty = 'normal'; aiActing = false;
        while (true) {
            gameMode = await showGameModeSelect();
            if (gameMode === 'tutorial') {
                await startBeginnerTutorial();
                continue;
            }
            if (gameMode === 'online') {
                await startOnlineGame();
                continue;
            }
            break;
        }
        let p0Equipments = null, p1Equipments = null;
        // 所有装备默认进入商店，无需战前选择
        const allEquipments = EQUIPMENT_LIBRARY.map(e => e.id);
        p0Equipments = allEquipments;
        p1Equipments = allEquipments;
        if (gameMode === 'ai') {
            // 人机对战设置
            const aiConfig = await showAISetup();
            if (!aiConfig) { return startGame(); } // 返回则重新选模式
            aiSide = 1 - aiConfig.playerSide; // AI 是玩家的对手
            aiDifficulty = aiConfig.difficulty;

            if (aiConfig.deckMode === 'preset') {
                const preset = PRESET_DECKS[aiConfig.presetIdx];
                const p0Names = [...preset.g1, ...preset.g2, ...preset.g3];
                const p1Names = [...preset.g1, ...preset.g2, ...preset.g3];
                customDecks = { p0: p0Names, p1: p1Names };
                await resetGame(p0Names, p1Names, p0Equipments, p1Equipments);
            } else {
                customDecks = null;
                await resetGame(null, null, p0Equipments, p1Equipments);
            }
        } else if (gameMode === 'custom') {
            // 蓝方选卡
            const p0Names = await showDeckBuilder('🔵 蓝方', 0);
            if (p0Names === 'back') { return startGame(); } // 返回模式选择
            // 提示切换玩家
            await showMessage('请将设备交给 🔴 红方玩家，红方开始选卡');
            // 红方选卡
            const p1Names = await showDeckBuilder('🔴 红方', 1);
            if (p1Names === 'back') { return startGame(); } // 返回模式选择
            customDecks = { p0: p0Names, p1: p1Names };
            await resetGame(p0Names, p1Names, p0Equipments, p1Equipments);
        } else {
            customDecks = null;
            await resetGame(null, null, p0Equipments, p1Equipments);
        }
    }

    // ========== 远程联机流程 ==========
    async function startOnlineGame() {
        const setup = await showOnlineSetup();
        if (!setup) return;
        if (setup.role === 'host') {
            // 主机：按房主选择的卡组模式与阵营初始化游戏，推送开局快照
            aiSide = -1;
            gameMode = 'online';
            const allEquipments = EQUIPMENT_LIBRARY.map(e => e.id);
            if (setup.deckMode === 'preset' && PRESET_DECKS[setup.presetIdx]) {
                const preset = PRESET_DECKS[setup.presetIdx];
                const p0Names = [...preset.g1, ...preset.g2, ...preset.g3];
                customDecks = { p0: p0Names, p1: [...p0Names] };
                await resetGame(p0Names, [...p0Names], allEquipments, allEquipments);
            } else {
                customDecks = null;
                await resetGame(null, null, allEquipments, allEquipments);
            }
            networkState.hostSide = setup.hostSide;
            addLog(`🌐 联机开始！你是${setup.hostSide === 0 ? '蓝方（先手）' : '红方（后手）'}（房主）。`);
            showToast(`🌐 联机开始`);
            // 推送开局快照（含卡池模式信息：客机据此计算卡池视图）
            const logs = (networkState.logBuffer || []).splice(0);
            try { networkState.conn.send({ t: 'init', s: networkSerializeState(), hostSide: setup.hostSide, logs, cd: customDecks, gm: gameMode }); } catch (e) {}
            // 等待联机结束（断线/退出/游戏结束回调）
            await new Promise((resolve) => { networkOnDisconnect = resolve; });
            networkOnDisconnect = null;
        } else {
            // 客机（加入者）：已收到 init 快照，等待联机结束
            aiSide = -1;
            gameMode = 'online';
            customDecks = null;
            const guestSide = networkGuestSide();
            addLog(`🌐 联机开始！你是${guestSide === 0 ? '蓝方（先手）' : '红方（后手）'}（加入者）。`);
            showToast(`🌐 联机开始`);
            await new Promise((resolve) => { networkOnDisconnect = resolve; });
            networkOnDisconnect = null;
        }
    }
    startGame();
