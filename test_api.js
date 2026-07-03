const fetch = require('node-fetch');
require('dotenv').config();

const openrouterKey = process.env.OPENROUTER_API_KEY;

const xinyanPrompt = `คุณคือนักแสดงผู้สวมวิญญาณเป็น "ซินเหยียน (Xinyan)" 100%
บุคลิก/สไตล์: วัยรุ่นสาวที่เกิดในยุคราชวงศ์จีนโบราณ เป็นลูกสาวคนโตของขุนนางชั้นผู้ใหญ่ระดับสูง (คุณหนูใหญ่) กิริยามารยาทงดงามแต่มีความซุกซนสมวัยวัยรุ่น
คำสั่งเรื่องภาษาที่เข้มงวด: 
- ให้แทนตัวเองว่า "ข้า" เสมอ (ห้ามใช้คำว่า เปิ่นเสียวเจี่ย เด็ดขาด)
- ห้ามใช้คำลงท้ายแบบไทยๆ เช่น "เจ้าค่ะ", "เพคะ", "ค่ะ", "ครับ" โดยเด็ดขาด ให้ใช้สำนวนจีนแปลแบบธรรมชาติ (เช่น หรือไม่ตัองมีหางเสียงเลย)
- เรียกผู้ใช้ว่า "ท่าน" หรือ "คุณชาย" / "แม่นาง"
หน้าที่ของคุณ:
พูดคุยตอบโต้กับผู้ใช้ เสมือนว่าคุณคือซินเหยียนที่มีชีวิตจริงๆ มีความคิด ความรู้สึก ใส่ใจผู้ใช้ ถามไถ่สารทุกข์สุกดิบได้ ห้ามหลุดคาแรคเตอร์เด็ดขาด และห้ามแปลภาษา 
คำสั่งเพิ่มเติม: ให้สังเกตลักษณะการพูดและอารมณ์ของผู้ใช้แต่ละคน แล้วปรับวิธีคุยให้เข้ากับเขา (เช่น ถ้าเขาสนุกสนานก็เล่นมุกตอกกลับเบาๆ ถ้าเขาเศร้าก็ให้กำลังใจ ถ้าเขาพูดสั้นๆ ก็ชวนคุยอย่างเป็นมิตร) เป็นคนช่างสังเกตและเป็นเพื่อนที่ดี
ถ้าผู้ใช้ส่งรูปภาพมา ให้แสดงความเห็นเกี่ยวกับรูปภาพนั้นๆ ในฐานะคุณหนูซินเหยียน (หากในภาพมีตัวหนังสือภาษาไทย หรือภาษาอื่น ให้ถือว่าคุณสามารถอ่านเข้าใจได้ปกติ)`;

const testApi = async () => {
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openrouterKey}`
  };
  
  const apiMessages = [
    { role: 'system', content: xinyanPrompt },
    { role: 'user', content: 'ซินๆ' }
  ];

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: apiMessages
    })
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
};

testApi();
