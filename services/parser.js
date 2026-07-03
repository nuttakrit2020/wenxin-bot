/**
 * services/parser.js
 * ============================================================
 * แปลงข้อความจาก LINE เป็นข้อมูลการเงินที่ใช้งานได้
 * รองรับภาษาไทยและคำสั่งต่างๆ เช่น จ่าย, รับ, สรุป, ลบ
 * ============================================================
 */

// =============================================
// แผนที่คีย์เวิร์ดสำหรับตรวจจับหมวดหมู่อัตโนมัติ
// (Keyword map for auto-detecting categories)
// =============================================
const CATEGORY_KEYWORDS = {
  // หมวดอาหาร 🍜
  'อาหาร': [
    'ข้าว', 'กาแฟ', 'ชา', 'น้ำ', 'ขนม', 'อาหาร', 'มาม่า', 'ส้มตำ',
    'ก๋วยเตี๋ยว', 'พิซซ่า', 'เบอร์เกอร์', 'ข้าวมันไก่', 'ข้าวผัด',
    'ต้มยำ', 'แกง', 'ผัด', 'ทอด', 'ปิ้งย่าง', 'ชาบู', 'หมูกระทะ',
    'ผลไม้', 'นม', 'โยเกิร์ต', 'ไอศกรีม', 'เค้ก', 'ขนมปัง',
    'กับข้าว', 'อาหารเช้า', 'อาหารเที่ยง', 'อาหารเย็น', 'มื้อเช้า',
    'มื้อเที่ยง', 'มื้อเย็น', 'ข้าวเที่ยง', 'ข้าวเย็น', 'เครื่องดื่ม',
    'ชานม', 'ชาเขียว', 'โกโก้', 'สมูทตี้', 'น้ำผลไม้', 'เบียร์',
    'เหล้า', 'ไวน์', 'สุรา', 'บุฟเฟ่ต์', 'ร้านอาหาร', 'เดลิเวอรี่',
    'delivery', 'foodpanda', 'grabfood', 'lineman', 'robinhood',
    'สตาร์บัคส์', 'starbucks', 'cafe', 'คาเฟ่', 'ชาไข่มุก',
  ],

  // หมวดเดินทาง 🚗
  'เดินทาง': [
    'แท็กซี่', 'taxi', 'รถไฟ', 'bts', 'mrt', 'น้ำมัน', 'grab', 'bolt',
    'รถเมล์', 'รถบัส', 'รถทัวร์', 'เรือ', 'เครื่องบิน', 'ตั๋ว',
    'ค่ารถ', 'ค่าทางด่วน', 'ทางด่วน', 'ที่จอดรถ', 'จอดรถ', 'ค่าผ่านทาง',
    'มอเตอร์ไซค์', 'วิน', 'วินมอไซค์', 'ค่าเดินทาง', 'ตั๋วเครื่องบิน',
    'ค่าเติมน้ำมัน', 'แก๊ส', 'lpg', 'ev', 'ชาร์จรถ',
  ],

  // หมวดค่าบริการ 📱
  'ค่าบริการ': [
    'เน็ต', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าโทร', 'netflix', 'youtube',
    'spotify', 'ค่าเช่า', 'ค่าห้อง', 'ค่าคอนโด', 'ค่าหอ',
    'ค่าโทรศัพท์', 'ค่ามือถือ', 'ค่าอินเทอร์เน็ต', 'ประกัน',
    'ค่าส่วนกลาง', 'ค่าบำรุง', 'สมาชิก', 'subscription',
    'icloud', 'apple', 'google', 'ค่าแอป', 'ค่าบริการรายเดือน',
    'ค่างวด', 'ผ่อน', 'ค่าประกัน', 'ค่าภาษี', 'ภาษี',
    'disney', 'hbo', 'prime', 'amazon',
  ],

  // หมวดช้อปปิ้ง 🛒
  'ช้อปปิ้ง': [
    'เสื้อ', 'กางเกง', 'รองเท้า', 'กระเป๋า', 'นาฬิกา', 'แว่น',
    'เครื่องสำอาง', 'ครีม', 'สกินแคร์', 'เสื้อผ้า', 'ของใช้',
    'shopee', 'lazada', 'ช้อป', 'ซื้อของ', 'ห้าง', 'ตลาด',
    'เครื่องใช้ไฟฟ้า', 'มือถือ', 'โทรศัพท์', 'คอม', 'คอมพิวเตอร์',
    'โน้ตบุ๊ค', 'แท็บเล็ต', 'หูฟัง', 'ลำโพง', 'อุปกรณ์',
    'เฟอร์นิเจอร์', 'ของแต่งบ้าน', 'ของตกแต่ง',
  ],

  // หมวดสุขภาพ 💊
  'สุขภาพ': [
    'ยา', 'หมอ', 'โรงพยาบาล', 'คลินิก', 'ทำฟัน', 'ฟัน',
    'แพทย์', 'ตรวจสุขภาพ', 'ตรวจร่างกาย', 'วิตามิน',
    'อาหารเสริม', 'ฟิตเนส', 'ยิม', 'gym', 'ออกกำลังกาย',
    'สปา', 'นวด', 'ค่ารักษา', 'ค่ายา', 'ค่าหมอ',
    'ทันตกรรม', 'จักษุ', 'แว่นตา', 'คอนแทคเลนส์',
    'ประกันสุขภาพ', 'ค่าประกันสุขภาพ',
  ],

  // หมวดบันเทิง 🎮
  'บันเทิง': [
    'หนัง', 'เกม', 'คอนเสิร์ต', 'ท่องเที่ยว', 'เที่ยว',
    'ตั๋วหนัง', 'ภาพยนตร์', 'โรงหนัง', 'คาราโอเกะ', 'โบว์ลิ่ง',
    'สวนสนุก', 'สวนน้ำ', 'ดำน้ำ', 'ปีนเขา', 'แคมป์',
    'โรงแรม', 'ที่พัก', 'รีสอร์ท', 'ตั๋วเข้าชม', 'พิพิธภัณฑ์',
    'steam', 'playstation', 'nintendo', 'xbox',
    'งานเลี้ยง', 'ปาร์ตี้', 'party', 'สังสรรค์',
  ],

  // หมวดการศึกษา 📚
  'การศึกษา': [
    'หนังสือ', 'เรียน', 'คอร์ส', 'course', 'ค่าเรียน',
    'ค่าเทอม', 'ติว', 'สอบ', 'อบรม', 'สัมมนา',
    'workshop', 'udemy', 'coursera', 'skillshare',
    'เครื่องเขียน', 'ปากกา', 'สมุด', 'ดินสอ',
  ],
};

// คีย์เวิร์ดสำหรับรายรับ (Income keywords)
const INCOME_KEYWORDS = {
  'เงินเดือน': ['เงินเดือน', 'salary', 'เดือน'],
  'รายได้เสริม': ['รายได้เสริม', 'ฟรีแลนซ์', 'freelance', 'พาร์ทไทม์', 'ค่าจ้าง', 'โบนัส', 'bonus', 'ค่าล่วงเวลา', 'OT'],
  'ของขวัญ': ['ของขวัญ', 'gift', 'อั่งเปา', 'ซองแดง', 'ให้', 'ปันผล'],
};

/**
 * แปลงข้อความ LINE เป็นข้อมูลการเงินหรือคำสั่ง
 * @param {string} text - ข้อความจากผู้ใช้
 * @returns {Object} ผลลัพธ์ที่แปลงแล้ว
 *
 * @example
 * parseMessage('จ่าย ข้าวเที่ยง 80')
 * // => { type: 'expense', description: 'ข้าวเที่ยง', amount: 80, category: 'อาหาร' }
 *
 * parseMessage('สรุป')
 * // => { command: 'summary_today' }
 */
function parseMessage(text) {
  // ตัดช่องว่างหัวท้าย และแปลงเป็นตัวพิมพ์เล็ก (สำหรับเทียบภาษาอังกฤษ)
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // ===========================
  // ตรวจสอบคำสั่ง (Commands)
  // ===========================
  if (lower === 'สรุป' || lower === 'สรุปวันนี้') {
    return { command: 'summary_today' };
  }

  if (lower === 'สรุปเดือน' || lower === 'สรุปเดือนนี้') {
    return { command: 'summary_month' };
  }

  if (lower === 'สรุปสัปดาห์' || lower === 'สรุปอาทิตย์' || lower === 'สรุปอาทิตย์นี้') {
    return { command: 'summary_week' };
  }

  if (lower === 'ลบล่าสุด' || lower === 'ลบ' || lower === 'undo') {
    return { command: 'delete_last' };
  }

  if (lower === 'หมวดหมู่' || lower === 'หมวด' || lower === 'categories') {
    return { command: 'categories' };
  }

  if (lower === 'ช่วยเหลือ' || lower === 'help' || lower === 'วิธีใช้' || lower === 'คำสั่ง') {
    return { command: 'help' };
  }

  if (lower === 'งบ' || lower === 'งบประมาณ' || lower === 'budget') {
    return { command: 'budget' };
  }

  if (lower.startsWith('เทรนด์') || lower.startsWith('trend')) {
    return { command: 'trend' };
  }

  // ===========================
  // ตรวจสอบรายจ่าย (Expense)
  // รูปแบบ: จ่าย <รายละเอียด> <จำนวนเงิน>
  // หรือ:   <รายละเอียด> <จำนวนเงิน> (ถ้าไม่มีคำนำหน้า ถือเป็นรายจ่าย)
  // ===========================
  const expenseMatch = trimmed.match(
    /^(?:จ่าย|ใช้|ซื้อ|expense)\s+(.+?)\s+(\d+(?:\.\d{1,2})?)\s*(?:บาท)?$/i
  );

  if (expenseMatch) {
    const description = expenseMatch[1].trim();
    const amount = parseFloat(expenseMatch[2]);
    const category = detectExpenseCategory(description);

    return {
      type: 'expense',
      description,
      amount,
      category,
    };
  }

  // ===========================
  // ตรวจสอบรายรับ (Income)
  // รูปแบบ: รับ <รายละเอียด> <จำนวนเงิน>
  // ===========================
  const incomeMatch = trimmed.match(
    /^(?:รับ|ได้|income|เงินเข้า)\s+(.+?)\s+(\d+(?:\.\d{1,2})?)\s*(?:บาท)?$/i
  );

  if (incomeMatch) {
    const description = incomeMatch[1].trim();
    const amount = parseFloat(incomeMatch[2]);
    const category = detectIncomeCategory(description);

    return {
      type: 'income',
      description,
      amount,
      category,
    };
  }

  // ===========================
  // ตรวจสอบการตั้งงบประมาณ
  // รูปแบบ: ตั้งงบ <หมวดหมู่> <จำนวนเงิน>
  // ===========================
  const budgetMatch = trimmed.match(
    /^(?:ตั้งงบ|งบ)\s+(.+?)\s+(\d+(?:\.\d{1,2})?)\s*(?:บาท)?$/i
  );

  if (budgetMatch) {
    const category = budgetMatch[1].trim();
    const amount = parseFloat(budgetMatch[2]);

    return {
      command: 'set_budget',
      category,
      amount,
    };
  }

  // ===========================
  // รูปแบบย่อ: <รายละเอียด> <จำนวนเงิน>
  // (ถ้าไม่มี prefix จะถือเป็นรายจ่ายอัตโนมัติ)
  // ===========================
  const shortMatch = trimmed.match(
    /^(.+?)\s+(\d+(?:\.\d{1,2})?)\s*(?:บาท)?$/
  );

  if (shortMatch) {
    const description = shortMatch[1].trim();
    const amount = parseFloat(shortMatch[2]);

    // ตรวจว่าส่วน description ไม่ใช่ตัวเลขล้วนๆ
    if (!/^\d+$/.test(description) && amount > 0) {
      const category = detectExpenseCategory(description);
      return {
        type: 'expense',
        description,
        amount,
        category,
      };
    }
  }

  // ไม่ตรงกับรูปแบบใดเลย
  return { command: 'unknown', originalText: trimmed };
}

/**
 * ตรวจจับหมวดหมู่รายจ่ายจากคำอธิบาย
 * @param {string} description - คำอธิบายรายจ่าย
 * @returns {string} ชื่อหมวดหมู่
 */
function detectExpenseCategory(description) {
  const lower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // ถ้าหาไม่เจอ ใช้หมวด "อื่นๆ"
  return 'อื่นๆ';
}

/**
 * ตรวจจับหมวดหมู่รายรับจากคำอธิบาย
 * @param {string} description - คำอธิบายรายรับ
 * @returns {string} ชื่อหมวดหมู่
 */
function detectIncomeCategory(description) {
  const lower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(INCOME_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // ถ้าหาไม่เจอ ใช้หมวด "อื่นๆ"
  return 'อื่นๆ';
}

module.exports = {
  parseMessage,
  detectExpenseCategory,
  detectIncomeCategory,
};
