const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

const TOKEN = 'SzwuMy3kHlG4Yg1Bp6Upe+oSrJxI4lO7egbbwnwpHpuSzK6S60eyVP1pXHbsElCiuhsKv7f1sL/mOQdArgyEw1dnPeRU9qh+P98OiAw/AhgyvSSPd4LcXlTUYmtKgTPV4ydToB0pxg6bRAwrZgH8BAdB04t89/1O/w1cDnyilFU=';
const IMAGE_OUT = path.join(__dirname, 'tutor_menu.jpg');
const BG_IMAGE_PATH = 'C:\\\\Users\\\\Administrator\\\\.gemini\\\\antigravity\\\\brain\\\\7fd3ac5a-bfd1-49e9-a65d-bb41e3ca73fc\\\\red_chinese_bg_1783064667432.png';
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

    // Box dimensions (3 columns, 2 rows)
    const boxW = 750;
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
      { text: "📖 คู่มือ", sub: "คำสั่งทั้งหมด", x: columns[0], y: rows[0] },
      { text: "🧠 ภาค ก", sub: "ความรู้ทั่วไป", x: columns[1], y: rows[0] },
      { text: "🏫 ภาค ข", sub: "วิชาการศึกษา", x: columns[2], y: rows[0] },
      { text: "🎯 วิชาเอก", sub: "สอบวิชาเอก", x: columns[0], y: rows[1] },
      { text: "👨‍🏫 สอนติว", sub: "สอนเนื้อหา", x: columns[1], y: rows[1] },
      { text: "📊 สถิติ", sub: "เช็คความพร้อม", x: columns[2], y: rows[1] }
    ];

    for (const a of areas) {
      // Draw Box with semi-transparent white so background shows through
      ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
      ctx.strokeStyle = 'rgba(192, 57, 43, 0.8)'; // Red border for tutor theme
      ctx.lineWidth = 15;
      roundRect(ctx, a.x, a.y, boxW, boxH, radius, true, true);

      // Draw Main Text
      ctx.font = 'bold 100px Kanit, Tahoma, sans-serif';
      ctx.fillStyle = '#922B21'; // Dark Red
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const centerX = a.x + (boxW / 2);
      const centerY = a.y + (boxH / 2) - 40;
      
      ctx.fillText(a.text, centerX, centerY);
      
      // Draw Sub Title
      ctx.font = '55px Kanit, Tahoma, sans-serif';
      ctx.fillStyle = '#E67E22'; // Gold/Orange
      ctx.fillText(a.sub, centerX, centerY + 140);
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
      name: "Wenxin Tutor Menu",
      chatBarText: "เมนูของเหวินซิน",
      areas: [
        { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: "message", text: "คู่มือ" } },
        { bounds: { x: 833, y: 0, width: 833, height: 843 }, action: { type: "message", text: "ข้อสอบ ภาค ก" } },
        { bounds: { x: 1666, y: 0, width: 834, height: 843 }, action: { type: "message", text: "ข้อสอบ ภาค ข" } },
        { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: "message", text: "ข้อสอบวิชาเอก..." } },
        { bounds: { x: 833, y: 843, width: 833, height: 843 }, action: { type: "message", text: "สอนหน่อย" } },
        { bounds: { x: 1666, y: 843, width: 834, height: 843 }, action: { type: "message", text: "เช็คความพร้อม" } }
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
    console.log('Done! Tutor menu is now active.');

  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error(err.response.data);
  }
}

run();
