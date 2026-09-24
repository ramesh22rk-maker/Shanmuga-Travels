// Tariff & FASTag Route Database
const ROUTE_DATABASE = {
  // Common preset places for quick selection
  places: [
    "Hosur",
    "Hosur Bus Stand",
    "Hosur SIPCOT",
    "Electronic City",
    "Kempegowda Airport (BLR)",
    "Koramangala",
    "Indiranagar",
    "Whitefield Tech Park",
    "HSR Layout",
    "Peenya Industrial Area",
    "Bannerghatta Road",
    "Mysuru Road"
  ],

  // Auto Distance (KM) & Toll Matrix for common routes
  calculateRoute: function(fromPlace = '', toPlace = '') {
    const from = fromPlace.toLowerCase().trim();
    const to = toPlace.toLowerCase().trim();

    if (!from || !to) return { distanceKm: 0, autoToll: 0 };

    const isHosur = from.includes('hosur') || to.includes('hosur');
    const isAirport = from.includes('airport') || to.includes('airport') || from.includes('kempegowda') || to.includes('blr');
    const isECity = from.includes('electronic') || to.includes('ecity');
    const isWhitefield = from.includes('whitefield') || to.includes('itpl');
    const isKoramangala = from.includes('koramangala') || to.includes('hsr') || from.includes('indiranagar');

    // Distance & FASTag estimations
    if (isHosur && isAirport) {
      return { distanceKm: 75, autoToll: 220 };
    }
    if (isHosur && isECity) {
      return { distanceKm: 22, autoToll: 175 };
    }
    if (isHosur && isWhitefield) {
      return { distanceKm: 48, autoToll: 110 };
    }
    if (isHosur && isKoramangala) {
      return { distanceKm: 38, autoToll: 110 };
    }
    if (isECity && isAirport) {
      return { distanceKm: 55, autoToll: 110 };
    }

    // Default estimate if custom places entered
    return { distanceKm: 35, autoToll: 110 };
  }
};

// Initial default trips
const DEFAULT_DATA = {
  trips: [
    {
      id: "TRP-101",
      status: "completed",
      date: new Date().toISOString().split('T')[0],
      startTime: "09:30 AM",
      customerName: "Koramangala Motors",
      fromPlace: "Hosur",
      toPlace: "Kempegowda Airport (BLR)",
      distanceKm: 75,
      startOdo: 45200,
      endOdo: 45275,
      costCustomer: 2300,
      fuelExpense: 650.00,
      tollExpense: 220.00,
      otherExpense: 100.00,
      otherNote: "Refreshment"
    }
  ]
};
