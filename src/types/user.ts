export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  approval_status: string;
  created_at: string;
  department_enum?: string;
  position_enum?: string;
  user_branch_assignments?: Array<{
    branch_office_id: string;
    branch_offices: { name: string };
  }>;
  avatar_url?: string;
}

export interface BranchOffice {
  id: string;
  name: string;
}

export interface UserDetailsModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  canManageUsers: boolean;
}

export interface UserManagementTableProps {
  users: UserProfile[];
  currentUserRole: string;
  onUserUpdated: () => void;
  onUserDeleted: () => void;
}