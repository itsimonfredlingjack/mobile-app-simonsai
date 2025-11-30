import { useState, useEffect, useCallback, useRef } from 'react';

const BACKEND_URL = 'http://192.168.86.26:8000';
const POLL_INTERVAL = 5000; // 5 seconds

export interface SystemHealth {
  cpu_percent: number;
  cpu_count: number;
  load_average: [number, number, number];
  ram_total_gb: number;
  ram_used_gb: number;
  ram_free_gb: number;
  ram_percent: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  disk_percent: number;
  uptime_seconds: number;
  boot_time: string;
  gpu: {
    name: string;
    vram_total_gb: number;
    vram_used_gb: number;
    vram_free_gb: number;
    vram_percent: number;
    temperature_c: number;
    gpu_util_percent: number;
    power_draw_w: number;
    is_available: boolean;
  } | null;
  timestamp: string;
}

export interface UseServerHealthResult {
  stats: SystemHealth | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useServerHealth(autoRefresh: boolean = true): UseServerHealthResult {
  const [stats, setStats] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/system/health`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStats(data);
        setError(null);
        setLastUpdated(new Date());
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchStats, POLL_INTERVAL);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
    lastUpdated,
  };
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}
