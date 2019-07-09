//#region 检测WebGL支持

let type = "WebGL";
if (!PIXI.utils.isWebGLSupported()) {
    type = "canvas";
}

PIXI.utils.sayHello(type);

//#endregion

//#region 工具库别名定义

//Aliases
let Application = PIXI.Application,
    Container = PIXI.Container,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    Text = PIXI.Text,
    Texture = PIXI.Texture,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    TextStyle = PIXI.TextStyle,
    Graphics = PIXI.Graphics,
    Rectangle = PIXI.Rectangle,
    BUMP = new Bump(PIXI);

//#endregion

//#region 全局变量定义

let viewWidth = document.documentElement.clientWidth; // mobile浏览器视觉宽度
let viewHeight = document.documentElement.clientHeight; // mobile浏览器视觉宽度
let bonusArea; // 双倍得分区域
let bonusAreaMask; // 双倍得分区域蒙版
let scoreUnitNormal = 10; // 击中加分（普通）
let scoreUnitDouble = scoreUnitNormal * 2; // 击中加分（双倍）
// 双倍得分区域
let scoreDoubleRange = {
    start: viewHeight / 7,
    end: viewHeight / 7 + viewHeight / 3
};
let soundWaves = []; // 音浪
let soundWaveRate = 1000; // 音浪动画频率，200ms
let soundWaveLastTime = 0; // 音浪动画上一次时间点，用于限制音浪频率在soundWaveRate以内
let soundWavesSpeed = 3; // 音浪速度
let soundWavesNum = 20; // 音浪数量
let soundWavesGap = 2; // 音柱间距
let soundWaveWidth = viewWidth / soundWavesNum; // 单个音柱宽度
let soundWaveDirection = 1; // 音浪移动方向，默认向下，若达到最大移动距离则反向移动
// 音浪高度范围
let soundWavesRange = {
    start: 0,
    end: scoreDoubleRange.end - scoreDoubleRange.start
};
let scoreDisplayer; // 分数显示器
let scoreDisplayerStyle; // 分数显示器样式
let scoreTotal = 0; // 总得分
let bunny, state;
let bunnyController; // bunny控制器
let bullets = []; // 子弹数组
let bulletSpeed = 5; // 子弹速度
let bulletPowerTime = 0; // 子弹蓄力时间
let bulletPowerTimer; // 子弹蓄力时间计时器
let notes = []; // 音符数组
let noteSpeed = 0.5; // 音符速度
let noteTimer; // 音符定时器
// 音符大小范围
let noteSizeRange = {
    start: 20,
    end: 80
};
// 层级关系
let zIndex = {
    bonusArea: 10,
    soundWaves: 20,
    scoreDisplayer: 30,
    bullets: 40,
    notes: 50,
    bunny: 60
};

//#endregion

//Create a Pixi Application
let app = new Application({
    width: 256,
    height: 256,
    antialias: true, // default: false
    transparent: false, // default: false
    resolution: window.devicePixelRatio, // default: 1
});
app.stage.sortableChildren = true; // 设置子元素可排序
// 设置分辨率为设备分辨率，否则字体会模糊
// https://github.com/pixijs/pixi.js/issues/1835#issuecomment-111119372
// PIXI.RESOLUTION = window.devicePixelRatio;

//Add the canvas that Pixi automatically created for you to the HTML document
let StageEle = document.getElementById('J_Stage');
StageEle.appendChild(app.view);

app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.backgroundColor = 0x061639;
app.renderer.autoResize = true;
// app.renderer.resize(StageEle.clientWidth, StageEle.clientHeight);
app.renderer.resize(viewWidth, viewHeight);

//load an image and run the `setup` function when it's done
loader
    // .add("bunny", "assets/images/bunny.png")
    .add([{
            name: 'bunny',
            url: 'assets/images/bunny.png'
        },
        {
            name: 'carrot',
            url: 'assets/images/carrot.png'
        },
        {
            name: 'ball',
            url: 'assets/images/ball.png'
        }
    ])
    .on("progress", loadProgressHandler)
    .load(setup);

function loadProgressHandler(loader, resource) {

    //Display the file `url` currently being loaded
    console.log("loading: " + resource.url);

    //Display the percentage of files currently loaded
    console.log("progress: " + loader.progress + "%");

    //If you gave your files names as the first argument 
    //of the `add` method, you can access them like this
    //console.log("loading: " + resource.name);
}

//Setup Pixi and load the texture atlas files - call the `setup`
//function when they've loaded
function setup() {
    //Initialize the game sprites, set the game `state` to `play`
    //and start the 'gameLoop'

    //#region 创建双倍得分区域
    // 创建区域容器
    bonusArea = new Container();
    bonusArea.width = viewWidth;
    bonusArea.height = scoreDoubleRange.end - scoreDoubleRange.start;
    bonusArea.x = 0;
    bonusArea.y = scoreDoubleRange.start;
    app.stage.addChild(bonusArea);

    // 创建背景色
    let bonusAreaBg = new Graphics();
    updateLayersOrder(bonusArea, 'bonusArea');
    bonusAreaBg.beginFill(0x66CCFF);
    bonusAreaBg.drawRect(0, 0, viewWidth, scoreDoubleRange.end - scoreDoubleRange.start);
    bonusAreaBg.endFill();
    bonusAreaBg.x = 0;
    bonusAreaBg.y = 0;
    bonusArea.addChild(bonusAreaBg);

    // 创建蒙版，限制音浪显示范围
    bonusAreaMask = new PIXI.Sprite(Texture.WHITE);
    bonusAreaMask.width = viewWidth;
    bonusAreaMask.height = scoreDoubleRange.end - scoreDoubleRange.start;
    bonusArea.addChild(bonusAreaMask); // make sure mask it added to display list somewhere!
    bonusArea.mask = bonusAreaMask;

    // 在双倍得分区域内创建音柱
    for (let s = 0; s < soundWavesNum; s += 1) {
        let soundWave = new Graphics();
        updateLayersOrder(soundWave, 'soundWaves');
        // let soundWaveHeight = randomInt(soundWavesRange.end / 5, soundWavesRange.end);
        let soundWaveHeight = scoreDoubleRange.end - scoreDoubleRange.start;
        // soundWave.lineStyle(1, 0x66CCFF, 1, 0);
        soundWave.beginFill(0xFF9933);
        soundWave.drawRoundedRect(0, 0, soundWaveWidth - soundWavesGap, 1.2 * soundWaveHeight,
            soundWaveWidth / 2);
        soundWave.endFill();
        soundWave.x = soundWaveWidth * s + soundWavesGap / 2;
        // soundWave.y = scoreDoubleRange.end - scoreDoubleRange.start - soundWaveHeight;
        soundWave.y = randomInt(0, 4 / 5 * soundWaveHeight);
        soundWaves.push({
            soundWave: soundWave,
            direction: soundWaveDirection
        });
        bonusArea.addChild(soundWave);
    }
    //#endregion

    //#region 创建得分显示器
    scoreDisplayerStyle = new TextStyle({
        fontFamily: "Arial",
        fontSize: 36,
        fill: "white",
        // stroke: '#ff3300',
        // strokeThickness: 4,
        // dropShadow: true,
        // dropShadowColor: "#000000",
        // dropShadowBlur: 4,
        // dropShadowAngle: Math.PI / 6,
        // dropShadowDistance: 6,
    });
    scoreDisplayer = new Text("当前得分：0", scoreDisplayerStyle);
    updateLayersOrder(scoreDisplayer, 'scoreDisplayer');
    scoreDisplayer.anchor.x = 0.5;
    scoreDisplayer.position.x = viewWidth / 2;
    scoreDisplayer.position.y = 10;
    app.stage.addChild(scoreDisplayer);
    //#endregion

    //#region 创建兔子🐰
    //Create the bunny sprite
    bunny = new Sprite(resources.bunny.texture);

    updateLayersOrder(bunny, 'bunny');

    // center the sprite's anchor point
    bunny.anchor.x = 0.5;
    bunny.anchor.y = 0.5;

    // move the sprite to the center of the screen
    // bunny.position.x = StageEle.clientWidth / 2;
    // bunny.position.y = StageEle.clientHeight - bunny.height / 2;
    bunny.position.x = viewWidth / 2;
    bunny.position.y = viewHeight - bunny.height;

    bunnyController = touchController({
        sprite: bunny,
        start: function (e) {
            let data = e.data;
            // console.log('touch start at', data.global.x, data.global.y);

            bulletPowerStart();
        },
        move: function (e) {
            let data = e.data;
            // console.log('touch move at', data.global.x, data.global.y);
            // bunny.

            if (
                data.global.x >= bunny.width &&
                data.global.x <= viewWidth - bunny.width
            ) {
                bunny.position.x = data.global.x;
            }
        },
        end: function (e) {
            let data = e.data;
            console.log('touch end at', data.global.x, data.global.y, '发射子弹，蓄力时间', bulletPowerTime,
                '秒');
            shoot({
                x: data.global.x,
                y: data.global.y
            });

            bulletPowerEnd();
        }
    });

    //Add the bunny to the stage
    app.stage.addChild(bunny);
    //#endregion

    //#region 创建音符🎵
    noteTimer = setInterval(function () {
        let note = new Sprite(resources.ball.texture);
        let noteSize = randomInt(noteSizeRange.start, noteSizeRange.end);
        updateLayersOrder(note, 'notes');
        note.alpha = 0.8;
        note.anchor.x = 0.5;
        note.anchor.y = 0.5;
        note.width = noteSize;
        note.height = noteSize;
        note.position.x = randomInt(note.width, viewWidth - note.width);
        note.position.y = -50;
        app.stage.addChild(note);
        notes.push(note);
    }, 2000);
    //#endregion

    //Set the game state
    state = play;

    //Start the game loop 
    app.ticker.add(delta => gameLoop(delta));
    // or use requestAnimationFrame()
    // gameLoop();

}

function gameLoop(delta) {
    //Runs the current game `state` in a loop and renders the sprites

    //Update the current game state:
    state(delta);
    // or
    //Call this `gameLoop` function on the next screen refresh
    //(which happens 60 times per second)
    // requestAnimationFrame(gameLoop);
    // state();

}

// 60fps动画
function play(delta) {
    //All the game logic goes here

    //#region 子弹动画
    for (let b = bullets.length - 1; b >= 0; b--) {
        let bullet = bullets[b];
        let hitNote = false;
        let hitNoteAt;

        bullet.vy = bulletSpeed;
        bullet.y -= bullet.vy;

        // console.log('notes', notes);

        notes.some(function (note, index) {
            if (BUMP.hit(note, bullet)) {
                hitNote = true;
                hitNoteAt = index;
                // 击中则跳出循环
                return true;
            }
        });

        // 击中音符，子弹和音符都消失
        if (hitNote) {
            console.log('bullet disappear after hitting');
            // 加分
            if (notes[hitNoteAt].y >= scoreDoubleRange.start && notes[hitNoteAt].y <= scoreDoubleRange.end) {
                scoreTotal += scoreUnitDouble;
                console.log('双倍得分，当前得分', scoreTotal);
            } else {
                scoreTotal += scoreUnitNormal;
                console.log('普通得分，当前得分', scoreTotal);
            }
            scoreDisplayer.text = '当前得分：' + scoreTotal;

            // 清除子弹
            app.stage.removeChild(bullet);
            bullets.splice(b, 1);
            // 清除音符
            app.stage.removeChild(notes[hitNoteAt]);
            notes.splice(hitNoteAt, 1);
        }
        // 若未击中，则当子弹消失在视野外后，清除该子弹
        else {
            if (bullet.y < -bullet.height) {
                console.log('bullet disappear');
                app.stage.removeChild(bullet);
                bullets.splice(b, 1);
            }
        }
    }
    //#endregion

    //#region 音符动画
    for (let n = notes.length - 1; n >= 0; n--) {
        let note = notes[n];
        let noteSize = note.width; // 音符大小
        let k = noteSpeed * noteSizeRange.end; // 速度大小比

        // 根据音符大小设置下落速度，下落速度与音符大小成反比
        note.vy = k / (noteSpeed * noteSize);
        note.y += note.vy;


        // 判断音符是否撞上bunny
        // 若撞上，则游戏结束
        if (BUMP.hit(note, bunny)) {
            console.warn('crash, game over');

            state = end;
            bunnyController.interactive = false; // 取消bunny交互
            scoreDisplayer.text = '游戏结束！' + scoreDisplayer.text;
        }

        // 当音符消失在视野外后，清除该音符
        if (note.y > viewHeight + note.height) {
            console.log('note disappear');
            app.stage.removeChild(note);
            notes.splice(n, 1);
        }
    }
    //#endregion

    // return;
    //#region 音浪动画
    soundWaves.forEach(function (wave, index) {

        wave.soundWave.vy = soundWavesSpeed * wave.direction;
        wave.soundWave.y += wave.soundWave.vy;

        // 当音浪移动到双倍得分区域边界后，进行反向移动，并改变音浪速度
        if (
            wave.soundWave.y > 4 / 5 * (scoreDoubleRange.end - scoreDoubleRange.start) ||
            wave.soundWave.y < 0
        ) {
            wave.direction *= -1;
        }

    });
    //#endregion
}

// 音浪动画（固定频率，暂时废弃）
function soundWaveAnimation(delta) {

    // 限制动画帧率
    let curTime = (new Date()).getTime();
    let timeDiff = curTime - soundWaveLastTime;
    // 如果上次动画发生在soundWaveRate间隔内，则不更新动画
    if (timeDiff < soundWaveRate) {
        return;
    }
    soundWaveLastTime = curTime; // 更新上次动画发生时间

    //#region 音浪动画
    soundWaves.forEach(function (soundWave, index) {

        // 直接改变音浪高度（会导致拉伸，暂废弃）
        // let soundWaveHeight = randomInt(soundWavesRange.end / 5, soundWavesRange.end);
        // soundWave.height = soundWaveHeight;
        // soundWave.radius = 10;
        // soundWave.y = scoreDoubleRange.end - soundWaveHeight;
        // soundWave.updateTransform();
        // console.log(soundWave);



        // 销毁上次的音浪
        bonusArea.removeChild(soundWave);
        // 重绘音浪动画
        let newSoundWave = new Graphics();
        updateLayersOrder(newSoundWave, 'soundWaves');
        let soundWaveHeight = randomInt(soundWavesRange.end / 5, soundWavesRange.end);
        newSoundWave.lineStyle(2, 0x66CCFF, 1, 0);
        newSoundWave.beginFill(0xFF9933);
        newSoundWave.drawRoundedRect(0, 0, soundWaveWidth, soundWaveHeight,
            10);
        newSoundWave.endFill();
        newSoundWave.x = soundWaveWidth * index;
        newSoundWave.y = scoreDoubleRange.end - scoreDoubleRange.start - soundWaveHeight;
        bonusArea.addChild(newSoundWave);
        soundWaves[index] = newSoundWave;
    });
    //#endregion
}

// 游戏结束
function end() {
    //All the code that should run at the end of the game
}

function shoot(startPosition) {
    //#region 创建子弹🥕
    let bullet = new Sprite(resources.carrot.texture);
    updateLayersOrder(bullet, 'bullets');
    bullet.anchor.x = 0.5;
    bullet.anchor.y = 0.5;
    bullet.position.x = startPosition.x;
    bullet.position.y = startPosition.y;
    app.stage.addChild(bullet);
    bullets.push(bullet);
    //#endregion
}

// 子弹开始蓄力
function bulletPowerStart() {
    bulletPowerTimer = clearInterval(bulletPowerTimer);
    bulletPowerTimer = setInterval(function () {
        bulletPowerTime += 1;
    }, 1000);
}

// 子弹结束蓄力
function bulletPowerEnd() {
    bulletPowerTime = 0;
}

//#region 辅助函数

/**
 * @description 触摸控制器
 * 
 * @param   {object}      opts 
 * @param   {object}      opts.sprite   图形对象
 * @param   {function}    opts.start    开始触摸回调函数     
 * @param   {function}    opts.move     拖动触摸回调函数
 * @param   {function}    opts.end      结束触摸回调函数
 * 
 * @returns {object}                    sprite图形对象
 */
function touchController(opts) {
    let sprite = opts.sprite;
    sprite.interactive = true //This is needed for make the mouse events works;
    let touch = {};
    touch.start = opts.start;
    touch.move = opts.move;
    touch.end = opts.end;

    sprite.on('pointerdown', function (e) {
        e.stopPropagation();
        let currentTarget = e.currentTarget;
        if (e.target === e.currentTarget) {
            currentTarget.dragging = true;
            touch.start(e);
        }
    });
    sprite.on('pointermove', function (e) {
        e.stopPropagation();
        // 控制台打印的e，在展开后e.currentTarget是不存在的，因为已经被销毁，所以需要赋值给一个变量进行存储
        let currentTarget = e.currentTarget;

        // 使用dragging属性判断是否拖拽的是目标sprite
        if (currentTarget.dragging) {
            touch.move(e);
        }
    });
    sprite.on('pointerup', function (e) {
        let currentTarget = e.currentTarget;
        e.stopPropagation();
        if (e.target === e.currentTarget) {
            currentTarget.dragging = false;
            touch.end(e);
        }
    });

    return sprite;
}

/**
 * @description 范围随机整型生成函数
 * 
 * @param {number} min 最小数
 * @param {number} max 最大数
 * @returns int ∈ [min, max]
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @description 更新元素层级关系，保证新添加的元素处于正确的层级，避免遮挡
 * 注：务必在新增加addChild后调用，以确保正确的层级关系
 * 
 * @param {object} sprite       图形对象
 * @param {string} spriteName   对象名称（在层级定义对象中的名称）
 */
function updateLayersOrder(sprite, spriteName) {
    sprite.zIndex = zIndex[spriteName];

    // app.stage.updateTransform(); // not working
    // // console.log(spriteName, zIndex[spriteName]);

    /* call this function whenever you added a new layer/container */
    app.stage.children.sort(function (a, b) {
        a.zIndex = a.zIndex || 0;
        b.zIndex = b.zIndex || 0;
        return b.zIndex - a.zIndex
    });
}

//#endregion