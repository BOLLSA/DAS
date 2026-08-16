// ========== 卡组 & 游戏设置 ==========
// PRESET_DECKS、showGameModeSelect、showAISetup、showDeckBuilder、resetGame

    const PRESET_DECKS = [
        {
            name: "预选卡组1 - 均衡推进",
            desc: "攻防兼备，综合万金油",
            g1: ["重斧兵","骑士","枷锁猎手","猫","爱神","纱琳","参谋","血舞","军营","国王"],
            g2: ["调酒师","斧兵","超雄","大力士","塞壬","号角兵","弱化师","鹰眼","中医","旗手","魔女","双剑","护援兵","鼠疫","标枪手","反击兵","机车党"],
            g3: ["士兵","弓箭手","蟑螂","猎人","酒鬼","守卫","鼓手","催眠师","净化师","牛仔","显眼包","通讯员","护盾","狂战士","盾兵","奴隶","巫师","爱妃","禁卫","弩手"]
        },
        {
            name: "预选卡组2 - 快攻速推",
            desc: "高攻速多攻击，快速压制",
            g1: ["骑士","猫","爱神","纱琳","血舞","参谋","斩月","公主","重斧兵","三刀"],
            g2: ["斧兵","大力士","双剑","暴食者","武器商","号角兵","弱化师","鹰眼","追刃","护援兵","无中生有","银运","骷髅","超雄","鼠疫","标枪手","反击兵","机车党"],
            g3: ["士兵","弓箭手","蟑螂","猎人","酒鬼","鼓手","催眠师","净化师","牛仔","显眼包","通讯员","奴隶","巫师","爱妃","禁卫","风兵","火人","替罪羊","费者","盾兵"]
        },
        {
            name: "预选卡组3 - 控制锁场",
            desc: "群控铺场，限制敌方行动",
            g1: ["骑士","枷锁猎手","猫","爱神","纱琳","参谋","血舞","国王","斩月","公主"],
            g2: ["调酒师","斧兵","超雄","大力士","塞壬","号角兵","弱化师","鹰眼","中医","旗手","魔女","双剑","护援兵","稻草人","鼠疫","标枪手","反击兵","机车党"],
            g3: ["士兵","弓箭手","蟑螂","猎人","酒鬼","守卫","鼓手","催眠师","净化师","牛仔","显眼包","通讯员","护盾","狂战士","盾兵","奴隶","巫师","爱妃","禁卫","弩手"]
        },
        {
            name: "预选卡组4 - 法术炮台",
            desc: "法伤核心，远程轰击",
            g1: ["重斧兵","骑士","枷锁猎手","猫","爱神","纱琳","参谋","血舞","斩月","公主"],
            g2: ["调酒师","斧兵","超雄","大力士","塞壬","号角兵","弱化师","鹰眼","中医","旗手","魔女","双剑","银运","骷髅","鼠疫","标枪手","反击兵","机车党"],
            g3: ["士兵","弓箭手","蟑螂","猎人","酒鬼","守卫","鼓手","催眠师","净化师","牛仔","显眼包","通讯员","护盾","狂战士","盾兵","奴隶","巫师","爱妃","禁卫","弩手"]
        },
        {
            name: "预选卡组5 - 铺场大军",
            desc: "大量低费单位，人海战术",
            g1: ["猫","爱神","纱琳","血舞","参谋","军营","国王","斩月","公主","枷锁猎手"],
            g2: ["调酒师","斧兵","超雄","大力士","塞壬","号角兵","弱化师","鹰眼","中医","旗手","魔女","暴食者","双剑","护援兵","鼠疫","标枪手","反击兵","机车党"],
            g3: ["士兵","弓箭手","蟑螂","猎人","酒鬼","守卫","鼓手","催眠师","净化师","牛仔","显眼包","通讯员","护盾","狂战士","盾兵","奴隶","巫师","爱妃","禁卫","弩手"]
        }
    ];

    async function showGameModeSelect() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'mode-select-overlay';

            // 用 createElement 显式构建节点，避免 innerHTML 在某些环境（如 file:// 协议、字符编码异常）
            // 下解析不完整导致 querySelector 返回 null、onclick 绑定失败、按钮点击无响应
            const panel = document.createElement('div');
            panel.className = 'mode-select-panel';

            const h2 = document.createElement('h2');
            h2.textContent = '⚔️ 黑暗中世纪 1.01';
            panel.appendChild(h2);

            const p = document.createElement('p');
            p.textContent = '请选择游戏模式';
            panel.appendChild(p);

            function makeBtn(text, sub, cls, extraStyle, value) {
                const btn = document.createElement('button');
                btn.type = 'button'; // 避免 form 提交语义
                btn.className = cls;
                if (extraStyle) btn.setAttribute('style', extraStyle);
                if (sub) {
                    const main = document.createElement('span');
                    main.textContent = text;
                    btn.appendChild(main);
                    btn.appendChild(document.createElement('br'));
                    const small = document.createElement('small');
                    small.textContent = sub;
                    btn.appendChild(small);
                } else {
                    btn.textContent = text;
                }
                // 显式提升可点击性，避免被透明元素遮挡
                btn.style.cursor = 'pointer';
                btn.style.position = 'relative';
                btn.style.zIndex = '2';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (overlay.parentNode) overlay.remove();
                    resolve(value);
                });
                panel.appendChild(btn);
                return btn;
            }

            makeBtn('📦 全卡池模式', '使用全部卡牌组成卡组', 'mode-btn full', null, 'full');
            makeBtn('🎯 自定义卡组模式', '双方各自挑选卡牌组成 100 张卡组', 'mode-btn custom', null, 'custom');
            makeBtn('🤖 人机对战模式', '与 AI 对战，可选难度', 'mode-btn ai', null, 'ai');
            makeBtn('🌐 远程联机', '与朋友实时对战（P2P，需网络）', 'mode-btn online', null, 'online');
            makeBtn('🎓 新手教程', '带领新手了解完整游戏流程与基础玩法', 'mode-btn tutorial', null, 'tutorial');

            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            // 防御：如果面板已显示但被其他全屏元素遮挡，强制将 overlay 置顶
            overlay.style.zIndex = '1000';
        });
    }

    // ===== 远程联机设置界面（创建/加入房间） =====
    function generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }

    async function showOnlineSetup() {
        // 联机组件（PeerJS CDN）未加载时的兜底提示
        if (typeof Peer === 'undefined') {
            showToast('🌐 联机组件加载失败，请检查网络后刷新页面');
            return null;
        }
        // 第一步：创建 or 加入
        const mode = await new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'mode-select-overlay';
            const panel = document.createElement('div');
            panel.className = 'mode-select-panel';
            panel.innerHTML = `<h2>🌐 远程联机</h2><p>与朋友实时对战：一人创建房间，另一人输入房间码加入。房间通过免费 P2P 信令服务建立，需要双方网络通畅。</p>`;
            function mk(text, cls, val) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = text;
                btn.className = cls;
                btn.style.cssText = 'cursor:pointer;position:relative;z-index:2;margin:6px 0;';
                btn.onclick = () => { overlay.remove(); resolve(val); };
                panel.appendChild(btn);
            }
            mk('🏠 创建房间（房主）', 'mode-btn full', 'host');
            mk('🔑 加入房间', 'mode-btn online', 'guest');
            mk('取消', 'cancel-btn', null);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
        });
        if (!mode) return null;

        if (mode === 'host') {
            // 第二步：房主选择卡组模式 + 先后手（阵营）
            const hostConfig = await new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'mode-select-overlay';
                const panel = document.createElement('div');
                panel.className = 'mode-select-panel';
                panel.style.maxWidth = '640px';
                panel.innerHTML = `<h2>🏠 创建房间 · 对局设置</h2>`;
                // 卡组模式
                const deckLabel = document.createElement('p');
                deckLabel.textContent = '卡组模式（双方使用相同卡组）';
                deckLabel.style.cssText = 'margin:10px 0 6px;';
                panel.appendChild(deckLabel);
                const deckRow = document.createElement('div');
                deckRow.style.cssText = 'display:flex;gap:10px;justify-content:center;margin:6px 0;flex-wrap:wrap;';
                let chosenDeckMode = 'full';
                let chosenPresetIdx = 0;
                const fullBtn = document.createElement('button');
                fullBtn.type = 'button'; fullBtn.textContent = '📦 全卡池';
                fullBtn.className = 'mode-btn';
                fullBtn.style.cssText = 'cursor:pointer;padding:8px 18px;';
                const presetBtn = document.createElement('button');
                presetBtn.type = 'button'; presetBtn.textContent = '📋 预设卡组';
                presetBtn.className = 'mode-btn';
                presetBtn.style.cssText = 'cursor:pointer;padding:8px 18px;';
                function updateDeckBtns() {
                    fullBtn.style.background = chosenDeckMode === 'full' ? 'linear-gradient(135deg,#8a6c3a,#6a4c2a)' : '#3a2a1f';
                    presetBtn.style.background = chosenDeckMode === 'preset' ? 'linear-gradient(135deg,#8a4cc0,#6a2ca0)' : '#3a2a1f';
                    fullBtn.style.color = '#f9eec1'; presetBtn.style.color = '#f9eec1';
                }
                fullBtn.onclick = () => { chosenDeckMode = 'full'; updateDeckBtns(); updatePresetVis(); };
                presetBtn.onclick = () => { chosenDeckMode = 'preset'; updateDeckBtns(); updatePresetVis(); };
                deckRow.appendChild(fullBtn); deckRow.appendChild(presetBtn);
                panel.appendChild(deckRow);
                // 预设卡组列表（仅 preset 显示）
                const presetSelect = document.createElement('div');
                presetSelect.style.cssText = 'margin:6px 0;max-height:150px;overflow-y:auto;';
                PRESET_DECKS.forEach((preset, idx) => {
                    const item = document.createElement('div');
                    item.style.cssText = 'background:#3a2a1f;border-radius:10px;padding:7px 12px;margin:4px 0;cursor:pointer;text-align:left;border-left:3px solid transparent;font-size:13px;';
                    item.innerHTML = `<b style="color:#ffaa44">${preset.name}</b><br><span style="font-size:11px;color:#ddcc99">${preset.desc || ''}</span>`;
                    item.onclick = () => { chosenPresetIdx = idx; presetSelect.querySelectorAll('div').forEach(d => d.style.borderLeftColor = 'transparent'); item.style.borderLeftColor = '#ffaa44'; };
                    if (idx === 0) item.style.borderLeftColor = '#ffaa44';
                    presetSelect.appendChild(item);
                });
                panel.appendChild(presetSelect);
                function updatePresetVis() { presetSelect.style.display = chosenDeckMode === 'preset' ? 'block' : 'none'; }
                updatePresetVis();
                // 阵营（先后手）
                const sideLabel = document.createElement('p');
                sideLabel.textContent = '选择你的阵营（决定先后手）';
                sideLabel.style.cssText = 'margin:12px 0 6px;';
                panel.appendChild(sideLabel);
                const sideRow = document.createElement('div');
                sideRow.style.cssText = 'display:flex;gap:10px;justify-content:center;margin:6px 0;flex-wrap:wrap;';
                let chosenSide = 0;
                const blueBtn = document.createElement('button');
                blueBtn.type = 'button'; blueBtn.textContent = '🔵 蓝方（先手）';
                blueBtn.className = 'mode-btn'; blueBtn.style.cssText = 'cursor:pointer;padding:8px 18px;';
                const redBtn = document.createElement('button');
                redBtn.type = 'button'; redBtn.textContent = '🔴 红方（后手）';
                redBtn.className = 'mode-btn'; redBtn.style.cssText = 'cursor:pointer;padding:8px 18px;';
                function updateSideBtns() {
                    blueBtn.style.background = chosenSide === 0 ? 'linear-gradient(135deg,#3a7dad,#2a5d8a)' : '#3a2a1f';
                    redBtn.style.background = chosenSide === 1 ? 'linear-gradient(135deg,#a85040,#8b3c2c)' : '#3a2a1f';
                    blueBtn.style.color = '#f9eec1'; redBtn.style.color = '#f9eec1';
                }
                blueBtn.onclick = () => { chosenSide = 0; updateSideBtns(); };
                redBtn.onclick = () => { chosenSide = 1; updateSideBtns(); };
                updateSideBtns();
                sideRow.appendChild(blueBtn); sideRow.appendChild(redBtn);
                panel.appendChild(sideRow);
                // 确认
                const confirmBtn = document.createElement('button');
                confirmBtn.type = 'button';
                confirmBtn.className = 'mode-btn full';
                confirmBtn.textContent = '🏠 创建房间';
                confirmBtn.style.cssText = 'cursor:pointer;margin-top:12px;';
                confirmBtn.onclick = () => { overlay.remove(); resolve({ deckMode: chosenDeckMode, presetIdx: chosenPresetIdx, hostSide: chosenSide }); };
                panel.appendChild(confirmBtn);
                const cancelBtn = document.createElement('button');
                cancelBtn.type = 'button';
                cancelBtn.className = 'cancel-btn';
                cancelBtn.textContent = '取消';
                cancelBtn.style.cssText = 'cursor:pointer;margin-top:8px;';
                cancelBtn.onclick = () => { overlay.remove(); resolve(null); };
                panel.appendChild(cancelBtn);
                overlay.appendChild(panel);
                document.body.appendChild(overlay);
                updateDeckBtns();
            });
            if (!hostConfig) return null;
            // 第三步：生成房间码并等待（可复制）
            const roomId = generateRoomCode();
            const waitOverlay = document.createElement('div');
            waitOverlay.className = 'mode-select-overlay';
            const waitPanel = document.createElement('div');
            waitPanel.className = 'mode-select-panel';
            waitPanel.innerHTML = `<h2>🏠 房间已创建</h2>
<p>房间码：<b id="onlineRoomCode" style="color:#ffd98a;font-size:22px;letter-spacing:4px;">${roomId}</b></p>
<p>请把房间码告诉朋友，等待对方加入...</p>
<p style="font-size:12px;color:#c8b48a;">提示：对方需要选择「🌐 远程联机 → 🔑 加入房间」并输入此房间码。加入成功后将自动开始游戏。</p>`;
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'mode-btn online';
            copyBtn.textContent = '📋 复制房间码';
            copyBtn.style.cssText = 'cursor:pointer;margin-top:8px;padding:8px 16px;';
            copyBtn.onclick = () => {
                const done = (ok) => { showToast(ok ? '📋 房间码已复制，发给朋友吧' : '📋 复制失败，请手动记录房间码'); };
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(roomId).then(() => done(true)).catch(() => done(fallbackCopy(roomId)));
                    } else {
                        done(fallbackCopy(roomId));
                    }
                } catch (e) { done(fallbackCopy(roomId)); }
            };
            waitPanel.appendChild(copyBtn);
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'cancel-btn';
            cancelBtn.textContent = '取消等待';
            cancelBtn.style.cssText = 'cursor:pointer;margin-top:8px;';
            cancelBtn.onclick = () => { waitOverlay.remove(); networkTeardown(); };
            waitPanel.appendChild(cancelBtn);
            waitOverlay.appendChild(waitPanel);
            document.body.appendChild(waitOverlay);
            try {
                await networkHostRoom(roomId);
                waitOverlay.remove();
                return { role: 'host', roomId, deckMode: hostConfig.deckMode, presetIdx: hostConfig.presetIdx, hostSide: hostConfig.hostSide };
            } catch (e) {
                waitOverlay.remove();
                showToast(`🌐 ${e.message || '创建房间失败'}`);
                return null;
            }
        } else {
            const roomId = await new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'mode-select-overlay';
                const panel = document.createElement('div');
                panel.className = 'mode-select-panel';
                panel.innerHTML = `<h2>🔑 加入房间</h2><p>输入房主提供的 6 位房间码：</p>`;
                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 6;
                input.placeholder = '房间码（如 AB3CD5）';
                input.style.cssText = 'font-size:20px;text-align:center;letter-spacing:6px;width:160px;padding:8px;border-radius:8px;border:1px solid #d4a847;background:#1c150e;color:#f9eec1;text-transform:uppercase;';
                panel.appendChild(input);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mode-btn online';
                btn.textContent = '连接';
                btn.style.cssText = 'cursor:pointer;margin-top:10px;';
                btn.onclick = () => {
                    const v = (input.value || '').trim().toUpperCase();
                    if (v.length !== 6) { showToast('请输入 6 位房间码'); return; }
                    overlay.remove();
                    resolve(v);
                };
                panel.appendChild(btn);
                const cancelBtn = document.createElement('button');
                cancelBtn.type = 'button';
                cancelBtn.className = 'cancel-btn';
                cancelBtn.textContent = '取消';
                cancelBtn.style.cssText = 'cursor:pointer;margin-top:8px;';
                cancelBtn.onclick = () => { overlay.remove(); resolve(null); };
                panel.appendChild(cancelBtn);
                overlay.appendChild(panel);
                document.body.appendChild(overlay);
                input.focus();
            });
            if (!roomId) return null;
            const waitOverlay = document.createElement('div');
            waitOverlay.className = 'mode-select-overlay';
            const waitPanel = document.createElement('div');
            waitPanel.className = 'mode-select-panel';
            waitPanel.innerHTML = `<h2>🔑 正在连接房间 ${roomId}...</h2><p>请稍候，正在与房主建立连接并同步开局...</p>`;
            waitOverlay.appendChild(waitPanel);
            document.body.appendChild(waitOverlay);
            try {
                await networkJoinRoom(roomId);
                waitOverlay.remove();
                return { role: 'guest', roomId };
            } catch (e) {
                waitOverlay.remove();
                showToast(`🌐 ${e.message || '连接失败'}`);
                return null;
            }
        }
    }

    // 复制兜底：execCommand（老浏览器/非安全上下文）
    function fallbackCopy(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok;
        } catch (e) { return false; }
    }

    // ===== AI 对战设置界面 =====
    async function showAISetup() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'mode-select-overlay';
            const panel = document.createElement('div');
            panel.className = 'mode-select-panel';
            panel.innerHTML = `<h2>🤖 人机对战设置</h2>`;
            overlay.appendChild(panel);

            // 阵营选择
            const sideLabel = document.createElement('p');
            sideLabel.textContent = '选择你的阵营';
            sideLabel.style.marginTop = '12px';
            panel.appendChild(sideLabel);

            const sideRow = document.createElement('div');
            sideRow.style.cssText = 'display:flex;gap:12px;justify-content:center;margin:8px 0';
            let chosenSide = 0; // 默认蓝方
            function mkSideBtn(text, val) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = text;
                btn.className = 'mode-btn';
                btn.style.cssText = 'cursor:pointer;position:relative;z-index:2;padding:10px 20px';
                btn.onclick = () => { chosenSide = val; updateSideBtns(); };
                sideRow.appendChild(btn);
                return btn;
            }
            const blueBtn = mkSideBtn('🔵 蓝方（先手）', 0);
            const redBtn = mkSideBtn('🔴 红方（后手）', 1);
            function updateSideBtns() {
                blueBtn.style.background = chosenSide === 0 ? 'linear-gradient(135deg,#3a7dad,#2a5d8a)' : '#3a2a1f';
                blueBtn.style.color = '#f9eec1';
                redBtn.style.background = chosenSide === 1 ? 'linear-gradient(135deg,#a85040,#8b3c2c)' : '#3a2a1f';
                redBtn.style.color = '#f9eec1';
            }
            updateSideBtns();
            panel.appendChild(sideRow);

            // 难度选择
            const diffLabel = document.createElement('p');
            diffLabel.textContent = '选择 AI 难度';
            diffLabel.style.marginTop = '12px';
            panel.appendChild(diffLabel);

            const diffRow = document.createElement('div');
            diffRow.style.cssText = 'display:flex;gap:12px;justify-content:center;margin:8px 0';
            let chosenDiff = 'normal';
            function mkDiffBtn(text, val) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = text;
                btn.className = 'mode-btn';
                btn.style.cssText = 'cursor:pointer;position:relative;z-index:2;padding:10px 20px';
                btn.onclick = () => { chosenDiff = val; updateDiffBtns(); };
                diffRow.appendChild(btn);
                return btn;
            }
            const easyBtn = mkDiffBtn('😊 简单', 'easy');
            const normalBtn = mkDiffBtn('😎 普通', 'normal');
            const hardBtn = mkDiffBtn('😤 困难', 'hard');
            function updateDiffBtns() {
                easyBtn.style.background = chosenDiff === 'easy' ? 'linear-gradient(135deg,#3a7d3a,#2c6e2c)' : '#3a2a1f';
                easyBtn.style.color = '#f9eec1';
                normalBtn.style.background = chosenDiff === 'normal' ? 'linear-gradient(135deg,#8a6c3a,#6a4c2a)' : '#3a2a1f';
                normalBtn.style.color = '#f9eec1';
                hardBtn.style.background = chosenDiff === 'hard' ? 'linear-gradient(135deg,#a85040,#8b3c2c)' : '#3a2a1f';
                hardBtn.style.color = '#f9eec1';
            }
            updateDiffBtns();
            panel.appendChild(diffRow);

            // 卡组选择
            const deckLabel = document.createElement('p');
            deckLabel.textContent = '卡组设置';
            deckLabel.style.marginTop = '12px';
            panel.appendChild(deckLabel);

            const deckRow = document.createElement('div');
            deckRow.style.cssText = 'display:flex;gap:12px;justify-content:center;margin:8px 0';
            let chosenDeckMode = 'full';
            function mkDeckBtn(text, val) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = text;
                btn.className = 'mode-btn';
                btn.style.cssText = 'cursor:pointer;position:relative;z-index:2;padding:10px 20px';
                btn.onclick = () => { chosenDeckMode = val; updateDeckBtns(); };
                deckRow.appendChild(btn);
                return btn;
            }
            const fullBtn = mkDeckBtn('📦 全卡池', 'full');
            const presetBtn = mkDeckBtn('📋 预设卡组', 'preset');
            function updateDeckBtns() {
                fullBtn.style.background = chosenDeckMode === 'full' ? 'linear-gradient(135deg,#8a6c3a,#6a4c2a)' : '#3a2a1f';
                fullBtn.style.color = '#f9eec1';
                presetBtn.style.background = chosenDeckMode === 'preset' ? 'linear-gradient(135deg,#8a4cc0,#6a2ca0)' : '#3a2a1f';
                presetBtn.style.color = '#f9eec1';
            }
            updateDeckBtns();
            panel.appendChild(deckRow);

            // 预设选择（仅 preset 模式显示）
            const presetSelect = document.createElement('div');
            presetSelect.style.cssText = 'margin:8px 0;max-height:200px;overflow-y:auto';
            let chosenPresetIdx = 0;
            PRESET_DECKS.forEach((preset, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'background:#3a2a1f;border-radius:12px;padding:8px 12px;margin:4px 0;cursor:pointer;text-align:left;border-left:3px solid transparent';
                item.innerHTML = `<b style="color:#ffaa44">${preset.name}</b><br><span style="font-size:11px;color:#ddcc99">${preset.desc || ''}</span>`;
                item.onclick = () => {
                    chosenPresetIdx = idx;
                    presetSelect.querySelectorAll('div').forEach(d => d.style.borderLeftColor = 'transparent');
                    item.style.borderLeftColor = '#ffaa44';
                };
                if (idx === 0) item.style.borderLeftColor = '#ffaa44';
                presetSelect.appendChild(item);
            });
            presetSelect.style.display = 'none';
            panel.appendChild(presetSelect);
            const origDeckUpdate = updateDeckBtns;
            updateDeckBtns = function() { origDeckUpdate(); presetSelect.style.display = chosenDeckMode === 'preset' ? 'block' : 'none'; };

            // 开始按钮
            const startBtn = document.createElement('button');
            startBtn.type = 'button';
            startBtn.textContent = '⚔️ 开始对战';
            startBtn.className = 'mode-btn';
            startBtn.style.cssText = 'cursor:pointer;position:relative;z-index:2;background:linear-gradient(135deg,#3a7d3a,#2c6e2c);color:#f9eec1;text-shadow:0 1px 2px rgba(0,0,0,0.3);margin-top:16px;padding:12px 32px;font-size:16px';
            startBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                if (overlay.parentNode) overlay.remove();
                resolve({ playerSide: chosenSide, difficulty: chosenDiff, deckMode: chosenDeckMode, presetIdx: chosenPresetIdx });
            };
            panel.appendChild(startBtn);

            const backBtn = document.createElement('button');
            backBtn.type = 'button';
            backBtn.textContent = '↩️ 返回';
            backBtn.className = 'cancel-btn';
            backBtn.style.cssText = 'margin-top:8px;cursor:pointer;position:relative;z-index:2';
            backBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (overlay.parentNode) overlay.remove(); resolve(null); };
            panel.appendChild(backBtn);

            overlay.appendChild(panel);
            document.body.appendChild(overlay);
            overlay.style.zIndex = '1000';
        });
    }

    async function showDeckBuilder(playerLabel, playerIdx) {
        const limits = { 1: 10, 2: 15, 3: 20 };
        const selected = {};
        for (let g of [1,2,3]) selected[g] = new Set();

        const allCards = CARD_LIBRARY;
        const grouped = {};
        for (let g of [1,2,3]) grouped[g] = allCards.filter(c => c.grade === g);

        return new Promise((resolve) => {
            const overlay = document.createElement('div'); overlay.className = 'deck-builder-overlay';
            overlay.innerHTML = `<div class="deck-builder-panel"></div>`;
            document.body.appendChild(overlay);
            const panel = overlay.querySelector('.deck-builder-panel');

            function showPresetSelector() {
                const pov = document.createElement('div'); pov.className = 'preset-select-overlay';
                let ph = `<div class="preset-select-panel"><h2>📋 预设卡组</h2>
                <p class="subtitle">点击预设一键填充，之后仍可手动调整</p>`;
                PRESET_DECKS.forEach((preset, idx) => {
                    ph += `<div class="preset-item" data-idx="${idx}">
                        <h3>${preset.name}</h3>
                        <div class="preset-desc">${preset.desc}</div>
                        <div class="preset-grade"><b>1级：</b>${preset.g1.join('、')}</div>
                        <div class="preset-grade"><b>2级：</b>${preset.g2.join('、')}</div>
                        <div class="preset-grade"><b>3级：</b>${preset.g3.join('、')}</div>
                    </div>`;
                });
                ph += `<div style="text-align:center;margin-top:10px"><button class="cancel-btn" id="presetCancel">关闭</button></div></div>`;
                pov.innerHTML = ph;
                document.body.appendChild(pov);

                pov.querySelector('#presetCancel').onclick = () => pov.remove();
                pov.querySelectorAll('.preset-item').forEach(item => {
                    item.onclick = () => {
                        const idx = parseInt(item.dataset.idx);
                        const preset = PRESET_DECKS[idx];
                        // 填充选定内容
                        for (let g of [1,2,3]) {
                            selected[g].clear();
                            const cardNames = preset['g'+g];
                            for (let name of cardNames) {
                                // 验证卡名存在
                                if (grouped[g].some(c => c.name === name)) {
                                    selected[g].add(name);
                                }
                            }
                            // 如果选超了，只保留前 limits[g] 张
                            if (selected[g].size > limits[g]) {
                                const arr = [...selected[g]].slice(0, limits[g]);
                                selected[g] = new Set(arr);
                            }
                        }
                        pov.remove();
                        render();
                    };
                });
            }

            function encodeDeck(name, sel) {
                const data = { v: 1, name: name, g1: [...sel[1]], g2: [...sel[2]], g3: [...sel[3]] };
                return 'DAS1:' + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
            }
            function decodeDeck(code) {
                try {
                    const raw = code.trim().replace(/^DAS1:/, '');
                    const data = JSON.parse(decodeURIComponent(escape(atob(raw))));
                    if (!data || !data.g1 || !data.g2 || !data.g3) throw new Error('格式错误');
                    return data;
                } catch (e) { return null; }
            }
            function getSavedDecks() {
                try { return JSON.parse(localStorage.getItem('das_saved_decks') || '[]'); }
                catch (e) { return []; }
            }
            function saveSavedDecks(arr) {
                localStorage.setItem('das_saved_decks', JSON.stringify(arr));
            }

            function showDeckExportOverlay() {
                const allDone = Object.values(selected).every((s, g) => s.size === limits[g + 1]);
                if (!allDone) { showToast('请先选满卡组再导出'); return; }
                const pov = document.createElement('div'); pov.className = 'preset-select-overlay';
                let html = `<div class="preset-select-panel deck-io-panel">
                    <h2>📤 导出卡组</h2>
                    <p class="subtitle">为你的卡组取个名字，可保存或分享</p>
                    <input type="text" id="deckExportName" class="deck-name-input" placeholder="输入卡组名称" maxlength="20" />
                    <div class="deck-io-section">
                        <label class="deck-io-label">分享码（可复制发送给好友）</label>
                        <textarea id="deckExportCode" class="deck-io-textarea" readonly rows="3"></textarea>
                        <button class="deck-io-action-btn" id="btnCopyCode">📋 复制分享码</button>
                    </div>
                    <div class="deck-io-section">
                        <label class="deck-io-label">已保存的卡组</label>
                        <div id="savedDeckList" class="saved-deck-list"></div>
                        <button class="deck-io-action-btn save-btn" id="btnSaveDeck">💾 保存到本地</button>
                    </div>
                    <div style="text-align:center;margin-top:10px"><button class="cancel-btn" id="exportClose">关闭</button></div>
                </div>`;
                pov.innerHTML = html;
                document.body.appendChild(pov);

                const nameInput = pov.querySelector('#deckExportName');
                const codeArea = pov.querySelector('#deckExportCode');
                const savedList = pov.querySelector('#savedDeckList');

                function refreshCode() {
                    const name = nameInput.value.trim() || '未命名卡组';
                    codeArea.value = encodeDeck(name, selected);
                }
                nameInput.oninput = refreshCode;
                refreshCode();

                function refreshSavedList() {
                    const decks = getSavedDecks();
                    if (decks.length === 0) {
                        savedList.innerHTML = '<div class="saved-deck-empty">暂无保存的卡组</div>';
                        return;
                    }
                    savedList.innerHTML = decks.map((d, i) => `
                        <div class="saved-deck-item">
                            <span class="saved-deck-name">${d.name}</span>
                            <button class="saved-deck-del" data-idx="${i}" title="删除">✕</button>
                        </div>`).join('');
                    savedList.querySelectorAll('.saved-deck-del').forEach(btn => {
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            const idx = parseInt(btn.dataset.idx);
                            const decks = getSavedDecks();
                            decks.splice(idx, 1);
                            saveSavedDecks(decks);
                            refreshSavedList();
                            showToast('已删除');
                        };
                    });
                }
                refreshSavedList();

                pov.querySelector('#btnCopyCode').onclick = () => {
                    codeArea.select();
                    try {
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(codeArea.value);
                        } else {
                            document.execCommand('copy');
                        }
                        showToast('✅ 分享码已复制');
                    } catch (e) {
                        showToast('请手动选择文本复制');
                    }
                };

                pov.querySelector('#btnSaveDeck').onclick = () => {
                    const name = nameInput.value.trim() || '未命名卡组';
                    const decks = getSavedDecks();
                    decks.push({ name: name, g1: [...selected[1]], g2: [...selected[2]], g3: [...selected[3]] });
                    saveSavedDecks(decks);
                    refreshSavedList();
                    showToast(`✅ 已保存「${name}」`);
                };

                pov.querySelector('#exportClose').onclick = () => pov.remove();
            }

            function showDeckImportOverlay() {
                const pov = document.createElement('div'); pov.className = 'preset-select-overlay';
                let html = `<div class="preset-select-panel deck-io-panel">
                    <h2>📥 导入卡组</h2>
                    <p class="subtitle">粘贴分享码或从已保存的卡组中选择</p>
                    <div class="deck-io-section">
                        <textarea id="deckImportCode" class="deck-io-textarea" placeholder="粘贴分享码（DAS1:开头）" rows="3"></textarea>
                        <button class="deck-io-action-btn" id="btnLoadCode">📥 从分享码导入</button>
                    </div>
                    <div class="deck-io-section">
                        <label class="deck-io-label">已保存的卡组</label>
                        <div id="importSavedList" class="saved-deck-list"></div>
                    </div>
                    <div style="text-align:center;margin-top:10px"><button class="cancel-btn" id="importClose">关闭</button></div>
                </div>`;
                pov.innerHTML = html;
                document.body.appendChild(pov);

                const codeArea = pov.querySelector('#deckImportCode');
                const importList = pov.querySelector('#importSavedList');

                function applyDeck(data) {
                    for (let g of [1, 2, 3]) {
                        selected[g].clear();
                        const names = data['g' + g] || [];
                        for (let name of names) {
                            if (grouped[g].some(c => c.name === name)) {
                                selected[g].add(name);
                            }
                        }
                        if (selected[g].size > limits[g]) {
                            const arr = [...selected[g]].slice(0, limits[g]);
                            selected[g] = new Set(arr);
                        }
                    }
                    pov.remove();
                    render();
                    showToast(`✅ 已导入「${data.name || '卡组'}」`);
                }

                pov.querySelector('#btnLoadCode').onclick = () => {
                    const code = codeArea.value.trim();
                    if (!code) { showToast('请粘贴分享码'); return; }
                    const data = decodeDeck(code);
                    if (!data) { showToast('❌ 分享码格式错误'); return; }
                    applyDeck(data);
                };

                function refreshImportList() {
                    const decks = getSavedDecks();
                    if (decks.length === 0) {
                        importList.innerHTML = '<div class="saved-deck-empty">暂无保存的卡组</div>';
                        return;
                    }
                    importList.innerHTML = decks.map((d, i) => `
                        <div class="saved-deck-item clickable" data-idx="${i}">
                            <span class="saved-deck-name">${d.name}</span>
                            <button class="saved-deck-del" data-idx="${i}" title="删除">✕</button>
                        </div>`).join('');
                    importList.querySelectorAll('.saved-deck-item.clickable').forEach(item => {
                        item.onclick = (e) => {
                            if (e.target.classList.contains('saved-deck-del')) return;
                            const idx = parseInt(item.dataset.idx);
                            const decks = getSavedDecks();
                            applyDeck(decks[idx]);
                        };
                    });
                    importList.querySelectorAll('.saved-deck-del').forEach(btn => {
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            const idx = parseInt(btn.dataset.idx);
                            const decks = getSavedDecks();
                            decks.splice(idx, 1);
                            saveSavedDecks(decks);
                            refreshImportList();
                            showToast('已删除');
                        };
                    });
                }
                refreshImportList();

                pov.querySelector('#importClose').onclick = () => pov.remove();
            }

            function render() {
                let html = `<h2>${playerLabel} — 自定义卡组</h2>
                <p class="subtitle">1级选${limits[1]}张 (各1张拷贝) | 2级选${limits[2]}张 (各2张拷贝) | 3级选${limits[3]}张 (各3张拷贝) — 共100张</p>
                <div class="deck-top-bar"><button class="deck-preset-btn" id="btnPreset">📋 预设</button><button class="deck-io-btn" id="btnImport">📥 导入</button><button class="deck-io-btn" id="btnExport">📤 导出</button><button class="cancel-btn deck-back-btn" id="btnBack">↩️ 返回</button></div>`;
                for (let g of [1,2,3]) {
                    const selCount = selected[g].size;
                    const target = limits[g];
                    const done = selCount === target;
                    html += `<div class="deck-grade-row">
                        <div class="deck-grade-label g${g}">${g}级</div>
                        <div class="deck-card-grid">`;
                    for (let card of grouped[g]) {
                        const isSel = selected[g].has(card.name);
                        html += `<div class="deck-card-chip${isSel ? ' selected' : ''}" data-card="${card.name}" data-grade="${g}">
                            <div class="chip-name">${card.name}</div>
                            <div class="chip-info">💰${card.cost} ❤️${card.life} ${card.dmgType}${card.dmgValue} 📏${card.range} 🏃${card.speed}${card.extraAttacks ? ' ⚔️×' + (1 + card.extraAttacks) : ''}</div>
                        </div>`;
                    }
                    html += `</div><span class="deck-counter${done ? ' done' : ''}">${selCount}/${target}${done ? ' ✓' : ''}</span></div>`;
                }
                const allDone = Object.values(selected).every((s,g) => s.size === limits[g+1]);
                html += `<div class="deck-confirm-bar"><button class="deck-confirm-btn" id="deckConfirm"${allDone ? '' : ' disabled'}>✅ 确认卡组</button></div>`;
                panel.innerHTML = html;

                panel.querySelectorAll('.deck-card-chip').forEach(chip => {
                    chip.onclick = () => {
                        const name = chip.dataset.card;
                        const grade = parseInt(chip.dataset.grade);
                        if (selected[grade].has(name)) {
                            selected[grade].delete(name);
                        } else {
                            if (selected[grade].size >= limits[grade]) {
                                showToast(`${grade}级已达上限${limits[grade]}张！`);
                                return;
                            }
                            selected[grade].add(name);
                        }
                        render();
                    };
                });
                // 预设卡组按钮
                const presetBtn = panel.querySelector('#btnPreset');
                if (presetBtn) {
                    presetBtn.onclick = () => showPresetSelector();
                }
                // 返回按钮
                const backBtn = panel.querySelector('#btnBack');
                if (backBtn) {
                    backBtn.onclick = () => {
                        overlay.remove();
                        resolve('back');
                    };
                }
                // 导入按钮
                const importBtn = panel.querySelector('#btnImport');
                if (importBtn) {
                    importBtn.onclick = () => showDeckImportOverlay();
                }
                // 导出按钮
                const exportBtn = panel.querySelector('#btnExport');
                if (exportBtn) {
                    exportBtn.onclick = () => showDeckExportOverlay();
                }
                const confirmBtn = panel.querySelector('#deckConfirm');
                if (confirmBtn && allDone) {
                    confirmBtn.onclick = () => {
                        const allNames = Object.values(selected).flatMap(s => [...s]);
                        overlay.remove();
                        resolve(allNames);
                    };
                }
            }
            render();
        });
    }

    async function resetGame(p0Cards = null, p1Cards = null, p0Equipments = null, p1Equipments = null) {
        // 新手教程进行中：拦截重新开局（教程初始化自身的 resetGame 调用时 tutorialState 尚未激活，不受影响）
        if (tutorialState && tutorialState.active) {
            showToast('🎓 教程进行中，请先完成或退出教程');
            return;
        }
        const p0 = initPlayerDeck(p0Cards);
        const p1 = initPlayerDeck(p1Cards);
        gameState = {
            turn: 0,
            players: [
                { hp: 10, mana: 3, hand: p0.hand, deck: p0.deck, prepool: p0.prepool, handMax: 6, manaMax: 15 },
                { hp: 10, mana: 4, hand: p1.hand, deck: p1.deck, prepool: p1.prepool, handMax: 6, manaMax: 15 }
            ],
            units: [],
            selectedCardIdx: -1,
            selectedUnitId: null,
            awaitingSkillTarget: false,
            skillCasterId: null,
            skillType: null,
            declarativeSkillName: null,
            declarativeSelectMode: null,
            declarativeSelected: [],
            declarativeMaxSelect: 1,
            declarativeRange: 0,
            declarativeToggle: false,
            declarativeConfirmButton: false,
            declarativeStep: 1,
            declarativeFirstTarget: null,
            declarativeGridRow: null,
            declarativeGridCol: null,
            declarativeGridFilter: "any",
            declarativeWitchReduce: 0,
            declarativeZhanYueChoice: 0,
            isModalOpen: false,
            dualswordDelayedAttacks: [],
            dualswordAOEHighlight: null,
            attackedEnemyIds: [],
            kingDamagedCount: {0: false, 1: false},
            kingCostMod: {0: 0, 1: 0},
            zhanYueMarkedEnemyIds: [],
            shaLinBoundCells: [],
            hephaestusBlocks: [],
            nerdJamPending: {0: false, 1: false},
            plagueCardIdx: -1,
            plagueCasterSide: null,
            killStreakMap: {},
            matchEvents: [],
            matchStats: {
                turnCount: 0,
                startTime: 0,
                totalDamage: {0: 0, 1: 0},
                unitsKilled: {0: 0, 1: 0},
                cardsPlayed: {0: 0, 1: 0},
                skillsUsed: {0: 0, 1: 0},
                unitsLost: {0: 0, 1: 0},
                baseDamage: {0: 0, 1: 0},
                comboCount: {0: 0, 1: 0},
                unitKills: {},  // 单位名 -> {count, side}
                unitDamage: {}, // 单位名 -> {damage, side}
                tacticalEvents: {}, // tactic类型 -> {count, side}
            },
            // ── 装备系统状态 ──
            equipmentShop: {0: p0Equipments || [], 1: p1Equipments || []},
            awaitingEquipmentTarget: false,
            equipmentBuyerSide: null,
            equipmentPendingId: null,
            awaitingGlide: false,
            glideUnitId: null,
            awaitingMirrorAttack: false,
            mirrorAttackUnitId: null,
            assimilatorHp: {0: 0, 1: 0},
            assimilatorMaxHp: {0: 0, 1: 0},
        };
        lastDamageDealer = null;
        infiniteManaEnabled = false;
        aiGameId++; aiActing = false; // 重置 AI 执行状态，防止旧回合继续
        addLog("=== 游戏开始！蓝方先手（3费），红方后手（4费），费用上限15 ===");
        await startTurn(0);
        renderUI();
    }
