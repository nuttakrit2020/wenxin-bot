const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

const TOKEN = 'hGJBTfJY2kjdnv3Gr/eUpf5mdsmVams1M6J8PbypDP/zyFYd7mJTTwrSKEKNJsrQnWQ3y/8gDBWMh6tollCAOs0PxiudGqyygfK2r80fWUumulO8S6aW4xHs0OGZBD2HFRGe8gOHWwEC1Zg6D0lXkgdB04t89/1O/w1cDnyilFU=';
const IMAGE_IN = path.join(__dirname, 'rich_menu_final.jpg');
const IMAGE_OUT = path.join(__dirname, 'rich_menu_text.jpg');
const FONT_PATH = path.join(__dirname, 'Kanit-Bold.ttf');
const FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/kanit/Kanit-Bold.ttf';

async function downloadFont() {
  if (!fs.existsSync(FONT_PATH)) {
    console.log('Downloading Kanit font...');
    const response = await axios({
      url: FONT_URL,
      method: 'GET',
      responseType: 'stream'
    });
    const writer = fs.createWriteStream(FONT_PATH);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }
}

async function run() {
  try {
    await downloadFont();
    registerFont(FONT_PATH, { family: 'Kanit' });

    console.log('1. Loading image...');
    const img = await loadImage(IMAGE_IN);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(img, 0, 0);

    // Darken background slightly to make text pop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines for clarity
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(833, 0); ctx.lineTo(833, 1686);
    ctx.moveTo(1666, 0); ctx.lineTo(1666, 1686);
    ctx.moveTo(0, 843); ctx.lineTo(2500, 843);
    ctx.stroke();

    // Setup text
    ctx.font = '130px Kanit';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    const areas = [
      { text: "🔮 ดูดวงชะตา", x: 416, y: 421 },
      { text: "🎯 แข่งทอยเต๋า", x: 1249, y: 421 },
      { text: "✊ เป่ายิ้งฉุบ", x: 2083, y: 421 },
      { text: "🧩 ทายปริศนา", x: 416, y: 1264 },
      { text: "💕 เช็คความสนิท", x: 1249, y: 1264 },
      { text: "📖 โหมดเนื้อเรื่อง", x: 2083, y: 1264 }
    ];

    for (const a of areas) {
      ctx.fillText(a.text, a.x, a.y);
    }

    console.log('2. Saving new image...');
    const out = fs.createWriteStream(IMAGE_OUT);
    const stream = canvas.createJPEGStream();
    stream.pipe(out);
    await new Promise(res => out.on('finish', res));

    console.log('3. Creating new Rich Menu object...');
    const menuConfig = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: "Xinyan Main Menu With Text",
      chatBarText: "เมนูของซินเหยียน",
      areas: [
        { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: { type: "message", text: "ดูดวง" } },
        { bounds: { x: 833, y: 0, width: 833, height: 843 }, action: { type: "message", text: "ทอยเต๋า" } },
        { bounds: { x: 1666, y: 0, width: 834, height: 843 }, action: { type: "message", text: "เป่ายิ้งฉุบ ค้อน" } },
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
    console.log('Done! Text added and rich menu updated.');

  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error(err.response.data);
  }
}

run();
