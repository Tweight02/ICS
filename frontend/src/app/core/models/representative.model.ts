export interface RepresentativeDepartment {
    department_id: number;
    department_name: string;
}

export interface RepresentativeChurch {
    church_id: number;
    name: string;
    address?: string | null;
    parent_id: number | null;
}

export interface Representative {
    user_id: number;

    first_name: string;
    middle_name?: string | null;
    last_name: string;
    extension_name?: string | null;

    birthdate: string;
    gender: 'male' | 'female' | 'other';

    role: 'church_representative';

    email: string;
    status?: 'active' | 'inactive';

    church_id: number;
    department_id: number;

    department?: RepresentativeDepartment;
    church?: RepresentativeChurch;
}

export interface RepresentativeFilters {
    search?: string;
    church_id?: number;
    per_page?: number;
    page?: number;
}