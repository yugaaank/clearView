// Dynamically determine the API base URL.
// Uses NEXT_PUBLIC_API_BASE when provided; otherwise derives from current origin.
// Handles both HTTP (localhost) and HTTPS dev proxy (e.g., https://<ip>:3001).
const getBaseUrl = () => {
  // Explicit override wins (set NEXT_PUBLIC_API_BASE="https://host:port")
  const envBase = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE)?.trim();
  if (envBase) return envBase.replace(/\/$/, '');

  const envProtocol = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_PROTOCOL)?.trim();
  const envPort = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_PORT)?.trim();

  if (typeof window !== 'undefined') {
    // Prefer relative path to leverage Next.js rewrites and avoid mixed-content.
    return '';
  }

  return 'http://localhost:8000';
};

export interface ChallengeResponse {
  challenge_id: string;
  gesture: string;
  instruction: string;
}

export interface ValidateResponse {
  success: boolean;
  message: string;
  token?: string;
  results?: any;
}

export interface AnalyzeResponse {
  label: 'real' | 'spoof' | string;
  confidence: number;
  passed?: boolean;
  elapsed_ms?: number;
  bbox?: { x: number; y: number; w: number; h: number };
}

const dataURItoBlob = (dataURI: string) => {
  if (!dataURI || !dataURI.includes(',')) {
    throw new Error('Invalid image data');
  }
  const [header, data] = dataURI.split(',');
  const mimeMatch = header.match(/data:([^;]+);/);
  const mimeString = mimeMatch?.[1] || 'image/jpeg';

  const byteString = atob(data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

export const api = {
  getChallenge: async (): Promise<ChallengeResponse> => {
    const baseUrl = getBaseUrl();
    console.log("Fetching from:", baseUrl);
    const response = await fetch(`${baseUrl}/api/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch challenge');
    }

    const data = await response.json();

    // Normalize backend variants:
    // - legacy: {challenge_id, gesture, instruction}
    // - current: {challenge: {gesture,instruction}, challenge_id, ...}
    const challenge = (data.challenge ?? data) as any;
    return {
      challenge_id: data.challenge_id ?? challenge.challenge_id ?? crypto.randomUUID(),
      gesture: challenge.gesture,
      instruction: challenge.instruction,
    };
  },

  validateChallenge: async (challengeId: string, gesture: string | undefined, imageData: string): Promise<ValidateResponse> => {
    const baseUrl = getBaseUrl();
    const formData = new FormData();

    // Convert base64 to blob
    const blob = dataURItoBlob(imageData);
    formData.append('file', blob, 'capture.jpg');
    formData.append('challenge_id', challengeId);
    if (gesture) formData.append('gesture', gesture);

    const response = await fetch(`${baseUrl}/api/validate`, {
      method: 'POST',
      body: formData,
      // Content-Type header must be omitted so browser sets boundary
    });

    if (!response.ok) {
      throw new Error('Validation failed');
    }

    return response.json();
  },

  analyzeFrame: async (imageData: string): Promise<AnalyzeResponse> => {
    const baseUrl = getBaseUrl();
    const formData = new FormData();
    formData.append('file', dataURItoBlob(imageData), 'capture.jpg');

    const response = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Analyze failed: ${response.status}`);
    }

    return response.json();
  },
};
