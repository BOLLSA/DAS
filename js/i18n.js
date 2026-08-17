// ========== 国际化 (i18n) — 语言选择 ==========
// 语言切换基础设施：与「模式选择」并列的语言选择面板 + 静态界面文案翻译。
//
// 用法：
//   1) 取翻译：t('key') 或 t('key', { n: 3 })（支持 {占位符} 替换）
//   2) 元素自动翻译：给元素加 data-i18n="key" 属性，applyI18n() 会按当前语言填充
//      需要 HTML 内容时用 data-i18n-html="1"；placeholder 用 data-i18n-placeholder="key"
//   3) 切换语言：setLanguage('zh' | 'en') —— 立即生效并持久化到 localStorage
//
// 当前已本地化范围：语言/模式选择页、AI 对战设置页、主界面 HUD 静态文案、回合提示。
// 游戏内动态内容（卡牌名、技能描述、战斗日志、卡组构建器、图鉴、教程等）
// 仍为中文 —— 后续可在下方字典按 key 扩展，并在对应生成处改用 t()/data-i18n。

    const I18N_DICT = {
        zh: {
            // ── 页面标题 ──
            'page.title': '黑暗中世纪1.01 - 双人对战战棋',
            'game.title': '⚔️ 黑暗中世纪 1.01',

            // ── 语言选择列（与模式选择并列） ──
            'lang.title': '语言',
            'lang.zh': '简体中文',
            'lang.zh.sub': '中文界面',
            'lang.en': 'English',
            'lang.en.sub': 'English UI',
            'lang.note': '切换即时生效，选择将自动保存',

            // ── 模式选择列 ──
            'mode.title': '请选择游戏模式',
            'mode.full': '📦 全卡池模式',
            'mode.full.sub': '使用全部卡牌组成卡组',
            'mode.custom': '🎯 自定义卡组模式',
            'mode.custom.sub': '双方各自挑选卡牌组成 100 张卡组',
            'mode.ai': '🤖 人机对战模式',
            'mode.ai.sub': '与 AI 对战，可选难度',
            'mode.online': '🌐 远程联机',
            'mode.online.sub': '与朋友实时对战（P2P，需网络）',
            'mode.tutorial': '🎓 新手教程',
            'mode.tutorial.sub': '带领新手了解完整游戏流程与基础玩法',

            // ── 主界面 HUD ──
            'hud.blue': '蓝方',
            'hud.red': '红方',
            'hud.hand': '手牌',
            'hud.enemyHand': '敌方手牌',
            'hud.prepool': '预牌堆 (回合结束选一张加入手牌)',
            'hud.endTurn': '结束回合 (喊"过")',
            'hud.shop': '装备商店',
            'hud.reset': '重新开局',
            'hud.test': '测试模式',
            'hud.tutorial': '教程',
            'hud.pool': '卡池',
            'hud.pokedex': '图鉴',
            'hud.clear': '取消选中',
            'hud.hint.select': '选手牌',
            'hud.hint.skill': '技能',
            'hud.hint.discard': '弃牌/撤回',
            'hud.hint.cancel': '取消',

            // ── 回合提示 ──
            'turn.bigRound': '第{n}大回合',
            'turn.blue': '🔽 蓝方回合',
            'turn.red': '🔴 红方回合',
            'turn.thinking': '🤖思考中...',

            // ── AI 对战设置 ──
            'ai.title': '🤖 人机对战设置',
            'ai.side': '选择你的阵营',
            'ai.blueSide': '🔵 蓝方（先手）',
            'ai.redSide': '🔴 红方（后手）',
            'ai.difficulty': '选择 AI 难度',
            'ai.diff.easy': '😊 简单',
            'ai.diff.normal': '😎 普通',
            'ai.diff.hard': '😤 困难',
            'ai.diff.master': '👑 大师',
            'ai.deck': '卡组设置',
            'ai.deck.full': '📦 全卡池',
            'ai.deck.preset': '📋 预设卡组',
            'ai.start': '⚔️ 开始对战',

            // ── 通用 ──
            'common.back': '↩️ 返回',
            'common.confirm': '确定',
            'common.cancel': '取消',
            'msg.handoff': '请将设备交给 🔴 红方玩家，红方开始选卡',
        },
        en: {
            'page.title': 'Dark Age Saga 1.01 - Two-Player Battle',
            'game.title': '⚔️ Dark Age Saga 1.01',

            'lang.title': 'Language',
            'lang.zh': '简体中文',
            'lang.zh.sub': 'Chinese UI',
            'lang.en': 'English',
            'lang.en.sub': 'English UI',
            'lang.note': 'Applies instantly and is saved automatically',

            'mode.title': 'Choose a Game Mode',
            'mode.full': '📦 Full Card Pool',
            'mode.full.sub': 'Play with the full card pool',
            'mode.custom': '🎯 Custom Decks',
            'mode.custom.sub': 'Each side builds a 100-card deck',
            'mode.ai': '🤖 VS AI',
            'mode.ai.sub': 'Battle the AI with selectable difficulty',
            'mode.online': '🌐 Online Multiplayer',
            'mode.online.sub': 'Real-time P2P battles with friends',
            'mode.tutorial': '🎓 Tutorial',
            'mode.tutorial.sub': 'Learn the full game flow and basics',

            'hud.blue': 'Blue',
            'hud.red': 'Red',
            'hud.hand': 'Hand',
            'hud.enemyHand': 'Enemy Hand',
            'hud.prepool': 'Pre-Pool (pick one at end of turn)',
            'hud.endTurn': 'End Turn (say "Pass")',
            'hud.shop': 'Equipment Shop',
            'hud.reset': 'New Game',
            'hud.test': 'Test Mode',
            'hud.tutorial': 'Tutorial',
            'hud.pool': 'Card Pool',
            'hud.pokedex': 'Codex',
            'hud.clear': 'Deselect',
            'hud.hint.select': 'Select card',
            'hud.hint.skill': 'Skill',
            'hud.hint.discard': 'Discard/Undo',
            'hud.hint.cancel': 'Cancel',

            'turn.bigRound': 'Big Round {n}',
            'turn.blue': "🔽 Blue's Turn",
            'turn.red': "🔴 Red's Turn",
            'turn.thinking': '🤖 Thinking...',

            'ai.title': '🤖 AI Battle Setup',
            'ai.side': 'Choose Your Side',
            'ai.blueSide': '🔵 Blue (First)',
            'ai.redSide': '🔴 Red (Second)',
            'ai.difficulty': 'Choose AI Difficulty',
            'ai.diff.easy': '😊 Easy',
            'ai.diff.normal': '😎 Normal',
            'ai.diff.hard': '😤 Hard',
            'ai.diff.master': '👑 Master',
            'ai.deck': 'Deck Setup',
            'ai.deck.full': '📦 Full Pool',
            'ai.deck.preset': '📋 Preset Decks',
            'ai.start': '⚔️ Start Battle',

            'common.back': '↩️ Back',
            'common.confirm': 'OK',
            'common.cancel': 'Cancel',
            'msg.handoff': 'Pass the device to the 🔴 Red player to build their deck',
        }
    };

    // 当前语言（默认简体中文，优先读取本地保存）
    let currentLang = (function () {
        try {
            const v = localStorage.getItem('das_lang');
            return (v === 'zh' || v === 'en') ? v : 'zh';
        } catch (e) { return 'zh'; }
    })();

    // 取翻译文本；缺 key 时回退中文，再回退原 key
    function t(key, params) {
        let s = I18N_DICT[currentLang] && I18N_DICT[currentLang][key] !== undefined
            ? I18N_DICT[currentLang][key]
            : (I18N_DICT.zh[key] !== undefined ? I18N_DICT.zh[key] : key);
        if (params) {
            for (const k in params) {
                s = s.split('{' + k + '}').join(String(params[k]));
            }
        }
        return s;
    }

    // 按当前语言刷新所有 data-i18n / data-i18n-html / data-i18n-placeholder 元素
    function applyI18n(root) {
        const scope = root || document;
        document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
        // 页面标题
        const titleKey = document.documentElement.getAttribute('data-i18n-title');
        if (titleKey) document.title = t(titleKey);
        scope.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (el.getAttribute('data-i18n-html') === '1') {
                el.innerHTML = t(key);
            } else {
                el.textContent = t(key);
            }
        });
        scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
        });
    }

    // 切换语言：立即生效 + 持久化
    function setLanguage(lang) {
        if (lang !== 'zh' && lang !== 'en') return;
        currentLang = lang;
        try { localStorage.setItem('das_lang', lang); } catch (e) {}
        applyI18n();
    }

    // 页面加载时应用已保存的语言（脚本位于 body 末尾，静态 HUD 元素已存在）
    applyI18n();

// ══════════════════════════════════════════════════════════════════════
// 动态内容翻译引擎（局内单位名 / toast / 日志 / 图鉴 / 卡池 / 技能 / 教程）
// 策略：在咽喉入口（showToast/addLog/showMessage/showConfirm）显示前调用
// translateText() 做短语级中→英转换；卡牌名/描述渲染点调用 cardNameDisplay()。
// 词典未覆盖的中文原样保留（绝不损坏原文与游戏逻辑）。
// ══════════════════════════════════════════════════════════════════════

    // ── 卡牌名英译（81 张） ──
    const CARD_NAMES_EN = {
        "重斧兵": "Heavy Axeman", "骑士": "Knight", "枷锁猎手": "Chained Hunter", "猫": "Cat",
        "爱神": "Cupid", "纱琳": "Shalin", "参谋": "Tactician", "血舞": "Blood Dance",
        "军营": "Barracks", "国王": "King", "斩月": "Crescent Blade", "公主": "Princess",
        "三刀": "Triple Blade", "火神": "Fire God", "影舞姬": "Shadow Dancer", "镜中人": "Mirror Mage",
        "赫菲斯托斯": "Hephaestus", "调酒师": "Bartender", "斧兵": "Axeman", "超雄": "Chad",
        "塞壬": "Siren", "号角兵": "Horn Blower", "弱化师": "Debuffer", "鹰眼": "Hawkeye",
        "中医": "Herbalist", "护援兵": "Shield Support", "机车党": "Motorcyclist", "武器商": "Arms Dealer",
        "追刃": "Chasing Blade", "双剑": "Twin Swords", "稻草人": "Scarecrow", "麻木者": "Numb One",
        "无中生有": "Out of Thin Air", "鼠疫": "Plague", "银运": "Silver Luck", "掠影": "Passing Shadow",
        "骷髅": "Skeleton", "双刀": "Dual Blades", "费机": "Mana Engine", "大力士": "Strongman",
        "魔女": "Witch", "暴食者": "Glutton", "反击兵": "Counter Guard", "同化师": "Assimilator",
        "魔矢人": "Arcane Archer", "炽炎射手": "Blaze Archer", "绫罗": "Ling Luo", "士兵": "Soldier",
        "弓箭手": "Archer", "蟑螂": "Cockroach", "猎人": "Hunter", "酒鬼": "Drunkard",
        "守卫": "Guard", "鼓手": "Drummer", "牛仔": "Cowboy", "催眠师": "Hypnotist",
        "净化师": "Purifier", "歌女": "Songstress", "显眼包": "Showboat", "通讯员": "Messenger",
        "护盾": "Shield", "狂战士": "Berserker", "盾兵": "Shieldman", "奴隶": "Slave",
        "巫师": "Wizard", "爱妃": "Consort", "禁卫": "Royal Guard", "风兵": "Wind Guard",
        "火人": "Fireling", "替罪羊": "Scapegoat", "费者": "Mana Spender", "旗手": "Banner Bearer",
        "弩手": "Crossbowman", "戟兵": "Halberdier", "四眼仔": "Four-Eyes", "旋斧人": "Axe Spinner",
        "标枪手": "Spearman", "琴魔": "Lute Demon", "法师": "Mage", "剑客": "Swordsman",
        "风女": "Wind Maiden"
    };
    // ── 卡牌完整英文描述（desc/passive/skillDesc 人工翻译，图鉴/手牌/技能按钮使用） ──
    const CARD_DETAILS_EN = {
        "重斧兵": { passive: "Super Armor Charge", desc: "Basic attacks auto-charge for 1 Big Round before attacking. While charging, gains Super Armor (immune to stun, silence and other control), but still takes damage. Cooldown: 1 Big Round", skillDesc: "" },
        "骑士": { passive: "Speed 2", desc: "Can move 2 tiles per turn. Skill: execute an enemy unit directly in front within 1 tile (once only). After using the skill, Speed drops to 1.", skillDesc: "Execute an enemy in front (once only)" },
        "枷锁猎手": { passive: "Deploy Shield", desc: "Deploys with 2 shield. When the shield reaches zero, gains 1 turn of absolute immunity (immune to all damage and execution), Speed +1, Attack Count +1 (permanent)", skillDesc: "" },
        "猫": { passive: "Nine Lives", desc: "Revives in place after death, up to 8 times", skillDesc: "" },
        "爱神": { passive: "", desc: "Skill: link the fates of any two units on the board (enemy or ally, excluding itself), once per turn, 2 uses total. The effect persists after Cupid leaves the board", skillDesc: "Linked Fate" },
        "纱琳": { passive: "", desc: "Skill: choose any tile on the board; root all enemies currently on it until the end of your next turn. Rooted enemies take +1 physical/magic damage. 2 uses, cooldown 2 Big Rounds", skillDesc: "Root" },
        "参谋": { passive: "Allies Move Freely", desc: "While on board, all allies can move in any direction (front/back/left/right)", skillDesc: "" },
        "血舞": { passive: "Kill: +Attack Count", desc: "Attack range 2. Each enemy kill grants +1 Attack Count. Passive: when damaged, a prompt appears; can spend 1 extra Attack Count to negate up to 2 damage", skillDesc: "Auto Damage Block" },
        "军营": { passive: "Gate Fortress", desc: "Can be placed on your gate row. Cannot move itself (can be displaced by ally skills). Friendly units can be placed within its 3x3 area", skillDesc: "" },
        "国王": { passive: "Tax", desc: "If the King takes no damage in a Big Round, your hand costs -1 next Big Round; if damaged, +1. Does not stack, never below 0", skillDesc: "" },
        "斩月": { passive: "", desc: "Skill: mark all enemies in the front two rows (stacks). From next turn, can execute marked enemies with HP <= 2. Each turn, choose mark OR execute. Marks persist", skillDesc: "Mark / Execute" },
        "公主": { passive: "Infinite Range", desc: "Infinite attack range. Cannot benefit from physical damage bonuses. When unblocked, can attack the enemy base from anywhere", skillDesc: "" },
        "三刀": { passive: "Triple Sweep", desc: "Attacks 3 times per turn; can target any enemy in the front row (3 tiles ahead); may repeat the same target", skillDesc: "" },
        "火神": { passive: "Range 2", desc: "Attack range 2. Skill: empower itself - this turn and the next two of your turns, Attack Range +1 and basic attacks become a 3-tile column AOE (hits the target tile and all enemies in the 2 tiles in front) (once only)", skillDesc: "Empower" },
        "影舞姬": { passive: "Glide", desc: "Can overlap enemy units. After using an active skill, can freely move 1 tile and deal 1 magic damage to all enemies on the landing tile (no move/attack cost). Skill: Flying Fan - deal 2 magic damage to the nearest enemy within 3 tiles directly ahead in the same column; Tornado Kick - move 2 tiles (any direction, can cast in place), deal 1 magic damage to all enemies in the landing row and stun them for 2 turns (each skill has its own 2 Big Round cooldown, once per turn; after using, cannot basic attack this turn and cannot enter the enemy castle)", skillDesc: "Flying Fan" },
        "镜中人": { passive: "Mirror", desc: "Can overlap enemies without counting toward the ally overlap limit. Basic attack: AOE against all enemies on a chosen tile (own tile or adjacent; can be wasted), then the mirror copies it once. Skill: spawn a mirror symmetrical across the Mid Line (once only). The mirror follows the owner's actions and attacks, cannot be targeted, and can enter the enemy castle. Once per turn, can swap positions with the mirror (deals 1 physical damage to enemies on the path, owner +1 HP)", skillDesc: "Spawn Mirror" },
        "赫菲斯托斯": { passive: "", desc: "Skill: spawn a block on any tile (not the enemy castle). Enemies cannot enter it; enemies standing on it cannot leave. Deals 1 magic damage to all enemies on the block tile and its 4 adjacent tiles (cross of 5). The block disappears at the start of your next turn (3 uses total, once per turn)", skillDesc: "Forge Block" },
        "调酒师": { passive: "", desc: "Skill: grant a friendly unit 1 magic damage; its next attack deals x2 damage. Cooldown 2 Big Rounds, 2 uses per Bartender", skillDesc: "Serve Wine" },
        "斧兵": { passive: "Charge Breaks if Interrupted", desc: "Basic attacks auto-charge, locking onto the target 1 tile ahead (unit or base); attacks automatically next turn. Cooldown 2 Big Rounds", skillDesc: "" },
        "超雄": { passive: "", desc: "Skill: sacrifice nearby allies to boost the damage of the next attack", skillDesc: "Sacrifice" },
        "塞壬": { passive: "", desc: "Skill: forcibly pull any enemy unit 1 tile toward you. Cooldown 2 Big Rounds", skillDesc: "Pull" },
        "号角兵": { passive: "", desc: "Skill: self and two nearby allies gain +1 Speed this turn, and they recover half of the damage taken this turn at your next turn. Cooldown 2 Big Rounds", skillDesc: "Blow Horn (choose 2 nearby allies)" },
        "弱化师": { passive: "", desc: "Skill: one enemy in this column deals no damage on their next turn. Once per turn", skillDesc: "Weaken" },
        "鹰眼": { passive: "", desc: "Skill: one enemy on the board has their active skills disabled during their next turn (passives remain). Once per turn", skillDesc: "Blind" },
        "中医": { passive: "", desc: "Skill: heal +1 HP to up to 3 different friendly units on the board, including self. Once per turn; usable even with fewer than 3 targets", skillDesc: "Heal" },
        "护援兵": { passive: "No Tile Occupancy", desc: "Does not occupy a tile; can enter full tiles (cannot overlap enemies). Skill: move to any tile and grant +2 shield to allies on it and itself. Cooldown 2 Big Rounds", skillDesc: "Teleport + Shield" },
        "机车党": { passive: "Free Move / Collision", desc: "Can move freely in all directions and overlap enemies. Whenever actively moving into an enemy's tile, deals 1 physical damage to all enemies on that tile. Skill: charge for 1/2/3 turns; on the turn charge completes, Speed +3/6/9 (cannot move while charging; cannot charge again on the turn it completes)", skillDesc: "Charge" },
        "武器商": { passive: "Attack Count Doubler", desc: "Friendly units on the same tile as the Arms Dealer have remaining attacks x2 (0x2=0). Applies regardless of who moves onto whom", skillDesc: "" },
        "追刃": { passive: "", desc: "Skill: deal 1 unblockable physical damage to an enemy that was attacked this turn. Once per turn", skillDesc: "Chase" },
        "双剑": { passive: "Sweep Charge", desc: "Attacking triggers a charge instead (no basic attack). Highlights tiles within Manhattan distance 3 ahead; auto-releases an AOE on your next turn. Cooldown 1 Big Round. While charging, cannot move or be displaced", skillDesc: "" },
        "稻草人": { passive: "Cannot Move", desc: "Can be placed on your castle, gate, or Mid Line. Cannot move on its own. Skill: pull all enemies in the front row in front of itself (may overlap past limits). Once per turn", skillDesc: "Attract (front-row enemies)" },
        "麻木者": { passive: "-1 HP per Hit", desc: "Each hit only reduces 1 HP, including execution. Cannot be healed", skillDesc: "" },
        "无中生有": { passive: "Use from Hand", desc: "Cannot be placed on the board. Usable on your turn to randomly gain 2 cards from your deck", skillDesc: "" },
        "鼠疫": { passive: "Use from Hand", desc: "Cannot be placed on the board. When used, choose a tile; all enemies on it are infected with Plague. When an infected enemy dies, all enemies on its tile and the 4 adjacent tiles take 1 true damage and are infected. Already-infected units are not re-infected. Discarding does not trigger infection", skillDesc: "" },
        "银运": { passive: "AOE + Critical", desc: "Attack damage is AOE (hits all enemies on the target tile), and each attack has a 50% chance to deal double damage", skillDesc: "" },
        "掠影": { passive: "Overlap + Dash Attack", desc: "Can share a tile with enemies (place or move). Ignores the nearest-target rule and can only attack enemies in its own column. When attacking, dashes to the target's tile (stays if already there), dealing physical damage to all enemies on it equal to 1 + round(lost HP x 0.5) (per enemy, merged into one hit). Cannot attack the enemy castle or enemies inside it", skillDesc: "" },
        "骷髅": { passive: "Split Placement", desc: "When placed, spawns 2 skeletons on the target tile and 1 on each of the other 2 tiles in the row (fails if a tile is full or has enemies)", skillDesc: "" },
        "双刀": { passive: "Combo Sweep", desc: "Attacks 2 times per turn; can target any enemy in the front row (3 tiles ahead); may repeat the same target", skillDesc: "" },
        "费机": { passive: "Mana Gain", desc: "Grants your side +1 mana per turn (extra), up to 3 total", skillDesc: "" },
        "大力士": { passive: "Slam Attack Option", desc: "Attacks an enemy 1 tile in front or behind; may choose whether to slam it in the opposite direction", skillDesc: "" },
        "魔女": { passive: "-3 Magic Damage to Self", desc: "Takes -3 magic damage. Skill: choose 1/2/3 friendly units to take -3/2/1 magic damage this turn (once per turn)", skillDesc: "Magic Shield" },
        "暴食者": { passive: "Kill: Heal + Damage", desc: "Each enemy kill fully restores its HP and permanently +1 physical damage", skillDesc: "" },
        "反击兵": { passive: "", desc: "Skill: Brace Counter - gain 2 shield; cannot move or basic attack this turn (can be displaced). At the start of your next turn, remove the shield and deal 1 magic damage to all enemies in the 3x3 area. While bracing, every 1 shield consumed grants +1 damage to the next basic attack (once per turn, 2 uses per match)", skillDesc: "Brace Counter" },
        "同化师": { passive: "", desc: "Skill: turn a friendly unit (not itself) into an Assimilator (3 HP, 1 magic damage, range 1, speed 1). All Assimilators on your side share HP; new Assimilators immediately add their HP to the pool. When the shared HP reaches zero, all Assimilators die (once per turn)", skillDesc: "Assimilate" },
        "魔矢人": { passive: "Front 3 Tiles", desc: "Attack distance: 1-3 tiles directly ahead in the same column. Active: choose the nearest enemy unit - its base damage -1, self +1 magic damage. The bonus disappears when the target or self dies. Cannot target 0-damage units; cannot be removed by Super Armor or Purify; cannot use the skill again before the target dies", skillDesc: "Magic Arrow Mark" },
        "炽炎射手": { passive: "Front 3 Tiles", desc: "Attack distance: 1-3 tiles directly ahead in the same column. Active: charge for 1/2/3 turns (cannot attack, can move). On the turn charge completes, attack count +1/2/3 and each attack +0/1/1 magic damage (cannot charge again on that turn)", skillDesc: "Charge" },
        "绫罗": { passive: "Ling Luo", desc: "Attack range: 3 tiles directly in front. While Ling Luo is away, attack count +1. Skill: Release Ling Luo - place it on the owner's tile or any tile in the 3x3 area; Dash & Leave - move 1 tile around and leave Ling Luo behind. While away, you can only recall it (freely on your turn; on enemy turns, lethal damage is nullified and it auto-recalls). Can only release 3 times", skillDesc: "Release Ling Luo" },
        "士兵": { passive: "First Attack x2", desc: "A basic soldier; the first attack deals double damage", skillDesc: "" },
        "弓箭手": { passive: "Ranged Shot", desc: "Can attack 3 tiles directly in front", skillDesc: "" },
        "蟑螂": { passive: "Revive at Castle", desc: "Magic damage. When it dies, if not at the castle, it revives at your castle in the same column", skillDesc: "" },
        "猎人": { passive: "Death: Choose Execute", desc: "On death, your side may choose one enemy in the same column to eliminate directly, or choose not to kill", skillDesc: "" },
        "酒鬼": { passive: "Immune to Wine Debuff", desc: "The Bartender's wine deals no damage to it. Skill: immune to death for 2 turns (once only)", skillDesc: "Immune to Death for 2 Turns (once only)" },
        "守卫": { passive: "Absorb Row Damage", desc: "When an ally in the same row takes damage, the Guard absorbs it", skillDesc: "" },
        "鼓手": { passive: "", desc: "Skill: two allies within the surrounding 3x3 gain +1 physical damage this turn", skillDesc: "Inspire" },
        "牛仔": { passive: "", desc: "Skill: pull a friendly unit to any tile in its row. Cooldown 2 Big Rounds", skillDesc: "Lasso" },
        "催眠师": { passive: "", desc: "Skill: stun one enemy unit for 2 turns. Once per turn", skillDesc: "Hypnotize" },
        "净化师": { passive: "Cleanse Allies Each Turn", desc: "Takes effect immediately when placed: removes stun/silence/weaken/blind/disabled hand from allies", skillDesc: "" },
        "歌女": { passive: "", desc: "Skill: swap the positions of two friendly units. Cooldown 2 Big Rounds", skillDesc: "Swap" },
        "显眼包": { passive: "Taunt", desc: "Forces enemies to prioritize attacking and skilling itself", skillDesc: "" },
        "通讯员": { passive: "", desc: "Skill: once per turn, move to any friendly unit's tile", skillDesc: "Move to Ally" },
        "护盾": { passive: "Trigger Shield", desc: "When your unit or base takes damage, may spend this shield to block it", skillDesc: "" },
        "狂战士": { passive: "+1 HP per Enemy", desc: "On deploy, gains +1 base HP per enemy unit on the board; if HP is 5 or more, costs 2 to place", skillDesc: "" },
        "盾兵": { passive: "Block Column Damage", desc: "When an ally in the same column takes damage, the Shieldman takes it", skillDesc: "" },
        "奴隶": { passive: "", desc: "Skill: consume itself plus two Slaves in hand to transform into any unit", skillDesc: "Consume 3 Slaves to Transform" },
        "巫师": { passive: "", desc: "On hit, can transfer the damage to any enemy unit on the board; unblockable", skillDesc: "" },
        "爱妃": { passive: "Aura: +1 DMG / -1 Magic DMG", desc: "Aura: friendly units within 2 tiles in front gain +1 basic/magic damage and take -1 magic damage", skillDesc: "" },
        "禁卫": { passive: "", desc: "Skill: disable one card in the opponent's hand (cannot be placed, can be discarded) for 1 Big Round", skillDesc: "Disable Opponent Hand" },
        "风兵": { passive: "", desc: "Skill: knock all enemies back 2 tiles (away from their castle). Once only; may overlap past limits", skillDesc: "Gale (knock back all)" },
        "火人": { passive: "Column Control Immunity", desc: "Friendly units in this column are immune to control. Skill: self-destruct, dealing 1 magic damage to all enemies in the column", skillDesc: "Self-Destruct" },
        "替罪羊": { passive: "Scapegoat", desc: "Skill: when a friendly unit takes lethal damage, transfer the death to itself", skillDesc: "Take the Fall" },
        "费者": { passive: "Mana on Attack", desc: "Each attack grants your side +1 mana", skillDesc: "" },
        "旗手": { passive: "", desc: "Skill: one friendly unit on the board (including itself) is immune to physical damage during the enemy's next turn. Once per turn", skillDesc: "Physical Immunity" },
        "弩手": { passive: "Charge Attack", desc: "Basic attacks auto-charge; next turn automatically attacks the nearest enemy within range 3. Must be at the enemy's gate to attack their base. Cooldown 1 Big Round", skillDesc: "" },
        "戟兵": { passive: "Charge Sweep", desc: "Basic attacks deal true damage (ignores shields and damage reduction). Skill: skip basic attacks this turn and charge; next turn, deal 3 true damage to all enemies in the front row. One use only", skillDesc: "Charge Sweep (once only)" },
        "四眼仔": { passive: "", desc: "Skill: negate the first controlled unit's autonomous action during the enemy's next turn. Once per turn", skillDesc: "Action Jam (once per turn)" },
        "旋斧人": { passive: "3x3 AOE", desc: "Basic attack is an AOE magic damage against all enemies on its tile and the surrounding 3x3 area", skillDesc: "" },
        "标枪手": { passive: "Empowered Strike Each Turn", desc: "Gains 1 empowered strike at the start of each turn (max 2). Skill: Empowered Strike (Thrust) - +1 physical damage, dash 1 tile forward and deal AOE damage to all enemies in front. Killing an enemy refreshes attack count this turn. Cannot basic attack while empowered strikes remain", skillDesc: "Thrust" },
        "琴魔": { passive: "Row Charge", desc: "Active: charge on a chosen row (cannot attack, can move); next turn, deal 3 magic damage to all enemies in that row. On the turn charge completes, cannot charge again or basic attack", skillDesc: "Row Charge" },
        "法师": { passive: "Weakening Attack", desc: "Attack range: 2 tiles directly in front. Units attacked by the Mage become Weakened (lasts 2 mini-turns)", skillDesc: "" },
        "剑客": { passive: "AOE Attack", desc: "Attacks are AOE: hits all enemies within 2 tiles directly ahead in the same column. Killing an enemy increases Attack Range by 1", skillDesc: "" },
        "风女": { passive: "Wind Step", desc: "Attack range: 3 tiles directly in front. After a basic attack, can move 1 tile freely (no speed cost, once per turn). Only one active skill per turn", skillDesc: "Storm Impact / Energy Burst" }
    };

    // ── 双技能卡的第二技能描述 ──
    const CARD_SKILL2_EN = { "影舞姬": "Tornado Kick", "绫罗": "Dash & Leave" };

    // ── 技能按钮名称英译（SKILL_DEFS.label） ──
    const SKILL_LABELS_EN = {
        "送酒": "Serve Wine", "催眠": "Hypnotize", "弱化": "Weaken", "致盲": "Blind",
        "魔矢标记": "Magic Arrow Mark", "醉意无敌": "Drunken Invincibility", "追击": "Chase",
        "自爆": "Self-Destruct", "行动干扰": "Action Jam", "狂风": "Gale", "吸引": "Attract",
        "拉拽": "Pull", "位移至友方": "Move to Ally", "瞬移+护盾": "Teleport + Shield",
        "拉人": "Lasso", "换位": "Swap", "共生死": "Linked Fate", "定身": "Root",
        "免物伤": "Physical Immunity", "鼓舞": "Inspire", "吹号": "Blow Horn", "治疗": "Heal",
        "法伤庇护": "Magic Shield", "祭献": "Sacrifice", "替死": "Take the Fall",
        "蓄力横扫": "Charge Sweep", "蓄力": "Charge", "蓄力横行": "Row Charge",
        "风女技能": "Wind Skill", "秒杀前一格": "Execute Front", "变形": "Transform",
        "禁用对手手牌": "Disable Hand", "斩月": "Crescent Blade", "突刺": "Thrust",
        "蓄势反击": "Brace Counter", "强化": "Empower", "飞扇": "Flying Fan",
        "旋风踢": "Tornado Kick", "生成镜像": "Spawn Mirror", "锻造方块": "Forge Block",
        "同化": "Assimilate", "放绫罗": "Release Ling Luo", "位移留绫罗": "Dash & Leave",
    };

    // ── 装备描述英译 ──
    const EQUIP_DESCS_EN = {
        "复活甲": "When the unit dies, it revives in place at full HP at the start of your next turn (all stats restored to initial). Triggers only once",
        "星痕之杖": "Magic damage dealt by the unit (basic attacks and skills) x1.5 (rounded up)",
        "暗影纱": "The unit gains 1 shield at the start of each turn that only blocks magic damage",
        "护身符": "When the unit takes lethal damage, it is immune to that damage and enters absolute immunity until the end of your next turn. Triggers only once",
        "妖刀": "Physical damage dealt to enemy units with HP <= 50% is doubled",
        "碎镜": "The unit can actively use a damage reduction skill (once only); after use, damage taken is reduced by 30% (permanent) (rounded down)",
        "血魔指环": "Each time the unit deals damage, it heals for half the damage dealt (rounded)",
        "霜痕": "Upon equipping, the unit's HP and max HP +1; the next attack freezes the hit enemy for 1 turn (freeze has the same effect as stun)",
        "雷刃": "Every 2 attacks, deal 1 magic damage to the attacked enemy and 1 magic damage to a random enemy in its 3x3 area",
        "苍鹰之羽": "Attack count +1, and the first basic attack each turn always hits (ignores hand shields and damage transfer, but the target's own immunity/absolute immunity still applies)",
        "甘泉": "HP and max HP become 1.3x (rounded up); if the unit took no damage during the last enemy turn, recover 15% of max HP this turn (rounded up)",
        "虚无之衣": "If the unit's max HP is greater than 4, physical and magic damage taken by the wearer is -1",
        "断脊": "Each basic/empowered attack deals additional physical damage equal to 15% of the enemy's max HP (rounded up)",
        "凝血之刃": "Unit's physical damage +1; enemies attacked by this unit can never heal (heal block, intercepts all HP recovery)",
    };

    // 装备描述显示助手
    function equipDescDisplay(eqDef) {
        return currentLang === 'en' && eqDef && EQUIP_DESCS_EN[eqDef.name]
            ? EQUIP_DESCS_EN[eqDef.name]
            : (eqDef ? eqDef.desc : '');
    }

    // ── 装备短介绍（short）英译 ──
    const EQUIP_SHORT_EN = {
        "复活甲": "Full HP Revive",
        "星痕之杖": "Magic DMG x1.5",
        "暗影纱": "Magic Shield",
        "护身符": "Immune to Lethal Damage",
        "妖刀": "x2 DMG vs Low HP",
        "碎镜": "-30% Damage Taken",
        "血魔指环": "Lifesteal on Damage",
        "霜痕": "Freeze + HP +1",
        "雷刃": "Lightning Every 2 Attacks",
        "苍鹰之羽": "Attack +1, First Hit Always Hits",
        "甘泉": "HP x1.3, Heal Each Turn",
        "虚无之衣": "-1 Damage Taken (Max HP > 4)",
        "断脊": "Bonus DMG = 15% of Target Max HP",
        "凝血之刃": "DMG +1, Heal Block",
    };
    function equipShortDisplay(eqDef) {
        return currentLang === 'en' && eqDef && EQUIP_SHORT_EN[eqDef.name]
            ? EQUIP_SHORT_EN[eqDef.name]
            : (eqDef ? (eqDef.short || '') : '');
    }

    // ── 新手教程步骤英文翻译（下标与 BEGINNER_TUTORIAL_STEPS 对齐） ──
    const TUTORIAL_STEPS_EN = [
        { title: "Welcome to Dark Age Saga", text: "This is a <b>2-player turn-based tactics card game</b>. Your goal: <b style='color:#ff8080;'>destroy the enemy castle (❤️10 HP)</b> while defending your own.<br>This tutorial walks you through the full flow: Place → Move → Attack → Skill → End Turn → Equipment Shop. Just follow the glowing hints!", buttonText: "🚀 Start Tutorial" },
        { title: "The Board", text: "The board is a <b>5-row × 3-column</b> battlefield. The <b style='color:#5aa7ff;'>Blue castle</b> is at the bottom (Row 5) and the <b style='color:#ff8a80;'>Red castle</b> at the top (Row 1). Units enter from the castle row and advance forward; reaching the enemy castle row lets you attack their castle.", buttonText: "Next" },
        { title: "Mana & Hand", text: "<b>💰Mana</b>: increases automatically each turn (cap 15); placing units costs mana.<br><b>🃏Hand</b>: up to 6 cards at the bottom; at the end of each turn, pick 1 card from the <b>Pre-Pool</b> to add to your hand.<br>Select a hand card (yellow frame), then click your castle row to place it.", buttonText: "Next" },
        { title: "Step 1: Place a Unit", text: "Now try it yourself: <b>① click 【Soldier】 in your hand</b> (yellow frame appears), <b>② then click the middle empty tile of the bottom row (Blue castle row)</b>. Your first unit is on the board!", buttonText: "Next" },
        { title: "Step 2: Move", text: "Click <b>your unit</b> (gold border appears), then click the <b>empty tile directly in front</b> to move 1 tile. Try moving 【Soldier】 forward.", buttonText: "Next" },
        { title: "Step 3: Attack", text: "With a unit selected, click an <b>enemy unit ahead in the same column</b> to attack. Try selecting 【Soldier】 and attacking the enemy 【Archer】 ahead (Soldier's first attack deals double damage — a one-shot kill!).", buttonText: "Next" },
        { title: "Step 4: Skill Units", text: "Some units have <b>active skills</b>. First place 【Banner Bearer】 from your hand on the Blue castle row (click 【Banner Bearer】 in hand → click an empty castle tile, e.g. left of the center).", buttonText: "Next" },
        { title: "Step 5: Use a Skill", text: "Click 【Banner Bearer】 → click the <b>【🚩Physical Immunity】skill button</b> at the bottom-right → then click 【Soldier】 as the target. Soldier is now protected from physical damage!", buttonText: "Next" },
        { title: "Step 6: End Turn", text: "Once you are done, click <b>【⚡End Turn】</b>. At turn end, pick 1 card from the <b>Pre-Pool</b> to add to your hand (choose whichever you like).", buttonText: "Next" },
        { title: "Opponent's Turn", text: "Now it is the opponent's turn (the demo opponent will not act). Click <b>【⚡End Turn】</b> again to pass the turn back to you.", buttonText: "Next" },
        { title: "Step 7: Equipment Shop", text: "Open <b>【⚔️Equipment Shop】</b> to take a look: spend mana to buy equipment for your units (Revive Armor, Bloodclot Blade, Demon Blade, etc.). After buying, select a unit to equip it. Browse freely, then close the shop.", buttonText: "Next" },
        { title: "Advanced Mechanics", text: "<b>🛡️Shield</b>: external shields are consumed first, then innate shields; when Chained Hunter's innate shield breaks, it enters absolute immunity.<br><b>⚡Charge</b>: cannot move while charging; releases a powerful effect when complete (Axeman / Halberdier / Motorcyclist).<br><b>🌀Control</b>: Stun (cannot act), Root (cannot move, takes +1 damage), Silence (skills disabled), Blind (skills fail).<br><b>🎯Taunt</b>: Showboat forces enemies to attack it.<br><b>✨Absolute Immunity</b>: ignores all damage, execution, control and displacement.<br>For more details, check the <b>【📖Codex】</b> at the top-right anytime!", buttonText: "Next" },
        { title: "Tutorial Complete!", text: "You've mastered the basics! <b>We suggest starting with 【🤖VS AI · Easy】</b> to get used to the pace in a real battle. Good luck!", buttonText: "🏁 Back to Mode Select" },
    ];

    // ── 速查教程（图鉴按钮打开的快速教程）英文版 ──
    const TUTORIAL_QUICK_EN = `<h3>📘 Dark Age Saga · Quick Tutorial</h3>
<div class="tutorial-content">
<p><strong>🎯 Goal:</strong> destroy the enemy castle (❤️10 HP) while defending your own.</p>

<h4>🕹️ Basic Controls</h4>
<ul>
<li><b>Left-click a hand card</b> → select it (yellow frame); <b>left-click your castle row</b> (Blue row 5 / Red row 1) → place the unit</li>
<li><b>Left-click your unit</b> → select it (gold frame); skill and overdraw buttons appear</li>
<li>　 ├─ left-click an <b>empty tile in front</b> → move (costs move points)</li>
<li>　 ├─ left-click an <b>enemy unit in front</b> → attack</li>
<li>　 └─ left-click the <b>tile facing the castle</b> → attack the castle</li>
<li><b>Right-click any unit / hand card</b> → view full details (stats and skills)</li>
<li><b>【❌ Deselect】</b> clears the selection; <b>【💥 Overdraw】</b> removes a friendly unit on the board; <b>【Discard】</b> at the bottom of a hand card discards it</li>
<li><b>【⚡End Turn】</b> passes to the opponent; <b>【📖Codex】</b> views all unit stats and skills</li>
</ul>

<h4>⌨️ Shortcuts</h4>
<ul>
<li><kbd>1</kbd>~<kbd>6</kbd> → select the corresponding hand card (press again to deselect)</li>
<li><kbd>Alt+E</kbd> → cast the selected unit's active skill (select your unit first)</li>
<li><kbd>Alt+Q</kbd> → discard the selected hand card / overdraw the selected unit</li>
<li><strong>Note:</strong> shortcuts only work when not typing text; they don't trigger inside input fields</li>
</ul>

<h4>🔄 Turn Flow</h4>
<ol>
<li>Turn start: mana +1 (cap 15), refresh move / attack / skill</li>
<li>Pick 1 card from the Pre-Pool into hand (hand cap 6; if full, discard one first)</li>
<li>Action phase: place / move / attack / skill (any order)</li>
<li>Click 【End Turn】 to switch (you can cancel if you haven't picked a Pre-Pool card)</li>
</ol>

<h4>💡 Core Mechanics</h4>
<ul>
<li><b>⏱️ Turns & Cooldowns</b>: one action by each side is a "full turn"; skill cooldowns are measured in Big Rounds (1 Big Round = both sides act once); lasting effects decrease per mini-turn</li>
<li><b>⚔️/🔮 Damage Types</b>: physical and magic; some reductions and shields only apply to specific types</li>
<li><b>🛡️ Shield</b>: external shields are consumed first, then innate shields; breaking a shield may trigger special effects (e.g. brief immunity)</li>
<li><b>⚡ Charge</b>: cannot move or attack while charging; releases a powerful effect when complete; being controlled may interrupt the charge</li>
<li><b>🌀 Control</b>: Stun (cannot act), Root (cannot move, takes +1 damage), Silence (cannot use skills), Blind (skills fail)</li>
<li><b>✨ Immunity & Invincibility</b>: absolute immunity ignores all damage, execution, control and displacement; invincible units take damage but don't die</li>
<li><b>🔪 True Damage</b>: ignores shields and damage reduction</li>
<li><b>🎯 Taunt</b>: some units force enemies to attack them first</li>
<li><b>📈 Buffs / 📉 Debuffs</b>: inspiring boosts attack; Weaken makes damage ineffective; heal block prevents HP recovery</li>
</ul>

<h4>❓ FAQ</h4>
<ul>
<li>Can't attack a target? → out of range, blocked by a unit in front, or controlled</li>
<li>Skill unusable? → on cooldown, silenced / blinded / stunned, or already used this turn</li>
<li>Hand full? → discard a card first, then pick from the Pre-Pool</li>
<li>Not enough mana? → mana grows each turn (cap 15), or use units that generate mana</li>
</ul>
</div>
<div class="custom-modal-buttons"><button class="custom-modal-btn confirm" id="closeTut">Close</button></div>`;


    // ── 棋盘坐标 / 常用名词英译 ──
    const ZH_EN_PHRASES = [
        // 棋盘坐标
        ["红方城池", "Red Castle"], ["红方城下", "Red Gate"], ["蓝方城下", "Blue Gate"], ["蓝方城池", "Blue Castle"],
        ["中线", "Mid Line"], ["左路", "Left Lane"], ["中路", "Middle Lane"], ["右路", "Right Lane"],
        // 阵营/回合
        ["蓝方", "Blue"], ["红方", "Red"], ["蓝方回合", "Blue's Turn"], ["红方回合", "Red's Turn"],
        ["先手", "first"], ["后手", "second"], ["敌方", "enemy"], ["友方", "ally"], ["己方", "your"],
        // 基础动作
        ["攻击基地", "Attack Base"], ["攻击本体", "Attack Base"], ["攻击", "attack"], ["移动", "move"],
        ["放置", "place"], ["结束回合", "End Turn"], ["取消", "cancel"], ["确认", "confirm"], ["确定", "OK"],
        ["返回", "Back"], ["关闭", "Close"], ["开始对战", "Start Battle"], ["开始游戏", "Start Game"],
        // 属性/机制
        ["攻击范围", "Attack Range"], ["范围", "range"], ["距离", "distance"], ["射程", "range"],
        ["移速", "Speed"], ["攻速", "Attack Count"], ["法伤", "magic damage"], ["物伤", "physical damage"],
        ["伤害", "damage"], ["生命", "HP"], ["血", "HP"], ["法力", "mana"], ["费用", "cost"], ["费", "cost"],
        ["护盾", "shield"], ["法术护盾", "Magic Shield"], ["蓄势护盾", "Brace Shield"], ["蓄力", "charge"],
        ["霸体", "Super Armor"], ["免疫", "immune"], ["无敌", "invincible"], ["秒杀", "execute"],
        ["眩晕", "stun"], ["致盲", "blind"], ["沉默", "silence"], ["定身", "root"], ["弱化", "weaken"],
        ["标记", "mark"], ["斩杀", "execute"], ["滑步", "glide"], ["光环", "aura"], ["征税", "tax"],
        ["亡语", "deathrattle"], ["复活", "revive"], ["连击", "combo"], ["召唤", "summon"], ["登场", "deploy"],
        ["穿透", "pierce"], ["反弹", "reflect"], ["吸血", "lifesteal"], ["反伤", "thorns"], ["嘲讽", "taunt"],
        ["潜行", "stealth"], ["飞行", "flying"], ["冲锋", "charge"], ["疾跑", "sprint"], ["重击", "heavy strike"],
        ["溅射", "splash"], ["爆炸", "explode"], ["毒", "poison"], ["燃烧", "burn"], ["冰冻", "freeze"],
        ["恐惧", "fear"], ["嘲讽", "taunt"], ["无敌", "invincible"], ["隐身", "invisible"],
        // 结构词
        ["大回合", "Big Round"], ["回合", "turn"], ["冷却", "cooldown"], ["每回合", "each turn"],
        ["下回合", "next turn"], ["下个", "next"], ["本回合", "this turn"], ["当前", "current"],
        ["任意", "any"], ["所有", "all"], ["全部", "all"], ["双方", "both sides"], ["各自", "each"],
        ["直到", "until"], ["期间", "during"], ["持续", "lasts"], ["永久", "permanently"],
        ["最多", "up to"], ["至少", "at least"], ["上限", "cap"], ["溢出", "overflow"],
        ["一次", "once"], ["两次", "twice"], ["再次", "again"], ["可以", "can"], ["可", "can"],
        ["不可", "cannot"], ["不能", "cannot"], ["无法", "cannot"], ["只能", "can only"],
        ["需要", "needs"], ["需先", "must first"], ["必须", "must"], ["使用", "use"], ["选择", "select"],
        ["选中", "selected"], ["已选中", "Selected"], ["放置", "place"], ["手牌", "hand"],
        ["预牌堆", "Pre-Pool"], ["卡池", "Card Pool"], ["卡组", "deck"], ["图鉴", "Codex"],
        ["装备", "equipment"], ["商店", "shop"], ["技能", "skill"], ["被动", "passive"],
        ["主动", "active"], ["效果", "effect"], ["目标", "target"], ["单位", "unit"],
        ["敌方单位", "enemy unit"], ["友方单位", "ally unit"], ["玩家", "player"],
        ["房间码", "Room Code"], ["创建房间", "Create Room"], ["加入房间", "Join Room"],
        ["复制房间码", "Copy Room Code"], ["取消等待", "Cancel Wait"], ["连接", "connect"],
        ["联机", "Online"], ["房主", "host"], ["主机", "host"], ["客机", "guest"], ["等待", "waiting"],
        ["正在加载", "Loading"], ["加载失败", "load failed"], ["网络", "network"], ["提示", "tip"],
        ["教程", "tutorial"], ["新手", "beginner"],
        ["上一步", "Previous"], ["跳过此步", "Skip Step"], ["下一步", "Next"], ["退出教程", "Exit Tutorial"],
        ["步骤", "Step"], ["回顾中", "reviewing"], ["回到当前步骤", "Back to current step"], ["当前步骤", "current step"],
        ["欢迎来到黑暗中世纪", "Welcome to Dark Age Saga"], ["认识棋盘", "The Board"], ["费用与手牌", "Mana & Hand"],
        ["第一步：放置单位", "Step 1: Place a Unit"], ["第二步：移动", "Step 2: Move"], ["第三步：攻击", "Step 3: Attack"],
        ["第四步：技能单位", "Step 4: Skill Units"], ["第五步：使用技能", "Step 5: Use a Skill"], ["第六步：结束回合", "Step 6: End Turn"],
        ["对手回合", "Opponent's Turn"], ["第七步：装备商店", "Step 7: Equipment Shop"], ["进阶机制速览", "Advanced Mechanics"],
        ["教程完成！", "Tutorial Complete!"], ["开始教学", "Start Tutorial"], ["返回模式选择", "Back to Mode Select"], ["难度", "difficulty"], ["阵营", "side"],
        ["测试模式", "Test Mode"], ["胜利", "Victory"], ["失败", "Defeat"], ["平局", "Draw"],
        ["调试工具", "Debug Tools"], ["清除所有单位", "Clear All Units"], ["无限费", "Unlimited Mana"],
        ["无限费: ON", "Unlimited Mana: ON"], ["无限费: OFF", "Unlimited Mana: OFF"],
        ["无限费模式已开启，费用已满", "Unlimited mana mode ON, mana maxed"], ["无限费模式已关闭", "Unlimited mana mode OFF"],
        ["添加手牌", "Add Cards"], ["所有单位已清除", "All units cleared"], ["[测试]", "[Test]"],
        ["已开启", "enabled"], ["已关闭", "disabled"], ["费用已满", "mana maxed"],
        ["自动弃掉", "auto-discard"], ["为蓝方添加手牌", "add to Blue's hand"], ["为红方添加手牌", "add to Red's hand"],
        ["游戏结束", "Game Over"], ["爆牌", "overdraw"], ["弃牌", "discard"], ["弃掉", "discard"],
        // 行为短语（动词 + 宾语组合，覆盖日志/toast 常见模板）
        ["的攻击被无效化", "'s attack was negated"], ["的攻击", "'s attack"], ["被无效化", "was negated"],
        ["被净化", "was purified"], ["被移除", "was removed"], ["被爆牌", "was overdrawn"],
        ["被定身", "was rooted"], ["被眩晕", "was stunned"], ["被沉默", "was silenced"],
        ["被致盲", "was blinded"], ["被弱化", "was weakened"], ["被位移", "was displaced"],
        ["无法被位移", "cannot be displaced"], ["无法被选中", "cannot be targeted"],
        ["无法被攻击", "cannot be attacked"], ["无法被秒杀", "cannot be executed"],
        ["无法移动", "cannot move"], ["无法攻击", "cannot attack"], ["无法行动", "cannot act"],
        ["无法放置", "cannot place"], ["无法使用", "cannot use"], ["已死亡", "is dead"],
        ["已死亡！", "is dead!"], ["死亡", "died"], ["死亡！", "died!"], ["阵亡", "fell"],
        ["秒杀已用", "execute used"], ["已用", "used"], ["首击加成", "first strike bonus"], ["首击", "first strike"],
        // ── 日志模板残留词补全 ──
        ["被消灭", "was eliminated"], ["被击碎", "was shattered"], ["被击退", "was knocked back"],
        ["被治疗", "be healed"], ["被拉拽", "can be pulled"], ["被吸引", "was pulled"],
        ["被拉入", "pulled into"], ["被摔入", "slammed into"], ["被下咒", "is cursed"],
        ["被施加", "is afflicted with"], ["被绑定", "is bound to"], ["被选中", "is selected"],
        ["解除。", " lifted."], ["解除！", " lifted!"], ["解除", "lifted"], ["已解除", "lifted"],
        ["回HP", "heal"], ["回血", "heal"], ["回绫罗", "recall Ling Luo"], ["回Ling Luo", "recall Ling Luo"],
        ["测试卡", "Test card"], ["测试模式", "Test Mode"], ["测试", "test"],
        ["点伤害", " damage"], ["点生命", " HP"], ["点法伤", " magic damage"], ["点护盾", " shield"],
        ["点能量", " energy"], ["点费用", " mana"], ["点真伤", " true damage"],
        ["提升至", "boosted to"], ["翻倍至", "doubled to"], ["降低至", "reduced to"], ["刷新至", "refreshed to"],
        ["恢复至", "restored to"], ["至", " to "],
        ["由同行的", "by the Guard in the same row"], ["由同列的", "by the Shieldman in the same column"],
        ["受致命伤", "takes lethal damage"], ["受致命", "takes lethal"], ["致命伤", "lethal damage"], ["致命", "lethal"],
        ["已经攻击过", "has already attacked"], ["已经行动过", "has already acted"], ["已经使用过", "has already used"],
        ["已使用过", "already used"], ["攻击过", "attacked"], ["行动过", "acted"], ["使用过", "used"],
        ["被攻击过", "been attacked"], ["用过", "used"], ["过", ""],
        ["强制成为", "forced to become"], ["成为", "becomes"], ["变AOE", "becomes AOE"], ["变", "into"],
        ["请使用", "please use"], ["请点击", "please click"], ["请选择", "please choose"], ["请先", "please first"],
        ["请按", "please follow"], ["请等待", "please wait"], ["请", "please "],
        ["仍可", "can still"], ["仍能", "can still"], ["仍", "still"],
        ["酒类强化", "wine empower"], ["酒类", "wine"],
        ["有更近的敌人挡在前面", "a closer enemy blocks the way"], ["更近的敌人", "a closer enemy"],
        ["更近", "closer"], ["挡", "blocking"], ["前面", "in front"],
        ["风之步", "Wind Step"], ["风", "wind"], ["步", "step"],
        ["要攻击", "to attack"], ["要穿戴", "to equip"], ["要选择", "to choose"], ["要", "to "],
        ["可用", "available"], ["能用", "usable"], ["用", "use"],
        ["在身上", "is with the owner"], ["身上", " on "], ["身", " "],
        ["目标格已满", "target tile is full"], ["该格已满", "that tile is full"], ["已满", "is full"],
        ["满员", "full"], ["满血", "full HP"], ["满", "full"],
        ["已变形", "transformed"], ["本回合被位移，不可移动", "displaced this turn, cannot move"], ["被位移", "displaced"],
        ["下次攻击翻倍", "next attack doubles"], ["攻击翻倍", "attack doubles"], ["翻倍", "doubles"],
        ["已穿戴", "equipped"], ["穿戴了", "equipped"], ["穿戴", "equip"],
        ["获得", "gains"], ["恢复", "recovers"], ["回复", "recovers"], ["消耗", "costs"],
        ["造成", "deals"], ["受到", "takes"], ["抵挡", "blocks"], ["抵消", "negates"],
        ["施加", "applies"], ["使用技能", "uses skill"], ["使用", "uses"], ["释放", "casts"],
        ["发动", "triggers"], ["触发", "triggers"], ["触发", "triggers"], ["启动", "starts"],
        ["增加了", "increased"], ["增加了", "increased"], ["降低", "reduced"], ["降为", "reduced to"],
        ["变为", "becomes"], ["变成", "becomes"], ["保持", "stays"], ["清空", "cleared"],
        ["重置", "reset"], ["跳过", "skip"], ["跳过滑步", "skip glide"], ["取消技能", "cancel skill"],
        ["确认技能", "confirm skill"], ["技能目标", "skill target"], ["选择目标", "choose target"],
        ["在范围内", "in range"], ["不在范围内", "out of range"], ["超出范围", "out of range"],
        ["范围内", "in range"], ["不是你的回合", "Not your turn"], ["不是你的回合！", "Not your turn!"],
        ["请先", "please"], ["请选择", "Please choose"], ["请确认", "Please confirm"],
        ["请等待", "Please wait"], ["正在", "currently"], ["进行中", "in progress"],
        ["已结束", "has ended"], ["已开始", "has started"], ["已取消", "cancelled"],
        ["是否", "Do you want to"], ["是否结束当前回合？", "End the current turn?"],
        ["是", "is"], ["否", "No"], ["不", "no"], ["好", "OK"],
        ["加攻速", "gain Attack Count"], ["加移速", "gain Speed"], ["减费", "costs less"],
        ["免伤", "damage immunity"], ["免法伤", "magic immunity"], ["免物伤", "physical immunity"],
        ["伤害无效", "damage is negated"], ["攻击无效", "attack is negated"], ["失效", "fails"],
        ["回合结束", "end of turn"], ["回合开始", "start of turn"], ["回合开始时", "at turn start"],
        ["每个回合", "each turn"], ["一个大回合", "one Big Round"], ["下个大回合", "next Big Round"],
        ["第", ""], ["个", ""], ["的", " of "], ["了", ""], ["已", ""], ["还", " still "],
        ["未", "not "], ["无", "no "], ["有", "has "], ["与", " with "], ["和", " and "], ["或", " or "],
        ["在", " at "], ["向", " toward "], ["从", " from "], ["对", " to "], ["给", " to "],
        ["其", "its "], ["该", "the "], ["这", "this "], ["那", "that "], ["此", "this "],
        ["自己", "itself"], ["自身", "itself"], ["对方", "the opponent"], ["对手", "opponent"],
        ["你", "you"], ["我", "I"], ["我们", "we"], ["他们", "they"],
        ["前方", "front"], ["正前方", "directly in front"], ["后方", "behind"], ["左侧", "left"],
        ["右侧", "right"], ["同列", "same column"], ["同行", "same row"], ["同格", "same tile"],
        ["所在格", "its tile"], ["格子", "tile"], ["格", "tile"], ["横线", "row"], ["竖排", "column"],
        ["九宫格", "3x3 area"], ["周围", "around"], ["相邻", "adjacent"], ["附近", "nearby"],
        ["场上", "on board"], ["全场", "the whole board"], ["手牌上限", "hand limit"],
        ["满手牌", "full hand"], ["卡组为空", "deck is empty"], ["抽牌", "draw"],
        ["摸牌", "draw"], ["牌", "card"], ["卡", "card"], ["张", ""], ["张牌", "cards"],
        ["回合数", "turn count"], ["击杀", "kill"], ["击杀数", "kills"], ["连杀", "kill streak"],
        // ── 日志/toast 高频机制词 ──
        ["处于", "is in "], ["超级", "super"], ["替伤", "redirected"], ["号角", "horn"],
        ["激活", "activated"], ["魔矢", "magic arrow"], ["回到", "back to"], ["锁定", "locks onto"],
        ["击碎", "shattered"], ["只掉", "only loses"], ["反击", "counter"], ["准备", "prepare"],
        ["扩散", "spreads"], ["降至", "drops to"], ["忽略", "ignore"], ["减免", "reduction"],
        ["走入", "walk into"], ["击败", "defeat"], ["操作", "action"], ["延迟", "delayed"],
        ["继续", "continue"], ["来自", "from"], ["绑定", "bound"], ["开启", "enabled"],
        ["连携", "combo"], ["配合", "synergy"], ["后续", "later"], ["就位", "in place"],
        ["大师策略", "master strategy"], ["赏金", "bounty"], ["回满", "fully restores"],
        ["饱餐", "feast"], ["达成", "achieved"], ["跟随", "follows"], ["链过长", "chain too long"],
        ["阻止递归", "recursion prevented"], ["安全保护", "safety guard"], ["致死伤害", "lethal damage"],
        ["承受了", "took"], ["承受", "takes"], ["代替", "instead of"], ["护体", "protection"],
        ["吸收", "absorbs"], ["处", " "], ["之后", "after"], ["结束后", "when it ends"],
        ["结束后将", "will"], ["暂不", "temporarily not"], ["不死亡", "does not die"],
        ["无敌状态", "invincible state"], ["超级无敌", "super invincible"], ["绝对免疫状态", "absolute immunity state"],
        ["保护", "protection"], ["拦截", "intercepts"], ["施加于", "applied to"], ["作用于", "applies to"],
        ["基于", "based on"], ["因为", "because"], ["由于", "due to"], ["导致", "causes"],
        ["视为", "treated as"], ["当作", "counts as"], ["相当于", "equivalent to"], ["等同", "same as"],
        ["本轮", "this round"], ["上个回合", "last turn"], ["下个回合", "next turn"],
        ["每次受到", "each time taking"], ["被攻击时", "when attacked"], ["死亡时", "on death"],
        ["死亡时如果", "when it dies, if"], ["如果不在", "if not at"], ["如果", "if"],
        ["则在", "then at"], ["复活于", "revives at"], ["复活在", "revives at"],
        ["本路", "its lane"], ["前一格", "the tile in front"],
        ["触发了", "triggered"], ["已被", "already"], ["尚未", "not yet"],
        ["移除了", "removed"], ["恢复至", "restores to"], ["失去", "loses"], ["花费", "spends"],
        ["费用不足", "not enough mana"], ["法力不足", "not enough mana"],
        ["不能使用技能", "cannot use skills"], ["没有目标", "no target"], ["无目标可", "no target to"],
        ["没有敌人", "no enemies"], ["没有友方", "no allies"], ["找不到", "cannot find"], ["位置无效", "invalid tile"],
        ["该格", "that tile"], ["此格", "this tile"], ["周围八格", "surrounding 8 tiles"],
        ["横向", "horizontal"], ["纵向", "vertical"], ["斜向", "diagonal"], ["整排", "whole row"],
        ["一列", "one column"], ["一行", "one row"], ["两格", "two tiles"], ["三格", "three tiles"],
        ["前进", "advance"], ["后退", "retreat"], ["左移", "move left"], ["右移", "move right"],
        ["上移", "move up"], ["下移", "move down"], ["停止", "stop"], ["暂停", "pause"],
        ["开始行动", "starts acting"], ["行动完毕", "done acting"], ["行动中", "acting"],
        ["回合结束判定", "turn end check"], ["比赛", "match"], ["一局", "a match"], ["战局", "battle"],
        ["最终", "final"], ["胜利者", "winner"], ["败者", "loser"],
        ["恭喜获胜", "congratulations, you win"], ["你赢了", "you win"], ["你输了", "you lose"],
        ["平局收场", "ends in a draw"], ["以平局", "in a draw"], ["分出胜负", "decides the winner"],
        ["速战速决", "quick victory"], ["拉锯战", "a tug of war"], ["持久战", "a war of attrition"],
        ["资源管理", "resource management"], ["场面控制力", "board control"], ["直击要害", "hits the vital point"],
        ["关键时刻", "key moments"], ["单位交换", "unit trades"], ["大幅领先", "far ahead"],
        ["核心战力", "core combatant"], ["击杀之王", "Kill King"], ["单场击杀", "kills in a single match"],
        ["组合技", "combo"], ["转化为胜势", "turned into victory"], ["技能运用", "skill usage"],
        ["更活跃", "more active"], ["把握了更多", "seized more"], ["战术机会", "tactical opportunities"],
        ["纯粹靠", "purely with"], ["单位质量", "unit quality"], ["碾压", "domination"],
        ["进攻目标明确", "clear offensive goal"], ["致命一击", "the killing blow"], ["精彩瞬间", "highlight moment"],
        ["关键单位", "key units"], ["被及时处理", "dealt with in time"], ["精准清除", "precisely eliminated"],
        ["死刑判决", "death sentence"], ["无处遁形", "nowhere to hide"], ["标记收割", "mark & reap"],
        ["斩落", "cut down"], ["连锁击杀", "chain kills"], ["击杀艺术", "art of killing"],
        ["战术亮点", "tactical highlights"], ["对局复盘", "Match Recap"], ["战绩统计", "Match Stats"],
        ["指标", "stat"], ["总回合数", "total turns"], ["本体伤害", "base damage"], ["技能使用", "skills used"],
        ["AI 点评", "AI Commentary"], ["最佳单位", "Best Unit"], ["关键事件", "Key Events"],
        ["击杀榜", "kill board"], ["输出榜", "damage board"], ["承伤榜", "damage taken board"],
        ["本局最佳", "Match MVP"], ["对敌方", "to the enemy"], ["对友方", "to allies"],
        ["造成了", "dealt"], ["累计", "accumulated"], ["总计", "total"],
        ["共发动", "triggered"], ["单次", "single"], ["每局限", "limited per match"], ["整局", "per match"],
        // ── 尾批：低频残留词 + 长模板精确翻译 ──
        ["替死", "take the fall"], ["防御", "defense"], ["全免", "full immunity"], ["记录", "records"],
        ["请检查", "check"], ["请查看", "see"], ["请手动", "manually"], ["文本", "text"],
        ["碰撞", "collision"], ["分裂", "split"], ["量相同", "same amount"], ["量优势", "advantage in numbers"],
        ["关注", "pay attention to"], ["显示", "shows"], ["到期", "expires"], ["加入者", "joiner"],
        ["摔到", "thrown to"], ["抽取", "draw"], ["到任何", "to any"], ["饮酒", "drinking"],
        ["只加", "only adds"], ["拉到", "pull to"], ["拉拽", "pull"], ["拉动", "pull"],
        ["棋盘", "board"], ["出错", "error"], ["以便", "so that"], ["进度", "progress"], ["丢失", "lost"],
        ["确定要重新开局吗？当前对局进度将丢失！", "Restart the game? All match progress will be lost!"],
        ["上场针对", "deploys to counter"], ["针对", "counter"], ["场面优势明显", "clear board advantage"],
        ["先下", "play first"], ["为后续", "to prepare for later"], ["高费", "high-cost"], ["做准备", "in preparation"],
        ["压制", "pressure"], ["形成压制", "dominates"], ["策略", "strategy"], ["战术", "tactics"],
        ["技能执行出错，请查看控制台", "Skill execution error, check the console"],
        ["请手动选择文本复制", "Please copy the text manually"],
        ["免疫饮酒伤害", "immune to wine damage"], ["送酒只加buff不扣血", "the wine only buffs, never damages"],
        ["号角庇护记录", "Horn's shelter records"], ["下个友方回合将恢复", "will recover next ally turn"], ["一半", "half"],
        ["联机组件加载失败，请检查网络后重试", "Failed to load the online component. Check your network and retry"],
        ["死亡回合判定：双方均无法击败对方本体", "Death-round check: neither side can defeat the opponent's base"],
        ["无限费模式：费用保持", "Unlimited-mana mode: mana stays at"], ["无需关注费用", "no need to watch mana"],
        ["二杀", "Double Kill"], ["三杀", "Triple Kill"], ["四杀", "Quad Kill"], ["五杀", "Penta Kill"],
        ["六杀", "Hexa Kill"], ["七杀", "Legendary"], ["八杀", "Legendary"], ["九杀", "Legendary"], ["十杀", "Legendary"],
        ["胜利！", "Victory!"], ["失败！", "Defeat!"], ["平局！", "Draw!"], ["获胜", "wins"],
        ["恭喜", "Congratulations"], ["遗憾", "Too bad"], ["再来一局", "Play again"],
        ["返回模式选择", "Back to Mode Select"], ["重新开局", "New Game"],
        ["添加手牌", "add to hand"], ["添加", "add"], ["移除", "remove"], ["摧毁", "destroy"],
        ["销毁", "destroyed"], ["消失", "vanished"], ["消失！", "vanished!"], ["回到卡池", "returned to pool"],
        ["已回到卡池", "returned to the pool"], ["回到手牌", "returned to hand"],
        ["复制", "copy"], ["粘贴", "paste"], ["导入", "import"], ["导出", "export"], ["分享码", "share code"],
        ["保存", "save"], ["删除", "delete"], ["未命名", "unnamed"], ["预设", "preset"], ["预设卡组", "preset deck"],
        ["全卡池", "Full Pool"], ["自定义卡组", "Custom Deck"], ["人机对战", "VS AI"], ["远程联机", "Online"],
        ["新手教程", "Tutorial"], ["创建或加入", "create or join"], ["请把房间码告诉朋友", "Share the room code with your friend"],
        ["等待对方加入", "waiting for the other player to join"], ["正在连接", "connecting"],
        ["正在与房主建立连接", "connecting to the host"], ["房间已创建", "Room Created"],
        ["对方已加入", "the other player has joined"], ["已加入", "joined"], ["已退出", "left"],
        ["已断开", "disconnected"], ["连接已断开", "connection lost"], ["断线", "disconnect"],
        ["重新连接", "reconnect"], ["已同步", "synced"], ["同步", "sync"], ["快照", "snapshot"],
        ["结算", "resolve"], ["判定", "check"], ["检测", "checking"], ["开始", "start"],
        ["游戏开始", "Game Start"], ["对局", "match"], ["复盘", "recap"], ["MVP", "MVP"],
        ["最佳", "best"], ["评分", "score"], ["总伤害", "total damage"], ["总治疗", "total healing"],
        ["消灭", "eliminate"], ["消灭敌人", "eliminate enemies"], ["需先消灭敌人", "Must eliminate the enemy first"],
        ["镜像", "mirror"], ["镜像无法", "mirror cannot"], ["幻影", "phantom"],
        ["共鸣", "resonance"], ["结界", "barrier"], ["阵法", "formation"], ["领域", "domain"],
        ["装备商店", "Equipment Shop"], ["购买", "buy"], ["出售", "sell"], ["穿戴者", "wearer"],
        ["出售价格", "sell price"], ["购买价格", "buy price"], ["金币", "gold"],
        ["点击", "click"], ["拖拽", "drag"], ["拖动", "drag"], ["松开", "release"],
        ["按住", "hold"], ["长按", "hold"], ["左键", "left click"], ["右键", "right click"],
        ["双击", "double click"], ["快捷键", "shortcut"], ["按键", "key"],
        ["搜索", "search"], ["筛选", "filter"], ["排序", "sort"], ["按", "by"],
        ["全部", "all"], ["无", "none"], ["无效果", "no effect"], ["无目标", "no target"],
        ["没有", "no "], ["暂无", "none yet"], ["空", "empty"], ["空格子", "empty tile"],
        ["不可放置", "cannot place here"], ["该位置不可放置", "cannot place there"],
        ["该位置", "that tile"], ["此处", "here"], ["这里", "here"], ["那里", "there"],
        ["前方格子", "front tile"], ["目标格子", "target tile"], ["落点", "landing tile"],
        ["攻击目标", "attack target"], ["攻击对象", "attack target"], ["单位已满", "board is full"],
        ["场上已满", "board is full"], ["无法放置更多单位", "cannot place more units"],
        ["选中单位", "selected unit"], ["选择单位", "choose a unit"], ["未选中", "nothing selected"],
        ["没有可攻击的单位", "no attackable units"], ["没有可移动的单位", "no movable units"],
        ["没有可用的技能", "no usable skills"], ["没有可放置的卡牌", "no placeable cards"],
        ["已放置", "placed"], ["已移动", "moved"], ["已攻击", "attacked"], ["攻击了", "attacked"],
        ["对局开始", "Match Start"], ["战斗开始", "Battle Start"], ["回合制", "turn-based"],
        ["战棋", "tactics"], ["卡牌游戏", "card game"], ["双人对战", "2-player battle"],
        ["等待中", "waiting"], ["请稍候", "please wait"], ["请稍等", "please wait"],
        ["正在处理", "processing"], ["处理中", "processing"], ["加载中", "loading"],
        ["成功", "success"], ["失败", "failed"], ["错误", "error"], ["异常", "error"],
        ["无效", "invalid"], ["重复", "duplicate"], ["已存在", "already exists"], ["不存在", "not found"],
        ["房间不存在", "room not found"], ["房间已满", "room is full"], ["房间码错误", "invalid room code"],
        ["密码", "password"], ["昵称", "nickname"], ["名字", "name"], ["名称", "name"],
        // ── 图鉴/卡池/界面标签 ──
        ["传说", "Legendary"], ["史诗", "Epic"], ["普通", "Common"],
        ["我方卡池", "Your Pool"], ["敌方卡池", "Enemy Pool"], ["双方共享卡池", "Shared Card Pool"],
        ["当前查看", "Viewing"], ["我方", "your side"], ["敌方", "enemy side"],
        ["无符合条件的卡牌", "No matching cards"], ["关闭", "Close"], ["搜索名称", "Search by name"],
        ["剩余", "left"], ["种", " kinds"], ["张", ""],
        ["简介", "Overview"], ["被动技能", "Passive"], ["主动技能", "Active Skill"],
        ["技能：", "Skill: "], ["技能", "Skill"], ["被动", "Passive"], ["主动", "Active"], ["无", "None"],
        ["胜利目标", "Victory Goal"], ["摧毁", "destroy"], ["守住", "defend"],
        ["基本操作", "Basic Controls"], ["快捷键", "Shortcuts"], ["回合流程", "Turn Flow"],
        ["通用机制", "Core Mechanics"], ["常见问题", "FAQ"], ["注意：", "Note: "], ["注意", "Note"],
        ["左键", "left-click"], ["右键", "right-click"], ["再次", "again"],
        ["放置单位", "place a unit"], ["攻击城池", "attack the castle"], ["攻击基地", "attack the base"],
        ["前方空格", "empty tile in front"], ["前方敌方单位", "enemy unit in front"],
        ["正对城池格", "tile facing the castle"], ["查看详细属性", "view full details"],
        ["清空当前选择", "clear selection"], ["换对手", "switch to opponent"],
        ["换对手行动", "pass to opponent"], ["已使用过技能", "skill already used"],
        ["未输入文本", "not typing text"], ["输入框", "input field"], ["不触发", "won't trigger"],
        ["释放主动技能", "cast active skill"], ["释放技能", "cast skill"], ["释放", "cast"],
        ["行动阶段", "action phase"], ["顺序自定", "any order"], ["完整回合", "full turn"],
        ["持续效果", "lasting effects"], ["递减", "decrease"], ["伤害类型", "damage type"],
        ["物理", "physical"], ["法术", "magic"], ["部分减伤", "some damage reduction"], ["减伤", "damage reduction"],
        ["优先消耗", "consumed first"], ["破碎", "breaks"], ["特殊效果", "special effect"], ["短时间", "briefly"],
        ["免疫与无敌", "Immunity & Invincibility"], ["绝对免疫", "absolute immunity"], ["无视", "ignores"],
        ["真伤", "true damage"], ["嘲讽", "taunt"], ["强制", "forces"], ["优先攻击", "prioritize attacking"],
        ["增益", "buff"], ["减益", "debuff"], ["鼓舞", "inspire"], ["加攻", "attack up"],
        ["禁疗", "heal block"], ["无法恢复生命", "cannot heal"], ["距离不够", "out of range"],
        ["阻挡", "blocking"], ["冷却中", "on cooldown"], ["每回合自动增长", "grows each turn"],
        ["带加费能力", "mana-generating ability"], ["加费", "mana gain"], ["能力", "ability"],
        ["普通攻击", "basic attack"], ["攻击时", "on attack"], ["每次攻击", "each attack"],
        ["受到伤害时", "when damaged"], ["受到伤害", "takes damage"], ["死亡后", "after death"],
        ["出场时", "on deploy"], ["在场时", "while on board"], ["在场", "on board"],
        ["可以放置", "can be placed"], ["不能自己移动", "cannot move itself"], ["不能移动", "cannot move"],
        ["九宫格内", "within a 3x3 area"], ["内", " within"], ["每次", "each time"],
        ["自动", "automatically"], ["状态下", "state"], ["状态", "state"],
        ["剩余次数", "charges left"], ["次数", "times"], ["本局", "this match"],
        ["随机", "random"], ["交换", "swap"], ["偷取", "steal"], ["复制", "copy"],
        ["增幅", "amplify"], ["强化", "empower"], ["削弱", "weaken"], ["增强", "enhance"],
        ["回复生命", "heal"], ["治疗", "heal"], ["治愈", "heal"], ["恢复生命", "recover HP"],
        ["增益效果", "buff effect"], ["减益效果", "debuff effect"], ["控制效果", "control effect"],
        ["异常状态", "abnormal state"], ["清除", "remove"], ["驱散", "dispel"], ["净化", "purify"],
        ["造成伤害", "deal damage"], ["受到伤害", "take damage"], ["免疫伤害", "immune to damage"],
        ["免疫控制", "immune to control"], ["免疫位移", "immune to displacement"],
        ["免疫秒杀", "immune to execution"], ["免伤", "damage immunity"],
        ["额外", "extra"], ["追加", "additional"], ["首次", "first time"], ["最后", "last"],
        ["最远", "farthest"], ["最近", "nearest"], ["前方", "front"], ["后方", "behind"],
        ["向上", "up"], ["向下", "down"], ["向左", "left"], ["向右", "right"],
        ["反方向", "opposite direction"], ["任意方向", "any direction"], ["方向", "direction"],
        // ── 装备名 ──
        ["的甘泉恢复", "'s Spring recovers "], ["复活甲", "Revive Armor"], ["星痕之杖", "Star-Trail Staff"], ["暗影纱", "Shadow Veil"],
        ["复活甲待机", "Revive Armor pending"], ["待机", "pending"], ["下个我方回合", "next of your turns"], ["我方回合", "your turn"],
        ["放置到", "place onto"], ["到场上", "on the board"], ["到棋盘", "on the board"], ["到", " to "],
        ["在手中", "from your hand"], ["手中", "your hand"], ["手", "hand"],
        ["你方", "your side"], ["该方", "that side"], ["方", " side"],
        ["总移速", "total Speed"], ["总护盾", "total shield"], ["总", "total "],
        ["蓄力中断", "charge interrupted"], ["中断", "interrupted"], ["断", "interrupted"],
        ["选了", "chose"], ["选", "pick"],
        ["摔落位置", "landing tile"], ["摔落", "landing"], ["超出边界", "out of bounds"], ["边界", "bounds"],
        ["摔入己方城池", "slam into your castle"], ["摔入", "slam into"],
        ["才能攻击", "before attacking"], ["才能", " to "], ["发现", "discovers"], ["改为", "changed to"],
        ["有效横行", "valid row"], ["有效格子", "valid tile"], ["有效", "valid"], ["效", "valid"],
        ["落空", "misses"], ["落", "miss"], ["还需", "still need"], ["需等待", "must wait"],
        ["需", "need "], ["放出", "release"], ["放出了", "released"], ["再放出", "release again"], ["出", " out"],
        ["下咒", "cursed"], ["咒", "curse"], ["按钮", "button"], ["钮", "button"],
        ["悬赏兑现", "bounty collected"], ["兑", "collected"], ["随之", "along with it"], ["随", "along with"],
        ["一同", "together"], ["同死", "dies together"], ["同", "together"],
        ["未进行", "did not proceed"], ["进行", "proceed"], ["进", "into"],
        ["作为", "as"], ["作", "as"], ["死于城池", "died at the castle"], ["死于", "died at"],
        ["已损", "lost"], ["损", "lost"], ["目标列", "target column"], ["列", "column"],
        ["小回合", "mini-turn"], ["小", "mini"], ["基地", "base"],
        ["达到", "reaches"], ["达", "reaches"], ["装配影响", "equip HP-affecting"],
        ["向前", "forward"], ["前", "forward"], ["拾起", "picks up"], ["拾", "pick up"],
        ["发挥作用", "take effect"], ["该格子", "that tile"], ["格子", "tile"], ["子", ""],
        ["机会", "chance"], ["机", "chance"], ["于", " at "],
        ["以血量优势", "with an HP advantage"], ["因先前", "from the earlier"], ["以腾出", "to make room"],
        ["开局同步", "game-start sync"], ["开局", "opening"], ["房", "room"],
        ["超出射程", "exceeds range"], ["超出", "exceeds"], ["被更近", "blocked by a closer"],
        ["超过", "exceeds"], ["最大", "max"], ["吗？", "?"], ["吗", "?"],
        ["超上限", "over the cap"], ["超", "over"], ["过干扰", "used Action Jam"],
        ["不足", "not enough"], ["足", "enough"], ["锻造", "forge"], ["新", "new"],
        ["免于秒杀", "saved from execution"], ["免于", "saved from"],
        ["拉出", "pull out"], ["拉入", "pull into"], ["所在", "its"], ["所", "its"],
        ["设为", "set to"], ["设", "set"],
        // ── 第三批：剩余主干残留词 ──
        ["无敌人", "no enemies"], ["级悬赏", "-level bounty"], ["级", "-level"],
        ["放弃选择", "gave up the choice"], ["放弃秒杀", "gave up the execution"], ["放弃使用", "chose not to use"],
        ["放弃获得", "gave up gaining"], ["放弃", "gave up"], ["弃", "up"],
        ["被秒杀击碎", "shattered by execution"], ["被秒杀", "was executed"], ["被斩杀", "was executed"],
        ["被击杀", "was killed"], ["被弃掉", "was discarded"], ["被主动移除", "was actively removed"],
        ["被完全减免", "completely negated"], ["被霜痕", "frozen by Frost Mark"], ["被凝血之刃", "hit by Bloodclot Blade"],
        ["被爱神", "bound by Cupid"], ["被替罪羊", "bound by Scapegoat"], ["被斩月", "by Crescent Blade"],
        ["被纱琳定身", "rooted by Shalin"], ["被控制", "was controlled"], ["被fireling", "protected by Fireling"],
        ["已用完", "used up"], ["用完", "used up"],
        ["替伤伤害", "redirected damage"], ["替伤", "redirected"],
        ["外来护盾", "external shield"], ["自带护盾", "innate shield"],
        ["受法伤", "takes magic damage"], ["法术减伤", "magic damage reduction"], ["使伤害完全抵消", "fully negates the damage"],
        ["但被动使其只减少1点生命", "but its passive reduces the loss to only 1 HP"],
        ["点", " point"], ["只", "only "], ["因", "due to"], ["干扰", "Action Jam"],
        ["一只", "one"], ["只", "only "],
        ["次", " times"], ["个敌人", " enemies"], ["个新敌人", " new enemies"], ["个标记", " marks"],
        ["个友方", " allies"], ["个已感染", " already infected"], ["个", ""], ["人", ""],
        ["共斩杀", "executed a total of"], ["庇护了", "shielded"], ["庇护", "shelter"],
        ["准备使用", "prepares to use"], ["请点击一个", "please click one"], ["请点击场上一格", "please click a tile on the board"],
        ["鼠疫感染", "Plague infects"], ["跳过了", "skipped"], ["跳过", "skip"], ["已感染", "already infected"],
        ["复活次数已用完", "revive uses are exhausted"], ["攻击次数已用完", "attack count exhausted"], ["移动次数已用完", "move count exhausted"],
        ["技能已用完", "skill uses exhausted"], ["被攻击", "is attacked"], ["已被", "already"],
        ["所在横线", "its row"], ["施法者所在横线", "the caster's row"],
        ["本回合已使用过", "already used this turn"], ["本回合已经", "already this turn"],
        ["护身符", "Amulet"], ["妖刀", "Demon Blade"], ["碎镜", "Shattered Mirror"],
        ["血魔指环", "Blood Demon Ring"], ["霜痕", "Frost Mark"], ["雷刃", "Thunder Blade"],
        ["苍鹰之羽", "Eagle Feather"], ["甘泉", "Spring"], ["虚无之衣", "Cloak of Void"],
        ["断脊", "Spine Breaker"], ["凝血之刃", "Bloodclot Blade"],
        // ── 功能词 / 高频连接词 ──
        ["初始各", "start with"], ["初始", "initial"], ["各", "each"], ["及", "and"], ["且", "and"],
        ["仅", "only"], ["等", "etc."], ["时", "when"], ["后", "after"], ["会", "will"], ["但", "but"],
        ["下两", "next two"], ["原地", "in place"], ["原地复活", "revives in place"], ["命中", "hits"],
        ["所有敌人", "all enemies"], ["游戏模式", "Game Mode"], ["费用上限", "cost cap"],
        ["会受到伤害", "still takes damage"], ["免疫", "immune to"], ["使用技能后", "after using the skill"],
        ["已经在新手教程中啦", "already in the tutorial!"], ["已经", "already"], ["中", ""], ["啦", ""],
        ["竖排", "column of"], ["其", "its "], ["及其", "and its"], ["目标格", "target tile"],
        ["同一", "the same"], ["另一个", "another"], ["其他", "other"], ["不同", "different"],
        ["消耗所有能量", "consume all energy"], ["能量", "energy"], ["风暴", "storm"], ["冲击", "impact"],
        ["爆发", "burst"], ["每点", "per point"], ["不可空放", "cannot be wasted"], ["空放", "wasted"],
        ["普攻次数", "attack count"], ["次数", "times"], ["可攻击", "can attack"], ["可移动", "can move"],
        ["可放置", "can place"], ["可重复", "can repeat"], ["重复", "repeat"], ["同一目标", "the same target"],
        ["减速", "slow"], ["加速", "haste"], ["减攻", "attack down"], ["减防", "defense down"],
        ["加防", "defense up"], ["护甲", "armor"], ["魔抗", "magic resist"], ["暴击", "critical"],
        ["闪避", "dodge"], ["反制", "counter"], ["免疫控制", "immune to control"], ["免疫位移", "immune to displacement"],
        ["免疫秒杀", "immune to execution"], ["免疫伤害", "immune to damage"], ["免疫减速", "immune to slow"],
        ["免疫冰冻", "immune to freeze"], ["免疫燃烧", "immune to burn"], ["免疫毒", "immune to poison"],
        ["免控", "immune to control"], ["霸体状态", "Super Armor state"], ["蓄力中", "while charging"],
        ["蓄力期间", "while charging"], ["完成蓄力", "finishes charging"], ["蓄力完成", "charge complete"],
        ["自动结束", "ends automatically"], ["强制结束", "forced to end"], ["中断", "interrupted"],
        ["被中断", "was interrupted"], ["打断", "interrupted"], ["提前", "early"],
        ["下一次", "the next"], ["下一次攻击", "the next attack"], ["下两次", "the next two"],
        ["首次", "the first"], ["首", "first "], ["次", "time"], ["回合内", "within this turn"],
        ["每回合一次", "once per turn"], ["每回合限", "once per turn"], ["限", "limited to"],
        ["各一次", "once each"], ["冷却", "cooldown"], ["冷却时间", "cooldown"], ["冷却回合", "cooldown turns"],
        ["共用冷却", "shared cooldown"], ["独立冷却", "independent cooldown"], ["同时", "simultaneously"],
        ["交替", "alternately"], ["轮流", "take turns"], ["依次", "in order"], ["分别", "respectively"],
        ["逐个", "one by one"], ["瞬间", "instantly"], ["立即", "immediately"], ["立刻", "instantly"],
        ["马上", "immediately"], ["暂时", "temporarily"], ["永久", "permanently"], ["一直", "forever"],
        ["始终", "always"], ["从不", "never"], ["有时候", "sometimes"], ["偶尔", "occasionally"],
        ["增加", "increases"], ["提高", "raises"], ["提升", "boosts"], ["增强", "enhances"],
        ["减少", "decreases"], ["降低", "lowers"], ["缩小", "shrinks"], ["扩大", "expands"],
        ["强化自身", "empowers itself"], ["强化", "empower"], ["强化效果", "empower effect"],
        ["持续时间", "duration"], ["持续时间延长", "extends duration"], ["延后", "delays"],
        ["转移", "transfer"], ["转移伤害", "transfer damage"], ["分担", "share"], ["平分", "split evenly"],
        ["分摊", "split"], ["减少伤害", "reduce damage"], ["抵挡伤害", "block damage"],
        ["吸收", "absorb"], ["抵消伤害", "negate damage"], ["反弹伤害", "reflect damage"],
        ["反弹", "reflect"], ["伤害反弹", "reflect damage"], ["生命值", "HP"], ["最大生命", "max HP"],
        ["当前生命", "current HP"], ["满血", "full HP"], ["残血", "low HP"], ["半血", "half HP"],
        ["回复至", "heals to"], ["恢复到", "restores to"], ["恢复", "recovers"], ["回复", "recovers"],
        ["治疗量", "healing amount"], ["护盾值", "shield amount"], ["护盾量", "shield amount"],
        ["护盾消失", "shield gone"], ["护盾破碎", "shield breaks"], ["破盾", "shield break"],
        ["护盾来源", "shield source"], ["自带护盾", "innate shield"], ["外来护盾", "external shield"],
        ["物理伤害", "physical damage"], ["法术伤害", "magic damage"], ["混合伤害", "mixed damage"],
        ["真实伤害", "true damage"], ["百分比伤害", "percentage damage"], ["固定伤害", "fixed damage"],
        ["伤害加成", "damage bonus"], ["伤害减免", "damage reduction"], ["伤害免疫", "damage immunity"],
        ["受到的治疗", "healing received"], ["受到伤害", "takes damage"], ["受伤", "takes damage"],
        ["被攻击", "is attacked"], ["被击中", "is hit"], ["命中", "hits"], ["未命中", "misses"],
        ["攻击者", "attacker"], ["目标", "target"], ["施法者", "caster"], ["施放者", "caster"],
        ["拥有者", "owner"], ["使用者", "user"], ["穿戴者", "wearer"], ["佩戴者", "wearer"],
        ["携带者", "carrier"], ["自身", "itself"], ["自身周围", "around itself"], ["自己周围", "around itself"],
        ["周围单位", "nearby units"], ["周围友方", "nearby allies"], ["周围敌方", "nearby enemies"],
        ["范围内的", "within range"], ["范围内所有", "all in range"], ["范围内敌人", "enemies in range"],
        ["直线", "straight line"], ["斜线", "diagonal"], ["十字", "cross"], ["十字范围", "cross area"],
        ["一条直线", "a straight line"], ["整列", "whole column"], ["整行", "whole row"],
        ["最远敌人", "farthest enemy"], ["最近敌人", "nearest enemy"], ["最远处", "farthest"],
        ["最前方", "frontmost"], ["最后方", "rearmost"], ["最左", "leftmost"], ["最右", "rightmost"],
        ["最上方", "topmost"], ["最下方", "bottommost"], ["上方", "above"], ["下方", "below"],
        ["上方两格", "two tiles above"], ["下方两格", "two tiles below"], ["前方两格", "two tiles in front"],
        ["正上方", "directly above"], ["正下方", "directly below"], ["斜上方", "diagonally above"],
        ["斜下方", "diagonally below"], ["斜前方", "diagonally in front"], ["斜后方", "diagonally behind"],
        ["后方两格", "two tiles behind"], ["同列", "same column"], ["同行", "same row"], ["同排", "same row"],
        ["同路", "same lane"], ["相邻格", "adjacent tile"], ["相邻单位", "adjacent unit"],
        ["邻接", "adjacent"], ["跨界", "cross-lane"], ["跨列", "cross column"], ["横跨", "spanning"],
        ["贯穿", "through"], ["横扫", "sweep"], ["扫射", "sweep fire"], ["全屏", "full screen"],
        ["全图", "whole map"], ["全场", "whole board"], ["全局", "global"], ["唯一", "unique"],
        ["同名", "same name"], ["同名单位", "units with the same name"], ["上限数量", "cap"],
        ["场上最多", "max on board"], ["存在上限", "existence cap"], ["同名上限", "same-name cap"],
        // ── 第三批：高频未覆盖词 ──
        ["敌人", "enemy"], ["城池", "castle"], ["城下", "gate"], ["本体", "base"], ["任一", "any"],
        ["位移至", "displace to"], ["位移", "displace"], ["普攻", "basic attack"], ["感染", "infect"],
        ["禁用", "disabled"], ["控制", "control"], ["前一", "the one in front"], ["重合", "overlap"],
        ["横行", "row"], ["翻倍", "doubles"], ["庇护", "shelter"], ["预选", "preselect"], ["取整", "rounded"],
        ["预选卡组1 - 均衡推进", "Preset 1 - Balanced Advance"], ["攻防兼备，综合万金油", "Balanced offense and defense, all-round"],
        ["预选卡组2 - 快攻速推", "Preset 2 - Aggro Rush"], ["高攻速多攻击，快速压制", "High attack speed, quick pressure"],
        ["预选卡组3 - 控制锁场", "Preset 3 - Control Lock"], ["群控铺场，限制敌方行动", "Mass control, limits enemy actions"],
        ["预选卡组4 - 法术炮台", "Preset 4 - Magic Battery"], ["法伤核心，远程轰击", "Magic damage core, long-range bombardment"],
        ["预选卡组5 - 铺场大军", "Preset 5 - Swarm Army"], ["大量低费单位，人海战术", "Many low-cost units, swarm tactics"],
        ["自由", "freely"], ["位置", "position"], ["队友", "teammate"], ["同化者", "Assimilator"],
        ["本列", "this column"], ["行动", "action"], ["模式", "mode"], ["模式下", "mode"],
        ["完成", "complete"], ["归零", "reaches zero"], ["进入", "enters"], ["共生死", "linked fate"],
        ["下一", "next"], ["重叠", "overlap"], ["摔投", "slam"], ["蓄势反击", "Brace Counter"],
        ["共享", "shared"], ["基础", "base"], ["代为承受", "suffers instead"], ["拉至", "pulls to"],
        ["生效", "takes effect"], ["换位", "swap positions"], ["变形", "transform"], ["自爆", "self-destruct"],
        ["行动干扰", "Action Jam"], ["结束", "ends"], ["开始", "starts"], ["试", "try"], ["试试", "try"],
        ["把", ""], ["即", "then"], ["再", "then"], ["出现", "appears"], ["黄框", "yellow frame"],
        ["金色边框", "gold border"], ["中间", "middle"], ["一行", "row"], ["间", ""], ["现", ""],
        ["动手", "hands-on"], ["掌握", "master"], ["基本", "basic"], ["建议", "suggest"], ["一步", "first step"],
        ["实战", "real battle"], ["熟悉", "get used to"], ["节奏", "rhythm"], ["祝", "wish"],
        ["旗开得胜", "good luck"], ["离身", "leaves"], ["放至", "place at"], ["放到", "place at"],
        ["将", ""], ["并", "and"], ["对", "to"], ["为", "is"], ["是", "is"], ["需到", "must be at"],
        ["打", "attack"], ["你的", "your"], ["我的", "my"], ["他们的", "their"], ["它的", "its"],
        ["己", "your "], ["之", " of "], ["上", " on "], ["下", " below "], ["里", " in "],
        ["面前", "in front of it"], ["眼前", "in front of it"], ["身后", "behind it"], ["侧面", "side"],
        ["本体伤害", "base damage"], ["减少本体", "reduces base"], ["直接攻击", "directly attack"],
        ["直接", "directly"], ["间接", "indirectly"], ["绕过", "bypass"], ["无视护盾", "ignores shields"],
        ["无视减伤", "ignores damage reduction"], ["无视阻挡", "ignores blockers"], ["无阻挡", "unblocked"],
        ["可穿透", "can pierce"], ["穿透敌人", "pierces enemies"], ["越过", "pass over"],
        ["不能走进", "cannot enter"], ["不可走入", "cannot enter"], ["不可走出", "cannot leave"],
        ["走开", "walk away"], ["离开", "leave"], ["移动到", "move to"], ["移动至", "move to"],
        ["瞬移", "teleport"], ["传送", "teleport"], ["闪现", "blink"], ["回溯", "rewind"],
        ["交换位置", "swap positions"], ["互换", "swap"], ["随机位置", "random tile"],
        ["随机一名", "a random"], ["随机一个", "a random"], ["随机", "random"],
        ["获得一张", "gain a"], ["获得一张牌", "gain a card"], ["抽一张", "draw a card"],
        ["抽到", "draw"], ["放入手牌", "into hand"], ["加入手牌", "to hand"], ["入手牌", "into hand"],
        ["放入卡组", "into deck"], ["洗入", "shuffle into"], ["洗牌", "shuffle"],
        ["删除", "delete"], ["移除效果", "remove effect"], ["失效", "fails"], ["作废", "void"],
        ["作废", "void"], ["覆盖", "overwrite"], ["叠加", "stack"], ["不叠加", "does not stack"],
        ["刷新", "refresh"], ["保留", "keep"], ["保持不变", "stays the same"], ["维持", "maintains"],
        ["额外攻击", "extra attack"], ["额外回合", "extra turn"], ["额外行动", "extra action"],
        ["额外移动", "extra move"], ["多一次", "one extra"], ["多一", "one more"], ["多", "more"],
        ["少一", "one less"], ["减少一次", "one less"], ["加一", "plus one"], ["减一", "minus one"],
        ["一点", "one point"], ["两点", "two points"], ["三点", "three points"], ["四点", "four points"],
        ["五点", "five points"], ["每一点", "each point"], ["每层", "per stack"], ["层数", "stacks"],
        ["层", " stack"], ["标记数", "mark count"], ["层标记", "stack marks"],
        ["起", ""], ["持久", "persists"], ["追加", "added"], ["可持续", "persists"], ["永续", "permanent"],
        ["一", "one"], ["两", "two"], ["二", "two"], ["三", "three"], ["四", "four"], ["五", "five"],
        ["六", "six"], ["七", "seven"], ["八", "eight"], ["九", "nine"], ["十", "ten"],
        ["放", "place"], ["留", "leave"], ["置", "put "], ["发出", "emits"], ["释放出", "releases"],
        ["狂风", "gale"], ["突刺", "thrust"], ["前突进", "dash forward"], ["突进", "dash"],
        ["组件", "piece"], ["致命", "lethal"], ["加持", "enhancement"], ["用完", "used up"],
        ["组成", "consists of"], ["玩法", "gameplay"], ["简单", "Easy"], ["信令服务", "signaling service"],
        ["底部", "bottom"], ["收割", "reap"], ["高攻", "high attack"], ["执行", "executes"],
        ["兜底", "fallback"], ["护体", "protection"], ["出场自带", "deploys with"], ["出场", "on deploy"],
        ["除外", "excluded"], ["以中线为对称轴", "symmetrical across the Mid Line"], ["对称轴", "axis of symmetry"],
        ["这是一款", "This is a"], ["双人回合制", "2-player turn-based"], ["战棋卡牌游戏", "tactics card game"],
        ["你的目标", "Your goal"], ["摧毁敌方城池", "destroy the enemy castle"], ["守住自己的城池", "defend your own castle"],
        ["棋盘是", "The board is"], ["的战场", " battlefield"], ["在最下方", "at the bottom"], ["最下方", "bottommost"],
        ["战场", "battlefield"], ["第5行", "Row 5"], ["第1行", "Row 1"], ["第", ""], ["行", " row"],
        ["同时", "also"], ["别忘了", "don't forget"], ["注意", "Note"], ["还有", "also"],
        ["以及", "and"], ["都", "all"], ["均", "all"], ["皆", "all"], ["亦", "also"],
        ["可同时", "can also"], ["不再", "no longer"], ["不得", "must not"], ["不必", "no need to"],
        ["无须", "no need to"], ["无需", "no need to"], ["未必", "may not"], ["必然", "surely"],
        ["推测", "predict"], ["估计", "estimate"], ["大约", "about"], ["大概", "roughly"],
        ["相对", "relative"], ["绝对", "absolute"], ["完全", "completely"], ["彻底", "thoroughly"],
        ["略微", "slightly"], ["稍", "slightly"], ["大幅", "greatly"], ["显著", "significantly"],
        // ── 第四批 ──
        ["黑暗中世纪", "Dark Age Saga"], ["欢迎来到", "Welcome to"], ["黑暗", "Dark"], ["世纪", "century"],
        ["请将设备交给", "Pass the device to"], ["设备", "device"], ["交给", "hand to"], ["选卡", "build a deck"],
        ["前两行", "the front two rows"], ["包括", "including"], ["吸引", "pull"], ["击退", "knock back"],
        ["悬赏", "bounty"], ["左右", "around"], ["二选一", "choose one of two"], ["加成", "bonus"],
        ["飞扇", "Flying Fan"], ["旋风踢", "Tornado Kick"], ["终点所", "the landing tile's"], ["终点", "landing tile"],
        ["生成方块", "spawns a block"], ["生成", "spawns"], ["方块", "block"], ["走出", "walk out"], ["走进", "walk into"],
        ["送酒", "serves wine"], ["献祭", "sacrifice"], ["祭献", "sacrifice"], ["前拉一", "pulls forward one"],
        ["吹号", "blows the horn"], ["一敌", "one enemy"], ["自主", "on its own"], ["就近原则", "nearest-target rule"],
        ["增伤", "bonus damage"], ["禁止", "forbidden"], ["禁止移动", "cannot move"], ["蓄势", "brace"],
        ["同化", "assimilate"], ["速度", "speed"], ["对称", "symmetrical"], ["对称生成", "spawns symmetrically"],
        ["无敌状态", "invincible state"], ["绝对", "absolute"], ["免疫状态", "immune state"],
        ["变回", "turns back into"], ["变回原样", "returns to normal"], ["恢复原样", "returns to normal"],
        ["召唤物", "summon"], ["召唤单位", "summoned unit"], ["单位上限", "unit cap"], ["已满员", "full"],
        ["格子已满", "tile is full"], ["空间不足", "no space"], ["没有空间", "no space"],
        ["无法生成", "cannot spawn"], ["无法召唤", "cannot summon"], ["无法进入", "cannot enter"],
        ["进入敌方", "enter enemy"], ["敌方格", "enemy tile"], ["己方格", "your tile"], ["空格", "empty tile"],
        ["满员", "full"], ["重叠上限", "overlap cap"], ["占位", "occupies a tile"], ["不占位置", "no tile needed"],
        ["不占用位置", "does not occupy a tile"], ["占用", "occupies"], ["挡住", "blocks"],
        ["阻挡敌人", "blocks enemies"], ["挡路", "blocks the way"], ["路", "path"],
        ["换路", "switch lane"], ["换列", "switch column"], ["绕行", "go around"], ["绕过", "bypass"],
        ["穿过", "pass through"], ["跨过", "cross over"], ["翻越", "climb over"], ["越过", "pass over"],
        ["改变", "change"], ["调整", "adjust"], ["重新", "re-"], ["再次", "again"], ["重置", "reset"],
        ["归位", "return to position"], ["回到原位", "back to original tile"], ["打回", "knocked back"],
        ["打回原格", "knocked back to origin"], ["拉回", "pull back"], ["推回", "push back"],
        ["推一格", "push one tile"], ["拉一格", "pull one tile"], ["击退一格", "knock back one tile"],
        ["击退两格", "knock back two tiles"], ["击退三格", "knock back three tiles"],
        ["向前一格", "one tile forward"], ["向后一格", "one tile backward"], ["向旁一格", "one tile sideways"],
        ["斜一格", "one diagonal tile"], ["任一格", "any tile"], ["任意一格", "any tile"],
        ["可选的格", "selectable tiles"], ["可选格", "selectable tile"], ["选中的格", "selected tile"],
        ["选择格", "choose a tile"], ["选中格", "selected tile"], ["被选格", "chosen tile"],
    ];

    // ── 正则规则（先于词典处理，覆盖数字组合模式） ──
    const ZH_EN_RULES = [
        [/第([0-9]+)\s*大回合/g, "Big Round $1"],
        [/第([0-9]+)\s*回合/g, "Turn $1"],
        [/([0-9]+)\s*大回合/g, "Big Round $1"],
        [/([0-9]+)\s*点法伤/g, "$1 magic damage"],
        [/([0-9]+)\s*点物伤/g, "$1 physical damage"],
        [/([0-9]+)\s*点伤害/g, "$1 damage"],
        [/([0-9]+)\s*点护盾/g, "$1 shield"],
        [/([0-9]+)\s*点生命/g, "$1 HP"],
        [/([0-9]+)\s*点费用/g, "$1 mana"],
        [/([0-9]+)\s*费/g, "$1 cost"],
        [/([0-9]+)\s*回合/g, "$1 turns"],
        [/([0-9]+)\s*次/g, "$1 times"],
        [/([0-9]+)\s*格/g, "$1 tiles"],
        [/([0-9]+)\s*步/g, "$1 steps"],
        [/([0-9]+)\s*血/g, "$1 HP"],
        [/([0-9]+)\s*杀/g, "$1 Kill Streak"],
        [/([0-9]+)\s*点/g, "$1"],
        [/([0-9]+)\s*级/g, "Grade $1"],
        [/剩余\s*([0-9]+)\s*张/g, "$1 left"],
        [/第([0-9]+)\s*行/g, "Row $1"],
    ];

    let _phrasesSorted = null;
    function ensurePhrasesSorted() {
        if (_phrasesSorted) return;
        // 合并短语词典 + 卡牌名（卡牌名会嵌入日志/toast/弹窗文本中）
        const entries = ZH_EN_PHRASES.slice();
        for (const k in CARD_NAMES_EN) entries.push([k, CARD_NAMES_EN[k]]);
        _phrasesSorted = entries.sort((a, b) => b[0].length - a[0].length);
    }

    // 中→英 短语级翻译（en 时生效；zh 时原样返回；未覆盖内容原样保留）
    function translateText(zh) {
        if (!zh) return zh;
        if (currentLang !== 'en') return zh;
        ensurePhrasesSorted();
        let s = zh;
        for (let r = 0; r < ZH_EN_RULES.length; r++) {
            s = s.replace(ZH_EN_RULES[r][0], ZH_EN_RULES[r][1]);
        }
        let out = '';
        let i = 0;
        const n = s.length;
        while (i < n) {
            let matched = null;
            for (let k = 0; k < _phrasesSorted.length; k++) {
                if (s.startsWith(_phrasesSorted[k][0], i)) { matched = _phrasesSorted[k][1]; i += _phrasesSorted[k][0].length; break; }
            }
            if (matched !== null) {
                // 前一个输出以字母/数字结尾（如规则生成的 "1 tiles"）且短语不以标点开头时，补一个空格
                if (out && /[A-Za-z0-9]$/.test(out) && !/^[.,!?;:)'')]/.test(matched)) out += ' ';
                out += matched;
                // 短语后始终补空格；清理阶段会压缩连续空格、并去掉标点前的空格
                out += ' ';
            } else {
                const ch = s[i];
                out += ch; // 数字/符号/emoji/未覆盖中文均原样保留
                i++;
            }
        }
        // 词典匹配完成后，剩余的全角标点转半角（规则期不做，避免破坏含标点的短语）
        out = out.replace(/，/g, ', ').replace(/。/g, '. ').replace(/！/g, '! ').replace(/？/g, '? ')
                 .replace(/：/g, ': ').replace(/（/g, ' (').replace(/）/g, ') ').replace(/、/g, ', ')
                 .replace(/；/g, '; ').replace(/％/g, '%').replace(/「/g, '"').replace(/」/g, '"');
        // 清理空格：压缩连续空格、去掉标点前的空格、去掉首尾空格
        out = out.replace(/\s+/g, ' ').replace(/\s+([.,!?;:)）])/g, '$1').replace(/\s+'/g, "'").trim();
        return out;
    }

    // 卡牌名显示（en 时返回英文名，否则原样）
    function cardNameDisplay(cn) {
        if (currentLang === 'en' && cn && CARD_NAMES_EN[cn]) return CARD_NAMES_EN[cn];
        return cn;
    }

    // 内联翻译助手：trText('中文', 'English') — en 时返回英文，zh 时返回中文
    function trText(zh, en) {
        return currentLang === 'en' ? en : zh;
    }

    // ── 卡牌详情（图鉴/手牌被动/技能描述）显示助手：en 时返回人工翻译的英文，zh 时返回原文 ──
    function cardDetailEN(card) {
        if (currentLang !== 'en' || !card) return null;
        return CARD_DETAILS_EN[card.name] ? CARD_DETAILS_EN[card.name] : null;
    }
    // 完整描述（desc）
    function cardDescDisplay(card) {
        const d = cardDetailEN(card);
        return d ? d.desc : (card ? card.desc : '');
    }
    // 被动名（passive）
    function cardPassiveText(card) {
        const d = cardDetailEN(card);
        return d ? d.passive : (card ? (card.passive || '') : '');
    }
    // 主动技能描述（skillDesc / skill2Desc）
    function cardSkillDescDisplay(card, which) {
        const d = cardDetailEN(card);
        if (!d) return '';
        if (which === 2) return CARD_SKILL2_EN[card.name] || d.skillDesc || '';
        return d.skillDesc || '';
    }

    // 教程步骤显示（en 时合并英文 title/text/buttonText，逻辑字段保留原步骤）
    function tutorialStepDisplay(idx) {
        const base = (typeof BEGINNER_TUTORIAL_STEPS !== 'undefined' && BEGINNER_TUTORIAL_STEPS[idx]) ? BEGINNER_TUTORIAL_STEPS[idx] : null;
        if (!base) return null;
        if (currentLang === 'en' && TUTORIAL_STEPS_EN[idx]) {
            return { ...base, title: TUTORIAL_STEPS_EN[idx].title, text: TUTORIAL_STEPS_EN[idx].text, buttonText: TUTORIAL_STEPS_EN[idx].buttonText };
        }
        return base;
    }

