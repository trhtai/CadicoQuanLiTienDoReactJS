import { useEffect, useState } from "react";
import { signalRService } from "../services/signalRService";
import { get, post } from "../api/axiosClient";

const NotificationBell = (token) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const initializeSignalR = async () => {
      if (token) {
        await signalRService.startConnection(token);
        await fetchNotifications();

        signalRService.onReceiveNotification((notification) => {
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        });

        signalRService.onNotificationRead((notificationId) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        });

        signalRService.onAllNotificationsRead(() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          setUnreadCount(0);
        });
      }
    };

    initializeSignalR();

    return () => {
      signalRService.stopConnection();
    };
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const response = await get("/notification");
      const data = await response.data;
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await post(`/notification/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await post("notification/mark-all-read");
      fetchNotifications();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 3:
        return "⚠️";
      case 4:
        return "🔴";
      case 10:
        return "📌";
      default:
        return "🔵";
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 relative">
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-2 py-1 text-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-2 border-b flex justify-between items-center">
            <h3 className="font-semibold">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Không có thông báo
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`cursor-pointer p-3 border-b hover:bg-gray-50 ${
                    !notification.isRead ? "bg-green-400" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start">
                    <span className="mr-2">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div>
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
