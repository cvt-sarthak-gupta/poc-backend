import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';



@Entity()
export class Tenant extends BaseEntity {
  @Column('varchar', { unique: true })
  organizationName!: string;

  @Column('varchar', { unique: true })
  subDomain!: string;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @Column('varchar', { unique: true })
  adminEmail!: string;

  @Column('varchar', { nullable: true })
  country?: string;

  @Column('boolean', { default: false })
  isVerified!: boolean;

  @Column('varchar', { unique: true })
  dbUrl!: string;


}
