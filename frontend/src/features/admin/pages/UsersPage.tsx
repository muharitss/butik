import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  User,
  Search,
  RotateCw,
  Edit2,
  Power,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../../app/AuthContext.tsx';
import {
  listUsers,
  deactivateUser,
  activateUser,
  type UserDto,
} from '../api/users.api.ts';
import { CreateUserDialog } from '../components/CreateUserDialog.tsx';
import {
  ChangePasswordDialog,
  type ChangePasswordMode,
} from '../components/ChangePasswordDialog.tsx';
import { EditUserDialog } from '../components/EditUserDialog.tsx';

export const UsersPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserDto | null>(null);
  const [passwordDialogState, setPasswordDialogState] = useState<{
    open: boolean;
    mode: ChangePasswordMode;
    targetUser?: UserDto | null;
  }>({
    open: false,
    mode: 'self',
    targetUser: null,
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (user: UserDto) => {
    if (user.id === currentUser?.id) {
      return;
    }

    try {
      setActionLoadingId(user.id);
      setError(null);
      if (user.isActive) {
        const updated = await deactivateUser(user.id);
        setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      } else {
        const updated = await activateUser(user.id);
        setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const staffCount = users.filter((u) => u.role === 'staff').length;
  const ownerCount = users.filter((u) => u.role === 'owner').length;

  return (
    <div className="users-management-page space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight flex items-center gap-2">
            <Users className="size-6 text-primary" />
            User & Staff Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage boutique team accounts, operator access roles, and credential security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            id="btn-change-my-password"
            variant="outline"
            size="sm"
            onClick={() =>
              setPasswordDialogState({
                open: true,
                mode: 'self',
                targetUser: null,
              })
            }
            className="text-xs h-8 gap-1.5"
          >
            <Lock className="size-3.5" />
            <span>Change My Password</span>
          </Button>

          <Button
            type="button"
            id="btn-create-user"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="text-xs h-8 gap-1.5"
          >
            <UserPlus className="size-3.5" />
            <span>Add User Account</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-card/60">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Total Accounts
          </div>
          <div className="text-xl font-bold font-heading mt-1">{totalUsers}</div>
        </Card>
        <Card className="p-3 bg-card/60">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Active Accounts
          </div>
          <div className="text-xl font-bold font-heading mt-1 text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
        </Card>
        <Card className="p-3 bg-card/60">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Staff Members
          </div>
          <div className="text-xl font-bold font-heading mt-1">{staffCount}</div>
        </Card>
        <Card className="p-3 bg-card/60">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Owners
          </div>
          <div className="text-xl font-bold font-heading mt-1">{ownerCount}</div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Registered Team Members</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Direct access controls and role-based permissions.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="input-search-users"
                placeholder="Search name, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-full"
              />
            </div>
            <Button
              type="button"
              id="btn-refresh-users"
              variant="outline"
              size="icon-xs"
              onClick={fetchUsers}
              disabled={loading}
              title="Refresh users list"
              className="h-8 w-8 shrink-0"
            >
              <RotateCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="p-4">
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertCircle className="size-3.5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {loading && users.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Loading user accounts...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {searchQuery ? 'No accounts matched your search.' : 'No accounts found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table id="users-table">
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-56">User / Name</TableHead>
                    <TableHead className="w-48">Contact</TableHead>
                    <TableHead className="w-28">Role</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-36">Created</TableHead>
                    <TableHead className="text-right w-44">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isActionLoading = actionLoadingId === u.id;

                    return (
                      <TableRow key={u.id} className="text-xs hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                {u.name}
                                {isSelf && (
                                  <span className="text-[9px] font-normal uppercase tracking-wider px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate font-mono">
                                {u.email || 'No email provided'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">
                            {u.phone || '—'}
                          </span>
                        </TableCell>

                        <TableCell>
                          {u.role === 'owner' ? (
                            <Badge variant="default" className="text-[10px] gap-1 py-0 h-5">
                              <Shield className="size-2.5" />
                              <span>Owner</span>
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] gap-1 py-0 h-5">
                              <User className="size-2.5" />
                              <span>Staff</span>
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {u.isActive ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 h-5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1"
                            >
                              <CheckCircle2 className="size-2.5" />
                              <span>Active</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="text-[10px] py-0 h-5 bg-destructive/15 text-destructive border-destructive/30 gap-1"
                            >
                              <AlertCircle className="size-2.5" />
                              <span>Deactivated</span>
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              id={`btn-edit-user-${u.id}`}
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setEditUser(u)}
                              title="Edit user profile"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>

                            <Button
                              type="button"
                              id={`btn-reset-password-${u.id}`}
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                setPasswordDialogState({
                                  open: true,
                                  mode: 'admin-reset',
                                  targetUser: u,
                                })
                              }
                              title="Reset user password"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                            >
                              <KeyRound className="size-3.5" />
                            </Button>

                            <Button
                              type="button"
                              id={`btn-toggle-active-${u.id}`}
                              variant="ghost"
                              size="icon-xs"
                              disabled={isSelf || isActionLoading}
                              onClick={() => handleToggleActive(u)}
                              title={
                                isSelf
                                  ? 'You cannot deactivate your own account'
                                  : u.isActive
                                  ? 'Deactivate account'
                                  : 'Activate account'
                              }
                              className={`h-7 w-7 ${
                                u.isActive
                                  ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
                              }`}
                            >
                              {isActionLoading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Power className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={(newUser) => {
          setUsers((prev) => [newUser, ...prev]);
        }}
      />

      <EditUserDialog
        open={Boolean(editUser)}
        onOpenChange={(open) => !open && setEditUser(null)}
        user={editUser}
        onSuccess={(updated) => {
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        }}
      />

      <ChangePasswordDialog
        open={passwordDialogState.open}
        onOpenChange={(open) =>
          setPasswordDialogState((prev) => ({ ...prev, open }))
        }
        mode={passwordDialogState.mode}
        targetUser={passwordDialogState.targetUser}
      />
    </div>
  );
};
