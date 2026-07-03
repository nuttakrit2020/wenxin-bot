/**
 * services/line.js
 * ============================================================
 * บริการส่งข้อความ LINE (LINE Messaging Service)
 * - ตอบกลับ (Reply) และส่งข้อความ (Push)
 * - สร้าง Flex Message สำหรับรายการและสรุป
 * - LINE Notify สำหรับแจ้งเตือนอัตโนมัติ
 * ============================================================
 */

const line = require('@line/bot-sdk');
const https = require('https');
const querystring = require('querystring');

// LINE Messaging API Client
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// =============================================
// Utility: จัดรูปแบบตัวเลข
// =============================================

/**
 * จัดรูปแบบจำนวนเงินเป็น Thai Baht พร้อม comma
 * @param {number} amount - จำนวนเงิน
 * @returns {string} เช่น '฿15,000.00'
 */
function formatBaht(amount) {
  return '฿' + amount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * จัดรูปแบบจำนวนเงินแบบสั้น (ไม่มีทศนิยมถ้าไม่จำเป็น)
 * @param {number} amount
 * @returns {string} เช่น '฿15,000'
 */
function formatBahtShort(amount) {
  if (amount % 1 === 0) {
    return '฿' + amount.toLocaleString('th-TH');
  }
  return formatBaht(amount);
}

/**
 * ดึง emoji ของหมวดหมู่
 * @param {string} category
 * @returns {string}
 */
function getCategoryEmoji(category) {
  const emojiMap = {
    'อาหาร': '🍜',
    'เดินทาง': '🚗',
    'ค่าบริการ': '📱',
    'ช้อปปิ้ง': '🛒',
    'สุขภาพ': '💊',
    'บันเทิง': '🎮',
    'การศึกษา': '📚',
    'เงินเดือน': '💰',
    'รายได้เสริม': '💵',
    'ของขวัญ': '🎁',
    'อื่นๆ': '📌',
  };
  return emojiMap[category] || '📌';
}

// =============================================
// LINE Messaging: ส่งข้อความ
// =============================================

/**
 * ตอบกลับข้อความผ่าน Reply Token
 * @param {string} replyToken - Reply token จาก LINE webhook
 * @param {Array|Object} messages - ข้อความ (หรือ array ของข้อความ)
 */
async function replyMessage(replyToken, messages) {
  try {
    const msgArray = Array.isArray(messages) ? messages : [messages];
    await client.replyMessage({
      replyToken,
      messages: msgArray,
    });
  } catch (error) {
    console.error('❌ ส่งข้อความตอบกลับไม่สำเร็จ:', error.message);
  }
}

/**
 * ส่งข้อความหาผู้ใช้โดยตรง (Push Message)
 * @param {string} userId - LINE User ID
 * @param {Array|Object} messages - ข้อความ
 */
async function pushMessage(userId, messages) {
  try {
    const msgArray = Array.isArray(messages) ? messages : [messages];
    await client.pushMessage({
      to: userId,
      messages: msgArray,
    });
  } catch (error) {
    console.error('❌ ส่ง Push Message ไม่สำเร็จ:', error.message);
  }
}

/**
 * ส่งข้อความผ่าน LINE Notify
 * @param {string} message - ข้อความที่ต้องการส่ง
 */
function sendNotify(message) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token || token === 'your_notify_token_here') {
    console.log('⚠️ LINE Notify Token ยังไม่ได้ตั้งค่า — ข้ามการส่ง Notify');
    return;
  }

  const postData = querystring.stringify({ message });

  const options = {
    hostname: 'notify-api.line.me',
    path: '/api/notify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    if (res.statusCode !== 200) {
      console.error(`❌ LINE Notify ส่งไม่สำเร็จ (status: ${res.statusCode})`);
    }
  });

  req.on('error', (error) => {
    console.error('❌ LINE Notify error:', error.message);
  });

  req.write(postData);
  req.end();
}

// =============================================
// Flex Messages: สร้างข้อความแบบ Rich
// =============================================

/**
 * สร้าง Flex Message สำหรับแสดงรายการที่เพิ่ม
 * @param {Object} transaction - ข้อมูลรายการ
 * @returns {Object} Flex Message object
 */
function buildTransactionFlex(transaction) {
  const isExpense = transaction.type === 'expense';
  const typeLabel = isExpense ? '💸 รายจ่าย' : '💰 รายรับ';
  const color = isExpense ? '#E74C3C' : '#27AE60';
  const emoji = getCategoryEmoji(transaction.category);

  return {
    type: 'flex',
    altText: `${typeLabel}: ${transaction.description} ${formatBahtShort(transaction.amount)}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: color,
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: isExpense ? '📝 บันทึกรายจ่าย' : '📝 บันทึกรายรับ',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'md',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: `${emoji} ${transaction.category}`,
            size: 'sm',
            color: '#888888',
          },
          {
            type: 'text',
            text: transaction.description,
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'text',
            text: formatBaht(transaction.amount),
            size: 'xxl',
            weight: 'bold',
            color: color,
            align: 'end',
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'text',
            text: `📅 ${transaction.date}`,
            size: 'xs',
            color: '#AAAAAA',
            margin: 'md',
          },
        ],
      },
    },
  };
}

/**
 * สร้าง Flex Message สำหรับแสดงสรุป
 * @param {Object} summary - ข้อมูลสรุป
 * @param {string} title - หัวข้อ เช่น 'สรุปวันนี้'
 * @returns {Object} Flex Message object
 */
function buildSummaryFlex(summary, title) {
  // สร้างรายการหมวดหมู่ (แสดงเฉพาะ expense)
  const categoryItems = [];
  for (const [cat, data] of Object.entries(summary.byCategory || {})) {
    if (data.expense > 0) {
      const emoji = getCategoryEmoji(cat);
      categoryItems.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: `${emoji} ${cat}`,
            size: 'sm',
            color: '#555555',
            flex: 4,
          },
          {
            type: 'text',
            text: formatBahtShort(data.expense),
            size: 'sm',
            color: '#E74C3C',
            align: 'end',
            flex: 3,
          },
        ],
      });
    }
  }

  // ถ้าไม่มีข้อมูลเลย
  if (summary.transactionCount === 0) {
    return {
      type: 'text',
      text: `📊 ${title}\n\n📭 ยังไม่มีรายการ\n\nพิมพ์ "จ่าย ข้าวเที่ยง 80" เพื่อเริ่มบันทึก 💡`,
    };
  }

  const bodyContents = [
    // รายรับ
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '💰 รายรับ', size: 'md', color: '#555555', flex: 4 },
        { type: 'text', text: formatBahtShort(summary.totalIncome), size: 'md', color: '#27AE60', weight: 'bold', align: 'end', flex: 3 },
      ],
    },
    // รายจ่าย
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '💸 รายจ่าย', size: 'md', color: '#555555', flex: 4 },
        { type: 'text', text: formatBahtShort(summary.totalExpense), size: 'md', color: '#E74C3C', weight: 'bold', align: 'end', flex: 3 },
      ],
    },
    { type: 'separator', margin: 'lg' },
    // คงเหลือ
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'lg',
      contents: [
        { type: 'text', text: '📊 คงเหลือ', size: 'lg', weight: 'bold', flex: 4 },
        {
          type: 'text',
          text: formatBahtShort(summary.balance),
          size: 'lg',
          weight: 'bold',
          color: summary.balance >= 0 ? '#27AE60' : '#E74C3C',
          align: 'end',
          flex: 3,
        },
      ],
    },
  ];

  // เพิ่มรายละเอียดหมวดหมู่ (ถ้ามี)
  if (categoryItems.length > 0) {
    bodyContents.push({ type: 'separator', margin: 'lg' });
    bodyContents.push({
      type: 'text',
      text: '📋 รายจ่ายตามหมวดหมู่',
      size: 'sm',
      weight: 'bold',
      color: '#888888',
      margin: 'lg',
    });
    bodyContents.push(...categoryItems);
  }

  return {
    type: 'flex',
    altText: `${title}: รายรับ ${formatBahtShort(summary.totalIncome)} | รายจ่าย ${formatBahtShort(summary.totalExpense)}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#2C3E50',
        paddingAll: '15px',
        contents: [
          {
            type: 'text',
            text: `📊 ${title}`,
            color: '#FFFFFF',
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: `${summary.transactionCount} รายการ`,
            color: '#B0BEC5',
            size: 'xs',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '15px',
        contents: bodyContents,
      },
    },
  };
}

/**
 * สร้างข้อความช่วยเหลือ (Help message)
 * @returns {Object} Text message object
 */
function buildHelpMessage() {
  const helpText = [
    '📖 วิธีใช้งาน LINE Finance Tracker',
    '━━━━━━━━━━━━━━━━━━━',
    '',
    '💸 บันทึกรายจ่าย:',
    '  • จ่าย ข้าวเที่ยง 80',
    '  • จ่าย ค่าแท็กซี่ 150',
    '  • ซื้อ กาแฟ 65',
    '  • กาแฟ 65  (แบบสั้น)',
    '',
    '💰 บันทึกรายรับ:',
    '  • รับ เงินเดือน 15000',
    '  • ได้ โบนัส 5000',
    '',
    '📊 ดูสรุป:',
    '  • สรุป — สรุปวันนี้',
    '  • สรุปสัปดาห์ — สรุปสัปดาห์นี้',
    '  • สรุปเดือน — สรุปเดือนนี้',
    '',
    '🗂 อื่นๆ:',
    '  • ลบล่าสุด — ลบรายการล่าสุด',
    '  • หมวดหมู่ — ดูหมวดหมู่ทั้งหมด',
    '  • ตั้งงบ อาหาร 3000 — ตั้งงบประมาณ',
    '  • งบ — ดูงบประมาณเดือนนี้',
    '',
    '💡 ระบบจะจัดหมวดหมู่ให้อัตโนมัติ!',
  ].join('\n');

  return { type: 'text', text: helpText };
}

/**
 * สร้างข้อความแสดงหมวดหมู่ทั้งหมด
 * @param {Array} categories - รายการหมวดหมู่
 * @returns {Object} Text message object
 */
function buildCategoriesMessage(categories) {
  const expenseCategories = categories
    .filter(c => c.type === 'expense')
    .map(c => `  ${c.icon} ${c.name}`)
    .join('\n');

  const incomeCategories = categories
    .filter(c => c.type === 'income')
    .map(c => `  ${c.icon} ${c.name}`)
    .join('\n');

  const text = [
    '🗂 หมวดหมู่ทั้งหมด',
    '━━━━━━━━━━━━━━━━━━━',
    '',
    '💸 รายจ่าย:',
    expenseCategories,
    '',
    '💰 รายรับ:',
    incomeCategories,
  ].join('\n');

  return { type: 'text', text };
}

/**
 * สร้างข้อความแสดงรายการที่ถูกลบ
 * @param {Object} transaction - รายการที่ถูกลบ
 * @returns {Object} Text message object
 */
function buildDeleteMessage(transaction) {
  const typeLabel = transaction.type === 'expense' ? '💸 รายจ่าย' : '💰 รายรับ';
  const emoji = getCategoryEmoji(transaction.category);

  return {
    type: 'text',
    text: [
      '🗑 ลบรายการล่าสุดเรียบร้อย!',
      '',
      `${typeLabel}`,
      `${emoji} ${transaction.category}`,
      `📝 ${transaction.description}`,
      `💵 ${formatBaht(transaction.amount)}`,
      `📅 ${transaction.date}`,
    ].join('\n'),
  };
}

/**
 * สร้างข้อความแสดงงบประมาณ
 * @param {Array} budgets - รายการงบประมาณ
 * @returns {Object} Text/Flex message object
 */
function buildBudgetMessage(budgets) {
  if (budgets.length === 0) {
    return {
      type: 'text',
      text: '📋 ยังไม่ได้ตั้งงบประมาณเดือนนี้\n\nพิมพ์ "ตั้งงบ อาหาร 3000" เพื่อเริ่มตั้งงบ 💡',
    };
  }

  const lines = ['💰 งบประมาณเดือนนี้', '━━━━━━━━━━━━━━━━━━━', ''];

  for (const b of budgets) {
    const emoji = getCategoryEmoji(b.category);
    const bar = buildProgressBar(b.percentage);
    const status = b.percentage >= 100 ? '🔴' : b.percentage >= 80 ? '🟡' : '🟢';

    lines.push(`${emoji} ${b.category}`);
    lines.push(`${bar} ${b.percentage}%`);
    lines.push(`ใช้ไป ${formatBahtShort(b.spent)} / ${formatBahtShort(b.amount)} ${status}`);
    lines.push('');
  }

  return { type: 'text', text: lines.join('\n') };
}

/**
 * สร้าง progress bar แบบ text
 * @param {number} percentage - เปอร์เซ็นต์ (0-100+)
 * @returns {string}
 */
function buildProgressBar(percentage) {
  const total = 10;
  const filled = Math.min(Math.round((percentage / 100) * total), total);
  const empty = total - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
  config,
  client,
  replyMessage,
  pushMessage,
  sendNotify,
  buildTransactionFlex,
  buildSummaryFlex,
  buildHelpMessage,
  buildCategoriesMessage,
  buildDeleteMessage,
  buildBudgetMessage,
  formatBaht,
  formatBahtShort,
};
