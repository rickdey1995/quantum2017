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
import { getUsersWithSubscriptions as getUsers, addUser, updateUserAction, deleteUserAction, changeAdminPassword } from "@/app/actions"; // alias for backward compatibility
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ImageUpload } from "@/components/admin/image-upload";
import { PackageManagement } from "@/components/admin/package-management";

const plans: User['plan'][] = ["Starter", "Pro", "Expert"];

interface EditSettingsFormProps {
  settingsJSON: string;
  onChange: (value: string) => void;
  token?: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
  onClose?: () => void;
}

function EditSettingsForm({ settingsJSON, onChange, token, onSuccess, onError, onClose }: EditSettingsFormProps) {
  const [settings, setSettings] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState({
    hero: true,
    stats: true,
    trust: true,
    why: true,
    benefits: true,
    design: false,
  });

  useEffect(() => {
    try {
      setSettings(JSON.parse(settingsJSON));
    } catch {
      setSettings(null);
    }
  }, [settingsJSON]);

  const updateSetting = (path: string, value: any) => {
    const updated = JSON.parse(settingsJSON);
    const keys = path.split('.');
    let current = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    onChange(JSON.stringify(updated, null, 2));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const save = async () => {
    try {
      const parsed = JSON.parse(settingsJSON);
      const res = await fetch('/api/landing-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      onSuccess();
    } catch (error) {
      onError((error as Error).message);
    }
  };

  if (!settings) {
    return <div className="p-4 text-red-500">Invalid JSON format</div>;
  }

  return (
    <>
      {/* Hero Section */}
      <div className="mb-6 border rounded-lg p-4">
        <button onClick={() => toggleSection('hero')} className="w-full flex items-center justify-between font-semibold hover:bg-muted p-2 rounded">
          <span>🏠 Hero Section</span>
          <span>{expandedSections.hero ? '▼' : '▶'}</span>
        </button>
        {expandedSections.hero && (
          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Title</Label>
              <Input value={settings.hero?.title || ''} onChange={(e) => updateSetting('hero.title', e.target.value)} placeholder="Hero title" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Subtitle</Label>
              <Input value={settings.hero?.subtitle || ''} onChange={(e) => updateSetting('hero.subtitle', e.target.value)} placeholder="Hero subtitle" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Button Text</Label>
              <Input value={settings.hero?.buttonText || ''} onChange={(e) => updateSetting('hero.buttonText', e.target.value)} placeholder="Button text" />
            </div>
            <ImageUpload
              label="Hero Section Image"
              section="hero"
              currentImage={settings.hero?.image}
              onImageUpload={(imagePath) => updateSetting('hero.image', imagePath)}
              token={token}
              onError={onError}
            />
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="mb-6 border rounded-lg p-4">
        <button onClick={() => toggleSection('stats')} className="w-full flex items-center justify-between font-semibold hover:bg-muted p-2 rounded">
          <span>📊 Stats Section</span>
          <span>{expandedSections.stats ? '▼' : '▶'}</span>
        </button>
        {expandedSections.stats && (
          <div className="mt-4 space-y-4">
            {settings.stats?.map((stat: any, idx: number) => (
              <div key={idx} className="border-l-2 border-primary pl-4">
                <Label className="text-xs uppercase text-muted-foreground">Stat {idx + 1}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={stat.label || ''} onChange={(e) => {
                    const updated = JSON.parse(settingsJSON);
                    updated.stats[idx].label = e.target.value;
                    onChange(JSON.stringify(updated, null, 2));
                  }} placeholder="Label" />
                  <Input value={stat.value || ''} onChange={(e) => {
                    const updated = JSON.parse(settingsJSON);
                    updated.stats[idx].value = e.target.value;
                    onChange(JSON.stringify(updated, null, 2));
                  }} placeholder="Value" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust Section */}
      <div className="mb-6 border rounded-lg p-4">
        <button onClick={() => toggleSection('trust')} className="w-full flex items-center justify-between font-semibold hover:bg-muted p-2 rounded">
          <span>🤝 Trust Section</span>
          <span>{expandedSections.trust ? '▼' : '▶'}</span>
        </button>
        {expandedSections.trust && (
          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Title</Label>
              <Input value={settings.trust?.title || ''} onChange={(e) => updateSetting('trust.title', e.target.value)} placeholder="Trust title" />
            </div>
            <ImageUpload
              label="Trust Section Image"
              section="trust"
              currentImage={settings.trust?.image}
              onImageUpload={(imagePath) => updateSetting('trust.image', imagePath)}
              token={token}
              onError={onError}
            />
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Points (one per line)</Label>
              <textarea
                value={settings.trust?.points?.join('\n') || ''}
                onChange={(e) => updateSetting('trust.points', e.target.value.split('\n').filter(p => p.trim()))}
                className="w-full h-24 font-mono p-2 border rounded"
                placeholder="Point 1&#10;Point 2&#10;Point 3"
              />
            </div>
          </div>
        )}
      </div>

      {/* Why Etrade Section */}
      <div className="mb-6 border rounded-lg p-4">
        <button onClick={() => toggleSection('why')} className="w-full flex items-center justify-between font-semibold hover:bg-muted p-2 rounded">
          <span>❓ Why Etrade Section</span>
          <span>{expandedSections.why ? '▼' : '▶'}</span>
        </button>
        {expandedSections.why && (
          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Title</Label>
              <Input value={settings.why?.title || ''} onChange={(e) => updateSetting('why.title', e.target.value)} placeholder="Section title" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Subtitle</Label>
              <Input value={settings.why?.subtitle || ''} onChange={(e) => updateSetting('why.subtitle', e.target.value)} placeholder="Section subtitle" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Features (one per line) <span className="text-gray-400 text-xs">(legacy)</span></Label>
              <textarea
                value={settings.why?.items?.join('\n') || ''}
                onChange={(e) => updateSetting('why.items', e.target.value.split('\n').filter(i => i.trim()))}
                className="w-full h-24 font-mono p-2 border rounded"
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
              />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Services (up to 3)</Label>
              {(settings.why?.services || []).map((svc: any, idx: number) => (
                <div key={idx} className="mb-4 border p-2 rounded">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={svc.title || ''}
                        onChange={(e) => updateSetting(`why.services.${idx}.title`, e.target.value)}
                        placeholder="Service title"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={svc.description || ''}
                        onChange={(e) => updateSetting(`why.services.${idx}.description`, e.target.value)}
                        placeholder="Short description"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <ImageUpload
                      label={`Service ${idx + 1} Icon`}
                      section={`why-service-${idx}`}
                      currentImage={svc.icon}
                      onImageUpload={(path) => updateSetting(`why.services.${idx}.icon`, path)}
                      token={token}
                      onError={(msg) => console.error(msg)}
                    />
                  </div>
                  <div className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const arr = settings.why?.services || [];
                        arr.splice(idx, 1);
                        updateSetting('why.services', arr);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {(settings.why?.services || []).length < 3 && (
                <Button
                  size="sm"
                  onClick={() => {
                    const arr = settings.why?.services || [];
                    arr.push({ title: '', description: '', icon: '' });
                    updateSetting('why.services', arr);
                  }}
                >Add Service</Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Benefits Section */}
      <div className="mb-6 border rounded-lg p-4">
        <button onClick={() => toggleSection('benefits')} className="w-full flex items-center justify-between font-semibold hover:bg-muted p-2 rounded">
          <span>⭐ Benefits Section</span>
          <span>{expandedSections.benefits ? '▼' : '▶'}</span>
        </button>
        {expandedSections.benefits && (
          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Title</Label>
              <Input value={settings.benefits?.title || ''} onChange={(e) => updateSetting('benefits.title', e.target.value)} placeholder="Benefits title" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Subtitle</Label>
              <Input value={settings.benefits?.subtitle || ''} onChange={(e) => updateSetting('benefits.subtitle', e.target.value)} placeholder="Benefits subtitle" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Benefits (one per line)</Label>
              <textarea
                value={settings.benefits?.items?.join('\n') || ''}
                onChange={(e) => updateSetting('benefits.items', e.target.value.split('\n').filter(b => b.trim()))}
                className="w-full h-32 font-mono p-2 border rounded"
                placeholder="Benefit 1&#10;Benefit 2&#10;Benefit 3"
              />
            </div>
          </div>
        )}
      </div>

      {/* Design Section */}
      <div className="mb-6 border rounded-lg p-4">
        <button onClick={() => toggleSection('design')} className="w-full flex items-center justify-between font-semibold hover:bg-muted p-2 rounded">
          <span>🎨 Design & Colors</span>
          <span>{expandedSections.design ? '▼' : '▶'}</span>
        </button>
        {expandedSections.design && (
          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Global Font Family</Label>
              <Input value={settings.design?.globalFont || ''} onChange={(e) => updateSetting('design.globalFont', e.target.value)} placeholder="e.g., 'Inter, sans-serif'" />
            </div>
            {/* primaryColor editing removed per request; buttons and other
                elements will always use the default Tailwind color so we
                avoid runtime styling issues. */}
          </div>
        )}
      </div>

      {/* Titles */}
      <div className="mb-6 border rounded-lg p-4">
        <div className="font-semibold mb-4">📝 Page Titles</div>
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Leaders Section Title</Label>
            <Input value={settings.leadersTitle || ''} onChange={(e) => updateSetting('leadersTitle', e.target.value)} placeholder="Section title" />
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Instruments Section Title</Label>
            <Input value={settings.instrumentsTitle || ''} onChange={(e) => updateSetting('instrumentsTitle', e.target.value)} placeholder="Section title" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onClose?.()}>Cancel</Button>
        <Button onClick={save}>Save Changes</Button>
      </DialogFooter>
    </>
  );
}

// primaryColor utilities removed since the setting no longer exists.

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<(User & { renewal_date?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "manage" | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<{name: string, email: string, plan: User['plan'], password?: string}>({ name: "", email: "", plan: "Starter" });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // landing page settings state
  const [settingsJSON, setSettingsJSON] = useState('');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const { toast } = useToast();
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        router.push('/login');
      }
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

  // load landing settings once we know the admin is authenticated
  useEffect(() => {
    const loadSettings = async () => {
      setSettingsLoading(true);
      try {
        const res = await fetch('/api/landing-settings');
        if (res.ok) {
          const data = await res.json();
          // if the database has no settings yet, show a starter template
          const template = {
            hero: {
              title: "The Social Intelligence Platform\nthat helps you invest in a smart way",
              subtitle: "Go long or short? Go Etrade! Connect with experienced traders and boost your trading journey.",
              buttonText: "Join Now",
              image: "/Home banner image.png",
            },
            stats: [
              { label: "Countries", value: "150+" },
              { label: "Accounts", value: "30M+" },
              { label: "Leaders", value: "2M+" },
            ],
            trust: { title: "Trust is… Trading is not easy", points: [], image: "/2nd image.png" },
            why: { title: "Why Etrade?", subtitle: "Powerful tools to grow your portfolio", items: [], services: [
              { title: '', description: '', icon: '' },
              { title: '', description: '', icon: '' },
              { title: '', description: '', icon: '' },
            ] },
            leadersTitle: "Etrade Top Leaders",
            instrumentsTitle: "Wide variety of instruments",
            benefits: { title: "Benefits", subtitle: "Everything you need for smarter trading", items: [] },
            design: { globalFont: "" },
          };
          if (!data || Object.keys(data).length === 0) {
            setSettingsJSON(JSON.stringify(template, null, 2));
          } else {
            setSettingsJSON(JSON.stringify(data, null, 2));
          }
        }
      } catch (err) {
        console.error('failed loading settings', err);
      } finally {
        setSettingsLoading(false);
      }
    };
    if (token) loadSettings();
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

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Total Revenue card removed - not required */}
          <Card
            className="relative overflow-hidden text-white"
            style={{
              backgroundImage: "url('/dashboard%20item01.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* slightly dark overlay to keep text legible */}
            <div className="absolute inset-0 bg-black/25" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-3 w-3 text-white opacity-75" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">+{users.filter(u => u.status === 'Active').length}</div>
              <p className="text-xs">Manage your users</p>
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
        {/* landing page settings card */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Landing Page Settings</CardTitle>
            <Button 
              size="sm" 
              onClick={() => setSettingsDialogOpen(true)}
              disabled={settingsLoading}
            >
              {settingsLoading ? 'Loading...' : 'Edit'}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Modify homepage text, fonts, colors, etc. Edits are saved as JSON and apply immediately when published.</p>
          </CardContent>
        </Card>

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
                  <TableHead>Renewal Date</TableHead>
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
                    <TableCell>{user.renewal_date ? new Date(user.renewal_date).toLocaleDateString() : '—'}</TableCell>
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

        {/* Package Management */}
        <div className="mt-8">
          <PackageManagement token={token} />
        </div>
      </div>
      <DialogContent className="sm:max-w-[425px]">
        {renderDialogContent()}
      </DialogContent>
    </Dialog>

    {settingsDialogOpen && (
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Landing Page Configuration</DialogTitle>
          </DialogHeader>
          
          <EditSettingsForm 
            settingsJSON={settingsJSON}
            onChange={setSettingsJSON}
            token={token}
            onSuccess={() => {
              toast({ title: 'Success', description: 'Settings saved.' });
              setSettingsDialogOpen(false);
            }}
            onError={(error) => {
              toast({
                title: 'Error saving settings',
                description: error,
                variant: 'destructive',
              });
            }}
            onClose={() => setSettingsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    )}

    {showPasswordDialog && (
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
    )}
    </>
  );
}
