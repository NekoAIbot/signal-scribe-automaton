import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetPasswordModal({ open, onOpenChange }: ResetPasswordModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password Reset</DialogTitle>
          <DialogDescription>
            Password reset is now handled through the authentication system. 
            Use the "Forgot Password" option on the login page.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
