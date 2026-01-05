/**
 * AzuraCast API Proxy Route
 *
 * This route proxies requests to the AzuraCast API, handling authentication
 * and request transformation. It allows the Next.js app to communicate with
 * AzuraCast without exposing API keys to the client.
 *
 * Usage:
 *   GET /api/radio/azuracast/nowplaying -> AzuraCast /api/nowplaying
 *   GET /api/radio/azuracast/station/1 -> AzuraCast /api/station/1
 *   POST /api/radio/azuracast/station/1/backend/skip -> AzuraCast /api/station/1/backend/skip
 */

import { NextRequest, NextResponse } from 'next/server';

const AZURACAST_BASE_URL = process.env.AZURACAST_API_URL || 'https://radio.stepperslife.com';
const AZURACAST_API_KEY = process.env.AZURACAST_API_KEY || '';

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/nowplaying',
  '/stations',
  '/station/\\d+$',
  '/station/\\d+/nowplaying',
  '/station/\\d+/history',
  '/station/\\d+/schedule',
];

// Endpoints that require admin authentication
const ADMIN_ENDPOINTS = [
  '/admin',
  '/station/\\d+/streamers',
  '/station/\\d+/streamer',
  '/station/\\d+/files',
  '/station/\\d+/playlists',
  '/station/\\d+/backend',
  '/station/\\d+/frontend',
  '/station/\\d+/listeners',
];

function isPublicEndpoint(path: string): boolean {
  return PUBLIC_ENDPOINTS.some(pattern => {
    const regex = new RegExp(`^${pattern}`);
    return regex.test(path);
  });
}

function isAdminEndpoint(path: string): boolean {
  return ADMIN_ENDPOINTS.some(pattern => {
    const regex = new RegExp(`^${pattern}`);
    return regex.test(path);
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = '/' + resolvedParams.path.join('/');

  try {
    const url = `${AZURACAST_BASE_URL}/api${path}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add API key for admin endpoints
    if (isAdminEndpoint(path) && AZURACAST_API_KEY) {
      headers['X-API-Key'] = AZURACAST_API_KEY;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      next: { revalidate: isPublicEndpoint(path) ? 5 : 0 }, // Cache public endpoints for 5 seconds
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `AzuraCast API Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('AzuraCast proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to AzuraCast' },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = '/' + resolvedParams.path.join('/');

  // Only allow admin endpoints for POST requests
  if (!isAdminEndpoint(path)) {
    return NextResponse.json(
      { error: 'This endpoint does not support POST requests' },
      { status: 405 }
    );
  }

  if (!AZURACAST_API_KEY) {
    return NextResponse.json(
      { error: 'AzuraCast API key not configured' },
      { status: 500 }
    );
  }

  try {
    const url = `${AZURACAST_BASE_URL}/api${path}`;
    let body: string | undefined;

    try {
      const json = await request.json();
      body = JSON.stringify(json);
    } catch {
      // No body, that's okay for some endpoints
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AZURACAST_API_KEY,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `AzuraCast API Error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('AzuraCast proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to AzuraCast' },
      { status: 502 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = '/' + resolvedParams.path.join('/');

  if (!AZURACAST_API_KEY) {
    return NextResponse.json(
      { error: 'AzuraCast API key not configured' },
      { status: 500 }
    );
  }

  try {
    const url = `${AZURACAST_BASE_URL}/api${path}`;
    const body = await request.json();

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AZURACAST_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `AzuraCast API Error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('AzuraCast proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to AzuraCast' },
      { status: 502 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = '/' + resolvedParams.path.join('/');

  if (!AZURACAST_API_KEY) {
    return NextResponse.json(
      { error: 'AzuraCast API key not configured' },
      { status: 500 }
    );
  }

  try {
    const url = `${AZURACAST_BASE_URL}/api${path}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-API-Key': AZURACAST_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `AzuraCast API Error: ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('AzuraCast proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to AzuraCast' },
      { status: 502 }
    );
  }
}
