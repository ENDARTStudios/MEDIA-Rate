import {
  type ArgumentMetadata,
  type PipeTransform,
  Injectable,
  BadRequestException,
} from "@nestjs/common";
import type { ZodTypeAny } from "zod";

/**
 * Pipe que valida body/query/params contra um schema Zod.
 * Rejeita 400 BadRequest com mensagem acionavel antes do handler rodar.
 *
 * Uso em controller:
 *   @Post()
 *   @UsePipes(new ZodValidationPipe(EchoDto))
 *   echo(@Body() body: EchoDtoType) { ... }
 *
 * Para aplicacao global (todos os handlers com schema registrado),
 * registre o pipe via APP_PIPE no AppModule.
 */
@Injectable()
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const firstError = result.error.issues[0];
      const path = firstError?.path.join(".") ?? "root";
      const message = firstError?.message ?? "validation error";
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: `Validation failed at '${path}': ${message}`,
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    return result.data;
  }
}
