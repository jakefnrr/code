(() => {
const TILE=32, ROWS=15, GRAVITY=0.55, MAX_FALL=12, PLAYER_SPEED=3.5, RUN_SPEED=5.5, JUMP_FORCE=-10.5, BOUNCE=5;
const SAVE_KEY='mario_bros_save_v2';
const canvas=document.getElementById('game-canvas');
const ctx=canvas.getContext('2d');
let W=800, H=ROWS*TILE;

function resize(){
    canvas.width=W; canvas.height=H;
}
resize();
window.addEventListener('resize',resize);

let save={unlockedWorlds:[1],completedLevels:[],coins:0,lives:3};
function loadSave(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY));if(d)save=d;}catch(e){}}
function writeSave(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}}
loadSave();

let state='worldSelect', currentWorld=1, currentLevel=0;
let player, cam, enemies, coins, powerups, blocks, particles, checkpoints, goalX;
let timeLeft=300, timerInterval=null, score=0;
let keys={}, mobileState={left:false,right:false,jump:false};
let levelData=null, invTimer=0, starTimer=0;
let jumpPressed=false;

const WORLD_NAMES=['','SUNNY MEADOWS','DESERT RUINS','MUSHROOM SKYLANDS'];
const WORLD_COLORS=['','#5599ff','#cc8833','#88bb44'];

function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const el=document.getElementById(id);
    if(el)el.classList.add('active');
    const hud=document.getElementById('hud');
    const pb=document.getElementById('pause-btn');
    const mc=document.getElementById('mobile-controls');
    if(id==='worldSelect'||!id){
        hud.classList.remove('active');
        pb.classList.remove('active');
        mc.classList.remove('active');
    }
}

function buildWorldSelect(){
    state='worldSelect';
    const g=document.getElementById('world-grid');
    g.innerHTML='';
    showScreen('world-select');
    for(let w=1;w<=3;w++){
        const box=document.createElement('div');
        box.className='world-box';
        if(save.unlockedWorlds.includes(w)){
            box.classList.add('unlocked');
            const cleared=save.completedLevels.filter(l=>l.startsWith(w+'-')).length;
            const total=LEVELS.filter(l=>l.world===w).length;
            box.innerHTML='<div class="world-num">'+w+'</div><div class="world-name">'+WORLD_NAMES[w]+'</div><div class="world-status">'+cleared+'/'+total+' cleared</div>';
            box.onclick=(function(ww){return function(){currentWorld=ww;showLevelSelect(ww);};})(w);
        } else {
            box.classList.add('locked');
            box.innerHTML='<div class="lock-icon">&#128274;</div>';
        }
        g.appendChild(box);
    }
}

function showLevelSelect(world){
    showScreen('level-select');
    document.getElementById('level-world-name').textContent='WORLD '+world+' - '+WORLD_NAMES[world];
    document.getElementById('level-world-name').style.color=WORLD_COLORS[world];
    const g=document.getElementById('level-grid');
    g.innerHTML='';
    const worldLevels=LEVELS.filter(function(l){return l.world===world;});
    worldLevels.forEach(function(lv,i){
        const btn=document.createElement('button');
        btn.className='level-btn';
        const lvId=lv.name;
        const isCompleted=save.completedLevels.includes(lvId);
        var prevCleared;
        if(i===0){
            prevCleared=save.unlockedWorlds.includes(world)&&(world===1||save.completedLevels.filter(function(l){return l.startsWith((world-1)+'-');}).length>=LEVELS.filter(function(l){return l.world===world-1;}).length);
        } else {
            prevCleared=save.completedLevels.includes(worldLevels[i-1].name);
        }
        var isUnlocked=prevCleared||isCompleted;
        if(isCompleted)btn.classList.add('completed');
        else if(isUnlocked)btn.classList.add('unlocked');
        else btn.style.opacity='0.4';
        btn.textContent=i+1;
        btn.onclick=(function(ww,ii,isU){return function(){
            if(isU){
                currentWorld=ww;
                currentLevel=ii;
                setTimeout(function(){startLevel();},100);
            }
        };})(world,i,isUnlocked);
        g.appendChild(btn);
    });
    document.getElementById('btn-back-worlds').onclick=function(){buildWorldSelect();};
}

function startLevel(){
    var lv=LEVELS[currentLevel];
    if(!lv)return;
    levelData=lv;
    state='playing';
    document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
    document.getElementById('hud').classList.add('active');
    document.getElementById('pause-btn').classList.add('active');
    var mc=document.getElementById('mobile-controls');
    if('ontouchstart' in window||navigator.maxTouchPoints>0)mc.classList.add('active');
    player={x:64,y:H-TILE*4-16,w:28,h:32,vx:0,vy:0,face:1,grounded:false,big:false,fire:false,dead:false};
    cam={x:0};
    enemies=[];coins=[];powerups=[];blocks=[];particles=[];checkpoints=[];
    goalX=lv.goalX*TILE;
    invTimer=0;starTimer=0;jumpPressed=false;
    var groundY=H-TILE;
    if(lv.ground)lv.ground.forEach(function(g){
        for(var i=0;i<g.w;i++){
            blocks.push({x:(g.x+i)*TILE,y:groundY,w:TILE,h:TILE,type:'ground',solid:true});
        }
    });
    if(lv.platforms)lv.platforms.forEach(function(p){
        for(var i=0;i<p.w;i++){
            blocks.push({x:(p.x+i)*TILE,y:p.y*TILE,w:TILE,h:TILE,type:'platform',solid:true});
        }
    });
    if(lv.blocks)lv.blocks.forEach(function(b){
        blocks.push({x:b.x*TILE,y:b.y*TILE,w:TILE,h:TILE,type:b.type,content:b.content,solid:true,hit:false});
    });
    if(lv.enemies)lv.enemies.forEach(function(e){
        enemies.push({x:e.x*TILE,y:H-TILE-28,w:28,h:28,type:e.type,vx:e.type==='flyer'?0:-1,vy:0,alive:true,flyT:0,flyY:e.y*TILE});
    });
    if(lv.coins)lv.coins.forEach(function(c){
        coins.push({x:c.x*TILE+8,y:c.y*TILE+4,w:16,h:24,collected:false,bobT:Math.random()*Math.PI*2});
    });
    if(lv.checkpoints)lv.checkpoints.forEach(function(cp){
        checkpoints.push({x:cp.x*TILE,y:H-TILE-40,w:16,h:40,reached:false});
    });
    score=0;timeLeft=300;
    clearInterval(timerInterval);
    timerInterval=setInterval(function(){
        if(state!=='playing')return;
        timeLeft--;
        document.getElementById('hud-time').textContent='TIME: '+timeLeft;
        if(timeLeft<=0)playerDie();
        document.getElementById('hud-time').classList.toggle('warning',timeLeft<=50);
    },1000);
    updateHUD();
}

function updateHUD(){
    document.getElementById('hud-lives').textContent=Array(Math.max(0,save.lives)+1).join('\u2665');
    document.getElementById('hud-score').textContent='SCORE: '+String(score).padStart(6,'0');
    document.getElementById('hud-coins').textContent='COINS: '+String(save.coins).padStart(2,'0');
    document.getElementById('hud-time').textContent='TIME: '+timeLeft;
    document.getElementById('hud-time').classList.toggle('warning',timeLeft<=50);
}

function playerDie(){
    if(player.dead)return;
    player.dead=true;
    save.lives--;
    if(save.lives<=0){
        clearInterval(timerInterval);
        setTimeout(function(){state='gameOver';showScreen('game-over-screen');save.lives=3;writeSave();},1500);
    } else {
        writeSave();
        setTimeout(function(){startLevel();},1500);
    }
}

function completeLevel(){
    clearInterval(timerInterval);
    state='levelComplete';
    var lv=LEVELS[currentLevel];
    var lvId=lv.name;
    if(!save.completedLevels.includes(lvId))save.completedLevels.push(lvId);
    score+=timeLeft*50;
    var worldLevels=LEVELS.filter(function(l){return l.world===currentWorld;});
    var allCleared=true;
    worldLevels.forEach(function(l){if(!save.completedLevels.includes(l.name))allCleared=false;});
    writeSave();
    document.getElementById('complete-stats').innerHTML='<div>SCORE: '+score+'</div><div>TIME BONUS: '+(timeLeft*50)+'</div>';
    if(allCleared){
        if(!save.unlockedWorlds.includes(currentWorld+1)&&currentWorld<3){
            save.unlockedWorlds.push(currentWorld+1);
            writeSave();
        }
        document.getElementById('level-complete-screen').querySelector('h2').textContent='WORLD '+currentWorld+' COMPLETE!';
        document.getElementById('btn-next-level').textContent='CONTINUE';
        document.getElementById('btn-next-level').onclick=function(){buildWorldSelect();};
    } else {
        document.getElementById('level-complete-screen').querySelector('h2').textContent='LEVEL COMPLETE!';
        document.getElementById('btn-next-level').textContent='NEXT LEVEL';
        document.getElementById('btn-next-level').onclick=function(){
            var nextIdx=currentLevel+1;
            if(nextIdx<LEVELS.length&&LEVELS[nextIdx].world===currentWorld){
                currentLevel=nextIdx;
                startLevel();
            } else {
                buildWorldSelect();
            }
        };
    }
    showScreen('level-complete-screen');
}

function update(){
    if(state!=='playing'||player.dead)return;
    var speed=PLAYER_SPEED;
    if(keys['ShiftLeft']||keys['ShiftRight'])speed=RUN_SPEED;
    player.vx=0;
    if(keys['ArrowLeft']||keys['a']||mobileState.left){player.vx=-speed;player.face=-1;}
    if(keys['ArrowRight']||keys['d']||mobileState.right){player.vx=speed;player.face=1;}
    if((keys['ArrowUp']||keys['w']||keys[' ']||mobileState.jump)&&player.grounded&&!jumpPressed){
        player.vy=JUMP_FORCE;player.grounded=false;jumpPressed=true;
        AudioManager.play('jump');
    }
    if(!keys['ArrowUp']&&!keys['w']&&!keys[' ']&&!mobileState.jump)jumpPressed=false;
    player.vy+=GRAVITY;
    if(player.vy>MAX_FALL)player.vy=MAX_FALL;
    player.x+=player.vx;
    resolveCollisionX();
    player.y+=player.vy;
    resolveCollisionY();
    if(player.y>H+50){playerDie();return;}
    if(player.x<0)player.x=0;
    if(player.x<cam.x)cam.x=player.x-100;
    var levelWidth=levelData.width*TILE;
    if(player.x>cam.x+W-100)cam.x=player.x-W+100;
    if(cam.x<0)cam.x=0;
    if(cam.x>levelWidth-W)cam.x=levelWidth-W;
    if(invTimer>0)invTimer--;
    if(starTimer>0)starTimer--;
    enemies.forEach(function(e){
        if(!e.alive)return;
        if(e.type==='walker'){
            e.x+=e.vx;
            var leftTile=getBlockAt(e.x,e.y+e.h+1);
            var rightTile=getBlockAt(e.x+e.w,e.y+e.h+1);
            var leftWall=getBlockAt(e.x-2,e.y+e.h/2);
            var rightWall=getBlockAt(e.x+e.w+2,e.y+e.h/2);
            if(!leftTile||!rightTile)e.vx*=-1;
            if(leftWall&&leftWall.solid)e.vx=Math.abs(e.vx);
            if(rightWall&&rightWall.solid)e.vx=-Math.abs(e.vx);
            e.y+=e.vy;e.vy+=GRAVITY;if(e.vy>MAX_FALL)e.vy=MAX_FALL;
            var ground=getBlockAt(e.x+e.w/2,e.y+e.h+1);
            if(ground&&ground.solid){e.y=ground.y-e.h;e.vy=0;}
        } else if(e.type==='flyer'){
            e.flyT+=0.03;
            e.x+=Math.sin(e.flyT)*1.5;
            e.y=e.flyY+Math.cos(e.flyT*1.3)*25;
        }
        if(e.alive&&rectOverlap(player.x,player.y,player.w,player.h,e.x,e.y,e.w,e.h)){
            if(starTimer>0){e.alive=false;score+=200;AudioManager.play('stomp');spawnParticles(e.x+e.w/2,e.y+e.h/2,'#ff0');return;}
            if(player.vy>0&&player.y+player.h-e.y<18){
                e.alive=false;player.vy=BOUNCE;score+=200;AudioManager.play('stomp');
                spawnParticles(e.x+e.w/2,e.y+e.h/2,'#ff0');
            } else {
                if(invTimer<=0)playerHit();
            }
        }
    });
    coins.forEach(function(c){
        if(c.collected)return;
        c.bobT+=0.06;
        var cy=c.y+Math.sin(c.bobT)*3;
        if(rectOverlap(player.x,player.y,player.w,player.h,c.x,cy,c.w,c.h)){
            c.collected=true;save.coins++;score+=100;AudioManager.play('coin');
            if(save.coins%100===0){save.lives++;AudioManager.play('oneUp');}
            updateHUD();
        }
    });
    powerups.forEach(function(p){
        if(p.collected)return;
        p.x+=p.vx;
        var g=getBlockAt(p.x+p.w/2,p.y+p.h+2);
        if(g&&g.solid){p.y=g.y-p.h;p.vy=0;}else{p.vy+=GRAVITY;p.y+=p.vy;}
        if(rectOverlap(player.x,player.y,player.w,player.h,p.x,p.y,p.w,p.h)){
            p.collected=true;
            if(p.type==='mushroom'&&!player.big){player.big=true;player.h=48;player.y-=16;}
            else if(p.type==='fire'){player.big=true;player.fire=true;player.h=48;player.y-=16;}
            else if(p.type==='star'){starTimer=600;}
            score+=500;AudioManager.play('powerUp');
        }
    });
    checkpoints.forEach(function(cp){
        if(!cp.reached&&rectOverlap(player.x,player.y,player.w,player.h,cp.x,cp.y,cp.w,cp.h)){
            cp.reached=true;AudioManager.play('checkpoint');
        }
    });
    if(player.x+player.w>=goalX-8&&player.x<=goalX+24){
        completeLevel();
    }
    blocks.forEach(function(b){
        if(b.type==='question'&&!b.hit&&player.vy<0){
            var px=player.x+player.w/2, py=player.y;
            if(px>b.x&&px<b.x+b.w&&py<=b.y+b.h&&py>=b.y-4){
                b.hit=true;b.type='empty';
                AudioManager.play('blockHit');
                if(b.content==='coin'){save.coins++;score+=100;AudioManager.play('coin');updateHUD();}
                else if(b.content==='mushroom'){powerups.push({x:b.x,y:b.y-TILE,w:28,h:28,type:'mushroom',vx:2,vy:0,collected:false});}
                else if(b.content==='fire'){powerups.push({x:b.x,y:b.y-TILE,w:28,h:28,type:'fire',vx:2,vy:0,collected:false});}
                else if(b.content==='star'){powerups.push({x:b.x,y:b.y-TILE,w:28,h:28,type:'star',vx:2,vy:0,collected:false});}
                spawnParticles(b.x+TILE/2,b.y,'rgba(255,200,0,0.8)');
            }
        }
    });
    updateParticles();
    updateHUD();
}

function playerHit(){
    if(invTimer>0||starTimer>0)return;
    if(player.big){player.big=false;player.fire=false;player.h=32;invTimer=120;AudioManager.play('damage');}
    else{playerDie();}
}

function getBlockAt(x,y){
    for(var i=0;i<blocks.length;i++){
        var b=blocks[i];
        if(b.solid&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)return b;
    }
    return null;
}

function resolveCollisionX(){
    for(var i=0;i<blocks.length;i++){
        var b=blocks[i];
        if(!b.solid)continue;
        if(rectOverlap(player.x,player.y,player.w,player.h,b.x,b.y,b.w,b.h)){
            if(player.vx>0)player.x=b.x-player.w;
            else if(player.vx<0)player.x=b.x+b.w;
            player.vx=0;
        }
    }
}

function resolveCollisionY(){
    player.grounded=false;
    for(var i=0;i<blocks.length;i++){
        var b=blocks[i];
        if(!b.solid)continue;
        if(rectOverlap(player.x,player.y,player.w,player.h,b.x,b.y,b.w,b.h)){
            if(player.vy>0){player.y=b.y-player.h;player.vy=0;player.grounded=true;}
            else if(player.vy<0){player.y=b.y+b.h;player.vy=0;}
        }
    }
}

function rectOverlap(ax,ay,aw,ah,bx,by,bw,bh){
    return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;
}

function spawnParticles(x,y,color){
    for(var i=0;i<6;i++){
        particles.push({x:x,y:y,vx:(Math.random()-0.5)*4,vy:-Math.random()*3-1,life:20+Math.random()*10,color:color,size:3+Math.random()*3});
    }
}

function updateParticles(){
    for(var i=particles.length-1;i>=0;i--){
        var p=particles[i];
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;p.life--;
        if(p.life<=0)particles.splice(i,1);
    }
}

function render(){
    ctx.clearRect(0,0,W,H);
    if(state!=='playing')return;
    ctx.save();
    ctx.translate(-cam.x,0);
    drawBackground();
    drawBlocks();
    drawCoins();
    drawPowerups();
    drawCheckpoints();
    drawGoal();
    drawEnemies();
    drawPlayer();
    drawParticles();
    ctx.restore();
}

function drawBackground(){
    if(!levelData)return;
    if(levelData.bg==='underground'){
        ctx.fillStyle='#1a0a2e';ctx.fillRect(cam.x,0,W,H);
        ctx.fillStyle='#2a1040';
        for(var x=Math.floor(cam.x/TILE)*TILE;x<cam.x+W+TILE;x+=TILE*3){
            ctx.fillRect(x,0,TILE/2,40+Math.sin(x*0.1)*15);
        }
    } else {
        var skyGrad=ctx.createLinearGradient(0,0,0,H-TILE);
        skyGrad.addColorStop(0,'#5c94fc');skyGrad.addColorStop(1,'#87ceeb');
        ctx.fillStyle=skyGrad;ctx.fillRect(cam.x,0,W,H-TILE);
        ctx.fillStyle='#3a8a3a';
        for(var x=Math.floor(cam.x/200)*200-100;x<cam.x+W+200;x+=200){
            ctx.beginPath();ctx.moveTo(x,H-TILE);ctx.lineTo(x+50,H-TILE-60);ctx.lineTo(x+100,H-TILE);ctx.fill();
            ctx.beginPath();ctx.moveTo(x+80,H-TILE);ctx.lineTo(x+120,H-TILE-40);ctx.lineTo(x+160,H-TILE);ctx.fill();
        }
        ctx.fillStyle='#8BC34A';
        for(var x=Math.floor(cam.x/120)*120-60;x<cam.x+W+120;x+=120){
            ctx.beginPath();ctx.arc(x+30,H-TILE-5,20,Math.PI,0);ctx.fill();
            ctx.beginPath();ctx.arc(x+50,H-TILE-8,15,Math.PI,0);ctx.fill();
        }
        ctx.fillStyle='#fff';
        for(var x=Math.floor(cam.x/300)*300;x<cam.x+W+300;x+=300){
            ctx.beginPath();ctx.arc(x+20,60,18,0,Math.PI*2);ctx.arc(x+38,55,14,0,Math.PI*2);ctx.arc(x+50,60,12,0,Math.PI*2);ctx.fill();
        }
    }
    ctx.fillStyle='#8B4513';
    ctx.fillRect(cam.x,H-TILE,W,TILE);
    ctx.fillStyle='#6B3410';
    for(var x=Math.floor(cam.x/TILE)*TILE;x<cam.x+W+TILE;x+=TILE){
        ctx.fillRect(x,H-TILE,TILE,2);
    }
}

function drawBlocks(){
    blocks.forEach(function(b){
        if(b.x+b.w<cam.x-TILE||b.x>cam.x+W+TILE)return;
        if(b.type==='ground'){
            ctx.fillStyle='#8B4513';ctx.fillRect(b.x,b.y,b.w,b.h);
            ctx.fillStyle='#6B3410';ctx.fillRect(b.x,b.y,b.w,3);
        } else if(b.type==='platform'){
            ctx.fillStyle='#996633';ctx.fillRect(b.x,b.y,b.w,b.h);
            ctx.fillStyle='#775522';ctx.fillRect(b.x,b.y,b.w,3);
        } else if(b.type==='question'){
            ctx.fillStyle='#FFB900';ctx.fillRect(b.x,b.y,b.w,b.h);
            ctx.strokeStyle='#CC8800';ctx.lineWidth=2;ctx.strokeRect(b.x+1,b.y+1,b.w-2,b.h-2);
            ctx.fillStyle='#fff';ctx.font='bold 18px Arial';ctx.textAlign='center';
            ctx.fillText('?',b.x+b.w/2,b.y+b.h/2+6);
        } else if(b.type==='brick'){
            ctx.fillStyle='#CC5500';ctx.fillRect(b.x,b.y,b.w,b.h);
            ctx.strokeStyle='#993300';ctx.lineWidth=1;ctx.strokeRect(b.x+1,b.y+1,b.w-2,b.h-2);
            ctx.beginPath();ctx.moveTo(b.x,b.y+b.h/2);ctx.lineTo(b.x+b.w,b.y+b.h/2);ctx.stroke();
            ctx.beginPath();ctx.moveTo(b.x+b.w/2,b.y);ctx.lineTo(b.x+b.w/2,b.y+b.h/2);ctx.stroke();
        } else if(b.type==='empty'){
            ctx.fillStyle='#886633';ctx.fillRect(b.x,b.y,b.w,b.h);
            ctx.strokeStyle='#664422';ctx.lineWidth=1;ctx.strokeRect(b.x+1,b.y+1,b.w-2,b.h-2);
        }
    });
}

function drawCoins(){
    coins.forEach(function(c){
        if(c.collected)return;
        if(c.x+c.w<cam.x-TILE||c.x>cam.x+W+TILE)return;
        var cy=c.y+Math.sin(c.bobT)*3;
        ctx.fillStyle='#FFD700';
        ctx.beginPath();ctx.ellipse(c.x+c.w/2,cy+c.h/2,c.w/2,c.h/2,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#FFA000';
        ctx.beginPath();ctx.ellipse(c.x+c.w/2,cy+c.h/2,c.w/3,c.h/3,0,0,Math.PI*2);ctx.fill();
    });
}

function drawPowerups(){
    powerups.forEach(function(p){
        if(p.collected)return;
        if(p.x+p.w<cam.x-TILE||p.x>cam.x+W+TILE)return;
        if(p.type==='mushroom'){
            ctx.fillStyle='#e52521';ctx.beginPath();ctx.arc(p.x+p.w/2,p.y+8,14,Math.PI,0);ctx.fill();
            ctx.fillStyle='#f5deb3';ctx.fillRect(p.x+4,p.y+10,p.w-8,p.h-10);
        } else if(p.type==='fire'){
            ctx.fillStyle='#ff6600';ctx.fillRect(p.x+2,p.y+4,p.w-4,p.h-4);
            ctx.fillStyle='#ffcc00';ctx.fillRect(p.x+6,p.y+8,p.w-12,p.h-12);
        } else if(p.type==='star'){
            ctx.fillStyle='#FFD700';
            ctx.beginPath();
            for(var i=0;i<5;i++){
                var a=i*Math.PI*2/5-Math.PI/2;
                var r=i%2===0?14:7;
                if(i===0)ctx.moveTo(p.x+p.w/2+Math.cos(a)*r,p.y+p.h/2+Math.sin(a)*r);
                else ctx.lineTo(p.x+p.w/2+Math.cos(a)*r,p.y+p.h/2+Math.sin(a)*r);
            }
            ctx.closePath();ctx.fill();
        }
    });
}

function drawCheckpoints(){
    checkpoints.forEach(function(cp){
        if(cp.x+cp.w<cam.x-TILE||cp.x>cam.x+W+TILE)return;
        ctx.fillStyle=cp.reached?'#44ff44':'#888';
        ctx.fillRect(cp.x,cp.y,cp.w,cp.h);
        ctx.fillStyle=cp.reached?'#22cc22':'#666';
        ctx.beginPath();ctx.arc(cp.x+cp.w/2,cp.y,8,0,Math.PI*2);ctx.fill();
    });
}

function drawGoal(){
    if(goalX<cam.x-TILE||goalX>cam.x+W+TILE)return;
    ctx.fillStyle='#888';ctx.fillRect(goalX,H-TILE-160,6,160);
    ctx.fillStyle='#fff';ctx.fillRect(goalX+6,H-TILE-160,30,20);
    ctx.fillStyle='#e52521';ctx.fillRect(goalX+6,H-TILE-140,30,20);
}

function drawEnemies(){
    enemies.forEach(function(e){
        if(!e.alive)return;
        if(e.x+e.w<cam.x-TILE||e.x>cam.x+W+TILE)return;
        if(e.type==='walker'){
            ctx.fillStyle='#8B4513';ctx.fillRect(e.x,e.y,e.w,e.h);
            ctx.fillStyle='#fff';ctx.fillRect(e.x+6,e.y+6,7,7);ctx.fillRect(e.x+15,e.y+6,7,7);
            ctx.fillStyle='#000';
            var ex=e.vx<0?8:15;
            ctx.fillRect(e.x+ex,e.y+8,4,4);
            ctx.fillStyle='#cc0000';
            ctx.fillRect(e.x+2,e.y+e.h-8,10,6);ctx.fillRect(e.x+e.w-12,e.y+e.h-8,10,6);
        } else if(e.type==='flyer'){
            ctx.fillStyle='#9933cc';ctx.fillRect(e.x+4,e.y,e.w-8,e.h);
            ctx.fillStyle='#cc66ff';
            ctx.fillRect(e.x,e.y+4,8,e.h-8);ctx.fillRect(e.x+e.w-8,e.y+4,8,e.h-8);
            ctx.fillStyle='#fff';ctx.fillRect(e.x+10,e.y+6,5,5);ctx.fillRect(e.x+16,e.y+6,5,5);
            ctx.fillStyle='#ff0';
            ctx.fillRect(e.x+11,e.y+7,3,3);ctx.fillRect(e.x+17,e.y+7,3,3);
        }
    });
}

function drawPlayer(){
    if(player.dead)return;
    if(invTimer>0&&Math.floor(invTimer/3)%2===0)return;
    ctx.save();
    ctx.translate(player.x+player.w/2,player.y);
    ctx.scale(player.face,1);
    ctx.translate(-player.w/2,0);
    if(starTimer>0){
        var hue=(Date.now()/30)%360;
        ctx.fillStyle='hsl('+hue+',100%,50%)';
    } else if(player.big){
        ctx.fillStyle=player.fire?'#fff':'#e52521';
    } else {
        ctx.fillStyle='#e52521';
    }
    ctx.fillRect(4,0,player.w-8,player.h);
    ctx.fillStyle='#f5deb3';
    ctx.fillRect(6,2,player.w-12,12);
    ctx.fillStyle='#000';
    ctx.fillRect(8,5,4,4);ctx.fillRect(player.w-12,5,4,4);
    ctx.fillStyle=player.big?'#8B4513':'#654321';
    ctx.fillRect(2,0,player.w-4,4);
    if(player.big){
        ctx.fillStyle='#fff';ctx.fillRect(8,18,14,10);
        ctx.fillStyle=player.fire?'#ff6600':'#e52521';
        ctx.fillRect(10,20,10,6);
    }
    ctx.restore();
}

function drawParticles(){
    particles.forEach(function(p){
        ctx.globalAlpha=p.life/30;
        ctx.fillStyle=p.color;
        ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
    });
    ctx.globalAlpha=1;
}

document.addEventListener('keydown',function(e){
    keys[e.key]=true;
    if(e.key==='Escape'||e.key==='p'||e.key==='P'){
        if(state==='playing'){
            state='paused';
            showScreen('pause-screen');
        } else if(state==='paused'){
            state='playing';
            document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
            document.getElementById('hud').classList.add('active');
            document.getElementById('pause-btn').classList.add('active');
        }
    }
    if(e.key==='ArrowUp'||e.key==='w'||e.key===' '){
        e.preventDefault();
        if(state==='worldSelect')buildWorldSelect();
    }
});
document.addEventListener('keyup',function(e){keys[e.key]=false;});

document.getElementById('btn-resume').onclick=function(){
    state='playing';
    document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
    document.getElementById('hud').classList.add('active');
    document.getElementById('pause-btn').classList.add('active');
};
document.getElementById('btn-restart').onclick=function(){startLevel();};
document.getElementById('btn-quit').onclick=function(){clearInterval(timerInterval);buildWorldSelect();};
document.getElementById('btn-retry').onclick=function(){save.lives=3;writeSave();buildWorldSelect();};
document.getElementById('btn-gameover-menu').onclick=function(){save.lives=3;writeSave();buildWorldSelect();};
document.getElementById('btn-timeup-retry').onclick=function(){startLevel();};
document.getElementById('btn-timeup-menu').onclick=function(){buildWorldSelect();};
document.getElementById('pause-btn').onclick=function(){
    if(state==='playing'){state='paused';showScreen('pause-screen');}
};

var mcL=document.getElementById('mobile-left');
var mcR=document.getElementById('mobile-right');
var mcJ=document.getElementById('mobile-jump');
if(mcL){
    mcL.addEventListener('touchstart',function(e){e.preventDefault();mobileState.left=true;},{passive:false});
    mcL.addEventListener('touchend',function(e){e.preventDefault();mobileState.left=false;},{passive:false});
    mcR.addEventListener('touchstart',function(e){e.preventDefault();mobileState.right=true;},{passive:false});
    mcR.addEventListener('touchend',function(e){e.preventDefault();mobileState.right=false;},{passive:false});
    mcJ.addEventListener('touchstart',function(e){e.preventDefault();mobileState.jump=true;},{passive:false});
    mcJ.addEventListener('touchend',function(e){e.preventDefault();mobileState.jump=false;},{passive:false});
}

function gameLoop(){
    update();
    render();
    requestAnimationFrame(gameLoop);
}

AudioManager.init();
AudioManager.playStartup();
buildWorldSelect();
gameLoop();
})();
