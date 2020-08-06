import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';
import ICreateOrderDTO from '../dtos/ICreateOrderDTO';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

interface IProductOrder {
  product_id: string;
  price: number;
  quantity: number;
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepositoryDI')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepositoryDI')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepositoryDI')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const productsToOrder: IProductOrder[] = [];

    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const findProducts = await this.productsRepository.findAllById(products);

    products.forEach(product => {
      const productToOrder = findProducts.find(
        findProduct => findProduct.id === product.id,
      );

      if (!productToOrder) {
        throw new AppError(`Product not found. (${product.id})`);
      }

      if (productToOrder.quantity < product.quantity) {
        throw new AppError(
          `Product quantity invalid. (${productToOrder.name})`,
        );
      }

      productsToOrder.push({
        product_id: product.id,
        price: productToOrder.price,
        quantity: product.quantity,
      });
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsToOrder,
    });

    if (order.id) {
      await this.productsRepository.updateQuantity(products);
    }

    return order;
  }
}

export default CreateOrderService;
