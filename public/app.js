/* ===================================================================
   💰 Money Tracker — Dashboard JavaScript
   =================================================================== */

(() => {
    'use strict';

    // ─── Configuration ───────────────────────────────────────────────
    const API_BASE = '';                      // same-origin
    const REFRESH_INTERVAL = 30_000;          // 30 seconds auto-refresh
    const TOAST_DURATION = 3500;              // ms
    const COUNTER_DURATION = 800;             // ms for animated counter
    const TRANSACTIONS_LIMIT = 20;

    // ─── Category Emoji Map ──────────────────────────────────────────
    const CATEGORY_EMOJI = {
        'เงินเดือน': '💼',
        'โบนัส': '🎁',
        'ฟรีแลนซ์': '💻',
        'ลงทุน': '📈',
        'อื่นๆ-รับ': '💰',
        'อาหาร': '🍜',
        'เดินทาง': '🚗',
        'ช้อปปิ้ง': '🛍️',
        'บันเทิง': '🎬',
        'สุขภาพ': '🏥',
        'การศึกษา': '📚',
        'ค่าบ้าน': '🏠',
        'สาธารณูปโภค': '💡',
        'อื่นๆ-จ่าย': '📦',
    };

    // Doughnut chart palette
    const CHART_COLORS = [
        '#667eea', '#764ba2', '#00d4aa', '#ff6b6b',
        '#ffd700', '#a29bfe', '#fd79a8', '#00cec9',
        '#e17055', '#74b9ff', '#55efc4', '#fab1a0',
        '#81ecec', '#dfe6e9',
    ];

    // ─── DOM References ──────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        // Header
        currentDate:        $('#currentDate'),
        // Summary
        todayIncome:        $('#todayIncome'),
        todayExpense:       $('#todayExpense'),
        todayBalance:       $('#todayBalance'),
        totalTransactions:  $('#totalTransactions'),
        // Form
        form:               $('#transactionForm'),
        txType:             $('#txType'),
        txAmount:           $('#txAmount'),
        txCategory:         $('#txCategory'),
        txDescription:      $('#txDescription'),
        submitBtn:          $('#submitBtn'),
        submitLoading:      $('#submitLoading'),
        btnText:            null, // set after DOMContentLoaded
        btnIcon:            null,
        // Charts
        trendCanvas:        $('#trendChart'),
        categoryCanvas:     $('#categoryChart'),
        trendSkeleton:      $('#trendChartSkeleton'),
        categorySkeleton:   $('#categoryChartSkeleton'),
        // Transactions
        transactionList:    $('#transactionList'),
        transactionSkeleton:$('#transactionSkeleton'),
        emptyState:         $('#emptyState'),
        refreshBtn:         $('#refreshBtn'),
        // Monthly
        monthSelector:      $('#monthSelector'),
        monthlyIncomeVal:   $('#monthlyIncomeValue'),
        monthlyExpenseVal:  $('#monthlyExpenseValue'),
        monthlyNetVal:      $('#monthlyNetValue'),
        monthlyCountVal:    $('#monthlyCountValue'),
        // Misc
        loadingOverlay:     $('#loadingOverlay'),
        toastContainer:     $('#toastContainer'),
    };

    // ─── Chart Instances ─────────────────────────────────────────────
    let trendChart = null;
    let categoryChart = null;
    let refreshTimer = null;

    // ═══════════════════════════════════════════════════════════════
    //   UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /** Format number as Thai Baht currency: ฿1,234.00 */
    function formatCurrency(amount) {
        const num = Number(amount) || 0;
        return '฿' + num.toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    /** Format number with commas (no decimals, for counts) */
    function formatNumber(n) {
        return Number(n || 0).toLocaleString('th-TH');
    }

    /** Animated counter effect */
    function animateCounter(element, target, isCurrency = true) {
        const duration = COUNTER_DURATION;
        const start = performance.now();
        const from = 0;

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const ease = 1 - Math.pow(2, -10 * progress);
            const current = from + (target - from) * ease;

            element.textContent = isCurrency ? formatCurrency(current) : formatNumber(Math.round(current));

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = isCurrency ? formatCurrency(target) : formatNumber(target);
            }
        }

        requestAnimationFrame(update);
    }

    /** Show toast notification */
    function showToast(message, type = 'info') {
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;
        dom.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, TOAST_DURATION);
    }

    /** Format date for display: "2 ก.ค. 2569" */
    function formatThaiDate(dateStr) {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    }

    /** Format short date for chart labels: "2 ก.ค." */
    function formatShortThaiDate(dateStr) {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        } catch {
            return dateStr;
        }
    }

    /** Format datetime for transaction list */
    function formatThaiDateTime(dateStr) {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    }

    /** Set current date in header */
    function setCurrentDate() {
        const now = new Date();
        dom.currentDate.textContent = now.toLocaleDateString('th-TH', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }

    /** Set default month selector value */
    function setDefaultMonth() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        dom.monthSelector.value = `${yyyy}-${mm}`;
    }

    /** API fetch helper with error handling */
    async function apiFetch(endpoint, options = {}) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.message || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err);
            throw err;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //   DATA FETCHING
    // ═══════════════════════════════════════════════════════════════

    /** Fetch today's summary and animate cards */
    async function fetchSummaryToday() {
        try {
            const data = await apiFetch('/api/summary/today');

            const income = data.income ?? 0;
            const expense = data.expense ?? 0;
            const balance = income - expense;
            const count = data.count ?? data.total ?? 0;

            animateCounter(dom.todayIncome, income, true);
            animateCounter(dom.todayExpense, expense, true);
            animateCounter(dom.todayBalance, Math.abs(balance), true);
            animateCounter(dom.totalTransactions, count, false);

            // Set balance color
            dom.todayBalance.className = 'card-value ' + (balance >= 0 ? 'positive' : 'negative');
            if (balance < 0) {
                // Prefix with minus after animation completes
                setTimeout(() => {
                    dom.todayBalance.textContent = '-' + dom.todayBalance.textContent;
                }, COUNTER_DURATION + 50);
            }
        } catch {
            dom.todayIncome.textContent = '฿0.00';
            dom.todayExpense.textContent = '฿0.00';
            dom.todayBalance.textContent = '฿0.00';
            dom.totalTransactions.textContent = '0';
        }
    }

    /** Fetch recent transactions and render list */
    async function fetchTransactions() {
        try {
            const data = await apiFetch(`/api/transactions?page=1&limit=${TRANSACTIONS_LIMIT}`);
            const transactions = data.transactions ?? data.data ?? data ?? [];

            // Hide skeleton
            if (dom.transactionSkeleton) {
                dom.transactionSkeleton.style.display = 'none';
            }

            // Clear existing items (keep skeleton hidden)
            const existingItems = dom.transactionList.querySelectorAll('.transaction-item');
            existingItems.forEach(el => el.remove());

            if (!Array.isArray(transactions) || transactions.length === 0) {
                dom.emptyState.style.display = 'block';
                return;
            }

            dom.emptyState.style.display = 'none';

            transactions.forEach((tx, i) => {
                const item = createTransactionElement(tx, i);
                dom.transactionList.appendChild(item);
            });
        } catch {
            if (dom.transactionSkeleton) {
                dom.transactionSkeleton.style.display = 'none';
            }
            dom.emptyState.style.display = 'block';
        }
    }

    /** Create a single transaction DOM element */
    function createTransactionElement(tx, index) {
        const isIncome = tx.type === 'income';
        const emoji = CATEGORY_EMOJI[tx.category] || (isIncome ? '💰' : '📦');
        const sign = isIncome ? '+' : '-';
        const amountClass = isIncome ? 'income' : 'expense';
        const typeClass = isIncome ? 'type-income' : 'type-expense';

        const div = document.createElement('div');
        div.className = `transaction-item ${typeClass}`;
        div.style.animationDelay = `${index * 0.05}s`;

        div.innerHTML = `
            <div class="tx-emoji">${emoji}</div>
            <div class="tx-details">
                <div class="tx-category">${tx.category || 'ไม่ระบุ'}</div>
                <div class="tx-description">${tx.description || '-'}</div>
            </div>
            <div class="tx-meta">
                <span class="tx-amount ${amountClass}">${sign}${formatCurrency(tx.amount)}</span>
                <span class="tx-date">${formatThaiDateTime(tx.date || tx.createdAt || tx.created_at)}</span>
            </div>
            <div class="tx-actions">
                <button class="btn btn-danger btn-delete" data-id="${tx.id ?? tx._id}" title="ลบรายการ">
                    🗑️
                </button>
            </div>
        `;

        // Bind delete event
        const deleteBtn = div.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => handleDelete(tx.id ?? tx._id, div));

        return div;
    }

    /** Fetch 7-day trend and render line chart */
    async function fetchTrend() {
        try {
            const data = await apiFetch('/api/trend?months=1');
            const trend = data.trend ?? data.data ?? data ?? [];

            // Take last 7 entries
            const last7 = trend.slice(-7);

            const labels = last7.map(d => formatShortThaiDate(d.date));
            const incomeData = last7.map(d => d.income ?? 0);
            const expenseData = last7.map(d => d.expense ?? 0);

            renderTrendChart(labels, incomeData, expenseData);

            // Hide skeleton
            dom.trendSkeleton?.classList.add('hidden');
        } catch {
            dom.trendSkeleton?.classList.add('hidden');
            renderTrendChart(
                ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0]
            );
        }
    }

    /** Fetch category breakdown and render doughnut chart */
    async function fetchCategoryBreakdown() {
        try {
            const data = await apiFetch('/api/category-breakdown');
            const breakdown = data.breakdown ?? data.data ?? data ?? [];

            const labels = breakdown.map(c => c.category || c.name || 'อื่นๆ');
            const values = breakdown.map(c => c.total ?? c.amount ?? 0);

            renderCategoryChart(labels, values);

            dom.categorySkeleton?.classList.add('hidden');
        } catch {
            dom.categorySkeleton?.classList.add('hidden');
            renderCategoryChart(['ไม่มีข้อมูล'], [1]);
        }
    }

    /** Fetch monthly summary */
    async function fetchMonthlySummary(yearMonth) {
        try {
            const [year, month] = yearMonth.split('-');
            const data = await apiFetch(`/api/summary/today?year=${year}&month=${month}`);

            const income = data.income ?? 0;
            const expense = data.expense ?? 0;
            const net = income - expense;
            const count = data.count ?? data.total ?? 0;

            animateCounter(dom.monthlyIncomeVal, income, true);
            animateCounter(dom.monthlyExpenseVal, expense, true);
            animateCounter(dom.monthlyNetVal, Math.abs(net), true);
            animateCounter(dom.monthlyCountVal, count, false);

            dom.monthlyNetVal.className = 'monthly-value ' + (net >= 0 ? 'positive' : 'negative');
            if (net < 0) {
                setTimeout(() => {
                    dom.monthlyNetVal.textContent = '-' + dom.monthlyNetVal.textContent;
                }, COUNTER_DURATION + 50);
            }
        } catch {
            dom.monthlyIncomeVal.textContent = '฿0.00';
            dom.monthlyExpenseVal.textContent = '฿0.00';
            dom.monthlyNetVal.textContent = '฿0.00';
            dom.monthlyCountVal.textContent = '0';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //   CHART RENDERING
    // ═══════════════════════════════════════════════════════════════

    function renderTrendChart(labels, incomeData, expenseData) {
        const ctx = dom.trendCanvas.getContext('2d');

        // Gradient fills
        const incomeGradient = ctx.createLinearGradient(0, 0, 0, 280);
        incomeGradient.addColorStop(0, 'rgba(0, 212, 170, 0.25)');
        incomeGradient.addColorStop(1, 'rgba(0, 212, 170, 0.01)');

        const expenseGradient = ctx.createLinearGradient(0, 0, 0, 280);
        expenseGradient.addColorStop(0, 'rgba(255, 107, 107, 0.25)');
        expenseGradient.addColorStop(1, 'rgba(255, 107, 107, 0.01)');

        const config = {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'รายรับ',
                        data: incomeData,
                        borderColor: '#00d4aa',
                        backgroundColor: incomeGradient,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5,
                        pointBackgroundColor: '#00d4aa',
                        pointBorderColor: '#0a0a1a',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        pointHoverBackgroundColor: '#00d4aa',
                        pointHoverBorderColor: '#fff',
                    },
                    {
                        label: 'รายจ่าย',
                        data: expenseData,
                        borderColor: '#ff6b6b',
                        backgroundColor: expenseGradient,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5,
                        pointBackgroundColor: '#ff6b6b',
                        pointBorderColor: '#0a0a1a',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        pointHoverBackgroundColor: '#ff6b6b',
                        pointHoverBorderColor: '#fff',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e0e0e0',
                            font: { family: "'Kanit', sans-serif", size: 12, weight: 400 },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 42, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0',
                        borderColor: 'rgba(102, 126, 234, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: 12,
                        titleFont: { family: "'Kanit', sans-serif", size: 13, weight: 600 },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        callbacks: {
                            label: (ctx) => {
                                return ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                        ticks: {
                            color: '#888',
                            font: { family: "'Kanit', sans-serif", size: 11 },
                        },
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                        ticks: {
                            color: '#888',
                            font: { family: "'Inter', sans-serif", size: 11 },
                            callback: (val) => {
                                if (val >= 1000) return `฿${(val / 1000).toFixed(0)}k`;
                                return `฿${val}`;
                            },
                        },
                        beginAtZero: true,
                    },
                },
            },
        };

        if (trendChart) {
            trendChart.data = config.data;
            trendChart.update('active');
        } else {
            trendChart = new Chart(ctx, config);
        }
    }

    function renderCategoryChart(labels, values) {
        const ctx = dom.categoryCanvas.getContext('2d');
        const total = values.reduce((s, v) => s + v, 0);

        const config = {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: CHART_COLORS.slice(0, labels.length),
                    borderColor: '#0a0a1a',
                    borderWidth: 2,
                    hoverBorderColor: '#fff',
                    hoverBorderWidth: 2,
                    hoverOffset: 8,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#e0e0e0',
                            font: { family: "'Kanit', sans-serif", size: 11, weight: 400 },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 14,
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 42, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0',
                        borderColor: 'rgba(102, 126, 234, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: 12,
                        titleFont: { family: "'Kanit', sans-serif", size: 13, weight: 600 },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.parsed;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${formatCurrency(val)} (${pct}%)`;
                            },
                        },
                    },
                },
            },
            plugins: [{
                // Center text plugin
                id: 'centerText',
                beforeDraw(chart) {
                    const { width, height, ctx: c } = chart;
                    c.save();
                    const fontSize = 14;
                    c.font = `600 ${fontSize}px 'Kanit', sans-serif`;
                    c.fillStyle = '#888';
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                    c.fillText('รวมทั้งหมด', width / 2, centerY - 12);
                    c.font = `700 18px 'Inter', sans-serif`;
                    c.fillStyle = '#fff';
                    c.fillText(formatCurrency(total), width / 2, centerY + 14);
                    c.restore();
                },
            }],
        };

        if (categoryChart) {
            categoryChart.data = config.data;
            categoryChart.options = config.options;
            categoryChart.update('active');
        } else {
            categoryChart = new Chart(ctx, config);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //   ACTIONS
    // ═══════════════════════════════════════════════════════════════

    /** Add a new transaction */
    async function addTransaction(type, amount, category, description) {
        setSubmitLoading(true);

        try {
            await apiFetch('/api/transactions', {
                method: 'POST',
                body: JSON.stringify({ type, amount: Number(amount), category, description }),
            });

            showToast('✨ บันทึกรายการสำเร็จ!', 'success');
            dom.form.reset();
            await refreshAll();
        } catch (err) {
            showToast(`❌ ไม่สามารถบันทึกได้: ${err.message}`, 'error');
        } finally {
            setSubmitLoading(false);
        }
    }

    /** Delete a transaction */
    async function handleDelete(id, element) {
        if (!confirm('🗑️ คุณต้องการลบรายการนี้ใช่ไหม?')) return;

        try {
            // Animate out
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '0';
            element.style.transform = 'translateX(40px) scale(0.95)';

            await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });

            setTimeout(() => {
                element.remove();
                // Check if list is now empty
                const remaining = dom.transactionList.querySelectorAll('.transaction-item');
                if (remaining.length === 0) {
                    dom.emptyState.style.display = 'block';
                }
            }, 300);

            showToast('🗑️ ลบรายการเรียบร้อย', 'success');

            // Refresh summary & charts
            fetchSummaryToday();
            fetchTrend();
            fetchCategoryBreakdown();
            fetchMonthlySummary(dom.monthSelector.value);
        } catch (err) {
            // Restore element
            element.style.opacity = '1';
            element.style.transform = 'translateX(0) scale(1)';
            showToast(`❌ ลบไม่สำเร็จ: ${err.message}`, 'error');
        }
    }

    /** Toggle submit button loading state */
    function setSubmitLoading(loading) {
        if (!dom.btnText) {
            dom.btnText = dom.submitBtn.querySelector('.btn-text');
            dom.btnIcon = dom.submitBtn.querySelector('.btn-icon');
        }
        if (loading) {
            dom.btnText.style.display = 'none';
            dom.btnIcon.style.display = 'none';
            dom.submitLoading.style.display = 'inline-flex';
            dom.submitBtn.disabled = true;
            dom.submitBtn.style.opacity = '0.7';
        } else {
            dom.btnText.style.display = '';
            dom.btnIcon.style.display = '';
            dom.submitLoading.style.display = 'none';
            dom.submitBtn.disabled = false;
            dom.submitBtn.style.opacity = '1';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //   REFRESH & INIT
    // ═══════════════════════════════════════════════════════════════

    /** Refresh all dashboard data */
    async function refreshAll() {
        await Promise.allSettled([
            fetchSummaryToday(),
            fetchTransactions(),
            fetchTrend(),
            fetchCategoryBreakdown(),
            fetchMonthlySummary(dom.monthSelector.value),
        ]);
    }

    /** Hide the initial loading overlay */
    function hideLoadingOverlay() {
        dom.loadingOverlay?.classList.add('hidden');
    }

    /** Start auto-refresh interval */
    function startAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => {
            refreshAll();
        }, REFRESH_INTERVAL);
    }

    // ═══════════════════════════════════════════════════════════════
    //   EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════

    function bindEvents() {
        // Form submit
        dom.form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const type = dom.txType.value;
            const amount = dom.txAmount.value;
            const category = dom.txCategory.value;
            const description = dom.txDescription.value.trim();

            if (!type || !amount || !category) {
                showToast('⚠️ กรุณากรอกข้อมูลให้ครบทุกช่อง', 'error');
                return;
            }

            if (Number(amount) <= 0) {
                showToast('⚠️ จำนวนเงินต้องมากกว่า 0', 'error');
                return;
            }

            await addTransaction(type, amount, category, description);
        });

        // Refresh button
        dom.refreshBtn.addEventListener('click', () => {
            dom.refreshBtn.style.transform = 'rotate(360deg)';
            dom.refreshBtn.style.transition = 'transform 0.5s ease';
            setTimeout(() => {
                dom.refreshBtn.style.transform = '';
            }, 500);

            showToast('🔄 กำลังรีเฟรชข้อมูล...', 'info');
            refreshAll();
        });

        // Month selector change
        dom.monthSelector.addEventListener('change', () => {
            fetchMonthlySummary(dom.monthSelector.value);
        });

        // Pause auto-refresh when tab not visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (refreshTimer) clearInterval(refreshTimer);
            } else {
                refreshAll();
                startAutoRefresh();
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //   INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    async function init() {
        setCurrentDate();
        setDefaultMonth();
        bindEvents();

        // Initial data load
        await refreshAll();

        // Hide loading overlay with a small delay for smooth transition
        setTimeout(hideLoadingOverlay, 400);

        // Start auto-refresh
        startAutoRefresh();

        console.log('💰 Money Tracker Dashboard initialized successfully.');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
