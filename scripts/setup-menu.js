const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const TOKEN = 'hGJBTfJY2kjdnv3Gr/eUpf5mdsmVams1M6J8PbypDP/zyFYd7mJTTwrSKEKNJsrQnWQ3y/8gDBWMh6tollCAOs0PxiudGqyygfK2r80fWUumulO8S6aW4xHs0OGZBD2HFRGe8gOHWwEC1Zg6D0lXkgdB04t89/1O/w1cDnyilFU=';
const IMAGE_IN = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\7fd3ac5a-bfd1-49e9-a65d-bb41e3ca73fc\\xinyan_rich_menu_1783044797012.png';
const IMAGE_OUT = path.join(__dirname, 'rich_menu_final.jpg');

async function setup() {
  try {
    console.log('1. Processing image to 2500x1686...');
    const image = await Jimp.read(IMAGE_IN);
    await image.cover(2500, 1686).quality(90).writeAsync(IMAGE_OUT);
    console.log('Image processed.');

    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    };

    console.log('2. Creating Rich Menu object...');
    const menuConfig = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: "Xinyan Main Menu",
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

    const createRes = await axios.post('https://api.line.me/v2/bot/richmenu', menuConfig, { headers });
    const richMenuId = createRes.data.richMenuId;
    console.log(`Rich Menu Created: ${richMenuId}`);

    console.log('3. Uploading image...');
    const imageBuffer = fs.readFileSync(IMAGE_OUT);
    await axios.post(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, imageBuffer, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'image/jpeg'
      }
    });
    console.log('Image uploaded.');

    console.log('4. Setting as default menu...');
    await axios.post(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {}, { headers });
    console.log('Done! Rich menu is now active.');

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

setup();
