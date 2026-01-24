import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { AddUserDialog } from "@/components/admin/AddUserDialog";

export default function AdminUsers() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Admin-only access to real user records (name + email)
          </p>
        </div>
        <AddUserDialog
          trigger={
            <Button variant="hero" className="gap-2">
              <Users className="w-4 h-4" />
              Add User
            </Button>
          }
        />
      </div>

      <UserManagementTable />
    </div>
  );
}
