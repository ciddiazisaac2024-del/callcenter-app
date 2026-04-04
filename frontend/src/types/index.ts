export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'supervisor';
}

export interface Variable {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface Script {
  id: string;
  title: string;
  description: string;
  base_content: string;
  variables: Variable[];
  tags: string[];
  category_name: string;
  category_color: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
}
