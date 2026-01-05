import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jwtVerify } from "jose";
import { getJwtSecretEncoded } from "@/lib/auth/jwt-secret";

const JWT_SECRET = getJwtSecretEncoded();

// Gemini 1.5 Flash (FREE tier, PRIMARY)
// Free: 1,500 requests/day, 60/min - no credit card required
// Get key at: https://aistudio.google.com/app/apikey
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Ollama (self-hosted, FALLBACK) - for local development
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

// Type definitions for extracted data
interface ExtractedData {
  description: string;
  eventName: string;
  eventDate: string;
  eventEndDate?: string | null;
  eventTime: string;
  eventEndTime?: string | null;
  eventTimezone?: string | null;
  venueName: string;
  address?: string | null;
  city: string;
  state: string;
  zipCode?: string | null;
  hostOrganizer?: string | null;
  contacts?: Array<{
    name: string;
    phoneNumber?: string;
    email?: string;
    role?: string;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
      twitter?: string;
      tiktok?: string;
    };
  }>;
  ticketPrices: never[];
  ageRestriction?: string | null;
  specialNotes?: string | null;
  containsSaveTheDateText: boolean;
  eventType: "FREE_EVENT" | "TICKETED_EVENT" | "SAVE_THE_DATE";
  categories: string[];
}

interface ExtractionResult {
  success: boolean;
  extractedData?: ExtractedData;
  provider?: string;
  error?: string;
  message?: string;
  partialData?: Partial<ExtractedData>;
  warning?: string;
}

// Comprehensive extraction prompt (shared between providers)
const EXTRACTION_PROMPT = `EXPERT EVENT FLYER EXTRACTION PROMPT - TWO-PHASE EXTRACTION

You are an expert at extracting event information from party flyers, club flyers, and promotional event materials.

Your task: Extract ALL text from this flyer using a TWO-PHASE APPROACH and return it as clean, structured JSON.

═══════════════════════════════════════════════════════════════════
🚨 CRITICAL: SAVE THE DATE FLYERS - DATE IS MANDATORY
═══════════════════════════════════════════════════════════════════

⚠️ **IF THIS IS A "SAVE THE DATE" FLYER:**

The DATE is the ABSOLUTE MOST CRITICAL piece of information. You MUST find it.

**How to identify Save the Date flyers:**
- Contains text: "save the date", "save-the-date", "STD"
- Contains: "details to follow", "coming soon", "more info coming"
- Has event name and date but missing venue/time details

**FOR SAVE THE DATE FLYERS - DATE EXTRACTION RULES:**

1. **THE DATE IS MANDATORY - YOU MUST FIND IT**
   - Search the ENTIRE flyer for date information
   - Look EVERYWHERE: top, bottom, center, corners, sides, watermarks, background
   - Check ALL text sizes: large headlines, small print, decorative text
   - Look for ANY date format: "January 8-11", "Jan 8", "1/8/26", "January 2026"

2. **For Save the Date flyers:**
   - Description field: MUST include "Save the Date" and the DATE
   - eventName: Required
   - **eventDate: ABSOLUTELY REQUIRED - THIS IS THE MOST IMPORTANT FIELD**
   - venueName: Can be null (details to follow)
   - eventTime: Can be null (details to follow)
   - city/state: Extract if shown, null if not
   - containsSaveTheDateText: Must be true
   - eventType: Must be "SAVE_THE_DATE"

═══════════════════════════════════════════════════════════════════
🎯 TWO-PHASE EXTRACTION STRATEGY
═══════════════════════════════════════════════════════════════════

**PHASE 1: COMPLETE TEXT EXTRACTION WITH FORMATTING (MOST IMPORTANT)**
First, you MUST extract 100% of ALL visible text from the entire flyer image.
This goes in the "description" field and is the foundation for Phase 2.

Read the ENTIRE flyer carefully and capture:
- Main event title/headline
- All dates and times mentioned anywhere (including END time if shown)
- Venue name and address details
- ALL performer names, DJ names, special guests
- **TICKET PRICING INFORMATION** (very important - include all ticket types, prices, and details)
- Contact information (phone, email, social media)
- Age restrictions, dress codes, parking info
- Sponsors, hosts, organizers
- Fine print, disclaimers, legal text
- Any other visible text (don't skip anything!)

🚫 **CRITICAL EXCLUSION - DO NOT INCLUDE DESIGNER INFORMATION IN DESCRIPTION:**
- **COMPLETELY EXCLUDE** any text about graphic design, flyer design, or designer credits
- **DO NOT include** phrases like: "Design by", "Designed by", "Graphics by", "Flyer by"

**CRITICAL JSON FORMATTING:**
- In the JSON output, use the escape sequence \\n (backslash-n) for line breaks
- DO NOT use actual/literal newlines in the JSON string - this breaks JSON parsing
- Example CORRECT: "description": "Paragraph 1\\n\\nParagraph 2\\n\\nParagraph 3"

**PHASE 2: STRUCTURED FIELD EXTRACTION**
After Phase 1 is complete, use the description text you extracted to fill out the structured fields below.

═══════════════════════════════════════════════════════════════════
🚨 CRITICAL MANDATORY FIELDS (CANNOT BE NULL)
═══════════════════════════════════════════════════════════════════

1. DESCRIPTION (description) - ALL visible text from the flyer with proper formatting
2. EVENT NAME (eventName) - The main title, theme, or name of the event
3. EVENT DATE (eventDate) - Extract EXACTLY as shown on flyer - DO NOT REFORMAT
4. EVENT TIME (eventTime) - Format as "H:MM PM" or "H:MM AM"
5. VENUE NAME (venueName) - The name of the location/club/venue
6. CITY (city) - Extract the city name
7. STATE (state) - Extract state as 2-letter abbreviation

═══════════════════════════════════════════════════════════════════
📋 ADDITIONAL FIELDS (Extract if present, null if not)
═══════════════════════════════════════════════════════════════════

8. EVENT END DATE (eventEndDate) - Only for multi-day events
9. EVENT END TIME (eventEndTime) - If the flyer shows when the event ENDS
10. FULL ADDRESS (address) - Include street number AND street name
11. ZIP CODE (zipCode) - Extract if visible
12. TIMEZONE (eventTimezone) - ONLY if explicitly mentioned
13. HOST/ORGANIZER (hostOrganizer) - Person or organization hosting
14. TICKET PRICES (ticketPrices) - Leave as empty array [], pricing goes in description
15. AGE RESTRICTION (ageRestriction) - "21+", "18+", "All ages"
16. CONTACT INFORMATION (contacts) - Array with name, phone, email, socialMedia
17. SPECIAL NOTES (specialNotes) - Important notes not in other fields
18. SAVE THE DATE CHECK (containsSaveTheDateText) - Boolean: true or false
19. EVENT TYPE (eventType) - "FREE_EVENT", "TICKETED_EVENT", or "SAVE_THE_DATE"
20. EVENT CATEGORIES (categories) - Array: "Set", "Workshop", "Cruise", "Holiday Event", "Weekend Event"

═══════════════════════════════════════════════════════════════════
📤 JSON OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════

Return this EXACT structure:

{
  "description": "string (REQUIRED - ALL text from flyer)",
  "eventName": "string (REQUIRED)",
  "eventDate": "string (REQUIRED - EXACT text as shown on flyer)",
  "eventEndDate": "string or null",
  "eventTime": "string (REQUIRED - formatted as 'H:MM PM/AM')",
  "eventEndTime": "string or null",
  "eventTimezone": "string or null",
  "venueName": "string (REQUIRED)",
  "address": "string or null",
  "city": "string (REQUIRED)",
  "state": "string (REQUIRED)",
  "zipCode": "string or null",
  "hostOrganizer": "string or null",
  "contacts": [],
  "ticketPrices": [],
  "ageRestriction": "string or null",
  "specialNotes": "string or null",
  "containsSaveTheDateText": boolean,
  "eventType": "FREE_EVENT or TICKETED_EVENT or SAVE_THE_DATE",
  "categories": []
}

CRITICAL RULES:
✅ Return ONLY valid JSON - no markdown, no code blocks, no explanations
✅ Use null for missing fields (not empty strings, not "N/A")
✅ Use \\n for line breaks in description, NOT actual newlines

BEGIN TWO-PHASE EXTRACTION NOW.`;

/**
 * Verify user is authenticated and is an admin or organizer
 */
async function verifyAuth(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const token = request.cookies.get("session_token")?.value || request.cookies.get("auth-token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;
    // Allow admin and organizer roles to use AI extraction
    if (role !== "admin" && role !== "organizer") return null;
    return { userId: payload.userId as string, role };
  } catch {
    return null;
  }
}

/**
 * Extract image data from filepath via URL fetch
 * Note: Local file reading is not available on Vercel serverless functions
 */
async function getImageData(filepath: string): Promise<{ base64: string; mimeType: string }> {
  // Build the full URL
  const imageUrl = filepath.startsWith("http")
    ? filepath
    : `${process.env.NEXT_PUBLIC_APP_URL || "https://stepperslife.com"}${filepath}`;

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

  return {
    base64: Buffer.from(imageBuffer).toString("base64"),
    mimeType: contentType.split(";")[0].trim(),
  };
}

/**
 * Parse and validate the AI response
 */
function parseExtractionResponse(
  responseText: string,
  provider: string
): ExtractionResult {
  let cleanedText = responseText.trim();

  // Remove markdown code blocks if present
  if (cleanedText.startsWith("```json")) {
    cleanedText = cleanedText.substring(7);
  } else if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.substring(3);
  }
  if (cleanedText.endsWith("```")) {
    cleanedText = cleanedText.substring(0, cleanedText.length - 3);
  }
  cleanedText = cleanedText.trim();

  // Parse JSON
  const extractedData = JSON.parse(cleanedText);

  // Check if AI returned an error response
  if (extractedData.error === "EXTRACTION_FAILED") {
    const partialData = extractedData.partialData || {};
    const isSaveTheDate =
      partialData.containsSaveTheDateText === true ||
      partialData.eventType === "SAVE_THE_DATE";

    if (isSaveTheDate && partialData.eventName && partialData.eventDate) {
      return {
        success: true,
        extractedData: partialData,
        provider,
        warning: "Save the Date flyer - missing venue/time details (expected)",
      };
    }

    return {
      success: false,
      error: "INCOMPLETE_FLYER_DATA",
      message: extractedData.message || "The flyer is missing required information.",
      partialData,
    };
  }

  // Validate required fields
  const isSaveTheDate =
    extractedData.containsSaveTheDateText === true ||
    extractedData.eventType === "SAVE_THE_DATE" ||
    (extractedData.description &&
      extractedData.description.toLowerCase().includes("save the date"));

  const requiredFields = isSaveTheDate
    ? ["description", "eventName", "eventDate"]
    : ["description", "eventName", "eventDate", "eventTime", "venueName", "city", "state"];

  const missingFields = requiredFields.filter((field) => !extractedData[field]);

  if (missingFields.length > 0) {
    return {
      success: false,
      error: "INCOMPLETE_FLYER_DATA",
      message: `Missing required fields: ${missingFields.join(", ")}`,
      partialData: extractedData,
    };
  }

  return {
    success: true,
    extractedData,
    provider,
  };
}

/**
 * Extract flyer data using Gemini 1.5 Flash (FREE tier)
 * Primary provider - works in production on Coolify
 */
async function extractWithGemini(
  base64Image: string,
  mimeType: string
): Promise<ExtractionResult> {
  if (!genAI) {
    throw new Error("Gemini API not configured - GEMINI_API_KEY not set");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
  ]);

  const response = await result.response;
  const extractedText = response.text();

  if (!extractedText) {
    throw new Error("No response from Gemini");
  }

  return parseExtractionResponse(extractedText, "gemini-1.5-flash");
}

/**
 * Extract flyer data using Ollama Vision (self-hosted)
 * Fallback provider - for local development
 */
async function extractWithOllama(base64Image: string): Promise<ExtractionResult> {
  const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2-vision:11b",
      prompt: EXTRACTION_PROMPT,
      images: [base64Image],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 4096,
      },
    }),
  });

  if (!ollamaResponse.ok) {
    const errorText = await ollamaResponse.text();
    throw new Error(`Ollama API error: ${ollamaResponse.status} ${errorText}`);
  }

  const ollamaData = await ollamaResponse.json();
  const extractedText = ollamaData.response;

  if (!extractedText) {
    throw new Error("No response from Ollama");
  }

  return parseExtractionResponse(extractedText, "ollama-llama3.2-vision");
}

/**
 * Main POST handler
 * Uses Gemini (FREE) as primary, Ollama as fallback
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication - admin/organizer only
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized - Admin or organizer access required" },
        { status: 401 }
      );
    }

    const { filepath } = await request.json();

    if (!filepath) {
      return NextResponse.json({ error: "No filepath provided" }, { status: 400 });
    }

    // Get image data
    let imageData: { base64: string; mimeType: string };
    try {
      imageData = await getImageData(filepath);
    } catch (imageError) {
      console.error("[AI Extraction] Failed to get image:", imageError);
      return NextResponse.json(
        {
          error: "Failed to load flyer image",
          details: imageError instanceof Error ? imageError.message : "Unknown error",
        },
        { status: 400 }
      );
    }

    // Try Gemini first (FREE tier), fallback to Ollama
    let result: ExtractionResult;
    let fallbackUsed = false;

    if (genAI) {
      // Primary: Gemini 1.5 Flash (FREE)
      try {
        result = await extractWithGemini(imageData.base64, imageData.mimeType);
      } catch (geminiError) {
        console.warn("[AI Extraction] Gemini failed, trying Ollama fallback:", geminiError);

        // Fallback to Ollama (local dev)
        try {
          result = await extractWithOllama(imageData.base64);
          fallbackUsed = true;
        } catch (ollamaError) {
          console.error("[AI Extraction] Both Gemini and Ollama failed");
          throw new Error(
            `AI extraction failed. Gemini: ${geminiError instanceof Error ? geminiError.message : "Unknown"}. Ollama: ${ollamaError instanceof Error ? ollamaError.message : "Unknown"}`
          );
        }
      }
    } else {
      // No Gemini key - use Ollama only
      result = await extractWithOllama(imageData.base64);
    }

    // Return the result
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message,
          partialData: result.partialData,
          provider: result.provider,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      extractedData: result.extractedData,
      provider: result.provider,
      fallbackUsed,
      ...(result.warning && { warning: result.warning }),
    });
  } catch (error) {
    console.error("[AI Extraction] Error:", error);

    return NextResponse.json(
      {
        error: "Failed to extract flyer data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler to check AI provider status
 */
export async function GET() {
  const geminiAvailable = !!process.env.GEMINI_API_KEY;

  // Check Ollama availability
  let ollamaAvailable = false;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    ollamaAvailable = response.ok;
  } catch {
    ollamaAvailable = false;
  }

  return NextResponse.json({
    providers: {
      gemini: {
        available: geminiAvailable,
        model: "gemini-1.5-flash",
        tier: "FREE",
        primary: true,
      },
      ollama: {
        available: ollamaAvailable,
        url: OLLAMA_BASE_URL,
        model: "llama3.2-vision:11b",
        primary: false,
      },
    },
    strategy: "Gemini (FREE) primary, Ollama fallback",
    recommendation: geminiAvailable ? "gemini" : ollamaAvailable ? "ollama" : "none",
  });
}
