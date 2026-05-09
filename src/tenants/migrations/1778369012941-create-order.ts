import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrder1778369012941 implements MigrationInterface {
    name = 'CreateOrder1778369012941'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'processing', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_currency_enum" AS ENUM('USD', 'EUR', 'GBP')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "order_number" character varying NOT NULL, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending', "total_amount" numeric(12,2) NOT NULL, "currency" "public"."orders_currency_enum" NOT NULL DEFAULT 'USD', "metadata" jsonb, CONSTRAINT "UQ_75eba1c6b1a66b09f2a97e6927b" UNIQUE ("order_number"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d5e3786a82fe691d8bbbb1e256" ON "orders" ("status", "createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d5e3786a82fe691d8bbbb1e256"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_currency_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    }

}
