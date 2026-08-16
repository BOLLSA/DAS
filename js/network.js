// File: network.js
// ========== 远程联机网络层（PeerJS P2P · 主机权威） ==========
// 主机（房主）：运行全部游戏逻辑，操作后推送状态快照；客机：渲染状态 + 发送操作指令。
// 协议消息：init(开局快照) / action(客机操作指令) / state(主机快照+日志) / prompt+answer(远程弹窗) / bye(断开)

    let networkState = null;        // { role:'host'|'guest', conn, hostSide, logBuffer, pendingPrompts, roomId, peer }
    let networkPromptSide = null;   // 弹窗决策方覆盖（防御弹窗用），null=按 gameState.turn
    let networkDirty = false;
    let networkPollTimer = null;
    let networkOnDisconnect = null; // 断线回调（main.js 注入，返回模式选择）

    const NETWORK_PREFIX = 'das-101-';
    const PEERJS_CDN = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
    let peerJSPromise = null;       // 按需加载 PeerJS 的 Promise（缓存，避免重复注入）

    // 按需动态加载 PeerJS（仅点击「远程联机」时调用）：避免 CDN 慢/不可达时同步阻塞整个页面启动
    function loadPeerJS(timeoutMs = 15000) {
        if (typeof Peer !== 'undefined') return Promise.resolve(true);
        if (peerJSPromise) return peerJSPromise;
        peerJSPromise = new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = PEERJS_CDN;
            s.async = true;
            let settled = false;
            const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };
            s.onload = () => done(typeof Peer !== 'undefined');
            s.onerror = () => done(false);
            setTimeout(() => done(typeof Peer !== 'undefined'), timeoutMs); // 超时兜底（不阻塞等待）
            document.head.appendChild(s);
        });
        return peerJSPromise;
    }

    function networkActive() { return !!networkState && !!networkState.conn; }
    function networkIsHost() { return !!networkState && networkState.role === 'host'; }
    function networkIsGuest() { return !!networkState && networkState.role === 'guest'; }
    function networkGuestSide() { return networkState ? 1 - networkState.hostSide : -1; }
    function networkMySide() { return networkIsHost() ? networkState.hostSide : networkGuestSide(); }
    // 当前是否轮到远程玩家（客机）操作 → 用于本地操作入口拦截
    function networkIsRemoteTurn() {
        return networkActive() && !!gameState && gameState.turn === networkGuestSide();
    }
    // 入口闸门：返回 'local'（本地执行）| 'forward'（客机转发指令）| 'block'（非自己回合只读）
    function networkGate() {
        if (networkReplaying) return 'local';  // 主机重放客机指令时本地执行（绕过回合拦截）
        if (!networkActive()) return 'local';
        if (gameState.turn !== networkMySide()) return 'block';
        return networkIsGuest() ? 'forward' : 'local';
    }
    // 入口便捷封装：需要网络处理时发送指令并返回 true（调用方直接 return）
    function networkForward(action) {
        const ng = networkGate();
        if (ng === 'block') return true;  // 非自己回合：只读忽略
        if (ng === 'forward') { networkSendAction(action); return true; }
        return false;
    }
    // 弹窗转发条件：仅主机端执行转发，且决策方是远程玩家（客机）
    function networkShouldForwardPrompt(decisionSide) {
        return networkIsHost() && networkActive() && decisionSide === networkGuestSide();
    }

    // ========== 状态快照 ==========
    // 卡对象精简：手牌/牌堆/预牌堆的卡只传动态字段（其余由 CARD_LIBRARY 本地恢复），大幅减小快照体积
    function networkSlimCard(card) {
        return { n: card.name, d: !!card.disabled, db: card.disabledBy || null, dt: card.disabledTurns || 0 };
    }
    function networkRestoreCard(slim) {
        if (!slim || typeof slim !== 'object') return slim;
        const def = CARD_LIBRARY.find(c => c.name === slim.n);
        const card = def ? { ...def } : { name: slim.n || '?', cost: 0, life: 1, dmgType: '⚔️', dmgValue: 0, range: 1, speed: 1, grade: 3, passive: '' };
        card.disabled = !!slim.d;
        card.disabledBy = slim.db || null;
        card.disabledTurns = slim.dt || 0;
        return card;
    }
    function networkSerializeState() {
        return JSON.stringify(
            { g: gameState, ldd: lastDamageDealer, im: infiniteManaEnabled },
            (key, value) => {
                if (key === 'hand' || key === 'deck' || key === 'prepool') {
                    return (value || []).map(networkSlimCard);
                }
                if (key === 'matchEvents') return [];  // 复盘事件仅主机需要，剔除
                if (key === 'isModalOpen') return false;  // 弹窗互斥锁是本地 UI 状态，跨端同步会挡住对方端弹窗（如巫师转移选择）
                return value;
            }
        );
    }
    function networkApplyState(json, logs, effects) {
        try {
            const data = JSON.parse(json, (key, value) => {
                if (key === 'hand' || key === 'deck' || key === 'prepool') {
                    return (value || []).map(networkRestoreCard);
                }
                return value;
            });
            gameState = data.g;
            lastDamageDealer = data.ldd;
            infiniteManaEnabled = !!data.im;
            aiSide = -1;
            aiActing = false;
            renderUI();
            if (logs && logs.length) for (const m of logs) addLog(m);
            if (effects && effects.length) networkReplayEffects(effects);
        } catch (e) { console.error('networkApplyState error:', e); }
    }
    // 主机日志缓冲（addLog 时收集，快照时随行）
    function networkLog(msg) {
        if (networkIsHost() && networkState) {
            networkState.logBuffer = networkState.logBuffer || [];
            networkState.logBuffer.push(msg);
        }
    }
    // 主机即时提示（toast/连杀）：立即发送独立 fx 消息（低延迟、不依赖快照与棋盘状态）
    function networkToast(fn, args) {
        if (networkIsHost() && networkState && networkState.conn && networkState.conn.open) {
            try { networkState.conn.send({ t: 'fx', fn, args }); } catch (e) {}
        }
    }
    // 主机棋盘特效缓冲（浮动伤害/受击闪白/攻击闪白/光束）：随快照同步（依赖最新棋盘渲染）
    function networkEffect(fn, args) {
        if (networkIsHost() && networkState) {
            networkState.effects = networkState.effects || [];
            networkState.effects.push({ fn, args });
        }
    }
    // 客机重放棋盘特效
    function networkReplayEffects(effects) {
        if (!effects || !effects.length) return;
        for (const e of effects) {
            try {
                const a = e.args || [];
                switch (e.fn) {
                    case 'float': showFloatText(a[0], a[1], a[2], a[3]); break;
                    case 'hit': flashCellHit(a[0], a[1]); break;
                    case 'attack': flashCellAttack(a[0], a[1]); break;
                    case 'beam': showAttackBeam(a[0], a[1], a[2], a[3]); break;
                }
            } catch (err) { /* 特效重放失败不影响游戏 */ }
        }
    }
    // 客机重放即时提示（fx 消息）
    function networkReplayFx(fn, args) {
        try {
            const a = args || [];
            if (fn === 'toast') showToast(a[0], a[1]);
            else if (fn === 'streak') showKillStreak(a[0], a[1]);
        } catch (err) { /* 提示重放失败不影响游戏 */ }
    }
    // renderUI 后标记脏，微任务即时推送（0ms 合并同批渲染），200ms 轮询兜底
    let networkPushTimer = null;
    function networkMarkDirty() {
        if (!networkIsHost()) return;
        networkDirty = true;
        if (networkPushTimer) return;
        networkPushTimer = setTimeout(() => { networkPushTimer = null; networkDirty = false; networkPushState(); }, 0);
    }
    function networkPushState() {
        if (!networkIsHost() || !networkState.conn || !networkState.conn.open) return;
        const logs = (networkState.logBuffer || []).splice(0);
        const effects = (networkState.effects || []).splice(0);
        try { networkState.conn.send({ t: 'state', s: networkSerializeState(), logs, effects }); } catch (e) {}
    }

    // ========== 操作指令 ==========
    let networkReplaying = false;  // 主机重放客机指令标志（networkGate 据此放行）
    function networkSendAction(a) {
        if (!networkActive()) return;
        if (networkIsHost()) { networkHandleAction(a); }
        else { try { networkState.conn.send({ t: 'action', a }); } catch (e) {} }
    }
    function networkHandleAction(a) {
        networkReplaying = true;
        try {
            switch (a.type) {
                case 'cellClick': {
                    if (a.cardIdx !== undefined) gameState.selectedCardIdx = a.cardIdx;
                    if (a.unitId !== undefined) gameState.selectedUnitId = a.unitId || null;
                    handleCellClick(a.row, a.col);
                    break;
                }
                case 'unitClick': {
                    if (a.unitId !== undefined) gameState.selectedUnitId = a.unitId || null;
                    const u = gameState.units.find(x => x.id === a.id);
                    if (u) handleUnitClick(u);
                    break;
                }
                case 'skill': { const u = gameState.units.find(x => x.id === a.id); if (u) useSelectedUnitSkill(u); break; }
                case 'endTurn': {
                    if (a.confirmed !== undefined || a.prepick !== undefined) endTurn({ confirmed: a.confirmed, prepick: a.prepick });
                    else endTurn();
                    break;
                }
                case 'shop': openEquipmentShop(); break;
                case 'pop': { popUnit(a.id); gameState.selectedUnitId = null; renderUI(); break; }
                case 'discard': { discardCard(gameState.turn, a.idx); renderUI(); break; }
                case 'wuzhong': { useWuzhong(gameState.turn, a.idx).catch(err => console.error(err)); break; }
                case 'plague': { usePlague(gameState.turn, a.idx); break; }
                case 'riluoReturn': { const u = gameState.units.find(x => x.id === a.id); if (u) performRiluoReturn(u); break; }
                case 'mirrorAttack': {
                    const u = gameState.units.find(x => x.id === a.id);
                    if (u && u.cardName === "镜中人") { gameState.awaitingMirrorAttack = true; gameState.mirrorAttackUnitId = u.id; addLog(`请选择要攻击的格子（自身格或相邻格）`); renderUI(); }
                    break;
                }
                case 'mirrorSwap': { const u = gameState.units.find(x => x.id === a.id); if (u) performMirrorSwap(u); break; }
                case 'equipSkill': { const u = gameState.units.find(x => x.id === a.id); if (u) activatePureSky(u); break; }
                case 'confirmSkill': confirmDeclarativeSkill(); break;
                case 'cancelSkill': {
                    const caster = gameState.units.find(u => u.id === gameState.skillCasterId);
                    if (caster) caster.skillUsedThisTurn = false;
                    clearSkillTarget(); renderUI(); addLog("已取消技能释放。");
                    break;
                }
                case 'skipGlide': { gameState.awaitingGlide = false; gameState.glideUnitId = null; addLog("跳过滑步。"); renderUI(); break; }
                case 'cancelMirrorAttack': { gameState.awaitingMirrorAttack = false; gameState.mirrorAttackUnitId = null; renderUI(); break; }
            }
        } catch (e) { console.error('networkHandleAction error:', e); }
        finally { networkReplaying = false; }
    }

    // ========== 远程弹窗（prompt/answer） ==========
    function networkRequestPrompt(payload) {
        return new Promise((resolve) => {
            if (!networkActive()) { resolve(-1); return; }
            const id = Date.now() + '-' + Math.random();
            networkState.pendingPrompts = networkState.pendingPrompts || {};
            networkState.pendingPrompts[id] = resolve;
            try { networkState.conn.send({ t: 'prompt', id, payload }); } catch (e) { resolve(-1); }
        });
    }
    async function networkOnPrompt(msg) {
        const { id, payload } = msg;
        let value;
        if (!payload) value = -1;
        else if (payload.kind === 'confirm') value = await showConfirmLocal(payload.message, payload.forceShow || false);
        else if (payload.kind === 'select') value = await showSelectLocal(payload.options, payload.title, payload.opts || {});
        else if (payload.kind === 'prepick') value = await showPrepickPanelLocal(payload.prepool);
        else value = -1;
        try { networkState.conn.send({ t: 'answer', id, value }); } catch (e) {}
    }

    // ========== 连接生命周期 ==========
    function networkTeardown() {
        if (networkPollTimer) { clearInterval(networkPollTimer); networkPollTimer = null; }
        try { if (networkState && networkState.conn) networkState.conn.close(); } catch (e) {}
        try { if (networkState && networkState.peer) networkState.peer.destroy(); } catch (e) {}
        networkState = null;
        networkPromptSide = null;
        networkDirty = false;
        gameState.isModalOpen = false;
        clearSkillTarget();
        renderUI();
    }
    function networkDisconnect(reason) {
        const cb = networkOnDisconnect;
        networkTeardown();
        showToast(`🌐 ${reason}`);
        if (cb) cb();
    }

    // 主机：创建房间并等待客机连接，返回 Promise（连接建立时 resolve）
    function networkHostRoom(roomId) {
        return new Promise((resolve, reject) => {
            networkTeardown();  // 清理可能残留的旧连接
            const peerId = NETWORK_PREFIX + roomId;
            const peer = new Peer(peerId, { debug: 1 });
            const state = { role: 'host', conn: null, hostSide: 0, logBuffer: [], pendingPrompts: {}, roomId, peer };
            networkState = state;
            const timeout = setTimeout(() => { try { peer.destroy(); } catch (e) {} reject(new Error('等待对方加入超时')); }, 120000);
            peer.on('open', () => {
                addLog(`🌐 房间已创建，房间码：${roomId}（等待对方加入...）`);
            });
            peer.on('connection', (conn) => {
                clearTimeout(timeout);
                state.conn = conn;
                conn.on('open', () => {
                    networkPollTimer = setInterval(() => { if (networkDirty) { networkDirty = false; networkPushState(); } }, 200);
                    resolve();
                });
                conn.on('data', (data) => networkOnData(state, data));
                conn.on('close', () => networkDisconnect('对方已断开连接'));
            });
            peer.on('error', (err) => {
                clearTimeout(timeout);
                reject(new Error('无法创建房间（信令服务不可用？错误：' + (err.type || err.message || '') + '）'));
            });
        });
    }

    // 客机：加入房间，返回 Promise（收到 init 快照后 resolve）
    function networkJoinRoom(roomId) {
        return new Promise((resolve, reject) => {
            networkTeardown();  // 清理可能残留的旧连接
            const peer = new Peer({ debug: 1 });
            const state = { role: 'guest', conn: null, hostSide: 0, logBuffer: [], pendingPrompts: {}, roomId, peer };
            networkState = state;
            const timeout = setTimeout(() => { try { peer.destroy(); } catch (e) {} reject(new Error('连接房间超时')); }, 20000);
            peer.on('open', () => {
                const conn = peer.connect(NETWORK_PREFIX + roomId, { reliable: true });
                state.conn = conn;
                conn.on('open', () => { addLog(`🌐 已连接房间 ${roomId}，等待开局同步...`); });
                conn.on('data', (data) => networkOnData(state, data));
                conn.on('close', () => networkDisconnect('对方已断开连接'));
            });
            peer.on('error', (err) => {
                clearTimeout(timeout);
                reject(new Error('无法连接房间（信令服务不可用或房间码错误？错误：' + (err.type || err.message || '') + '）'));
            });
            state._resolveInit = (payload) => {
                clearTimeout(timeout);
                networkPollTimer = setInterval(() => { if (networkDirty) { networkDirty = false; networkPushState(); } }, 200);
                resolve(payload);
            };
        });
    }

    function networkOnData(state, data) {
        if (!data || typeof data !== 'object') return;
        switch (data.t) {
            case 'init': {
                // 客机收到开局快照
                state.hostSide = data.hostSide;
                networkApplyState(data.s, data.logs || [], data.effects || []);
                if (state._resolveInit) { const r = state._resolveInit; state._resolveInit = null; r(data); }
                break;
            }
            case 'state': {
                // 客机收到主机快照
                if (networkIsGuest()) networkApplyState(data.s, data.logs || [], data.effects || []);
                break;
            }
            case 'fx': {
                // 客机收到即时提示（toast/连杀）
                if (networkIsGuest()) networkReplayFx(data.fn, data.args);
                break;
            }
            case 'action': {
                // 主机收到客机操作指令
                if (networkIsHost()) networkHandleAction(data.a);
                break;
            }
            case 'prompt': {
                networkOnPrompt(data);
                break;
            }
            case 'answer': {
                const resolveFn = state.pendingPrompts && state.pendingPrompts[data.id];
                if (resolveFn) { delete state.pendingPrompts[data.id]; resolveFn(data.value); }
                break;
            }
            case 'gameover': {
                if (networkIsGuest()) networkDisconnect('游戏结束');
                break;
            }
            case 'bye': {
                networkDisconnect('对方结束了联机');
                break;
            }
        }
    }

    // 游戏结束时主机通知客机
    function networkNotifyGameOver() {
        if (networkIsHost() && networkState.conn && networkState.conn.open) {
            try { networkState.conn.send({ t: 'gameover' }); } catch (e) {}
        }
    }
    // 主动退出联机
    function networkLeave() {
        if (networkActive() && networkState.conn && networkState.conn.open) {
            try { networkState.conn.send({ t: 'bye' }); } catch (e) {}
        }
        networkTeardown();
    }
    // UI 退出按钮：主动退出并触发回调（返回模式选择）
    function networkExitGame() {
        networkLeave();
        const cb = networkOnDisconnect;
        networkOnDisconnect = null;
        if (cb) cb();
    }
