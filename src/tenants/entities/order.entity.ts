import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { OrderStatus, OrderCurrency } from '../orders/order.types';

export { OrderStatus, OrderCurrency };

@Entity('orders')
@Index(['status', 'createdAt'])
export class Order extends BaseEntity {
  @Column({ name: 'order_number', unique: true })
  orderNumber!: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @Column({ type: 'enum', enum: OrderCurrency, default: OrderCurrency.USD })
  currency!: OrderCurrency;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}
