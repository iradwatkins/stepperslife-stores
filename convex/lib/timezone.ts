/**
 * Timezone utilities for Convex backend
 * Get timezone based on US state and city
 */

export function getTimezoneFromLocation(city: string, state: string): string {
  const stateUpper = state.toUpperCase();
  const cityLower = city.toLowerCase();

  // Eastern Time (ET)
  const easternStates = [
    "CT",
    "DE",
    "FL",
    "GA",
    "ME",
    "MD",
    "MA",
    "NH",
    "NJ",
    "NY",
    "NC",
    "OH",
    "PA",
    "RI",
    "SC",
    "VT",
    "VA",
    "WV",
    "DC",
  ];

  // Central Time (CT)
  const centralStates = ["AL", "AR", "IL", "IA", "LA", "MN", "MS", "MO", "OK", "WI"];

  // Mountain Time (MT)
  const mountainStates = ["CO", "MT", "NM", "UT", "WY"];

  // Pacific Time (PT)
  const pacificStates = ["CA", "NV", "OR", "WA"];

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
      "evansville",
      "jasper",
      "vincennes",
      "tell city",
      "gary",
      "hammond",
      "east chicago",
    ];
    if (centralIndianaCities.some((c) => cityLower.includes(c))) {
      return "America/Chicago";
    }
    return "America/New_York";
  }

  // Kentucky - split between Eastern and Central
  if (stateUpper === "KY") {
    const centralKentuckyCities = ["louisville", "owensboro", "bowling green", "hopkinsville"];
    if (centralKentuckyCities.some((c) => cityLower.includes(c))) {
      return "America/Chicago";
    }
    return "America/New_York";
  }

  // Tennessee - split between Eastern and Central
  if (stateUpper === "TN") {
    const easternTennesseeCities = ["knoxville", "chattanooga", "bristol", "johnson city"];
    if (easternTennesseeCities.some((c) => cityLower.includes(c))) {
      return "America/New_York";
    }
    return "America/Chicago";
  }

  // Michigan - most is Eastern, but Upper Peninsula has some Central
  if (stateUpper === "MI") {
    const centralMichiganCities = ["ironwood", "wakefield", "iron mountain"];
    if (centralMichiganCities.some((c) => cityLower.includes(c))) {
      return "America/Chicago";
    }
    return "America/New_York";
  }

  // North Dakota, South Dakota, Nebraska, Kansas, Texas - split states
  if (stateUpper === "ND" || stateUpper === "SD") {
    return "America/Chicago"; // Default to Central
  }

  if (stateUpper === "NE") {
    const mountainNebraskaCities = ["scottsbluff", "sidney"];
    if (mountainNebraskaCities.some((c) => cityLower.includes(c))) {
      return "America/Denver";
    }
    return "America/Chicago";
  }

  if (stateUpper === "KS") {
    const mountainKansasCities = ["goodland", "sharon springs"];
    if (mountainKansasCities.some((c) => cityLower.includes(c))) {
      return "America/Denver";
    }
    return "America/Chicago";
  }

  if (stateUpper === "TX") {
    const mountainTexasCities = ["el paso", "hudspeth"];
    if (mountainTexasCities.some((c) => cityLower.includes(c))) {
      return "America/Denver";
    }
    return "America/Chicago";
  }

  // Oregon - most is Pacific, but Malheur County is Mountain
  if (stateUpper === "OR") {
    const mountainOregonCities = ["ontario", "nyssa", "vale"];
    if (mountainOregonCities.some((c) => cityLower.includes(c))) {
      return "America/Denver";
    }
    return "America/Los_Angeles";
  }

  // Idaho - split between Mountain and Pacific
  if (stateUpper === "ID") {
    const pacificIdahoCities = ["lewiston", "moscow", "coeur d'alene"];
    if (pacificIdahoCities.some((c) => cityLower.includes(c))) {
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
 * Parse event date/time string in the event's timezone
 * Returns UTC timestamp
 */
export function parseEventDateTime(
  dateString: string | undefined,
  timeString: string | undefined,
  timezone: string
): number | undefined {
  if (!dateString) return undefined;

  try {
    let processedDateString = dateString.trim();

    // Extract START date from CROSS-MONTH date ranges first
    // Examples: "JULY 31 - AUG 2 2026" → "JULY 31, 2026"
    //           "March 30 - April 2, 2026" → "March 30, 2026"
    //           "DEC 28 - JAN 3, 2026" → "DEC 28, 2026"
    const crossMonthRangePattern =
      /(\w+\s+\d+(?:ST|ND|RD|TH)?)\s*[-–]\s*(\w+\s+\d+(?:ST|ND|RD|TH)?)\s*(,?\s*\d{4})?/i;
    if (crossMonthRangePattern.test(processedDateString)) {
      const match = processedDateString.match(crossMonthRangePattern);
      if (match) {
        // Extract: start month+day, and year (if present)
        const startDate = match[1]; // e.g., "JULY 31"
        const yearPart = match[3] || ""; // e.g., ", 2026" or " 2026"

        // Ensure there's a comma before the year if year exists and doesn't already have one
        if (yearPart && !yearPart.startsWith(",")) {
          processedDateString = `${startDate}, ${yearPart.trim()}`;
        } else if (yearPart) {
          processedDateString = `${startDate}${yearPart}`;
        } else {
          processedDateString = startDate;
        }
      }
    }
    // Otherwise, extract START date from SAME-MONTH date ranges
    // Examples: "March 12-15, 2026" → "March 12, 2026"
    //           "NOVEMBER 20-23TH, 2025" → "NOVEMBER 20TH, 2025"
    //           "Jan 8-11" → "Jan 8"
    else if (processedDateString.match(/\d+-\d+/)) {
      // Has a range like "12-15" or "20-23TH"
      // Match: (start number)-(end number)(optional suffix like TH, ST, RD, ND)(rest of string)
      processedDateString = processedDateString.replace(/(\d+)-\d+([A-Z]{0,2})/, "$1$2");
      // "March 12-15, 2026" → "March 12, 2026"
      // "NOVEMBER 20-23TH, 2025" → "NOVEMBER 20TH, 2025"
      // "Jan 8-11" → "Jan 8"
    }

    // Normalize date string for JavaScript Date parser
    // 1. Remove day-of-week names and preceding ordinals
    // Examples: "1ST SATURDAY NOV. 1ST, 2025" → "NOV. 1ST, 2025"
    //           "FRIDAY, DECEMBER 25, 2025" → "DECEMBER 25, 2025"
    //           "2ND WEDNESDAY APRIL 10, 2025" → "APRIL 10, 2025"
    const dayOfWeekPattern =
      /\b(\d+(ST|ND|RD|TH)?\s+)?(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY|MON|TUE|WED|THU|FRI|SAT|SUN)[,\s]*/gi;
    processedDateString = processedDateString.replace(dayOfWeekPattern, "");

    // 2. Remove ordinal suffixes (TH, ST, RD, ND)
    processedDateString = processedDateString.replace(/(\d+)(ST|ND|RD|TH)\b/gi, "$1");
    // "NOVEMBER 20TH, 2025" → "NOVEMBER 20, 2025"

    // 3. Convert uppercase month names to proper case
    const monthMap: Record<string, string> = {
      JANUARY: "January",
      FEBRUARY: "February",
      MARCH: "March",
      APRIL: "April",
      MAY: "May",
      JUNE: "June",
      JULY: "July",
      AUGUST: "August",
      SEPTEMBER: "September",
      OCTOBER: "October",
      NOVEMBER: "November",
      DECEMBER: "December",
      JAN: "Jan",
      FEB: "Feb",
      MAR: "Mar",
      APR: "Apr",
      JUN: "Jun",
      JUL: "Jul",
      AUG: "Aug",
      SEP: "Sep",
      OCT: "Oct",
      NOV: "Nov",
      DEC: "Dec",
    };

    for (const [upper, proper] of Object.entries(monthMap)) {
      const regex = new RegExp(`\\b${upper}\\b`, "gi");
      processedDateString = processedDateString.replace(regex, proper);
    }
    // "NOVEMBER 20, 2025" → "November 20, 2025"

    // SMART YEAR DETECTION: If no year is present, add current year or next year
    // Example: "March 22" → "March 22, 2026" (if March has already passed)
    //          "December 13" → "December 13, 2025" (if December hasn't passed yet)
    const hasYear = /\d{4}/.test(processedDateString);
    if (!hasYear) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11

      // Try parsing with current year first
      const testDateStr = `${processedDateString}, ${currentYear}`;
      const testDate = new Date(testDateStr);

      if (!isNaN(testDate.getTime())) {
        const eventMonth = testDate.getMonth();

        // If the event month has already passed this year, use next year
        if (eventMonth < currentMonth) {
          processedDateString = `${processedDateString}, ${currentYear + 1}`;
        } else {
          processedDateString = testDateStr;
        }
      } else {
        // Fallback: just add current year if parsing fails
        processedDateString = `${processedDateString}, ${currentYear}`;
      }
    }

    // Combine date and time if both provided
    let dateTimeStr = processedDateString;

    // If time is provided separately, append it
    if (timeString) {
      dateTimeStr = `${processedDateString} ${timeString}`;
    }

    // Parse the date string
    // Since date-fns-tz is not available in Convex, we need to manually handle timezone conversion
    // Strategy: Parse as UTC, then adjust for the event's timezone offset

    // First, parse the date string (will be interpreted as local/browser time)
    const date = new Date(dateTimeStr);

    if (isNaN(date.getTime())) {
      console.warn(
        `[parseEventDateTime] Invalid date: "${dateTimeStr}" (original: "${dateString}")`
      );
      return undefined;
    }

    // Get the timezone offset in hours for the event's timezone
    // These are standard offsets - DST adjustments should be handled by the display layer
    const timezoneOffsets: Record<string, number> = {
      "America/New_York": -5, // EST
      "America/Chicago": -6, // CST
      "America/Denver": -7, // MST
      "America/Los_Angeles": -8, // PST
      "America/Phoenix": -7, // MST (no DST)
      "America/Anchorage": -9, // AKST
      "Pacific/Honolulu": -10, // HST
    };

    // Get the offset for this timezone (default to EST if not found)
    const timezoneOffset = timezoneOffsets[timezone] || -5;

    // JavaScript Date parses strings in local time, but we want it in the EVENT's timezone
    // Strategy: Get the UTC timestamp, then adjust for timezone difference
    //
    // Example: User enters "November 7, 2025 8:00 PM" for an event in Chicago (UTC-6)
    // - new Date("November 7, 2025 8:00 PM") creates Nov 7 8PM in SERVER'S timezone
    // - We need Nov 7 8PM in CHICAGO's timezone
    // - Get the local offset of the parsed date
    const localOffset = -date.getTimezoneOffset() / 60; // Convert minutes to hours, negate for correct sign

    // Calculate the difference between event timezone and the parsing timezone
    const offsetDifference = timezoneOffset - localOffset;

    // Adjust the timestamp by the offset difference
    const adjustedTimestamp = date.getTime() - offsetDifference * 60 * 60 * 1000;


    return adjustedTimestamp;
  } catch (error) {
    console.error(
      `[parseEventDateTime] Error parsing date: "${dateString}" with time: "${timeString}"`,
      error
    );
    return undefined;
  }
}
