/**
 * Get timezone based on US state
 * Uses city for edge cases (e.g., Indiana)
 */
export function getTimezoneFromLocation(city: string, state: string): string {
  const stateUpper = state.toUpperCase();
  const cityLower = city.toLowerCase();

  // Eastern Time (ET)
  const easternStates = [
    "CT", "DE", "FL", "GA", "ME", "MD", "MA", "NH", "NJ", "NY",
    "NC", "OH", "PA", "RI", "SC", "VT", "VA", "WV", "DC"
  ];

  // Central Time (CT)
  const centralStates = [
    "AL", "AR", "IL", "IA", "LA", "MN", "MS", "MO", "OK", "WI"
  ];

  // Mountain Time (MT)
  const mountainStates = [
    "CO", "MT", "NM", "UT", "WY"
  ];

  // Pacific Time (PT)
  const pacificStates = [
    "CA", "NV", "OR", "WA"
  ];

  // Alaska Time (AKT)
  if (stateUpper === "AK") {
    return "America/Anchorage";
  }

  // Hawaii-Aleutian Time (HST)
  if (stateUpper === "HI") {
    return "Pacific/Honolulu";
  }

  // Indiana - most cities are Eastern, but some are Central
  if (stateUpper === "IN") {
    const centralIndianaCities = [
      "evansville", "jasper", "vincennes", "tell city",
      "gary", "hammond", "east chicago"
    ];
    if (centralIndianaCities.some(c => cityLower.includes(c))) {
      return "America/Chicago";
    }
    return "America/New_York";
  }

  // Kentucky - split between Eastern and Central
  if (stateUpper === "KY") {
    const centralKentuckyCities = [
      "louisville", "owensboro", "bowling green", "hopkinsville"
    ];
    if (centralKentuckyCities.some(c => cityLower.includes(c))) {
      return "America/Chicago";
    }
    return "America/New_York";
  }

  // Tennessee - split between Eastern and Central
  if (stateUpper === "TN") {
    const easternTennesseeCities = [
      "knoxville", "chattanooga", "bristol", "johnson city"
    ];
    if (easternTennesseeCities.some(c => cityLower.includes(c))) {
      return "America/New_York";
    }
    return "America/Chicago";
  }

  // Michigan - most is Eastern, but Upper Peninsula has some Central
  if (stateUpper === "MI") {
    const centralMichiganCities = ["ironwood", "wakefield", "iron mountain"];
    if (centralMichiganCities.some(c => cityLower.includes(c))) {
      return "America/Chicago";
    }
    return "America/New_York";
  }

  // North Dakota, South Dakota, Nebraska, Kansas, Texas - split states
  if (stateUpper === "ND" || stateUpper === "SD") {
    // Most of these states are Central, but western parts are Mountain
    return "America/Chicago"; // Default to Central
  }

  if (stateUpper === "NE") {
    const mountainNebraskaCities = ["scottsbluff", "sidney"];
    if (mountainNebraskaCities.some(c => cityLower.includes(c))) {
      return "America/Denver";
    }
    return "America/Chicago";
  }

  if (stateUpper === "KS") {
    const mountainKansasCities = ["goodland", "sharon springs"];
    if (mountainKansasCities.some(c => cityLower.includes(c))) {
      return "America/Denver";
    }
    return "America/Chicago";
  }

  if (stateUpper === "TX") {
    const mountainTexasCities = ["el paso", "hudspeth"];
    if (mountainTexasCities.some(c => cityLower.includes(c))) {
      return "America/Denver";
    }
    return "America/Chicago";
  }

  // Oregon - most is Pacific, but Malheur County is Mountain
  if (stateUpper === "OR") {
    const mountainOregonCities = ["ontario", "nyssa", "vale"];
    if (mountainOregonCities.some(c => cityLower.includes(c))) {
      return "America/Denver";
    }
    return "America/Los_Angeles";
  }

  // Idaho - split between Mountain and Pacific
  if (stateUpper === "ID") {
    const pacificIdahoCities = ["lewiston", "moscow", "coeur d'alene"];
    if (pacificIdahoCities.some(c => cityLower.includes(c))) {
      return "America/Los_Angeles";
    }
    return "America/Denver";
  }

  // Arizona - no DST, always Mountain Standard Time
  if (stateUpper === "AZ") {
    return "America/Phoenix";
  }

  // Default by state groups
  if (easternStates.includes(stateUpper)) {
    return "America/New_York";
  }
  if (centralStates.includes(stateUpper)) {
    return "America/Chicago";
  }
  if (mountainStates.includes(stateUpper)) {
    return "America/Denver";
  }
  if (pacificStates.includes(stateUpper)) {
    return "America/Los_Angeles";
  }

  // Default to Eastern if unknown
  return "America/New_York";
}

/**
 * Get friendly timezone name
 */
export function getTimezoneName(timezone: string): string {
  const timezoneNames: Record<string, string> = {
    "America/New_York": "Eastern Time (ET)",
    "America/Chicago": "Central Time (CT)",
    "America/Denver": "Mountain Time (MT)",
    "America/Los_Angeles": "Pacific Time (PT)",
    "America/Phoenix": "Mountain Time - Arizona (no DST)",
    "America/Anchorage": "Alaska Time (AKT)",
    "Pacific/Honolulu": "Hawaii Time (HST)",
  };

  return timezoneNames[timezone] || timezone;
}
