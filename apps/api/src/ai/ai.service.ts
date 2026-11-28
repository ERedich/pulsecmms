import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import type { Response } from "express";
import { AssetsService } from "../assets/assets.service";
import type { JwtPayload } from "../auth/auth.types";
import { CostCentersService } from "../cost-centers/cost-centers.service";
import { DocumentsService } from "../documents/documents.service";
import { EmployeesService } from "../employees/employees.service";
import { SitesService } from "../sites/sites.service";
import { UsersService } from "../users/users.service";
import { buildAiSystemPrompt } from "./ai.prompt";
import { createAiTools } from "./ai.tools";
import { DocumentTextService } from "./document-text.service";

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    private readonly sites: SitesService,
    private readonly costCenters: CostCentersService,
    private readonly employees: EmployeesService,
    private readonly users: UsersService,
    private readonly assets: AssetsService,
    private readonly documents: DocumentsService,
    private readonly documentText: DocumentTextService,
  ) {}

  async streamChat(
    user: JwtPayload,
    messages: UIMessage[],
    response: Response,
  ): Promise<void> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "OPENAI_API_KEY ist nicht konfiguriert",
      );
    }

    if (!user.siteUid || !user.siteKey) {
      throw new UnauthorizedException();
    }

    const modelId =
      this.config.get<string>("OPENAI_MODEL")?.trim() || "gpt-5.4";

    const dbUser = await this.users.findByUid(user.sub);
    const loginName = dbUser?.login_name ?? user.sub;

    const tools = createAiTools({
      siteUid: user.siteUid,
      sites: this.sites,
      costCenters: this.costCenters,
      employees: this.employees,
      users: this.users,
      assets: this.assets,
      documents: this.documents,
      documentText: this.documentText,
    });

    const result = streamText({
      model: openai(modelId),
      instructions: buildAiSystemPrompt({
        siteKey: user.siteKey,
        userLoginName: loginName,
      }),
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: isStepCount(8),
    });

    await result.pipeUIMessageStreamToResponse(response);
  }
}
