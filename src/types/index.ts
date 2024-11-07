export interface Product {
    id: string;
    sku: string;
    base_title: string;
    description?: string;
    prices: Price[];
    variants: Variant[];
    metadata: Metadata[];
    created_at: string;
    updated_at: string;
}

export interface Price {
    currency: string;
    amount: number;
}

export interface Variant {
    id: string;
    sku: string;
    attributes: Record<string, any>;
    stock: Stock[];
}

export interface Stock {
    location_id: string;
    quantity: number;
}

export interface Metadata {
    market: string;
    title: string;
    description?: string;
    keywords?: string;
}
