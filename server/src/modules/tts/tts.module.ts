import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

import { TtsCacheService } from './cache/tts-cache.service';
import { HttpSileroSynthesizer } from './synthesizer/http-silero-synthesizer';
import { SYNTHESIZER } from './synthesizer/synthesizer.token';
import { TtsController } from './tts.controller';
import { TtsService } from './tts.service';

/**
 * Throttler для tts-endpoint'а сконфигурирован на уровне `AppModule`
 * (именованный throttler `tts` в общей ThrottlerModule), чтобы избежать
 * дублирующей регистрации. Контроллер использует `ThrottlerGuard` с
 * @Throttle() декоратором или без — берёт дефолтный throttler из массива.
 *
 * AuthModule импортируется для JwtAuthGuard.
 */
@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [TtsController],
  providers: [
    TtsService,
    TtsCacheService,
    {
      provide: SYNTHESIZER,
      useClass: HttpSileroSynthesizer,
    },
  ],
  exports: [TtsService],
})
export class TtsModule {}
