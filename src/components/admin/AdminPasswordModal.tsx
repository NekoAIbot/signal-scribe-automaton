import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AdminPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => void;
}

export function AdminPasswordModal({
  open,
  onOpenChange,
  onAuthenticated
}: AdminPasswordModalProps) {
  // Admin authentication is now handled via database roles
  // This modal is deprecated - admin status is checked via user_roles table
  React.useEffect(() => {
    if (open) {
      onAuthenticated();
      onOpenChange(false);
    }
  }, [open, onAuthenticated, onOpenChange]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verifying admin access...</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
