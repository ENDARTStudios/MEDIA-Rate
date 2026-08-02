import { Controller, Get, Post, HttpException, HttpStatus } from "@nestjs/common";

/**
 * Controller de debug — ROTAS APENAS PARA TESTE do exception filter (T1.6).
 * Montado somente quando ENABLE_DEBUG_ROUTES=true E NODE_ENV != production
 * (ver app.module.ts). Nunca existe em produção.
 */
@Controller("api/v1/_force-error")
export class DebugController {
  @Get("http-exception")
  forceHttpException(): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.CONFLICT,
        message: "Forced HTTP exception for testing",
      },
      HttpStatus.CONFLICT,
    );
  }

  @Get("internal-error")
  forceInternalError(): never {
    throw new Error("Forced internal error with sensitive context");
  }

  @Post()
  forceGeneric(): never {
    // eslint-disable-next-line no-throw-literal -- proposito do teste: lancar nao-Error
    throw { custom: "non-Error thrown on purpose" };
  }
}
