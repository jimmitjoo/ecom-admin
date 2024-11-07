import { Product } from ".";

export type ProductEvent = {
    id: string;
    sequence: number;
    type: 'product.created' | 'product.updated' | 'product.deleted';
    data: {
        product_id: string;
        action: string;
        product?: Product;
    };
    timestamp: string;
}
