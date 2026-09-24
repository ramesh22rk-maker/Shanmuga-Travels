// Chart.js helper functions
let trendChartInstance = null;
let expenseChartInstance = null;

function renderReportCharts(trips) {
  renderTrendChart(trips);
  renderExpenseChart(trips);
}

function renderTrendChart(trips) {
  const ctx = document.getElementById('trendChartCanvas');
  if (!ctx || typeof Chart === 'undefined') return;

  const labels = [];
  const earningsData = [];
  const expensesData = [];
  const profitData = [];

  const safeTrips = Array.isArray(trips) ? trips : [];
  const sorted = [...safeTrips].reverse();

  sorted.forEach(t => {
    if (!t) return;
    const label = `${t.date ? t.date.slice(5) : ''} (${(t.fromPlace || '').slice(0, 5)}->${(t.toPlace || '').slice(0, 5)})`;
    const rev = parseFloat(t.costCustomer || 0);
    const exp = parseFloat(t.fuelExpense || 0) + parseFloat(t.tollExpense || 0) + parseFloat(t.otherExpense || 0);
    const profit = rev - exp;

    labels.push(label);
    earningsData.push(rev);
    expensesData.push(exp);
    profitData.push(profit);
  });

  if (trendChartInstance) {
    try { trendChartInstance.destroy(); } catch (e) {}
    trendChartInstance = null;
  }

  trendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['No Trips'],
      datasets: [
        {
          label: 'Charged (₹)',
          data: earningsData.length > 0 ? earningsData : [0],
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          borderRadius: 6
        },
        {
          label: 'Expenses (₹)',
          data: expensesData.length > 0 ? expensesData : [0],
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderRadius: 6
        },
        {
          label: 'Net Profit (₹)',
          data: profitData.length > 0 ? profitData : [0],
          type: 'line',
          borderColor: '#10B981',
          borderWidth: 3,
          fill: false,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function renderExpenseChart(trips) {
  const ctx = document.getElementById('expenseChartCanvas');
  if (!ctx || typeof Chart === 'undefined') return;

  let fuel = 0, toll = 0, other = 0;
  const safeTrips = Array.isArray(trips) ? trips : [];

  safeTrips.forEach(t => {
    if (!t) return;
    fuel += parseFloat(t.fuelExpense || 0);
    toll += parseFloat(t.tollExpense || 0);
    other += parseFloat(t.otherExpense || 0);
  });

  const total = fuel + toll + other;

  if (expenseChartInstance) {
    try { expenseChartInstance.destroy(); } catch (e) {}
    expenseChartInstance = null;
  }

  expenseChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Fuel', 'FASTag Toll', 'Other'],
      datasets: [{
        data: total > 0 ? [fuel, toll, other] : [1, 0, 0],
        backgroundColor: ['#EF4444', '#F59E0B', '#8B5CF6']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}
