// ========== 卡牌数据区 ==========
// CARD_TEMPLATES：卡牌配置对象（id 为键）
// CARD_LIBRARY：由 CARD_TEMPLATES 派生的数组

    const ROW_NAMES = ["红方城池","红方城下","中线","蓝方城下","蓝方城池"];
    const COLS = ["左路","中路","右路"];
    const SIDE_PLAYER0 = 0;
    const SIDE_PLAYER1 = 1;

    // ========== 📦 卡牌数据区 ==========
    // CARD_TEMPLATES: 以卡牌 id 为键的配置对象，所有卡牌增删改只需操作此对象
    // CARD_LIBRARY: 由 CARD_TEMPLATES 自动派生的数组，供现有代码使用
    const CARD_TEMPLATES = {
        // ════════ Grade 1（传说）════════

        // --- 蓄力/霸体 ---
        heavyAxeman: { id: "heavyAxeman", name: "重斧兵", grade: 1, cost: 3, life: 10, dmgType: "⚔️", dmgValue: 8, range: 1, speed: 1,
          passive: "霸体蓄力", desc: "普通攻击时自动蓄力1大回合后攻击，蓄力期间霸体（免疫眩晕、沉默等控制），但会受到伤害。冷却1大回合", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：蓄力/霸体

        // --- 移速/秒杀 ---
        knight: { id: "knight", name: "骑士", grade: 1, cost: 2, life: 4, dmgType: "⚔️", dmgValue: 2, range: 1, speed: 2,
          passive: "移速2", desc: "每回合可移动2步。技能：秒杀正前方1格的敌方单位（仅一次）。使用技能后移速降为1。", onDeathPassive: null,
          skill: "knightExecute", skillTargetType: "enemy", skillDesc: "秒杀前一格敌人（仅一次）" }, // 机制：秒杀/双速

        // --- 护盾/绝对免疫 ---
        chainedHunter: { id: "chainedHunter", name: "枷锁猎手", grade: 1, cost: 3, life: 3, dmgType: "⚔️", dmgValue: 2, range: 1, speed: 1,
          passive: "出场护盾", desc: "出场自带2点护盾，护盾归零时进入1回合绝对免疫（免疫所有伤害和秒杀），移速+1，攻速+1（永久）", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：护盾/绝对免疫

        // --- 亡语/复活 ---
        cat: { id: "cat", name: "猫", grade: 1, cost: 3, life: 1, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "九命", desc: "死亡后原地复活，最多8次", onDeathPassive: "reviveCat",
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：亡语/复活

        // --- 控制/共生死 ---
        cupid: { id: "cupid", name: "爱神", grade: 1, cost: 3, life: 2, dmgType: "🔮", dmgValue: 2, range: 1, speed: 1,
          passive: "", desc: "技能：选中全场任意两个单位共生死（可敌可友，自己除外），每回合1次，共2次，效果在爱神离场后仍存在", onDeathPassive: null,
          skill: "cupidCharm", skillTargetType: "enemy", skillDesc: "共生死" }, // 机制：共生死

        // --- 控制/定身 ---
        shaLin: { id: "shaLin", name: "纱琳", grade: 1, cost: 3, life: 3, dmgType: "🔮", dmgValue: 2, range: 1, speed: 1,
          passive: "", desc: "技能：选中全场任一格，将此刻处于格子中的敌人定身至下个我方回合结束，期间被定身敌人受到的物伤法伤+1，仅限两次，冷却2大回合", onDeathPassive: null,
          skill: "shaLinBind", skillTargetType: "self", skillDesc: "定身" }, // 机制：定身/增伤

        // --- 光环/自由移动 ---
        canMou: { id: "canMou", name: "参谋", grade: 1, cost: 2, life: 3, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "友方可自由移动", desc: "在场时所有友方可以自由向前后左右移动（不再只能向前）", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：光环/自由移动

        // --- 连击/抵伤 ---
        bloodydance: { id: "bloodydance", name: "血舞", grade: 1, cost: 2, life: 2, dmgType: "🔮", dmgValue: 2, range: 2, speed: 1,
          passive: "击杀加攻速", desc: "攻击范围2，每击杀一个敌方单位攻速+1；被动：受到伤害时自动弹出询问，可消耗1次额外攻速抵消最多2点伤害", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "自动抵消伤害" }, // 机制：连击/抵伤

        // --- 要塞/召唤 ---
        barracks: { id: "barracks", name: "军营", grade: 1, cost: 2, life: 4, dmgType: "⚔️", dmgValue: 0, range: 0, speed: 0,
          passive: "城下要塞", desc: "可以放置在我方城下，不能自己移动（可被友方技能位移）；周围九宫格内可放置友方单位", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：要塞/不可移动

        // --- 加费/征税 ---
        king: { id: "king", name: "国王", grade: 1, cost: 4, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "征税", desc: "若一个大回合内国王未受伤，下个大回合己方手牌费用-1；若受伤则+1。不叠加，不下于0", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：加费/征税

        // --- 标记/斩杀 ---
        zhanYue: { id: "zhanYue", name: "斩月", grade: 1, cost: 2, life: 4, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：标记前两行所有敌人（可追加）；从下回合起可斩杀标记中HP≤2的敌人。每回合标记/斩杀二选一，标记持久", onDeathPassive: null,
          skill: "zhanYueSkill", skillTargetType: "self", skillDesc: "标记/斩杀" }, // 机制：标记/斩杀

        // --- 远程/无限射程 ---
        princess: { id: "princess", name: "公主", grade: 1, cost: 3, life: 2, dmgType: "⚔️", dmgValue: 2, range: 99, speed: 1,
          passive: "无限射程", desc: "攻击范围无限，不能受到物伤加成；无单位阻挡时可在任意位置攻击敌方本体", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：无限射程

        // --- 连击/横扫 ---
        tripleBlade: { id: "tripleBlade", name: "三刀", grade: 1, cost: 3, life: 3, dmgType: "⚔️", dmgValue: 2, range: 1, speed: 1,
          passive: "三连横扫", desc: "每回合攻击3次，且可选择前方横线3格（前一横行）内任意敌方单位，可重复攻击同一目标", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "", extraAttacks: 2 }, // 机制：连击/横扫

        // --- 强化/AOE ---
        fireGod: { id: "fireGod", name: "火神", grade: 1, cost: 3, life: 2, dmgType: "🔮", dmgValue: 2, range: 2, speed: 1,
          passive: "攻击范围2", desc: "攻击范围2。技能：强化自身，在本回合及下两个我方回合内攻击范围+1，且普通攻击变为竖排3格AOE（命中目标格及其前方2格的所有敌人）（仅一次）", onDeathPassive: null,
          skill: "fireGodEmpower", skillTargetType: "self", skillDesc: "强化" }, // 机制：强化/射程/AOE

        // --- 滑步/双技能 ---
        shadowDancer: { id: "shadowDancer", name: "影舞姬", grade: 1, cost: 2, life: 3, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "滑步", desc: "可与敌方单位重合；使用主动技能后可自由位移1格并对终点格内所有敌方造成1点法伤（不消耗移动/攻击）。技能：飞扇——对正前方同列距离3内最近的敌方造成2点法伤；旋风踢——位移2格（任意方向，可原地释放），对终点所在横行的所有敌方造成1点法伤并眩晕2回合（两技分别冷却2大回合，每回合限1次，使用后本回合不能普通攻击，且不能进入敌方城池）", onDeathPassive: null,
          skill: "shadowFan", skill2: "shadowKick", skillTargetType: "enemy", skill2TargetType: "grid", skillDesc: "飞扇", skill2Desc: "旋风踢" }, // 机制：重合/滑步/双技能

        // --- 镜像/AOE ---
        mirrorPerson: { id: "mirrorPerson", name: "镜中人", grade: 1, cost: 2, life: 2, dmgType: "⚔️", dmgValue: 2, range: 1, speed: 1,
          passive: "镜像", desc: "可与敌方重合且不占友方重合上限；普通攻击为选中一格（自身格或相邻格）内所有敌人的AOE（可空放），镜像对称再打一次。技能：以中线为对称轴生成镜像（仅一次），镜像完全对称跟随本体行动、攻击，无法被选中，可进敌方城池；每回合可与镜像互换位置一次（对路径敌人造成1物伤，本体+1血）", onDeathPassive: null,
          skill: "mirrorSpawn", skillTargetType: "self", skillDesc: "生成镜像" }, // 机制：镜像/对称/AOE/换位

        // --- 方块/封锁 ---
        hephaestus: { id: "hephaestus", name: "赫菲斯托斯", grade: 1, cost: 3, life: 3, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：在全场（非敌方城池）任一格生成方块（敌方不可走入，原本处于该格的敌方不能走出），并对方块所在格及邻近4格（十字共5格）内所有敌人造成1法伤；方块在下个我方回合开始时消失（技能仅限3次，每回合限用一次）", onDeathPassive: null,
          skill: "hephaestusBlock", skillTargetType: "grid", skillDesc: "锻造方块" }, // 机制：方块/封锁/AOE

        // ════════ Grade 2（史诗）════════

        // --- 增益/送酒 ---
        bartender: { id: "bartender", name: "调酒师", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "", desc: "技能：给友方单位1点法伤，下次攻击伤害×2，冷却2大回合，每个调酒师限送2次", onDeathPassive: null,
          skill: "bartenderBuff", skillTargetType: "friendly", skillDesc: "送酒" }, // 机制：增益/双倍攻击

        // --- 蓄力 ---
        axeman: { id: "axeman", name: "斧兵", grade: 2, cost: 2, life: 5, dmgType: "⚔️", dmgValue: 5, range: 1, speed: 1,
          passive: "蓄力时被打断则失效", desc: "普通攻击时自动蓄力，锁定前方1格目标（单位或本体），下回合自动攻击。冷却2大回合", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：蓄力

        // --- 祭献 ---
        superman: { id: "superman", name: "超雄", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：献祭周围友方，提升下次攻击伤害", onDeathPassive: null,
          skill: "superMaleSkill", skillTargetType: "self", skillDesc: "祭献" }, // 机制：祭献/增伤

        // --- 位移/拉拽 ---
        siren: { id: "siren", name: "塞壬", grade: 2, cost: 2, life: 3, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：将场上任一敌方单位强制向前拉一格，冷却2大回合", onDeathPassive: null,
          skill: "sirenPull", skillTargetType: "enemy", skillDesc: "拉拽" }, // 机制：位移/拉拽

        // --- 增益/号角 ---
        hornSoldier: { id: "hornSoldier", name: "号角兵", grade: 2, cost: 2, life: 3, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：使自身与周围两个队友本回合移速+1，且其在下个友方回合恢复本回合受到伤害的一半，冷却2大回合", onDeathPassive: null,
          skill: "hornSoldierBuff", skillTargetType: "friendly", skillDesc: "吹号（选2个周围队友）" }, // 机制：增益/移速/恢复

        // --- 控制/弱化 ---
        weakener: { id: "weakener", name: "弱化师", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "", desc: "技能：使本列一敌下个敌方回合造成的伤害无效，每回合1次", onDeathPassive: null,
          skill: "weakenerSkill", skillTargetType: "enemy", skillDesc: "弱化" }, // 机制：控制/弱化

        // --- 控制/致盲 ---
        eagleEye: { id: "eagleEye", name: "鹰眼", grade: 2, cost: 2, life: 2, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：使全场一敌在下一个敌方回合内技能失效，被动保留，每回合1次", onDeathPassive: null,
          skill: "eagleEyeSkill", skillTargetType: "enemy", skillDesc: "致盲" }, // 机制：控制/致盲

        // --- 治疗 ---
        zhongyi: { id: "zhongyi", name: "中医", grade: 2, cost: 2, life: 3, dmgType: "🔮", dmgValue: 0, range: 1, speed: 1,
          passive: "", desc: "技能：使三个场上任意不重复友方+1血，包括自己，每回合1次，不满3人也可使用", onDeathPassive: null,
          skill: "zhongyiHeal", skillTargetType: "friendly", skillDesc: "治疗" }, // 机制：治疗

        // --- 瞬移/护盾 ---
        huYuanBing: { id: "huYuanBing", name: "护援兵", grade: 2, cost: 2, life: 5, dmgType: "⚔️", dmgValue: 0, range: 0, speed: 1,
          passive: "不占位置", desc: "不占用位置，可走进已满员的格子（不可与敌方重叠）；技能：移至任意一格并对该格友方和自己+2护盾，冷却2大回合", onDeathPassive: null,
          skill: "huYuanBingTeleport", skillTargetType: "self", skillDesc: "瞬移+护盾" }, // 机制：瞬移/超限/护盾

        // --- 自由移动/碰撞/蓄力 ---
        motorcyclist: { id: "motorcyclist", name: "机车党", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "自由移动/碰撞", desc: "可以自由前后左右移动，可与敌方重合，每次主动移动走进敌方所在格时对同格所有敌方造成1物伤。技能：蓄力1/2/3回合，蓄力完成的回合移速+3/6/9（蓄力期间不能移动，蓄力完成的回合不能再蓄力）", onDeathPassive: null,
          skill: "motorcyclistCharge", skillTargetType: "self", skillDesc: "蓄力" }, // 机制：自由移动/碰撞/蓄力

        // --- 增益/攻速翻倍 ---
        weaponsmith: { id: "weaponsmith", name: "武器商", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 0, range: 0, speed: 1,
          passive: "攻速翻倍", desc: "与武器商同格的友方单位剩余攻击次数×2（0×2=0），无论谁移动到谁的位置都生效", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：光环/攻速翻倍

        // --- 追击 ---
        chaser: { id: "chaser", name: "追刃", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：对本回合被攻击过的一个敌人追加1点不可抵挡的物伤，每回合限用一次", onDeathPassive: null,
          skill: "chaserExecute", skillTargetType: "enemy", skillDesc: "追击" }, // 机制：追击/真伤

        // --- 蓄力/AOE ---
        dualsword: { id: "dualsword", name: "双剑", grade: 2, cost: 2, life: 1, dmgType: "🔮", dmgValue: 4, range: 1, speed: 1,
          passive: "横扫蓄力", desc: "点击攻击时自动蓄力（不可普通攻击），高亮前方曼哈顿距离3的格子，下个我方回合自动释放AOE，冷却1大回合，蓄力期间自身不可移动不可位移", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：蓄力/延迟AOE（普通攻击形式）

        // --- 控制/吸引 ---
        scarecrow: { id: "scarecrow", name: "稻草人", grade: 2, cost: 2, life: 8, dmgType: "⚔️", dmgValue: 0, range: 0, speed: 0,
          passive: "不可移动", desc: "可放置在己方城池、城下或中线上，不能自主移动；技能：将前一横行的所有敌人吸引到面前（超限重叠），每回合限用一次", onDeathPassive: null,
          skill: "scarecrowAttract", skillTargetType: "self", skillDesc: "吸引（前一横行敌人）" }, // 机制：不可移动/吸引/位移

        // --- 减伤 ---
        numb: { id: "numb", name: "麻木者", grade: 2, cost: 2, life: 5, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "每次受伤减1生命", desc: "每次受到伤害都只减少1点生命，包括秒杀；不能被治疗", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：固定减伤/禁疗

        // --- 手牌/抽牌 ---
        wuzhong: { id: "wuzhong", name: "无中生有", grade: 2, cost: 1, life: 0, dmgType: "⚔️", dmgValue: 0, range: 0, speed: 0,
          passive: "手牌使用", desc: "不可放置到场上，可在己方回合使用，随机获得两张卡组中的牌", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：手牌/抽牌

        // --- 手牌/鼠疫 ---
        plague: { id: "plague", name: "鼠疫", grade: 2, cost: 2, life: 0, dmgType: "⚔️", dmgValue: 0, range: 0, speed: 0,
          passive: "手牌使用", desc: "不可放置到场上，使用时选定场上一格并使格子内所有敌人感染鼠疫；被感染敌人死亡时，使死亡单位所在格及上下左右四格内所有敌人受到1点真伤并感染鼠疫，已感染单位不会重复感染；弃牌不触发感染", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：手牌/感染/连锁真伤

        // --- AOE/暴击 ---
        yinyun: { id: "yinyun", name: "银运", grade: 2, cost: 2, life: 2, dmgType: "⚔️", dmgValue: 2, range: 1, speed: 1,
          passive: "AOE+暴击", desc: "攻击伤害AOE（命中目标格所有敌人），且每次攻击有50%概率伤害翻倍", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：AOE/暴击

        // --- 位移/重合 ---
        lueying: { id: "lueying", name: "掠影", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 1, range: 3, speed: 1,
          passive: "重合+位移攻击", desc: "可与敌方单位共存一格（放置/移动均可），攻击无视就近原则且只能攻击本列敌人；攻击时位移到目标所在格（已在同格则不动），对该格所有敌人造成物伤=1+round(已损生命×0.5)（每个敌人单独计算，合并为一次伤害）；不可攻击敌方城池及其内的敌方", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：重合/位移/已损生命加成

        // --- 召唤/分裂 ---
        skeleton: { id: "skeleton", name: "骷髅", grade: 2, cost: 2, life: 1, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "分裂放置", desc: "放置时在目标格生成两只骷髅，本横行另外两格各生成一只（格子满或有敌方则无法生成）", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：召唤/分裂

        // --- 连击/横扫 ---
        dualBlade: { id: "dualBlade", name: "双刀", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "连击横扫", desc: "每回合攻击2次，且可选择前方横线3格（前一横行）内任意敌方单位，可重复攻击同一目标", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "", extraAttacks: 1 }, // 机制：连击/横扫

        // --- 加费 ---
        feiji: { id: "feiji", name: "费机", grade: 2, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 0, range: 0, speed: 0,
          passive: "加费", desc: "每回合给我方加1费（额外的），一共可加3费", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：加费/不可移动

        // --- 摔投 ---
        hercules: { id: "hercules", name: "大力士", grade: 2, cost: 1, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "可选择摔投攻击", desc: "攻击前一格或后一格的敌人，可选择是否将其摔向相反方向", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：摔投/双向攻击

        // --- 法伤/庇护 ---
        witch: { id: "witch", name: "魔女", grade: 2, cost: 2, life: 2, dmgType: "🔮", dmgValue: 2, range: 1, speed: 1,
          passive: "自身受法伤-3", desc: "自身受到的法伤-3；技能：选中周围1/2/3个友方本回合受到法伤-3/2/1（每回合限用一次）", onDeathPassive: null,
          skill: "witchBuff", skillTargetType: "friendly", skillDesc: "法伤庇护" }, // 机制：法伤减免/庇护

        // --- 击杀成长 ---
        baoShiZhe: { id: "baoShiZhe", name: "暴食者", grade: 2, cost: 2, life: 4, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "击杀回血+增伤", desc: "每击杀一个敌方单位，自身生命回满且物伤永久+1", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：击杀回血/成长

        // --- 蓄势反击/护盾爆炸 ---
        counterSoldier: { id: "counterSoldier", name: "反击兵", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：蓄势反击：自己获得2点护盾，本回合禁止移动和普通攻击（可被位移）。下个我方回合开始时移除护盾并对周围九宫格所有敌人造成1点法伤。蓄势期间护盾每被消耗1点，下次普通攻击伤害+1（每回合限用一次，整局限用2次）", onDeathPassive: null,
          skill: "counterBrace", skillTargetType: "self", skillDesc: "蓄势反击" }, // 机制：蓄势/护盾/爆炸/反击

        // --- 同化/共享生命 ---
        assimilator: { id: "assimilator", name: "同化师", grade: 2, cost: 2, life: 2, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：将场上一个友方（不能是自己）变为同化者（3血1法伤，射程1移速1）；场上所有同阵营同化者共享生命，新增同化者会立即将生命加入共享，共享生命归零时所有同化者死亡（每回合限用一次）", onDeathPassive: null,
          skill: "assimilate", skillTargetType: "friendly", skillDesc: "同化" }, // 机制：同化/共享生命

        // --- 魔矢/标记 ---
        magicArrow: { id: "magicArrow", name: "魔矢人", grade: 2, cost: 2, life: 3, dmgType: "🔮", dmgValue: 1, range: 3, speed: 1,
          passive: "正前方3格", desc: "攻击距离为正前方同列1~3格。主动：选最近的敌方单位，其基础伤害-1，自己+1法伤，目标或自身死亡时加成消失。不能选0伤单位，不能被霸体/净化解除，目标死亡前不能再使用技能", onDeathPassive: null,
          skill: "magicArrowSkill", skillTargetType: "enemy", skillDesc: "魔矢标记" }, // 机制：标记/增伤/减伤

        // --- 蓄力/攻速 ---
        blazeArcher: { id: "blazeArcher", name: "炽炎射手", grade: 2, cost: 2, life: 3, dmgType: "🔮", dmgValue: 1, range: 3, speed: 1,
          passive: "正前方3格", desc: "攻击距离为正前方同列1~3格。主动：蓄力1/2/3回合（期间不能攻击，可以移动），蓄力完成的回合攻击速度+1/2/3次，每次攻击+0/1/1法伤（蓄力完成的回合不能再蓄力）", onDeathPassive: null,
          skill: "blazeArcherCharge", skillTargetType: "self", skillDesc: "蓄力" }, // 机制：蓄力/攻速加成

        // --- 绫罗/回程 ---
        riluo: { id: "riluo", name: "绫罗", grade: 2, cost: 2, life: 2, dmgType: "⚔️", dmgValue: 1, range: 3, speed: 1,
          passive: "绫罗", desc: "攻击范围正前方三格；绫罗离身时攻击次数+1。技能：放绫罗——将绫罗放至所在格及九宫格内任一格；位移留绫罗——位移至周围一格并将绫罗留在原地。绫罗离身时只能回绫罗（己方回合可自主回，敌方回合受致命伤时免疫并自动回）。只能放出3次。", onDeathPassive: null,
          skill: "riluoRelease", skill2: "riluoDash", skillTargetType: "grid", skill2TargetType: "grid", skillDesc: "放绫罗", skill2Desc: "位移留绫罗" }, // 机制：射程/标记/回程

        // ════════ Grade 3（普通）════════

        // --- 基础/首击双倍 ---
        soldier: { id: "soldier", name: "士兵", grade: 3, cost: 1, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "第一次攻击伤害×2", desc: "普通士兵，首次攻击伤害翻倍", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：首击双倍

        // --- 远程 ---
        archer: { id: "archer", name: "弓箭手", grade: 3, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 1, range: 3, speed: 1,
          passive: "远程射击", desc: "可攻击正前方3格", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：远程

        // --- 亡语/复活 ---
        cockroach: { id: "cockroach", name: "蟑螂", grade: 3, cost: 1, life: 1, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "死后在本路城池复活", desc: "法伤，死亡时如果不在城池，则在同列己方城池复活", onDeathPassive: "revive",
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：亡语/复活

        // --- 亡语/秒杀 ---
        hunter: { id: "hunter", name: "猎人", grade: 3, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "死后由己方选择本路一个敌人秒杀（可选不杀）", desc: "死亡时，己方玩家选择同列一个敌方单位直接消灭，或选择不杀", onDeathPassive: "execute",
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：亡语/秒杀

        // --- 免疫 ---
        drunkard: { id: "drunkard", name: "酒鬼", grade: 3, cost: 2, life: 2, dmgType: "⚔️", dmgValue: 2, range: 1, speed: 1,
          passive: "免疫饮酒debuff", desc: "调酒师的送酒不会对其造成伤害。技能：两回合内免疫死亡（仅一次）", onDeathPassive: null,
          skill: "drunkardInvincible", skillTargetType: "self", skillDesc: "两回合内免疫死亡（仅一次）" }, // 机制：无敌/延迟死亡

        // --- 替伤/同行 ---
        guard: { id: "guard", name: "守卫", grade: 3, cost: 1, life: 5, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "同行承受伤害", desc: "同行友方受到伤害时，由守卫代为承受", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：替伤/同行

        // --- 增益/鼓舞 ---
        drummer: { id: "drummer", name: "鼓手", grade: 3, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "", desc: "技能：本回合使周围八格内两个友方物理伤害+1", onDeathPassive: null,
          skill: "drummerBuff", skillTargetType: "friendly", skillDesc: "鼓舞" }, // 机制：增益/物伤+1

        // --- 位移/拉人 ---
        cowboy: { id: "cowboy", name: "牛仔", grade: 3, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：将友方单位拉至自己所在横线的任意格子，冷却2大回合", onDeathPassive: null,
          skill: "cowboyPull", skillTargetType: "friendly", skillDesc: "拉人" }, // 机制：位移/拉人

        // --- 控制/眩晕 ---
        hypnotist: { id: "hypnotist", name: "催眠师", grade: 3, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "", desc: "技能：使一个敌方单位眩晕2回合，每回合可用1次", onDeathPassive: null,
          skill: "hypnotistStun", skillTargetType: "enemy", skillDesc: "催眠" }, // 机制：控制/眩晕/减冷却

        // --- 净化 ---
        purifier: { id: "purifier", name: "净化师", grade: 3, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "每回合开始时清除友方所有负面效果", desc: "放置时立即生效，清除眩晕/沉默/弱化/致盲/手牌禁用", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：净化/被动

        // --- 位移/换位 ---
        singer: { id: "singer", name: "歌女", grade: 3, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "", desc: "技能：交换两个友方单位的位置，冷却2大回合", onDeathPassive: null,
          skill: "singerSwap", skillTargetType: "friendly", skillDesc: "换位" }, // 机制：位移/换位

        // --- 嘲讽 ---
        taunter: { id: "taunter", name: "显眼包", grade: 3, cost: 1, life: 4, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "嘲讽", desc: "强制敌方攻击/技能优先选择自己", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：嘲讽

        // --- 位移/瞬移 ---
        correspondent: { id: "correspondent", name: "通讯员", grade: 3, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 2, range: 1, speed: 1,
          passive: "", desc: "技能：每回合可位移至任一友方处", onDeathPassive: null,
          skill: "correspondentMove", skillTargetType: "friendly", skillDesc: "位移至友方位置" }, // 机制：位移/瞬移

        // --- 护盾/触发 ---
        shield: { id: "shield", name: "护盾", grade: 3, cost: 1, life: 1, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "触发型护盾", desc: "在我方单位或本体受到伤害时可选择消耗此护盾抵挡", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：护盾/触发

        // --- 成长 ---
        berserker: { id: "berserker", name: "狂战士", grade: 3, cost: 1, life: 1, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "出场时敌方每有一个单位生命+1", desc: "出场时敌方每有一个单位，基础生命+1；若生命≥5则需2费放置", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：成长/动态费用

        // --- 替伤/同列 ---
        shieldGuard: { id: "shieldGuard", name: "盾兵", grade: 3, cost: 2, life: 5, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "为所在竖线的队友抵挡伤害", desc: "同列友方受到伤害时由盾兵承受", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：替伤/同列

        // --- 变形 ---
        slave: { id: "slave", name: "奴隶", grade: 3, cost: 0, life: 2, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：消耗自身+手牌中两张奴隶，变为任意单位", onDeathPassive: null,
          skill: "slaveTransform", skillTargetType: "self", skillDesc: "消耗三张奴隶变形" }, // 机制：变形/消耗手牌

        // --- 转移/真伤 ---
        wizard: { id: "wizard", name: "巫师", grade: 3, cost: 1, life: 3, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "攻击命中后可将伤害转移到敌方场上任一单位且不可抵挡", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：伤害转移/真伤

        // --- 光环/增伤减伤 ---
        aifei: { id: "aifei", name: "爱妃", grade: 3, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "前方两格内友方物伤法伤+1，受法伤-1", desc: "光环效果：前方两格内友方普攻/法伤+1，受到的法术伤害-1", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：光环/增伤/减伤

        // --- 手牌控制 ---
        jinWei: { id: "jinWei", name: "禁卫", grade: 3, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：禁用对方的一张手牌（不能放置，可以弃牌），持续1大回合", onDeathPassive: null,
          skill: "jinWeiDisable", skillTargetType: "enemy", skillDesc: "禁用对手手牌" }, // 机制：手牌控制/禁用

        // --- 击退/位移 ---
        windSoldier: { id: "windSoldier", name: "风兵", grade: 3, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "", desc: "技能：将全场敌人击退2格（向敌方城池反方向），仅限一次，可超限重叠", onDeathPassive: null,
          skill: "windSoldierSkill", skillTargetType: "self", skillDesc: "狂风（全场击退）" }, // 机制：击退/全场/超限

        // --- 自爆/同列免疫 ---
        fireman: { id: "fireman", name: "火人", grade: 3, cost: 2, life: 2, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "本列友方免疫控制", desc: "本列友方免疫控制；技能：自爆对本列所有敌方造成1法伤", onDeathPassive: null,
          skill: "firemanDetonate", skillTargetType: "self", skillDesc: "自爆" }, // 机制：同列免疫/自爆

        // --- 替死 ---
        scapegoat: { id: "scapegoat", name: "替罪羊", grade: 3, cost: 0, life: 1, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "替死", desc: "技能：当有友方收到致死伤害时，可将死亡转移到自己身上", onDeathPassive: null,
          skill: "scapegoatTransfer", skillTargetType: "friendly", skillDesc: "替死" }, // 机制：替死/转移致死

        // --- 加费/攻击加费 ---
        feizhe: { id: "feizhe", name: "费者", grade: 3, cost: 1, life: 3, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "攻击加费", desc: "每攻击一次我方加1费", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：加费/攻击触发

        // --- 免伤 ---
        flagBearer: { id: "flagBearer", name: "旗手", grade: 3, cost: 2, life: 2, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "", desc: "技能：使场上任一友方（含自己）在下个敌方回合免疫物伤，可选自己，每回合限用一次", onDeathPassive: null,
          skill: "flagBearerBuff", skillTargetType: "friendly", skillDesc: "免物伤" }, // 机制：免物伤

        // --- 蓄力/远程 ---
        crossbowman: { id: "crossbowman", name: "弩手", grade: 3, cost: 2, life: 2, dmgType: "⚔️", dmgValue: 5, range: 3, speed: 1,
          passive: "蓄力攻击", desc: "普通攻击时自动蓄力，下回合自动攻击射程3内的敌人（就近原则），打敌方本体需到敌方城下。冷却1大回合", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：蓄力/远程

        // --- 蓄力横扫/真伤 ---
        halberdier: { id: "halberdier", name: "戟兵", grade: 3, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 2, range: 1, speed: 1,
          passive: "蓄力横扫", desc: "普通攻击造成真实伤害（无视护盾与减伤）。技能：本回合不普攻并蓄力，下回合对前一横行所有敌人造成3真伤，仅可使用一次", onDeathPassive: null,
          skill: "halberdierCharge", skillTargetType: "enemy", skillDesc: "蓄力横扫（仅一次）" }, // 机制：蓄力/横扫/真伤

        // --- 干扰 ---
        nerd: { id: "nerd", name: "四眼仔", grade: 3, cost: 1, life: 2, dmgType: "⚔️", dmgValue: 0, range: 1, speed: 1,
          passive: "", desc: "技能：使下个敌方回合的第一个控制单位的自主行动无效，每回合限用一次", onDeathPassive: null,
          skill: "nerdJam", skillTargetType: "none", skillDesc: "行动干扰（每回合一次）" }, // 机制：干扰/无效化

        // --- 九宫格AOE ---
        xuanFuRen: { id: "xuanFuRen", name: "旋斧人", grade: 3, cost: 1, life: 3, dmgType: "🔮", dmgValue: 1, range: 1, speed: 1,
          passive: "九宫格AOE", desc: "普通攻击为所在格及周围九宫格（自身+周围8格）内所有敌人的AOE法伤", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：AOE/九宫格

        // ════════ Grade 2（史诗）- 新增 ════════

        // --- 强化普攻/突进/AoE ---
        spearman: { id: "spearman", name: "标枪手", grade: 2, cost: 2, life: 3, dmgType: "⚔️", dmgValue: 1, range: 1, speed: 1,
          passive: "每回合开始强化普攻", desc: "每回合开始获得1次强化普攻（最多存2次）。技能：强化普攻（突刺）：+1物伤，向前突进1格并对前一格所有敌人造成AOE伤害。击杀后本回合普攻次数刷新。有强化普攻时不能普通攻击。", onDeathPassive: null,
          skill: "spearmanThrust", skillTargetType: "self", skillDesc: "突刺" }, // 机制：强化普攻/突进/AoE/击杀刷新

        // --- 蓄力/横行AOE ---
        qinmo: { id: "qinmo", name: "琴魔", grade: 2, cost: 2, life: 1, dmgType: "🔮", dmgValue: 3, range: 1, speed: 1,
          passive: "蓄力横行", desc: "主动：蓄力选中一横行（不能攻击，可以移动），下个我方回合对该横行所有敌人造成3点法伤。蓄力完成回合不能再蓄力或进行普通攻击", onDeathPassive: null,
          skill: "qinmoCharge", skillTargetType: "grid", skillDesc: "蓄力横行" }, // 机制：蓄力/横行AOE

        // --- 弱化攻击 ---
        mage: { id: "mage", name: "法师", grade: 3, cost: 1, life: 2, dmgType: "🔮", dmgValue: 1, range: 2, speed: 1,
          passive: "弱化攻击", desc: "攻击范围正前方2格，被法师攻击后受到弱化效果（持续2小回合）", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：弱化攻击

        // --- AOE攻击/击杀成长 ---
        swordsman: { id: "swordsman", name: "剑客", grade: 3, cost: 2, life: 3, dmgType: "🔮", dmgValue: 1, range: 2, speed: 1,
          passive: "AOE攻击", desc: "攻击为AOE，攻击范围为正前方同列2格内所有敌人。造成击杀后攻击范围+1", onDeathPassive: null,
          skill: null, skillTargetType: null, skillDesc: "" }, // 机制：AOE攻击/击杀成长

        // --- 风女：远程+能量系统 ---
        windGirl: { id: "windGirl", name: "风女", grade: 2, cost: 2, life: 2, dmgType: "🔮", dmgValue: 1, range: 3, speed: 1,
          passive: "风之步", desc: "攻击范围正前方3格，普通攻击后可自由移动一格（不消耗移速，每回合1次）。每回合只能用一次主动技能",
          onDeathPassive: null,
          skill: "windGirlSkill", skillTargetType: "self", skillDesc: "风暴冲击/能量爆发" }, // 机制：远程/能量/自由移动
    };
    // CARD_LIBRARY 由 CARD_TEMPLATES 自动派生，保持数组形态供现有代码使用
    const CARD_LIBRARY = Object.values(CARD_TEMPLATES);
