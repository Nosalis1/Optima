import { SimulationService } from '../simulation/simulation.service';
import { CpuService } from '../simulation/cpu.service';
import { InventoryService } from './inventory.service';
import { NotificationService } from './notification.service';
import { PaymentService } from './payment.service';
import { ProductService } from './product.service';
import { UserService } from './user.service';
import { OrderService } from './order.service';

export const simulationService = new SimulationService();
export const cpuService = new CpuService();

export const inventoryService = new InventoryService(simulationService);
export const notificationService = new NotificationService(simulationService);
export const paymentService = new PaymentService(simulationService);
export const productService = new ProductService(simulationService);
export const userService = new UserService(simulationService);

export const orderService = new OrderService(
    userService,
    productService,
    inventoryService,
    paymentService,
    notificationService,
);