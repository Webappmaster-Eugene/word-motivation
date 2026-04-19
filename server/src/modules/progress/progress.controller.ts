import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  childIdFromRequest,
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../auth/jwt-auth.guard';

import {
  endSessionSchema,
  recordAttemptSchema,
  startSessionSchema,
  unlockAnimalSchema,
  type EndSessionDto,
  type RecordAttemptDto,
  type StartSessionDto,
  type UnlockAnimalDto,
} from './dto/session.schema';
import {
  SessionPresenter,
  UnlockedAnimalPresenter,
} from './presenter/session.presenter';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Post('session')
  async startSession(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(startSessionSchema)) body: StartSessionDto,
  ): Promise<SessionPresenter> {
    const childId = childIdFromRequest(req);
    const session = await this.progress.startSession({ childId, gameId: body.gameId });
    return new SessionPresenter(session);
  }

  @Post('session/:id/end')
  async endSession(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(endSessionSchema)) body: EndSessionDto,
  ): Promise<SessionPresenter> {
    const childId = childIdFromRequest(req);
    const session = await this.progress.endSession({
      sessionId: id,
      childId,
      summaryStats: body.summaryStats,
      fsmSnapshot: body.fsmSnapshot,
    });
    return new SessionPresenter(session);
  }

  @Post('attempt')
  async recordAttempt(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(recordAttemptSchema)) body: RecordAttemptDto,
  ): Promise<{ ok: true }> {
    const childId = childIdFromRequest(req);
    await this.progress.recordAttempt({
      sessionId: body.sessionId,
      childId,
      kind: body.kind,
      wordId: body.wordId,
      expected: body.expected,
      heard: body.heard,
      correct: body.correct,
      latencyMs: body.latencyMs,
    });
    return { ok: true };
  }

  @Post('unlock')
  async unlock(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(unlockAnimalSchema)) body: UnlockAnimalDto,
  ): Promise<UnlockedAnimalPresenter> {
    const childId = childIdFromRequest(req);
    const u = await this.progress.unlockAnimal({ childId, animalId: body.animalId });
    return new UnlockedAnimalPresenter(u);
  }

  @Get('unlocked')
  async listUnlocked(@Req() req: AuthenticatedRequest): Promise<UnlockedAnimalPresenter[]> {
    const childId = childIdFromRequest(req);
    const items = await this.progress.listUnlocked(childId);
    return UnlockedAnimalPresenter.collection(items);
  }
}
