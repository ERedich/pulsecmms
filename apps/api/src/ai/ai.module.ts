import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { AuthModule } from "../auth/auth.module";
import { CostCentersModule } from "../cost-centers/cost-centers.module";
import { DocumentsModule } from "../documents/documents.module";
import { EmployeesModule } from "../employees/employees.module";
import { SitesModule } from "../sites/sites.module";
import { UsersModule } from "../users/users.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { DocumentTextService } from "./document-text.service";

@Module({
  imports: [
    AuthModule,
    SitesModule,
    CostCentersModule,
    EmployeesModule,
    UsersModule,
    AssetsModule,
    DocumentsModule,
  ],
  controllers: [AiController],
  providers: [AiService, DocumentTextService],
})
export class AiModule {}
