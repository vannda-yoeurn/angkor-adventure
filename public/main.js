/* =====================================================================
 * main.js — ចំណុចចាប់ផ្ដើមហ្គេម
 * ---------------------------------------------------------------------
 *   ១. ភាសា (ខ្មែរ / English)
 *   ២. សំឡេង (Howler.js + តន្ត្រីពិណពាទ្យសំយោគ — មិនត្រូវការឯកសារសំឡេង)
 *   ៣. ការបញ្ចូល (Keyboard / Mouse / Pointer Lock)
 *   ៤. UI: HUD ផ្ទាំងសន្ទនា ម៉ឺនុយ ការផ្អាក
 *   ៥. ការចាប់ផ្ដើមហ្គេម
 * ===================================================================== */
(function () {
  'use strict';
  const AG = (window.AG = window.AG || {});
  const $ = (id) => document.getElementById(id);

  // =================================================================
  // ១. ភាសា (i18n)
  // =================================================================
  const DICT = {
    km: {
      title1: 'អង្គរ', title2: 'ដំណើរផ្សងព្រេង', loading: 'កំពុងសាងសង់ទីក្រុងអង្គរ...',
      yourName: 'ឈ្មោះរបស់អ្នក', chooseHero: 'ជ្រើសរើសតួអង្គ', male: 'ប្រុស', female: 'ស្រី', outfit: 'សម្លៀកបំពាក់',
      weaponLbl: 'អាវុធ', wSwordName: 'ដាវ', wKnifeName: 'កាំបិត', sound: 'សំឡេង', music: 'តន្ត្រី',
      chooseMode: 'ជ្រើសរើសរបៀបលេង',
      modeAdventure: 'ផ្សងព្រេង', descAdventure: 'ស្វែងរកកំណប់ទាំងប្រាំ និងស្ដាប់រឿងព្រេងខ្មែរ',
      modeCombat: 'ប្រយុទ្ធ', descCombat: 'ប្រយុទ្ធជាមួយចោរជារលកៗ ដោយប្រើដាវ ឬកាំបិតខ្មែរ',
      modeMissions: 'បេសកកម្ម', descMissions: 'ជួយអ្នកភូមិ ដឹកជញ្ជូនទំនិញ និងការពារប្រាសាទ',
      modeRacing: 'ប្រណាំង', descRacing: 'ប្រណាំងម៉ូតូ រថយន្តតាមផ្លូវក្រុង ឬទូកងតាមដងទន្លេ',
      modeMulti: 'ពហុអ្នកលេង', descMulti: 'លេងជាមួយមិត្តភក្តិ ២ ទៅ ៤ នាក់ តាម LAN ឬ Online',
      controls: 'ការគ្រប់គ្រង', c_move: 'ដើរ ឬបើកបរ', c_look: 'មើលជុំវិញ (បង្វិលកាមេរ៉ា)', c_attack: 'ចុចឆ្វេង ដើម្បីវាយ',
      c_jump: 'លោត (ពេលបើកបរ = ហ្វ្រាំង)', c_run: 'រត់ (ពេលបើកបរ = បង្កើនល្បឿន)', c_act: 'ធ្វើសកម្មភាព និយាយ ឡើង ឬចុះពីយាន',
      c_weap: 'ប្ដូរអាវុធ', c_pause: 'ផ្អាកហ្គេម', c_chat: 'ជជែក (ពហុអ្នកលេង)',
      hp: 'ជីវិត', stamina: 'ថាមពល', money: 'ប្រាក់', speedUnit: 'គ.ម/ម៉', racePos: 'លំដាប់', raceLap: 'ជុំ', raceTime: 'ពេល',
      paused: 'ផ្អាកហ្គេម', resume: 'លេងបន្ត', backMenu: 'ត្រឡប់ទៅម៉ឺនុយ', cancel: 'បោះបង់',
      clickToPlay: 'ចុចលើអេក្រង់ ដើម្បីប្រើកណ្ដុរបង្វិលកាមេរ៉ា',
      raceSelect: 'ជ្រើសរើសផ្លូវប្រណាំង', 'route_city-moto': 'ម៉ូតូ · ផ្លូវក្រុង', 'route_city-car': 'រថយន្ត · ផ្លូវក្រុង', 'route_river-boat': 'ទូកង · ដងទន្លេ',
      mpTitle: 'ពហុអ្នកលេង', mpServer: 'អាសយដ្ឋានម៉ាស៊ីនមេ (Server)', mpRoom: 'ឈ្មោះបន្ទប់', mpConnect: 'ភ្ជាប់',
      mpNote: 'ត្រូវដំណើរការ server.js ជាមុនសិន (សូមមើល README)។ មិត្តភក្តិក្នុង LAN ប្រើអាសយដ្ឋាន IP នៃកុំព្យូទ័ររបស់អ្នក។',
      mpConnecting: 'កំពុងភ្ជាប់...', mpFail: 'ភ្ជាប់មិនបាន៖ {0}', mpNoLib: 'រកមិនឃើញ Socket.io។ សូមដំណើរការហ្គេមតាមរយៈ server.js',
      mpFull: 'បន្ទប់នេះពេញហើយ (អតិបរមា ៤ នាក់)', mpJoined: '{0} បានចូលលេង', mpLeft: '{0} បានចាកចេញ',
      mpPlayers: 'អ្នកលេងក្នុងបន្ទប់៖ {0}', mpHint1: 'ចុច T ដើម្បីជជែក', mpHint2: 'អ្នកអាចប្រកួតដាវជាមួយមិត្តភក្តិបាន',
      chatPh: 'វាយសារ រួចចុច Enter...', mpDisconnected: 'បានផ្ដាច់ពីម៉ាស៊ីនមេ',
      accept: 'ទទួលយក', later: 'ពេលក្រោយ', ok: 'យល់ព្រម', retry: 'លេងម្ដងទៀត',
      advStart: 'ទៅជួបតាចាស់អ្នកនិទានរឿង នៅក្នុងភូមិ', advTalkFirst: 'និយាយជាមួយតាចាស់អ្នកនិទានរឿង (ផ្កាយមាសលើផែនទី)',
      talkTeller: 'ចុច E ដើម្បីនិយាយជាមួយតាចាស់', tellerName: 'តាសុខ អ្នកនិទានរឿង',
      tellerIntro: 'ចៅអើយ! នៅក្នុងទីក្រុងនេះ មានកំណប់ចំនួនប្រាំ ដែលដូនតាយើងបានលាក់ទុក ហើយកំណប់នីមួយៗជាប់ទាក់ទងនឹងរឿងព្រេងខ្មែរមួយ។ ចូរអានតម្រុយនៅក្នុងបញ្ជីបេសកកម្ម រួចស្វែងរកនៅតំបន់ពណ៌មាសលើផែនទីតូច។ សូមប្រយ័ត្នចោរដែលលាក់ខ្លួននៅក្នុងព្រៃខាងជើងផង!',
      tellerDone: 'អរគុណចៅ! ចៅបានរកឃើញកំណប់ទាំងប្រាំ ហើយរឿងព្រេងរបស់ដូនតាយើងនៅតែរស់រវើកក្នុងចិត្តយើងជានិច្ច។',
      treasures: 'កំណប់ {0}/{1}', openChest: 'ចុច E ដើម្បីបើកហិបកំណប់', rewardMoney: 'រង្វាន់៖ {0} ៛',
      advWinT: 'កំណប់ទាំងប្រាំ!', advWinB: 'អបអរសាទរ! អ្នកបានរកឃើញកំណប់ទាំងប្រាំ ហើយបានស្គាល់រឿងព្រេងខ្មែរកាន់តែច្បាស់។ រង្វាន់ពិសេស៖ ១០ ០០០ ៛',
      lg1h: 'តម្រុយ៖ កន្លែងដែលទឹកជួបដី នៅខាងកើតឆ្ងាយ', lg1t: 'រឿងព្រះថោង នាងនាគ',
      lg1b: 'យោងតាមរឿងព្រេង ព្រះថោងជាព្រះរាជបុត្រមកពីដែនដីឆ្ងាយ។ ទ្រង់បានជួបនាងនាគ ដែលជាបុត្រីរបស់ស្ដេចនាគ នៅលើកោះមួយ ហើយក៏រៀបអភិសេកជាមួយនាង។ ស្ដេចនាគបានស្រូបទឹកសមុទ្រ ធ្វើឲ្យកើតមានដីគោក ទុកជាអំណោយដល់កូនទាំងពីរ។ រឿងនេះជាប្រភពនៃប្រពៃណីកូនកំលោះកាន់ចុងស្បៃកូនក្រមុំ ក្នុងពិធីរៀបការខ្មែររហូតមកដល់សព្វថ្ងៃ។',
      lg2h: 'តម្រុយ៖ នៅពីក្រោយផ្សារ កន្លែងដែលអ្នកលក់តែងតថ្លៃ', lg2t: 'រឿងចៅក្រមទន្សាយ',
      lg2b: 'ទន្សាយតូចមួយ មិនមានកម្លាំងខ្លាំងទេ ប៉ុន្តែមានប្រាជ្ញាវាងវៃ។ ពេលសត្វ ឬមនុស្សមានជម្លោះនឹងគ្នា គេតែងតែមករកទន្សាយឲ្យជួយកាត់ក្ដី។ ដោយប្រើគំនិតឆ្លាតវៃ ទន្សាយតែងតែរកឃើញការពិត ហើយជួយការពារអ្នកទន់ខ្សោយ។ រឿងនេះបង្រៀនយើងថា ប្រាជ្ញាមានតម្លៃជាងកម្លាំង។',
      lg3h: 'តម្រុយ៖ នៅលើកំពូលភ្នំតូច ខាងជើងលិច', lg3t: 'រឿងនាងកង្រី',
      lg3b: 'នាងកង្រីស្រឡាញ់រថសេនយ៉ាងខ្លាំង ប៉ុន្តែរថសេនបានចាកចេញពីនាងទៅ។ ដោយសោកសៅពន់ប្រមាណ នាងក៏ស្លាប់ ហើយរូបកាយរបស់នាងបានក្លាយទៅជាភ្នំមួយ ដែលគេហៅថា ភ្នំនាងកង្រី នៅខេត្តកំពង់ឆ្នាំង រហូតមកដល់សព្វថ្ងៃ។',
      lg4h: 'តម្រុយ៖ នៅក្នុងប្រាសាទបាក់បែក ដែលមានដើមឈើដុះពីលើ', lg4t: 'រឿងតាដំបងក្រញូង',
      lg4b: 'តាដំបងក្រញូងមានដំបងវេទមន្តពណ៌ខ្មៅមួយ ហើយបានឡើងគ្រងរាជ្យ។ ថ្ងៃមួយ គាត់បានគប់ដំបងនោះទៅ ហើយដំបងក៏បាត់បង់រកមិនឃើញ។ កន្លែងដែលដំបងបាត់នោះ ត្រូវបានគេហៅថា «បាត់ដំបង» ដែលក្លាយជាឈ្មោះខេត្តបាត់ដំបងសព្វថ្ងៃ។',
      lg5h: 'តម្រុយ៖ នៅលើជាន់កំពូលនៃប្រាសាទអង្គរវត្ត', lg5t: 'រឿងព្រេងប្រាសាទអង្គរវត្ត',
      lg5b: 'រឿងព្រេងនិទានតំណាលថា ស្ថាបត្យករដ៏ពូកែម្នាក់ឈ្មោះ ពិស្ណុការ ជាអ្នកសាងសង់ប្រាសាទដ៏អស្ចារ្យនេះ។ តាមប្រវត្តិសាស្ត្រ ប្រាសាទអង្គរវត្តត្រូវបានសាងសង់នៅសតវត្សទី១២ ក្នុងរជ្ជកាលព្រះបាទសូរ្យវរ្ម័នទី២ ហើយសព្វថ្ងៃជានិមិត្តរូបដែលលេចឡើងនៅលើទង់ជាតិខ្មែរ។',
      missionsStart: 'ទៅជួបអ្នកផ្ដល់បេសកកម្ម (ផ្កាយក្រហមលើផែនទី)',
      m_help: 'ជួយអ្នកភូមិ', m_deliver: 'ដឹកជញ្ជូនទំនិញ', m_defend: 'ការពារប្រាសាទ',
      talk_help: 'ចុច E ដើម្បីនិយាយជាមួយកសិករ', talk_deliver: 'ចុច E ដើម្បីនិយាយជាមួយឈ្មួញ', talk_defend: 'ចុច E ដើម្បីនិយាយជាមួយឆ្មាំប្រាសាទ',
      m_help_desc: 'ជំរាបសួរ! ខ្យល់ព្យុះបានផាត់បាវស្រូវរបស់ខ្ញុំ ខ្ចាត់ខ្ចាយពាសពេញវាលស្រែខាងលិច។ សូមជួយប្រមូលបាវស្រូវទាំង ៦ ហើយយកមកឲ្យខ្ញុំវិញផង។\nរង្វាន់៖ ២ ៥០០ ៛',
      m_deliver_desc: 'ខ្ញុំត្រូវការអ្នកដឹកទំនិញទៅកាន់កន្លែងបី គឺភូមិ ទីក្រុង និងប្រាសាទអង្គរវត្ត ក្នុងរយៈពេល ២០០ វិនាទី។ ម៉ូតូពណ៌ក្រហមនៅក្បែរផ្សារ នឹងជួយឲ្យអ្នកទៅដល់លឿនជាងមុន!\nរង្វាន់៖ ៣ ០០០ ៛ បូករង្វាន់ពេលវេលា',
      m_defend_desc: 'ចោរមួយក្រុមកំពុងមកលួចវត្ថុបុរាណនៅក្នុងប្រាសាទ! សូមជួយការពារទ្វារប្រាសាទ ពីការវាយប្រហារចំនួនបីរលក។\nរង្វាន់៖ ៥ ០០០ ៛',
      helpProgress: 'អ្នកប្រមូលបាន {0}/{1} បាវហើយ។ សូមរកបន្ថែមទៀត!', sacks: 'បាវស្រូវ៖ {0}/{1}',
      findSacks: 'ស្វែងរកបាវស្រូវនៅវាលស្រែខាងលិច (ចំណុចលឿង)', returnFarmer: 'យកបាវស្រូវទៅឲ្យកសិករវិញ', pickSack: 'ចុច E ដើម្បីរើសបាវស្រូវ',
      gotPackage: 'បានទទួលកញ្ចប់ទំនិញហើយ — ចេញដំណើរ!', deliverTo: 'ដឹកទៅកាន់៖ {0}', delivered: 'បានដឹកជញ្ជូន {0}/{1}',
      timeLeft: 'ពេលនៅសល់៖ {0} វិនាទី', useMoto: 'គន្លឹះ៖ ជិះម៉ូតូនឹងលឿនជាងដើរ',
      dVillage: 'ផ្ទះក្នុងភូមិ', dCity: 'ទីក្រុងទំនើប', dTemple: 'ច្រកចូលប្រាសាទអង្គរវត្ត',
      timeUp: 'អស់ពេលហើយ!', templeFell: 'ចោរបានទម្លុះទ្វារប្រាសាទ!', templeHp: 'ទ្វារប្រាសាទ៖ {0}/{1}',
      missionDone: 'បេសកកម្មបានជោគជ័យ!', missionFail: 'បេសកកម្មបរាជ័យ',
      combatStart: 'ចោរកំពុងមក! ត្រៀមខ្លួនប្រយុទ្ធ!', waveN: 'រលកទី {0}', kills: 'បានវាយឈ្នះ៖ {0}', enemiesLeft: 'សត្រូវនៅសល់៖ {0}',
      switchWeapon: 'ចុច 1 = ដាវ · 2 = កាំបិត', gameOver: 'អ្នកបានចាញ់!', waveReached: 'ឈានដល់រលកទី {0}', moneyEarned: 'ប្រាក់ទទួលបាន៖ {0} ៛',
      go: 'ចេញដំណើរ!', lapN: 'ជុំទី {0}/{1}', raceFinish: 'ការប្រណាំងបានបញ្ចប់!', yourPos: 'លំដាប់របស់អ្នក៖ {0}/{1}', yourTime: 'ពេលវេលា៖ {0}', rival: 'គូប្រកួត {0}',
      youFainted: 'អ្នកសន្លប់ហើយ! បាត់បង់ប្រាក់ {0} ៛', notEnough: 'ប្រាក់មិនគ្រប់គ្រាន់ទេ', bought: 'បានទិញ{0} ({1} ៛)',
      buyFood: 'ចុច E ទិញនំបញ្ចុក (500 ៛ · +45 ជីវិត)', buyDrink: 'ចុច E ទិញទឹកអំពៅ (300 ៛ · ថាមពលពេញ)', foodName: 'នំបញ្ចុក', drinkName: 'ទឹកអំពៅ',
      enter_moto: 'ចុច E ដើម្បីជិះម៉ូតូ', enter_car: 'ចុច E ដើម្បីបើករថយន្ត', enter_boat: 'ចុច E ដើម្បីជិះទូកង', exitHint: 'ចុច E ដើម្បីចុះពីយានជំនិះ',
      wSword: 'កាន់ដាវ', wKnife: 'កាន់កាំបិត',
      t_attack: 'វាយ', t_jump: 'លោត', t_run: 'រត់', t_weapon: 'អាវុធ', t_pause: 'ផ្អាក', t_full: 'ពេញអេក្រង់', t_chat: 'ជជែក',
      c_touch: 'ទូរស័ព្ទ៖ joystick ខាងឆ្វេងសម្រាប់ដើរ អូសម្រាមដៃខាងស្ដាំដើម្បីមើលជុំវិញ ហើយប្រើប៊ូតុង វាយ លោត រត់ និង E',
      rotateHint: 'សូមបង្វិលទូរស័ព្ទផ្ដេក ដើម្បីលេងបានស្រួលជាងមុន'
    },
    en: {
      title1: 'Angkor', title2: 'The Adventure', loading: 'Building the city of Angkor...',
      yourName: 'Your name', chooseHero: 'Choose your hero', male: 'Male', female: 'Female', outfit: 'Outfit',
      weaponLbl: 'Weapon', wSwordName: 'Sword', wKnifeName: 'Knife', sound: 'Sound', music: 'Music',
      chooseMode: 'Choose a game mode',
      modeAdventure: 'Adventure', descAdventure: 'Find five treasures and hear Khmer legends',
      modeCombat: 'Combat', descCombat: 'Fight waves of bandits with a Khmer sword or knife',
      modeMissions: 'Missions', descMissions: 'Help villagers, deliver goods and defend the temple',
      modeRacing: 'Racing', descRacing: 'Race motorbikes or cars through the city, or long boats on the river',
      modeMulti: 'Multiplayer', descMulti: 'Play with 2–4 friends over LAN or online',
      controls: 'Controls', c_move: 'Walk or drive', c_look: 'Look around (rotate camera)', c_attack: 'Left click to attack',
      c_jump: 'Jump (brake while driving)', c_run: 'Run (boost while driving)', c_act: 'Interact, talk, enter or exit vehicles',
      c_weap: 'Switch weapon', c_pause: 'Pause', c_chat: 'Chat (multiplayer)',
      hp: 'Health', stamina: 'Stamina', money: 'Money', speedUnit: 'km/h', racePos: 'Position', raceLap: 'Lap', raceTime: 'Time',
      paused: 'Paused', resume: 'Resume', backMenu: 'Back to menu', cancel: 'Cancel',
      clickToPlay: 'Click the screen to look around with the mouse',
      raceSelect: 'Choose a race', 'route_city-moto': 'Motorbike · City streets', 'route_city-car': 'Car · City streets', 'route_river-boat': 'Long boat · River',
      mpTitle: 'Multiplayer', mpServer: 'Server address', mpRoom: 'Room name', mpConnect: 'Connect',
      mpNote: 'Start server.js first (see README). Friends on your LAN use your computer\'s IP address.',
      mpConnecting: 'Connecting...', mpFail: 'Could not connect: {0}', mpNoLib: 'Socket.io not found. Run the game through server.js',
      mpFull: 'This room is full (max 4 players)', mpJoined: '{0} joined', mpLeft: '{0} left',
      mpPlayers: 'Players in room: {0}', mpHint1: 'Press T to chat', mpHint2: 'You can spar with friends',
      chatPh: 'Type a message, then Enter...', mpDisconnected: 'Disconnected from server',
      accept: 'Accept', later: 'Later', ok: 'OK', retry: 'Play again',
      advStart: 'Find the old storyteller in the village', advTalkFirst: 'Talk to the old storyteller (gold star on the map)',
      talkTeller: 'Press E to talk to the old man', tellerName: 'Grandpa Sok, storyteller',
      tellerIntro: 'My child! Our ancestors hid five treasures in this city, and each one is tied to a Khmer legend. Read the clues in your objective list, then search the gold areas on the minimap. Watch out for the bandits hiding in the northern forest!',
      tellerDone: 'Thank you, child! You found all five treasures, and the legends of our ancestors live on in our hearts.',
      treasures: 'Treasures {0}/{1}', openChest: 'Press E to open the treasure chest', rewardMoney: 'Reward: {0} ៛',
      advWinT: 'All five treasures!', advWinB: 'Congratulations! You found all five treasures and learned the Khmer legends. Special reward: 10,000 ៛',
      lg1h: 'Clue: where water meets land, far to the east', lg1t: 'Preah Thong and Neang Neak',
      lg1b: 'In the legend, Preah Thong was a prince from a distant land. On an island he met Neang Neak, daughter of the Naga King, and married her. The Naga King drank up the sea to create dry land as a gift for the couple. This is why, at Khmer weddings today, the groom holds the end of the bride\'s sbai shawl.',
      lg2h: 'Clue: behind the market, where sellers haggle', lg2t: 'Judge Rabbit',
      lg2b: 'A little rabbit had no great strength, but a sharp mind. When animals or people quarrelled, they came to the rabbit to settle the case. With clever thinking the rabbit always found the truth and protected the weak. The tale teaches that wisdom is worth more than strength.',
      lg3h: 'Clue: on top of the small hill to the north-west', lg3t: 'Neang Kangrei',
      lg3b: 'Neang Kangrei loved Rothisen deeply, but he left her. Overcome with grief she died, and her body became a mountain, still called Phnom Neang Kangrei in Kampong Chhnang province today.',
      lg4h: 'Clue: inside the ruined temple with a tree growing on top', lg4t: 'Ta Dambang Kranhoung',
      lg4b: 'Ta Dambang Kranhoung had a magic black staff and became king. One day he threw the staff and it was lost forever. The place where the staff was lost became known as "Bat Dambang" — lost staff — the province of Battambang today.',
      lg5h: 'Clue: on the top terrace of Angkor Wat', lg5t: 'The Legend of Angkor Wat',
      lg5b: 'Legend says a master architect named Pisnokar built this wonderful temple. Historically, Angkor Wat was built in the 12th century under King Suryavarman II, and today it stands on the national flag of Cambodia.',
      missionsStart: 'Visit a mission giver (red stars on the map)',
      m_help: 'Help the villager', m_deliver: 'Deliver goods', m_defend: 'Defend the temple',
      talk_help: 'Press E to talk to the farmer', talk_deliver: 'Press E to talk to the merchant', talk_defend: 'Press E to talk to the temple guard',
      m_help_desc: 'Hello! A storm scattered my rice sacks all over the western rice fields. Please gather all 6 sacks and bring them back to me.\nReward: 2,500 ៛',
      m_deliver_desc: 'I need goods delivered to three places — the village, the city and Angkor Wat — within 200 seconds. The red motorbike near the market will get you there faster!\nReward: 3,000 ៛ plus time bonus',
      m_defend_desc: 'A gang of bandits is coming to steal the temple\'s treasures! Defend the temple gate from three waves of attackers.\nReward: 5,000 ៛',
      helpProgress: 'You have {0}/{1} sacks. Keep looking!', sacks: 'Rice sacks: {0}/{1}',
      findSacks: 'Find rice sacks in the western fields (yellow dots)', returnFarmer: 'Bring the sacks back to the farmer', pickSack: 'Press E to pick up the rice sack',
      gotPackage: 'Package received — off you go!', deliverTo: 'Deliver to: {0}', delivered: 'Delivered {0}/{1}',
      timeLeft: 'Time left: {0} s', useMoto: 'Tip: a motorbike is faster than walking',
      dVillage: 'Village house', dCity: 'Modern city', dTemple: 'Angkor Wat entrance',
      timeUp: 'Time is up!', templeFell: 'The bandits broke through the temple gate!', templeHp: 'Temple gate: {0}/{1}',
      missionDone: 'Mission complete!', missionFail: 'Mission failed',
      combatStart: 'Bandits are coming! Get ready to fight!', waveN: 'Wave {0}', kills: 'Defeated: {0}', enemiesLeft: 'Enemies left: {0}',
      switchWeapon: 'Press 1 = sword · 2 = knife', gameOver: 'You were defeated!', waveReached: 'Reached wave {0}', moneyEarned: 'Money earned: {0} ៛',
      go: 'GO!', lapN: 'Lap {0}/{1}', raceFinish: 'Race finished!', yourPos: 'Your position: {0}/{1}', yourTime: 'Time: {0}', rival: 'Rival {0}',
      youFainted: 'You fainted! Lost {0} ៛', notEnough: 'Not enough money', bought: 'Bought {0} ({1} ៛)',
      buyFood: 'Press E to buy num banh chok (500 ៛ · +45 health)', buyDrink: 'Press E to buy sugarcane juice (300 ៛ · full stamina)', foodName: 'num banh chok', drinkName: 'sugarcane juice',
      enter_moto: 'Press E to ride the motorbike', enter_car: 'Press E to drive the car', enter_boat: 'Press E to board the long boat', exitHint: 'Press E to get out',
      wSword: 'Sword equipped', wKnife: 'Knife equipped',
      t_attack: 'Attack', t_jump: 'Jump', t_run: 'Run', t_weapon: 'Weapon', t_pause: 'Pause', t_full: 'Fullscreen', t_chat: 'Chat',
      c_touch: 'Phone: left joystick to walk, drag on the right to look around, and use the Attack, Jump, Run and E buttons',
      rotateHint: 'Turn your phone sideways for easier play'
    }
  };
  let lang = 'km';
  AG.t = (k, ...a) => {
    let s = (DICT[lang] && DICT[lang][k]) ?? DICT.km[k] ?? k;
    a.forEach((v, i) => { s = s.replace('{' + i + '}', typeof v === 'number' ? v.toLocaleString() : v); });
    return s;
  };
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = AG.t(el.dataset.i18n); });
    $('langBtn').textContent = lang === 'km' ? 'English' : 'ខ្មែរ';
    $('chatInput').placeholder = AG.t('chatPh');
    document.title = lang === 'km' ? 'អង្គរ: ដំណើរផ្សងព្រេង' : 'Angkor: The Adventure';
  }

  // ការកំណត់ដែលបានរក្សាទុក
  const store = {
    get(k, d) { try { const v = localStorage.getItem('angkor-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('angkor-' + k, JSON.stringify(v)); } catch (e) {} }
  };

  // =================================================================
  // ២. សំឡេង — បង្កើតសំឡេងដោយកូដ (WAV) ហើយចាក់តាម Howler.js
  // =================================================================
  const RATE = 22050;
  function toWavURI(samples) { // Float32Array → data:audio/wav;base64
    const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32000, true);
    const bytes = new Uint8Array(buf); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return 'data:audio/wav;base64,' + btoa(bin);
  }
  const buf = (sec) => new Float32Array(Math.floor(sec * RATE));
  // សំឡេងរនាត (xylophone): ប្រេកង់មូលដ្ឋាន + អាម៉ូនិកមិនស្មើ ហើយរលត់លឿន
  function roneat(out, t0, f, vol, dec = 7) {
    const s0 = Math.floor(t0 * RATE), len = Math.min(out.length - s0, Math.floor(RATE * 0.9));
    for (let i = 0; i < len; i++) { const t = i / RATE, e = Math.exp(-t * dec) * vol;
      out[s0 + i] += e * (Math.sin(6.283 * f * t) + 0.3 * Math.sin(6.283 * f * 3.93 * t) * Math.exp(-t * 20) + 0.15 * Math.sin(6.283 * f * 2 * t)); }
  }
  // ស្គរ (drum)
  function drum(out, t0, f, vol, dec = 9) {
    const s0 = Math.floor(t0 * RATE), len = Math.min(out.length - s0, Math.floor(RATE * 0.5));
    for (let i = 0; i < len; i++) { const t = i / RATE; out[s0 + i] += Math.exp(-t * dec) * vol * Math.sin(6.283 * f * t * (1 - t * 0.6)); }
  }
  // ឈិង (small cymbals) — open "ឈិង" ឬ closed "ឆាប់"
  function chhing(out, t0, open, vol) {
    const s0 = Math.floor(t0 * RATE), dec = open ? 9 : 45, len = Math.min(out.length - s0, Math.floor(RATE * (open ? 0.5 : 0.1)));
    for (let i = 0; i < len; i++) { const t = i / RATE;
      out[s0 + i] += Math.exp(-t * dec) * vol * (Math.sin(6.283 * 3150 * t) + Math.sin(6.283 * 4270 * t) * 0.7 + Math.sin(6.283 * 5380 * t) * 0.5) / 2.2; }
  }
  function noise(out, t0, dur, vol, lp = 0.2) {
    const s0 = Math.floor(t0 * RATE), len = Math.min(out.length - s0, Math.floor(RATE * dur)); let y = 0;
    for (let i = 0; i < len; i++) { y += lp * ((Math.random() * 2 - 1) - y); out[s0 + i] += y * vol * (1 - i / len); }
  }
  function tone(out, t0, f0, f1, dur, vol, type = 'sin') {
    const s0 = Math.floor(t0 * RATE), len = Math.min(out.length - s0, Math.floor(RATE * dur)); let ph = 0;
    for (let i = 0; i < len; i++) { const k = i / len, f = f0 + (f1 - f0) * k; ph += 6.283 * f / RATE;
      const w = type === 'sq' ? Math.sign(Math.sin(ph)) * 0.5 : Math.sin(ph); out[s0 + i] += w * vol * Math.min(1, (1 - k) * 4) * Math.min(1, i / 60); }
  }
  // តន្ត្រីពិណពាទ្យសំយោគ (Khmer-style pinpeat loop ~17 វិនាទី)
  function makeMusic() {
    const bpm = 112, beat = 60 / bpm, bars = 8, out = buf(bars * 4 * beat + 0.6);
    const scale = [392, 440, 493.9, 587.3, 659.3, 784, 880, 987.8]; // pentatonic (ប្រហាក់ប្រហែលនឹងសំនៀងខ្មែរ)
    let seedM = 7; const r = () => (seedM = (seedM * 16807) % 2147483647) / 2147483647;
    const motif = () => { const m = []; let d = 3; for (let i = 0; i < 8; i++) { d = Math.max(0, Math.min(7, d + Math.floor(r() * 5) - 2)); m.push(d); } return m; };
    const A = motif(), B = motif();
    const form = [A, A, B, A, A, B, B, A];
    form.forEach((m, bar) => {
      m.forEach((deg, i) => {
        const t0 = (bar * 4 + i * 0.5) * beat;
        roneat(out, t0, scale[deg], 0.22);
        if (i % 4 === 3) for (let k = 1; k < 4; k++) roneat(out, t0 + k * beat / 8, scale[deg], 0.08, 12); // រំកិល (tremolo)
        if (i % 2 === 0) roneat(out, t0, scale[deg] / 2, 0.1, 4); // គងវង់ (gong circle) ក្រោម
      });
      for (let b = 0; b < 4; b++) {
        const t0 = (bar * 4 + b) * beat;
        chhing(out, t0, b % 2 === 0, 0.07);
        if (b === 0 || b === 2) drum(out, t0, 78, 0.45);
        if (b === 3) { drum(out, t0, 140, 0.25, 14); drum(out, t0 + beat / 2, 140, 0.2, 14); }
      }
    });
    return out;
  }
  function makeAmbient() { // ខ្យល់ និងសត្វស្លាប
    const out = buf(8); noise(out, 0, 8, 0.05, 0.02);
    for (let i = 0; i < 9; i++) { const t0 = Math.random() * 7.5, f = 2400 + Math.random() * 1600;
      for (let k = 0; k < 3; k++) tone(out, t0 + k * 0.09, f, f * 1.25, 0.07, 0.05); }
    return out;
  }
  function makeEngine() { // សំឡេងម៉ាស៊ីន (loop)
    const out = buf(1);
    for (let i = 0; i < out.length; i++) { const t = i / RATE; out[i] = 0.18 * (Math.sin(6.283 * 55 * t) + 0.5 * Math.sin(6.283 * 110 * t) + 0.3 * ((t * 55) % 1 - 0.5)) * (0.85 + 0.15 * Math.sin(6.283 * 8 * t)); }
    return out;
  }
  const SFX = {
    swing: () => { const o = buf(0.2); noise(o, 0, 0.18, 0.5, 0.5); return o; },
    hit: () => { const o = buf(0.2); drum(o, 0, 120, 0.7, 20); noise(o, 0, 0.08, 0.4, 0.6); return o; },
    hurt: () => { const o = buf(0.25); tone(o, 0, 220, 110, 0.22, 0.35, 'sq'); return o; },
    coin: () => { const o = buf(0.35); roneat(o, 0, 988, 0.4, 12); roneat(o, 0.08, 1319, 0.4, 10); return o; },
    chest: () => { const o = buf(1.2); [392, 493.9, 587.3, 784].forEach((f, i) => roneat(o, i * 0.11, f, 0.35, 5)); return o; },
    jump: () => { const o = buf(0.12); tone(o, 0, 300, 520, 0.1, 0.18); return o; },
    click: () => { const o = buf(0.05); tone(o, 0, 1200, 900, 0.04, 0.2); return o; },
    error: () => { const o = buf(0.25); tone(o, 0, 160, 140, 0.22, 0.25, 'sq'); return o; },
    pickup: () => { const o = buf(0.3); tone(o, 0, 660, 990, 0.18, 0.3); return o; },
    beep: () => { const o = buf(0.2); tone(o, 0, 880, 880, 0.15, 0.3); return o; },
    go: () => { const o = buf(0.5); tone(o, 0, 1320, 1320, 0.4, 0.35); return o; },
    checkpoint: () => { const o = buf(0.4); roneat(o, 0, 1046, 0.35, 9); roneat(o, 0.09, 1318, 0.35, 9); return o; },
    wave: () => { const o = buf(1.6); roneat(o, 0, 110, 0.6, 1.8); roneat(o, 0, 165, 0.25, 2.5); return o; },
    win: () => { const o = buf(1.4); [392, 440, 587.3, 659.3, 784].forEach((f, i) => roneat(o, i * 0.12, f, 0.35, 4)); return o; },
    finish: () => { const o = buf(1); [587.3, 659.3, 784].forEach((f, i) => roneat(o, i * 0.12, f, 0.35, 4)); return o; },
    lose: () => { const o = buf(1.2); [659.3, 587.3, 493.9, 392].forEach((f, i) => roneat(o, i * 0.18, f, 0.35, 4)); return o; },
    crash: () => { const o = buf(0.4); noise(o, 0, 0.35, 0.8, 0.15); drum(o, 0, 70, 0.6); return o; },
    engineStart: () => { const o = buf(0.6); tone(o, 0, 40, 90, 0.55, 0.3, 'sq'); noise(o, 0, 0.5, 0.2, 0.1); return o; }
  };
  AG.audio = (function () {
    const ok = typeof Howl !== 'undefined';
    const sounds = {}; let music = null, ambient = null, engine = null;
    let muted = store.get('muted', false), musicOn = store.get('music', true);
    if (ok) Howler.mute(muted);
    function build() {
      if (!ok || music) return;
      for (const k in SFX) sounds[k] = new Howl({ src: [toWavURI(SFX[k]())], format: ['wav'], volume: 0.6 });
      music = new Howl({ src: [toWavURI(makeMusic())], format: ['wav'], loop: true, volume: 0.32 });
      ambient = new Howl({ src: [toWavURI(makeAmbient())], format: ['wav'], loop: true, volume: 0.35 });
      engine = new Howl({ src: [toWavURI(makeEngine())], format: ['wav'], loop: true, volume: 0.0 });
      if (musicOn) music.play();
      ambient.play();
    }
    return {
      start: build, // ត្រូវហៅក្រោយការចុចរបស់អ្នកលេង (browser autoplay policy)
      play(n) { if (sounds[n]) sounds[n].play(); },
      engine(on, type) {
        if (!engine) return;
        if (on) { engine.rate(type === 'boat' ? 0.7 : type === 'car' ? 0.85 : 1.1); if (!engine.playing()) engine.play(); engine.fade(engine.volume(), 0.35, 200); }
        else if (engine.playing()) { engine.fade(engine.volume(), 0, 250); setTimeout(() => engine.pause(), 260); }
      },
      engineRate(r) { if (engine && engine.playing()) engine.rate(Math.max(0.5, Math.min(2.2, r))); },
      toggleMute() { muted = !muted; store.set('muted', muted); if (ok) Howler.mute(muted); return !muted; },
      toggleMusic() { musicOn = !musicOn; store.set('music', musicOn); if (music) { musicOn ? music.play() : music.pause(); } return musicOn; },
      get muted() { return muted; }, get musicOn() { return musicOn; }
    };
  })();

  // =================================================================
  // ៣. ការបញ្ចូល (Input)
  // =================================================================
  const input = (AG.input = { keys: {}, dx: 0, dy: 0, attack: false });
  const canvas = $('game');
  let noLock = false;   // បើ browser មិនអនុញ្ញាត Pointer Lock → ប្រើការអូសកណ្ដុរជំនួស
  let dragging = false;
  let chatting = false; // កំពុងវាយសារជជែក
  const typing = () => document.activeElement && (document.activeElement.tagName === 'INPUT');
  const keyMap = { arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd' };
  addEventListener('keydown', (e) => {
    if (typing()) {
      if (e.key === 'Escape') document.activeElement.blur();
      return;
    }
    let k = e.key.toLowerCase(); k = keyMap[k] || k;
    if (e.code === 'Space') { k = ' '; e.preventDefault(); }
    input.keys[k] = true;
    if (!G().running) return;
    if (k === 'escape' || k === 'p') { modalOpen() ? null : togglePause(); }
    if (G().paused || modalOpen()) return;
    if (k === 'e' && !e.repeat) G().interact();
    if (k === '1') { G().setWeapon('sword'); setWeaponUI('sword'); }
    if (k === '2') { G().setWeapon('knife'); setWeaponUI('knife'); }
    if (k === 't' && AG.mp && AG.mp.connected) { e.preventDefault(); openChat(); }
  });
  addEventListener('keyup', (e) => { let k = e.key.toLowerCase(); k = keyMap[k] || k; if (e.code === 'Space') k = ' '; input.keys[k] = false; });
  addEventListener('blur', () => { input.keys = {}; input.attack = false; });

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (!G().running || G().paused || modalOpen()) return;
    const locked = document.pointerLockElement === canvas;
    if (!locked && !noLock) { requestLock(); return; }
    if (e.button === 0) input.attack = true;
    dragging = true;
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) input.attack = false; dragging = false; });
  addEventListener('mousemove', (e) => {
    if (!G().running || G().paused) return;
    if (document.pointerLockElement === canvas || (noLock && dragging)) { input.dx += e.movementX || 0; input.dy += e.movementY || 0; }
  });
  function requestLock() {
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { noLock = true; lockHint(false); });
    } catch (err) { noLock = true; }
  }
  document.addEventListener('pointerlockerror', () => { noLock = true; lockHint(false); });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    lockHint(!locked && !noLock && G().running && !G().paused);
    if (!locked && G().running && !G().paused && !modalOpen() && !chatting) togglePause(true);
  });
  const lockHint = (on) => { $('lockHint').hidden = !on || touchMode; };

  // ---------- ឧបករណ៍បញ្ជាលើទូរស័ព្ទ (Touch) ----------
  let touchMode = matchMedia('(pointer: coarse)').matches;
  function enableTouch() {
    touchMode = true; noLock = true;
    document.body.classList.add('touch');
    if (G().running) $('touchUI').hidden = false;
  }
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !touchMode) enableTouch(); }, true);
  function bindTouch() {
    const base = $('joyBase'), knob = $('joyKnob'), R = 56;
    let joyId = null, cx = 0, cy = 0, lookId = null, lx = 0, ly = 0;
    const zone = $('joyZone'), look = $('lookZone');
    const resetJoy = () => { joyId = null; input.joy = { x: 0, y: 0, mag: 0 }; knob.style.transform = ''; base.style.left = ''; base.style.top = ''; base.style.bottom = ''; };
    resetJoy();
    zone.addEventListener('pointerdown', (e) => {
      if (joyId !== null) return;
      e.preventDefault(); try { zone.setPointerCapture(e.pointerId); } catch (err) {}
      joyId = e.pointerId; cx = e.clientX; cy = e.clientY;
      // joystick លេចឡើងត្រង់កន្លែងដែលម្រាមដៃប៉ះ
      const r = zone.getBoundingClientRect();
      base.style.left = (cx - r.left) + 'px'; base.style.top = (cy - r.top) + 'px'; base.style.bottom = 'auto';
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joyId) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      input.joy = { x: dx / R, y: dy / R, mag: Math.min(1, d / R) };
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => zone.addEventListener(ev, (e) => { if (e.pointerId === joyId) resetJoy(); }));
    look.addEventListener('pointerdown', (e) => { if (lookId !== null) return; e.preventDefault(); try { look.setPointerCapture(e.pointerId); } catch (err) {} lookId = e.pointerId; lx = e.clientX; ly = e.clientY; });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId || G().paused) return;
      input.dx += (e.clientX - lx) * 1.7; input.dy += (e.clientY - ly) * 1.4; lx = e.clientX; ly = e.clientY;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => look.addEventListener(ev, (e) => { if (e.pointerId === lookId) lookId = null; }));
    // ប៊ូតុង
    document.querySelectorAll('#touchUI .tb').forEach(b => {
      const t = b.dataset.t;
      const down = (e) => {
        e.preventDefault(); e.stopPropagation();
        try { b.setPointerCapture(e.pointerId); } catch (err) {}
        if (G().paused && t !== 'pause') return;
        if (t === 'attack') { input.attack = true; b.classList.add('on'); }
        else if (t === 'jump') { input.keys[' '] = true; b.classList.add('on'); }
        else if (t === 'run') { input.keys.shift = !input.keys.shift; b.classList.toggle('on', input.keys.shift); }
        else if (t === 'act') G().interact();
        else if (t === 'weapon') { const w = G().player.weapon === 'sword' ? 'knife' : 'sword'; G().setWeapon(w); setWeaponUI(w); }
        else if (t === 'pause') togglePause();
        else if (t === 'chat') openChat();
        else if (t === 'full') goFullscreen();
      };
      const up = () => {
        if (t === 'attack') { input.attack = false; b.classList.remove('on'); }
        if (t === 'jump') { input.keys[' '] = false; b.classList.remove('on'); }
      };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
  }
  function goFullscreen() {
    const el = document.documentElement;
    try {
      const p = document.fullscreenElement ? document.exitFullscreen() : (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => AG.ui.toast(AG.t('rotateHint')));
    } catch (err) { AG.ui.toast(AG.t('rotateHint')); }
  }

  // =================================================================
  // ៤. UI
  // =================================================================
  const G = () => AG.game;
  const modalOpen = () => !$('dialog').hidden || !$('pause').hidden;
  const fmtMoney = (v) => Math.floor(v).toLocaleString() + ' ៛';
  function setWeaponUI(w) { document.querySelectorAll('#weaponBox .slot').forEach(s => s.classList.toggle('on', s.dataset.w === w)); }

  function pauseFor(modal) { // ផ្អាកហ្គេមពេលបើកផ្ទាំង
    G().paused = true; input.keys = {}; input.attack = false;
    if (document.pointerLockElement) document.exitPointerLock();
    modal.hidden = false;
  }
  function resume() {
    $('pause').hidden = true; G().paused = false;
    if (!noLock) requestLock();
  }
  function togglePause(force) {
    if (!$('pause').hidden && !force) { resume(); return; }
    if ($('pause').hidden) pauseFor($('pause'));
  }

  AG.ui = {
    hud(s) {
      $('hpBar').style.width = (s.hp / s.maxHp * 100) + '%'; $('hpTxt').textContent = Math.ceil(s.hp);
      $('stBar').style.width = (s.st / s.maxSt * 100) + '%'; $('stTxt').textContent = Math.ceil(s.st);
      $('moneyTxt').textContent = fmtMoney(s.money);
      setWeaponUI(s.weapon);
      $('speedo').hidden = !s.veh;
      if (s.veh) $('speedTxt').textContent = Math.round(s.veh.speed);
    },
    prompt(text) { const p = $('prompt'); if (p.textContent !== text) p.textContent = text; p.hidden = !text; $('actBtn').classList.toggle('ready', !!text); },
    toast(text, ms = 2600) {
      const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
      $('toasts').appendChild(el);
      while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
      setTimeout(() => el.remove(), ms);
    },
    objective(title, lines) {
      const o = $('objective');
      if (!title) { o.hidden = true; return; }
      o.hidden = false;
      if ($('objTitle').textContent !== title) $('objTitle').textContent = title;
      const html = lines.map(l => '<li>' + esc(l) + '</li>').join('');
      if ($('objList').dataset.h !== html) { $('objList').innerHTML = html; $('objList').dataset.h = html; }
    },
    race(r) {
      const b = $('racebox');
      if (!r) { b.hidden = true; return; }
      b.hidden = false;
      $('rPos').textContent = r.pos + '/' + r.total; $('rLap').textContent = r.lap + '/' + r.laps;
      $('rTime').textContent = Math.floor(r.time / 60) + ':' + (r.time % 60).toFixed(2).padStart(5, '0');
    },
    bigText(text, ms = 1200) {
      const b = $('bigText'); b.textContent = text;
      clearTimeout(b._t); if (text) b._t = setTimeout(() => { b.textContent = ''; }, ms);
    },
    dialog(title, body, buttons) { showModal(title, esc(body), buttons); },
    results(title, lines, buttons) { showModal(title, '<ul>' + lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>', buttons, true); },
    hurtFlash(op = 1) { const h = $('hurtfx'); h.style.opacity = op; clearTimeout(h._t); h._t = setTimeout(() => { h.style.opacity = 0; }, 140); },
    toMenu() { toMenu(); },
    chatLine(name, msg) {
      const el = document.createElement('div');
      const b = document.createElement('b'); b.textContent = name + ': ';
      el.append(b, document.createTextNode(msg));
      $('chatLog').appendChild(el); $('chatLog').scrollTop = 1e9;
      while ($('chatLog').children.length > 30) $('chatLog').firstChild.remove();
    }
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function showModal(title, html, buttons = [{ label: AG.t('ok') }], keepPaused) {
    $('dlgTitle').textContent = title;
    $('dlgBody').innerHTML = html;
    const box = $('dlgBtns'); box.innerHTML = '';
    buttons.forEach((b, i) => {
      const el = document.createElement('button');
      el.className = 'btn' + (i === 0 ? ' gold' : ''); el.textContent = b.label;
      el.addEventListener('click', () => {
        $('dialog').hidden = true;
        if (!keepPaused || !b.action) { G().paused = false; if (!noLock && G().running) requestLock(); }
        if (b.action) b.action();
      });
      box.appendChild(el);
    });
    pauseFor($('dialog'));
    setTimeout(() => box.firstChild && box.firstChild.focus(), 30);
  }

  // ---------- ការជជែក (Multiplayer) ----------
  function openChat() {
    const inp = $('chatInput'); inp.hidden = false; inp.value = ''; chatting = true;
    if (document.pointerLockElement) document.exitPointerLock();
    G().paused = false; $('pause').hidden = true;
    setTimeout(() => inp.focus(), 10);
  }
  $('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const msg = e.target.value.trim();
      if (msg && AG.mp) AG.mp.chat(msg);
      e.target.value = ''; e.target.hidden = true; e.target.blur();
      if (!noLock) requestLock();
    }
  });
  // កុំឲ្យការបាត់ Pointer Lock ពេលជជែក បើកផ្ទាំងផ្អាក
  $('chatInput').addEventListener('focus', () => { $('pause').hidden = true; G().paused = false; });
  $('chatInput').addEventListener('blur', (e) => { e.target.hidden = true; setTimeout(() => { chatting = false; }, 50); });

  // =================================================================
  // ៥. ម៉ឺនុយ និងការចាប់ផ្ដើមហ្គេម
  // =================================================================
  const look = store.get('look', { gender: 'm', outfit: 0 });
  let weapon = store.get('weapon', 'sword');

  function renderOutfits() {
    const box = $('outfitSeg'); box.innerHTML = '';
    G().OUTFITS[look.gender].forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button';
      const hex = n => '#' + n.toString(16).padStart(6, '0');
      b.style.background = `linear-gradient(135deg, ${hex(o.top)} 0 50%, ${hex(o.bottom)} 50% 100%)`;
      b.setAttribute('aria-label', AG.t('outfit') + ' ' + (i + 1));
      b.classList.toggle('on', i === look.outfit);
      b.addEventListener('click', () => { look.outfit = i; applyLook(); });
      box.appendChild(b);
    });
  }
  function applyLook() {
    G().setLook(look.gender, look.outfit); store.set('look', look);
    document.querySelectorAll('#genderSeg button').forEach(b => b.classList.toggle('on', b.dataset.g === look.gender));
    renderOutfits();
  }
  function bindMenu() {
    $('langBtn').addEventListener('click', () => { lang = lang === 'km' ? 'en' : 'km'; store.set('lang', lang); applyLang(); renderOutfits(); });
    $('soundBtn').addEventListener('click', () => { AG.audio.start(); const on = AG.audio.toggleMute(); $('soundState').textContent = on ? '✓' : '✕'; $('soundBtn').setAttribute('aria-pressed', on); });
    $('musicBtn').addEventListener('click', () => { $('musicState').textContent = AG.audio.toggleMusic() ? '✓' : '✕'; });
    document.querySelectorAll('#genderSeg button').forEach(b => b.addEventListener('click', () => { look.gender = b.dataset.g; look.outfit = 0; applyLook(); }));
    document.querySelectorAll('#weaponSeg button').forEach(b => b.addEventListener('click', () => {
      weapon = b.dataset.w; store.set('weapon', weapon);
      document.querySelectorAll('#weaponSeg button').forEach(x => x.classList.toggle('on', x === b));
      G().player.weapon = weapon; G().player.h.setWeapon(weapon);
    }));
    $('nameInput').addEventListener('input', (e) => store.set('name', e.target.value));
    document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => {
      AG.audio.start();
      const m = b.dataset.mode;
      if (m === 'racing') { $('raceSelect').hidden = false; return; }
      if (m === 'multiplayer') { openMP(); return; }
      startGame(m);
    }));
    document.querySelectorAll('[data-route]').forEach(b => b.addEventListener('click', () => { $('raceSelect').hidden = true; startGame('racing', { route: b.dataset.route }); }));
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { b.closest('.modal').hidden = true; }));
    $('resumeBtn').addEventListener('click', resume);
    $('menuBtn').addEventListener('click', () => { $('pause').hidden = true; toMenu(); });
    $('mpConnect').addEventListener('click', connectMP);
  }

  function startGame(mode, opts) {
    const name = $('nameInput').value.trim() || (lang === 'km' ? 'វីរជន' : 'Hero');
    G().setName(name); $('hudName').textContent = name;
    G().player.weapon = weapon; G().player.h.setWeapon(weapon); setWeaponUI(weapon);
    $('menu').hidden = true; $('hud').hidden = false;
    $('chat').hidden = mode !== 'multiplayer';
    $('chatBtn').hidden = mode !== 'multiplayer';
    $('touchUI').hidden = !touchMode;
    input.keys = {}; input.joy = { x: 0, y: 0, mag: 0 }; document.querySelectorAll('#touchUI .tb').forEach(b => b.classList.remove('on'));
    G().startMode(mode, opts);
    if (!noLock) requestLock();
  }
  function toMenu() {
    if (AG.mp && AG.mp.connected) AG.mp.disconnect();
    G().stopMode();
    $('dialog').hidden = true; $('pause').hidden = true;
    $('hud').hidden = true; $('menu').hidden = false;
    if (document.pointerLockElement) document.exitPointerLock();
    G().player.pos.set(0, 0, 24);
  }

  // ---------- ពហុអ្នកលេង ----------
  function openMP() {
    const def = /^https?:/.test(location.protocol) && !/claude|usercontent/.test(location.host) ? location.origin : 'http://localhost:3000';
    $('mpUrl').value = store.get('mpUrl', def);
    $('mpStatus').textContent = typeof io === 'undefined' ? AG.t('mpNoLib') : '';
    $('mpPanel').hidden = false;
  }
  function connectMP() {
    const url = $('mpUrl').value.trim(), room = $('mpRoom').value.trim() || 'angkor';
    store.set('mpUrl', url);
    $('mpStatus').textContent = AG.t('mpConnecting');
    G().setName($('nameInput').value.trim() || 'Hero');
    AG.mp.connect(url, room, () => { $('mpPanel').hidden = true; startGame('multiplayer'); },
      (err) => { $('mpStatus').textContent = AG.t('mpFail', err); });
  }

  // ---------- ចាប់ផ្ដើម ----------
  function boot() {
    lang = store.get('lang', 'km');
    applyLang();
    if (typeof THREE === 'undefined') { $('loading').lastElementChild.textContent = 'Three.js failed to load — please check your internet connection.'; return; }
    G().init(canvas);
    G().setMinimap($('minimap'));
    $('nameInput').value = store.get('name', $('nameInput').value);
    document.querySelectorAll('#weaponSeg button').forEach(x => x.classList.toggle('on', x.dataset.w === weapon));
    $('soundState').textContent = AG.audio.muted ? '✕' : '✓';
    $('musicState').textContent = AG.audio.musicOn ? '✓' : '✕';
    applyLook();
    bindMenu();
    bindTouch();
    if (touchMode) enableTouch();
    $('loading').hidden = true; $('menu').hidden = false;
    // សំឡេងចាប់ផ្ដើមក្រោយការចុចដំបូង
    addEventListener('pointerdown', () => AG.audio.start(), { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // App (PWA)៖ ចុះឈ្មោះ Service Worker (ដំណើរការតែលើ https ឬ localhost)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => { try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {} });
  }
})();
