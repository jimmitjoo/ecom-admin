import type { Product } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

interface APIError extends Error {
    status?: number;
    data?: any;
}

export interface APIResponse<T> {
    data: T;
    pagination?: {
        current_page: number;
        page_size: number;
        total_items: number;
        total_pages: number;
    };
}

class APIClient {
    private async request<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<APIResponse<T>> {
        const url = `${API_BASE}${path}`;
        console.log('Making API request to:', url);

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        };

        const config: RequestInit = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);
            console.log('API Response:', response.status);

            if (!response.ok) {
                const error: APIError = new Error('API Error');
                error.status = response.status;
                try {
                    error.data = await response.json();
                } catch {
                    error.data = await response.text();
                }
                throw error;
            }

            if (response.status === 204) {
                return { data: null as T };
            }

            const responseData = await response.json();
            console.log('API Response data:', responseData);
            return responseData;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    async get<T>(path: string): Promise<T> {
        return this.request<T>(path, { method: 'GET' });
    }

    async post<T>(path: string, data: any): Promise<T> {
        return this.request<T>(path, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put<T>(path: string, data: any): Promise<T> {
        return this.request<T>(path, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete<T>(path: string): Promise<T> {
        return this.request<T>(path, { method: 'DELETE' });
    }

    // Product specific methods
    async getProducts(page: number = 1, size: number = 12): Promise<APIResponse<Product[]>> {
        const response = await this.get<APIResponse<Product[]>>(`/products?page=${page}&size=${size}`);
        return response;
    }

    async getProduct(id: string): Promise<Product> {
        const response = await this.get<Product>(`/products/${id}`);
        return response.data;
    }

    async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
        const response = await this.post<Product>('/products', product);
        return response.data;
    }

    async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
        const response = await this.put<Product>(`/products/${id}`, product);
        return response.data;
    }

    async deleteProduct(id: string): Promise<void> {
        return this.delete(`/products/${id}`);
    }

    // Batch operations
    async createProducts(products: Omit<Product, 'id' | 'created_at' | 'updated_at'>[]): Promise<Product[]> {
        return this.post<Product[]>('/products/batch', products);
    }

    async deleteProducts(ids: string[]): Promise<void> {
        return this.delete(`/products/batch?ids=${ids.join(',')}`);
    }
}

export const api = new APIClient();
