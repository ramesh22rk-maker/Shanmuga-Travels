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
