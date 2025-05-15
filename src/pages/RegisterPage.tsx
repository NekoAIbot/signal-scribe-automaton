
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/services/authService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { ArrowRight, Info, Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setSubmitted(true); // Prevent multiple form submissions
    
    const result = await register(name, email, password);
    if (result.success) {
      if (result.code) {
        setVerificationCode(result.code);
        toast.success('Registration successful! A verification code has been sent to your email.');
      }
    } else {
      setSubmitted(false); // Allow retry if failed
    }
  };
  
  const handleCopyCode = () => {
    if (verificationCode) {
      navigator.clipboard.writeText(verificationCode);
      toast.success('Verification code copied to clipboard');
    }
  };
  
  const handleProceedToLogin = () => {
    navigate('/login');
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-trading-bg p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">Register to start trading</CardDescription>
        </CardHeader>
        <CardContent>
          {verificationCode ? (
            <div className="space-y-6">
              <Alert className="border-primary bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
                <AlertTitle>Verification Code Sent</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">A verification code has been sent to your email:</p>
                  <div className="flex items-center justify-between mt-2 mb-3">
                    <div className="text-xl font-bold text-primary">{verificationCode}</div>
                    <Button size="sm" variant="outline" onClick={handleCopyCode}>
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm mt-3">
                    In a real app, this code would be delivered to your email. 
                    For this demo, please save this code to use when logging in.
                  </p>
                </AlertDescription>
              </Alert>
              <Button
                className="w-full"
                onClick={handleProceedToLogin}
              >
                Proceed to Login <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={submitted}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitted}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitted}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitted}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || submitted}
              >
                {loading ? 'Registering...' : 'Register'} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterPage;
