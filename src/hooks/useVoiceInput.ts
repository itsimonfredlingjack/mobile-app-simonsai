import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { CONFIG } from '../constants/config';

interface UseVoiceInputOptions {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceInputReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

export function useVoiceInput({
  onTranscriptionComplete,
  onError,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        onError?.('Mikrofontillstånd krävs');
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError?.('Kunde inte starta inspelning');
    }
  }, [onError]);

  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) {
        console.log('[VOICE] No recording to stop');
        return;
      }

      console.log('[VOICE] Stopping recording...');
      setIsRecording(false);
      setIsTranscribing(true);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Stop and get URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      console.log('[VOICE] Recording URI:', uri);

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Send to Whisper server
      console.log('[VOICE] 📤 Sending to Whisper:', CONFIG.WHISPER_URL);
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/wav',
        name: 'recording.wav',
      } as any);
      formData.append('profile', CONFIG.PROFILE);

      const response = await fetch(`${CONFIG.WHISPER_URL}/voice-command`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[VOICE] Response status:', response.status);
      const result = await response.json();
      console.log('[VOICE] 📥 Whisper result:', JSON.stringify(result).slice(0, 200));

      if (result.success && result.transcribed_text) {
        console.log('[VOICE] ✅ Transcription:', result.transcribed_text);
        onTranscriptionComplete(result.transcribed_text);
      } else {
        console.error('[VOICE] ❌ Transcription failed:', result.error);
        onError?.(result.error || 'Transkribering misslyckades');
      }
    } catch (error) {
      console.error('[VOICE] ❌ Failed to stop recording:', error);
      onError?.(`Röstfel: ${error}`);
    } finally {
      setIsTranscribing(false);
    }
  }, [onTranscriptionComplete, onError]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
