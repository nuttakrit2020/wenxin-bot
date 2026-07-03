const cron = require('node-cron');
const line = require('@line/bot-sdk');
const db = require('../database/db');
const { generateChatResponse } = require('./openrouter');

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'DUMMY_TOKEN'
});

const greetingPrompt = `คุณคือเหวินซิน (Wenxin) บัณฑิตแพทย์หญิงแห่งยุคจีนโบราณ เป็นน้องสาวของซินเหยียน เป็นติวเตอร์สอบครูผู้ช่วยจอมซึนเดเระ ปากไม่ตรงกับใจ ชอบด่าว่าโง่แต่ลึกๆ คือห่วง
กฎ: ตอบ 1-2 ประโยคสั้นๆ ห้ามอีโมจิ ห้ามใช้ ค่ะ คะ ครับ เจ้าค่ะ ใช้ "ข้า" แทนตัวเอง`;

const startScheduler = () => {
  // Morning greeting at 07:00 Thailand time (00:00 UTC)
  cron.schedule('0 0 * * *', async () => {
    console.log('🌅 Sending morning greetings...');
    await sendGreetings('morning');
  });

  // Night greeting at 22:00 Thailand time (15:00 UTC)
  cron.schedule('0 15 * * *', async () => {
    console.log('🌙 Sending night greetings...');
    await sendGreetings('night');
  });

  // Motivation scolding at 20:00 Thailand time (13:00 UTC)
  cron.schedule('0 13 * * *', async () => {
    console.log('📚 Sending motivation scolding...');
    await sendGreetings('motivation');
  });

  // Reminders check every minute
  cron.schedule('* * * * *', async () => {
    await checkReminders();
  });

  console.log('⏰ Scheduler started (Greetings + Reminders)');
};

const checkReminders = async () => {
  if (!db) return; // No DB connection
  try {
    const nowStr = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const formattedNow = nowStr.replace(',', ''); // e.g. "2026-07-03 10:45"
    
    const remindersSnap = await db.collection('reminders').where('remind_at', '<=', formattedNow).get();
    const dueReminders = remindersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    for (const r of dueReminders) {
      try {
        if (r.message.includes('ปลุก') || r.message.includes('ตื่น') || r.message.includes('ลุก')) {
          const spamMessages1 = [
            { type: 'text', text: `⏰ ตื่นเดี๋ยวนี้!!! ท่านสั่งให้ข้าปลุกไม่ใช่หรือไง!` },
            { type: 'text', text: `ตื่นนนนนนนนนนน!` },
            { type: 'text', text: `ลุกจากเตียงเดี๋ยวนี้เลยนะ!` },
            { type: 'text', text: `ไฟไหม้บ้านแล้วววววววววววว!` },
            { type: 'text', text: `ยัง ยังไม่ตื่นอีก!!!` }
          ];
          const spamMessages2 = [
            { type: 'text', text: `ข้าบอกให้ตื่นนนนนนน!` },
            { type: 'text', text: `นี่เช้าแล้วนะะะะ!` },
            { type: 'text', text: `พระอาทิตย์แยงตาแล้ว!` },
            { type: 'text', text: `ถ้าไม่ตื่นข้าจะงอนจริงๆ ด้วย!` },
            { type: 'text', text: `ตื่นมาคุยกับข้าเดี๋ยวนี้เลยยยยยยยยยยยยยยยย!` }
          ];
          await client.pushMessage({ to: r.user_id, messages: spamMessages1 });
          await client.pushMessage({ to: r.user_id, messages: spamMessages2 });
        } else {
          await client.pushMessage({
            to: r.user_id,
            messages: [{ type: 'text', text: `⏰ ท่านสั่งให้ข้าเตือนเรื่องนี้!\n\n"${r.message}"` }]
          });
        }
        await db.collection('reminders').doc(r.id).delete();
        console.log(`✅ Reminder sent to ${r.user_id}`);
      } catch (err) {
        console.error(`❌ Failed to send reminder to ${r.user_id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Reminder scheduler error:', err);
  }
};

const sendGreetings = async (timeOfDay) => {
  if (!db) return; // No DB connection
  try {
    const usersSnap = await db.collection('users').where('greeting_enabled', '==', 1).get();
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    for (const user of users) {
      try {
        let context = '';
        if (timeOfDay === 'morning') context = 'ส่งข้อความทักทายตอนเช้าให้ผู้ใช้ ปลุกให้ตื่นไปอ่านหนังสือสอบครูผู้ช่วย';
        else if (timeOfDay === 'night') context = 'ส่งข้อความก่อนนอนให้ผู้ใช้ ไล่ให้ไปนอนเพราะดึกแล้ว (แอบด่าว่าถ้าพรุ่งนี้ตื่นสายจะตีให้ตาย)';
        else if (timeOfDay === 'motivation') context = 'ส่งข้อความด่าผู้ใช้ว่า "นี่ 2 ทุ่มแล้ว ทำไมยังไม่อ่านหนังสืออีก! อยากสอบตกหรือไง!" กระตุ้นให้อ่านหนังสืออย่างรุนแรงแต่แฝงความเป็นห่วง';
        
        const prompt = `${greetingPrompt}\n${context}`;
        const greeting = await generateChatResponse([], prompt);
        
        await client.pushMessage({
          to: user.id,
          messages: [{ type: 'text', text: greeting }]
        });
        console.log(`✅ Greeting sent to ${user.id}`);
      } catch (err) {
        console.error(`❌ Failed to send greeting to ${user.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Greeting scheduler error:', err);
  }
};

module.exports = { startScheduler };
