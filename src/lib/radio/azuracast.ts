/**
 * AzuraCast API Client Library
 *
 * This library provides a typed interface for interacting with the AzuraCast API.
 * AzuraCast is the streaming infrastructure for SteppersLife Radio.
 *
 * API Documentation: https://www.azuracast.com/docs/developers/api/
 */

// AzuraCast server configuration
const AZURACAST_BASE_URL = process.env.AZURACAST_API_URL || 'https://radio.stepperslife.com';
const AZURACAST_API_KEY = process.env.AZURACAST_API_KEY || '';

// ============================================
// Type Definitions
// ============================================

export interface AzuraCastStation {
  id: number;
  name: string;
  shortcode: string;
  description: string;
  frontend: string;
  backend: string;
  timezone: string;
  listen_url: string;
  url: string;
  public_player_url: string;
  playlist_pls_url: string;
  playlist_m3u_url: string;
  is_public: boolean;
  mounts: AzuraCastMount[];
  remotes: unknown[];
  hls_enabled: boolean;
  hls_url: string | null;
  hls_listeners: number;
}

export interface AzuraCastMount {
  id: number;
  name: string;
  url: string;
  bitrate: number;
  format: string;
  listeners: AzuraCastListeners;
  path: string;
  is_default: boolean;
}

export interface AzuraCastListeners {
  total: number;
  unique: number;
  current: number;
}

export interface AzuraCastNowPlaying {
  station: AzuraCastStation;
  listeners: AzuraCastListeners;
  live: {
    is_live: boolean;
    streamer_name: string;
    broadcast_start: number | null;
    art: string | null;
  };
  now_playing: {
    sh_id: number;
    played_at: number;
    duration: number;
    playlist: string;
    streamer: string;
    is_request: boolean;
    song: AzuraCastSong;
    elapsed: number;
    remaining: number;
  };
  playing_next: {
    cued_at: number;
    played_at: number;
    duration: number;
    playlist: string;
    is_request: boolean;
    song: AzuraCastSong;
  } | null;
  song_history: Array<{
    sh_id: number;
    played_at: number;
    duration: number;
    playlist: string;
    streamer: string;
    is_request: boolean;
    song: AzuraCastSong;
  }>;
  is_online: boolean;
  cache: string | null;
}

export interface AzuraCastSong {
  id: string;
  text: string;
  artist: string;
  title: string;
  album: string;
  genre: string;
  isrc: string;
  lyrics: string;
  art: string;
  custom_fields: Record<string, string>;
}

export interface AzuraCastStationCreate {
  name: string;
  short_name?: string;
  description?: string;
  genre?: string;
  url?: string;
  timezone?: string;
  enable_public_page?: boolean;
  enable_on_demand?: boolean;
  enable_on_demand_download?: boolean;
  enable_hls?: boolean;
}

export interface AzuraCastStreamer {
  id: number;
  streamer_username: string;
  streamer_password: string;
  display_name: string;
  comments: string;
  is_active: boolean;
  enforce_schedule: boolean;
  schedule_items: unknown[];
}

export interface AzuraCastStreamerCreate {
  streamer_username: string;
  streamer_password: string;
  display_name?: string;
  comments?: string;
  is_active?: boolean;
}

export interface AzuraCastMedia {
  id: number;
  unique_id: string;
  song_id: string;
  path: string;
  length: number;
  length_text: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  isrc: string;
  lyrics: string;
  art_updated_at: number;
  custom_fields: Record<string, string>;
  playlists: Array<{ id: number; name: string }>;
}

export interface AzuraCastPlaylist {
  id: number;
  name: string;
  type: string;
  source: string;
  order: string;
  remote_url: string | null;
  remote_type: string;
  remote_buffer: number;
  is_enabled: boolean;
  is_jingle: boolean;
  play_per_value: number | null;
  weight: number;
  include_in_requests: boolean;
  include_in_on_demand: boolean;
  backend_options: string[];
  avoid_duplicates: boolean;
  played_at: number;
  queue_reset_at: number;
  schedule_items: unknown[];
  short_name: string;
  num_songs: number;
  total_length: number;
}

// ============================================
// API Client Class
// ============================================

class AzuraCastClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || AZURACAST_BASE_URL;
    this.apiKey = apiKey || AZURACAST_API_KEY;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AzuraCast API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  // ============================================
  // Public Endpoints (No Auth Required)
  // ============================================

  /**
   * Get now playing information for all stations
   */
  async getNowPlaying(): Promise<AzuraCastNowPlaying[]> {
    return this.request<AzuraCastNowPlaying[]>('/nowplaying');
  }

  /**
   * Get now playing information for a specific station
   */
  async getStationNowPlaying(stationId: number | string): Promise<AzuraCastNowPlaying> {
    return this.request<AzuraCastNowPlaying>(`/nowplaying/${stationId}`);
  }

  /**
   * Get all public stations
   */
  async getStations(): Promise<AzuraCastStation[]> {
    return this.request<AzuraCastStation[]>('/stations');
  }

  /**
   * Get a specific station by ID
   */
  async getStation(stationId: number | string): Promise<AzuraCastStation> {
    return this.request<AzuraCastStation>(`/station/${stationId}`);
  }

  // ============================================
  // Admin Endpoints (Require API Key)
  // ============================================

  /**
   * Create a new station
   */
  async createStation(data: AzuraCastStationCreate): Promise<AzuraCastStation> {
    return this.request<AzuraCastStation>('/admin/stations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a station
   */
  async updateStation(stationId: number, data: Partial<AzuraCastStationCreate>): Promise<AzuraCastStation> {
    return this.request<AzuraCastStation>(`/admin/station/${stationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a station
   */
  async deleteStation(stationId: number): Promise<void> {
    await this.request<void>(`/admin/station/${stationId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Streamer Management (DJ Accounts)
  // ============================================

  /**
   * Get all streamers (DJ accounts) for a station
   */
  async getStreamers(stationId: number | string): Promise<AzuraCastStreamer[]> {
    return this.request<AzuraCastStreamer[]>(`/station/${stationId}/streamers`);
  }

  /**
   * Create a new streamer (DJ account)
   */
  async createStreamer(
    stationId: number | string,
    data: AzuraCastStreamerCreate
  ): Promise<AzuraCastStreamer> {
    return this.request<AzuraCastStreamer>(`/station/${stationId}/streamers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a streamer
   */
  async updateStreamer(
    stationId: number | string,
    streamerId: number,
    data: Partial<AzuraCastStreamerCreate>
  ): Promise<AzuraCastStreamer> {
    return this.request<AzuraCastStreamer>(`/station/${stationId}/streamer/${streamerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a streamer
   */
  async deleteStreamer(stationId: number | string, streamerId: number): Promise<void> {
    await this.request<void>(`/station/${stationId}/streamer/${streamerId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Media Management
  // ============================================

  /**
   * Get all media files for a station
   */
  async getMedia(stationId: number | string): Promise<AzuraCastMedia[]> {
    return this.request<AzuraCastMedia[]>(`/station/${stationId}/files`);
  }

  /**
   * Get playlists for a station
   */
  async getPlaylists(stationId: number | string): Promise<AzuraCastPlaylist[]> {
    return this.request<AzuraCastPlaylist[]>(`/station/${stationId}/playlists`);
  }

  // ============================================
  // Station Control
  // ============================================

  /**
   * Restart the station frontend (Icecast/SHOUTcast)
   */
  async restartFrontend(stationId: number | string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/station/${stationId}/frontend/restart`, {
      method: 'POST',
    });
  }

  /**
   * Restart the station backend (Liquidsoap)
   */
  async restartBackend(stationId: number | string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/station/${stationId}/backend/restart`, {
      method: 'POST',
    });
  }

  /**
   * Skip to the next song
   */
  async skipSong(stationId: number | string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/station/${stationId}/backend/skip`, {
      method: 'POST',
    });
  }

  /**
   * Disconnect a live streamer
   */
  async disconnectStreamer(stationId: number | string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/station/${stationId}/backend/disconnect`, {
      method: 'POST',
    });
  }

  // ============================================
  // Listener Statistics
  // ============================================

  /**
   * Get listener details for a station
   */
  async getListeners(stationId: number | string): Promise<Array<{
    ip: string;
    user_agent: string;
    is_mobile: boolean;
    connected_on: number;
    connected_time: number;
    location: {
      city: string;
      region: string;
      country: string;
      lat: number;
      lon: number;
    };
    mount: {
      id: number;
      name: string;
      path: string;
      is_default: boolean;
    };
  }>> {
    return this.request(`/station/${stationId}/listeners`);
  }

  // ============================================
  // Schedule Management
  // ============================================

  /**
   * Get station schedule
   */
  async getSchedule(stationId: number | string): Promise<Array<{
    id: number;
    type: string;
    name: string;
    description: string;
    start_timestamp: number;
    start: string;
    end_timestamp: number;
    end: string;
    is_now: boolean;
  }>> {
    return this.request(`/station/${stationId}/schedule`);
  }

  // ============================================
  // Song History
  // ============================================

  /**
   * Get song history for a station
   */
  async getSongHistory(stationId: number | string): Promise<Array<{
    sh_id: number;
    played_at: number;
    duration: number;
    playlist: string;
    streamer: string;
    is_request: boolean;
    song: AzuraCastSong;
  }>> {
    return this.request(`/station/${stationId}/history`);
  }
}

// ============================================
// Export singleton and factory
// ============================================

// Default client instance
export const azuracast = new AzuraCastClient();

// Factory for custom configurations
export function createAzuraCastClient(baseUrl?: string, apiKey?: string): AzuraCastClient {
  return new AzuraCastClient(baseUrl, apiKey);
}

// Export the class for testing
export { AzuraCastClient };
