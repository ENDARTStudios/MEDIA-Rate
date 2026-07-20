import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { SessionService } from "./session.service.js";
import { SessionCookieService } from "./session-cookie.service.js";
import { LockoutService } from "./lockout.service.js";
import { SessionRotationService } from "./session-rotation.service.js";
import { PasswordService } from "../../common/password.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AnalyticsModule } from "../../common/analytics.module.js";

@Module({
  imports: [PrismaModule, AnalyticsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    SessionCookieService,
    LockoutService,
    SessionRotationService,
    PasswordService,
  ],
  exports: [
    AuthService,
    SessionService,
    SessionCookieService,
    LockoutService,
    SessionRotationService,
  ],
})
export class AuthModule {}
