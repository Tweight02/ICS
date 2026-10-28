export interface Pastor {
    user_id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    extension_name: string | null;
    birthdate: string;
    gender: 'male' | 'female' | 'other';
    email: string;
    role: 'pastor';
    status?: 'active' | 'inactive';
    department_id: number;
    church_id: number | null;
    department?: {
        department_id: number;
        department_name: string;
    };
    church?: {
        church_id: number;
        name: string;
    } | null;
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
    status?: 'active' | 'inactive' | '';
    page?: number;
    per_page?: number;
}

export interface DistrictPastorAssignment {
    church_id: number;
    district_name: string;
    pastor_user_id: number | null;
    pastor_name: string | null;
}

export interface AssignablePastor {
    user_id: number;
    full_name: string;
}