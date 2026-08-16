# Dark Age Saga 更新日志

> 本文件独立记录每次改动的明细，与交接文档分开维护。
> 最新改动在最上方。

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
