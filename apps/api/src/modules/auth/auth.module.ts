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
import { AuditLogService } from "../../common/audit-log.service.js";
import { MailerModule } from "../mailer/mailer.module.js";
import { MockMailService } from "../../common/mock-mail.service.js";
import { EmailVerificationService } from "./email-verification.service.js";
import { GoogleAuthService } from "./google-auth.service.js";

@Module({
  imports: [PrismaModule, AnalyticsModule, MailerModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    SessionCookieService,
    LockoutService,
    SessionRotationService,
    EmailVerificationService,
    GoogleAuthService,
    PasswordService,
    AuditLogService,
    MockMailService,
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
