// Shanmuga Travels - Application Core Engine

class TravelsApp {
  constructor() {
    this.data = this.loadData();
    this.activeTab = 'entry';
    this.reportFilterType = 'month';
    const now = new Date();
    this.reportFilterVal = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    this.reportSearchQuery = '';
    this.currentCalendarMonth = this.reportFilterVal;
    this.activeEndingTripId = null;
    this.tempStartPhoto = '';
    this.tempEndPhoto = '';

    this.init();
    this.registerServiceWorker();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker Registered'))
        .catch(err => console.log('SW registration failed', err));
    }
  }

  loadData() {
    const saved = localStorage.getItem('shanmuga_travels_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load local data", e);
      }
    }
    this.saveData(DEFAULT_DATA);
    return DEFAULT_DATA;
  }

  saveData(data = this.data) {
    localStorage.setItem('shanmuga_travels_v1', JSON.stringify(data));
  }

  init() {
    this.bindNavigation();
    this.bindForms();
    this.bindAutoCalc();
    this.bindPhotoUploads();
    this.bindReportFilters();
    this.setDefaultDateTime();
    this.renderAll();
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'fa-check-circle';
    if (type === 'danger') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const activePage = document.getElementById(`page-${tabId}`);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePage) activePage.classList.add('active');

    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}

    if (tabId === 'reports') {
      try {
        this.renderReportView();
        this.renderCalendarView();
      } catch (err) {
        console.error("Error rendering reports:", err);
      }
    }
  }

  setDefaultDateTime() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const dateInput = document.getElementById('tripDate');
    if (dateInput && !dateInput.value) dateInput.value = todayStr;

    const timeInput = document.getElementById('tripTime');
    if (timeInput && !timeInput.value) {
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      timeInput.value = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    }
  }

  // AUTO CALC DISTANCE & FASTAG FROM ROUTE
  bindAutoCalc() {
    const fromInput = document.getElementById('fromPlace');
    const toInput = document.getElementById('toPlace');

    const updateCalc = () => {
      const fromVal = fromInput ? fromInput.value : '';
      const toVal = toInput ? toInput.value : '';

      const routeInfo = ROUTE_DATABASE.calculateRoute(fromVal, toVal);
      const estDistanceEl = document.getElementById('autoCalcDistance');
      const estTollEl = document.getElementById('autoCalcToll');
      const tollInput = document.getElementById('fastagTollInput');

      if (estDistanceEl) estDistanceEl.textContent = `${routeInfo.distanceKm} KM`;
      if (estTollEl) estTollEl.textContent = `₹${routeInfo.autoToll}`;

      if (tollInput && (!tollInput.value || tollInput.value === '0')) {
        tollInput.value = routeInfo.autoToll;
      }
    };

    if (fromInput) fromInput.addEventListener('input', updateCalc);
    if (toInput) toInput.addEventListener('input', updateCalc);
    updateCalc();
  }

  bindPhotoUploads() {
    const startInput = document.getElementById('startOdoPhotoInput');
    const startPreview = document.getElementById('startOdoPreview');

    if (startInput) {
      startInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.tempStartPhoto = event.target.result;
            if (startPreview) {
              startPreview.src = event.target.result;
              startPreview.style.display = 'block';
            }
            this.showToast('📷 Odometer Photo Attached', 'info');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const endInput = document.getElementById('endOdoPhotoInput');
    const endPreview = document.getElementById('endOdoPreview');

    if (endInput) {
      endInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.tempEndPhoto = event.target.result;
            if (endPreview) {
              endPreview.src = event.target.result;
              endPreview.style.display = 'block';
            }
            this.showToast('📷 End Odometer Photo Attached', 'info');
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  bindForms() {
    // 1. Start Trip Form
    const startForm = document.getElementById('startTripForm');
    if (startForm) {
      startForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(startForm);

        const fromPlace = formData.get('fromPlace');
        const toPlace = formData.get('toPlace');

        if (!fromPlace || !toPlace) {
          alert("From Place and Destination are compulsory!");
          return;
        }

        const startOdo = parseFloat(formData.get('startOdo')) || 0;
        const costCustomer = parseFloat(formData.get('costCustomer')) || 0;
        const fastagToll = parseFloat(formData.get('fastagToll')) || 0;
        const fuelExpense = parseFloat(formData.get('fuelExpense')) || 0;
        const otherExpense = parseFloat(formData.get('otherExpense')) || 0;
        const otherNote = formData.get('otherNote') || '';

        const newTrip = {
          id: `TRP-${Math.floor(100 + Math.random() * 900)}`,
          status: 'active',
          date: formData.get('date') || new Date().toISOString().split('T')[0],
          startTime: formData.get('startTime') || '10:00 AM',
          customerName: formData.get('customerName') || '',
          fromPlace: fromPlace,
          toPlace: toPlace,
          distanceKm: 0,
          startOdo: startOdo,
          startOdoPhoto: this.tempStartPhoto || '',
          endOdo: 0,
          endOdoPhoto: '',
          costCustomer: costCustomer,
          fuelExpense: fuelExpense,
          tollExpense: fastagToll,
          otherExpense: otherExpense,
          otherNote: otherNote
        };

        this.data.trips.unshift(newTrip);
        this.saveData();

        startForm.reset();
        this.tempStartPhoto = '';
        const startPreview = document.getElementById('startOdoPreview');
        if (startPreview) startPreview.style.display = 'none';

        this.setDefaultDateTime();
        this.refreshMonthFilterDropdown();
        this.renderAll();

        this.showToast(`🚗 Trip Started: ${fromPlace} ➔ ${toPlace}`, 'success');
      });
    }

    // 2. End Trip Form
    const endTripForm = document.getElementById('endTripForm');
    if (endTripForm) {
      endTripForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(endTripForm);

        const endOdo = parseFloat(formData.get('endOdo')) || 0;
        const trip = this.data.trips.find(t => t.id === this.activeEndingTripId);

        if (!trip) return;

        if (endOdo > 0 && trip.startOdo > 0 && endOdo < trip.startOdo) {
          alert(`End Odometer (${endOdo}) cannot be less than Start Odometer (${trip.startOdo})!`);
          return;
        }

        const distanceKm = (endOdo > 0 && trip.startOdo > 0) ? (endOdo - trip.startOdo) : trip.distanceKm;
        const finalCostCustomer = parseFloat(formData.get('costCustomerEnd')) || trip.costCustomer;

        trip.endOdo = endOdo;
        trip.endOdoPhoto = this.tempEndPhoto || '';
        trip.distanceKm = distanceKm;
        trip.costCustomer = finalCostCustomer;
        trip.status = 'completed';

        const addFuel = parseFloat(formData.get('fuelExpenseEnd')) || 0;
        const addToll = parseFloat(formData.get('tollExpenseEnd')) || 0;
        const addOther = parseFloat(formData.get('otherExpenseEnd')) || 0;

        if (addFuel > 0) trip.fuelExpense += addFuel;
        if (addToll > 0) trip.tollExpense += addToll;
        if (addOther > 0) trip.otherExpense += addOther;

        this.saveData();
        endTripForm.reset();
        this.tempEndPhoto = '';
        this.closeModal('endTripModal');
        this.renderAll();

        const netProfit = trip.costCustomer - (trip.fuelExpense + trip.tollExpense + trip.otherExpense);
        this.showToast(`🏁 Trip Completed! Net Profit: ₹${netProfit.toLocaleString('en-IN')}`, 'success');
      });
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-bg');
        if (modal) modal.classList.remove('active');
      });
    });
  }

  refreshMonthFilterDropdown() {
    const filterMonthVal = document.getElementById('reportFilterMonth');
    if (filterMonthVal) {
      const months = new Set();
      const currentYM = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
      months.add(currentYM);
      (this.data.trips || []).forEach(t => {
        if (t.date && t.date.length >= 7) months.add(t.date.slice(0, 7));
      });
      const sortedMonths = Array.from(months).sort().reverse();
      filterMonthVal.innerHTML = sortedMonths.map(m => {
        const [y, mm] = m.split('-');
        const dateObj = new Date(parseInt(y), parseInt(mm) - 1, 1);
        const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        return `<option value="${m}">${label}</option>`;
      }).join('');
      if (sortedMonths.includes(this.reportFilterVal)) {
        filterMonthVal.value = this.reportFilterVal;
      } else {
        filterMonthVal.value = sortedMonths[0];
        this.reportFilterVal = sortedMonths[0];
      }
    }
  }

  bindReportFilters() {
    const filterTypeSelect = document.getElementById('reportFilterType');
    const filterMonthVal = document.getElementById('reportFilterMonth');
    const filterDateVal = document.getElementById('reportFilterDate');
    const searchInput = document.getElementById('reportSearch');
    const btnExportCSV = document.getElementById('btnExportCSV');
    const btnPrintReport = document.getElementById('btnPrintReport');

    this.refreshMonthFilterDropdown();

    if (filterTypeSelect) {
      filterTypeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this.reportFilterType = val;

        if (val === 'month') {
          filterMonthVal.style.display = 'block';
          filterDateVal.style.display = 'none';
          this.reportFilterVal = filterMonthVal.value;
        } else if (val === 'date') {
          filterMonthVal.style.display = 'none';
          filterDateVal.style.display = 'block';
          this.reportFilterVal = filterDateVal.value;
        } else {
          filterMonthVal.style.display = 'none';
          filterDateVal.style.display = 'none';
          this.reportFilterVal = '';
        }
        this.renderReportView();
      });
    }

    if (filterMonthVal) {
      filterMonthVal.addEventListener('change', (e) => {
        this.reportFilterVal = e.target.value;
        this.currentCalendarMonth = e.target.value;
        this.renderReportView();
        this.renderCalendarView();
      });
    }

    if (filterDateVal) {
      filterDateVal.addEventListener('change', (e) => {
        this.reportFilterVal = e.target.value;
        this.renderReportView();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.reportSearchQuery = e.target.value;
        this.renderReportView();
      });
    }

    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        const report = getFilteredReportData(this.data.trips, this.reportFilterType, this.reportFilterVal, this.reportSearchQuery);
        exportReportCSV(report, `Shanmuga_Travels_${this.reportFilterVal || 'All'}`);
        this.showToast('📥 CSV Downloaded Successfully!', 'info');
      });
    }

    if (btnPrintReport) {
      btnPrintReport.addEventListener('click', () => {
        window.print();
      });
    }
  }

  renderAll() {
    this.renderRecentTrips();
    this.renderReportView();
    this.renderCalendarView();
  }

  formatINR(amount) {
    return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  renderRecentTrips() {
    const container = document.getElementById('recentTripsList');
    if (!container) return;

    if (this.data.trips.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-muted);">No trip orders entered yet.</div>`;
      return;
    }

    container.innerHTML = this.data.trips.map(t => {
      const charged = parseFloat(t.costCustomer || 0);
      const fuel = parseFloat(t.fuelExpense || 0);
      const toll = parseFloat(t.tollExpense || 0);
      const other = parseFloat(t.otherExpense || 0);
      const profit = charged - (fuel + toll + other);
      const isCompleted = t.status === 'completed';

      return `
        <div class="trip-card">
          <div class="trip-card-header">
            <div class="trip-route">${t.fromPlace} &rarr; ${t.toPlace}</div>
            <span class="badge ${isCompleted ? 'badge-completed' : 'badge-active'}">
              ${isCompleted ? 'Completed' : 'In Progress'}
            </span>
          </div>

          <div class="trip-meta">
            <i class="far fa-calendar"></i> ${t.date} | <i class="far fa-clock"></i> ${t.startTime}
            ${t.customerName ? ` | <i class="far fa-user"></i> ${t.customerName}` : ''}
          </div>

          <div style="font-size:12px; color:var(--text-sub); background:#F8FAFC; padding:6px 10px; border-radius:6px; margin-bottom:6px;">
            Start Odo: <strong>${t.startOdo || 0} KM</strong> ${isCompleted ? `| End Odo: <strong>${t.endOdo || 0} KM</strong> | Driven: <strong>${t.distanceKm || 0} KM</strong>` : ''}
            ${(isCompleted && t.distanceKm > 0 && t.fuelExpense > 0) ? ` | Mileage: <strong>${(t.distanceKm / (t.fuelExpense / 100)).toFixed(1)} KM/L</strong>` : ''}
          </div>

          <div class="trip-costs">
            <div>Charged: <strong>${this.formatINR(charged)}</strong></div>
            <div>Fuel: <strong>${this.formatINR(fuel)}</strong></div>
            <div>FASTag Toll: <strong>${this.formatINR(toll)}</strong></div>
            <div style="color:${profit >= 0 ? 'var(--success-dark)' : 'var(--danger)'}; font-weight:800;">
              Profit: <strong>${this.formatINR(profit)}</strong>
            </div>
          </div>

          ${(t.startOdoPhoto || t.endOdoPhoto) ? `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
              ${t.startOdoPhoto ? `<div><span style="font-size:10px; font-weight:700;">Start Odo</span><img src="${t.startOdoPhoto}" style="width:100%; height:80px; object-fit:cover; border-radius:6px;"></div>` : ''}
              ${t.endOdoPhoto ? `<div><span style="font-size:10px; font-weight:700;">End Odo</span><img src="${t.endOdoPhoto}" style="width:100%; height:80px; object-fit:cover; border-radius:6px;"></div>` : ''}
            </div>
          ` : ''}

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px dashed var(--border);">
            ${!isCompleted ? `
              <button class="btn-primary btn-success btn-sm" onclick="app.openEndTripModal('${t.id}')">
                <i class="fas fa-flag-checkered"></i> Complete Trip
              </button>
            ` : '<div></div>'}
            
            <button style="background:none; border:none; color:var(--danger); font-size:12px; font-weight:600; cursor:pointer;" onclick="app.deleteTrip('${t.id}')">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  openEndTripModal(tripId) {
    this.activeEndingTripId = tripId;
    const trip = this.data.trips.find(t => t.id === tripId);
    if (!trip) return;

    this.tempEndPhoto = '';
    const endOdoInput = document.getElementById('endOdoInput');
    const costCustomerEndInput = document.getElementById('costCustomerEndInput');
    const endPreview = document.getElementById('endOdoPreview');
    const banner = document.getElementById('endTripCalcBanner');
    const startOdoDisp = document.getElementById('endModalStartOdoDisplay');
    const drivenKmDisp = document.getElementById('endModalDrivenKmDisplay');
    const mileageDisp = document.getElementById('endModalMileageDisplay');

    if (endPreview) endPreview.style.display = 'none';

    if (endOdoInput) {
      endOdoInput.value = trip.startOdo ? (parseFloat(trip.startOdo) + 50) : '';
    }
    if (costCustomerEndInput) {
      costCustomerEndInput.value = trip.costCustomer || '';
    }

    const updateLiveCalc = () => {
      const startOdo = parseFloat(trip.startOdo) || 0;
      const endOdo = parseFloat(endOdoInput?.value) || 0;

      if (startOdo > 0 && endOdo >= startOdo) {
        const driven = (endOdo - startOdo).toFixed(1);
        if (startOdoDisp) startOdoDisp.textContent = `Start Odo: ${startOdo} KM`;
        if (drivenKmDisp) drivenKmDisp.textContent = `Driven: ${driven} KM`;

        if (trip.fuelExpense > 0) {
          const liters = trip.fuelExpense / 100;
          const mileage = (parseFloat(driven) / liters).toFixed(1);
          if (mileageDisp) mileageDisp.innerHTML = `<i class="fas fa-gas-pump"></i> Fuel: ₹${trip.fuelExpense.toFixed(2)} | Mileage: <strong>${mileage} KM/L</strong>`;
        } else {
          if (mileageDisp) mileageDisp.innerHTML = `<i class="fas fa-gas-pump"></i> Fuel: ₹0.00 | Mileage: --`;
        }

        if (banner) banner.style.display = 'flex';
      } else {
        if (banner) banner.style.display = 'none';
      }
    };

    if (endOdoInput) {
      endOdoInput.removeEventListener('input', updateLiveCalc);
      endOdoInput.addEventListener('input', updateLiveCalc);
      updateLiveCalc();
    }

    const modal = document.getElementById('endTripModal');
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  renderCalendarView() {
    const container = document.getElementById('calendarGridContainer');
    if (!container) return;

    const yearMonth = this.currentCalendarMonth;
    const [year, month] = yearMonth.split('-').map(Number);

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const dayTotals = {};
    this.data.trips.forEach(t => {
      if (t.date && t.date.startsWith(yearMonth)) {
        const dayNum = parseInt(t.date.split('-')[2]);
        const rev = parseFloat(t.costCustomer || 0);
        dayTotals[dayNum] = (dayTotals[dayNum] || 0) + rev;
      }
    });

    let html = `
      <div class="cal-day-name">Sun</div><div class="cal-day-name">Mon</div><div class="cal-day-name">Tue</div>
      <div class="cal-day-name">Wed</div><div class="cal-day-name">Thu</div><div class="cal-day-name">Fri</div><div class="cal-day-name">Sat</div>
    `;

    for (let i = 0; i < firstDay; i++) {
      html += `<div style="background:transparent;"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${yearMonth}-${day.toString().padStart(2, '0')}`;
      const totalRev = dayTotals[day] || 0;

      html += `
        <div class="cal-cell ${totalRev > 0 ? 'active-day' : ''}" onclick="app.showDayDetails('${dateStr}')">
          <div class="cal-num">${day}</div>
          ${totalRev > 0 ? `<div class="cal-val">₹${totalRev.toLocaleString('en-IN')}</div>` : ''}
        </div>
      `;
    }

    container.innerHTML = html;
  }

  showDayDetails(dateStr) {
    const dayTrips = this.data.trips.filter(t => t.date === dateStr);
    let content = `<h3 style="font-size:16px; font-weight:800; margin-bottom:12px;">Trips for ${dateStr}</h3>`;

    if (dayTrips.length === 0) {
      content += `<p style="color:var(--text-muted); font-size:14px;">No trips on this date.</p>`;
    } else {
      let dayTotalRev = 0, dayTotalExp = 0;

      content += dayTrips.map(t => {
        const rev = parseFloat(t.costCustomer || 0);
        const exp = parseFloat(t.fuelExpense || 0) + parseFloat(t.tollExpense || 0) + parseFloat(t.otherExpense || 0);
        const profit = rev - exp;
        dayTotalRev += rev; dayTotalExp += exp;

        return `
          <div style="background:#F8FAFC; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #E2E8F0; font-size:12px;">
            <div style="font-weight:700; color:var(--primary);">${t.fromPlace} &rarr; ${t.toPlace}</div>
            <div>Charged: ₹${rev.toFixed(2)} | Fuel+Toll: ₹${exp.toFixed(2)} | <strong style="color:var(--success-dark);">Profit: ₹${profit.toFixed(2)}</strong></div>
          </div>
        `;
      }).join('');

      content += `
        <div style="background:#ECFDF5; padding:10px; border-radius:8px; margin-top:10px; display:flex; justify-content:space-between; font-weight:800; color:#047857; font-size:13px;">
          <span>Day Net Profit: ₹${(dayTotalRev - dayTotalExp).toLocaleString('en-IN')}</span>
        </div>
      `;
    }

    const modalBody = document.getElementById('dayDetailsModalBody');
    if (modalBody) modalBody.innerHTML = content;
    const modal = document.getElementById('dayDetailsModal');
    if (modal) modal.classList.add('active');
  }

  renderReportView() {
    const report = getFilteredReportData(this.data.trips, this.reportFilterType, this.reportFilterVal, this.reportSearchQuery);

    const elEarnings = document.getElementById('repTotalEarnings');
    const elExpenses = document.getElementById('repTotalExpenses');
    const elKm = document.getElementById('repTotalKm');
    const elProfit = document.getElementById('repNetProfit');

    if (elEarnings) elEarnings.textContent = this.formatINR(report.totalCostCustomers);
    if (elExpenses) elExpenses.textContent = this.formatINR(report.totalExpenses);
    if (elKm) elKm.textContent = `${report.totalKm.toLocaleString('en-IN')} KM`;
    if (elProfit) elProfit.textContent = this.formatINR(report.netProfit);

    renderReportCharts(report.filteredTrips);

    const container = document.getElementById('reportMonthlyList');
    if (!container) return;

    if (report.filteredTrips.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">No records match current filter.</div>`;
      return;
    }

    container.innerHTML = report.filteredTrips.map(t => {
      const charged = parseFloat(t.costCustomer || 0);
      const fuel = parseFloat(t.fuelExpense || 0);
      const toll = parseFloat(t.tollExpense || 0);
      const other = parseFloat(t.otherExpense || 0);
      const exp = fuel + toll + other;
      const profit = charged - exp;
      const km = parseFloat(t.distanceKm || 0);

      let mileageText = '';
      if (km > 0 && fuel > 0) {
        mileageText = ` | Mileage: <strong>${(km / (fuel / 100)).toFixed(1)} KM/L</strong>`;
      }

      return `
        <div class="trip-card">
          <div style="display:flex; justify-content:space-between; font-weight:700; font-size:13px; margin-bottom:4px;">
            <span>${t.date} (${t.startTime}) ${t.customerName ? '| ' + t.customerName : ''}</span>
            <span style="color:var(--primary); font-size:14px;">Charged: ${this.formatINR(charged)}</span>
          </div>
          <div style="font-weight:800; font-size:15px; margin-bottom:4px; color:var(--text-main);">${t.fromPlace} &rarr; ${t.toPlace}</div>
          
          <div style="font-size:12px; color:var(--text-sub); background:#F8FAFC; padding:6px 8px; border-radius:6px; margin-bottom:6px;">
            Start Odo: <strong>${t.startOdo || 0} KM</strong> | End Odo: <strong>${t.endOdo || 0} KM</strong> | Driven: <strong>${km} KM</strong>${mileageText}
          </div>

          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-sub); flex-wrap:wrap; gap:4px;">
            <span>Fuel: ${this.formatINR(fuel)}</span>
            <span>FASTag Toll: ${this.formatINR(toll)}</span>
            <span>Other: ${this.formatINR(other)}</span>
            <strong style="color:${profit >= 0 ? 'var(--success-dark)' : 'var(--danger)'};">Net Profit: ${this.formatINR(profit)}</strong>
          </div>
        </div>
      `;
    }).join('');
  }

  deleteTrip(id) {
    if (confirm("Delete this trip order?")) {
      this.data.trips = this.data.trips.filter(t => t.id !== id);
      this.saveData();
      this.refreshMonthFilterDropdown();
      this.renderAll();
      this.showToast('🗑️ Order Deleted', 'danger');
    }
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new TravelsApp();
});
