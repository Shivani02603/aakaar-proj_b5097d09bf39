```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

interface Session {
  id: string;
  name: string;
  created_at: string;
}

interface UploadedFile {
  id: string;
  filename: string;
  file_size: number;
  uploaded_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface DashboardStats {
  sessionCount: number;
  fileCount: number;
  messageCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    sessionCount: 0,
    fileCount: 0,
    messageCount: 0,
  });
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [recentFiles, setRecentFiles] = useState<UploadedFile[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch sessions
        const sessionsResponse = await fetch('/api/sessions');
        if (!sessionsResponse.ok) {
          throw new Error(`Failed to fetch sessions: ${sessionsResponse.statusText}`);
        }
        const sessionsData = await sessionsResponse.json();
        const sessions: Session[] = Array.isArray(sessionsData) ? sessionsData : [];
        setRecentSessions(sessions.slice(0, 5));

        // Fetch files (we need to get from all sessions)
        const files: UploadedFile[] = [];
        for (const session of sessions) {
          try {
            const filesResponse = await fetch(`/api/sessions/${session.id}/files`);
            if (filesResponse.ok) {
              const sessionFiles = await filesResponse.json();
              if (Array.isArray(sessionFiles)) {
                files.push(...sessionFiles);
              }
            }
          } catch (err) {
            console.error(`Failed to fetch files for session ${session.id}:`, err);
          }
        }
        setRecentFiles(files.slice(0, 5));

        // Fetch messages from the most recent session if available
        const messages: Message[] = [];
        if (sessions.length > 0) {
          const latestSessionId = sessions[0].id;
          try {
            const messagesResponse = await fetch(`/api/sessions/${latestSessionId}/messages`);
            if (messagesResponse.ok) {
              const sessionMessages = await messagesResponse.json();
              if (Array.isArray(sessionMessages)) {
                messages.push(...sessionMessages);
              }
            }
          } catch (err) {
            console.error(`Failed to fetch messages for session ${latestSessionId}:`, err);
          }
        }
        setRecentMessages(messages.slice(0, 5));

        // Calculate stats
        setStats({
          sessionCount: sessions.length,
          fileCount: files.length,
          messageCount: messages.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-50 p-8 ${inter.className}`}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600">Loading dashboard data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-gray-50 p-8 ${inter.className}`}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 font-medium">Error loading dashboard</div>
            <div className="text-red-600 mt-1">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-8 ${inter.className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Chat
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Sessions Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.sessionCount}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all sessions →
              </Link>
            </div>
          </div>

          {/* Files Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Files</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.fileCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-gray-500 text-sm">
                {stats.fileCount > 0 ? `${formatFileSize(recentFiles.reduce((acc, file) => acc + file.file_size, 0))} total` : 'No files uploaded'}
              </div>
            </div>
          </div>

          {/* AI Messages Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Messages</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.messageCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-gray-500 text-sm">
                {stats.messageCount > 0 ? `${recentMessages.filter(m => m.role === 'user').length} user, ${recentMessages.filter(m => m.role === 'assistant').length} assistant` : 'No messages yet'}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Items Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Sessions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
            </div>
            <div className="p-6">
              {recentSessions.length > 0 ? (
                <div className="space-y-4">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{session.name}</div>
                        <div className="text-sm text-gray-500">{formatDate(session.created_at)}</div>
                      </div>
                      <Link
                        href={`/?session=${session.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">No sessions yet</div>
                  <Link
                    href="/"
                    className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Create your first session →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Files */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Files</h2>
            </div>
            <div className="p-6">
              {recentFiles.length > 0 ? (
                <div className="space-y-4">
                  {recentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded">
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 truncate max-w-[150px]">
                            {file.filename}
                          </div>
                          <div className="text-sm text-gray-500">{formatFileSize(file.file_size)}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">{formatDate(file.uploaded_at)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">No files uploaded</div>
                  <div className="mt-2 text-sm text-gray-500">Upload files in the chat interface</div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Messages */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Messages</h2>
            </div>
            <div className="p-6">
              {recentMessages.length > 0 ? (
                <div className="space-y-4">
                  {recentMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${message.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {message.role === 'user' ? 'User' : 'AI'}
                        </span>
                        <div className="text-xs text-gray-500">{formatDate(message.created_at)}</div>
                      </div>
                      <div className="text-sm text-gray-700 line-clamp-2">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">No messages yet</div>
                  <div className="mt-2 text-sm text-gray-500">Start a conversation in the chat</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```