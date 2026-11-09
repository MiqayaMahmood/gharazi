import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { AdminOperationsController } from './admin-operations.controller';
import { RolesGuard } from '../../common/auth/roles.guard';
import { REQUIRED_ROLES_KEY } from '../../common/auth/roles.decorator';

describe('administrative promotion and reconciliation authorization', () => {
  const prototype = AdminOperationsController.prototype;
  const grantHandler = Object.getOwnPropertyDescriptor(prototype, 'grantPromotion')?.value;
  const reconcileHandler = Object.getOwnPropertyDescriptor(prototype, 'reconcilePayment')?.value;
  const guard = new RolesGuard(new Reflector());

  function canCall(handler: object, roles: string[]) {
    const context = {
      getHandler: () => handler,
      getClass: () => AdminOperationsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
    };
    return guard.canActivate(context as never);
  }

  it('restricts promotion grants to explicitly authorized admins', () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, grantHandler)).toEqual(['admin']);
    expect(canCall(grantHandler, ['seller'])).toBe(false);
    expect(canCall(grantHandler, ['moderator'])).toBe(false);
    expect(canCall(grantHandler, ['admin'])).toBe(true);
  });

  it('preserves existing admin/moderator authorization for payment reconciliation', () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, AdminOperationsController)).toEqual(['admin', 'moderator']);
    expect(canCall(reconcileHandler, ['seller'])).toBe(false);
    expect(canCall(reconcileHandler, ['moderator'])).toBe(true);
    expect(canCall(reconcileHandler, ['admin'])).toBe(true);
  });
});
