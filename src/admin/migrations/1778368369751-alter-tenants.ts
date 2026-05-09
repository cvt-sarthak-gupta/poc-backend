import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTenants1778368369751 implements MigrationInterface {
    name = 'AlterTenants1778368369751'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_tenant_organization_name"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "organization_name"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_tenant_sub_domain"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "sub_domain"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "is_active"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_tenant_admin_email"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "admin_email"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "is_verified"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_tenant_db_url"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "db_url"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_tenant_logo_url"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "logo_url"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "auth_provider"`);
        await queryRunner.query(`DROP TYPE "public"."auth_providers"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "organizationName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_aca9b3d56189c8543964d66ffdf" UNIQUE ("organizationName")`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "subDomain" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_4268168771dbbfc9a93d3bbb29c" UNIQUE ("subDomain")`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "adminEmail" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_8d6b0413b053921e29a970177c1" UNIQUE ("adminEmail")`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "isVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "dbUrl" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_2557d65e0dd47be387a7332ca40" UNIQUE ("dbUrl")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_2557d65e0dd47be387a7332ca40"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "dbUrl"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "isVerified"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_8d6b0413b053921e29a970177c1"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "adminEmail"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_4268168771dbbfc9a93d3bbb29c"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "subDomain"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_aca9b3d56189c8543964d66ffdf"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "organizationName"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE TYPE "public"."auth_providers" AS ENUM('google', 'basic', 'microsoft')`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "auth_provider" "public"."auth_providers" NOT NULL DEFAULT 'basic'`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "logo_url" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_tenant_logo_url" UNIQUE ("logo_url")`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "db_url" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_tenant_db_url" UNIQUE ("db_url")`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "is_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "admin_email" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_tenant_admin_email" UNIQUE ("admin_email")`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "is_active" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "sub_domain" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_tenant_sub_domain" UNIQUE ("sub_domain")`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "organization_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_tenant_organization_name" UNIQUE ("organization_name")`);
    }

}
