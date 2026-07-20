import { Injectable } from "@nestjs/common";

export interface HealthResponse {
  status: "ok";
  uptime: number;
  version: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly startedAt: number;

  constructor() {
    this.startedAt = Date.now();
  }

  getHealth(): HealthResponse {
    return {
      status: "ok",
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }
}
