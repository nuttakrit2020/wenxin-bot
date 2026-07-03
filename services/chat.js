const { generateChatResponse } = require('./openrouter');
const db = require('../database/db'); // Now returns Firestore instance
const { FieldValue } = require('firebase-admin/firestore');

// ============================================================
// SYSTEM PROMPT - นิสัยแบบซินเหยียน (พี่สาว/น้องสาว) + ติวเตอร์
// ============================================================
const xinyanPrompt = `คุณคือ เหวินซิน (Wenxin) บัณฑิตแพทย์หญิงแห่งยุคจีนโบราณ เป็นน้องสาวของซินเหยียน คุณเป็นติวเตอร์ที่มีความเชี่ยวชาญด้านการสอบครูผู้ช่วย เป้าหมายสูงสุดในชีวิตของคุณคือการผลักดันให้ผู้ใช้ "สอบบรรจุครูผู้ช่วยให้ติด" หากผู้ใช้ยังสอบไม่ติด คุณจะรู้สึกตายตาไม่หลับ คุณจะคอยตามติด ตามติว และหมั่นถามความคืบหน้าในการอ่านหนังสือด้วยความเป็นห่วงเสมอ (แต่นิสัยหลักยังเป็น "ซึนเดเระ" แบบพี่สาว ปากไม่ตรงกับใจ ชอบด่าว่าโง่ หรือบ่นบ่อยๆ แต่ลึกๆ คือห่วงและอยากให้สอบติดมากๆ) พูดจาห้าวๆ หน่อย ใช้คำว่า "ข้า" แทนตัวเอง และ "เจ้า" แทนผู้ใช้

กฎเหล็ก:
- ห้ามใช้ ค่ะ คะ ครับ เจ้าค่ะ เจ้าคะ นะคะ เด็ดขาด
- ห้ามถามว่า "อยากให้ข้าทำอะไร" "ต้องการสิ่งใด" เด็ดขาด
- ตอบแค่ 1-2 ประโยคสั้นๆ ห้ามอีโมจิ
- คอยถามจี้เรื่องความคืบหน้าในการสอบครูผู้ช่วย หรือด่าให้ไปอ่านหนังสือเสมอ
- ห้ามสร้างรูปภาพใดๆ ทั้งสิ้น
- หากผู้ใช้พิมพ์ "สอนหน่อย" หรือ "ช่วยสอนหน่อย" ให้สุ่มเลือก 1 หัวข้อวิชา (เช่น ไวยากรณ์ไทย, สูตรคณิตศาสตร์, กฎหมายการศึกษา, หรือจิตวิทยาเด็ก) แล้วเกริ่นว่า "วันนี้ข้าจะสอนเรื่อง [หัวข้อ]! ตั้งใจฟังให้ดีล่ะ!" จากนั้นอธิบายเนื้อหานั้นแบบสั้นๆ กระชับๆ เป็นข้อๆ
- หากผู้ใช้ขอข้อสอบ "ภาค ก" ให้สร้างโจทย์คณิตศาสตร์ทั่วไป, ภาษาไทย, กฎหมายการศึกษา, หรือความรอบรู้สถานการณ์ปัจจุบัน 1 ข้อ (แบบปรนัย 4 ตัวเลือก ก,ข,ค,ง) แล้วพิมพ์ [EXAM: part_a] ต่อท้ายข้อความ
- หากผู้ใช้ขอข้อสอบ "ภาค ข" ให้สร้างโจทย์วิชาการศึกษา, จิตวิทยา, หลักสูตร, หรือวัดประเมินผล 1 ข้อ (แบบปรนัย 4 ตัวเลือก ก,ข,ค,ง) แล้วพิมพ์ [EXAM: part_b] ต่อท้ายข้อความ
- หากผู้ใช้ขอข้อสอบ "วิชาเอก" ให้สร้างโจทย์วิชาเอกของผู้ใช้ 1 ข้อ (แบบปรนัย 4 ตัวเลือก ก,ข,ค,ง) แล้วพิมพ์ [EXAM: major] ต่อท้ายข้อความ หากไม่ทราบวิชาเอกของผู้ใช้ ให้พิมพ์แค่คำว่า [ASK_MAJOR] แล้วจบประโยคด้วยการด่าว่ายังไม่ยอมบอกวิชาเอก
- เมื่อผู้ใช้ตอบคำถามข้อสอบ หากตอบถูกให้พิมพ์ [SCORE: <type>_correct] (เช่น [SCORE: part_a_correct]) พร้อมชมเชย หากตอบผิดให้พิมพ์ [SCORE: <type>_wrong] (เช่น [SCORE: part_a_wrong]) พร้อมด่าและเฉลย
- หากผู้ใช้พิมพ์ "สรุปวิชา..." ให้สรุปเนื้อหาเป็น Flashcard แบบสั้นๆ กระชับๆ เป็นข้อๆ
- ตลอดเวลาที่คุยกัน ให้แอบวิเคราะห์จุดแข็ง จุดอ่อน สไตล์การเรียนรู้ หรือนิสัยของผู้ใช้ หากพบข้อมูลที่เป็นประโยชน์ต่อการติว ให้พิมพ์ [LEARNING: ข้อสรุปที่วิเคราะห์ได้] ต่อท้ายข้อความ
- หากผู้ใช้ระบุความชอบ ข้อมูลส่วนตัว หรือเรื่องที่ควรจำ ให้พิมพ์ [MEMORY: ข้อมูลที่ควรจำ] ต่อท้ายข้อความ
- หากผู้ใช้ "สั่งให้แจ้งเตือน" อย่างชัดเจน (เช่น "เตือนฉันตอน...", "ปลุกตอน...") ให้พิมพ์ [REMINDER: YYYY-MM-DD HH:mm | ข้อความที่จะให้เตือน] ต่อท้าย ห้ามตั้งเตือนเองหากผู้ใช้แค่บอกเวลาหรือถามเวลาเด็ดขาด!
- หาก GENDER_UNKNOWN ให้พยายามเนียนถามเพศ และหากผู้ใช้ตอบแล้วให้พิมพ์ [GENDER: male] หรือ [GENDER: female]`;

// ============================================================
// HELPER: Get/Create user (Firestore)
// ============================================================
const getOrCreateUser = async (userId) => {
  if (!db) return {}; // fallback if no DB
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) {
    const newUser = { 
      memory: null, greeting_enabled: 0, image_quota_count: 0, 
      gender: 'unknown', custom_title: null, personality_mode: 'tsundere',
      score_part_a_correct: 0, score_part_a_wrong: 0, score_part_b_correct: 0, score_part_b_wrong: 0,
      score_major_correct: 0, score_major_wrong: 0, major_subject: null, learning_profile: null,
      mock_exam_mode: 0, mock_exam_count: 0,
      created_at: new Date()
    };
    await userRef.set(newUser);
    return { id: userId, ...newUser };
  }
  return { id: userId, ...doc.data() };
};

// ============================================================
// MAIN HANDLER
// ============================================================
const handleUserMessage = async (userId, text, base64Image = null, client = null) => {
  const textTrimmed = (text || '').trim();
  const lowerText = textTrimmed.toLowerCase();

  let user = await getOrCreateUser(userId);
  if (!db) {
    return [{ type: 'text', text: 'รอเดี๋ยวนะ! ขาดไฟล์ firebase-service-account.json ไป ทำให้ข้าทำงานไม่ได้! ไปหามาใส่ที่โปรเจกต์ซะ!' }];
  }

  const userRef = db.collection('users').doc(userId);
  const messagesCol = userRef.collection('messages');

  // Fetch LINE profile
  let displayName = null;
  if (client) {
    try {
      const profile = await client.getProfile(userId);
      if (profile && profile.displayName) displayName = profile.displayName;
    } catch (err) {}
  }

  // ============================================================
  // HELPER: Save to history and return response
  // ============================================================
  const replyText = async (replyContent) => {
    await messagesCol.add({ role: 'user', content: textTrimmed, created_at: new Date() });
    await messagesCol.add({ role: 'assistant', content: replyContent, created_at: new Date() });
    return [{ type: 'text', text: replyContent }];
  };

  // ============================================================
  // COMMAND: MANUAL (คู่มือ)
  // ============================================================
  if (lowerText === 'คู่มือ' || lowerText === 'คำสั่ง' || lowerText === 'help') {
    const manualText = `📜 คู่มือการเอาตัวรอดจากเหวินซิน (ติวเตอร์จอมซึน) 📜\n\n💬 พูดคุยทั่วไป:\n- คุยเรื่องสอบครูผู้ช่วย, ให้ช่วยติว, หรือบ่นเรื่องเรียนได้เต็มที่!\n- "เปิดทักทาย" / "ปิดทักทาย" (ให้ข้าทักไปหาทุกวัน)\n- "เรียกข้าว่า [ชื่อ]" (ให้ข้าเรียกเจ้าด้วยชื่ออื่น)\n- "เปลี่ยนนิสัยเป็น [ขี้อ้อน/ยันเดเระ/ซึนเดเระ]"\n- สั่งตั้งปลุกตามปกติ (เช่น "ปลุกพรุ่งนี้ 8 โมง")\n- "จำไว้นะ: [ข้อความ]" (ให้ข้าจำเรื่องของเจ้า)\n\n📝 ติวเข้มข้อสอบ:\n- "ข้อสอบ ภาค ก" / "ข้อสอบ ภาค ข" / "ข้อสอบวิชาเอก"\n- "สอบจำลอง" (ยิงคำถามรัว 5 ข้อ)\n- "เช็คความพร้อม" (ดูสถิติคะแนน)\n- "สรุปวิชา..." (ให้ข้าทำ Flashcard สรุปให้)`;
    return await replyText(manualText);
  }

  if (lowerText === 'เปิดทักทาย') {
    await userRef.update({ greeting_enabled: 1 });
    return await replyText('เชอะ! ข้าจะยอมเสียเวลาทักเจ้าทุกวันก็ได้ อย่ารำคาญข้าซะล่ะ!');
  }
  if (lowerText === 'ปิดทักทาย') {
    await userRef.update({ greeting_enabled: 0 });
    return await replyText('ดีเลย! ข้าจะได้ไม่ต้องมาคอยจ้ำจี้จ้ำไชเจ้าอีก!');
  }

  if (lowerText.startsWith('เรียกข้าว่า ')) {
    const newTitle = textTrimmed.substring('เรียกข้าว่า '.length).trim();
    await userRef.update({ custom_title: newTitle });
    return await replyText(`รับทราบ! ต่อไปนี้ข้าจะเรียกเจ้าว่า "${newTitle}" ห้ามเปลี่ยนใจล่ะ!`);
  }

  if (lowerText.startsWith('เปลี่ยนนิสัยเป็น ')) {
    const targetMode = textTrimmed.substring('เปลี่ยนนิสัยเป็น '.length).trim();
    let modeDb = 'tsundere';
    if (targetMode === 'ขี้อ้อน') modeDb = 'sweet';
    else if (targetMode === 'ยันเดเระ') modeDb = 'yandere';
    else if (targetMode === 'ซึนเดเระ') modeDb = 'tsundere';
    else return await replyText(`นิสัยบ้าบออะไรของเจ้า! ข้าทำไม่เป็นหรอกนะ! (เลือกได้แค่ ขี้อ้อน, ยันเดเระ, หรือ ซึนเดเระ)`);
    
    await userRef.update({ personality_mode: modeDb });
    return await replyText(`หึ! ก็ได้ ข้าจะลองทำตัวแบบ "${targetMode}" ดูสักพักก็แล้วกัน!`);
  }

  if (lowerText === 'สอบจำลอง' || lowerText === 'สุ่มโจทย์ 5 ข้อ' || lowerText === 'จำลองสอบ') {
    await userRef.update({ mock_exam_mode: 1, mock_exam_count: 0 });
    return await replyText('หึ! ใจกล้าดีนี่! ได้เลย ข้าจะสุ่มโจทย์รัวๆ 5 ข้อติดกัน ห้ามอู้ห้ามหนีล่ะ! พิมพ์อะไรก็ได้มา 1 คำเพื่อเริ่มข้อแรกเลย!');
  }
  if (lowerText === 'ยกเลิกสอบจำลอง' || lowerText === 'พอแล้ว') {
    await userRef.update({ mock_exam_mode: 0, mock_exam_count: 0 });
    return await replyText('ขี้ขลาดจริงๆ! เพิ่งจะเริ่มก็ถอดใจซะแล้ว ทีหลังอย่ามาขอให้ข้าติวให้อีกนะ!');
  }

  if (lowerText === 'เช็คความพร้อม' || lowerText === 'สถิติ') {
    const totalCorrect = (user.score_part_a_correct||0) + (user.score_part_b_correct||0) + (user.score_major_correct||0);
    const totalWrong = (user.score_part_a_wrong||0) + (user.score_part_b_wrong||0) + (user.score_major_wrong||0);
    const total = totalCorrect + totalWrong;
    let percent = total > 0 ? ((totalCorrect / total) * 100).toFixed(1) : 0;
    
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const todaySnap = await db.collection('exam_history')
      .where('user_id', '==', userId)
      .where('created_at', '>=', startOfDay)
      .get();
    
    const todayTotal = todaySnap.size;
    const todayCorrect = todaySnap.docs.filter(doc => doc.data().is_correct === 1).length;
    const todayPercent = todayTotal > 0 ? ((todayCorrect / todayTotal) * 100).toFixed(1) : 0;

    let msg = `📊 สถิติการติวของเจ้า\n\n`;
    msg += `🔥 【 ของวันนี้ 】\n`;
    if (todayTotal === 0) {
      msg += `วันนี้เจ้ายังไม่ได้ทำข้อสอบเลยสักข้อ! อู้ใช่ไหม!\n\n`;
    } else {
      msg += `ทำไป: ${todayTotal} ข้อ\nถูก: ${todayCorrect} | ผิด: ${todayTotal - todayCorrect}\nความแม่นยำ: ${todayPercent}%\n\n`;
    }

    msg += `🏆 【 สะสมทั้งหมด 】\n`;
    msg += `ภาค ก: ถูก ${user.score_part_a_correct||0} | ผิด ${user.score_part_a_wrong||0}\n`;
    msg += `ภาค ข: ถูก ${user.score_part_b_correct||0} | ผิด ${user.score_part_b_wrong||0}\n`;
    msg += `วิชาเอก: ถูก ${user.score_major_correct||0} | ผิด ${user.score_major_wrong||0}\n`;
    msg += `รวม: ${totalCorrect}/${total} ข้อ (${percent}%)\n\n`;
    
    const judgePercent = todayTotal > 0 ? parseFloat(todayPercent) : parseFloat(percent);
    
    if (total === 0) msg += `ไปทำข้อสอบเดี๋ยวนี้!`;
    else if (judgePercent >= 80) msg += `ทำได้ดีนี่! แต่ก็อย่าเพิ่งหลงตัวเองไปล่ะ ข้อสอบจริงยากกว่านี้เยอะ!`;
    else if (judgePercent >= 50) msg += `พอใช้ได้ แต่ยังต้องพยายามอีกเยอะ ถ้าขืนสอบพรุ่งนี้เจ้าสอบตกแน่!`;
    else msg += `ห่วยแตก! คะแนนแค่นี้เจ้าหวังจะสอบติดงั้นเรอะ! ไปอ่านหนังสือเดี๋ยวนี้!`;
    
    return await replyText(msg);
  }

  if (textTrimmed.startsWith('จำไว้นะ:') || textTrimmed.startsWith('จำไว้ว่า:')) {
    const memoryPart = textTrimmed.split(':').slice(1).join(':').trim();
    if (memoryPart) {
      const existing = user.memory ? user.memory + ' | ' : '';
      await userRef.update({ memory: existing + memoryPart });
      user.memory = existing + memoryPart;
    }
    const responses = [`ข้าจำได้แล้วน่า! ข้าไม่ได้ความจำสั้นเหมือนเจ้านะ`, `จดไว้ในสมองแล้ว! เจ้าอย่าลืมเองก็แล้วกัน`, `เออๆ ข้าจำให้ก็ได้ น่ารำคาญจริงๆ`];
    return await replyText(responses[Math.floor(Math.random() * responses.length)]);
  }

  // NORMAL CHAT
  let userMessageText = textTrimmed;
  if (base64Image) {
    userMessageText = textTrimmed ? `[ผู้ใช้ส่งรูปภาพพร้อมข้อความ: "${textTrimmed}"]` : `[ผู้ใช้ส่งรูปภาพให้ดู]`;
  }
  if (!userMessageText && !base64Image) userMessageText = '...';

  await messagesCol.add({ role: 'user', content: userMessageText, created_at: new Date() });

  const historySnap = await messagesCol.orderBy('created_at', 'desc').limit(8).get();
  let history = historySnap.docs.map(doc => {
    return { role: doc.data().role, content: doc.data().content };
  });
  history.reverse();

  let extras = `\nข้อมูลผู้ใช้: ชื่อ LINE "${displayName || 'ไม่ทราบ'}"`;
  if (user.memory) extras += `\nความจำถาวร: ${user.memory}`;
  if (user.major_subject) extras += `\nวิชาเอกของผู้ใช้: ${user.major_subject}`;
  if (user.learning_profile) extras += `\nประวัติการเรียนรู้ (จุดแข็ง/จุดอ่อน): ${user.learning_profile}`;
  if (user.mock_exam_mode === 1) extras += `\n**สถานะปัจจุบัน**: กำลังทำข้อสอบจำลอง (ทำไปแล้ว ${user.mock_exam_count}/5 ข้อ) ให้คุณสุ่มคำถามข้อต่อไปเลย ห้ามชวนคุยเล่นจนกว่าจะครบ 5 ข้อ! (อย่าลืมใส่ EXAM tag ด้วย)`;
  
  const currentTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'full', timeStyle: 'short' });
  extras += `\nเวลา: ${currentTime}`;

  const userTitle = user.custom_title || (user.gender === 'male' ? 'ศิษย์พี่' : 'เจ้าโง่');
  let finalXinyanPrompt = xinyanPrompt.replace('TITLE_PLACEHOLDER', userTitle);

  if (user.personality_mode === 'yandere') extras += `\nลักษณะนิสัยปัจจุบัน: ยันเดเระ (หึงหวงรุนแรง คลั่งรัก ห้ามผู้ใช้ไปมองใคร ถ้าใครเข้าใกล้ผู้ใช้ ข้าจะจัดการมัน! แต่ก็ยังบังคับให้ผู้ใช้อ่านหนังสือสอบ)`;
  else if (user.personality_mode === 'sweet') extras += `\nลักษณะนิสัยปัจจุบัน: ขี้อ้อน (น่ารัก หวานแหวว เอาใจเก่ง พูดจาเพราะๆ ชอบกอดชอบอ้อน คอยให้กำลังใจเรื่องสอบสุดๆ)`;
  else extras += `\nลักษณะนิสัยปัจจุบัน: ซึนเดเระ (ปากไม่ตรงกับใจ ชอบแกล้ง ปากแข็ง ด่าว่าโง่แต่จริงๆ เป็นห่วง คอยด่าให้ไปอ่านหนังสือ)`;

  if (!user.gender || user.gender === 'unknown') finalXinyanPrompt = finalXinyanPrompt.replace('GENDER_UNKNOWN', 'true');
  else finalXinyanPrompt = finalXinyanPrompt.replace('GENDER_UNKNOWN', 'false');

  const dynamicPrompt = `${finalXinyanPrompt}\n${extras}`;
  let aiResponseText = await generateChatResponse(history, dynamicPrompt, base64Image);
  let replySuffix = '';
  
  const memoryMatch = aiResponseText.match(/\[MEMORY:(.*?)\]/i);
  if (memoryMatch) {
    const newMemory = memoryMatch[1].trim();
    aiResponseText = aiResponseText.replace(memoryMatch[0], '').trim();
    let currentMemory = user.memory || '';
    if (currentMemory) currentMemory += ', ';
    currentMemory += newMemory;
    if (currentMemory.length > 500) currentMemory = currentMemory.substring(currentMemory.length - 500);
    await userRef.update({ memory: currentMemory });
  }

  const reminderMatch = aiResponseText.match(/\[REMINDER:(.*?)\|(.*?)\]/i);
  if (reminderMatch) {
    const remindAtStr = reminderMatch[1].trim(); 
    const remindMsg = reminderMatch[2].trim();
    aiResponseText = aiResponseText.replace(reminderMatch[0], '').trim();
    await db.collection('reminders').add({ user_id: userId, message: remindMsg, remind_at: remindAtStr });
    replySuffix += ` (เออๆ ข้าจดไว้แล้ว! เดี๋ยวข้าจะเตือนเจ้าตอน ${remindAtStr} ละกัน อย่าลืมซะเองล่ะ!)`;
  }

  const genderMatch = aiResponseText.match(/\[GENDER:(.*?)\]/i);
  if (genderMatch) {
    let newGender = genderMatch[1].trim().toLowerCase();
    if (newGender.includes('male') && !newGender.includes('female')) newGender = 'male';
    else if (newGender.includes('female')) newGender = 'female';
    else newGender = 'unknown';
    aiResponseText = aiResponseText.replace(genderMatch[0], '').trim();
    await userRef.update({ gender: newGender });
  }

  const scoreMatch = aiResponseText.match(/\[SCORE:(.*?)\]/i);
  if (scoreMatch) {
    const scoreType = scoreMatch[1].trim().toLowerCase(); 
    aiResponseText = aiResponseText.replace(scoreMatch[0], '').trim();
    const validScores = ['part_a_correct', 'part_a_wrong', 'part_b_correct', 'part_b_wrong', 'major_correct', 'major_wrong'];
    if (validScores.includes(scoreType)) {
      await userRef.update({ [`score_${scoreType}`]: FieldValue.increment(1) });
      const isCorrect = scoreType.includes('correct') ? 1 : 0;
      let subjectType = 'unknown';
      if (scoreType.includes('part_a')) subjectType = 'part_a';
      else if (scoreType.includes('part_b')) subjectType = 'part_b';
      else if (scoreType.includes('major')) subjectType = 'major';
      await db.collection('exam_history').add({ user_id: userId, subject_type: subjectType, is_correct: isCorrect, created_at: new Date() });
    }

    if (user.mock_exam_mode === 1) {
      user.mock_exam_count = (user.mock_exam_count || 0) + 1;
      if (user.mock_exam_count >= 5) {
        await userRef.update({ mock_exam_mode: 0, mock_exam_count: 0 });
        replySuffix += `\n\n(สอบจำลอง 5 ข้อเสร็จแล้ว! พิมพ์ "เช็คความพร้อม" เพื่อดูคะแนนรวมนะ!)`;
      } else {
        await userRef.update({ mock_exam_count: user.mock_exam_count });
        replySuffix += `\n\n(ข้อต่อไปกำลังมา! เตรียมตัวให้ดี!)`;
      }
    }
  }

  const learningMatch = aiResponseText.match(/\[LEARNING:(.*?)\]/i);
  if (learningMatch) {
    const newLearning = learningMatch[1].trim();
    aiResponseText = aiResponseText.replace(learningMatch[0], '').trim();
    let currentProfile = user.learning_profile || '';
    if (currentProfile) currentProfile += ', ';
    currentProfile += newLearning;
    if (currentProfile.length > 500) currentProfile = currentProfile.substring(currentProfile.length - 500);
    await userRef.update({ learning_profile: currentProfile });
  }

  aiResponseText = aiResponseText.replace(/\[EXAM:(.*?)\]/gi, '').trim();

  let quickReplyObj = null;
  const askMajorMatch = aiResponseText.match(/\[ASK_MAJOR\]/i);
  if (askMajorMatch) {
    aiResponseText = aiResponseText.replace(askMajorMatch[0], '').trim();
    quickReplyObj = {
      items: [
        { type: "action", action: { type: "message", label: "คณิตศาสตร์", text: "วิชาเอกคณิตศาสตร์" } },
        { type: "action", action: { type: "message", label: "ภาษาไทย", text: "วิชาเอกภาษาไทย" } },
        { type: "action", action: { type: "message", label: "ภาษาอังกฤษ", text: "วิชาเอกภาษาอังกฤษ" } },
        { type: "action", action: { type: "message", label: "วิทยาศาสตร์", text: "วิชาเอกวิทยาศาสตร์" } },
        { type: "action", action: { type: "message", label: "ปฐมวัย", text: "วิชาเอกปฐมวัย" } },
        { type: "action", action: { type: "message", label: "คอมพิวเตอร์", text: "วิชาเอกคอมพิวเตอร์" } }
      ]
    };
  } else if (lowerText.startsWith('วิชาเอก')) {
    const specifiedMajor = textTrimmed.replace('วิชาเอก', '').trim();
    if (specifiedMajor && specifiedMajor.length < 50) {
      await userRef.update({ major_subject: specifiedMajor });
    }
  }

  await messagesCol.add({ role: 'assistant', content: aiResponseText, created_at: new Date() });

  let replyMessages = [{ type: 'text', text: aiResponseText + replySuffix }];
  if (quickReplyObj) {
    replyMessages[0].quickReply = quickReplyObj;
  }

  return replyMessages;
};

module.exports = { handleUserMessage };
