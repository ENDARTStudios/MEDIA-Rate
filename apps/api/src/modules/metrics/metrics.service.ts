import { Injectable } from "@nestjs/common";

interface MetricsSnapshot {
  uptime_seconds: number;
  requests_total: number;
  requests_5xx: number;
  watchlist_adds: number;
  watchlist_moves: number;
  watchlist_removes: number;
  auth_registers: number;
  auth_logins: number;
  auth_logouts: number;
  db_queries_total: number;
  db_errors: number;
  memory_mb: number;
  timestamp: string;
}

@Injectable()
export class MetricsService {
  private counters = {
    requests_total: 0,
    requests_5xx: 0,
    watchlist_adds: 0,
    watchlist_moves: 0,
    watchlist_removes: 0,
    auth_registers: 0,
    auth_logins: 0,
    auth_logouts: 0,
    db_queries_total: 0,
    db_errors: 0,
  };

  private startTime = Date.now();

  incrementRequest() {
    this.counters.requests_total++;
  }
  increment5xx() {
    this.counters.requests_5xx++;
  }
  incrementWatchlistAdd() {
    this.counters.watchlist_adds++;
  }
  incrementWatchlistMove() {
    this.counters.watchlist_moves++;
  }
  incrementWatchlistRemove() {
    this.counters.watchlist_removes++;
  }
  incrementRegister() {
    this.counters.auth_registers++;
  }
  incrementLogin() {
    this.counters.auth_logins++;
  }
  incrementLogout() {
    this.counters.auth_logouts++;
  }
  incrementDbQuery() {
    this.counters.db_queries_total++;
  }
  incrementDbError() {
    this.counters.db_errors++;
  }

  async getMetrics(): Promise<MetricsSnapshot> {
    const mem = process.memoryUsage();
    return {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      ...this.counters,
      memory_mb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }
}
