import type { InventoryService } from "./inventory.service";
import type { NotificationService } from "./notification.service";
import type { PaymentService } from "./payment.service";
import type { ProductService } from "./product.service";
import type { UserService } from "./user.service";

export class OrderService {
    constructor(
        private readonly users: UserService,
        private readonly products: ProductService,
        private readonly inventory: InventoryService,
        private readonly payments: PaymentService,
        private readonly notifications: NotificationService,
    ) { }

    async createOrder(
        userId: string,
        items: {
            productId: string;
            quantity: number;
        }[],
    ) {
        const user = await this.users.findById(userId);
        const products = await this.products.findProducts(items.map(i => i.productId));
        const total =
            products.reduce(
                (sum, product) => {
                    const item =
                        items.find(x => x.productId === product.id,);

                    return (
                        sum +
                        product.price *
                        (item?.quantity ?? 0)
                    );
                }, 0);
        await this.inventory.reserve(items);
        const payment = await this.payments.charge(userId, total);
        await this.notifications.sendOrderConfirmation(user.id);
        return {
            orderId: `order-${Date.now()}`,
            user,
            products,
            total,
            payment,
            status: 'completed',
        };
    }
}