export interface APIResponse<T> {
    data: T;
    pagination?: {
        current_page: number;
        page_size: number;
        total_items: number;
        total_pages: number;
    };
}
