import { useState, useEffect, useRef, useCallback } from 'react';
import { CONFIG } from '../constants/config';

interface GPUStatus {
  vram_used_gb: number;
  vram_total_gb: number;
  vram_percent: number;
  temperature_c: number;
}

interface UseWarRoomSocketOptions {
  onMessageComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseWarRoomSocketReturn {
  isConnected: boolean;
  gpuStatus: GPUStatus | null;
  sendMessage: (text: string) => void;
  streamingText: string;
  isStreaming: boolean;
  isSending: boolean;
}

interface SocketMessage {
  // Type-based messages (GPU telemetry, system logs)
  type?: 'status_update' | 'system_log' | 'pong';
  gpu?: GPUStatus;
  message?: string;

  // Antigravity format (streaming responses)
  sender?: 'agent' | 'system';
  text?: string;
  is_finished?: boolean;
  error?: boolean;
  agent_id?: string;
  stats?: {
    tokens: number;
    speed: number;
    duration_ms: number;
  };
}

export const useWarRoomSocket = (options?: UseWarRoomSocketOptions): UseWarRoomSocketReturn => {
  const { onMessageComplete, onError } = options || {};
  const [isConnected, setIsConnected] = useState(false);
  const [gpuStatus, setGpuStatus] = useState<GPUStatus | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(CONFIG.RECONNECT_DELAY);
  const isUnmountedRef = useRef(false);
  const accumulatedTextRef = useRef('');

  // Store callbacks in refs to avoid reconnect loops when callbacks change
  const onMessageCompleteRef = useRef(onMessageComplete);
  const onErrorRef = useRef(onError);

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onMessageCompleteRef.current = onMessageComplete;
  }, [onMessageComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearTimers();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }, [clearTimers]);

  const emitMobileActivity = useCallback((eventType: string, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mobile_activity',
        event: eventType,
        timestamp: new Date().toISOString(),
        ...data,
      }));
    }
  }, []);

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;

    console.log('[SOCKET] ========================================');
    console.log('[SOCKET] Attempting to connect to:', CONFIG.WEBSOCKET_URL);
    console.log('[SOCKET] ========================================');

    try {
      const ws = new WebSocket(CONFIG.WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[SOCKET] ✅ CONNECTED to', CONFIG.WEBSOCKET_URL);
        setIsConnected(true);
        reconnectDelayRef.current = CONFIG.RECONNECT_DELAY;
        startHeartbeat();
        emitMobileActivity('mobile_connected');
      };

      ws.onmessage = (event) => {
        try {
          const data: SocketMessage = JSON.parse(event.data);

          // DEBUG LOG - visa vad vi får från backend
          console.log('[SOCKET] 📥 RECEIVED:', JSON.stringify(data).slice(0, 200));

          // GPU status update (type-based)
          if (data.type === 'status_update' && data.gpu) {
            setGpuStatus(data.gpu);
            return;
          }

          // System log messages
          if (data.type === 'system_log') {
            console.log('[SYSTEM LOG]', data.message);
            return;
          }

          // Pong response
          if (data.type === 'pong') {
            console.log('[SOCKET] Pong received');
            return;
          }

          // ANTIGRAVITY FORMAT - Streaming responses from QWEN
          if (data.sender === 'agent') {
            if (!data.is_finished && data.text) {
              // Streaming token - första token avslutar "sending" state
              setIsSending(false);
              setIsStreaming(true);
              accumulatedTextRef.current += data.text;
              setStreamingText(accumulatedTextRef.current);
            } else if (data.is_finished) {
              // Response complete
              setIsStreaming(false);
              setIsSending(false);
              const finalText = accumulatedTextRef.current;

              // Emit mobile activity for dashboard sync
              emitMobileActivity('mobile_response', {
                message: finalText,
                stats: data.stats,
              });

              if (data.error) {
                // Error from server
                console.error('[SOCKET] ❌ Server error:', data.text);
                if (onErrorRef.current) {
                  onErrorRef.current(data.text || 'Server error');
                }
              } else if (finalText && onMessageCompleteRef.current) {
                onMessageCompleteRef.current(finalText);
              }

              // Clear accumulated text after a short delay
              setTimeout(() => {
                accumulatedTextRef.current = '';
                setStreamingText('');
              }, 100);
            }
            return;
          }

          // System messages (tool confirmations, etc)
          if (data.sender === 'system') {
            console.log('[SOCKET] System message:', data);
            return;
          }

          // Unknown message format
          console.log('[SOCKET] Unknown message format:', data);

        } catch (error) {
          console.error('[SOCKET] Failed to parse message:', error);
        }
      };

      ws.onerror = (error: any) => {
        console.error('[SOCKET] ❌ ERROR:', error);
        console.error('[SOCKET] Error type:', error?.type);
        console.error('[SOCKET] Error message:', error?.message);
      };

      ws.onclose = (event) => {
        console.log('[SOCKET] ❌ CLOSED');
        console.log('[SOCKET] Close code:', event.code);
        console.log('[SOCKET] Close reason:', event.reason || '(no reason)');
        console.log('[SOCKET] Was clean:', event.wasClean);
        setIsConnected(false);
        clearTimers();

        if (!isUnmountedRef.current) {
          const delay = Math.min(reconnectDelayRef.current, 30000);
          console.log(`[SOCKET] Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[SOCKET] ❌ Failed to create WebSocket:', error);
    }
  }, [startHeartbeat, emitMobileActivity, clearTimers]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) {
      console.warn('[SOCKET] Attempted to send empty message');
      return;
    }

    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.error('[SOCKET] WebSocket not connected - cannot send');
      if (onErrorRef.current) {
        onErrorRef.current('Not connected to server');
      }
      return;
    }

    try {
      // Reset states
      accumulatedTextRef.current = '';
      setStreamingText('');
      setIsStreaming(false);
      setIsSending(true);  // <-- SHOW "Sending to QWEN..."

      // Debug log
      const payload = { text, profile: CONFIG.PROFILE };
      console.log('[SOCKET] 📤 EMITTING message:', JSON.stringify(payload));

      // Emit mobile activity for dashboard
      emitMobileActivity('mobile_request_start', { message: text });

      // Send to backend (Antigravity format)
      wsRef.current.send(JSON.stringify(payload));

    } catch (error) {
      console.error('[SOCKET] Failed to send message:', error);
      setIsSending(false);
      if (onErrorRef.current) {
        onErrorRef.current('Failed to send message');
      }
    }
  }, [emitMobileActivity]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      clearTimers();

      if (wsRef.current) {
        emitMobileActivity('mobile_disconnected');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearTimers, emitMobileActivity]);

  return {
    isConnected,
    gpuStatus,
    sendMessage,
    streamingText,
    isStreaming,
    isSending,
  };
};
