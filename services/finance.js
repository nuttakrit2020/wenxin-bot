/**
 * services/finance.js
 * ============================================================
 * บริการจัดการข้อมูลการเงิน (Finance Service)
 * - CRUD สำหรับรายรับ-รายจ่าย
 * - สรุปรายวัน / รายสัปดาห์ / รายเดือน
 * - งบประมาณ (Budget)
 * - แนวโน้ม (Trend)
 * ============================================================
 */

const { getDb } = require('../database/db');

// =============================================
// Utility: สร้างวันที่ในเขตเวลากรุงเทพ
// =============================================

/**
 * ดึงวันที่ปัจจุบันในเขตเวลา Asia/Bangkok
 * @returns {string} วันที่ในรูปแบบ YYYY-MM-DD
 */
function getTodayBangkok() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

/**
 * ดึงวันแรกของสัปดาห์ (จันทร์) ในเขตเวลา Bangkok
 * @returns {string} วันที่ในรูปแบบ YYYY-MM-DD
 */
function getWeekStartBangkok() {
  const now = new Date();
  const bangkokStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const bangkokDate = new Date(bangkokStr + 'T00:00:00');
  const day = bangkokDate.getDay(); // 0=อาทิตย์, 1=จันทร์, ...
  const diff = day === 0 ? 6 : day - 1; // ปรับให้จันทร์เป็นวันแรก
  bangkokDate.setDate(bangkokDate.getDate() - diff);
  return bangkokDate.toLocaleDateString('en-CA');
}

/**
 * ดึงปีและเดือนปัจจุบันในเขตเวลา Bangkok
 * @returns {{ year: number, month: number }}
 */
function getCurrentYearMonth() {
  const now = new Date();
  const parts = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).split('-');
  return { year: parseInt(parts[0]), month: parseInt(parts[1]) };
}

// =============================================
// CRUD Operations
// =============================================

/**
 * เพิ่มรายการรายรับ/รายจ่าย
 * @param {string} type - 'income' หรือ 'expense'
 * @param {number} amount - จำนวนเงิน
 * @param {string} category - หมวดหมู่
 * @param {string} description - รายละเอียด
 * @param {string} [date] - วันที่ (ถ้าไม่ระบุจะใช้วันนี้)
 * @returns {Object} รายการที่เพิ่ม
 */
function addTransaction(type, amount, category, description, date) {
  const db = getDb();
  const txDate = date || getTodayBangkok();

  const stmt = db.prepare(`
    INSERT INTO transactions (type, amount, category, description, date)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(type, amount, category, description, txDate);

  return {
    id: result.lastInsertRowid,
    type,
    amount,
    category,
    description,
    date: txDate,
  };
}

/**
 * ลบรายการล่าสุด
 * @returns {Object|null} รายการที่ถูกลบ หรือ null ถ้าไม่มี
 */
function deleteLastTransaction() {
  const db = getDb();

  // ดึงรายการล่าสุดก่อน
  const last = db.prepare(
    'SELECT * FROM transactions ORDER BY id DESC LIMIT 1'
  ).get();

  if (!last) return null;

  // ลบรายการ
  db.prepare('DELETE FROM transactions WHERE id = ?').run(last.id);

  return last;
}

/**
 * ลบรายการตาม ID
 * @param {number} id - ID ของรายการ
 * @returns {boolean} สำเร็จหรือไม่
 */
function deleteTransaction(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return result.changes > 0;
}

// =============================================
// Query: ดึงรายการ (Get transactions)
// =============================================

/**
 * ดึงรายการวันนี้
 * @returns {Array} รายการทั้งหมดของวันนี้
 */
function getToday() {
  const db = getDb();
  const today = getTodayBangkok();
  return db.prepare(
    'SELECT * FROM transactions WHERE date = ? ORDER BY id DESC'
  ).all(today);
}

/**
 * ดึงรายการสัปดาห์นี้
 * @returns {Array} รายการทั้งหมดของสัปดาห์นี้
 */
function getWeek() {
  const db = getDb();
  const weekStart = getWeekStartBangkok();
  const today = getTodayBangkok();
  return db.prepare(
    'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, id DESC'
  ).all(weekStart, today);
}

/**
 * ดึงรายการเดือนที่ระบุ
 * @param {number} year - ปี
 * @param {number} month - เดือน (1-12)
 * @returns {Array} รายการทั้งหมดของเดือนที่ระบุ
 */
function getMonth(year, month) {
  const db = getDb();
  const ym = year && month
    ? { year, month }
    : getCurrentYearMonth();

  const monthStr = String(ym.month).padStart(2, '0');
  const prefix = `${ym.year}-${monthStr}`;

  return db.prepare(
    "SELECT * FROM transactions WHERE date LIKE ? || '%' ORDER BY date DESC, id DESC"
  ).all(prefix);
}

/**
 * ดึงรายการพร้อม pagination และ filter
 * @param {Object} options - ตัวเลือก
 * @returns {{ data: Array, total: number, page: number, limit: number }}
 */
function getTransactions({ page = 1, limit = 20, type, category, startDate, endDate } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (startDate) {
    conditions.push('date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('date <= ?');
    params.push(endDate);
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  const offset = (page - 1) * limit;

  const total = db.prepare(
    `SELECT COUNT(*) as cnt FROM transactions ${whereClause}`
  ).get(...params).cnt;

  const data = db.prepare(
    `SELECT * FROM transactions ${whereClause} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { data, total, page, limit };
}

// =============================================
// Summary: สรุปรายรับ-รายจ่าย
// =============================================

/**
 * สร้างสรุปจากรายการ
 * @param {Array} transactions - รายการทั้งหมด
 * @returns {Object} สรุป
 */
function buildSummary(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory = {};

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }

    // รวมตามหมวดหมู่
    if (!byCategory[tx.category]) {
      byCategory[tx.category] = { income: 0, expense: 0, count: 0 };
    }
    byCategory[tx.category][tx.type] += tx.amount;
    byCategory[tx.category].count++;
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: transactions.length,
    byCategory,
    transactions,
  };
}

/**
 * สรุปรายรับ-รายจ่ายวันนี้
 * @returns {Object} สรุปวันนี้
 */
function getSummaryToday() {
  const transactions = getToday();
  return { ...buildSummary(transactions), date: getTodayBangkok() };
}

/**
 * สรุปรายรับ-รายจ่ายสัปดาห์นี้
 * @returns {Object} สรุปสัปดาห์
 */
function getSummaryWeek() {
  const transactions = getWeek();
  return {
    ...buildSummary(transactions),
    weekStart: getWeekStartBangkok(),
    weekEnd: getTodayBangkok(),
  };
}

/**
 * สรุปรายรับ-รายจ่ายเดือนที่ระบุ
 * @param {number} [year] - ปี
 * @param {number} [month] - เดือน
 * @returns {Object} สรุปเดือน
 */
function getSummaryMonth(year, month) {
  const ym = year && month
    ? { year, month }
    : getCurrentYearMonth();

  const transactions = getMonth(ym.year, ym.month);
  return {
    ...buildSummary(transactions),
    year: ym.year,
    month: ym.month,
  };
}

// =============================================
// Trend & Analytics
// =============================================

/**
 * ดึงแนวโน้มรายเดือนย้อนหลัง N เดือน
 * @param {number} [months=6] - จำนวนเดือนย้อนหลัง
 * @returns {Array} แนวโน้มรายเดือน
 */
function getMonthlyTrend(months = 6) {
  const db = getDb();
  const results = [];

  for (let i = 0; i < months; i++) {
    const now = new Date();
    // คำนวณเดือนย้อนหลัง
    now.setMonth(now.getMonth() - i);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    const income = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date LIKE ? || '%'"
    ).get(prefix).total;

    const expense = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date LIKE ? || '%'"
    ).get(prefix).total;

    results.push({
      year,
      month,
      label: `${monthStr}/${year}`,
      income,
      expense,
      balance: income - expense,
    });
  }

  // เรียงจากเก่าไปใหม่
  return results.reverse();
}

/**
 * แยกรายจ่ายตามหมวดหมู่ของเดือนที่ระบุ
 * @param {number} [year] - ปี
 * @param {number} [month] - เดือน
 * @returns {Array} ข้อมูลแยกตามหมวดหมู่
 */
function getCategoryBreakdown(year, month) {
  const db = getDb();
  const ym = year && month
    ? { year, month }
    : getCurrentYearMonth();

  const monthStr = String(ym.month).padStart(2, '0');
  const prefix = `${ym.year}-${monthStr}`;

  const rows = db.prepare(`
    SELECT category, type, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE date LIKE ? || '%'
    GROUP BY category, type
    ORDER BY total DESC
  `).all(prefix);

  return rows.map(row => ({
    category: row.category,
    type: row.type,
    total: row.total,
    count: row.count,
  }));
}

// =============================================
// Budget: งบประมาณ
// =============================================

/**
 * ตั้งงบประมาณสำหรับหมวดหมู่
 * @param {string} category - หมวดหมู่
 * @param {number} amount - จำนวนเงิน
 * @param {string} [month] - เดือน (YYYY-MM) ถ้าไม่ระบุจะใช้เดือนปัจจุบัน
 * @returns {Object} งบประมาณที่ตั้ง
 */
function setBudget(category, amount, month) {
  const db = getDb();
  const ym = getCurrentYearMonth();
  const budgetMonth = month || `${ym.year}-${String(ym.month).padStart(2, '0')}`;

  // UPSERT: ถ้ามีอยู่แล้วให้อัพเดท
  db.prepare(`
    INSERT INTO budgets (category, amount, month)
    VALUES (?, ?, ?)
    ON CONFLICT(category, month) DO UPDATE SET amount = excluded.amount
  `).run(category, amount, budgetMonth);

  return { category, amount, month: budgetMonth };
}

/**
 * ดึงงบประมาณของเดือนที่ระบุ พร้อมข้อมูลการใช้จ่ายจริง
 * @param {string} [month] - เดือน (YYYY-MM)
 * @returns {Array} งบประมาณพร้อมยอดใช้จ่ายจริง
 */
function getBudget(month) {
  const db = getDb();
  const ym = getCurrentYearMonth();
  const budgetMonth = month || `${ym.year}-${String(ym.month).padStart(2, '0')}`;

  const budgets = db.prepare(
    'SELECT * FROM budgets WHERE month = ? ORDER BY category'
  ).all(budgetMonth);

  // หาจำนวนที่ใช้จ่ายจริงในแต่ละหมวด
  return budgets.map(budget => {
    const spent = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'expense' AND category = ? AND date LIKE ? || '%'
    `).get(budget.category, budgetMonth).total;

    return {
      ...budget,
      spent,
      remaining: budget.amount - spent,
      percentage: budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
    };
  });
}

// =============================================
// Categories
// =============================================

/**
 * ดึงหมวดหมู่ทั้งหมด
 * @returns {Array} หมวดหมู่ทั้งหมด
 */
function getCategories() {
  const db = getDb();
  return db.prepare('SELECT * FROM categories ORDER BY type, id').all();
}

module.exports = {
  addTransaction,
  deleteLastTransaction,
  deleteTransaction,
  getToday,
  getWeek,
  getMonth,
  getTransactions,
  getSummaryToday,
  getSummaryWeek,
  getSummaryMonth,
  getMonthlyTrend,
  getCategoryBreakdown,
  setBudget,
  getBudget,
  getCategories,
};
