import { useState, useEffect } from 'react';
import { Package, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/api/client';
import type { Product } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';

// src/features/products/components/ProductList.tsx
export function ProductList() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { events, isConnected } = useWebSocket();

    // Load initial products
    useEffect(() => {
        loadProducts();
    }, []);

    // Handle real-time updates
    useEffect(() => {
        if (!events.length) return;

        // Hantera alla nya events på en gång
        setProducts(prevProducts => {
            let updatedProducts = [...prevProducts];

            // Processa events i ordning (nyast till äldst)
            for (const event of events) {
                switch (event.type) {
                    case 'product.created': {
                        const productExists = updatedProducts.some(p => p.id === event.data.product!.id);
                        if (!productExists) {
                            updatedProducts = [event.data.product!, ...updatedProducts];
                        }
                        break;
                    }
                    case 'product.updated': {
                        updatedProducts = updatedProducts.map(product =>
                            product.id === event.data.product_id
                                ? event.data.product!
                                : product
                        );
                        break;
                    }
                    case 'product.deleted': {
                        updatedProducts = updatedProducts.filter(
                            product => product.id !== event.data.product_id
                        );
                        break;
                    }
                }
            }

            return updatedProducts;
        });
    }, [events]);

    async function loadProducts() {
        setLoading(true);
        try {
            console.log('Fetching products...');
            const data = await api.getProducts();
            console.log('Received products:', data);
            setProducts(data);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    }

    // Helper function för att beräkna totalt lager
    const calculateTotalStock = (product: Product): number => {
        return product.variants?.reduce((total, variant) => {
            const variantStock = variant.stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
            return total + variantStock;
        }, 0) || 0;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Package className="w-4 h-4" />
                        <span>{products.length} products</span>
                        {isConnected && (
                            <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full" />
                                <span>Live</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="pl-10 pr-4 py-2 w-64 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                        />
                    </div>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm hover:bg-indigo-700 transition-colors">
                        Add Product
                    </button>
                </div>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                                <div className="h-4 bg-gray-200 rounded w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {products.map(product => (
                        <Card
                            key={product.id}
                            className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{product.base_title}</h3>
                                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-sm text-gray-500">
                                            {calculateTotalStock(product)} in stock
                                        </div>
                                        <div className="flex items-center space-x-1 mt-1">
                                            {product.metadata?.map(meta => (
                                                <span
                                                    key={meta.market}
                                                    className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                                                >
                                                    {meta.market}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}