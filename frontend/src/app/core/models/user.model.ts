export interface User {
    id: number;
    first_name: string;
    middle_name: string;
    last_name: string;
    extension_name: string | null;
    birthdate: string;
    gender: string;
    role: string;
    email: string;
}

export interface CreateUser { 
    first_name: string; 
    middle_name: string; 
    last_name: string; 
    extension_name: string | null; 
    birthdate: string; 
    gender: string; 
    role: string; 
    email: string; 
    password: string; 
    password_confirmation: string; 
}
