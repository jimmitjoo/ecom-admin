import type { Product } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

interface APIError extends Error {
    status?: number;
    data?: any;
}

class APIClient {
    private async request<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${API_BASE}${path}`;
        console.log('Making API request to:', url); // Debug log
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

            console.log('API Response:', response.status); // Debug log

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

            // Handle 204 No Content
            if (response.status === 204) {
                return null as T;
            }

            const data = await response.json();
            console.log('API Response data:', data); // Debug log
            return data;
        } catch (error) {
            console.error('API Request failed:', error); // Debug log
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
    async getProducts(): Promise<Product[]> {
        return this.get<Product[]>('/products');
    }

    async getProduct(id: string): Promise<Product> {
        return this.get<Product>(`/products/${id}`);
    }

    async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
        return this.post<Product>('/products', product);
    }

    async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
        return this.put<Product>(`/products/${id}`, product);
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
