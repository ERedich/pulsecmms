import {
  BadRequestException,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { UIMessage } from "ai";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("chat")
  async chat(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new BadRequestException("Nicht authentifiziert");
    }

    const messages = extractMessages(req.body);
    await this.ai.streamChat(user, messages, res);
  }
}

function extractMessages(body: unknown): UIMessage[] {
  if (!body || typeof body !== "object") {
    throw new BadRequestException("Ungültiger Request-Body");
  }
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new BadRequestException("messages fehlt");
  }
  return messages as UIMessage[];
}
