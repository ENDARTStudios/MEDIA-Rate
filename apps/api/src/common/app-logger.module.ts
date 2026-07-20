import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { buildLoggerConfig } from "./logger.config.js";

@Module({
  imports: [LoggerModule.forRoot(buildLoggerConfig())],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
