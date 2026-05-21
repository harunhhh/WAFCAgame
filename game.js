enchant();
function rand(num) {
    return Math.floor(Math.random() * num);
}

var JIKISIZE = 24;      // 自分のサイズ
var SCROLL = 0;         // 道路のスクロール速度
var ENEMYSPEED =  5;      // 敵の移動速度
var ITEMINTERVAL = 10;   // アイテムの出現間隔

//  プレイヤーに関する初期設定
var MAXLIFE = 5;      // プレイヤーの最大ライフ
var GOAL_SCORE = 3000; // 目標スコア
var MAX_SPEED_LEVEL = 5; // 最大スピードレベル
var GOAL_TIME_SECONDS = 15;  //制限時間

// --- ★★★ テキストデータを一元管理 ★★★ ---
var selectedLanguage = 'jp'; // デフォルト言語
var TEXTS = {
    // 言語選択画面
    selectLang:     { jp: "言語を選択してください", en: "SELECT LANGUAGE" },
    japanese:       { jp: "日本語",               en: "JAPANESE" },
    english:        { jp: "英語",                 en: "ENGLISH" },
    // 遊び方画面 (howToPlayはタイトルでも使用)
    howToPlay:      { jp: "あそびかた",         en: "HOW TO PLAY" },
    move:           { jp: "矢印キー: いどう",   en: "ARROW KEYS: MOVE" },
    itemSpeedDesc:  { jp: "：スピードアップ",     en: ": SPEED UP" },
    itemLifeDesc:   { jp: "：ライフかいふく",     en: ": LIFE RECOVER" },
    howToDetails:   { jp: "障害物を避けてアイテムを集めて高スコアを目指そう！", en: "Avoid obstacles, collect items, and aim for a high score!" },
    continue:       { jp: "クリックしてすすむ",   en: "CLICK TO CONTINUE" },
    // タイトル画面
    start:          { jp: "クリックしてスタート", en: "CLICK TO START" },
    // ゲーム画面
    time:           { jp: "タイム: ",          en: "TIME: " },
    score:          { jp: "スコア: ",          en: "SCORE: " },
    life:           { jp: "ライフ: ",          en: "LIFE: " },
    spd:            { jp: "スピード: ",        en: "SPD: " },
    spdMax:         { jp: "スピード: MAX",     en: "SPD: MAX" },
    // リザルト画面
    gameClear:      { jp: "ゲーム終了",       en: "GAME CLEAR" },
    gameOver:       { jp: "ゲームオーバー",     en: "GAME OVER" },
    finalScore:     { jp: "最終スコア: ",       en: "FINAL SCORE: " },
    unpavedInfo:    { jp: "舗装されていない道は走りにくいです", en: "Unpaved roads are hard to travel on." },
    donation1:      { jp: "あなたの寄付で、走りやすい道と", en: "Donate to gift accessible roads" },
    donation2:      { jp: "車いすを贈りましょう!",     en: "iand wheelchairs to Asia!" },
    donationURL:    { jp: "https://wafca.jp/support/donation.html", en: "https://wafca.jp/support/donation.html" },
    restart:        { jp: "クリックしてリスタート", en: "Click to restart" }
};
// ---------------------------------------------

// ゲームの状態を保持するグローバル変数
var currentScore = 0;
var currentLife = 0;
var currentSpeedLevel = 0;
var gameTimer = 0;
var enemyArray = [];
var player = null;

// ラベルオブジェクトを保持するグローバル変数
var scoreLabel, lifeLabel, speedLabel, timerLabel;

// 背景クラスの定義
var Background = Class.create(Group, {
    initialize: function() {
        Group.call(this);
        var img = core.assets['back.png'];
        if (!img) {
             console.error("背景画像 'back.png' が見つかりません。");
             this.imageHeight = 240; // デフォルト値
        } else {
            this.imageHeight = img.height;
        }
        this.bg1 = new Sprite(core.width, this.imageHeight);
        this.bg1.image = img;
        this.bg1.y = 0;
        this.addChild(this.bg1);
        this.bg2 = new Sprite(core.width, this.imageHeight);
        this.bg2.image = img;
        this.bg2.y = -this.imageHeight;
        this.addChild(this.bg2);
    },
    onenterframe: function() {
        this.bg1.y += SCROLL;
        this.bg2.y += SCROLL;
        if (this.bg1.y >= core.height) {
            this.bg1.y = this.bg2.y - this.imageHeight;
        }
        if (this.bg2.y >= core.height) {
            this.bg2.y = this.bg1.y - this.imageHeight;
        }
    }
});


// ゲームのメインロジックを関数化
function startGame() {
    var gameScene = new Scene();

    currentScore = 0;
    currentLife = MAXLIFE;
    currentSpeedLevel = 0;
    gameTimer = 0;
    enemyArray = [];

    var background = new Background();
    gameScene.addChild(background);

    player = new Player();
    gameScene.addChild(player);

    var initialMinutes = Math.floor(GOAL_TIME_SECONDS / 60);
    var initialSeconds = GOAL_TIME_SECONDS % 60;
    var initialTimeString = ("0" + initialMinutes).slice(-2) + ":" + ("0" + initialSeconds).slice(-2);
     timerLabel = new Label(TEXTS.time[selectedLanguage] + initialTimeString);
    timerLabel.x = 5; timerLabel.y = 5; timerLabel.color = "white"; timerLabel.font = "16px 'MS Gothic', sans-serif";
    gameScene.addChild(timerLabel);

    scoreLabel = new Label(TEXTS.score[selectedLanguage] + currentScore);
    scoreLabel.x = 5; scoreLabel.y = 25; scoreLabel.color = "white"; scoreLabel.font = "16px 'MS Gothic', sans-serif";
    gameScene.addChild(scoreLabel);

    lifeLabel = new Label(TEXTS.life[selectedLanguage] + currentLife);
    lifeLabel.x = 5; lifeLabel.y = 45; lifeLabel.color = "white"; lifeLabel.font = "16px 'MS Gothic', sans-serif";
    gameScene.addChild(lifeLabel);

    speedLabel = new Label(TEXTS.spd[selectedLanguage] + currentSpeedLevel);
    speedLabel.x = 5; speedLabel.y = 220; speedLabel.color = "white"; speedLabel.font = "16px 'MS Gothic', sans-serif";
    gameScene.addChild(speedLabel);

    gameScene.onenterframe = function () {
        gameTimer++;
        reDraw();
        itemEnabler();

        var rateOfNotAppearance = 94;
        if(rand(100)>=rateOfNotAppearance){
            var enemyX = rand(core.width - 32);
            var zako=new Enemy(enemyX, -30, 1+rand(10), 1+rand(10));
            zako.id=core.frame;
            enemyArray[zako.id]=zako;
            gameScene.addChild(zako);
        }
    };
    core.replaceScene(gameScene);
}

// 遊び方説明画面
function createHowToPlayScene() {
    var howToScene = new Scene();
    howToScene.backgroundColor = 'black';

    // 1. タイトル ("あそびかた")
    var title = new Label(TEXTS.howToPlay[selectedLanguage]);
    title.color = "white"; title.font = "20px 'MS Gothic', sans-serif"; title.textAlign = 'center';
    title.width = core.width; title.x = 0; title.y = 20;
    howToScene.addChild(title);

    // 2. 操作方法 ("矢印キー: いどう")
    var controls = new Label(TEXTS.move[selectedLanguage]);
    controls.color = "white"; controls.font = "16px 'MS Gothic', sans-serif"; controls.textAlign = 'center';
    controls.width = core.width; controls.x = 0; controls.y = 50;
    howToScene.addChild(controls);

    // 2.5. 目標の説明
    var details = new Label(TEXTS.howToDetails[selectedLanguage]);
    details.color = "white"; details.font = "16px 'MS Gothic', sans-serif"; details.textAlign = 'center';
    details.width = core.width; details.x = 0; details.y = 70; // 'controls' の下に配置
    howToScene.addChild(details);

    // 3. アイテム説明 (スピード)
    var speedItemImg = new Sprite(32, 32);
    if (core.assets['speed.png'] && core.assets['speed.png'].width > 0) {
        speedItemImg.image = core.assets['speed.png'];
    } else {
        speedItemImg.backgroundColor = 'red';
    }
    speedItemImg.x = 70;
    speedItemImg.y = 100; // Y座標
    howToScene.addChild(speedItemImg);
    
    var speedDesc = new Label(TEXTS.itemSpeedDesc[selectedLanguage]); // "：スピードアップ"
    speedDesc.color = "white"; speedDesc.font = "16px 'MS Gothic', sans-serif";
    speedDesc.x = speedItemImg.x + speedItemImg.width + 5;
    speedDesc.y = speedItemImg.y + 8;
    howToScene.addChild(speedDesc);

    // 4. アイテム説明 (ライフ)
    var lifeItemImg = new Sprite(32, 32);
    if (core.assets['life.png'] && core.assets['life.png'].width > 0) {
        lifeItemImg.image = core.assets['life.png'];
    } else {
        lifeItemImg.backgroundColor = 'blue';
    }
    lifeItemImg.x = 70;
    lifeItemImg.y = 150; // Y座標
    howToScene.addChild(lifeItemImg);
    
    var lifeDesc = new Label(TEXTS.itemLifeDesc[selectedLanguage]); // "：ライフかいふく"
    lifeDesc.color = "white"; lifeDesc.font = "16px 'MS Gothic', sans-serif";
    lifeDesc.x = lifeItemImg.x + lifeItemImg.width + 5;
    lifeDesc.y = lifeItemImg.y + 8;
    howToScene.addChild(lifeDesc);

    // 5. 次へ進むテキスト ("クリックしてすすむ")
    var continueText = new Label(TEXTS.continue[selectedLanguage]);
    continueText.color = "white"; continueText.font = "18px 'MS Gothic', sans-serif"; continueText.textAlign = 'center';
    continueText.width = core.width; continueText.x = 0; continueText.y = 210;
    continueText.onenterframe = function() { this.opacity = (core.frame % 20 < 10) ? 1 : 0.5; };
    howToScene.addChild(continueText);

    // 6. クリックイベント (タイトル画面へ)
    howToScene.addEventListener(Event.TOUCH_END, function() {
        startGame();
    });
    
    core.replaceScene(howToScene);
}

// 言語選択画面
function createLangSelectScene() {
    var langScene = new Scene();
    langScene.backgroundColor = 'black';

    var selectTitle = new Label(TEXTS.selectLang['en']);
    selectTitle.color = "white"; selectTitle.font = "20px 'MS Gothic', sans-serif"; selectTitle.textAlign = 'center';
    selectTitle.width = core.width; selectTitle.x = 0; selectTitle.y = 80;
    langScene.addChild(selectTitle);

    var japaneseButton = new Label(TEXTS.japanese['jp']);
    japaneseButton.color = "white"; japaneseButton.font = "18px 'MS Gothic', sans-serif"; japaneseButton.textAlign = 'center';
    japaneseButton.width = core.width; japaneseButton.x = 0; japaneseButton.y = 130;
    langScene.addChild(japaneseButton);
    japaneseButton.addEventListener(Event.TOUCH_END, function() { selectedLanguage = 'jp'; createHowToPlayScene(); });

    var englishButton = new Label(TEXTS.english['en']);
    englishButton.color = "white"; englishButton.font = "18px 'MS Gothic', sans-serif"; englishButton.textAlign = 'center';
    englishButton.width = core.width; englishButton.x = 0; englishButton.y = 170;
    langScene.addChild(englishButton);
    englishButton.addEventListener(Event.TOUCH_END, function() { selectedLanguage = 'en'; createHowToPlayScene(); });

    core.pushScene(langScene);
}


// ★★★ ゲーム開始時のエントリーポイント ★★★
window.onload=function(){
    core = new Core(320,240);
    core.fps=30;

    // ★★★ preloadリスト ★★★
    core.preload(
        'girl.png',
        'back.png',
        'speed.png',
        "life.png",
        "kan.png",
        "isi.png",
        "kiretu.png",
        "blast.png"
    );

    core.onload = function () {
        createLangSelectScene(); // 最初に言語選択画面を呼び出す
    }
    core.start();
}

// ★★★ 爆発エフェクト (Blast) クラス (復活) ★★★
Blast = Class.create(Sprite,{
    initialize: function(x,y){
        Sprite.call(this,32,32);
        var img = core.assets['blast.png'];
        if (img && img.width > 0 && img.height > 0) {
            this.image = img;
        } else {
            console.error("'blast.png' が見つかりません。");
            this.backgroundColor = 'orange'; // フォールバック
        }
        this.frame=0; this.x=x; this.y=y;
    },
    onenterframe: function(){ this.y+=SCROLL; this.frame++; if(this.frame>15) this.remove(); },
    remove: function(){ if (this.parentNode) { this.parentNode.removeChild(this); } }
});

// アイテム (スピード)
ItemSpeed = Class.create(Sprite,{
    initialize: function(x){
        var itemWidth = 32;
        var itemHeight = 32;
        var img = core.assets['speed.png'];
        if (img && img.width > 0 && img.height > 0) {
            Sprite.call(this, itemWidth, itemHeight);
            this.image = img;
            this.scaleX = 1; this.scaleY = 1;
        } else {
            console.error("'speed.png' が見つからないか、読み込めません。ItemSpeed");
            Sprite.call(this, itemWidth, itemHeight);
            this.backgroundColor = 'red';
        }
        this.x=x;
        this.y = -itemHeight - 10;
    },
    onenterframe: function(){
        this.y+=4;
        this.opacity = (core.frame % 10 < 5) ? 1.0 : 0.6;
        var collisionRadius = this.width / 2;
        if(player && this.within(player, collisionRadius + JIKISIZE / 2)){
            this.remove();
            currentScore+=500;
            if(player.spdLv < MAX_SPEED_LEVEL){
                player.spdLv++;
                currentSpeedLevel = player.spdLv;
                var speedIncrement = (player.maxSpeed - player.minSpeed) / MAX_SPEED_LEVEL;
                player.nowSpeed = player.minSpeed + (player.spdLv * speedIncrement);
                if (player.nowSpeed > player.maxSpeed) player.nowSpeed = player.maxSpeed;
            }
        }
        if(this.y > core.height + 20){ this.remove(); }
    },
    remove: function(){ if (this.parentNode) { this.parentNode.removeChild(this); } }
});

// アイテム (ライフ)
ItemLife = Class.create(Sprite, {
    initialize: function(x) {
        var itemWidth = 32;
        var itemHeight = 32;
        var img = core.assets['life.png'];
        if (img && img.width > 0 && img.height > 0) {
            Sprite.call(this, itemWidth, itemHeight);
            this.image = img;
            this.scaleX = 1; this.scaleY = 1;
        } else {
             console.error("'life.png' が見つからないか、読み込めません。ItemLife");
             Sprite.call(this, itemWidth, itemHeight);
            this.backgroundColor = 'blue';
        }
        this.x = x;
        this.y = -itemHeight - 10;
    },
    onenterframe: function() {
        this.y += 4;
        this.opacity = (core.frame % 10 < 5) ? 1.0 : 0.6;
        var collisionRadius = this.width / 2;
        if (player && this.within(player, collisionRadius + JIKISIZE / 2)) {
            this.remove();
            currentScore += 500;
            if (currentLife < MAXLIFE) { currentLife++; }
        }
        if (this.y > core.height + 20) { this.remove(); }
    },
    remove: function(){ if (this.parentNode) { this.parentNode.removeChild(this); } }
});

// リザルト画面
function showResultScene(isClear) {
    core.pause();
    var resultScene = new Scene();
    resultScene.backgroundColor = "#000";

    var titleText = isClear ? TEXTS.gameClear[selectedLanguage] : TEXTS.gameOver[selectedLanguage];
    var finishText = new Label(titleText);
    finishText.color = "white"; finishText.font = "20px 'MS Gothic', sans-serif"; finishText.textAlign = 'center';
    finishText.width = core.width; finishText.x = 0; finishText.y = 30;
    resultScene.addChild(finishText);

    // 最終スコア (Y: 60)
    var resultScoreText = new Label(TEXTS.finalScore[selectedLanguage] + currentScore);
    resultScoreText.color = "white"; resultScoreText.font = "16px 'MS Gothic', sans-serif"; resultScoreText.textAlign = 'center';
    resultScoreText.width = core.width; resultScoreText.x = 0; resultScoreText.y = 60;
    resultScene.addChild(resultScoreText);

    //未舗装路のメッセージ
    var unpavedText = new Label(TEXTS.unpavedInfo[selectedLanguage]);
    unpavedText.color = "#FFDDDD"; // 少し色を変えて目立たせる（薄い赤/ピンク）
    unpavedText.font = "14px 'MS Gothic', sans-serif"; 
    unpavedText.textAlign = 'center';
    unpavedText.width = core.width; 
    unpavedText.x = 0; 
    unpavedText.y = 90; // スコアの下に配置
    resultScene.addChild(unpavedText);

    var donationText1 = new Label(TEXTS.donation1[selectedLanguage]);
    donationText1.color = "white"; donationText1.font = "14px 'MS Gothic', sans-serif"; donationText1.textAlign = 'center';
    donationText1.width = core.width; donationText1.x = 0; donationText1.y = 120;
    resultScene.addChild(donationText1);

    var donationText2 = new Label(TEXTS.donation2[selectedLanguage]);
    donationText2.color = "white"; donationText2.font = "14px 'MS Gothic', sans-serif"; donationText2.textAlign = 'center';
    donationText2.width = core.width; donationText2.x = 0; donationText2.y = 140;
    resultScene.addChild(donationText2);

    var donationLink = new Label(TEXTS.donationURL[selectedLanguage]);
    donationLink.color = "#66CCFF"; donationLink.font = "12px 'MS Gothic', sans-serif"; donationLink.textAlign = 'center';
    donationLink.width = core.width; donationLink.x = 0; donationLink.y = 165;
    resultScene.addChild(donationLink);
    donationLink.addEventListener(Event.TOUCH_END, function() { window.open(TEXTS.donationURL[selectedLanguage], '_blank'); });

    resultScene.onenter = function() {
        var playerName = prompt(titleText + " 名前を入力してください（10文字まで）", "PLAYER");

        if (playerName && playerName.trim() !== "") {
            var finalScore = currentScore;
            var finalTime = Math.floor(gameTimer / core.fps);

            // 親ウィンドウ(index.html)にスコアデータを送信
            if (window.parent) {
                window.parent.postMessage({
                    type: 'saveScore',
                    name: playerName,
                    score: finalScore,
                    time: finalTime
                }, '*');

                console.log("スコアを親ウィンドウに送信しました。");
            } else {
                console.error("親ウィンドウが見つかりません。");
            }
            

        } 
    };
    var restartText = new Label(TEXTS.restart[selectedLanguage]); // "クリックしてリスタート"
    restartText.color = "white";
    restartText.font = "16px 'MS Gothic', sans-serif";
    restartText.textAlign = 'center';
    restartText.width = core.width;
    restartText.x = 0;
    restartText.y = 190; // 表示位置
    restartText.onenterframe = function() {
        this.opacity = (core.frame % 20 < 10) ? 1 : 0.7; // 点滅エフェクト
    };
    resultScene.addChild(restartText);

    restartText.addEventListener(Event.TOUCH_END, function() {
        location.reload(); 
    });

    core.replaceScene(resultScene);

}


// アイテム出現
function itemEnabler() {
    var itemWidth = 32;
    var itemMargin = itemWidth / 2;
    var spawnWidth = core.width - itemMargin * 2;
    if (player && player.age % ITEMINTERVAL == 0 && rand(100) > 50) {
        var itemX = rand(spawnWidth) + itemMargin;
        var speeditem = new ItemSpeed(itemX);
        core.currentScene.addChild(speeditem);
    }
    if (player && player.age % (ITEMINTERVAL * 2) == 0 && rand(100) > 70) {
        var itemX = rand(spawnWidth) + itemMargin;
        var lifeitem = new ItemLife(itemX);
        core.currentScene.addChild(lifeitem);
    }
}

// UIの再描画
function reDraw() {
    if (scoreLabel) { scoreLabel.text = TEXTS.score[selectedLanguage] + currentScore; }
    if (lifeLabel) { lifeLabel.text = TEXTS.life[selectedLanguage] + currentLife; }
    if (speedLabel) {
        if (currentSpeedLevel >= MAX_SPEED_LEVEL) {
            speedLabel.text = TEXTS.spdMax[selectedLanguage];
        } else {
            speedLabel.text = TEXTS.spd[selectedLanguage] + currentSpeedLevel;
        }
    }
    if (timerLabel) {
        var elapsedSeconds = Math.floor(gameTimer / core.fps);
        var remainingSeconds = GOAL_TIME_SECONDS - elapsedSeconds;
        if (remainingSeconds < 0) { remainingSeconds = 0; }
        var min = Math.floor(remainingSeconds / 60);
        var sec = remainingSeconds % 60;
     timerLabel.text = TEXTS.time[selectedLanguage] + ("0" + min).slice(-2) + ":" + ("0" + sec).slice(-2);
    }
}

// 敵クラス
Enemy = Class.create(Sprite,{
    initialize: function(x,y,moveX,moveY){
        Sprite.call(this,32,32);
        this.type = rand(4);
        
        var img;
        switch(this.type) {
            case 0: img = core.assets['isi.png']; break;
            case 1: img = core.assets['kan.png']; break;
            case 2: img = core.assets['kiretu.png']; break;
            case 3: img = core.assets['kan.png']; break;
            default: img = core.assets['kan.png']; break;
        }

        // 厳密な読み込みチェック
        if (img && img.width > 0 && img.height > 0) {
            this.image = img;
        } else {
            console.error("敵の画像が見つからないか、読み込めません。タイプ:", this.type);
            this.backgroundColor = 'purple'; // フォールバック
        }
        
        this.x=x; this.y=y;
        this.moveX=moveX; this.moveY=moveY; this.baseSpeed = ENEMYSPEED;
        if (this.type === 1) {
            this.tl.moveBy(this.moveX * this.baseSpeed * 0.5, this.moveY * this.baseSpeed * 0.5 + SCROLL * 30, 30, enchant.Easing.SIN_EASEIO)
                  .moveBy(-this.moveX * this.baseSpeed * 0.5, this.moveY * this.baseSpeed * 0.5 + SCROLL * 30, 30, enchant.Easing.SIN_EASEIO).loop();
        }
    },
    onenterframe: function(){
        if (this.image === core.assets['kan.png']) {
             this.frame = core.frame % 3;
        } else if (this.image === core.assets['isi.png']) {
             this.frame = 0;
        } else if (this.image === core.assets['kiretu.png']) {
             this.frame = 0;
        }

        var currentSpeed = this.baseSpeed / 5 + SCROLL;
        switch(this.type){
            case 0: this.y += currentSpeed; break;
            case 1: this.y += SCROLL; break; // 'kan' type 1
            case 2: this.y += currentSpeed * 0.7; break; // 'kiretu'
            case 3: this.x += Math.cos(core.frame * 0.05 + (this.id || 0)) * 2; this.y += currentSpeed; break; // 'kan' type 3
        }
        if(this.x < -this.width || this.x > core.width || this.y > core.height || this.y < -this.height - 50){ this.remove(); }
        if(player && player.parentNode && this.within(player,10) ){
            this.remove(); if (currentLife > 0) { currentLife--; }
        }
    },
    // ★★★ 敵の remove メソッド (復活) ★★★
    remove:function(){
        var baku = new Blast(this.x, this.y);
        if (this.parentNode) {
            this.parentNode.addChild(baku);
            this.parentNode.removeChild(this);
        }
        if (enemyArray[this.id]) { delete enemyArray[this.id]; }
    }
});

// プレイヤークラス
Player = Class.create(Sprite, {
    initialize: function() {
        Sprite.call(this, JIKISIZE, JIKISIZE);
        var img = core.assets['girl.png'];
        if (img) {
            this.image = img;
        } else {
            console.error("'girl.png' が見つかりません。");
            this.backgroundColor = 'white';
        }
        this.x = (core.width - JIKISIZE) / 2; this.y = core.height - JIKISIZE - 30;
        this.spdLv = 0; this.minSpeed = 2; this.maxSpeed = 6; this.nowSpeed = this.minSpeed; this.isGameOver = false;
    },
    onenterframe: function() {
        if (this.isGameOver) return;
        if (core.input.left) { this.x -= this.nowSpeed; if (this.x < 0) this.x = 0; }
        if (core.input.right) { this.x += this.nowSpeed; if ((this.x + JIKISIZE) > core.width) this.x = core.width - JIKISIZE; }
        if (core.input.up) { this.y -= this.nowSpeed; if (this.y < 0) this.y = 0; }
        if (core.input.down) { this.y += this.nowSpeed; if ((this.y + JIKISIZE) > core.height) this.y = core.height - JIKISIZE; }

        var currentSeconds = Math.floor(gameTimer / core.fps);
        if (currentLife <= 0) {
            this.isGameOver = true;
            if (this.parentNode) { this.parentNode.removeChild(this); showResultScene(false); }
        } else if (currentSeconds >= GOAL_TIME_SECONDS) {
            this.isGameOver = true;
            if (this.parentNode) { this.parentNode.removeChild(this); showResultScene(true); }
        }
    }
});