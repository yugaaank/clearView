// Dynamically determine the API base URL.
// In production, this would be an environment variable.
// For this hybrid dev setup, we want it to match the current hostname (localhost or IP).
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:8000`;
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

    return response.json();
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
