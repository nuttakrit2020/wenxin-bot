const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

const TOKEN = 'hGJBTfJY2kjdnv3Gr/eUpf5mdsmVams1M6J8PbypDP/zyFYd7mJTTwrSKEKNJsrQnWQ3y/8gDBWMh6tollCAOs0PxiudGqyygfK2r80fWUumulO8S6aW4xHs0OGZBD2HFRGe8gOHWwEC1Zg6D0lXkgdB04t89/1O/w1cDnyilFU=';
const IMAGE_OUT = path.join(__dirname, 'cute_menu_v2.jpg');
const BG_IMAGE_PATH = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\7fd3ac5a-bfd1-49e9-a65d-bb41e3ca73fc\\cute_chinese_bg_1783045363507.png';
const FONT_PATH = path.join(__dirname, 'Kanit-Bold.ttf');

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

async function run() {
  try {
    if (fs.existsSync(FONT_PATH)) {
      registerFont(FONT_PATH, { family: 'Kanit' });
    }

    console.log('1. Loading beautiful background...');
    const bgImg = await loadImage(BG_IMAGE_PATH);
    
    const width = 2500;
    const height = 1686;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw background image stretched to fit
    ctx.drawImage(bgImg, 0, 0, width, height);

    // Box dimensions
    const boxW = 720;
    const boxH = 680;
    const radius = 50;
    
    const columns = [
      (833 / 2) - (boxW / 2),
      833 + (833 / 2) - (boxW / 2),
      1666 + (834 / 2) - (boxW / 2)
    ];
    
    const rows = [
      (843 / 2) - (boxH / 2),
      843 + (843 / 2) - (boxH / 2)
    ];

    const areas = [
      { text: "🔮 ดูดวง", sub: "ทำนายชะตา", x: columns[0], y: rows[0] },
      { text: "🎯 ทอยเต๋า", sub: "เสี่ยงดวง", x: columns[1], y: rows[0] },
      { text: "✊ เป่ายิ้งฉุบ", sub: "วัดใจกัน", x: columns[2], y: rows[0] },
      { text: "🧩 เล่นเกม", sub: "ทายปริศนา", x: columns[0], y: rows[1] },
      { text: "💕 ความสนิท", sub: "จวนคุณหนู", x: columns[1], y: rows[1] },
      { text: "📖 เล่าเรื่อง", sub: "ท่องยุทธภพ", x: columns[2], y: rows[1] }
    ];

    for (const a of areas) {
      // Draw Box with semi-transparent white so background shows through
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)'; // Metallic gold border
      ctx.lineWidth = 15;
      roundRect(ctx, a.x, a.y, boxW, boxH, radius, true, true);

      // Draw Main Text
      ctx.font = 'bold 110px Kanit, Tahoma, sans-serif';
      ctx.fillStyle = '#C0392B'; // Deep elegant red
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const centerX = a.x + (boxW / 2);
      const centerY = a.y + (boxH / 2) - 40;
      
      ctx.fillText(a.text, centerX, centerY);
      
      // Draw Sub Title
      ctx.font = '60px Kanit, Tahoma, sans-serif';
      ctx.fillStyle = '#E67E22'; // Elegant orange/gold
      ctx.fillText(a.sub, centerX, centerY + 120);
    }

    console.log('2. Saving new image...');
    const out = fs.createWriteStream(IMAGE_OUT);
    const stream = canvas.createJPEGStream({ quality: 0.85 });
    stream.pipe(out);
    await new Promise(res => out.on('finish', res));

    console.log('3. Creating new Rich Menu object...');
    const menuConfig = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: "Beautiful Xinyan Menu",
      chatBarText: "เมนูของซินเหยียน",
      areas: [
        { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: "message", text: "ดูดวง" } },
        { bounds: { x: 833, y: 0, width: 833, height: 843 }, action: { type: "message", text: "ทอยเต๋า" } },
        { bounds: { x: 1666, y: 0, width: 834, height: 843 }, action: { type: "message", text: "เป่ายิ้งฉุบ" } },
        { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: "message", text: "เล่นเกม" } },
        { bounds: { x: 833, y: 843, width: 833, height: 843 }, action: { type: "message", text: "ความสนิท" } },
        { bounds: { x: 1666, y: 843, width: 834, height: 843 }, action: { type: "message", text: "เล่าเรื่อง" } }
      ]
    };
    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    };
    const createRes = await axios.post('https://api.line.me/v2/bot/richmenu', menuConfig, { headers });
    const richMenuId = createRes.data.richMenuId;
    
    console.log('4. Uploading new image...');
    const imageBuffer = fs.readFileSync(IMAGE_OUT);
    await axios.post(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, imageBuffer, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'image/jpeg'
      }
    });

    console.log('5. Setting as default menu...');
    await axios.post(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {}, { headers });
    console.log('Done! Beautiful menu is now active.');

  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error(err.response.data);
  }
}

run();
