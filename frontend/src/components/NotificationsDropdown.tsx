import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Info, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionRequired?: boolean;
}

// Simulated notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Receipt Processed',
    message: 'Your grocery receipt from SuperMart has been successfully processed and categorized.',
    type: 'success',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    read: false,
    actionRequired: false,
  },
  {
    id: '2',
    title: 'Budget Alert',
    message: 'You\'ve spent 85% of your monthly grocery budget. Consider reviewing your spending.',
    type: 'warning',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    actionRequired: true,
  },
  {
    id: '3',
    title: 'Cashback Available',
    message: 'You have ₹45 cashback available from your recent purchases. Claim now!',
    type: 'info',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    read: true,
    actionRequired: true,
  },
  {
    id: '4',
    title: 'Monthly Report Ready',
    message: 'Your spending report for this month is ready to view with detailed insights.',
    type: 'info',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    read: true,
    actionRequired: false,
  },
  {
    id: '5',
    title: 'Receipt Upload Failed',
    message: 'Failed to process receipt image. Please try uploading again with better lighting.',
    type: 'error',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    read: false,
    actionRequired: true,
  },
];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const formatTimestamp = (date: Date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
};

export const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [loadingRec, setLoadingRec] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const fetchRecommendation = async () => {
    setLoadingRec(true);
    const sessionId = 'mcp-session-84427bd6-fc37-48b1-96e9-14116c131fd5';
    try {
      const res = await fetch('http://127.0.0.1:5000/recommend_card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      const data = await res.json();
      if (res.ok) {
        const newNotif: Notification = {
          id: Date.now().toString(),
          title: 'Card Recommendation',
          message: `Based on your recent ${data.category} spending, we recommend: ${data.recommended_cards.join(', ')}.`,
          type: 'info',
          timestamp: new Date(),
          read: false,
          actionRequired: false,
        };
        setNotifications(prev => [newNotif, ...prev]);
      } else {
        console.error(data.error || 'Failed to get recommendation');
      }
    } catch (err) {
      console.error('Error fetching recommendation', err);
    } finally {
      setLoadingRec(false);
    }
  };

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="h-10 w-10 relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsOpen(false)} />
          <div
            ref={dropdownRef}
            className="absolute top-full mt-2 bg-card border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-hidden md:right-0 md:w-80 -right-2 w-80 transform transition-all duration-200 ease-out opacity-100 scale-100"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-muted-foreground hover:text-foreground">
                    Mark all read
                  </Button>
                )}
                <Button variant="outline" size="sm" disabled={loadingRec} onClick={fetchRecommendation} className="text-xs">
                  {loadingRec ? 'Loading...' : 'Recommend'}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={cn("group p-4 hover:bg-muted/50 transition-colors cursor-pointer", !notification.read && "bg-muted/30")}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn("text-sm font-medium truncate", !notification.read ? "text-foreground" : "text-muted-foreground")}> {notification.title} </h4>
                            <div className="flex items-center gap-1">
                              {!notification.read && <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />}
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); removeNotification(notification.id); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{notification.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">{formatTimestamp(notification.timestamp)}</span>
                            {notification.actionRequired && <Badge variant="outline" className="text-xs">Action Required</Badge>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">View All Notifications</Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
