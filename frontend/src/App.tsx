import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

type Device = {
  deviceId: string;
  type: string;
  value?: string;
  unit?: string;
  state?: string;
  timestamp: number;
  online: boolean;
  lastSeen: number;
};

type Log = {
  message: string;
  timestamp: number;
};

const API_URL = "http://192.168.1.64:3001";
const socket = io(API_URL);

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    fetch(`${API_URL}/api/devices`)
      .then((res) => res.json())
      .then(setDevices);

    fetch(`${API_URL}/api/logs`)
      .then((res) => res.json())
      .then(setLogs);

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("deviceUpdate", (device: Device) => {
      setDevices((prev) => {
        const exists = prev.some((d) => d.deviceId === device.deviceId);

        if (!exists) {
          return [device, ...prev];
        }

        return prev.map((d) =>
          d.deviceId === device.deviceId ? device : d
        );
      });
    });

    socket.on("deviceOffline", (device: Device) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === device.deviceId ? device : d
        )
      );
    });

    socket.on("log", (log: Log) => {
      setLogs((prev) => [log, ...prev].slice(0, 50));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("deviceUpdate");
      socket.off("deviceOffline");
      socket.off("log");
    };
  }, []);

  async function sendCommand(deviceId: string, value: "on" | "off") {
    await fetch(`${API_URL}/api/devices/${deviceId}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "setState",
        value,
      }),
    });
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>IoT Control Center</h1>
          <p>Linux + MQTT + Backend Gateway + React realtime dashboard</p>
        </div>

        <span className={isConnected ? "badge live" : "badge disconnected"}>
          {isConnected ? "LIVE" : "DISCONNECTED"}
        </span>
      </header>

      <section className="summary">
        <div>
          <span>Total devices</span>
          <strong>{devices.length}</strong>
        </div>

        <div>
          <span>Online</span>
          <strong>{devices.filter((d) => d.online).length}</strong>
        </div>

        <div>
          <span>Offline</span>
          <strong>{devices.filter((d) => !d.online).length}</strong>
        </div>
      </section>

      <section className="grid">
        {devices.map((device) => (
          <div className="card" key={device.deviceId}>
            <div className="cardHeader">
              <div>
                <h2>{device.deviceId}</h2>
                <p>{device.type}</p>
              </div>

              <span className={device.online ? "online" : "offline"}>
                {device.online ? "ONLINE" : "OFFLINE"}
              </span>
            </div>

            {device.type === "temperature" && (
              <div className="value">
                {device.value}
                <span>{device.unit}</span>
              </div>
            )}

            {device.type === "light" && (
              <>
                <div className="value">
                  {device.state?.toUpperCase()}
                </div>

                <div className="actions">
                  <button
                    onClick={() => sendCommand(device.deviceId, "on")}
                    disabled={!device.online}
                  >
                    Turn ON
                  </button>

                  <button
                    onClick={() => sendCommand(device.deviceId, "off")}
                    disabled={!device.online}
                  >
                    Turn OFF
                  </button>
                </div>
              </>
            )}

            <p className="small">
              Last seen:{" "}
              {device.lastSeen
                ? new Date(device.lastSeen).toLocaleTimeString()
                : "unknown"}
            </p>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Logs</h2>

        {logs.length === 0 && <p className="empty">No logs yet</p>}

        {logs.map((log, index) => (
          <div className="log" key={index}>
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
            {log.message}
          </div>
        ))}
      </section>
    </main>
  );
}

export default App;