import { Body, Controller, Post } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { registerDeviceSchema, type RegisterDeviceDto } from './dto/register-device.schema';
import { AuthPresenter } from './presenter/auth.presenter';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('device')
  async registerDevice(
    @Body(new ZodValidationPipe(registerDeviceSchema)) body: RegisterDeviceDto,
  ): Promise<AuthPresenter> {
    const result = await this.auth.registerDevice(body.deviceId, body.ageBand);
    return new AuthPresenter({
      token: result.token,
      childId: result.childId,
      ageBand: result.ageBand,
    });
  }
}
