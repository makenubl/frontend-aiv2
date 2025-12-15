import React, { useState, useEffect } from 'react';
import { usersApi, UserData } from '../services/applications.api';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';

const getRoleBadge = (role: string) => {
  const styles: Record<string, { bg: string; color: string; icon: string }> = {
    admin: { bg: 'rgba(220, 38, 38, 0.2)', color: '#ef4444', icon: '👑' },
    evaluator: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', icon: '⚡' },
    reviewer: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', icon: '👁️' },
  };
  const style = styles[role] || styles.reviewer;
  return (
    <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
      {style.icon} {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

const SettingsPanel: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'evaluator' as 'admin' | 'evaluator' | 'reviewer'
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await usersApi.getUsers();
      setUsers(result.users);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleAddUser = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.name) {
      setError('All fields are required');
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      await usersApi.createUser(formData);
      setSuccessMessage('User created successfully');
      setShowAddForm(false);
      setFormData({ username: '', email: '', password: '', name: '', role: 'evaluator' });
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (username: string) => {
    try {
      setActionLoading(true);
      setError(null);
      const updates: any = {};
      if (formData.email) updates.email = formData.email;
      if (formData.password) updates.password = formData.password;
      if (formData.name) updates.name = formData.name;
      if (formData.role) updates.role = formData.role;
      
      await usersApi.updateUser(username, updates);
      setSuccessMessage('User updated successfully');
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      setActionLoading(true);
      setError(null);
      await usersApi.deleteUser(username);
      setSuccessMessage('User deleted successfully');
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (user: UserData) => {
    setEditingUser(user.username);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      name: user.name,
      role: user.role
    });
  };

  return (
    <div style={{ padding: 'var(--space-2xl)', maxWidth: '1200px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: 'var(--space-xl)' }}>⚙️ Settings</h2>

      {/* Success/Error Messages */}
      {successMessage && (
        <div style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiCheck /> {successMessage}
        </div>
      )}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FiX /></button>
        </div>
      )}

      {/* User Management Section */}
      <div style={{ background: 'var(--glass-bg)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            👥 User Management
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadUsers} disabled={loading} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <FiRefreshCw style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
            <button onClick={() => { setShowAddForm(true); setFormData({ username: '', email: '', password: '', name: '', role: 'evaluator' }); }} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 6, padding: '8px 16px', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <FiPlus /> Add User
            </button>
          </div>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontWeight: 600 }}>➕ Add New User</h4>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><FiX size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <input type="text" placeholder="Username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
              <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
              <input type="text" placeholder="Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                <option value="admin">👑 Admin</option>
                <option value="evaluator">⚡ Evaluator</option>
                <option value="reviewer">👁️ Reviewer</option>
              </select>
              <button onClick={handleAddUser} disabled={actionLoading} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 6, padding: '10px 16px', color: 'white', cursor: actionLoading ? 'wait' : 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                {actionLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading users...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Username</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.username} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {editingUser === user.username ? (
                      <>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{user.username}</td>
                        <td style={{ padding: '8px' }}><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%' }} /></td>
                        <td style={{ padding: '8px' }}><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%' }} /></td>
                        <td style={{ padding: '8px' }}>
                          <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            <option value="admin">Admin</option>
                            <option value="evaluator">Evaluator</option>
                            <option value="reviewer">Reviewer</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button onClick={() => handleUpdateUser(user.username)} disabled={actionLoading} style={{ background: '#22c55e', border: 'none', borderRadius: 4, padding: '6px 12px', color: 'white', cursor: 'pointer', marginRight: 6, fontSize: '0.8rem' }}>Save</button>
                          <button onClick={() => setEditingUser(null)} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '6px 12px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{user.username}</td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{user.name}</td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{user.email}</td>
                        <td style={{ padding: '12px' }}>{getRoleBadge(user.role)}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button onClick={() => startEdit(user)} style={{ background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '6px 10px', color: '#3b82f6', cursor: 'pointer', marginRight: 6 }} title="Edit"><FiEdit2 size={14} /></button>
                          {user.username !== 'admin@pvara.gov.pk' && (
                            <button onClick={() => handleDeleteUser(user.username)} style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 4, padding: '6px 10px', color: '#ef4444', cursor: 'pointer' }} title="Delete"><FiTrash2 size={14} /></button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permissions Matrix */}
      <div style={{ background: 'var(--glass-bg)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
          🔐 Permissions Matrix
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>Feature</th>
                <th style={{ padding: '10px', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>👑 Admin</th>
                <th style={{ padding: '10px', textAlign: 'center', color: '#3b82f6', fontWeight: 600 }}>⚡ Evaluator</th>
                <th style={{ padding: '10px', textAlign: 'center', color: '#22c55e', fontWeight: 600 }}>👁️ Reviewer</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'View Applications', admin: true, evaluator: true, reviewer: true },
                { feature: 'Upload Applications', admin: true, evaluator: true, reviewer: false },
                { feature: 'Delete Applications', admin: true, evaluator: false, reviewer: false },
                { feature: 'Trigger AI Evaluation', admin: true, evaluator: true, reviewer: false },
                { feature: 'Re-evaluate with GPT-5.1', admin: true, evaluator: true, reviewer: false },
                { feature: 'View Storage Files', admin: true, evaluator: true, reviewer: true },
                { feature: 'Upload Files', admin: true, evaluator: true, reviewer: false },
                { feature: 'Delete Files/Folders', admin: true, evaluator: false, reviewer: false },
                { feature: 'Chat with Documents', admin: true, evaluator: true, reviewer: true },
                { feature: 'Create NOC', admin: true, evaluator: true, reviewer: false },
                { feature: 'Manage Users', admin: true, evaluator: false, reviewer: false },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px', fontWeight: 500 }}>{row.feature}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{row.admin ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{row.evaluator ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{row.reviewer ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Info */}
      <div style={{ background: 'var(--glass-bg)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
          🖥️ System Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>AI Model</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#22d3ee' }}>GPT-5.1</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Storage</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#22d3ee' }}>MongoDB GridFS</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Backend</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#22d3ee' }}>Vercel Serverless</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Version</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#22d3ee' }}>2.1.0</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SettingsPanel;
