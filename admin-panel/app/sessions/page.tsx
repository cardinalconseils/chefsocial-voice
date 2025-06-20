'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';

interface Session {
  id: string;
  user_id: string;
  user_name: string;
  type: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  started_at: string;
  ended_at?: string;
  duration?: number;
  content_generated: number;
  voice_minutes: number;
  platform?: string;
  last_activity: string;
}

interface SessionStats {
  total_active: number;
  total_today: number;
  avg_duration: number;
  content_generated_today: number;
  voice_minutes_today: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadSessions();
    loadStats();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      loadSessions();
      loadStats();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/sessions/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load session stats:', error);
    }
  };

  const endSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this session?')) return;
    
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        loadSessions();
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    return session.status === filter;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading sessions...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Session Monitoring</h1>
            <p className="text-gray-600">Monitor and manage user sessions across the platform</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadSessions}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{stats.total_active}</div>
              <div className="text-sm text-gray-600">Active Sessions</div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{stats.total_today}</div>
              <div className="text-sm text-gray-600">Sessions Today</div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">{stats.avg_duration}m</div>
              <div className="text-sm text-gray-600">Avg Duration</div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{stats.content_generated_today}</div>
              <div className="text-sm text-gray-600">Content Today</div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{stats.voice_minutes_today}m</div>
              <div className="text-sm text-gray-600">Voice Minutes</div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session List */}
          <div className="lg:col-span-2 bg-white rounded-lg border">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Active Sessions</h2>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">All Sessions</option>
                  <option value="active">Active Only</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-4">💭</div>
                  <div>No sessions found</div>
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                      selectedSession?.id === session.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{session.user_name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {session.type} • {formatDuration(session.started_at, session.ended_at)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Started: {new Date(session.started_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-600">{session.content_generated} content</div>
                        <div className="text-gray-500">{session.voice_minutes}m voice</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Session Details */}
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Session Details</h2>
            </div>
            
            {selectedSession ? (
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">{selectedSession.user_name}</h3>
                  <p className="text-sm text-gray-600">User ID: {selectedSession.user_id}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Type</div>
                    <div className="font-medium">{selectedSession.type}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Status</div>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(selectedSession.status)}`}>
                      {selectedSession.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Duration</div>
                    <div className="font-medium">{formatDuration(selectedSession.started_at, selectedSession.ended_at)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Content Generated</div>
                    <div className="font-medium">{selectedSession.content_generated}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Voice Minutes</div>
                    <div className="font-medium">{selectedSession.voice_minutes}m</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Platform</div>
                    <div className="font-medium">{selectedSession.platform || 'N/A'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 text-sm">Started</div>
                  <div className="font-medium">{new Date(selectedSession.started_at).toLocaleString()}</div>
                </div>

                {selectedSession.ended_at && (
                  <div>
                    <div className="text-gray-500 text-sm">Ended</div>
                    <div className="font-medium">{new Date(selectedSession.ended_at).toLocaleString()}</div>
                  </div>
                )}

                <div>
                  <div className="text-gray-500 text-sm">Last Activity</div>
                  <div className="font-medium">{new Date(selectedSession.last_activity).toLocaleString()}</div>
                </div>

                {selectedSession.status === 'active' && (
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => endSession(selectedSession.id)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      End Session
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <div>Select a session to view details</div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Activity */}
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {filteredSessions.slice(0, 10).map((session) => (
                <div key={session.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <span className="font-medium">{session.user_name}</span>
                    {' '}
                    {session.status === 'active' ? 'is actively using' : 'completed'} 
                    {' '}
                    <span className="text-gray-600">{session.type}</span>
                  </div>
                  <div className="text-gray-500">
                    {new Date(session.last_activity).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}