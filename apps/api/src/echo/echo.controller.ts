import { Body, Controller, Post, UsePipes } from "@nestjs/common";
import { EchoDto, type EchoDtoType } from "./echo.dto.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";

@Controller("api/v1/echo")
export class EchoController {
  @Post()
  @UsePipes(new ZodValidationPipe(EchoDto))
  echo(@Body() body: EchoDtoType): {
    received: EchoDtoType;
    echoedAt: string;
  } {
    return {
      received: body,
      echoedAt: new Date().toISOString(),
    };
  }
}
