// Reports & Export engine for Shanmuga Travels

function getFilteredReportData(trips, filterType, filterVal, searchQuery) {
  let filtered = [...trips];

  if (filterType === 'month' && filterVal) {
    filtered = filtered.filter(t => t.date && t.date.startsWith(filterVal));
  } else if (filterType === 'date' && filterVal) {
    filtered = filtered.filter(t => t.date === filterVal);
  }

  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(t => 
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.fromPlace && t.fromPlace.toLowerCase().includes(q)) ||
      (t.toPlace && t.toPlace.toLowerCase().includes(q))
    );
  }

  const totalCostCustomers = filtered.reduce((sum, t) => sum + parseFloat(t.costCustomer || 0), 0);
  const totalFuel = filtered.reduce((sum, t) => sum + parseFloat(t.fuelExpense || 0), 0);
  const totalTolls = filtered.reduce((sum, t) => sum + parseFloat(t.tollExpense || 0), 0);
  const totalOther = filtered.reduce((sum, t) => sum + parseFloat(t.otherExpense || 0), 0);
  const totalKm = filtered.reduce((sum, t) => sum + parseFloat(t.distanceKm || 0), 0);
  const totalExpenses = totalFuel + totalTolls + totalOther;
  const netProfit = totalCostCustomers - totalExpenses;

  return {
    filteredTrips: filtered,
    totalCostCustomers,
    totalFuel,
    totalTolls,
    totalOther,
    totalKm,
    totalExpenses,
    netProfit
  };
}

// 1. Export Excel / CSV Format
function exportReportCSV(reportData, label = 'Shanmuga_Travels_Report') {
  let csv = "data:text/csv;charset=utf-8,";
  csv += `Shanmuga Travels - Trip & Financial Report (${label})\n`;
  csv += `Generated On: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}\n\n`;

  csv += `Total Amount Charged to Customers,₹${reportData.totalCostCustomers.toFixed(2)}\n`;
  csv += `Total Fuel Expenses,₹${reportData.totalFuel.toFixed(2)}\n`;
  csv += `Total FASTag Toll Expenses,₹${reportData.totalTolls.toFixed(2)}\n`;
  csv += `Total Other Expenses,₹${reportData.totalOther.toFixed(2)}\n`;
  csv += `TOTAL EXPENSES,₹${reportData.totalExpenses.toFixed(2)}\n`;
  csv += `TOTAL KM DRIVEN,${reportData.totalKm} KM\n`;
  csv += `NET PROFIT FOR US,₹${reportData.netProfit.toFixed(2)}\n\n`;

  csv += "TRIP LOG DETAILS\n";
  csv += "Date,Time,Status,Customer Name,From Place,Destination,Start Odometer (KM),End Odometer (KM),KM Driven,Charged Amount (INR),Fuel Expense (INR),FASTag Toll (INR),Other Expense (INR),Net Profit (INR)\n";

  reportData.filteredTrips.forEach(t => {
    const rev = parseFloat(t.costCustomer || 0);
    const fuel = parseFloat(t.fuelExpense || 0);
    const toll = parseFloat(t.tollExpense || 0);
    const other = parseFloat(t.otherExpense || 0);
    const exp = fuel + toll + other;
    const profit = rev - exp;

    csv += `"${t.date}","${t.startTime}","${t.status}","${t.customerName || ''}","${t.fromPlace}","${t.toPlace}",${t.startOdo || 0},${t.endOdo || 0},${t.distanceKm || 0},${rev.toFixed(2)},${fuel.toFixed(2)},${toll.toFixed(2)},${other.toFixed(2)},${profit.toFixed(2)}\n`;
  });

  const encodedUri = encodeURI(csv);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${label}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. Export Professional PDF Format
function exportReportPDF(reportData, label = 'Shanmuga_Travels_Report') {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF library not loaded yet. Please check your internet connection.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [37, 99, 235]; // #2563EB
  const successColor = [16, 185, 129]; // #10B981
  const darkColor = [30, 41, 59]; // #1E293B

  // Document Title Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text("SHANMUGA TRAVELS", 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("Car Order, Transport & Financial Statement", 14, 22);

  const currentDateTime = `${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`;
  doc.setFontSize(9);
  doc.text(`Generated: ${currentDateTime}`, 135, 22);

  // Filter Sub-header
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Report Period: ${label}`, 14, 37);

  // Financial Summary Cards Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 42, 182, 34, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text("FINANCIAL SUMMARY STATEMENT", 18, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total Trips: ${reportData.filteredTrips.length}`, 18, 55);
  doc.text(`Total Distance: ${reportData.totalKm.toLocaleString('en-IN')} KM`, 75, 55);
  doc.text(`Total Revenue Charged: RS. ${reportData.totalCostCustomers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 135, 55);

  doc.text(`Fuel Expenses: RS. ${reportData.totalFuel.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 18, 62);
  doc.text(`FASTag Tolls: RS. ${reportData.totalTolls.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 75, 62);
  doc.text(`Total Expenses: RS. ${reportData.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 135, 62);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...(reportData.netProfit >= 0 ? [5, 150, 105] : [220, 38, 38]));
  doc.text(`NET PROFIT FOR US: RS. ${reportData.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 18, 71);

  // Trip Details Table
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.text("TRIP ORDER LOG DETAILS", 14, 84);

  const tableRows = reportData.filteredTrips.map(t => {
    const rev = parseFloat(t.costCustomer || 0);
    const fuel = parseFloat(t.fuelExpense || 0);
    const toll = parseFloat(t.tollExpense || 0);
    const other = parseFloat(t.otherExpense || 0);
    const exp = fuel + toll + other;
    const profit = rev - exp;

    return [
      t.date,
      t.customerName || 'N/A',
      `${t.fromPlace} -> ${t.toPlace}`,
      `${t.startOdo || 0} / ${t.endOdo || 0}`,
      `${t.distanceKm || 0} KM`,
      `RS. ${rev.toFixed(2)}`,
      `RS. ${exp.toFixed(2)}`,
      `RS. ${profit.toFixed(2)}`
    ];
  });

  doc.autoTable({
    startY: 88,
    head: [['Date', 'Customer', 'Route', 'Odo (Start/End)', 'Driven', 'Charged', 'Expenses', 'Net Profit']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 42 },
      3: { cellWidth: 26 },
      4: { cellWidth: 18 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 7) {
        const valText = data.cell.raw;
        if (valText.includes('-')) {
          data.cell.styles.textColor = [220, 38, 38];
        } else {
          data.cell.styles.textColor = [5, 150, 105];
        }
      }
    }
  });

  // Footer Signature
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Shanmuga Travels - Confidential Transport Report | Page ${i} of ${pageCount}`, 14, 287);
  }

  doc.save(`${label}.pdf`);
}
