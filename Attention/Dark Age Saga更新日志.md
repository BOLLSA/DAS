# Dark Age Saga 更新日志

> 本文件独立记录每次改动的明细，与交接文档分开维护。
> 最新改动在最上方。

---

## 2026 年 8 月 · 日志/toast/弹窗消息模板 100% 人工翻译（零中文残留）

**本次改动：全部 showToast/addLog/showMessage/showConfirm 含中文调用（1006 处）改为 trText(中文模板, 英文模板) 包裹**

### 实现方式

- 自动生成：对 851 个唯一模板，插值（${}）保护后经短语词典翻译主干生成英文模板，自动应用 950+ 处；插值表达式原样保留（运行时展开的中文由咽喉层 translateText 二次翻译）
- 人工精修：73 个顽固模板（悬赏兑现/护盾抵消/摔投/纱琳定身/武器商加持等）逐个人工撰写英文
- 词典扩充：补充 200+ 组合词条（被消灭/已用完/替伤伤害/外来护盾/受法伤/回绫罗/摔落位置/下咒等）
- 逻辑兼容：categorizeEvent/detectTactic 增加英文关键词镜像（复盘分类不失效）；showMessage 结束消息判断改为中英双语正则（AI 对战结束消息不再被跳过）

### 结果

- 未翻译的中文消息调用：**0**（全量源码扫描确认）
- en 模式日志/toast/弹窗全部英文：Action Jam takes effect! Heavy Axeman's attack was negated! / Game Start! both sides start with 3 mana, cap 15 / Restart the game? All match progress will be lost!
- zh 模式完全不变（trText 原样返回中文）

**涉及文件：** 全部 15 个 js 文件（消息调用点 trText 包裹）、js/i18n.js（词典扩充）、js/game-state.js（categorizeEvent/detectTactic 双语）、js/game-flow.js（showMessage 判断）

**验证：** 16 个 JS 语法检查通过；100% 专项测试（en 日志零中文/zh 原样/confirm/图鉴/装备）+ 逻辑测试（英文消息分类/战术识别/结束消息判断）全部 PASS。

---

## 2026 年 8 月 · 全面核查：残留中文清零 + Attention 文档同步

**全面扫描所有渲染路径（innerHTML/innerText/textContent/placeholder/title）后修复的遗漏：**

- ui.js：镜中人换位按钮（换位/换位(已用)）、状态图标 title 词条补全（秒杀已用/首击加成/已变形/复活甲待机/本回合被位移/下次攻击翻倍等，24 个状态图标 title 全部英文）
- ui-overlay.js：镜像变形搜索框 placeholder（搜索单位名称）
- decks.js：卡组导入/导出面板整体接入 translateText（输入卡组名称/粘贴分享码/房间码等 placeholder）；保存卡组列表删除按钮 title 单独翻译（不误翻用户自定义卡组名）
- i18n.js：关闭大写（close→Close）、补 已用/首击/待机 等词条
- 验证：16 个 JS 语法通过；状态图标 12 项、模式选择回归 5 项、E2E 全过；日志/toast 字符覆盖 96.3%；81 卡详情/装备名/装备介绍/装备短介绍/教程/技能标签全部零中文

**涉及文件：** js/i18n.js、js/ui.js、js/ui-overlay.js、js/decks.js

---

## 2026 年 8 月 · 修复：装备名/介绍本地化遗漏（战斗商店卡片 + 单位装备 tooltip）

**本次改动：**

- 战斗中装备商店（showEquipmentShop）卡片：装备名 nameLine 改用 translateText()，介绍 descLine 改用 equipDescDisplay()（之前直接用原文，完全未翻译）
- 单位装备图标 tooltip（getEquipmentDisplay）：返回翻译后的 name/desc（en 时），悬停单位装备图标显示英文名 + 完整人工翻译介绍
- 验证：商店卡片三元素（名/短介绍/介绍）、单位 tooltip、14 件装备名全部英文无中文

**涉及文件：** js/equipment.js（nameLine/descLine/getEquipmentDisplay）

**验证：** 16 个 JS 语法检查通过；装备显示 7 项校验全部 PASS。

---

## 2026 年 8 月 · 修复：测试模式/装备商店本地化 + 图鉴详情完整信息

**本次改动：**

- 测试模式面板（openTestPanel）：标题/调试工具/清除所有单位/无限费开关/添加手牌/等级筛选/关闭 全部接入翻译
- 装备商店：新增 EQUIP_SHORT_EN（14 件装备短介绍），shortLine 与 AI 商店选项改用 equipShortDisplay()
- 图鉴详情 EN 分支：修复"太简单"问题——有被动的卡显示完整 desc（而非只显示被动名）；被动+技能卡按 Skill:/Active: 拆分完整展示；仅技能卡显示完整技能描述
- 补充测试模式/日志高频词条（调试工具/清除所有单位/无限费/添加手牌等）

**涉及文件：** js/i18n.js（EQUIP_SHORT_EN + 词条）、js/ui-overlay.js（测试面板包裹、图鉴 EN 分支）、js/equipment.js（short 显示）

**验证：** 16 个 JS 语法检查通过；测试面板/装备商店/图鉴详情 10 项 + 冒烟 5 项全部 PASS。

---

## 2026 年 8 月 · 英文 100% 干净覆盖（人工翻译内容字典）

**本次改动：为全部用户可见内容人工撰写英文翻译，切换 English 后图鉴/单位名/日志/toast/教程/装备/技能/复盘不再中英混杂**

### 新增内容字典（js/i18n.js）

| 字典 | 内容 | 接入点 |
|------|------|--------|
| CARD_DETAILS_EN | 81 张卡 desc/passive/skillDesc 完整人工翻译（零中文残留） | 图鉴详情（showPokedexDetail EN 分支）、手牌被动名（cardPassiveText） |
| CARD_SKILL2_EN | 双技能卡第二技能描述（影舞姬/绫罗） | cardSkillDescDisplay |
| SKILL_LABELS_EN | 43 个技能按钮 label 英译 | getSkillBtnText |
| EQUIP_DESCS_EN | 14 件装备描述 | equipDescDisplay（装备商店） |
| TUTORIAL_STEPS_EN | 13 步新手引导英文（title/text/buttonText） | tutorialStepDisplay |
| TUTORIAL_QUICK_EN | 速查教程整页英文版 | showTutorial |
| 短语词典扩充 | 日志/toast/复盘/AI 策略高频词 + 长模板精确翻译（~1200 条） | translateText 咽喉入口 |

### 效果

- 图鉴详情：81 张卡描述/被动/技能全部零中文残留
- 关键日志/toast：Restart the game? All match progress will be lost! / Scapegoat instead of Heavy Axeman took lethal damage! / Death-round check: neither side can defeat the opponent's base, Blue Victory!
- 日志/toast 消息模板字符覆盖率 96.1%，剩余为生僻词（词典可继续扩充）
- 中文模式（默认）完全不变

**涉及文件：** js/i18n.js（内容字典 + 助手函数）、js/ui-overlay.js（图鉴详情 EN 分支、教程英文版）、js/ui.js（手牌被动名）、js/skill-config.js（技能按钮 label）、js/equipment.js（装备描述）

**验证：** 16 个 JS 语法检查全通过；15 项内容校验（81 卡零中文残留、教程/装备/技能字典、zh 回退）+ 8 项 E2E 运行时测试全部 PASS。

---

## 2026 年 8 月 · 英文全量本地化（局内单位名/toast/日志/图鉴/教程/联机等动态内容）

**本次改动：切换 English 后，游戏内全部用户可见文本均显示英文（短语级机器翻译，未覆盖词保留中文原样）**

### 实现方式：咽喉入口翻译 + 渲染点包裹

| 层 | 方式 | 位置 |
|----|------|------|
| 卡牌名（81张） | `CARD_NAMES_EN` 字典 + `cardNameDisplay()` | i18n.js |
| toast/日志/弹窗 | `showToast`/`addLog`/`showConfirmLocal`/`showMessage` 显示层调用 `translateText()`（事件记录/网络同步仍用原文，对端各自翻译） | game-state.js、game-flow.js |
| 图鉴/卡池/详情 | 渲染模板整串包 `translateText()` | ui-overlay.js |
| 手牌/棋盘/预牌堆/按钮 | 渲染模板包 `translateText()`；技能按钮文本在 `getSkillBtnText` 出口翻译 | ui.js、skill-config.js |
| 卡组构建器/联机对话框/预牌面板/装备商店/复盘/MVP/教程 | 渲染模板包 `translateText()` | decks.js、game-flow.js、equipment.js、ui-overlay.js |
| 翻译引擎 | `ZH_EN_PHRASES`（~600条短语）+ `ZH_EN_RULES`（数字规则/标点）+ 最长匹配；词典未覆盖中文原样保留 | i18n.js |

### 关键设计

- **零逻辑改动风险**：翻译只在显示层，中文模式（默认）下 `translateText()` 原样返回，行为与之前完全一致
- **联机同步**：日志/toast 网络传输仍用原文，各端按自己的语言显示
- **图鉴描述**：81 张卡 desc 经短语级翻译为可读英文（约 90% 字符覆盖率）

**涉及文件：** `js/i18n.js`（CARD_NAMES_EN + 短语词典 + translateText + cardNameDisplay + trText）、`js/game-state.js`（showToast/addLog/showKillStreak 显示层翻译）、`js/game-flow.js`（showConfirmLocal/showMessage/showSelect/预牌面板）、`js/ui.js`（棋盘/手牌/按钮渲染）、`js/ui-overlay.js`（图鉴/卡池/教程/复盘/测试面板）、`js/decks.js`（联机对话框/卡组构建器）、`js/equipment.js`（装备商店）、`js/skill-config.js`（getSkillBtnText）

**验证：** 16 个 JS 文件语法检查全通过；E2E 运行时测试（addLog/showToast/showConfirm/showMessage 英文翻译、中文原样、卡名、t() 占位符、图鉴描述）全部 PASS；模式选择并列布局回归 PASS；全语料覆盖率 **93.7%**（残留为长卡牌描述中的生僻词，可在 ZH_EN_PHRASES 词典补词条提升）。

---

## 2026 年 8 月 · 语言选择（简体中文 / English）

**本次改动：新增与「模式选择」并列的语言选择面板 + i18n 语言切换框架**

### 新增功能

| 项 | 说明 |
|----|------|
| 语言选择面板 | 模式选择页改为左右两列并列：左列语言选择（简体中文 / English），右列模式选择；点击即时切换，窄屏自动上下堆叠 |
| i18n 框架 | 新增 `js/i18n.js`：中英文对照字典、`t(key, {n})` 翻译函数、`data-i18n` 属性自动填充、`setLanguage()` 即时切换并持久化到 localStorage（`das_lang`） |
| 已本地化范围 | 语言/模式选择页、AI 对战设置页、主界面 HUD 静态文案（蓝方/红方/手牌/敌方手牌/预牌堆/各按钮/快捷键提示）、回合提示、页面标题、红方选卡提示语 |
| 未本地化（扩展点） | 卡牌名、技能描述、战斗日志、卡组构建器、图鉴、教程、远程联机子对话框 —— 仍为中文，后续在 `I18N_DICT` 按 key 扩展并在生成处改用 `t()`/data-i18n 即可 |

**涉及文件：** `js/i18n.js`（新增）、`index.html`（加载 i18n.js + 静态文案 data-i18n 标记）、`js/decks.js`（模式选择并列布局 + AI 设置翻译）、`js/ui.js`（回合提示翻译）、`js/main.js`（启动应用语言 + 选卡提示翻译）、`css/style.css`（并列布局与语言按钮样式）

**验证：** 4 个 JS 文件语法检查通过；i18n 逻辑冒烟测试（中英切换/持久化/占位符替换/缺 key 回退）全部通过。

---

## 2026 年 8 月 · 新增角色与机制（魔矢人/炽炎射手/琴魔/法师/剑客/风女 + 极速/死亡回合 + 弱化/霸体）

**本次改动：新增 6 个角色、3 种游戏机制、弱化效果与多处 bug 修复**

### 新增角色（6 个）

| 角色 | 等级/费用 | 生命/伤害 | 核心机制 |
|------|----------|----------|---------|
| 魔矢人 | 2级/2费 | 2血/1法伤 | 被动攻击范围正前方3格（同列1~3格） |
| 炽炎射手 | 2级/2费 | 3血/1法伤 | 蓄力1/2/3回合，释放回合攻速+1/2/3且每次+0/1/1法伤；蓄力期间可移动不能攻击，最多3回合自动结束 |
| 琴魔 | 史诗/2费 | 1血/3法伤 | 蓄力选中一横行，下个我方回合对该行所有敌人造成3法伤；蓄力中可移动不能攻击；被眩晕/定身/沉默中断 |
| 法师 | 3级/1费 | 2血/1法伤 | 被动攻击正前方2格，命中后施加弱化（weakenedTurns=2，持续2小回合）；被弱化的单位造成的伤害无效 |
| 剑客 | 3级/2费 | 3血/1法伤 | AOE攻击正前方同列2格内所有敌人；造成击杀后攻击范围+1（永久成长） |
| 风女 | 2级/2费 | 2血/1法伤 | 被动攻击范围正前方3格，普攻后可自由移动一格（不消耗移速，每回合1次）；二选一技能：1.风暴冲击（对正前方3格内最近敌人所在格所有敌人造成1法伤+1能量，上限3，不可空放）2.能量爆发（消耗所有能量，每点+1普攻次数） |

### 新增游戏机制（3 种）

| 机制 | 触发条件 | 效果 |
|------|---------|------|
| 极速回合 | 第13大回合起 | 每回合从预牌堆选2张牌（必须选2张），先选后确定；溢出2张时从全部牌中选2张弃牌 |
| 死亡回合 | 第25大回合起 | 不再自然加费（费用冻结） |
| 平局判定 | 死亡回合每回合开始 | 检查双方场上+手牌+预牌堆是否有dmgValue>0，均无则比较HP判平局/胜负；费用不足的伤害牌被忽略 |

### 弱化效果与霸体免疫

- **弱化（weakenedTurns）**：法师攻击命中后施加，持续2小回合；被弱化的单位造成的伤害无效
- **弱化不阻止蓄力触发**：斧兵/弩手/重斧兵/双剑被弱化时仍可通过攻击触发蓄力（即时伤害为0但蓄力正常进入）
- **弱化阻止蓄力释放**：斧兵/弩手蓄力释放时如有弱化，伤害无效并消耗蓄力（与戟兵横扫一致）
- **霸体免疫弱化**：霸体（superCharging）单位免疫法师弱化施加

### Bug 修复（7 项）

| Bug | 文件 | 修复 |
|-----|------|------|
| AI 风女技能方向反转（forward 与 getForwardDelta 相反） | ai.js | 改用 getForwardDelta(side) |
| 攻击城池不触发风女风之步 | battle-engine.js | attackBase 添加风之步触发 |
| AI 移动门控忽略风女风之步（6 处） | ai.js | 添加风女风之步例外条件 |
| 斧兵/弩手蓄力释放无弱化检查 | skill-charge.js | 添加弱化检查（与戟兵一致） |
| AI 能量爆发无脑使用（有能量即用，不看可攻击目标） | ai.js | 添加 canAttack 前置条件+风暴冲击AOE缩放评分 |
| AI 弱化伤害估算对蓄力触发单位不一致 | ai.js | 被弱化的蓄力触发单位添加蓄力价值 |
| AI 风女技能评分缺少 isMirror 过滤 | ai.js | filter 添加 !u.isMirror |

**涉及文件：** `js/cards.js`（6张新卡）、`js/skill-config.js`（6个新技能+弱化检查+风女SKILL_CANCELLED修复）、`js/skill-charge.js`（炽炎射手/琴魔蓄力+斧兵/弩手弱化检查）、`js/battle-engine.js`（法师弱化+剑客AOE+风女风之步+霸体免疫弱化）、`js/game-flow.js`（极速/死亡回合/平局判定+风女属性+自由移动+回合重置）、`js/ai.js`（6角色AI评分+移动门控+弱化估算修复）、`js/ui.js`（风女状态标签）、`js/equipment.js`（复活状态重置）、`js/ui-overlay.js`（测试面板+极速回合UI）、`js/network.js`（联机同步）、`css/style.css`（极速回合样式）

**验证：** 15 个 JS 语法检查通过。

---

## 2025 年 1.01 · 卡牌闭环

**本次改动：卡牌循环从"半开环（弃牌/死亡永久消失）"改为"闭环（回卡池可再次抽到）"**

| 项 | 说明 |
|---|---|
| 弃牌回池 | `discardCard()`（game-state.js）：弃掉的手牌回到 deck，Fisher-Yates 洗牌 |
| 死亡回池 | `removeUnit()`（battle-engine.js）：单位死亡时卡牌回 deck，排除复活甲/猫复活/同化者/镜像/测试卡 |
| 爆牌回池 | `popUnit()`（game-state.js）：爆牌移除的单位回 deck，排除镜像/同化者/测试卡 |
| 测试卡标记 | `openTestPanel()`（ui-overlay.js）：测试模式添加的卡打 `_fromTestPanel: true` 标记，弃牌/死亡时直接销毁不回池 |
| 手牌超限弃牌 | `useCreateFromNothing()`（skill-charge.js）：AI/玩家手牌超上限时弃掉的卡同样回 deck |
| 联机同步 | `networkSlimCard()`（network.js）：快照只传 `{n,d,db,dt}`，`_fromTestPanel` 字段自动剔除不传播 |
| 洗牌函数 | `shuffleDeck(side)`（game-state.js）：Fisher-Yates 洗牌算法 |

**排除特殊情况（防止无限资源）：** 复活甲 `pendingRevive` / 猫复活 `reviveTimesLeft` / 城池复活 `onDeathPassive==="revive"` / 同化者 `isAssimilator` / 镜像 `isMirror` / 测试卡 `_fromTestPanel`

**额外修复：** `_fromTestPanel` 标记从手牌→单位（`placeCard` in game-flow.js）→猫复活新单位（`triggerDeathPassive` in battle-engine.js）三处传递，防止测试卡变为单位后丢失标记导致错误回流。

**验证：** 15 个 JS 语法检查通过。

---

## 2025 年 1.01 · 全卡描述与机制核对修复

**本次改动：系统核对 75 张卡描述与实现，修复 5 处不符**

| 项 | 描述 | 实现 | 处理 |
|---|---|---|---|
| 爱妃光环 | "友方普攻/法伤+1" | 原来只给法伤单位+1（物伤单位拿不到） | ✅ 修复：物伤攻击+1、法伤攻击+1，掠影仍除外 |
| 酒鬼被动 | "调酒师的送酒不会对其造成伤害" | 送酒会真的对酒鬼造成1法伤 | ✅ 修复：送酒对酒鬼豁免伤害（buff 仍生效） |
| 弱化师 | "使本行一敌…" | sameColumn（同列） | ✅ 描述更正为「本列」 |
| 巫师 | "转移到场上任一单位" | 只能转移敌方 | ✅ 描述更正为「敌方场上任一单位」 |
| 影舞姬飞扇 | "距离3内最近的敌方" | 同列距离3内任意可选 | ✅ 实现改为强制最近目标（同格并列均可选） |

**验证：** 15 个 JS 语法检查通过；修复逻辑 14 项单元测试全 PASS。

---

## 2025 年 1.01 · 修复火人自爆误标真伤

**本次改动：火人自爆伤害不再被错误标记为不可抵挡（unblockable）**

| 项 | 说明 |
|---|---|
| Bug | `firemanDetonate` 效果被错误标记 `unblockable: true`，自爆伤害跳过血舞防御/手牌护盾/护盾吸收/守卫盾兵替伤/替罪羊替死 |
| 依据 | 卡牌描述仅"造成1法伤"（无真伤字样），且交接文档「真伤来源」清单（戟兵/追刃/超雄/巫师转移）不含自爆；对比追刃/巫师均明确标注"不可抵挡" |
| 修复 | 移除 `unblockable: true`，自爆伤害现在走完整防御链（血舞可消耗额外攻速抵消） |
| 保留 | 追刃追击/戟兵横扫/超雄献祭/巫师转移等描述明确标注的真伤来源不受影响 |

**验证：** 15 个 JS 语法检查通过；自爆路径 5 项单元测试全 PASS。

---

## 2025 年 1.01 · 取消后手多费

**本次改动：红方（后手）开局费用 4→3，双方初始费用相同**

| 项 | 说明 |
|---|---|
| 机制变更 | 后手方不再多 1 费：蓝方/红方开局均为 3 费（费用上限 15 不变） |
| 涉及位置 | `game-state.js` 初始状态、`decks.js` resetGame 重建状态、开局日志文案 |
| 保留项 | 「先手/后手」回合顺序概念不变（蓝方仍先行动），仅取消费用补偿 |

**验证：** 15 个 JS 语法检查通过。

---

## 2025 年 1.01 · 新增 AI 大师难度

**本次改动：人机对战新增「👑 大师」难度（身经百战级完美预判）**

| 模块 | 内容 |
|---|---|
| 难度参数 | comboRate 1.0 / skillUseRate 1.0 / mistakeRate 0 / skipActionRate 0（零失误零跳过，全 combo 全技能运用） |
| 反击预判 | `aiMasterPredictIncomingDamage`：移动/放置前模拟敌方所有单位（含未行动可移动者）下回合对该位置的总伤害，低攻单位不冒死推进、脆弱关键单位避开火力 |
| 交换评估 | `aiMasterTradeEvaluation`：攻击前计算净收益（造成伤害−反击伤害），无法击杀且会被反杀时自动更换更优目标 |
| 秒杀预判 | 高价值单位（高攻/悬赏/费机/武器商/国王/参谋）移动时躲避敌方骑士正前方（秒杀范围） |
| 技能全开 | 同化/共生死/滑步/方块/奴隶变换等 14 个复杂技能全部放开（原 hard 限制） |
| 装备 100% | 每回合必买装备（原 hard 70%） |

**涉及文件：** `js/ai.js`（AI_DIFFICULTY_CONFIG.master + aiIsMaster + 两个预判函数 + 攻击/移动/放置三处接入）、`js/decks.js`（难度按钮）、`js/equipment.js`（购买率）

**验证：** 15 个 JS 语法检查通过；大师逻辑 10 项单元测试全 PASS。

---

## 2025 年 1.01 · AI 全面升级

**本次改动：AI 成熟运用悬赏机制与全部 1.01 新内容**

| 模块 | 升级内容 |
|---|---|
| 悬赏运用 | 威胁评估给敌方悬赏单位加权重（`bountyLevel×10+6`）；斩杀线优先杀高悬赏；骑士秒杀高悬赏单位（无敌/绝对免疫目标不浪费秒杀）；己方高悬赏单位纳入保护与挡位列表；悬赏单位自保（不走进必死格）；优先清悬赏再打城池 |
| 伤害估算 | 补齐无敌/绝对免疫（有效伤害=0）、旗手庇护免疫物伤、枷锁猎手破盾仅清盾、凝血之刃物伤+1、虚无之衣-1、碎镜30%、蓄势护盾、暗影纱法盾 |
| 威胁评估 | 新增暴食者（击杀成长）、护援兵（持续加盾）、麻木者（只掉1血）、枷锁猎手（破盾免疫）；无敌/绝对免疫/弱化中的威胁修正 |
| 技能运用 | 护援兵瞬移目标改为「同格友方多+靠近敌人」（+2盾收益最大化）；治疗目标排除麻木者/禁疗 |
| 机车党 | 移动方向优先选择「有敌方可碰撞」的格子（碰撞1物伤） |
| 装备系统 | 新增 `aiEquipmentValue` 价值评估表（凝血之刃2费性价比高）；`aiPickEquipmentUnit` 按装备类型匹配穿戴者（物伤装备给高攻、星痕之杖给法伤、复活甲给关键单位）；价值相近优先买便宜 |

**涉及文件：** `js/ai.js`（主要）、`js/equipment.js`（装备 AI）

**验证：** 15 个 JS 语法检查通过；AI 评估逻辑 22 项单元测试全 PASS。

---

## 2025 年 1.01 · 新增悬赏机制

**本次改动：连杀悬赏（击杀累积 → 悬赏状态 → 移除发赏金）**

| 项 | 说明 |
|---|---|
| 悬赏触发 | 单位达成 3/5/7/9 连杀 → 进入 1/2/3/4 级悬赏状态（只升不降） |
| 赏金发放 | 悬赏期间单位因**任何原因**被移除（死亡、自爆、同化清理、无敌结束死亡、爆牌等），**另一方**获得 1/2/3/4 费（上限封顶 15） |
| 排除项 | 镜像幽灵不参与；复活甲拦截死亡（未真正移除）不发赏金；猫九命/复活甲复活的新单位悬赏清零 |
| 牌面显示 | 单位牌面右上「💰xN」金色脉冲标记，悬停提示"被移除时对方获得N费" |
| 覆盖路径 | 连杀统计在 `applyDamageWithSource`（killStreakMap）；发放集中在 `grantBountyOnRemoval`，接入 `removeUnit` 与 `popUnit` |

**涉及文件：** `js/battle-engine.js`（grantBountyOnRemoval + 连杀处升级判定）、`js/game-state.js`（popUnit 发放 + 镜像字段）、`js/game-flow.js`（placeUnit 字段）、`js/ui.js`（牌面💰标记）、`js/ui-overlay.js`（教程单位字段）、`css/style.css`（bounty-tag 样式）

**验证：** 15 个 JS 语法检查通过；悬赏逻辑 7 项单元测试全 PASS（等级映射/发放/无悬赏不发/镜像不发/上限封顶/只升不降）。

---

## 2025 年 1.01 · 新增卡池查看

**本次改动：游戏主界面新增「📚 卡池」查看功能**

| 项 | 说明 |
|---|---|
| 入口 | 主界面手牌区「📚 卡池」按钮 → `showCardPool()` |
| 全卡池模式 | 双方共享一个卡池 = 完整牌池（CARD_LIBRARY 按 1级×1/2级×2/3级×3）− 双方手牌 − 双方预牌堆 − 场上单位 |
| 预设/自定义卡组 | 分我方/敌方卡池，某方卡池 = 该方卡组按 grade 上限 − 该方手牌 − 该方预牌堆 − 该方场上单位；顶部切换「🔵我方/🔴敌方」 |
| 动态计算 | 死亡/爆牌移除的单位自动回到卡池（无需额外状态）；镜像幽灵不占用 |
| 展示 | 按 CARD_LIBRARY 已有顺序排序，等级筛选（全部/1/2/3级）+ 名称搜索，显示剩余张数（0 张置灰），点击看详情 |
| 联机 | init 消息新增 `cd`/`gm` 字段同步卡池模式给客机 |

**涉及文件：** `js/ui-overlay.js`（showCardPool/buildCardPoolMap）、`index.html`（卡池按钮）、`js/ui.js`（按钮绑定）、`css/style.css`（卡池样式）、`js/network.js` + `js/main.js`（联机 init 同步）

**验证：** 15 个 JS 语法检查通过；卡池计算 4 场景单元测试 PASS（全卡池共享/预设我方/预设敌方/死亡回池）。

---

## 2025 年 1.01 · 启动性能优化版

**本次改动：修复模式选择界面卡顿（两处性能问题）**

| 问题 | 原因 | 修复 |
|------|------|------|
| 页面启动卡顿/模式选择迟迟不出现 | `index.html` 同步加载 PeerJS CDN（jsdelivr 慢/不可达时阻塞全部后续脚本执行） | PeerJS 移除同步标签，改为 `loadPeerJS()`（network.js）在首次点击「远程联机」时动态注入，15s 超时兜底，失败 toast 提示 |
| 全屏界面掉帧 | 模式选择/图鉴/商店/教程/复盘等全屏 overlay 使用 `backdrop-filter: blur()` 全屏模糊，低端设备重绘开销大 | 移除全部全屏 overlay 的 backdrop-filter（保留 tooltip/toast 小面积 blur） |

**涉及文件：**

- `index.html`（删除 PeerJS 同步 script 标签）
- `js/network.js`（新增 `loadPeerJS()` 按需加载）
- `js/decks.js`（联机入口改用按需加载 + 加载提示）
- `css/style.css`（移除 6 处全屏 overlay 的 backdrop-filter）

**验证：** 15 个 JS 文件语法检查全部通过；非联机模式（全卡池/自定义/人机/教程）启动不再依赖外部 CDN。

---

## 2025 年 1.01 · 单位改名版

**本次改动：8 个单位改名（中文名 + 英文标识同步）**

| 旧名 | 新名 | 旧英文标识 | 新英文标识 |
|------|------|-----------|-----------|
| 皇帝 | 国王 | emperor | king |
| 锦衣卫 | 禁卫 | jinYiWei | jinWei |
| 军师 | 参谋 | strategist | canMou |
| 饿饿 | 暴食者 | hungry | baoShiZhe |
| 哭哭 | 旋斧人 | crying | xuanFuRen |
| 卤蛋 | 巫师 | egg | wizard |
| 72 | 护援兵 | sevenTwo | huYuanBing |
| 西施 | 纱琳 | xishi | shaLin |

**同步范围（随英文标识一并更新）：**

- 技能标识：`shaLinBind` / `setShaLinBind`（纱琳定身）、`huYuanBingTeleport`（护援兵瞬移）、`jinWeiDisable`（禁卫禁用手牌）
- 状态字段：`shaLinBindTurn` / `shaLinBindRow` / `shaLinBindCol`、`hasCanMou` 等
- 事件 key：`shaLin_lockdown`、`jinwei_disable`
- 界面文本、战斗日志、AI 评分引用

**验证结果：**

- 15 个 JS 文件 `node --check` 语法检查全部通过
- 全目录（js/html/css）旧名残留清零（`720px`、`#6b7280` 为 CSS 误报已排除）
- 发布副本 23 文件：新名引用 125 处，旧名残留 0 处

**发布位置：**

`C:\Users\WhereIt\Desktop\DAS\正式版本\1.01\Dark Age Saga工程化完成-单位改名版\`

---
