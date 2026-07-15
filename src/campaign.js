export const CAMPAIGN_START_STAGE = 8;

const acts = [
  {
    act: "第二部・建国の火種",
    theme: "dawn",
    enemies: ["残党ねば吉", "芋浪人ゴロベエ", "野良とろろ", "根無しのハチ", "長芋足軽モチオ"],
    missions: [
      { kind: "talk", title: "王冠より先に会議", text: "野営地のかぴ政宗と、できたて帝国の方針を決める", zone: "カピバラ帝国・仮設王都", advisor: "大長老を倒しただけでは国になりません。食料、道、見張り台、それと国名を決める会議が必要です。", quip: "会議多すぎ。もう『カピバラ帝国』でよくね？ 書類はあとで何とかしろ。" },
      { kind: "battle", title: "森に残ったねばり", text: "王都周辺を荒らす長芋残党を22体追い払う", target: 22, arena: "forest", zone: "王都北・木漏れ日巡回路", advisor: "森に長芋の残党が集結中です。建国一日目から治安が終わっています。", quip: "国できた瞬間に残業かよ。めんどくせーけど、王が直接しばく！" },
      { kind: "battle", title: "消えた温泉まんじゅう", text: "黄金湿原の補給路を占拠した長芋盗賊を28体倒す", target: 28, arena: "marsh", zone: "黄金湿原・まんじゅう街道", advisor: "帝国の温泉まんじゅうが一晩で全部消えました。足跡がやたら縦長です。", quip: "食い物の恨みは国境より重い。犯人、覚悟しろ。" },
      { kind: "battle", title: "夜襲とか聞いてねぇ", text: "黒土前線へ押し寄せる残党34体を迎え撃つ", target: 34, arena: "front", zone: "黒土前線・月なし野営地", advisor: "今夜、残党軍が前線を襲います。こちらの兵はまだ軍服すら届いていません。", quip: "寝る直前に来るなよ！ パジャマ代わりの毛皮で出撃だ！" },
      { kind: "battle", title: "建国祭を守れ", text: "王都へ突入した精鋭40体を倒し、建国祭を守る", target: 40, arena: "fortress", zone: "カピバラ帝国・建国祭会場", elite: 1.18, advisor: "建国祭の招待客に長芋精鋭が混ざっています。全員、招待状がぬるぬるです。", quip: "客のふり雑すぎ！ 祭り荒らした代金、頭突きで払わせる！" },
      { kind: "boss", title: "残党大将ネバツナ", text: "建国を認めない残党大将ネバツナを倒す", arena: "fortress", zone: "旧黒土砦・将軍の間", boss: { name: "残党大将 ネバツナ", hp: 2400, damage: 23, scale: 1.58, line: "ネバハハハ！ 毛玉が王を名乗る国など、三日でぬるぬるにしてくれる！" }, quip: "三日も待てねぇ。今ここで終わらせる。こっちは祭りの料理が冷めるんだよ！" },
    ],
  },
  {
    act: "第三部・白根海道",
    theme: "coast",
    enemies: ["白根水兵イモタ", "潮風とろろ", "長芋船頭ネバ六", "漂流芋スルメ", "海道番モチベエ"],
    missions: [
      { kind: "talk", title: "地図が縦に長い", text: "かぴ政宗から、海の向こうの白根海道について聞く", zone: "王都・遠征軍議所", advisor: "東の白根海道から交易船が来ません。海岸線を長芋水軍が封鎖したようです。", quip: "海まで行くの？ 毛、乾かすの大変なんだけど。まあ船ごと取り返すか。" },
      { kind: "battle", title: "潮だまりの検問", text: "海道入口の長芋水兵を30体突破する", target: 30, arena: "forest", zone: "白根海道・潮だまり関所", advisor: "関所では通行料としてグラサン一個を要求しています。明らかに王狙いです。", quip: "またグラサンかよ。長芋族、欲しい物のセンスだけ一貫してんな！" },
      { kind: "battle", title: "ぬるぬる船団", text: "交易船を囲む長芋水軍38体を撃破する", target: 38, arena: "marsh", zone: "白根海道・浅瀬の船団", advisor: "敵船は船底にとろろを塗り、高速で滑っています。理屈は分かりません。", quip: "分からなくていい。止まったところを殴れば普通の芋だ！" },
      { kind: "battle", title: "灯台を取り戻せ", text: "灯台を占拠した長芋守備隊46体を倒す", target: 46, arena: "front", zone: "白根岬・ねばり灯台", advisor: "灯台が巨大な長芋型に改造されました。夜になると口だけ光ります。", quip: "怖ぇしダサい！ 元に戻す前に写真だけ撮っとけ！" },
      { kind: "battle", title: "海道大包囲", text: "白根城へ続く海岸で精鋭52体を退ける", target: 52, arena: "fortress", zone: "白根城下・塩風平原", elite: 1.25, advisor: "白根城の全軍が出ました。ここを越えれば海道の民を解放できます。", quip: "数えるのめんどくせー。立ってる長芋、全部敵ってことで！" },
      { kind: "boss", title: "海道将軍シロガネ", text: "白根海道を支配する将軍シロガネを倒す", arena: "fortress", zone: "白根城・潮騒天守", boss: { name: "海道将軍 シロガネ", hp: 3900, damage: 28, scale: 1.7, line: "海はすべてを洗い流す。貴様の帝国も、その安いグラサンもな！" }, quip: "これは安物じゃねぇ！ 値段は知らんけど、生まれた時からの相棒だ！" },
    ],
  },
  {
    act: "第四部・ねばり月の内乱",
    theme: "moon",
    enemies: ["月影芋クノイチ", "密書持ちネバ蔵", "裏切り芋トロ平", "仮面長芋カケル", "月見番イモゾウ"],
    missions: [
      { kind: "talk", title: "王都に長芋がいる", text: "正体不明の密書について、かぴ政宗と相談する", zone: "王都・封鎖された会議室", advisor: "王宮の机から長芋族の密書が見つかりました。筆跡が縦長すぎて読みにくいです。", quip: "裏切り者探し？ そういう頭使う回、聞いてねぇんだけど。" },
      { kind: "battle", title: "月影の追跡者", text: "王都へ潜入した月影衆36体を捕らえる", target: 36, arena: "forest", zone: "王都外周・月見林", advisor: "月影衆は木のふりをしています。枝がなくて縦長なので、かなり目立ちます。", quip: "隠れる気ある？ 見つけた順に事情聴取という名の頭突きだ！" },
      { kind: "battle", title: "三つの偽命令", text: "偽の王命で動く長芋部隊46体を止める", target: 46, arena: "marsh", zone: "黄金湿原・偽王命の陣", advisor: "『全員昼寝せよ』という偽王命が出回っています。兵士の支持率だけは高いです。", quip: "それ本物にしようぜ……ダメ？ じゃあ偽物を配ったやつだけ倒す。" },
      { kind: "battle", title: "仲間を疑うな", text: "仲間を分断する長芋工作隊56体を撃破する", target: 56, arena: "front", zone: "黒土前線・疑心の峡谷", advisor: "敵は仲間の悪口を言いふらしています。『ごん太は風呂が長い』など、半分は事実です。", quip: "事実でも今言うな！ こっちのケンカはあとでやる！" },
      { kind: "battle", title: "王宮奪還", text: "占拠された王宮から精鋭64体を追い出す", target: 64, arena: "fortress", zone: "カピバラ王宮・逆さ旗の間", elite: 1.32, advisor: "王宮の旗が長芋印に交換されました。しかも縦長すぎて天井を突き抜けています。", quip: "俺の城で好き放題しやがって。家賃まとめて払え！" },
      { kind: "boss", title: "裏将軍トロミツ", text: "内乱を操っていた裏将軍トロミツを倒す", arena: "fortress", zone: "王宮地下・裏ねばりの間", boss: { name: "裏将軍 トロミツ", hp: 5700, damage: 33, scale: 1.78, line: "疑いこそ国を腐らせる最高のとろろよ。仲間など捨ててしまえ！" }, quip: "うちの仲間は面倒だけど捨てねぇ。面倒ごとまとめて帝国なんだよ！" },
    ],
  },
  {
    act: "第五部・地底根城",
    theme: "cavern",
    enemies: ["地底芋モグラ", "根掘りネバ助", "岩肌とろろ", "暗闇芋ランタン", "根城衛士ゴボウ似"],
    missions: [
      { kind: "talk", title: "地面から宣戦布告", text: "王都の真下から届いた宣戦布告を読む", zone: "王都・突然できた大穴", advisor: "王都の広場に穴が開き、地底長芋王国から宣戦布告が届きました。便せんは土まみれです。", quip: "次は地下？ 空とか言い出す前に終わらせるぞ。フラグじゃねぇからな！" },
      { kind: "battle", title: "根っこの迷宮", text: "地底入口を守る長芋兵44体を突破する", target: 44, arena: "forest", zone: "地底根城・第一根道", advisor: "道が全部同じに見えます。目印に温泉まんじゅうを置きながら進みましょう。", quip: "帰り道で全部食うから、目印なくなるぞ。それまでに突破！" },
      { kind: "battle", title: "地下温泉争奪戦", text: "帝国の源泉を奪った長芋坑夫54体を倒す", target: 54, arena: "marsh", zone: "地底根城・黄金源泉", advisor: "地底軍が帝国温泉の源泉をせき止めています。国民の毛並みが限界です。", quip: "それは国家非常事態！ 風呂を返せ、今すぐ！" },
      { kind: "battle", title: "古代根の守り", text: "巨大な古代根を守る衛士66体を退ける", target: 66, arena: "front", zone: "地底根城・千年根回廊", advisor: "この根が地上の森全体につながっています。敵に切られれば帝国が枯れます。", quip: "森ごと人質とか陰湿すぎ。根一本、傷つけさせねぇ！" },
      { kind: "battle", title: "地底王都包囲", text: "根城中心部の重装兵76体を突破する", target: 76, arena: "fortress", zone: "地底王都・黒根大門", elite: 1.38, advisor: "黒根大門に全地底軍が集結。正面突破以外の道は崩れました。", quip: "道が一本なら迷わなくて済む。全員まとめてどけどけー！" },
      { kind: "boss", title: "根王ガンモドキ", text: "地底の根を支配する根王ガンモドキを倒す", arena: "fortress", zone: "地底王都・根王座", boss: { name: "根王 ガンモドキ", hp: 8200, damage: 38, scale: 1.9, line: "地上の国など根無し草！ 我が千年根の前にひれ伏せ、丸き獣よ！" }, quip: "名前、芋なのかガンモなのかハッキリしろ！ その王座ごと地上に返す！" },
    ],
  },
  {
    act: "第六部・空中棚田",
    theme: "sky",
    enemies: ["雲乗り芋フワタ", "棚田兵ネバ空", "落下長芋ヒュー助", "風切りとろろ", "天空番イモカゼ"],
    missions: [
      { kind: "talk", title: "だから空はフラグだって", text: "空に浮かんだ長芋棚田への遠征を決める", zone: "王都・対空軍議所", advisor: "空に巨大な棚田が現れ、長芋兵が降ってきました。前回の発言が見事なフラグでしたね。", quip: "言うな！ カピバラが空飛ぶ方法から考えるの、めんどくせー！" },
      { kind: "battle", title: "雲の渡り道", text: "天空への道を守る長芋飛行兵52体を倒す", target: 52, arena: "forest", zone: "空中棚田・雲の渡り道", advisor: "雲を固めた道です。端に寄ると落ちるので、なるべく真ん中で戦ってください。", quip: "高い所で押すなよ！ いや敵は押す！ 先にこっちが押す！" },
      { kind: "battle", title: "雨雲製造所", text: "帝国へ泥雨を降らせる長芋技師64体を止める", target: 64, arena: "marsh", zone: "空中棚田・雨雲工房", advisor: "敵は黄金湿原の泥を空から降らせる計画です。洗濯物が全滅します。", quip: "地味に最悪！ 国民の布団を守るぞ！" },
      { kind: "battle", title: "逆風の大階段", text: "強風地帯を守る天空兵78体を突破する", target: 78, arena: "front", zone: "空中棚田・千段ねばり坂", advisor: "向かい風と長い階段と長芋軍です。全部まとめて疲れる要素しかありません。", quip: "途中に休憩所ないの？ ない？ じゃあ敵をイス代わりにする！" },
      { kind: "battle", title: "天守棚田決戦", text: "天空天守を守る精鋭90体を撃破する", target: 90, arena: "fortress", zone: "空中棚田・天守田んぼ", elite: 1.45, advisor: "天空軍の総動員です。勝てば帝国の空を取り戻せます。", quip: "空は誰のものでもねぇけど、長芋だけのものにはさせねぇ！" },
      { kind: "boss", title: "天芋将イモノカミ", text: "空中棚田の主、天芋将イモノカミを倒す", arena: "fortress", zone: "空中棚田・雷雲本陣", boss: { name: "天芋将 イモノカミ", hp: 11600, damage: 44, scale: 2.02, line: "地を這う獣が天を望むか！ 雷と共に落ちるがいい！" }, quip: "カピバラは泳げるし、今日は飛ぶ！ 常識は森に置いてきた！" },
    ],
  },
  {
    act: "最終部・大ねばり戦争",
    theme: "final",
    enemies: ["始祖兵オロシ", "古根長芋ゼロ号", "終末とろろ", "神殿芋ネバラ", "永劫番イモノスケ"],
    missions: [
      { kind: "talk", title: "長芋族の始祖", text: "全戦線から届いた最後の報告を聞く", zone: "王都・最後の軍議", advisor: "六つの戦場で倒した軍が、始祖オロシマルの神殿へ集結しています。これが本当の最終戦です。", quip: "最終戦って何回目だよ。今度こそ終わらせて、三日くらい寝る！" },
      { kind: "battle", title: "六道同時侵攻", text: "帝国全域へ現れた始祖兵62体を撃破する", target: 62, arena: "forest", zone: "帝国全域・六道防衛線", advisor: "森、湿原、前線、海道、地底、空の六方向から同時侵攻です。地図が敵印で真っ赤です。", quip: "こっちも全部回る！ 王の移動距離じゃねぇけど走れー！" },
      { kind: "battle", title: "仲間たちの戦場", text: "仲間と分担し、始祖軍76体を退ける", target: 76, arena: "marsh", zone: "黄金湿原・帝国連合陣", advisor: "各地で救った者たちが援軍に来ました。ここまでの旅が、そのまま帝国軍です。", quip: "全員来たか。じゃあ派手にいくぞ！ 後片づけは明日の俺に任せる！" },
      { kind: "battle", title: "グラサン防衛戦", text: "王のグラサンを狙う親衛隊92体を倒す", target: 92, arena: "front", zone: "始祖神殿・黒鏡回廊", advisor: "敵の狙いは陛下のグラサンです。最初の襲撃から、すべてはこれにつながっていました。", quip: "そんなに欲しいなら自分で買え！ これは一個しかねぇんだよ！" },
      { kind: "battle", title: "ねばりの終着点", text: "始祖の門を守る古代精鋭110体を突破する", target: 110, arena: "fortress", zone: "始祖神殿・万年根の門", elite: 1.55, advisor: "門の向こうに始祖がいます。帝国の全兵力が、陛下の一撃へ道をつなぎます。", quip: "ここまで長かった。めんどくせー旅だったけど、悪くなかったぜ。最後、行くぞ！" },
      { kind: "boss", title: "神祖オロシマル", text: "長芋族すべての始祖、神祖オロシマルを倒す", arena: "fortress", zone: "始祖神殿・永劫ねばり座", final: true, boss: { name: "神祖 オロシマル", hp: 18500, damage: 52, scale: 2.28, line: "我は最初の長芋。万年のねばりに、獣の国など一瞬の泡よ！" }, quip: "一瞬で十分だ。その一瞬に帝国全部ぶつける！ くらえ、建国王の頭突きー！" },
    ],
  },
];

export const campaignChapters = acts.flatMap((act, actIndex) =>
  act.missions.map((mission, missionIndex) => ({
    ...mission,
    act: act.act,
    actIndex,
    missionIndex,
    theme: act.theme,
    enemies: act.enemies,
    stage: CAMPAIGN_START_STAGE + actIndex * act.missions.length + missionIndex,
    target: mission.kind === "talk" || mission.kind === "boss" ? 1 : mission.target,
  })),
);

export const CAMPAIGN_EPILOGUE_STAGE = CAMPAIGN_START_STAGE + campaignChapters.length;
export const STORY_STAGE_COUNT = CAMPAIGN_EPILOGUE_STAGE + 1;

export function campaignChapterForStage(stage) {
  return campaignChapters[stage - CAMPAIGN_START_STAGE] || null;
}

export function campaignDialog(chapter) {
  if (!chapter) return [];
  if (chapter.kind === "boss") {
    return [
      { kind: "yam", role: "長芋族・章ボス", name: chapter.boss.name, text: chapter.boss.line },
      { role: "話を短く済ませたい建国王", name: "カピノブ", text: chapter.quip },
    ];
  }
  return [
    { role: chapter.kind === "talk" ? "帝国参謀" : "遠征作戦報告", name: "かぴ政宗", text: chapter.advisor },
    { role: "だいたい勢いで決める建国王", name: "カピノブ", text: chapter.quip },
  ];
}

export const epilogueQuest = {
  act: "大団円",
  title: "めんどくせーけど、いい帝国",
  text: "すべての戦いを越えた仲間たちと、帝国の明日を歩く",
  target: 1,
  zone: "カピバラ帝国・永遠の温泉広場",
};
