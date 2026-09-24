const dense_ascii = '@#S%?*+;:,. ';
const sparse_ascii = '@#* . ';

const palette = [
  { name:'MATRIX', fg:[0,255,65],glow:'rgba(0,255,65,{a})' }
];

let density = 0;
let characterSize = 9;
let glowBar = 6;
let typedChars = [];
let  keystrokeFlash = 0;

const exposureCategory = ['IDENTITY','LOCATION','FINANCIAL','BEHAVIOURAL','BIOMETRIC'];
let exposures = {};
exposureCategory.forEach(c =>  exposures[c] = 0);

let p5sketch = null;

//clock
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =now.toTimeString().slice(0,8)+ ' UTC+' +(-now.getTimezoneOffset()/60) ;
}
setInterval(updateClock, 1000);
updateClock() ;

// build exposure bars  (formed in html)
(function buildExposure(){
  const wrap = document.getElementById('exposure-wrap');
  exposureCategory.forEach(category => {
    const row =  document.createElement('div');
    row.className= 'exp-row';
    row.innerHTML = `<span class="exp-label">${category}</span><div class="exp-bar-bg"><div class="exp-bar-fill" id="exp-${category}" style="width:0%"></div></div>  `;
    wrap.appendChild(row);
  });
})();

//fill out each category if there is:
const triggerWords= {
  IDENTITY: ['name', 'fullname','firstname','lastname','middlename','nickname','ppsn', 'age','gender','sex','pronoun','email','mail','phone','mobile','telephone','dob','birthdate','birthday','born','nationality','citizenship','ethnicity',
    'passport',  'passportno','id','identifier','userid','username','handle','ssn','nin','taxid','driverlicense','license','studentid','employeeid','marital','relationship','title','mr','mrs','ms','children','wife','husband', 'married', 'orientation', 'job',
  'hobby', 'education', 'divorced'  ],
  LOCATION: ['city', 'town','village','country','nation','state','county','province','address','homeaddress','workaddress','postcode','zipcode','zip','postal',
    'street','road','avenue','lane','drive','boulevard','apartment','unit', 'building','floor','region','district','territory','area','zone','lat','latitude','lon','longitude','coordinates','geo','geolocation',
    'location','place','home','residence','live','resident','neighbourhood','currentlocation','hometown','origin','nearby','map'],
  FINANCIAL: ['card','creditcard','debitcard','bank','bankaccount','iban','swift','routing','sortcode','accountnumber','payment','transaction',
    'purchase',  'purchased','bought','sold','invoice','billing','checkout','salary','income','wage','earnings','revenue','bonus','compensation','tax','refund','loan','mortgage','debt','balance','funds','wealth','paypal','cashapp','stripe','wallet','crypto','bitcoin','ethereum', 'investment','stocks','shares','insurance','receipt','order'],
  BEHAVIOURAL: [ 'visit','visited','browser','browsing','history','search', 'searched','query','click','clicked','tap','scroll','hover','view','views',
    'watch','watched','listen','listened','stream','streamed','play','played','download','upload','opened','read','reading','engagement','activity',
    'login','logout', 'signin','signup','session','usage','interaction', 'instagram','tiktok','youtube','facebook','reddit','twitter','x.com',
    'linkedin', 'snapchat','pinterest','spotify','netflix','amazon','google','shop','shopping','cart','wishlist','preference','preferences',
    'interest', 'interests','like','liked','dislike','follow',   'subscribe', 'rating','review','favorite','bookmark'],
  BIOMETRIC: ['height' ,'weight','bmi','bodytype','fitness','health','medical','illness','disease','condition','diagnosis','medication','prescription','treatment',
    'dna','genetic', 'genetics','genome','blood','bloodtype','pulse','heartrate','temperature','face','facial','fingerprint','thumbprint','retina','iris',
    'voice','eye','eyes','hair',  'skin','complexion','photo','image','selfie','scan','biometric','disability','mental','allergy','injury'],
};

//read text and fill exposure bars
function updateExposure(text){
 const lower = text.toLowerCase(); //if typed email, EMAIL, Email- will be detected anyways
 exposureCategory.forEach(category => {
   const hits  = triggerWords[category].filter(kw => lower.includes(kw)).length;
   const percentage = Math.min(100, hits * 22);
   exposures[category] = percentage;
   const element = document.getElementById('exp-'+category) ;
   if(element)  element.style.width = percentage + '%';
  });
}

//  'transmitted data log', cpaturing what user types in -
const dataLog = document.getElementById('data-log');
let lastLogText = '';
function appendLog(text){
 if(text === lastLogText) return ;
 lastLogText = text; //to avoid spamming if input text is same
 const entry = document.createElement('div');
 entry.className = 'log-entry';
 const timestamp= new Date().toTimeString().slice(0,8); //HH:MM:SS timestamp
 entry.innerHTML = `<span class="timestamp">[${timestamp}]</span><span class="text">${escHtml(text.slice(-80))}</span>`;
 dataLog.appendChild(entry);
 dataLog.scrollTop = dataLog.scrollHeight;
 if (dataLog.children.length > 60) dataLog.removeChild(dataLog.firstChild);
}
 function escHtml(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); } //prevent typed text being accidentaly read as html


// for render style panel (two sliders for size and glow)
document.getElementById('controlSize').addEventListener('input', e => {
  characterSize = parseInt(e.target.value);
  document.getElementById('val-size').textContent = characterSize;
  if(p5sketch) p5sketch.setCharacterSize(characterSize);
});

document.getElementById('controlGlow').addEventListener('input', e => {
  glowBar = parseInt(e.target.value);
  document.getElementById('val-glow').textContent= glowBar;
});


//text input --> density
const textarea = document.getElementById('data-input');
const charactersMaximum = 150; //amount required to fully fill person`s digital portarit 

textarea.addEventListener('input', () => {
  const text = textarea.value;
  const lengthText = Math.min(text.length, charactersMaximum);
  density = lengthText/charactersMaximum;

  typedChars = text.replace(/\s+/g,' ').split('').filter(c => c.trim().length > 0); //split typed it text into individual characters, wove into ASCII symbols

  const percentage = Math.round(density * 100);
  document.getElementById('density-bar-fill').style.width = percentage+ '%';
  document.getElementById('density-val').textContent = percentage+ '%';
  document.getElementById('density-percentage').textContent =percentage+ '%';

  updateExposure(text);
  if(text.trim().length > 0) appendLog(text);

  keystrokeFlash = 1.0;

  //show these depending on how exposed digital portarit is 
  const warning = document.getElementById('warn-text');
  warning.textContent = density > 0.6
    ? '[!!!] CRITICAL EXPOSURE THRESHOLD'
    : density > 0.3
    ? '[!!] PROFILE ASSEMBLING'
    : '[!] DATA COLLECTION IN PROGRESS';
});

// p5 sketch
new p5(function(sketch){
  p5sketch = sketch;

  let capture;
  let columns, rows;
  let cs = characterSize;
  let acquiringDiv = document.getElementById('acquiring'); //INITIATING CAPTURE text before camera is allowed
  let canvasReady = false;
  let noise;// p5.sound library noise
  let noiseStarted = false;

  // Characters ordered from densest  to sparsest  for accurate brightness mapping
  const ascii = '@#%&WB8$0/|(){}[]?-_+~<>!;:,. ';

  let hoverColumn = -1, hoverRow = -1;
  let cellCat = [];
  let columnsMax = 0;

  const categoryColors = {  //when hover over symbol of digital portrait
    IDENTITY:[255, 80,80],
    LOCATION:[80,180, 255],
    FINANCIAL:[255, 200, 0],
    BEHAVIOURAL: [0,255, 160],
    BIOMETRIC: [255, 80, 220],
    NONE: [180, 180,180],
  };

  //what exposure category the symbol will be tagged with depending on category is activ (on digital portarit when user hovers over symbol)
  function getCatForTypedIdx(idx){
    if(typedChars.length === 0) return 'NONE';
    const cats =exposureCategory.filter(c => exposures[c] > 0);
    if(cats.length === 0) return 'NONE';
    return cats[idx % cats.length];
  }

//when sketch starts, create canvas, request camera access, etc 
  sketch.preload = function(){};
  sketch.setup = function(){
    const wrap = document.getElementById('canvas-wrap');
    const canvas = sketch.createCanvas(wrap.clientWidth, wrap.clientHeight);
    canvas.parent('canvas-wrap');
    sketch.textFont('Share Tech Mono, monospace');
    sketch.textSize(cs);
    sketch.textAlign(sketch.LEFT, sketch.TOP);

    capture = sketch.createCapture({ video: { width: 1280, height: 720, facingMode: 'user' } }, ()=>{  //request webcam access at HD resolution
      acquiringDiv.style.display = 'none';
      canvasReady = true;
    });

    capture.hide();
    capture.elt.onerror= () => {
      acquiringDiv.innerHTML = `<div class="big" style="color:#ff2d2d">[ CAMERA DENIED ]</div> <div style="color:#ff2d2d">Enable camera access and reload.</div>`; //error handling
    };
    computeGrid();

    // p5js library sound,  brown noise
    noise = new p5.Noise('brown'); 
    noise.amp(0);
    noise.start();

    canvas.elt.addEventListener('mousemove', e => {
      const rect = canvas.elt.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      hoverColumn  = Math.floor(mouseX / cs);
      hoverRow = Math.floor(mouseY / (cs * 1.1));
    });
    canvas.elt.addEventListener('mouseleave', () => { hoverColumn = -1; hoverRow = -1; });
  };

  sketch.setCharacterSize = function(s){ //for when font size slider is used 
    cs = s;
    sketch.textSize(cs);
    computeGrid();    //recalculate to new size
  };

  function computeGrid(){  //recalculate
    columns = Math.floor(sketch.width / cs);
    rows = Math.floor(sketch.height / (cs * 1.1));
    columnsMax = columns;
    cellCat = new Array(rows * columns).fill('NONE' );
  }

  sketch.windowResized = function(){   //adaptability
    const wrap = document.getElementById('canvas-wrap');
    sketch.resizeCanvas(wrap.clientWidth, wrap.clientHeight);
    computeGrid();
  };

  // p5.sound requires a user gesture before audio can play
  sketch.mousePressed = function(){
    sketch.userStartAudio();
  };

  //sk.draw runs 60 time/sec and renders everything on screen 
  sketch.draw = function(){
    sketch.background(0);
    if(!canvasReady) return;

   const [r, g, b] = [0, 255, 65];
    const asciiLen = ascii.length;

    if(keystrokeFlash > 0) keystrokeFlash = Math.max(0, keystrokeFlash - 0.07); //flash effect decay when keys are pressed

    // update noise volume via p5.sound, greater density=greater noise
    if(noise) noise.amp(density * 0.04, 0.1);

    capture.loadPixels();
    if(!capture.pixels || capture.pixels.length === 0) return;

    const useTypedProb = density * 0.7;
    let typedIdx = 0;

    sketch.noStroke();

    if(keystrokeFlash > 0){        //screen flash effect when typing text in 
      sketch.fill(r, g, b, keystrokeFlash * 30);
      sketch.rect(0, 0, sketch.width, sketch.height);
    }
// go through every character position in grid one by one, left-right, top-bottom
    for(let row = 0; row < rows; row++){
      for(let col2 = 0; col2 < columns; col2++){
        const x = col2 * cs;
        const y = row * cs * 1.1;

 // Average multiple pixels per cell for smoother less noisy ascii output
        const cameraX0 = Math.floor(sketch.map(columns - 1 - col2, 0, columns, 0, capture.width)); // mirrored horizontally
        const cameraY0 = Math.floor(sketch.map(row, 0, rows, 0, capture.height));
        const cellW = Math.max(1, Math.floor(capture.width / columns));
        const cellH = Math.max(1, Math.floor(capture.height / rows));
        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        for(let sy = 0; sy < cellH; sy += Math.max(1, cellH >> 1)){
          for(let sx = 0; sx < cellW; sx += Math.max(1, cellW >> 1)){
            const px = Math.min(cameraX0 + sx, capture.width - 1);
            const py = Math.min(cameraY0 + sy, capture.height - 1);
            const idx = (py * capture.width + px) * 4;
            sumR += capture.pixels[idx]   || 0;
            sumG += capture.pixels[idx+1] || 0;
            sumB += capture.pixels[idx+2] || 0;
            count++;
          }
        }
        const pixR = sumR / count;
        const pixG = sumG / count;
        const pixB = sumB / count;

//brighenss and contrast -pixel's colour converted to a single brightness value between 0-1
        let bright = (pixR*0.299 + pixG*0.587 + pixB*0.114) / 255; // standard luma weights
        bright = Math.pow(bright, 0.7); //dark areas darker, bright brighter
        const contrast = 2.8;
        bright = sketch.constrain((bright - 0.45) * contrast + 0.45, 0, 1);
//which pixels are visible based on how much user types and pixels brightness
        const threshold = sketch.lerp(0.0, 0.92, density);
        if (bright > threshold) continue;
        if (bright < 0.05 || density < 0.01)  continue;

        //characters that create digital portrait
        let character;
        if(typedChars.length > 0 && Math.random() < useTypedProb){ //if smth is typed it appears on screen
          character = typedChars[typedIdx % typedChars.length];
          cellCat[row * columnsMax + col2] = getCatForTypedIdx(typedIdx) ;
          typedIdx++;
        } else {
          let asciiIdx = Math.floor(bright* (asciiLen - 1));  //otherwise pick a character from ascii symbols 
          asciiIdx = Math.floor(sketch.lerp(asciiLen - 2, asciiIdx, density));
          asciiIdx = sketch.constrain(asciiIdx, 0, asciiLen - 1);
          character = ascii[asciiIdx];
          cellCat[row*columnsMax + col2] = 'NONE';
        }

        if(character === ' ') continue;

// when hover on a symbol, the coloured exposure category (if was triggered in text box) appears
        const isHovered = (col2 === hoverColumn && row === hoverRow);
        const nearHover = hoverColumn >= 0 && Math.abs(col2 - hoverColumn) <= 3 && Math.abs(row - hoverRow) <= 2;
        const cat = cellCat[row*columnsMax + col2];

        let finalR = r, finalG2 = g, finalB = b;
        let alpha = sketch.map(density, 0, 1, 80, 240) * (1 - bright * 0.4); // portrait revealsas more typed

        const flicker = 1 - Math.random() * 0.12; //analog crt shimmer effect

        if(isHovered && cat !== 'NONE'){ //exposure categories on hover 
          [finalR, finalG2, finalB]  = categoryColors[cat];
          alpha = 255;
        }  else if(nearHover && cat !== 'NONE'){
          const cc = categoryColors[cat];
          finalR = sketch.lerp(r, cc[0], 0.5);
          finalG2 = sketch.lerp(g,cc[1], 0.5);
          finalB =sketch.lerp(b,cc[2], 0.5);
          alpha = Math.min(alpha * 1.4, 240);
        }

        if(keystrokeFlash > 0) alpha = Math.min(255, alpha + keystrokeFlash* 60);

        //glow effect, glow slide bar
       if(glowBar > 0){
          const glowAlpha = (glowBar / 20) * alpha * 0.4 * flicker;
          sketch.fill(finalR, finalG2, finalB, glowAlpha);
          sketch.textSize(cs + glowBar * 0.9);
          sketch.text(character, x - glowBar*0.45, y - glowBar*0.45);
          sketch.textSize(cs);
        }
        sketch.fill(finalR, finalG2, finalB, alpha * flicker);
        sketch.text(character, x, y);
      }
    }

    //draw black background box and coloured [...] label above if hovered
    if(hoverColumn >= 0 && hoverRow >= 0){
      const cat = cellCat[hoverRow * columnsMax + hoverColumn];
      if(cat !== 'NONE'){
        const tooltipX = hoverColumn * cs;
        const tooltipY = hoverRow* cs * 1.1;
        const cc = categoryColors[cat];
        const label  = '[ ' + cat + ' ]';
        sketch.textSize(10);
        sketch.fill(0, 0, 0, 180);
        sketch.rect(tooltipX  - 2, tooltipY - 16, label.length * 6.5, 14, 2);
        sketch.fill(cc[0], cc[1], cc[2], 230);
        sketch.text(label, tooltipX, tooltipY - 15);
        sketch.textSize(cs);
      }
    }

    //crt scan line effect
    const scanLine = (sketch.frameCount*2.5)% sketch.height;
    sketch.noFill ();
    sketch.stroke (r, g, b, 20 * density);
    sketch.strokeWeight(1.5);
    sketch.line(0, scanLine, sketch.width, scanLine);
    sketch.noStroke();

  };
});
