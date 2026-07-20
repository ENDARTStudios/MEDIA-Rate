import { Controller, Get, Post, HttpException, HttpStatus } from "@nestjs/common";

/**
 * Controller de debug — ROTAS APENAS PARA TESTE do exception filter (T1.6).
 * Em producao, este controller deve ser desativado via env ENABLE_DEBUG_ROUTES=true
 * (default false). Criterio de pronto da ordem FASE-1 cita explicitamente
 * /api/v1/_force-error.
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
    throw new Error("Forced internal error with sensitive context: password=SUA_CHAVE_AQUI");
  }

  @Post()
  forceGeneric(): never {
    // eslint-disable-next-line no-throw-literal -- proposito do teste: lancar nao-Error
    throw { custom: "non-Error thrown on purpose" };
  }
}
