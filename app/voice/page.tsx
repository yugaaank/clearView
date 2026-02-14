'use client';

import { useEffect, useRef, useState } from 'react';
import { api, VoiceVerifyResponse } from '@/lib/api';

export default function VoiceDebugPage() {
    const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
    const [selectedMicId, setSelectedMicId] = useState<string | 'default'>('default');
    const [status, setStatus] = useState<'idle' | 'recording' | 'analyzing'>('idle');
    const [message, setMessage] = useState<string>('Pick a mic and record 3s of audio.');
    const [result, setResult] = useState<VoiceVerifyResponse | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const loadMics = async () => {
            try {
                // Prompt for permission so device labels are available.
                await navigator.mediaDevices.getUserMedia({ audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const inputs = devices.filter(d => d.kind === 'audioinput');
                setMics(inputs);
                if (inputs.length && selectedMicId === 'default') {
                    setSelectedMicId(inputs[0].deviceId || 'default');
                }
            } catch (err) {
                console.error('mic enumerate error', err);
                setMessage('Unable to list microphones. Grant mic permission and reload.');
            }
        };
        loadMics();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [selectedMicId]);

    const startRecording = async () => {
        setResult(null);
        setMessage('Starting mic...');
        try {
            const constraints: MediaTrackConstraints | boolean =
                selectedMicId && selectedMicId !== 'default'
                    ? { deviceId: { exact: selectedMicId } }
                    : true;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
            streamRef.current = stream;

            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size) chunks.push(e.data);
            };
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                await analyzeBlob(blob);
            };
            recorder.start();
            setStatus('recording');
            setMessage('Recording... speak now (3s)');
            setTimeout(() => recorder.stop(), 3000);
        } catch (err) {
            console.error(err);
            setMessage(err instanceof Error ? err.message : 'Unable to start microphone.');
            setStatus('idle');
        }
    };

    const analyzeBlob = async (blob: Blob) => {
        setStatus('analyzing');
        setMessage('Analyzing voice...');
        try {
            const resp = await api.voiceVerify(blob, null);
            setResult(resp);
            setMessage(resp.success ? 'Voice verified' : `Voice failed: ${resp.error || resp.label || resp.status}`);
        } catch (err) {
            console.error(err);
            setMessage(err instanceof Error ? err.message : 'Voice analysis failed');
        } finally {
            setStatus('idle');
        }
    };

    return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center gap-6 p-6">
            <div className="max-w-2xl w-full space-y-4 bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h1 className="text-xl font-semibold">Voice Debug</h1>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Mic</span>
                        <select
                            className="bg-black/60 border border-white/10 px-3 py-2 rounded text-white text-sm"
                            value={selectedMicId}
                            onChange={(e) => setSelectedMicId(e.target.value as string | 'default')}
                        >
                            <option value="default">System default</option>
                            {mics.map(mic => (
                                <option key={mic.deviceId || mic.label} value={mic.deviceId}>
                                    {mic.label || `Mic ${mic.deviceId?.slice(0, 6) || ''}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2 text-sm text-gray-300">
                    <div>Status: <span className="text-neon-blue">{status}</span></div>
                    <div>{message}</div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={startRecording}
                        disabled={status === 'recording' || status === 'analyzing'}
                        className="px-4 py-2 rounded bg-neon-green text-black font-semibold disabled:opacity-50"
                    >
                        {status === 'recording' ? 'Recording...' : 'Record 3s'}
                    </button>
                    {streamRef.current && (
                        <button
                            onClick={() => {
                                streamRef.current?.getTracks().forEach(t => t.stop());
                                setMessage('Mic stopped.');
                            }}
                            className="px-4 py-2 rounded border border-white/20 text-white"
                        >
                            Stop Mic
                        </button>
                    )}
                </div>

                <div className="bg-black/40 border border-white/5 rounded-lg p-4 text-sm">
                    <div className="text-gray-400 mb-2">Result</div>
                    <pre className="whitespace-pre-wrap break-words text-xs text-neon-blue">
                        {result ? JSON.stringify(result, null, 2) : 'No analysis yet.'}
                    </pre>
                </div>
            </div>
        </main>
    );
}
