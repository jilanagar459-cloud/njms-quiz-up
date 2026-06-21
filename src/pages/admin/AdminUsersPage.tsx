import { useEffect, useState, useCallback } from 'react';
import { Search, Users, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAllUsers, searchUsers } from '@/services/api';
import type { Profile } from '@/types/types';
import { useDebounce } from '@/hooks/use-debounce';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(query, 300);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    if (debouncedQuery.trim()) {
      const data = await searchUsers(debouncedQuery.trim());
      setUsers(data);
    } else {
      const data = await getAllUsers(page, 20);
      setUsers(data);
    }
    setLoading(false);
  }, [debouncedQuery, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">User List</h1>
          <p className="text-sm text-muted-foreground">View all registered participants</p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={loadUsers}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, tehsil..."
          className="pl-9 bg-input border-border h-9"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {query ? 'No users match your search' : 'No registered users yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border bg-card">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {users.length} User{users.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-border">
                      {['Name', 'Surname', 'Phone', 'Tehsil', 'Role', 'Joined'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                          {u.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                          {u.surname ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground mono-num">
                          {u.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                          {u.tehsil ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            variant={u.role === 'admin' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground mono-num">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {!query && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="h-8"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground mono-num">Page {page}</span>
              <Button
                variant="secondary"
                size="sm"
                className="h-8"
                disabled={users.length < 20}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
