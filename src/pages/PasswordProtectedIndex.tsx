import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const PasswordProtectedIndex = () => {
  const navigate = useNavigate();
  const { signIn, isMaster, changeAccessPassword, accessPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMasterPanel, setShowMasterPanel] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = signIn(password);
    if (result.error) {
      toast({ title: 'Access Denied', description: result.error, variant: 'destructive' });
    } else if (isMaster) {
      setShowMasterPanel(true);
      toast({ title: 'Master Access Granted', description: 'You can now change the access password.' });
    } else {
      toast({ title: 'Welcome!', description: 'Access granted.' });
      navigate('/admin');
    }
    setLoading(false);
    setPassword('');
  };

  const handlePasswordChange = () => {
    if (!newPassword.trim()) {
      toast({ title: 'Error', description: 'Please enter a new password.', variant: 'destructive' });
      return;
    }
    changeAccessPassword(newPassword);
    toast({ title: 'Password Updated', description: 'Access password changed.' });
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {showMasterPanel ? 'Master Control Panel' : 'Admin Access'}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {showMasterPanel ? 'Change the regular access password' : 'Enter password to access Quiz Builder'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showMasterPanel ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter access password"
                    className="pr-10"
                    autoFocus
                  />
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Checking...' : 'Access Quiz Builder'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Use master password for admin controls
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                Master access granted. Current regular password: <strong>{accessPassword}</strong>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Access Password</Label>
                <Input
                  id="new-password"
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePasswordChange} className="flex-1">
                  <Key className="h-4 w-4 mr-2" />Update Password
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin')}>
                  Skip
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordProtectedIndex;
