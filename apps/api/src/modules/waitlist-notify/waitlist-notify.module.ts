import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { WaitlistNotifyController } from "./waitlist-notify.controller.js";
import { WaitlistNotifyService } from "./waitlist-notify.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [WaitlistNotifyController],
  providers: [WaitlistNotifyService],
})
export class WaitlistNotifyModule {}
