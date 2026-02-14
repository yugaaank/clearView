'use client';

import { useState, useEffect, useCallback } from 'react';
import { Camera, AlertCircle } from 'lucide-react';

interface CameraPermissionHandlerProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export default function CameraPermissionHandler({
  onPermissionGranted,
  onPermissionDenied,
}: CameraPermissionHandlerProps) {
  const [permissionState, setPermissionState] = useState<
    'prompt' | 'granted' | 'denied' | 'checking'
  >('checking');

  const requestCameraAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      onPermissionGranted();
    } catch (error: unknown) {
      console.error('Camera access denied:', error);
      const err = error as { name?: string };
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        onPermissionDenied();
      } else {
        setPermissionState('prompt');
      }
    }
  }, [onPermissionDenied, onPermissionGranted]);

  const checkCameraPermission = useCallback(async () => {
    try {
      const permissionsApi = (navigator as Navigator & { permissions?: Permissions }).permissions;
      if (!permissionsApi) {
        await requestCameraAccess();
        return;
      }

      const result = await permissionsApi.query({ name: 'camera' as PermissionName }) as PermissionStatus;
      const state = result.state as PermissionState;
      setPermissionState(state);

      if (state === 'granted') {
        onPermissionGranted();
      } else if (state === 'denied') {
        onPermissionDenied();
      }

      result.addEventListener('change', () => {
        const nextState = result.state as PermissionState;
        setPermissionState(nextState);
        if (nextState === 'granted') {
          onPermissionGranted();
        } else if (nextState === 'denied') {
          onPermissionDenied();
        }
      });
    } catch (error) {
      console.error('Permission check failed:', error);
      setPermissionState('prompt');
    }
  }, [onPermissionDenied, onPermissionGranted, requestCameraAccess]);

  useEffect(() => {
    // Initial permission check on mount; state updates are intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkCameraPermission();
  }, [checkCameraPermission]);

  if (permissionState === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="text-gray-600">Checking camera access...</p>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h3 className="text-lg font-semibold text-red-700">Camera Access Required</h3>
        <p className="text-center text-red-600">
          Enable camera permissions in your browser settings, then reload.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (permissionState === 'prompt') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Camera className="w-16 h-16 text-blue-500" />
        <h3 className="text-lg font-semibold">Camera Access Needed</h3>
        <p className="text-center text-gray-600">
          We need access to your camera to verify your identity.
        </p>
        <button
          onClick={requestCameraAccess}
          className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Enable Camera
        </button>
      </div>
    );
  }

  return null;
}
