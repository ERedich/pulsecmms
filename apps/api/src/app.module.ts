import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiModule } from "./ai/ai.module";
import { AssetsModule } from "./assets/assets.module";
import { AuthModule } from "./auth/auth.module";
import { CostCentersModule } from "./cost-centers/cost-centers.module";
import { DbModule } from "./db/db.module";
import { DocumentsModule } from "./documents/documents.module";
import { EmployeesModule } from "./employees/employees.module";
import { HealthModule } from "./health/health.module";
import { SettingsModule } from "./settings/settings.module";
import { SitesModule } from "./sites/sites.module";
import { UploadsModule } from "./uploads/uploads.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    DbModule,
    HealthModule,
    SitesModule,
    UsersModule,
    CostCentersModule,
    EmployeesModule,
    AssetsModule,
    DocumentsModule,
    SettingsModule,
    UploadsModule,
    AuthModule,
    AiModule,
  ],
})
export class AppModule {}



