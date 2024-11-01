import {
  HubConnectionBuilder,
  LogLevel,
  HubConnectionState,
  HttpTransportType,
} from "@microsoft/signalr";

class SignalRService {
  constructor() {
    this.connection = null;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 5;
  }

  async startConnection(token) {
    try {
      // Hủy kết nối cũ nếu tồn tại
      if (this.connection) {
        await this.stopConnection();
      }

      this.connection = new HubConnectionBuilder()
        .withUrl(import.meta.env.VITE_HUB_URL, {
          accessTokenFactory: () => token,
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect([0, 1000, 5000, 10000, 30000])
        .build();

      // Xử lý sự kiện đóng kết nối
      this.connection.onclose(async (error) => {
        console.error("Connection closed:", error);
        await this.reconnect(token);
      });

      // Xử lý sự kiện kết nối lại
      this.connection.onreconnecting((error) => {
        console.log("Attempting to reconnect...", error);
      });

      this.connection.onreconnected((connectionId) => {
        console.log("Reconnected successfully. Connection ID:", connectionId);
        this.reconnectAttempts = 0;
      });

      await this.connection.start();
      console.log("SignalR Connected Successfully!");
    } catch (err) {
      console.error("SignalR Connection Error: ", err);
    }
  }

  async handleConnectionError(token, error) {
    // Nếu số lần kết nối lại chưa vượt quá giới hạn
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);

      // Đợi một khoảng thời gian trước khi thử lại
      await new Promise((resolve) =>
        setTimeout(resolve, 2000 * this.reconnectAttempts)
      );

      try {
        await this.startConnection(token);
      } catch (retryError) {
        console.error("Reconnection failed:", retryError);
      }
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  onReceiveNotification(callback) {
    this.connection.on("ReceiveNotification", callback);
  }

  onNotificationRead(callback) {
    this.connection.on("NotificationRead", callback);
  }

  onAllNotificationsRead(callback) {
    this.connection.on("AllNotificationsRead", callback);
  }

  async stopConnection() {
    try {
      if (
        this.connection &&
        this.connection.state === HubConnectionState.Connected
      ) {
        await this.connection.stop();
        console.log("SignalR connection stopped");
      }
    } catch (err) {
      console.error("Error stopping connection:", err);
    }
  }

  // Phương thức kiểm tra trạng thái kết nối
  isConnected() {
    return (
      this.connection && this.connection.state === HubConnectionState.Connected
    );
  }
}

export const signalRService = new SignalRService();
