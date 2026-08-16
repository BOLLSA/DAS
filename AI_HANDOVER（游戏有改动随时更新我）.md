# 黑暗中世纪 (Dark Age Saga 1.01) — 项目交接文档

> 供下一位 AI 快速接手并安全规划代码修改，最后更新：2026-08（1.01 单位改名版）
> 基于上一版交接文档全面重写：新增机车党、新手引导教程、护盾来源系统、替伤防御结算、麻木者禁疗、无敌免疫秒杀、远程联机等；1.01 末期完成 8 个单位改名（详见「Dark Age Saga更新日志.md」）

---

## 一、项目概览

| 项目 | 说明 |
|------|------|
| 游戏名 | 黑暗中世纪 1.01（Dark Age Saga 1.01） |
| 入口文件 | `index.html`（加载 15 个 JS 文件 + 1 个 CSS 文件 + PeerJS CDN） |
| 类型 | 回合制战棋卡牌游戏 |
| 模式 | 全卡池对战 / 自定义卡组 / 人机对战（简单/普通/困难）/ 远程联机 / 新手教程 |
| 语言 | 纯前端 HTML + Vanilla JS（无框架、无构建工具、无 ES Module） |
| 测试环境 | Chrome / Edge 最新版 + 移动端 viewport，未适配 IE / 旧版 Safari |
| 内容规模 | 75 张卡牌 / 14 件装备 / 40 个技能定义，总代码量约 13,700 行（JS 约 11,300 + CSS 约 2,330 + HTML 约 60） |
| 版本号位置 | `index.html`（title/meta/角标 v1.01）+ `decks.js` 模式选择标题 |

!!!重要提醒：修改时不要误改导致地图单位卡片渲染错误而无法显示!!!!
!!!更新角色时一定要同步更新测试模式、预设卡组可选卡和图鉴显示!!!!
!!!所有 JS 文件共享全局作用域，函数/变量名不可重复，加载顺序不可随意调整!!!!

---

## 二、文件结构

```
Dark Age Saga/
├── index.html                  ← HTML 骨架 + JS 加载顺序（15个文件 + PeerJS CDN）+ 版本角标 v1.01
├── css/
│   └── style.css               ← 全部样式（含教程高亮 .tutorial-glow、联机按钮）
├── js/
│   ├── cards.js                ← CARD_TEMPLATES（75张卡）/ CARD_LIBRARY
│   ├── game-state.js           ← gameState 全局状态 + initPlayerDeck + 工具函数 + 事件记录
│   ├── battle-engine.js        ← 伤害链 / 攻击 / 死亡 / 护盾来源 / 替伤防御 / 秒杀防御
│   ├── skill-charge.js         ← 蓄力攻击（皮卡/弩手/重斧兵/戟兵）+ 标枪手突刺 + 反击兵爆炸
│   ├── skill-active.js         ← consumeNerdJamPending + purifyAllFriendly
│   ├── skill-config.js         ← SKILL_DEFS（40技能）+ 效果执行器 + 秒杀/kill效果
│   ├── game-flow.js            ← tryMoveUnit / placeUnit / startTurn / endTurn / 机车党蓄力结算 / 弹窗远程转发
│   ├── equipment.js            ← EQUIPMENT_LIBRARY（14件装备）+ 商店 + 复活 + AI购买 + 远程购买
│   ├── decks.js                ← PRESET_DECKS（5套）/ resetGame / 模式选择 / 卡组构建 / showOnlineSetup
│   ├── targeting.js            ← 技能目标过滤 / handleCellClick（联机指令转发）/ dispatchSkillTarget
│   ├── ui.js                   ← renderUI 核心渲染 / handleUnitClick（联机共用入口）
│   ├── ui-overlay.js           ← 图鉴 / 教程（静态+新手引导）/ 测试 / 复盘 / MVP / 快捷键
│   ├── ai.js                   ← AI 控制器（决策/评估/移动/技能）
│   ├── network.js              ← 远程联机网络层（PeerJS P2P 主机权威）
│   └── main.js                 ← startGame 入口（含教程/联机分支）
├── check.ps1                   ← 发布前语法检查（15 个 JS 文件 node --check）
├── publish.ps1                 ← 正式版发布脚本（干净拷贝到桌面 DAS 正式版本目录）
├── serve.ps1                   ← 简易 HTTP 服务器（TcpListener，局域网联机调试用，端口 8080）
├── AI_HANDOVER（游戏有改动随时更新我）.md  ← 本文档
├── Dark Age Saga更新日志.md      ← 独立更新日志（每次改动明细，与本文档分开维护）
├── README.md                   ← 仓库简介（DAS 历史版本说明）
└── .gitignore                  ← 排除 _check.log / *.log 等临时文件
```

### JS 文件加载顺序（index.html 中定义，不可调整）

```
PeerJS CDN → cards.js → game-state.js → battle-engine.js → skill-charge.js →
skill-active.js → skill-config.js → game-flow.js → equipment.js →
decks.js → targeting.js → ui.js → ui-overlay.js → ai.js → network.js → main.js
```

注意：**equipment.js 在 game-flow.js 之后加载**（旧文档描述有误）。跨文件调用只发生在运行时（函数声明全局提升），加载顺序只影响顶层立即执行代码。PeerJS 从 jsdelivr CDN 引入，加载失败时联机入口会提示（`typeof Peer === 'undefined'` 检查）。

---

## 三、各文件核心函数索引

| 文件 | 核心函数 | 说明 |
|------|---------|------|
| `cards.js` | `CARD_TEMPLATES` / `CARD_LIBRARY` | 75 张卡牌定义，desc 用「技能：」分隔被动/主动 |
| `game-state.js` | `gameState` / `initPlayerDeck` / `getUnitsAt` / `canAddUnit` / `getForwardDelta` / `getOwnCastleRow` / `createMirrorUnit` / `addUnit` / `popUnit` / `discardCard` | 全局状态 + 卡组生成 + 工具函数 |
| `battle-engine.js` | `applyDamageWithSource` / `absorbUnitShield` / `recalcShieldValue` / `getExternalShieldTotal` / `triggerChainedHunterImmunity` / `applyRedirectTargetDefense` / `performAttack` / `removeUnit` / `hunterExecute` / `triggerPlagueDeath` / `tryUseShieldToAbsorb` / `tryYangYuhuanDefend` | 伤害计算链 / 护盾来源消耗 / 替伤防御 / 秒杀 / 死亡 |
| `skill-charge.js` | `resolveAxemanCharge` / `resolveCrossbowCharge` / `resolveHeavyAxemanCharge` / `resolveHalberdierCharge` / `performSpearmanThrustEffect` / `resolveCounterBrace` | 蓄力释放 + 突刺 + 蓄势爆炸 |
| `skill-active.js` | `consumeNerdJamPending` / `purifyAllFriendly` | 行动干扰消耗 + 净化 |
| `skill-config.js` | `SKILL_DEFS` / `getSkillBtnText` / `checkSkillPrerequisites` / `isControlImmune` / `isDisplacementImmune` / `applyEffect` / `useSelectedUnitSkill` / `startDeclarativeSkill` | 声明式技能系统 + 效果执行器（含 knightKill/kill/斩月防御检查） |
| `game-flow.js` | `tryMoveUnit` / `placeUnit` / `startTurn` / `endTurn` / `releaseMotorcyclist` / `showSelect` / `showConfirm` | 移动（含机车党碰撞）/ 放置 / 回合 / 机车党蓄力 |
| `equipment.js` | `EQUIPMENT_LIBRARY` / `initUnitEquipmentFields` / `revivePendingUnits` / `onTurnStartEquipment` / `showEquipmentShop` / `openEquipmentShop` / `aiBuyEquipment` / `aiActivateEquipmentSkills` | 14 件装备 + 商店 + 复活 + AI |
| `decks.js` | `PRESET_DECKS` / `resetGame` / `showGameModeSelect` / `showAISetup` / `showDeckBuilder` | 5 套预选卡组 + 游戏重置 + 模式选择 |
| `targeting.js` | `getSkillTargetableUnits` / `handleCellClick` / `dispatchSkillTarget` | 目标过滤 + 棋盘点击分发 |
| `ui.js` | `renderUI` | 全量渲染（末尾挂载教程高亮 applyTutorialHighlight） |
| `ui-overlay.js` | `showPokedex` / `showPokedexDetail` / `showTutorial` / `startBeginnerTutorial` / `BEGINNER_TUTORIAL_STEPS` / `tutorialAllowAction` / `tutorialBlock` / `openTestPanel` / `onGlobalKeydown` / `showMatchRecap` / `calculateMVP` | 图鉴 / 教程（静态速查 + 新手引导）/ 教程白名单 / 测试 / 快捷键 |
| `ai.js` | `aiTakeTurn` / `aiPlaceCards` / `aiUseUnits` / `aiTryAttack` / `aiTryMove` / `aiTrySkill` / `aiEstimateDamage` | AI 决策全链路 |
| `main.js` | `startGame` | 入口（模式选择 → 新手教程 / 各模式 → resetGame） |

---

## 四、护盾来源系统（核心机制）

### 4.1 数据结构

| 字段 | 含义 |
|------|------|
| `nativeShieldValue` | **自带护盾**（仅枷锁猎手出场=2，复活重新获得） |
| `externalShieldSources` | **外来护盾**：`{ [来源单位id]: 数量 }`，按来源独立追踪 |
| `shieldValue` | 总护盾 = 自带 + 外来总量（由 `recalcShieldValue` 维护） |
| `braceShield` | 反击兵「蓄势反击」护盾（独立字段，优先消耗） |
| `magicShieldValue` | 暗影纱法术护盾（只挡法伤） |

### 4.2 外来护盾规则（护援兵）

- 护援兵瞬移：对同格友方和自己 +2 外来护盾。
- **每个护援兵来源独立上限 2**：同一护援兵反复释放刷新为 2，不同护援兵各自可叠加（如枷锁猎手自带2 + 护援兵A外来2 + 护援兵B外来2 = 总6）。
- 外来护盾被消耗后，同一护援兵再次释放可补回 2。

### 4.3 护盾消耗顺序（applyDamageWithSource）

```
反击兵蓄势护盾(braceShield) → 外来护盾 → 自带护盾 → 暗影纱法术护盾
```
- 真伤（isUnblockable=true）跳过所有护盾。
- 枷锁猎手**自带护盾破碎**时触发绝对免疫（`triggerChainedHunterImmunity`：免疫2小回合 + 永久移速+1 攻速+1），多余伤害忽略；仅消耗外来护盾不触发。
- 秒杀（4条路径）破自带护盾并保留外来护盾。

### 4.4 初始化/清理同步点

新增单位字段时，以下位置必须同步（`externalShieldSources: {}` 等）：
`game-flow.js placeUnit` / `game-state.js createMirrorUnit` / `battle-engine.js revive & reviveCat` / `equipment.js revivePendingUnits` / `skill-config.js assimilate(同化) 清理`。

---

## 五、伤害计算链（applyDamageWithSource 完整顺序）

1. 镜像幽灵实体无敌（isMirror 直接返回）
2. 来源装备增伤（星痕之杖法伤×1.5 / 妖刀低血物伤×2 / 雷刃每2次攻击闪电）
3. 目标减伤（碎镜×0.7 / 虚无之衣-1，真伤无视）
4. **绝对免疫** → 完全免疫
5. **无敌** → 受伤但不死（生命最低1 + pendingDeath，不消耗护盾）
6. 反击兵蓄势护盾 → 每吸收1点 counterBonus+1
7. **护盾抵消**（外来→自带，真伤无视；枷锁猎手破盾→免疫+忽略多余）
8. 暗影纱法术护盾（真伤无视）
9. 手牌护盾（可格挡伤害才询问）
10. 血舞防御（消耗额外攻速抵消）
11. 旗手庇护（免疫物伤，原目标）
12. **守卫/盾兵替伤** → 替伤者自身防御结算（见第六章）
13. 法伤减免（爱妃光环/魔女庇护）
14. 旗手庇护（替伤者）
15. 纱琳定身增伤+1
16. 麻木者被动（每次只减1）
17. 替罪羊替死
18. 护身符（免疫致死）
19. 绫罗护体（回绫罗）
20. 实际扣血 → 击杀归属/血魔指环吸血/断脊追加/冰痕冰冻

---

## 六、守卫/盾兵替伤防御结算

替伤发生后调用 `applyRedirectTargetDefense(actualTarget, amount, ...)`，替伤者（守卫/盾兵）自身的防御**逐项正常生效**：

```
碎镜减伤 → 虚无之衣 → 绝对免疫 → 无敌 → 蓄势护盾 → 护盾(外来→自带，含枷锁破盾) → 暗影纱 → 手牌护盾
```
- 全部挡下则结束；剩余伤害才继续后续（纱琳增伤/麻木者/替罪羊/护身符/绫罗/扣血）。
- 真伤不触发替伤（`!effectiveUnblockable` 内）。
- 守卫/盾兵自身不再触发替伤（findGuardToAbsorb/findShieldGuardToAbsorb 排除同名卡），无递归风险。

---

## 七、秒杀/斩杀防御检查顺序（4条路径统一）

**骑士秒杀（knightKill）/ 猎人亡语秒杀（hunterExecute）/ 斩月斩杀（zhanYue）/ kill 效果**，检查顺序必须一致：

```
绝对免疫（免疫）→ 无敌（life=1 + pendingDeath，无敌结束后死亡）→ 绫罗护体（回绫罗）→ 枷锁猎手自带护盾（破盾免疫）→ 麻木者（只掉1血）→ 直接死亡
```

- **无敌免疫秒杀**（1.01 修复）：酒鬼「免疫死亡」现在对秒杀也生效，无敌结束后才死亡。
- **麻木者**（1.01 修复）：斩月/kill 补齐了「只掉1血」检查；新增「不能被治疗」（heal效果/号角恢复/血魔指环吸血/甘泉回复均无效，穿戴装备的+生命上限类增益不受影响）。
- 斩月斩杀对「未杀死」的分支（绝对免疫/无敌/绫罗/枷锁破盾/麻木者掉血）保留标记，下回合可再斩。

---

## 八、真伤（isUnblockable=true）规则

真伤跳过：**护盾吸收 / 血舞防御 / 守卫替伤 / 盾兵替伤 / 替罪羊替死 / 手牌护盾**。
真伤不跳过：绝对免疫 / 无敌 / 麻木者 / 旗手庇护（免疫类效果）。
统一入口：`applyDamageWithSource(target, amount, source, true, dmgType)`。

真伤来源：戟兵普通攻击与横扫(3真伤)、追刃追击、超雄献祭、巫师伤害转移、断脊（物伤非真伤，注意区分）。

---

## 九、机车党（新增角色）

| 属性 | 值 |
|------|------|
| 等级/费用 | 2级 / 2费 |
| 生命/伤害 | 3血 / 0物伤（射程1 移速1） |
| 被动 | 自由移动（不受"只能向前"限制）、可与敌方重合、每次主动移动走进敌方所在格时对同格所有敌方造成1物伤（不算攻击、不消耗攻击次数） |
| 技能 | 蓄力1/2/3回合，蓄力完成的回合移速+3/6/9（仅该回合） |

蓄力规则：
- 点击技能进入蓄力（`motCharging=true, motChargeTurns=1`），蓄力期间不能移动/攻击。
- 每个我方回合开始弹窗「继续蓄力 / 释放」（AI 自动继续蓄力至3回合）；蓄满3回合自动释放。
- 释放回合移速 = 1 + 3×蓄力回合数（4/7/10），`motReleaseTurn=true` 本回合不能再蓄力。
- **被眩晕/定身/沉默中断蓄力；被位移不中断**（位置改变蓄力继续）。
- 状态字段：`motCharging` / `motChargeTurns` / `motReleaseTurn`（placeUnit 初始化、startTurn 结算、复活/同化清理）。
- 碰撞伤害走完整伤害链（可被护盾/减伤抵消、可触发击杀归属；fromSkill:true 排除禁疗/断脊/雷刃/冰痕类攻击专属效果）。

---

## 十、装备系统（14件）

| 装备 | 费用 | 效果 |
|------|------|------|
| 复活甲 💀 | 3 | 死亡后下个我方回合满血复活（仅一次）；枷锁猎手复活重新获得自带2护盾 |
| 星痕之杖 ✨ | 3 | 法术伤害×1.5（向上取整） |
| 暗影纱 🧥 | 1 | 每回合获得1点法术护盾（只挡法伤，真伤无视） |
| 护身符 🔮 | 3 | 免疫一次致死伤害（不免疫秒杀） |
| 妖刀 🗡️ | 3 | 对生命≤50%的敌人物伤×2 |
| 碎镜 🌌 | 2 | 主动激活：永久减伤30%（向下取整） |
| 血魔指环 💍 | 2 | 造成伤害回复一半生命（禁疗/麻木者无效） |
| 霜痕 ❄️ | 2 | 生命及上限+1，下次攻击冰冻命中敌人 |
| 雷刃 ⚡ | 2 | 每攻击2次对被攻击者及周围随机敌方各1法伤 |
| 苍鹰之羽 🪶 | 3 | 攻击次数+1，每回合首次普攻必中（无视手牌护盾及代为承受） |
| 甘泉 💧 | 3 | 生命×1.3；未受伤则回合回血15%（禁疗/麻木者无效） |
| 虚无之衣 🫥 | 3 | 生命上限>4时受伤-1 |
| 断脊 🦴 | 3 | 普攻额外造成目标上限15%物伤 |
| 凝血之刃 🩸 | 2 | 物伤+1；被攻击的敌人永久禁疗 |

- 开局无需战前选择，14 件全部默认进入商店。
- 复活（revivePendingUnits）在 startTurn 单位重置块**之前**执行。
- AI：`aiBuyEquipment`（买最贵）+ `aiActivateEquipmentSkills`（自动激活碎镜）。

---

## 十一、新手引导教程（模式选择并列入口）

- 入口：模式选择页「🎓 新手教程」按钮（返回按钮已删除）。
- `main.js`：选教程 → `await startBeginnerTutorial()` → 结束后回到模式选择。
- 13 步实操引导（欢迎→棋盘→费用→放置→移动→攻击→放旗手→用技能→结束回合→对手回合→装备商店→机制速览→完成），演示局面为蓝方视角、无限费、装备齐全。
- **回顾**：`step`（实际进度，轮询检测）/ `viewStep`（展示步骤）。「上一步」只回看说明，「回到当前步骤」一步跳回；回顾中暂停检测。
- **操作白名单**：每步声明 `allowedActions`（place/move/attack/skill/endTurn/shop），`tutorialAllowAction()` 判定；非教程放行、回顾中一律拦截。拦截入口：placeUnit / tryMoveUnit / performAttack / attackBase / useSelectedUnitSkill / endTurn / openEquipmentShop / resetGame / showTutorial / Alt+Q；教程中隐藏弃牌、爆牌、无中生有/鼠疫「用」按钮与非当前步骤的技能按钮。
- **面板避让**：步骤可声明 `panelPos: 'bottom'`（高亮在页面顶部时面板放底部），进入步骤自动 `scrollIntoView` 到教学区域中心。
- 教程状态：`tutorialState` / `tutorialTimer` / `tutorialResolve`（全部在 ui-overlay.js）。
- 静态速查教程 `showTutorial`（局内「📘教程」按钮）：普适机制版（伤害类型/护盾/蓄力/控制/免疫/真伤/嘲讽/增益减益 + 通用FAQ）。

---

## 十二、远程联机系统（PeerJS P2P · 主机权威）

### 12.1 架构

- 模式选择页「🌐 远程联机」→ `showOnlineSetup()`（decks.js）：房主**选择卡组模式（全卡池/预设卡组）与阵营（蓝方先手/红方后手）**后创建房间（6位房间码，支持一键复制，peer id 前缀 `das-101-`）；加入者输入房间码连接。
- **主机权威**：房主运行全部游戏逻辑；客机只渲染状态 + 发送操作指令。双方使用房主选择的同一套卡组。
- 依赖：PeerJS CDN（jsdelivr）+ PeerJS 免费信令服务器（0.peerjs.com）。加载失败时入口提示（`typeof Peer === 'undefined'` 检查）。
- 所有核心在 `js/network.js`，全局状态 `networkState`（hostSide 由房主选择，通过 init 消息同步给客机）。

### 12.2 消息协议（DataChannel reliable）

| 消息 | 方向 | 内容 |
|------|------|------|
| `init` | 主机→客机 | 开局快照（gameState + lastDamageDealer + infiniteManaEnabled）+ hostSide + 日志 |
| `action` | 客机→主机 | 操作指令：cellClick（带 cardIdx/unitId）/ unitClick / skill / endTurn / shop / pop / discard / riluoReturn / mirrorAttack / mirrorSwap / equipSkill / confirmSkill / cancelSkill / skipGlide / cancelMirrorAttack |
| `state` | 主机→客机 | 状态快照 + 日志增量 + 棋盘特效（浮动伤害/受击闪白/攻击闪白/光束，客机重放）。（主机 renderUI 后 dirty 标记，**0ms 微任务即时推送 + 200ms 轮询兜底**；快照经精简：手牌/牌堆/预牌堆卡对象压缩为 `{n,d,db,dt}` 由 CARD_LIBRARY 本地恢复、matchEvents 剔除、**isModalOpen 恒置 false**（弹窗互斥锁是本地 UI 状态，跨端同步会挡住对方端弹窗——曾导致巫师转移选择等连续弹窗第二步被自动取消），实测体积 -81%） |
| `fx` | 主机→客机 | **即时提示**（toast/连杀特效）：主机 `networkToast` 立即发送，客机 `networkReplayFx` 重放——不依赖快照循环，延迟更低 |
| `prompt`/`answer` | 双向 | 远程弹窗请求/应答（kind: confirm/select/prepick） |
| `gameover`/`bye` | 双向 | 游戏结束通知 / 主动退出 |

### 12.3 弹窗远程转发

- `showConfirm`/`showSelect`/`showPrepickPanel` 开头检查：联机中且弹窗**决策方**是远程玩家 → `networkRequestPrompt` 转发，对方本地弹窗（`*Local` 版本），选择结果 `answer` 回传；转发期间 `isModalOpen=true` 锁定主机操作。
- 决策方默认 `gameState.turn`；防御弹窗（手牌护盾/血舞防御）在 `tryUseShieldToAbsorb`/`tryYangYuhuanDefend` 弹窗前设置 `networkPromptSide = target.side` 覆盖。
- **转发只在主机端发生**：`networkShouldForwardPrompt` 要求 `networkIsHost()`——客机端任何弹窗永远本地显示（曾因客机端调用转发版 showConfirm 导致其确认窗口被转发到主机弹出）。
- 弹窗函数拆分为 `showXxx`（转发检查）+ `showXxxLocal`（本地实现），AI 自动响应逻辑保留在 Local 版本；客机本地主动弹窗（乐观结束回合等）必须使用 `*Local` 版本。
- **结束回合乐观化**：客机点结束回合时本地完成「确认结束 + 选预牌」两个弹窗（用快照中的 prepool），把 `{confirmed, prepick}` 随 `endTurn` 指令一次直达主机，`endTurn(preselected)` 跳过两个弹窗，节省 4 个网络往返。预牌堆为空时不带 prepick（主机补牌后走正常转发）；手牌满时主机仍走 `discardForNewCard` 转发（正常降级）。

### 12.4 操作入口拦截（客机回合转发）

- `networkGate()` 返回 `local`（本地执行）/ `forward`（客机转发）/ `block`（非自己回合只读）；`networkForward(action)` 是其便捷封装（block/forward 时返回 true，调用方直接 return）。
- **指令重放**：主机 `networkHandleAction` 执行客机指令时设置 `networkReplaying = true`（try/finally 复位），使入口闸门放行本地执行——否则重放会被"主机在客机回合只读"拦截吞掉（曾导致客机无法行动）。
- 拦截入口：handleCellClick（带选中状态）、handleUnitClick（ui.js 提取的共用入口）、技能/结束回合/装备商店/爆牌/弃牌/无中生有与鼠疫「用」按钮/绫罗回绫罗/镜中人攻击换位/装备主动技能/技能确认取消/滑步跳过按钮、Alt+E/Alt+Q 快捷键。
- 主机 `networkHandleAction` 重放指令：cellClick/unitClick 先注入 cardIdx/unitId 再执行。

### 12.5 装备商店远程化

- 客机回合点装备商店 → 主机 `showEquipmentShop` 的远程分支：远程弹窗选装备 → 远程弹窗选穿戴单位 → 主机扣费穿戴。主机回合走本地 UI 流程不变。

### 12.6 生命周期与禁用项

- 游戏结束（attackBase hp<=0）：主机 `networkNotifyGameOver` + `networkDisconnect`，双方回模式选择。
- 断线：conn close → `networkDisconnect` → `networkOnDisconnect` 回调（main.js 的 Promise resolve）→ 模式选择。
- 联机中禁用：测试模式、重新开局、新手教程入口（静态图鉴可用）。
- 右上角「🌐 退出联机」浮动按钮（`networkExitGame`）随时主动退出。
- 联机中 aiSide=-1，AI 逻辑不运行；无限费/测试模式不可用。
- 注意：随机（洗牌等）只在主机发生，通过快照同步，无需种子同步；房主可选蓝方（先手）或红方（后手），卡组模式可选全卡池或预设卡组（双方共用）。
- 已知简化：断线无重连（回模式选择）；PVP 无观战。

---

## 十三、费用系统

| 配置 | 值 |
|------|------|
| 蓝方初始费 | 3 |
| 红方初始费（后手） | 4 |
| 费用上限 | 15 |
| 每回合加费 | 1（第6大回合起 +2） |
| 国王修正 | 未受伤费-1，受伤费+1 |

---

## 十四、回合流程 startTurn 关键顺序（不能打乱）

1. 国王征税费用修正
2. 重置 attackedEnemyIds
3. 四眼仔行动干扰检测
4. 费用+1（第6大回合后+2）
5. 复活甲复活 revivePendingUnits
6. 回合开始装备效果 onTurnStartEquipment
7. 净化师清除负面
8. 双剑延迟攻击决议
9. 费机加费
10. 眩晕单位锁定
11. 魔女庇护检查
12. 火人同列免疫清理
13. 蓄力单位自动攻击（皮卡/弩手/皮卡超人/戟兵）
14. 单位状态刷新（蓄力已结算的单位跳过攻击次数重置——chargeResolved）
15. **机车党蓄力结算**（控制中断 / 弹窗继续或释放 / 释放回合移速+3N）
16. 武器商攻速翻倍
17. 全局状态递减（沉默/致盲/无敌/冷却/绝对免疫/号角/弱化/纱琳定身/旗手庇护）
18. 禁卫手牌禁用递减
19. 纱琳定身格递减

---

## 十五、绝对不能乱改的地方

1. **异步竞态 `aiGameId`**：递增计数器，AI 所有异步函数携带 myGameId 并在 await 后检查。
2. **弹窗 AI 自动响应**：showConfirm/showSelect/showPrepickPanel 的 aiActing 检查。
3. **嘲讽强制目标**：enforceAttackTarget / enforceSkillTarget。
4. **伤害类型分类**：canApplyBonus 物伤/法伤加成适用性（dmgValue=0 不受加成）。
5. **武器商攻速翻倍**：recheckAllWeaponSmithBuffs 在每次攻击/移动/技能后调用。
6. **四眼仔行动干扰**：新自主行动类型必须在入口调用 consumeNerdJamPending。
7. **纱琳定身格**：位移后必须 applyShaLinCellBinding。
8. **控制检查顺序**：绝对免疫 → 霸体 → 火人同列免疫 → 纱琳定身 → 横扫蓄力。
9. **真伤跳过链**：见第八章，不要破坏。
10. **秒杀防御检查顺序**：见第七章，新增秒杀来源必须按该顺序加检查。
11. **护盾初始化同步点**：见 4.4，新增单位创建路径必须初始化护盾字段。
12. **startGame await**：所有 startGame() 调用必须 await。
13. **教程拦截**：新增操作类型若会破坏教程流程，须接入 tutorialAllowAction 白名单。
14. **蓄力状态字段**：新增蓄力类角色需同步 placeUnit/startTurn/复活/同化四处。
15. **联机指令链路**：新增玩家操作入口时，客机回合必须走 `networkSendAction`（handleCellClick/handleUnitClick/各按钮/快捷键），主机 `networkHandleAction` 增加对应重放分支；弹窗一律走 showConfirm/showSelect/showPrepickPanel（自动转发远程），不要绕过它们。
16. **联机弹窗决策方**：防御类弹窗（手牌护盾/血舞）必须先用 `networkPromptSide = target.side` 覆盖默认决策方。
17. **弹窗函数结构**：showConfirm/showSelect/showPrepickPanel 已拆为「转发检查 + Local 实现」，本地调用 Local 版本时要确保不走网络转发（防止递归）。

---

## 十六、开发约束

1. 最小化修改原则：每次只改必要行数。
2. 无框架：不能使用 import/export 或 npm 包。
3. 全局作用域：函数/变量名不可重复。
4. 加载顺序：index.html 的 script 顺序不可调整。
5. 异步安全：AI 异步函数必须携带 myGameId 并检查。
6. 状态清理：技能失败/取消必须 clearSkillTarget()。
7. 渲染同步：gameState 变更后必须 renderUI()。
8. 描述一致：改机制必须同步 cards.js desc（被动/主动用「技能：」分隔）与 skill-config.js desc。
9. 冷却规范：skillCooldown 用小回合数（偶数），描述用大回合（2小回合=1大回合）。
10. 卡牌注册同步：cards.js / skill-config.js / game-flow.js / decks.js（预选卡组 g2 池）/ ai.js / 图鉴描述必须同步。
11. 术语统一：「城池」（非基地）、「城池行」；教程文案不得出现旧术语。
12. 版本号：改动发布时同步 index.html（3处）与 decks.js 标题。
13. 发布前核对：每次发布前运行 `check.ps1`（语法检查）并更新本文档中的统计数字（代码行数/卡牌数/装备数/技能数），数字标注"约"字。
14. 版本控制：项目已启用 Git（Dark Age Saga 目录），远程仓库 `https://github.com/BOLLSA/DAS`（origin/main）。日常流程：`git add -A` → `git commit -m "改动说明"` → `git push`；本机 TLS 后端已设为 openssl（受限环境下 schannel 无法获取凭据）。重要改动提交时写明变更摘要；`.gitignore` 已排除 `_check.log` 等临时文件。
15. 正式版发布：当一次更新完全成熟后，运行 `publish.ps1 -FolderName "Dark Age Saga<描述>"` 把干净拷贝（**不含 .git**）发布到 `C:\Users\WhereIt\Desktop\DAS\正式版本\1.01\` 下，并同步更新 DAS 根目录的交接文档。脚本会拒绝覆盖已存在的同名文件夹；发布前先跑 `check.ps1` 并完成一轮手动回归。

---

## 十七、用户工作习惯

- 中文交流，助手以中文回复。
- 修改前先确认规则和逻辑约束。
- 修改后提供修改前后行为对比。
- 发现问题立即报告，迭代调试。
- 要求主动发现并提出潜在问题。
- 角色机制修改会提供详细规格，严格按规格实现。
- 修改完成后核对所有角色描述与实际机制一致。
- 装备相关修改需同步战斗引擎和 AI 评估。

---

## 十八、修改后的验证方法

### 17.1 语法检查（必做）

```bash
node --check js/cards.js
node --check js/game-state.js
node --check js/battle-engine.js
node --check js/skill-charge.js
node --check js/skill-active.js
node --check js/skill-config.js
node --check js/equipment.js
node --check js/game-flow.js
node --check js/decks.js
node --check js/targeting.js
node --check js/ui.js
node --check js/ui-overlay.js
node --check js/ai.js
node --check js/main.js
```

### 17.2 功能验证（必做）

1. VS Code Live Server 打开 index.html。
2. 全卡池双人对战完整一局：放置/移动/攻击/技能/结束回合/攻击城池。
3. 人机对战（简单+困难）：重点观察机车党、枷锁猎手、护援兵、反击兵、麻木者、酒鬼。
4. 测试模式（🧪）快速添加手牌验证改动。
5. 装备商店：14 件装备购买/穿戴/效果触发；凝血之刃 2 费。
6. 新手教程完整走一遍（含回顾、拦截、S10 商店、完成退出）。
7. 图鉴：75 张卡描述与实际机制一致（被动/主动分区正确）。

### 17.3 重点回归清单

- [ ] 外来护盾先于自带护盾消耗；护援兵按来源独立上限2。
- [ ] 枷锁猎手：破盾免疫仅由自带护盾破碎触发；秒杀破盾；复活重新获得护盾。
- [ ] 真伤无视护盾与减伤，但仍被绝对免疫/无敌/麻木者/旗手庇护拦截。
- [ ] 守卫/盾兵替伤时自身护盾与减伤正常结算。
- [ ] 麻木者：所有伤害（含秒杀）只掉1血；不能被治疗。
- [ ] 酒鬼无敌：免疫秒杀（life=1+pendingDeath，无敌结束后死亡）。
- [ ] 机车党：自由移动/重合碰撞/蓄力1-3回合/控制中断/位移不中断/释放回合禁蓄力。
- [ ] 新手教程：模式选择入口、上一步回顾、操作白名单拦截、面板避让遮挡。

---

## 十九、1.01 版本主要变更记录

| 变更 | 说明 |
|------|------|
| 护盾来源系统 | 外来/自带分离，按来源（护援兵）独立上限2，外来先消耗 |
| 真伤修正 | 真伤正确无视所有护盾（含暗影纱） |
| 秒杀统一 | 四条秒杀路径统一防御检查顺序；补齐斩月/kill 的枷锁猎手与麻木者检查 |
| 无敌修正 | 无敌（酒鬼）免疫秒杀，无敌结束后延迟死亡 |
| 麻木者 | 补齐斩月/kill 只掉1血；新增不能被治疗 |
| 替伤修正 | 守卫/盾兵替伤时自身护盾/减伤/免疫/无敌正常结算 |
| 机车党 | 新角色：自由移动/重合碰撞/三段蓄力 |
| 新手教程 | 模式选择并列入口、13步实操引导、回顾、操作白名单 |
| 远程联机 | PeerJS P2P 主机权威：房间码匹配、指令转发、弹窗远程选择、装备远程购买、断线回退 |
| 凝血之刃 | 费用 3→2 |
| 枷锁猎手复活 | 复活甲复活重新获得自带2护盾 |

---

## 二十、更新日志

- 每次改动的明细记录在独立文件 **`Dark Age Saga更新日志.md`**（与本文档分开维护，最新改动在最上方）。
- 最近一次：**8 个单位改名**（国王/禁卫/参谋/暴食者/旋斧人/巫师/护援兵/纱琳，含英文标识同步），详见更新日志顶部。
- 注意：改名涉及英文标识（如 `shaLinBind`、`huYuanBingTeleport`、`kingCostMod`、`hasCanMou`、`applyShaLinCellBinding`、`jinWeiDisable` 等），联机快照与本地逻辑共用同一套标识，改动时需保持一致。
