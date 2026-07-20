import { Module } from "@nestjs/common";
import { PremiumController } from "./premium.controller.js";

@Module({
  controllers: [PremiumController],
})
export class PremiumModule {}
