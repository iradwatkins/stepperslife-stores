/**
 * AI Merge Utility
 * Intelligently combines results from 3 AI flyer reads to get the most complete data
 *
 * VERIFICATION STRATEGY:
 * - Critical fields (date, time, location, event name, save-the-date) use MAJORITY VOTING
 * - If 2 out of 3 reads agree, use that value
 * - If all 3 disagree, prefer the longest/most complete value and log warning
 * - Other fields use longest value or union (for arrays)
 */

type ExtractedData = {
  eventName?: string | null;
  eventDate?: string | null;
  eventTime?: string | null;
  eventTimezone?: string | null;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  location?: string | null;
  description?: string | null;
  hostOrganizer?: string | null;
  contactInfo?: string | null;
  ticketPrice?: string | null;
  ageRestriction?: string | null;
  specialNotes?: string | null;
  categories?: string[] | null;
  eventType?: string | null;
  containsSaveTheDateText?: boolean | null;
  ticketPricesOnFlyer?: Array<{
    name: string;
    price: string;
    description?: string;
  }> | null;
  contacts?: Array<{
    name: string;
    phoneNumber?: string;
    email?: string;
    role?: string;
    organization?: string;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
      twitter?: string;
    };
  }> | null;
  [key: string]: any;
};

/**
 * Merge 3 AI extraction results into one optimal result
 * Strategy:
 * - CRITICAL FIELDS use majority voting (2 out of 3 agreement)
 * - Other fields take longest/most complete value
 */
export function mergeAIExtractions(
  read1: ExtractedData,
  read2: ExtractedData,
  read3: ExtractedData
): ExtractedData {
  const merged: ExtractedData = {};

  // Define critical fields that need majority voting verification
  const criticalFields = [
    'eventName',
    'eventDate',
    'eventTime',
    'venueName',
    'address',
    'city',
    'state',
    'eventType',
    'containsSaveTheDateText'
  ];

  // Get all unique keys from all 3 reads
  const allKeys = new Set([
    ...Object.keys(read1 || {}),
    ...Object.keys(read2 || {}),
    ...Object.keys(read3 || {})
  ]);

  for (const key of allKeys) {
    const value1 = read1?.[key];
    const value2 = read2?.[key];
    const value3 = read3?.[key];

    // Special handling for arrays
    if (key === 'categories') {
      merged[key] = mergeCategoriesArray(read1?.categories, read2?.categories, read3?.categories);
      continue;
    } else if (key === 'ticketPricesOnFlyer') {
      merged[key] = mergeTicketPrices(
        read1?.ticketPricesOnFlyer,
        read2?.ticketPricesOnFlyer,
        read3?.ticketPricesOnFlyer
      );
      continue;
    } else if (key === 'contacts') {
      merged[key] = mergeContacts(
        read1?.contacts,
        read2?.contacts,
        read3?.contacts
      );
      continue;
    }

    // CRITICAL FIELDS - Use majority voting
    if (criticalFields.includes(key)) {
      merged[key] = getMajorityValue(value1, value2, value3, key);
    }
    // NON-CRITICAL FIELDS - Use longest value
    else {
      const values = [value1, value2, value3].filter(v => v !== null && v !== undefined);

      if (values.length === 0) {
        merged[key] = null;
      } else if (typeof values[0] === 'string') {
        // For strings, take the longest
        merged[key] = values.reduce((longest, current) => {
          if (typeof current === 'string' && current.length > (longest?.length || 0)) {
            return current;
          }
          return longest;
        }, values[0]);
      } else {
        // For other types, use first non-null
        merged[key] = values[0];
      }
    }
  }

  return merged;
}

/**
 * Get majority value from 3 reads for critical fields
 * If 2 or 3 agree, use that value
 * If all 3 disagree, use longest and log warning
 */
function getMajorityValue(
  value1: any,
  value2: any,
  value3: any,
  fieldName: string
): any {
  const values = [value1, value2, value3];

  // Filter out null/undefined
  const nonNullValues = values.filter(v => v !== null && v !== undefined);

  if (nonNullValues.length === 0) {
    return null;
  }

  // Normalize values for comparison (trim strings, convert booleans)
  const normalizedValues = values.map(v => {
    if (typeof v === 'string') {
      return v.trim().toLowerCase();
    }
    return v;
  });

  // Count occurrences
  const valueCounts = new Map<string, { original: any; count: number }>();
  values.forEach((originalValue, index) => {
    if (originalValue === null || originalValue === undefined) return;

    const normalizedKey = JSON.stringify(normalizedValues[index]);
    const existing = valueCounts.get(normalizedKey);

    if (existing) {
      existing.count++;
    } else {
      valueCounts.set(normalizedKey, { original: originalValue, count: 1 });
    }
  });

  // Find majority (2 or more)
  let majorityValue = null;
  let maxCount = 0;

  valueCounts.forEach(({ original, count }) => {
    if (count >= 2) {
      // Found majority!
      majorityValue = original;
      maxCount = count;
    } else if (count > maxCount) {
      // No majority yet, but track highest count
      majorityValue = original;
      maxCount = count;
    }
  });

  // Log verification results for critical fields
  if (maxCount < 2) {
    console.warn(`⚠️  [AI Verification] Field "${fieldName}" - All 3 reads disagree:`, {
      read1: value1,
      read2: value2,
      read3: value3,
      selected: majorityValue
    });
  } else if (maxCount === 3) {
  } else {
  }

  // If all disagree and it's a string, prefer the longest
  if (maxCount === 1 && typeof value1 === 'string') {
    const longest = nonNullValues.reduce((longest, current) => {
      if (typeof current === 'string' && current.length > (longest?.length || 0)) {
        return current;
      }
      return longest;
    }, nonNullValues[0]);

    return longest;
  }

  return majorityValue;
}

/**
 * Merge categories arrays - take union of all unique categories
 */
function mergeCategoriesArray(
  arr1?: string[] | null,
  arr2?: string[] | null,
  arr3?: string[] | null
): string[] {
  const allCategories = new Set<string>();

  [arr1, arr2, arr3].forEach(arr => {
    if (Array.isArray(arr)) {
      arr.forEach(cat => {
        if (cat && typeof cat === 'string') {
          allCategories.add(cat);
        }
      });
    }
  });

  return Array.from(allCategories);
}

/**
 * Merge ticket prices - combine unique tickets by name
 */
function mergeTicketPrices(
  arr1?: Array<any> | null,
  arr2?: Array<any> | null,
  arr3?: Array<any> | null
): Array<{name: string; price: string; description?: string}> {
  const ticketMap = new Map<string, {name: string; price: string; description?: string}>();

  [arr1, arr2, arr3].forEach(arr => {
    if (Array.isArray(arr)) {
      arr.forEach(ticket => {
        if (ticket?.name) {
          const existing = ticketMap.get(ticket.name);
          // If we already have this ticket, prefer the one with more details
          if (!existing || (ticket.description && ticket.description.length > (existing.description?.length || 0))) {
            ticketMap.set(ticket.name, ticket);
          }
        }
      });
    }
  });

  return Array.from(ticketMap.values());
}

/**
 * Merge contacts - combine unique contacts by name/phone
 */
function mergeContacts(
  arr1?: Array<any> | null,
  arr2?: Array<any> | null,
  arr3?: Array<any> | null
): Array<{
  name: string;
  phoneNumber?: string;
  email?: string;
  role?: string;
  organization?: string;
  socialMedia?: any;
}> {
  const contactMap = new Map<string, any>();

  [arr1, arr2, arr3].forEach(arr => {
    if (Array.isArray(arr)) {
      arr.forEach(contact => {
        if (contact?.name) {
          // Use name + phone as unique key
          const key = `${contact.name}-${contact.phoneNumber || 'no-phone'}`;
          const existing = contactMap.get(key);

          if (!existing) {
            contactMap.set(key, contact);
          } else {
            // Merge contact details, preferring non-null values
            contactMap.set(key, {
              name: contact.name,
              phoneNumber: contact.phoneNumber || existing.phoneNumber,
              email: contact.email || existing.email,
              role: contact.role || existing.role,
              organization: contact.organization || existing.organization,
              socialMedia: {
                instagram: contact.socialMedia?.instagram || existing.socialMedia?.instagram,
                facebook: contact.socialMedia?.facebook || existing.socialMedia?.facebook,
                twitter: contact.socialMedia?.twitter || existing.socialMedia?.twitter,
              }
            });
          }
        }
      });
    }
  });

  return Array.from(contactMap.values());
}

/**
 * Get confidence score for an extraction (0-100)
 * Higher score = more complete data
 */
export function getExtractionConfidence(data: ExtractedData): number {
  let score = 0;
  let totalFields = 0;

  const importantFields = [
    'eventName', 'eventDate', 'eventTime', 'venueName',
    'address', 'city', 'state', 'description', 'eventType'
  ];

  for (const field of importantFields) {
    totalFields++;
    const value = data[field];
    if (value && value !== null && value !== '') {
      score++;
      // Bonus for longer descriptions
      if (field === 'description' && typeof value === 'string' && value.length > 100) {
        score += 0.5;
      }
    }
  }

  // Bonus for contacts and ticket prices
  if (Array.isArray(data.contacts) && data.contacts.length > 0) {
    score += 1;
  }
  if (Array.isArray(data.ticketPricesOnFlyer) && data.ticketPricesOnFlyer.length > 0) {
    score += 1;
  }

  return Math.round((score / (totalFields + 2)) * 100);
}

/**
 * Get verification summary showing how well the AI agreed across 3 reads
 */
export function getVerificationSummary(
  read1: ExtractedData,
  read2: ExtractedData,
  read3: ExtractedData
): {
  perfectAgreement: string[];
  majorityAgreement: string[];
  noAgreement: string[];
  overallConfidence: number;
} {
  const criticalFields = [
    'eventName',
    'eventDate',
    'eventTime',
    'venueName',
    'address',
    'city',
    'state',
    'eventType',
    'containsSaveTheDateText'
  ];

  const perfectAgreement: string[] = [];
  const majorityAgreement: string[] = [];
  const noAgreement: string[] = [];

  for (const field of criticalFields) {
    const value1 = read1?.[field];
    const value2 = read2?.[field];
    const value3 = read3?.[field];

    // Skip if all null
    if (!value1 && !value2 && !value3) continue;

    // Normalize for comparison
    const normalize = (v: any) => {
      if (typeof v === 'string') return v.trim().toLowerCase();
      return JSON.stringify(v);
    };

    const norm1 = value1 ? normalize(value1) : null;
    const norm2 = value2 ? normalize(value2) : null;
    const norm3 = value3 ? normalize(value3) : null;

    // Count matches
    const matches = [
      norm1 === norm2 && norm1 !== null,
      norm2 === norm3 && norm2 !== null,
      norm1 === norm3 && norm1 !== null
    ].filter(Boolean).length;

    if (norm1 === norm2 && norm2 === norm3 && norm1 !== null) {
      // All 3 agree (3/3)
      perfectAgreement.push(field);
    } else if (matches >= 1) {
      // At least 2 agree (2/3)
      majorityAgreement.push(field);
    } else {
      // All disagree (0/3)
      noAgreement.push(field);
    }
  }

  // Calculate overall confidence
  const totalChecked = perfectAgreement.length + majorityAgreement.length + noAgreement.length;
  const weightedScore = (perfectAgreement.length * 1.0) + (majorityAgreement.length * 0.7) + (noAgreement.length * 0.3);
  const overallConfidence = totalChecked > 0 ? Math.round((weightedScore / totalChecked) * 100) : 0;

  return {
    perfectAgreement,
    majorityAgreement,
    noAgreement,
    overallConfidence
  };
}
