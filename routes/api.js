/**
 * routes/api.js
 * ============================================================
 * REST API Routes สำหรับ Dashboard / Frontend
 * - สรุปรายรับ-รายจ่าย (วัน/สัปดาห์/เดือน)
 * - CRUD รายการ
 * - หมวดหมู่ / แนวโน้ม / งบประมาณ
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const financeService = require('../services/finance');

// =============================================
// Summary Endpoints: สรุปรายรับ-รายจ่าย
// =============================================

/**
 * GET /api/summary/today
 * สรุปรายรับ-รายจ่ายวันนี้
 */
router.get('/summary/today', (req, res) => {
  try {
    const summary = financeService.getSummaryToday();
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('❌ API error (summary/today):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงสรุปวันนี้' });
  }
});

/**
 * GET /api/summary/week
 * สรุปรายรับ-รายจ่ายสัปดาห์นี้
 */
router.get('/summary/week', (req, res) => {
  try {
    const summary = financeService.getSummaryWeek();
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('❌ API error (summary/week):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงสรุปสัปดาห์' });
  }
});

/**
 * GET /api/summary/month?year=2026&month=7
 * สรุปรายรับ-รายจ่ายเดือนที่ระบุ (ถ้าไม่ระบุจะใช้เดือนปัจจุบัน)
 */
router.get('/summary/month', (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const month = req.query.month ? parseInt(req.query.month) : undefined;

    // ตรวจสอบความถูกต้องของข้อมูล
    if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
      return res.status(400).json({ success: false, error: 'ปีไม่ถูกต้อง (2000-2100)' });
    }
    if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
      return res.status(400).json({ success: false, error: 'เดือนไม่ถูกต้อง (1-12)' });
    }

    const summary = financeService.getSummaryMonth(year, month);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('❌ API error (summary/month):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงสรุปเดือน' });
  }
});

// =============================================
// Transaction Endpoints: จัดการรายการ
// =============================================

/**
 * GET /api/transactions?page=1&limit=20&type=expense&category=อาหาร&startDate=2026-07-01&endDate=2026-07-31
 * ดึงรายการทั้งหมดพร้อม pagination และ filter
 */
router.get('/transactions', (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
      category,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // ตรวจสอบ pagination
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ success: false, error: 'หมายเลขหน้าไม่ถูกต้อง' });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ success: false, error: 'จำนวนต่อหน้าต้องอยู่ระหว่าง 1-100' });
    }

    // ตรวจสอบ type
    if (type && !['income', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, error: 'ประเภทต้องเป็น income หรือ expense' });
    }

    const result = financeService.getTransactions({
      page: pageNum,
      limit: limitNum,
      type,
      category,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    console.error('❌ API error (transactions):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงรายการ' });
  }
});

/**
 * POST /api/transactions
 * เพิ่มรายการใหม่
 *
 * Body: { type, amount, category, description, date? }
 */
router.post('/transactions', (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, error: 'ประเภทต้องเป็น income หรือ expense' });
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'จำนวนเงินต้องมากกว่า 0' });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ success: false, error: 'กรุณาระบุรายละเอียด' });
    }

    // ตรวจสอบรูปแบบวันที่ (ถ้าระบุ)
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD' });
    }

    const transaction = financeService.addTransaction(
      type,
      parseFloat(amount),
      category || 'อื่นๆ',
      description.trim(),
      date
    );

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('❌ API error (POST transactions):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการเพิ่มรายการ' });
  }
});

/**
 * DELETE /api/transactions/:id
 * ลบรายการตาม ID
 */
router.delete('/transactions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'ID ไม่ถูกต้อง' });
    }

    const deleted = financeService.deleteTransaction(id);

    if (deleted) {
      res.json({ success: true, message: 'ลบรายการเรียบร้อย' });
    } else {
      res.status(404).json({ success: false, error: 'ไม่พบรายการที่ต้องการลบ' });
    }
  } catch (error) {
    console.error('❌ API error (DELETE transactions):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการลบรายการ' });
  }
});

// =============================================
// Categories Endpoint: หมวดหมู่
// =============================================

/**
 * GET /api/categories
 * ดึงหมวดหมู่ทั้งหมด
 */
router.get('/categories', (req, res) => {
  try {
    const categories = financeService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('❌ API error (categories):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงหมวดหมู่' });
  }
});

// =============================================
// Analytics Endpoints: วิเคราะห์
// =============================================

/**
 * GET /api/trend?months=6
 * ดึงแนวโน้มรายเดือนย้อนหลัง
 */
router.get('/trend', (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;

    if (months < 1 || months > 24) {
      return res.status(400).json({ success: false, error: 'จำนวนเดือนต้องอยู่ระหว่าง 1-24' });
    }

    const trend = financeService.getMonthlyTrend(months);
    res.json({ success: true, data: trend });
  } catch (error) {
    console.error('❌ API error (trend):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงแนวโน้ม' });
  }
});

/**
 * GET /api/category-breakdown?year=2026&month=7
 * แยกรายจ่ายตามหมวดหมู่
 */
router.get('/category-breakdown', (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const month = req.query.month ? parseInt(req.query.month) : undefined;

    const breakdown = financeService.getCategoryBreakdown(year, month);
    res.json({ success: true, data: breakdown });
  } catch (error) {
    console.error('❌ API error (category-breakdown):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่' });
  }
});

// =============================================
// Budget Endpoints: งบประมาณ
// =============================================

/**
 * GET /api/budget?month=2026-07
 * ดึงงบประมาณของเดือนที่ระบุ
 */
router.get('/budget', (req, res) => {
  try {
    const month = req.query.month;
    const budgets = financeService.getBudget(month);
    res.json({ success: true, data: budgets });
  } catch (error) {
    console.error('❌ API error (GET budget):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงงบประมาณ' });
  }
});

/**
 * POST /api/budget
 * ตั้งงบประมาณสำหรับหมวดหมู่
 *
 * Body: { category, amount, month? }
 */
router.post('/budget', (req, res) => {
  try {
    const { category, amount, month } = req.body;

    if (!category || category.trim() === '') {
      return res.status(400).json({ success: false, error: 'กรุณาระบุหมวดหมู่' });
    }
    if (!amount || isNaN(amount) || parseFloat(amount) < 0) {
      return res.status(400).json({ success: false, error: 'จำนวนเงินต้องมากกว่าหรือเท่ากับ 0' });
    }
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: 'รูปแบบเดือนต้องเป็น YYYY-MM' });
    }

    const result = financeService.setBudget(
      category.trim(),
      parseFloat(amount),
      month
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ API error (POST budget):', error.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการตั้งงบประมาณ' });
  }
});

module.exports = router;
