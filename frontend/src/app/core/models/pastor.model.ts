export interface Pastor {
    id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    extension_name: string | null;
    birthdate: string;
    gender: 'male' | 'female' | 'other';
    email: string;
    role: 'pastor';
    department_id: number;
    church_id: number;
    department?: {
        department_id: number;
        department_name: string;
    };
    church?: {
        church_id: number;
        name: string;
    };
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}


export interface PastorFilters {
    search?: string;
    department_id?: number | string;
    church_id?: number | string;
    page?: number;
    per_page?: number;
}