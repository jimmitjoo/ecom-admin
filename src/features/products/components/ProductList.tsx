import { useState, useEffect, useRef } from 'react';
import { Package, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/api/client';
import type { Product } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';

// src/features/products/components/ProductList.tsx
export function ProductList() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const loaderRef = useRef<HTMLDivElement>(null);
    const { events, isConnected } = useWebSocket();
    const [initialPageSize, setInitialPageSize] = useState(12);

    // Load initial products
    useEffect(() => {
        loadProducts(1);
    }, []);

    useEffect(() => {
        if (page > 1) {
            loadProducts(page);
        }
    }, [page]);

    // Handle real-time updates
    useEffect(() => {
        if (!events.length) return;

        setProducts(prevProducts => {
            let updatedProducts = [...prevProducts];
            const seenIds = new Set(updatedProducts.map(p => p.id));

            for (const event of events) {
                switch (event.type) {
                    case 'product.created': {
                        if (page === 1 && event.data.product && !seenIds.has(event.data.product.id)) {
                            updatedProducts = [event.data.product, ...updatedProducts];
                            seenIds.add(event.data.product.id);
                        }
                        break;
                    }
                    case 'product.updated': {
                        if (event.data.product) {
                            updatedProducts = updatedProducts.map(product =>
                                product.id === event.data.product_id
                                    ? event.data.product
                                    : product
                            );
                        }
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
    }, [events, page]);

    useEffect(() => {
        console.log('Setting up IntersectionObserver');

        const observer = new IntersectionObserver(
            (entries) => {
                console.log('Intersection callback triggered', {
                    isIntersecting: entries[0]?.isIntersecting,
                    hasMore,
                    loading
                });

                const first = entries[0];
                if (first.isIntersecting && hasMore && !loading) {
                    console.log('Loading more products...');
                    setPage(prev => prev + 1);
                }
            },
            {
                root: null, // använd viewport
                threshold: 0,
                rootMargin: '300px' // öka marginal för tidigare triggning
            }
        );

        if (loaderRef.current) {
            console.log('Observing loader element');
            observer.observe(loaderRef.current);
        }

        return () => {
            console.log('Cleaning up observer');
            observer.disconnect();
        };
    }, [hasMore, loading]);

    // Beräkna initial sidstorlek baserat på skärmstorlek
    useEffect(() => {
        if (containerRef.current) {
            const container = containerRef.current;
            const containerWidth = container.clientWidth;
            const viewportHeight = window.innerHeight;

            // Uppdaterad korthöjd baserat på faktisk rendering
            const cardHeight = 200; // Ökad från 120 för att matcha faktisk höjd

            // Antal kolumner (3 på desktop, 1 på mobil)
            const columns = containerWidth >= 768 ? 3 : 1;

            // Beräkna rader som behövs för att fylla skärmen plus två extra rader
            const rows = Math.ceil(viewportHeight / cardHeight) + 2;

            // Beräkna totalt antal produkter som behövs
            const productsNeeded = columns * rows;

            // Ladda minst 24 produkter eller det beräknade antalet, beroende på vilket som är störst
            setInitialPageSize(Math.max(24, productsNeeded));

            // Om vi redan har produkter och de inte räcker för att fylla skärmen, ladda fler
            if (products.length > 0 && products.length < productsNeeded) {
                setPage(prev => prev + 1);
            }
        }
    }, [products.length]); // Lägg till products.length som beroende

    async function loadProducts(pageNumber: number = 1) {
        const pageSize = pageNumber === 1 ? initialPageSize : 12;

        if (pageNumber === 1) {
            setLoading(true);
        }

        try {
            const response = await api.getProducts(pageNumber, pageSize);
            console.log('API Response:', response);

            setProducts(prevProducts =>
                pageNumber === 1
                    ? response.data
                    : [...prevProducts, ...response.data]
            );

            const totalPages = response.total_pages ?? 0;
            const currentPage = response.page ?? 0;

            setHasMore(currentPage < totalPages);
            console.log('hasMore set to:', currentPage < totalPages,
                '(current:', currentPage, 'total:', totalPages, ')');
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

            {/* Main content */}
            <div ref={containerRef}>
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

                <div
                    ref={loaderRef}
                    className="w-full py-12 flex justify-center"
                    style={{ minHeight: '100px' }}
                >
                    {loading ? (
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <div className="w-6 h-6" />
                    )}
                </div>
            </div>
        </div>
    );
}