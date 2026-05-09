import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenants1746614400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE auth_providers AS ENUM ('google', 'basic', 'microsoft');

      CREATE TABLE "tenant" (
        "id"               SERIAL NOT NULL,
        "organization_name" VARCHAR NOT NULL,
        "sub_domain"       VARCHAR NOT NULL,
        "is_active"        BOOLEAN NOT NULL DEFAULT true,
        "admin_email"      VARCHAR NOT NULL,
        "country"          VARCHAR,
        "is_verified"      BOOLEAN NOT NULL DEFAULT false,
        "db_url"           VARCHAR NOT NULL,
        "logo_url"         VARCHAR,
        "auth_provider"    auth_providers NOT NULL DEFAULT 'basic',
        "created_at"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_tenant"                  PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_organization_name" UNIQUE ("organization_name"),
        CONSTRAINT "UQ_tenant_sub_domain"        UNIQUE ("sub_domain"),
        CONSTRAINT "UQ_tenant_admin_email"       UNIQUE ("admin_email"),
        CONSTRAINT "UQ_tenant_db_url"            UNIQUE ("db_url"),
        CONSTRAINT "UQ_tenant_logo_url"          UNIQUE ("logo_url")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenant"; DROP TYPE auth_providers;`);
  }
}
