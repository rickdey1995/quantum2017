"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, PlusCircle, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User } from "@/lib/schema";
import { getUsers, addUser, updateUserAction, deleteUserAction, changeAdminPassword } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

const plans: User['plan'][] = ["Starter", "Pro", "Expert"];

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "manage" | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<{name: string, email: string, plan: User['plan'], password?: string}>({ name: "", email: "", plan: "Starter" });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const fetchedUsers = await getUsers(token);
      setUsers(fetchedUsers);
    } catch (error) {
      toast({
        title: "Error fetching users",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const openAddDialog = () => {
    setDialogMode("add");
    setNewUser({ name: "", email: "", plan: "Starter", password: "" });
    setDialogOpen(true);
  };

  const openManageDialog = (user: User) => {
    setDialogMode("manage");
    setCurrentUser({ ...user });
    setDialogOpen(true);
  };

  const handleAddUser = async () => {
    if (newUser.name && newUser.email && newUser.password && token) {
      try {
        await addUser(token, {
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          plan: newUser.plan,
        });
        toast({ title: "Success", description: "User added successfully." });
        setDialogOpen(false);
        fetchUsers(); // Refresh users list
      } catch (error) {
        toast({
          title: "Error adding user",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    } else {
       toast({
          title: "Missing fields",
          description: "Please fill out all fields.",
          variant: "destructive",
        });
    }
  };

  const handleUpdateUser = async () => {
    if (currentUser && token) {
      try {
        await updateUserAction(token, currentUser.id, {
          name: currentUser.name,
          email: currentUser.email,
          plan: currentUser.plan,
          status: currentUser.status,
        });
        toast({ title: "Success", description: "User updated successfully." });
        setDialogOpen(false);
        fetchUsers();
      } catch (error) {
         toast({
          title: "Error updating user",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteUser = async () => {
    if (currentUser && token) {
      try {
        await deleteUserAction(token, currentUser.id);
        toast({ title: "Success", description: "User deleted successfully." });
        setDialogOpen(false);
        fetchUsers();
      } catch (error) {
        toast({
          title: "Error deleting user",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (!token) return;

    setIsChangingPassword(true);
    try {
      await changeAdminPassword(token, newPassword);
      toast({ title: "Success!", description: "Your password has been changed." });
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  const renderDialogContent = () => {
    if (dialogMode === 'add') {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Password</Label>
              <Input id="password" type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plan" className="text-right">Plan</Label>
              <Select value={newUser.plan} onValueChange={(value: User['plan']) => setNewUser({...newUser, plan: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddUser}>Add User</Button>
          </DialogFooter>
        </>
      );
    }

    if (dialogMode === 'manage' && currentUser) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Manage User: {currentUser.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name-manage" className="text-right">Name</Label>
              <Input id="name-manage" value={currentUser.name} onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email-manage" className="text-right">Email</Label>
              <Input id="email-manage" type="email" value={currentUser.email} onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plan-manage" className="text-right">Plan</Label>
              <Select value={currentUser.plan} onValueChange={(value: User['plan']) => setCurrentUser(prev => prev ? {...prev, plan: value} : null)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status-manage" className="text-right">Status</Label>
              <Select value={currentUser.status} onValueChange={(value: "Active" | "Cancelled") => setCurrentUser(prev => prev ? {...prev, status: value} : null)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" onClick={handleDeleteUser}><Trash2 className="mr-2 h-4 w-4" /> Delete User</Button>
            <Button type="submit" onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </>
      );
    }
    return null;
  }
  
  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }
  
  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{users.filter(u => u.status === 'Active').length}</div>
              <p className="text-xs text-muted-foreground">Manage your users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono mb-3 p-2 bg-muted rounded">
                {user?.email}
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowPasswordDialog(true)} className="w-full">
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Management</CardTitle>
              <Button size="sm" onClick={openAddDialog}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add User
              </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscription Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.plan === "Expert" ? "default" : user.plan === "Pro" ? "secondary" : "outline"}>
                        {user.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <Badge variant={user.status === "Active" ? "default" : "destructive"} className={user.status === "Active" ? "bg-green-500" : ""}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openManageDialog(user)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Manage</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <DialogContent className="sm:max-w-[425px]">
        {renderDialogContent()}
      </DialogContent>
    </Dialog>

    <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Admin Password</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">Current Password (admin@123)</Label>
            <Input id="current-password" type="text" value="admin@123" disabled className="text-muted-foreground" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input 
              id="new-password" 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input 
              id="confirm-password" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handleChangePassword} disabled={isChangingPassword}>
            {isChangingPassword ? "Changing..." : "Change Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
