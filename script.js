const canvas = document.getElementById('spaceCanvas');
const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

// Star particles
const stars = [];
const starCount = 300;
for(let i=0;i<starCount;i++){
    stars.push({
        x: Math.random()*width,
        y: Math.random()*height,
        r: Math.random()*1.5,
        alpha: Math.random(),
        dx: (Math.random()-0.5)*0.2,
        dy: (Math.random()-0.5)*0.2
    });
}

// Black hole variables
let blackHoleRadius = 50;
let timer = 0;

// Draw stars
function drawStars(){
    for(let s of stars){
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
        s.x += s.dx;
        s.y += s.dy;
        if(s.x < 0) s.x = width;
        if(s.x > width) s.x = 0;
        if(s.y < 0) s.y = height;
        if(s.y > height) s.y = 0;
        s.alpha += (Math.random()-0.5)*0.02;
        if(s.alpha < 0) s.alpha = 0;
        if(s.alpha > 1) s.alpha = 1;
    }
}

// Draw black hole
function drawBlackHole(){
    const gradient = ctx.createRadialGradient(width/2,height/2,0,width/2,height/2,blackHoleRadius);
    gradient.addColorStop(0,'rgba(0,0,0,1)');
    gradient.addColorStop(0.6,'rgba(50,0,100,0.8)');
    gradient.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(width/2,height/2,blackHoleRadius,0,Math.PI*2);
    ctx.fillStyle = gradient;
    ctx.fill();
}

// Draw big bang explosion
function drawExplosion(){
    const maxRadius = 300;
    ctx.beginPath();
    const grad = ctx.createRadialGradient(width/2,height/2,0,width/2,height/2,maxRadius);
    grad.addColorStop(0,'rgba(255,255,255,1)');
    grad.addColorStop(0.2,'rgba(255,200,50,0.8)');
    grad.addColorStop(0.5,'rgba(255,0,50,0.4)');
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.arc(width/2,height/2,maxRadius,0,Math.PI*2);
    ctx.fillStyle = grad;
    ctx.fill();
}

// Animation loop
function animate(){
    ctx.clearRect(0,0,width,height);
    drawStars();

    timer += 1;

    if(timer < 300){
        blackHoleRadius = Math.min(blackHoleRadius+0.5, 80);
        drawBlackHole();
    } else if(timer >= 300 && timer < 420){
        drawExplosion();
    } else if(timer >= 420 && timer < 720){
        blackHoleRadius = Math.min(blackHoleRadius+0.3, 100);
        drawBlackHole();
    } else {
        timer = 0;
        blackHoleRadius = 50;
    }

    requestAnimationFrame(animate);
}

animate();
