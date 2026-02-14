// Hardcoded API base to force traffic through the provided ngrok tunnel.
// If this needs to become configurable again, reintroduce the env-based logic.
const BASE_URL = 'https://unstated-grimily-babette.ngrok-free.dev';
const getBaseUrl = () => BASE_URL;

export interface ChallengeResponse {
  challenge_id: string;
  gesture: string;
  instruction: string;
}

export interface ValidateResponse {
  success: boolean;
  message: string;
  token?: string;
  results?: Record<string, unknown>;
}

export interface AnalyzeResponse {
  label: 'real' | 'spoof' | string;
  confidence: number;
  passed?: boolean;
  elapsed_ms?: number;
  bbox?: { x: number; y: number; w: number; h: number };
  error?: string;
  status?: number;
}

export interface VoiceVerifyResponse {
  success: boolean;
  label: string;
  score: number;
  similarity?: number | null;
  duration: number;
  energy: number;
  reference_duration?: number;
  reference_energy?: number;
  status?: number;
  error?: string;
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

    const data = await response.json() as unknown;

    // Normalize backend variants:
    // - legacy: {challenge_id, gesture, instruction}
    // - current: {challenge: {gesture,instruction}, challenge_id, ...}
    type ChallengeShape = { challenge_id?: string; gesture: string; instruction: string };
    type ResponseShape = { challenge?: ChallengeShape } & ChallengeShape;
    const normalized = data as ResponseShape;
    const challenge = normalized.challenge ?? normalized;
    return {
      challenge_id: normalized.challenge_id ?? challenge.challenge_id ?? crypto.randomUUID(),
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

    // Surface backend validation feedback to the UI instead of throwing.
    if (!response.ok) {
      const text = await response.text();
      return {
        label: 'error',
        confidence: 0,
        passed: false,
        error: text || 'Unable to analyze frame',
        status: response.status,
      };
    }

    return response.json();
  },

  voiceVerify: async (audioBlob: Blob, referenceBlob?: Blob | null): Promise<VoiceVerifyResponse> => {
    const baseUrl = getBaseUrl();
    const formData = new FormData();
    // Sent as 'file' to match server expectation
    formData.append('file', audioBlob, 'speech.wav');
    if (referenceBlob) formData.append('reference', referenceBlob, 'reference.wav');

    const response = await fetch(`${baseUrl}/api/voice-verify`, {
      method: 'POST',
      body: formData,
    });

    const safeJson = async () => {
      try {
        return await response.json();
      } catch {
        return null;
      }
    };

    if (!response.ok) {
      let detail = 'Voice verification failed';
      const data = await safeJson();
      if (data) {
        detail = data.detail || data.error || JSON.stringify(data);
      } else {
        try {
          detail = await response.text();
        } catch {
          // keep default
        }
      }

      return {
        success: false,
        label: 'error',
        score: 0,
        duration: 0,
        energy: 0,
        status: response.status,
        error: detail,
      };
    }

    const data = await safeJson();
    if (!data) {
      return {
        success: false,
        label: 'error',
        score: 0,
        duration: 0,
        energy: 0,
        status: response.status,
        error: 'Empty response from voice service',
      };
    }

    return data as VoiceVerifyResponse;
  },
};
