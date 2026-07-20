import { SetMetadata } from "@nestjs/common";

/**
 * Decorator @Roles('ADMIN') — marca rota como exigindo um dos papéis.
 * Combinado com RolesGuard (T3.4/T3.5).
 *
 * Uso:
 *   @Roles('ADMIN')
 *   @Get('admin-only')
 *   adminOnly() { ... }
 *
 * Múltiplos papéis (OR lógico):
 *   @Roles('ADMIN', 'MODERADOR')
 */
export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles) as MethodDecorator & ClassDecorator;
