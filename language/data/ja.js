LANGS.ja={
  id:'ja',name:'Japanese',native:'日本語',flag:'🇯🇵',tts:'ja-JP',scriptName:'Kana',tip:'Hiragana & Katakana chart, tap any character to hear it.',
  tip2:'Mac users: System Settings → Keyboard → Dictation, or use the mic button to speak Japanese.',
  scripts:[
    {t:'Hiragana ひらがな',k:1,rows:'あ:a い:i う:u え:e お:o か:ka き:ki く:ku け:ke こ:ko さ:sa し:shi す:su せ:se そ:so た:ta ち:chi つ:tsu て:te と:to な:na に:ni ぬ:nu ね:ne の:no は:ha ひ:hi ふ:fu へ:he ほ:ho ま:ma み:mi む:mu め:me も:mo や:ya ゆ:yu よ:yo ら:ra り:ri る:ru れ:re ろ:ro わ:wa ゐ:wi ゑ:we を:wo ん:n'},
    {t:'Katakana カタカナ',k:1,rows:'ア:a イ:i ウ:u エ:e オ:o カ:ka キ:ki ク:ku ケ:ke コ:ko サ:sa シ:shi ス:su セ:se ソ:so タ:ta チ:chi ツ:tsu テ:te ト:to ナ:na ニ:ni ヌ:nu ネ:ne ノ:no ハ:ha ヒ:hi フ:fu ヘ:he ホ:ho マ:ma ミ:mi ム:mu メ:me モ:mo ヤ:ya ユ:yu ヨ:yo ラ:ra リ:ri ル:ru レ:re ロ:ro ワ:wa ヲ:wo ン:n'},
    {t:'Dakuten & Handakuten',k:1,rows:'が:ga ぎ:gi ぐ:gu げ:ge ご:go ざ:za じ:ji ず:zu ぜ:ze ぞ:zo だ:da ぢ:ji づ:zu で:de ど:do ば:ba び:bi ぶ:bu べ:be ぼ:bo ぱ:pa ぴ:pi ぷ:pu ぺ:pe ぽ:po'},
    {t:'Small Kana 拗促音',k:1,rows:'ぁ:a ぃ:i ぅ:u ぇ:e ぉ:o ゃ:ya ゅ:yu ょ:yo ゎ:wa っ:tsu ー:long'}
  ],
  units:[
    {id:'greet',n:'Greetings',e:'👋',w:[
      {j:'おはようございます',r:'ohayō gozaimasu',e:'Good morning (polite)',ex:'おはようございます、先生。',exR:'ohayō gozaimasu, sensei.',exE:'Good morning, teacher.'},
      {j:'こんにちは',r:'konnichiwa',e:'Hello / Good afternoon',ex:'こんにちは、元気ですか。',exR:'konnichiwa, genki desu ka.',exE:'Hello, how are you?'},
      {j:'こんばんは',r:'konbanwa',e:'Good evening',ex:'こんばんは。今日はお疲れ様です。',exR:'konbanwa. kyō wa otsukaresama desu.',exE:'Good evening. Today was hard work.'},
      {j:'ありがとう',r:'arigatō',e:'Thank you',ex:'手伝ってくれてありがとう。',exR:'tetsudatte kurete arigatō.',exE:'Thanks for helping me.'},
      {j:'すみません',r:'sumimasen',e:'Excuse me / Sorry',ex:'すみません、駅はどこですか。',exR:'sumimasen, eki wa doko desu ka.',exE:'Excuse me, where is the station?'},
      {j:'おやすみなさい',r:'oyasuminasai',e:'Good night',ex:'おやすみなさい、いい夢を。',exR:'oyasuminasai, ii yume o.',exE:'Good night, sweet dreams.'},
      {j:'はじめまして',r:'hajimemashite',e:'Nice to meet you',ex:'はじめまして、田中です。',exR:'hajimemashite, Tanaka desu.',exE:'Nice to meet you, I am Tanaka.'},
      {j:'さようなら',r:'sayōnara',e:'Goodbye',ex:'さようなら、また明日。',exR:'sayōnara, mata ashita.',exE:'Goodbye, see you tomorrow.'}
    ]},
    {id:'num',n:'Numbers 数字',e:'🔢',w:[
      {j:'一',r:'ichi',e:'One',ex:'ichi',exR:'いち',exE:'one'},
      {j:'二',r:'ni',e:'Two',ex:'ni',exR:'に',exE:'two'},
      {j:'三',r:'san',e:'Three',ex:'san',exR:'さん',exE:'three'},
      {j:'十',r:'jū',e:'Ten',ex:'jū',exR:'じゅう',exE:'ten'},
      {j:'百',r:'hyaku',e:'Hundred',ex:'hyaku',exR:'ひゃく',exE:'hundred'},
      {j:'千',r:'sen',e:'Thousand',ex:'sen',exR:'せん',exE:'thousand'},
      {j:'万',r:'man',e:'Ten thousand',ex:'sen man',exR:'せんまん',exE:'ten thousand'},
      {j:'いくら',r:'ikura',e:'How much',ex:'これはいくらですか。',exR:'kore wa ikura desu ka.',exE:'How much is this?'}
    ]},
    {id:'fam',n:'Family 家族',e:'👨‍👩‍👧',w:[
      {j:'家族',r:'kazoku',e:'Family',ex:'彼の家族に住んでいます。',exR:'kare no kazoku ni sunde imasu.',exE:'I live with his family.'},
      {j:'父',r:'chichi',e:'Father',ex:'父は 教师です。',exR:'chichi wa kyōshi desu.',exE:'My father is a teacher.'},
      {j:'母',r:'haha',e:'Mother',ex:'母は料理が上手です。',exR:'haha wa ryōri ga jōzu desu.',exE:'My mother is good at cooking.'},
      {j:'兄弟',r:'kyōdai',e:'Brothers',ex:'兄弟は三人います。',exR:'kyōdai wa sannin imasu.',exE:'I have three brothers.'},
      {j:'姉',r:'ane',e:'Older sister',ex:'姉は大学生です。',exR:'ane wa daigakusei desu.',exE:'My older sister is a college student.'},
      {j:'妹',r:'imōto',e:'Younger sister',ex:'妹は高校生です。',exR:'imōto wa kōkōsei desu.',exE:'My younger sister is in high school.'},
      {j:'友達',r:'tomodachi',e:'Friend',ex:'友達と映画を見ました。',exR:'tomodachi to eiga o mimashita.',exE:'I watched a movie with a friend.'},
      {j:'子供',r:'kodomo',e:'Child',ex:'子供たちは公園で遊んでいます。',exR:'kodomo-tachi wa kōen de asonde imasu.',exE:'The children are playing in the park.'}
    ]},
    {id:'food',n:'Food 食べ物',e:'🍣',w:[
      {j:'ご飯',r:'gohan',e:'Rice / Meal',ex:'ご飯を食べましたか。',exR:'gohan o tabemashita ka.',exE:'Did you eat?'},
      {j:'ラーメン',r:'rāmen',e:'Ramen',ex:'東京のラーメンが食べたいです。',exR:'Tōkyō no rāmen ga tabetai desu.',exE:'I want to eat Tokyo ramen.'},
      {j:'寿司',r:'sushi',e:'Sushi',ex:'寿司の新鮮なやつをください。',exR:'sushi no atarashii yatsu o kudasai.',exE:'Give me fresh sushi please.'},
      {j:'肉',r:'niku',e:'Meat',ex:'私は肉が食べられないです。',exR:'watashi wa niku ga taberarenai desu.',exE:'I cannot eat meat.'},
      {j:'魚',r:'sakana',e:'Fish',ex:'魚は海から来ます。',exR:'sakana wa umi kara kimasu.',exE:'Fish comes from the sea.'},
      {j:'野菜',r:'yasai',e:'Vegetables',ex:'野菜を食べたいです。',exR:'yasai o tabetai desu.',exE:'I want to eat vegetables.'},
      {j:'朝ご飯',r:'asagohan',e:'Breakfast',ex:'朝ご飯を食べたいです。',exR:'asagohan o tabetai desu.',exE:'I want to eat breakfast.'},
      {j:'お酒',r:'osake',e:'Alcohol / Sake',ex:'お酒を飲みませんか。',exR:'osake o nomimasen ka.',exE:'Shall we have a drink?'}
    ]},
    {id:'drink',n:'Drinks 飲み物',e:'🍵',w:[
      {j:'水',r:'mizu',e:'Water',ex:'お水、お願いします。',exR:'omizu, onegai shimasu.',exE:'Water, please.'},
      {j:'お茶',r:'ocha',e:'Tea',ex:'お茶を一杯ください。',exR:'ocha o ippai kudasai.',exE:'A cup of tea, please.'},
      {j:'コーヒー',r:'kōhī',e:'Coffee',ex:'毎朝コーヒーを飲みます。',exR:'maigasa kōhī o nomimasu.',exE:'I drink coffee every morning.'},
      {j:'ビール',r:'bīru',e:'Beer',ex:'ビールを二つください。',exR:'bīru o futatsu kudasai.',exE:'Two beers, please.'},
      {j:'牛乳',r:'gyūnyū',e:'Milk',ex:'牛乳を買いました。',exR:'gyūnyū o kaimashita.',exE:'I bought milk.'},
      {j:'ジュース',r:'jūsu',e:'Juice',ex:'オレンジジュースはありますか。',exR:'orenzu jūsu wa arimasu ka.',exE:'Do you have orange juice?'},
      {j:'美味しい',r:'oishii',e:'Delicious',ex:'このケーキは美味しいです。',exR:'kono kēki wa oishii desu.',exE:'This cake is delicious.'},
      {j:'熱い',r:'atsui',e:'Hot (drink)',ex:'お茶が熱いです。',exR:'ocha ga atsui desu.',exE:'The tea is hot.'}
    ]},
    {id:'time',n:'Time & Days',e:'🕐',w:[
      {j:'今',r:'ima',e:'Now',ex:'今どこですか。',exR:'ima doko desu ka.',exE:'Where are you now?'},
      {j:'今日',r:'kyō',e:'Today',ex:'今日は寒いです。',exR:'kyō wa samui desu.',exE:'It is cold today.'},
      {j:'明日',r:'ashita',e:'Tomorrow',ex:'明日は休みます。',exR:'ashita wa yasumimasu.',exE:'I will rest tomorrow.'},
      {j:'昨日',r:'kinō',e:'Yesterday',ex:'昨日、雨でした。',exR:'kinō, ame deshita.',exE:'It rained yesterday.'},
      {j:'朝',r:'asa',e:'Morning',ex:'朝六時に起きます。',exR:'asa rokuji ni okimasu.',exE:'I wake up at six in the morning.'},
      {j:'夜',r:'yoru',e:'Night',ex:'夜は静かです。',exR:'yoru wa shizuka desu.',exE:'The night is quiet.'},
      {j:'週末',r:'shūmatsu',e:'Weekend',ex:'週末は友達と遊びます。',exR:'shūmatsu wa tomodachi to asabimasu.',exE:'I hang out with friends on weekends.'},
      {j:'毎日',r:'mainichi',e:'Every day',ex:'毎日日本語を勉強します。',exR:'mainichi nihongo o benkyō shimasu.',exE:'I study Japanese every day.'}
    ]},
    {id:'travel',n:'Travel 旅行',e:'✈️',w:[
      {j:'旅行',r:'ryokō',e:'Travel',ex:'日本へ旅行したいです。',exR:'Nihon e ryokō shitai desu.',exE:'I want to travel to Japan.'},
      {j:'駅',r:'eki',e:'Station',ex:'駅はどこですか。',exR:'eki wa doko desu ka.',exE:'Where is the station?'},
      {j:'空港',r:'kūkō',e:'Airport',ex:'空港まで電車で行きます。',exR:'kūkō made densha de ikimasu.',exE:'I go to the airport by train.'},
      {j:'切符',r:'kippu',e:'Ticket',ex:'切符を一枚ください。',exR:'kippu o ichimai kudasai.',exE:'One ticket, please.'},
      {j:'荷物',r:'nimotsu',e:'Luggage',ex:'荷物を哪里に置きますか。',exR:'nimotsu o doko ni okimasu ka.',exE:'Where do I put my luggage?'},
      {j:'予約',r:'yoyaku',e:'Reservation',ex:'ホテルを予約しました。',exR:'hoteru o yoyaku shimashita.',exE:'I reserved a hotel.'},
      {j:'観光',r:'kankō',e:'Sightseeing',ex:'京都を観光したいです。',exR:'Kyōto o kankō shitai desu.',exE:'I want to sightsee Kyoto.'},
      {j:'道',r:'michi',e:'The way / Directions',ex:'道を教えてください。',exR:'michi o oshiete kudasai.',exE:'Please tell me the way.'}
    ]},
    {id:'shop',n:'Shopping 買い物',e:'🛍️',w:[
      {j:'店',r:'mise',e:'Shop / Store',ex:'この店は安いです。',exR:'kono mise wa yasui desu.',exE:'This shop is cheap.'},
      {j:'高い',r:'takai',e:'Expensive',ex:'このカメラは高いです。',exR:'kono kamera wa takai desu.',exE:'This camera is expensive.'},
      {j:'安い',r:'yasui',e:'Cheap',ex:'もっと安いのはありますか。',exR:'motto yasui no wa arimasu ka.',exE:'Do you have something cheaper?'},
      {j:'買う',r:'kau',e:'To buy',ex:'在北京で茶器を買います。',exR:'Pekīn de chaki o kaimasu.',exE:'I buy tea bowls in Beijing.'},
      {j:'お金',r:'okane',e:'Money',ex:'お金が足りません。',exR:'okane ga tarimasen.',exE:'I do not have enough money.'},
      {j:'カード',r:'kādo',e:'Card',ex:'カードで払えますか。',exR:'kādo de haraemasu ka.',exE:'Can I pay by card?'},
      {j:'袋',r:'fukuro',e:'Bag',ex:'袋をください。',exR:'fukuro o kudasai.',exE:'A bag, please.'},
      {j:'試着',r:'shichaku',e:'Trying on (clothes)',ex:'試着してもいいですか。',exR:'shichaku shite mo ii desu ka.',exE:'May I try this on?'}
    ]},
    {id:'adj',n:'Adjectives 形容詞',e:'🎨',w:[
      {j:'大きい',r:'ōkii',e:'Big',ex:'大きい犬がいます。',exR:'ōkii inu ga imasu.',exE:'I have a big dog.'},
      {j:'小さい',r:'chiisai',e:'Small',ex:'この部屋は小さいです。',exR:'kono shitsu wa chiisai desu.',exE:'This room is small.'},
      {j:'新しい',r:'atarashii',e:'New',ex:'新しい辞書を買いました。',exR:'atarashii jishō o kaimashita.',exE:'I bought a new dictionary.'},
      {j:'古い',r:'furui',e:'Old',ex:'この建物はとても古い。',exR:'kono tatemono wa totemo furui.',exE:'This building is very old.'},
      {j:'面白い',r:'omoshiroi',e:'Interesting / Fun',ex:'この本はとても面白い。',exR:'kono hon wa totemo omoshiroi.',exE:'This book is very interesting.'},
      {j:'難しい',r:'muzukashii',e:'Difficult',ex:'日本語はむずかしいですが、おもしろいです。',exR:'nihongo wa muzukashii desu ga, omoshiroi desu.',exE:'Japanese is difficult but interesting.'},
      {j:'忙しい',r:'isogashii',e:'Busy',ex:'今週はとても忙しい。',exR:'kongen wa totemo isogashii.',exE:'This week I am very busy.'},
      {j:'楽しい',r:'tanoshii',e:'Fun / Enjoyable',ex:'旅行はとても楽しかったです。',exR:'ryokō wa totemo tanoshikatta desu.',exE:'The trip was a lot of fun.'}
    ]},
    {id:'verb',n:'Verbs 動詞',e:'⚡',w:[
      {j:'食べる',r:'taberu',e:'To eat',ex:'朝ごはんを食べます。',exR:'asagohan o tabemasu.',exE:'I eat breakfast.'},
      {j:'飲む',r:'nomu',e:'To drink',ex:'水をたくさん飲みます。',exR:'mizu o takusan nomimasu.',exE:'I drink a lot of water.'},
      {j:'行く',r:'iku',e:'To go',ex:'明日東京へ行きます。',exR:'ashita Tōkyō e ikimasu.',exE:'Tomorrow I go to Tokyo.'},
      {j:'見る',r:'miru',e:'To see / watch',ex:'映画を見るのが好きです。',exR:'eiga o miru no ga suki desu.',exE:'I like watching movies.'},
      {j:'話す',r:'hanasu',e:'To speak',ex:'日本語を少し話します。',exR:'nihongo o sukoshi hanashimasu.',exE:'I speak a little Japanese.'},
      {j:'聞く',r:'kiku',e:'To listen / ask',ex:'音楽を聞きます。',exR:'ongaku o kikimasu.',exE:'I listen to music.'},
      {j:'買う',r:'kau',e:'To buy',ex:'友達にプレゼントを買います。',exR:'tomodachi ni purezento o kaimasu.',exE:'I buy a present for my friend.'},
      {j:'休む',r:'yasumu',e:'To rest',ex:'週末には休みます。',exR:'shūmatsu ni wa yasumimasu.',exE:'I rest on weekends.'}
    ]},
    {id:'place',n:'Places 場所',e:'🏙',w:[
      {j:'家',r:'ie',e:'House / Home',ex:'家に帰ります。',exR:'ie ni kaerimasu.',exE:'I go home.'},
      {j:'学校',r:'gakkō',e:'School',ex:'学校は駅の近くです。',exR:'gakkō wa eki no chikaku desu.',exE:'The school is near the station.'},
      {j:'会社',r:'kaisha',e:'Company / Office',ex:'会社は九時からです。',exR:'kaisha wa kyūji kara desu.',exE:'The office starts at nine.'},
      {j:'病院',r:'byōin',e:'Hospital',ex:'病院へ行きます。',exR:'byōin e ikimasu.',exE:'I go to the hospital.'},
      {j:'銀行',r:'ginkō',e:'Bank',ex:'銀行は午後六時までです。',exR:'ginkō wa gogo rokuji made desu.',exE:'The bank is open until 6pm.'},
      {j:'公園',r:'kōen',e:'Park',ex:'公園で散歩します。',exR:'kōen de sanpo shimasu.',exE:'I walk in the park.'},
      {j:'トイレ',r:'toire',e:'Toilet',ex:'トイレはどこですか。',exR:'toire wa doko desu ka.',exE:'Where is the toilet?'},
      {j:'図書館',r:'toshokan',e:'Library',ex:'図書館で勉強します。',exR:'toshokan de benkyō shimasu.',exE:'I study at the library.'}
    ]},
    {id:'rest',n:'Restaurant レストラン',e:'🍽',w:[
      {j:'レストラン',r:'resutoran',e:'Restaurant',ex:'レストランを予約します。',exR:'resutoran o yoyaku shimasu.',exE:'I will reserve a restaurant.'},
      {j:'注文',r:'chūmon',e:'Order',ex:'注文をお願いします。',exR:'chūmon o onegai shimasu.',exE:'An order, please.'},
      {j:'お会計',r:'okaikei',e:'The bill',ex:'お会計をお願いします。',exR:'okaikei o onegai shimasu.',exE:'The bill, please.'},
      {j:'メニュー',r:'menyū',e:'Menu',ex:'メニューを見せてください。',exR:'menyū o misete kudasai.',exE:'Please show me the menu.'},
      {j:'伊藤',r:'Itō',e:'Itō (surname)',ex:'伊藤さんです。',exR:'Itō-san desu.',exE:'It is Mr. Ito.'},
      {j:'美味しいですね',r:'oishii desu ne',e:'It is delicious, isn\'t it?',ex:'美味しいですね！',exR:'oishii desu ne!',exE:'It is delicious!'},
      {j:'买单',r:'kaiken',e:'To pay the bill',ex:'买单をお願いします。',exR:'ōkaiken o onegai shimasu.',exE:'I would like the check please.'},
      {j:'おすすめ',r:'osusume',e:'Recommendation',ex:'おすすめは何ですか。',exR:'osusume wa nan desu ka.',exE:'What do you recommend?'}
    ]}
  ],
  gram:[
    {t:'は (wa) — topic',lv:1,s:'N は',m:'Marks the topic of the sentence — what the sentence is "about".',n:['Not translated as "is".','Can be written ハ in katakana for contrast.','Answers "As for X, ..."'],ex:[{j:'私は学生です。',r:'watashi wa gakusei desu.',e:'As for me, I am a student.'},{j:'東京は大きい都市です。',r:'Tōkyō wa ōkii toshi desu.',e:'Tokyo is a big city.'}],q:{p:'「私は学生です」 — what is は doing?',o:['It means "is"',"It marks the topic (as for me)",'It is plural marker','It is a question marker'],a:1,w:'は marks the topic, not "to be". は= "as for…".'}},
    {t:'が (ga) — subject',lv:1,s:'N が',m:'Marks the grammatical subject, especially when something new, unknown, or emphasised.',n:['Used for existence: 車があります','Used when you do not know who or what','Often becomes the topic later in the conversation'],ex:[{j:'庭に猫がいます。',r:'niwa ni neko ga imasu.',e:'There is a cat in the garden.'},{j:'誰が来ましたか。',r:'dare ga kimashita ka.',e:'Who came?'}],q:{p:'「庭に猫がいます」 — 猫が is…',o:['The location','The subject (the cat)','A time expression','Possession'],a:1,w:'が marks the subject here — "there is a cat".'}},
    {t:'を (o) — object',lv:1,s:'N を',m:'Marks the direct object of a transitive verb.',n:['Also marks a destination with 行く / 来る','Often omitted in casual speech','Say お at the start of a sentence'],ex:[{j:'ご飯を食べました。',r:'gohan o tabemashita.',e:'I ate a meal.'},{j:'日本へ行きます。',r:'Nihon e ikimasu.',e:'I am going to Japan.'}],q:{p:'Which particle marks the direct object?',o:['は','を','に','も'],a:1,w:'を (o) marks the direct object: ご飯を.'}},
    {t:'に (ni) — destination / time',lv:1,s:'N に',m:'Marks a destination with movement verbs, or a specific point in time.',n:['Destination: 学校に行きます','Time: 七時に起きます','Also indirect object: 友達に話します','Also means "for": 母にお或有を'],ex:[{j:'京都に行きます。',r:'Kyōto ni ikimasu.',e:'I go to Kyoto.'},{j:'七時に寝ます。',r:'shichiji ni nemasu.',e:'I sleep at seven.'}],q:{p:'「三時に起きます」 — 三時に is a…',o:['Topic','Point in time','Object','Reason'],a:1,w:'に marks a specific point in time.'}},
    {t:'で (de) — place of action',lv:1,s:'N で',m:'Marks where an action happens, or the means / tool used.',n:['Location of action: 家で勉強します','Means: 電車で行きます','With ない: 病房で愁いないです'],ex:[{j:'図書館で本を読みます。',r:'toshokan de hon o yomimasu.',e:'I read books at the library.'},{j:'鉛筆で書きます。',r:'enpitsu de kakimasu.',e:'I write with a pencil.'}],q:{p:'「電車で行きます」 — で means…',o:['Destination','Means (by train)','Topic','Possession'],a:1,w:'で marks the means or instrument: by train.'}},
    {t:'と (to) — and / with',lv:1,s:'N と',m:'Connects nouns "and", or means "with" a person.',n:[' 사람と話します = talk with a person','Ctrl + quote: 「本」と「鉛筆」','Also "when" with _condition_ verbs'],ex:[{j:'友達と映画を見ました。',r:'tomodachi to eiga o mimashita.',e:'I watched a movie with a friend.'},{j:'春になると桜が咲きます。',r:'haru ni naru to sakura ga sakimasu.',e:'When spring comes, the cherry blossoms bloom.'}],q:{p:'「友達と映画…」 — と means…',o:['and','with','from','only'],a:1,w:'と after a person means "with".'}},
    {t:'も (mo) — also',lv:1,s:'N も',m:'Means "also / too", and can replace は or が in some contexts.',n:['私も学生です = I am a student too','Contrast: 学校はPump, atamente家densityは行かない','Negation: 何も… = nothing'],ex:[{j:'私も日本語を勉強します。',r:'watashi mo nihongo o benkyō shimasu.',e:'I also study Japanese.'}],q:{p:'「私も」 means…',o:['only me','also / too','not me','because of me'],a:1,w:'も = "also / too".'}},
    {t:'ない (nai) — negative',lv:1,s:'Verb ない',m:'The plain negative form. い-adjectives use くない.',n:['食べる → 食べない','大きい → 大きくない','Past: 食べなかった'],ex:[{j:'水を飲みません。',r:'mizu o nomimasen.',e:'I do not drink water.'},{j:'この店の料理は安くない。',r:'kono mise no ryōri wa yasukunai.',e:'The food at this place is not cheap.'}],q:{p:'「食べない」 is the negative of…',o:['食べる','飲める','行った','寝る'],a:0,w:'ない attaches to the ます stem: 食べ + ない.'}},
    {t:'ます / ました (masu)',lv:1,s:'V-ます / V-ました',m:'Polite present and past verb forms used in everyday conversation.',n:['する → します / しました','Studying ます形 is essential for speech','Negative: ません / ませんでした'],ex:[{j:'日本へ行きます。',r:'Nihon e ikimasu.',e:'I go to Japan.'},{j:'昨日映画を見ました。',r:'kinō eiga o mimashita.',e:'I watched a movie yesterday.'}],q:{p:'「昨日映画を見ました」 means…',o:['I will watch a movie','I watched a movie yesterday','I like movies','I am at the movies'],a:1,w:'ました is polite past: "watched".'}},
    {t:'〜てください (te kudasai)',lv:2,s:'V-て + ください',m:'Polite request: "please do …".',n:['見る → 見てください','書く → 書いてください','Negative: 〜ないでください'],ex:[{j:'もう一度言ってください。',r:'mō ichido itte kudasai.',e:'Please say it one more time.'},{j:'ゆっくり話してください。',r:'yukkuri hanashite kudasai.',e:'Please speak slowly.'}],q:{p:'How do you politely ask "please wait"?',o:['待つてください','待ってください','待んてください','待らせてください'],a:1,w:'ます-stem + てください → 待ってください.'}},
    {t:'てもいい (te mo ii)',lv:2,s:'V-て + も いい',m:'Asking or giving permission: "may I …?" / "you may …".',n:['Negative permission: 〜てはいけません','〜てもいいですか is very common'],ex:[{j:'写真を撮ってもいいですか。',r:'shashin o totte mo ii desu ka.',e:'May I take a photo?'}],q:{p:'「写真を撮ってもいいですか」 means…',o:['Can you take a photo?','May I take a photo?','Is the photo good?','Please delete the photo'],a:1,w:'てもいいですか = "is it okay if I…".'}},
    {t:'〜ことがあります',lv:2,s:'V-た ことが あります',m:'Says you have done something in the past experience.',n:['日本に行ったことがあります','まだ行ったことがありません','Uses plain past た form'],ex:[{j:'寿司を食べたことがあります。',r:'sushi o tabeta koto ga arimasu.',e:'I have eaten sushi before.'},{j:'一度も日本に行ったことがありません。',r:'ichido mo Nihon e itta koto ga arimasen.',e:'I have never been to Japan.'}],q:{p:'「行ったことがあります」 describes…',o:['A future plan','Past experience','A habitual present action','A reason'],a:1,w:'たことがあります = "have done before".'}},
    {t:'〜ましょう (mashō)',lv:2,s:'V-ましょう',m:'Suggests or proposes: "let\'s …", "shall we …".',n:['只用 with ましょうか for suggestions','Shortcut to ましょう: 一緒に行きませんか。','Also used to guess: あそこは公園でしょう。'],ex:[{j:'一緒に行きませんか。',r:'issho ni ikimasen ka.',e:'Would you like to go together?'},{j:'始めましょう。',r:'hajimemashō.',e:'Let\'s begin.'}],q:{p:'「一緒に行きませんか」 is…',o:['A command','An invitation / suggestion','An apology','A question about the past'],a:1,w:'ませんか is a soft suggestion: "would you like to…".'}},
    {t:'〜てはいけません',lv:2,s:'V-て + は いけません',m:'Strict prohibition: "must not do".',n:['Use with rules: ここで食べてはいけません','Softer: 〜てはいけません → 〜ないほうがいい'],ex:[{j:'ここで写真を撮ってはいけません。',r:'koko de shashin o totte wa ikemasen.',e:'You must not take photos here.'}],q:{p:'「食べてはいけません」 means…',o:['You may eat','You must not eat','You want to eat','You cannot eat there'],a:1,w:'てはいけません = strict prohibition.'}}
  ],
  dia:[
    {t:'First Meeting 初次见面',lv:1,a:'Yuki',b:'You',scene:'You meet someone new at the office.',
     l:[
      {s:'a',j:'はじめまして。',r:'hajimemashite.',e:'Nice to meet you.'},
      {s:'b',j:'はじめまして。',r:'hajimemashite.',e:'Nice to meet you.',x:['はじめまして','はじめまして、','はじめまして。'],h:'Nice to meet you — this is a set phrase.'},
      {s:'a',j:'田中です。営業部です。',r:'Tanaka desu. eigyō-bu desu.',e:'I am Tanaka, from sales.'},
      {s:'b',j:'ウォーカーです。よろしくお願いします。',r:'Wōkā desu. yoroshiku onegai shimasu.',e:'I am Walker. I look forward to working with you.',x:['よろしくお願いします','よろしくお願いします。','我从日本来よろしくお願いします','はじめまして、よろしくお願いします'],h:'Any 「〇〇です。」 then 「よろしくお願いします。」'},
      {s:'a',j:'こちらこそ、よろしくお願いします。',r:'kochira so, yoroshiku onegai itashimasu.',e:'Likewise, I look forward to it.'}
     ]},
    {t:'Café Order 咖啡店点单',lv:1,a:'Staff 店員',b:'You',scene:'Ordering at a coffee shop.',
     l:[
      {s:'a',j:'いらっしゃいませ。ご注文は？',r:'irasshaimase. gochūmon wa?',e:'Welcome! What can I get you?'},
      {s:'b',j:'アイスのカフェラテを一つお願いします。',r:'aisu no kaferate o hitotsu onegai shimasu.',e:'One iced latte, please.',x:['アイスのカフェラテを一つお願いします','カフェラテを一つ','アイスラテを一つお願いします','アイスカフェラテを一つ'],h:'「〇〇を一つお願いします」 = one ___, please.'},
      {s:'a',j:'他に何かありますか？',r:'hoka ni nanika arimasu ka?',e:'Anything else?'},
      {s:'b',j:'大丈夫です。カードで払います。',r:'daijōbu desu. kādo de haraimasu.',e:'That is all. I will pay by card.',x:['大丈夫です','大丈夫です。カードで','カードで払います','大丈夫ですカードで払います'],h:'「大丈夫です」= that\'s all. Then say how you pay.'},
      {s:'a',j:'ありがとうございました。',r:'arigatō gozaimashita.',e:'Thank you very much.'}
     ]},
    {t:'Asking Directions 问路',lv:2,a:'Passerby',b:'You',scene:'Lost in a Tokyo side street.',
     l:[
      {s:'a',j:'すみません、駅はどこですか。',r:'sumimasen, eki wa doko desu ka.',e:'Excuse me, where is the station?'},
      {s:'b',j:'駅はこの先、右です。',r:'eki wa kono saki, migi desu.',e:'The station is ahead, on the right.',x:['駅はこの先、右です','この先右です','駅はまっすぐ行って右です',' ahead... 駅はこの先、右です'],h:'「この先、右です」 = ahead, on the right.'},
      {s:'a',j:'多远ですか。',r:'ikutsu，从中desu ka.',e:'How far is it?'},
      {s:'b',j:'歩いて五分です。',r:'aruite itsu-pun? gofun desu.',e:'It is a five minute walk.',x:['歩いて五分です','五分です','歩いて五 patriarchy... 五分です'],h:'「歩いて五分です」= a five minute walk.'},
      {s:'a',j:'ありがとうございました！',r:'arigatō gozaimashita!',e:'Thank you so much!'}
     ]},
    {t:'Shopping 买东西',lv:2,a:'Shop staff',b:'You',scene:'Buying a shirt in Shibuya.',
     l:[
      {s:'a',j:'いらっしゃいませ。',r:'irasshaimase.',e:'Welcome.'},
      {s:'b',j:'これ。试着してもいいですか。',r:'kore. shichaku shite mo ii desu ka.',e:'This one — may I try it on?',x:['試着してもいいですか','これ試着してもいいですか','試着してもいいです','これ、試着してもいいですか'],h:'Ask permission: 「試着してもいいですか」.'},
      {s:'a',j:'もちろんです。こちらへどうぞ。',r:'mochiron desu. kochira e dōzo.',e:'Of course. This way, please.'},
      {s:'b',j:'助かりました。これにします。',r:'tasukarimashita. kore ni shimasu.',e:'That helped. I will take this.',x:['これにします','これにします！','助かりました、これにします'],h:'「これにします」= I will take this one.'},
      {s:'a',j:'カードでよろしいですか。',r:'kādo de yoroshii desu ka.',e:'Will that be by card?'}
     ]},
    {t:'At the Restaurant 餐厅',lv:2,a:'Waiter',b:'You',scene:'Dinner time.',
     l:[
      {s:'a',j:'いらっしゃいませ。ご注文は？',r:'gochūmon wa?',e:'What would you like to order?'},
      {s:'b',j:'おすすめは何ですか。',r:'osusume wa nan desu ka.',e:'What do you recommend?',x:['おすすめは何ですか','おすすめは何ですか？','recommend... おすすめは何ですか','何がいいですか'],h:'「おすすめは何ですか」= what do you recommend?'},
      {s:'a',j:'本日のおすすめは焼き魚です。',r:'yakizakana ga osusume desu.',e:'Today we recommend grilled fish.'},
      {s:'b',j:'じゃあ、焼き魚をお願いします。',r:'jaa, yakizakana o onegai shimasu.',e:'Then I will have the grilled fish.',x:['焼き魚をお願いします','じゃあ焼き魚を','yakizakana o onegai shimasu','じゃあ、焼き魚をお願いします'],h:'Repeat the item: 「焼き魚をお願いします」.'},
      {s:'a',j:'お会計はお席でお支払いください。',r:'okaikei wa oseki de oharai kudasai.',e:'The bill, please, when you are ready.'}
     ]},
    {t:'Making Plans 定计划',lv:3,a:'Mika',b:'You',scene:'Arranging to hang out this weekend.',
     l:[
      {s:'a',j:'週末、なんか予定ある？',r:'shūmatsu, nanka yotei aru?',e:'Do you have plans this weekend?'},
      {s:'b',j:'特にないよ。一緒に行かない？',r:'tokuni nai yo. issho ni ikanai?',e:'Nothing in particular. Want to go together?',x:['特にないよ','特にないよ。一緒に行かない','一緒に行かない？','特にないよ。一緒に行きませんか'],h:'Suggest: 「一緒に行かない？」= want to go together?'},
      {s:'a',j:'いいね！どこに行くの？',r:'ii ne! doko ni iku no?',e:'Nice! Where are we going?'},
      {s:'b',j:'池袋のラーメンに行きましょう。',r:'ikebukuro no rāmen e ikimashō.',e:'How about we go to a ramen place in Ikebukuro?',x:['池袋のラーメンに行きませんか','ラーメンに行きませんか','池袋のラーメン行きませんか','池袋に行きましょう'],h:'Suggest a place with 「行きませんか」.'},
      {s:'a',j:'いいですね！楽しみにしてる。',r:'ii ne, tanoshimi ni shite ru.',e:'Great, looking forward to it!'}
     ]}
  ]
};
