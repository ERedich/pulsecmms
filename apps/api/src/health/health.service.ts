import { Injectable } from "@nestjs/common";
import { DbService } from "../db/db.service";

@Injectable()
export class HealthService {
  constructor(private readonly db: DbService) {}

  async check(): Promise<{
    status: "ok" | "error";
    database: "up" | "down";
  }> {
    try {
      await this.db.query("SELECT 1");
      return { status: "ok", database: "up" };
    } catch {
      return { status: "error", database: "down" };
    }
  }
}
