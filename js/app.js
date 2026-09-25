// Shanmuga Travels - Application Core Engine with Upstash Redis Cloud Backend

class TravelsApp {
  constructor() {
    this.apiBaseUrl = '/api/trips';
    this.data = { trips: [] };
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
    this.loadLocalCache();            // ⚡ Instant load from cache (0ms delay!)
    this.registerServiceWorker();
    this.fetchTripsFromBackend(true); // ☁️ Silent background fetch from Redis
    this.startAutoSync();
  }

  loadLocalCache() {
    try {
      const cached = localStorage.getItem('shanmuga_travels_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.trips) && parsed.trips.length > 0) {
          this.data = parsed;
          this.refreshMonthFilterDropdown();
          this.renderAll();
          console.log(`⚡ Loaded ${parsed.trips.length} cached trip(s) instantly.`);
        }
      }
    } catch (e) {
      console.warn("Could not load local cache:", e);
    }
  }

  updateSyncStatus(isSyncing, text = 'Synced') {
    const statusPill = document.getElementById('cloudSyncStatus');
    const statusText = document.getElementById('cloudStatusText');
    if (!statusPill || !statusText) return;

    if (isSyncing) {
      statusPill.classList.add('syncing');
      statusText.textContent = text;
    } else {
      statusPill.classList.remove('syncing');
      statusText.textContent = text;
    }
  }

  startAutoSync() {
    // Auto sync when returning to tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab active - syncing latest trips from cloud...');
        this.fetchTripsFromBackend(true);
      }
    });
    // Periodic background sync every 20 seconds
    setInterval(() => {
      this.fetchTripsFromBackend(true);
    }, 20000);
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker Registered'))
        .catch(err => console.log('SW registration failed', err));
    }
  }

  showLoadingState() {
    const container = document.getElementById('recentTripsList');
    if (container && this.data.trips.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:32px; color:var(--text-muted);">
          <i class="fas fa-circle-notch fa-spin" style="font-size:28px; color:var(--primary); margin-bottom:10px;"></i>
          <div style="font-weight:700; font-size:14px; margin-top:8px;">Syncing trips with cloud...</div>
        </div>`;
    }
  }

  saveLocalData(data = this.data) {
    localStorage.setItem('shanmuga_travels_cache', JSON.stringify(data));
  }

  async fetchTripsFromBackend(silent = false) {
    if (!silent) this.showLoadingState();
    this.updateSyncStatus(true, 'Syncing...');

    try {
      const res = await fetch(`${this.apiBaseUrl}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });

      if (res.ok) {
        const trips = await res.json();
        if (Array.isArray(trips)) {
          const hasChanged = JSON.stringify(trips) !== JSON.stringify(this.data.trips);
          if (hasChanged || this.data.trips.length === 0) {
            this.data.trips = trips;
            this.saveLocalData();
            this.refreshMonthFilterDropdown();
            this.renderAll();
          }
          this.updateSyncStatus(false, 'Synced ☁️');
          console.log(`✅ Synced ${trips.length} trip(s) from Upstash Redis cloud.`);
        }
      } else {
        console.warn('API returned error:', res.status);
        this.updateSyncStatus(false, 'Offline');
        if (!silent) this.renderAll();
      }
    } catch (err) {
      console.warn('Cloud unavailable:', err.message);
      this.updateSyncStatus(false, 'Offline');
      if (!silent) this.renderAll();
    }
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

  compressImage(file, callback) {
    const maxWidth = 800;
    const maxHeight = 800;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        callback(compressedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  bindPhotoUploads() {
    const startInput = document.getElementById('startOdoPhotoInput');
    const startPreview = document.getElementById('startOdoPreview');

    if (startInput) {
      startInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.compressImage(file, (dataUrl) => {
            this.tempStartPhoto = dataUrl;
            if (startPreview) {
              startPreview.src = dataUrl;
              startPreview.style.display = 'block';
            }
            this.showToast('📷 Odometer Photo Attached (Compressed)', 'info');
          });
        }
      });
    }

    const endInput = document.getElementById('endOdoPhotoInput');
    const endPreview = document.getElementById('endOdoPreview');

    if (endInput) {
      endInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.compressImage(file, (dataUrl) => {
            this.tempEndPhoto = dataUrl;
            if (endPreview) {
              endPreview.src = dataUrl;
              endPreview.style.display = 'block';
            }
            this.showToast('📷 End Odometer Photo Attached (Compressed)', 'info');
          });
        }
      });
    }
  }

  bindForms() {
    // 1. Start Trip Form
    const startForm = document.getElementById('startTripForm');
    if (startForm) {
      startForm.addEventListener('submit', async (e) => {
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

        // Add locally
        this.data.trips.unshift(newTrip);
        this.saveLocalData();

        // Send to Redis Cloud API Backend
        try {
          const res = await fetch(this.apiBaseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTrip)
          });
          if (res.ok) {
            const savedTrip = await res.json();
            console.log("Trip saved to Redis Cloud DB:", savedTrip);
            this.showToast(`☁️ Saved to Cloud: ${fromPlace} ➔ ${toPlace}`, 'success');
          } else {
            const errText = await res.text();
            console.error("Cloud save failed:", res.status, errText);
            this.showToast(`⚠️ Cloud save failed (${res.status}). Stored locally.`, 'danger');
          }
        } catch (err) {
          console.warn("Could not save trip to backend server, saved locally:", err);
          this.showToast('⚠️ Offine mode: Saved locally only.', 'info');
        }

        startForm.reset();
        this.tempStartPhoto = '';
        const startPreview = document.getElementById('startOdoPreview');
        if (startPreview) startPreview.style.display = 'none';

        this.setDefaultDateTime();
        this.refreshMonthFilterDropdown();
        this.renderAll();
      });
    }

    // 2. End Trip Form
    const endTripForm = document.getElementById('endTripForm');
    if (endTripForm) {
      endTripForm.addEventListener('submit', async (e) => {
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

        this.saveLocalData();

        // Update in Redis API Backend
        try {
          const res = await fetch(`${this.apiBaseUrl}/${trip.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trip)
          });
          if (res.ok) {
            this.showToast('☁️ Trip update synced to Cloud!', 'success');
          } else {
            console.warn("Cloud update failed:", res.status);
          }
        } catch (err) {
          console.warn("Could not update trip on backend server:", err);
        }

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
    const btnExportPDF = document.getElementById('btnExportPDF');
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

    if (btnExportPDF) {
      btnExportPDF.addEventListener('click', () => {
        const report = getFilteredReportData(this.data.trips, this.reportFilterType, this.reportFilterVal, this.reportSearchQuery);
        exportReportPDF(report, `Shanmuga_Travels_${this.reportFilterVal || 'All'}`);
        this.showToast('📄 PDF Report Downloaded!', 'info');
      });
    }

    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        const report = getFilteredReportData(this.data.trips, this.reportFilterType, this.reportFilterVal, this.reportSearchQuery);
        exportReportCSV(report, `Shanmuga_Travels_${this.reportFilterVal || 'All'}`);
        this.showToast('📥 Excel / CSV Downloaded!', 'info');
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

          <div style="display:flex; justify-space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px dashed var(--border);">
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
    let content = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:16px; font-weight:800; margin:0;">Trips for ${dateStr}</h3>
      </div>
    `;

    if (dayTrips.length === 0) {
      content += `<p style="color:var(--text-muted); font-size:14px;">No trips recorded on this date.</p>`;
    } else {
      let dayTotalRev = 0, dayTotalExp = 0;

      content += dayTrips.map(t => {
        const rev = parseFloat(t.costCustomer || 0);
        const exp = parseFloat(t.fuelExpense || 0) + parseFloat(t.tollExpense || 0) + parseFloat(t.otherExpense || 0);
        const profit = rev - exp;
        dayTotalRev += rev; dayTotalExp += exp;

        return `
          <div style="background:#F8FAFC; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #E2E8F0; font-size:12px;">
            <div style="font-weight:700; color:var(--primary);">${t.fromPlace} &rarr; ${t.toPlace} (${t.startTime})</div>
            <div>Customer: ${t.customerName || 'N/A'} | Odo: ${t.startOdo || 0} to ${t.endOdo || 0} (${t.distanceKm || 0} KM)</div>
            <div>Charged: ₹${rev.toFixed(2)} | Fuel+Toll: ₹${exp.toFixed(2)} | <strong style="color:var(--success-dark);">Profit: ₹${profit.toFixed(2)}</strong></div>
          </div>
        `;
      }).join('');

      content += `
        <div style="background:#ECFDF5; padding:10px; border-radius:8px; margin-top:10px; margin-bottom:12px; display:flex; justify-content:space-between; font-weight:800; color:#047857; font-size:13px;">
          <span>Day Revenue: ₹${dayTotalRev.toLocaleString('en-IN')}</span>
          <span>Day Net Profit: ₹${(dayTotalRev - dayTotalExp).toLocaleString('en-IN')}</span>
        </div>

        <div style="display:flex; gap:8px;">
          <button class="btn-primary" style="flex:1; font-size:12px; background:#DC2626; border-color:#DC2626;" onclick="app.downloadDayReportPDF('${dateStr}')">
            <i class="fas fa-file-pdf"></i> Download PDF
          </button>
          <button class="btn-primary btn-success" style="flex:1; font-size:12px;" onclick="app.downloadDayReportCSV('${dateStr}')">
            <i class="fas fa-file-excel"></i> Download Excel/CSV
          </button>
        </div>
      `;
    }

    const modalBody = document.getElementById('dayDetailsModalBody');
    if (modalBody) modalBody.innerHTML = content;
    const modal = document.getElementById('dayDetailsModal');
    if (modal) modal.classList.add('active');
  }

  downloadDayReportPDF(dateStr) {
    const report = getFilteredReportData(this.data.trips, 'date', dateStr, '');
    exportReportPDF(report, `Shanmuga_Travels_Day_${dateStr}`);
    this.showToast(`📄 Daily PDF Report for ${dateStr} downloaded!`, 'info');
  }

  downloadDayReportCSV(dateStr) {
    const report = getFilteredReportData(this.data.trips, 'date', dateStr, '');
    exportReportCSV(report, `Shanmuga_Travels_Day_${dateStr}`);
    this.showToast(`📥 Daily Excel/CSV for ${dateStr} downloaded!`, 'info');
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

  async deleteTrip(id) {
    if (confirm("Delete this trip order?")) {
      this.data.trips = this.data.trips.filter(t => t.id !== id);
      this.saveLocalData();

      // Delete from SQLite API backend
      try {
        await fetch(`${this.apiBaseUrl}/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn("Could not delete from backend API server:", err);
      }

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
