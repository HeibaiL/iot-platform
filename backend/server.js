const express = require("express");
const http = require("http");
const mqtt = require("mqtt");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const devices = {};
const logs = [];
const commands = {};

function addLog(message) {
  const log = {
    message,
    timestamp: Date.now(),
  };

  logs.unshift(log);
  io.emit("log", log);

  console.log(message);
}

const mqttClient = mqtt.connect("mqtt://mosquitto:1883");

mqttClient.on("connect", () => {
  addLog("Connected to MQTT broker");

  mqttClient.subscribe("devices/+/telemetry");
  mqttClient.subscribe("devices/+/status");
  mqttClient.subscribe("devices/+/ack");
  mqttClient.subscribe("devices/+/result");
  mqttClient.subscribe("devices/+/error");
});

mqttClient.on("message", (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const parts = topic.split("/");
    const eventType = parts[2];

    if (eventType === "telemetry" || eventType === "status") {
      devices[payload.deviceId] = {
        ...devices[payload.deviceId],
        ...payload,
        online: true,
        lastSeen: Date.now(),
      };

      io.emit("deviceUpdate", devices[payload.deviceId]);

      addLog(`Message from ${payload.deviceId} on ${topic}`);
      return;
    }

    if (eventType === "ack") {
      commands[payload.commandId] = {
        ...commands[payload.commandId],
        ...payload,
        status: "acknowledged",
      };

      io.emit("commandUpdate", commands[payload.commandId]);

      addLog(`Command ${payload.commandId} acknowledged by ${payload.deviceId}`);
      return;
    }

    if (eventType === "result") {
      commands[payload.commandId] = {
        ...commands[payload.commandId],
        ...payload,
        status: "success",
      };

      io.emit("commandUpdate", commands[payload.commandId]);

      addLog(`Command ${payload.commandId} succeeded on ${payload.deviceId}`);
      return;
    }

    if (eventType === "error") {
      commands[payload.commandId] = {
        ...commands[payload.commandId],
        ...payload,
        status: "error",
      };

      io.emit("commandUpdate", commands[payload.commandId]);

      addLog(
        `Command ${payload.commandId} failed on ${payload.deviceId}: ${payload.error}`
      );
    }
  } catch (error) {
    addLog(`Invalid MQTT message on ${topic}`);
    console.error(error);
  }
});

setInterval(() => {
  const now = Date.now();

  Object.values(devices).forEach((device) => {
    if (now - device.lastSeen > 30000 && device.online) {
      device.online = false;

      io.emit("deviceUpdate", device);
      io.emit("deviceOffline", device);

      addLog(`${device.deviceId} went offline`);
    }
  });
}, 5000);

app.get("/api/devices", (req, res) => {
  res.json(Object.values(devices));
});

app.get("/api/logs", (req, res) => {
  res.json(logs.slice(0, 100));
});

app.get("/api/commands", (req, res) => {
  res.json(Object.values(commands).slice(-50));
});

app.post("/api/devices/:deviceId/command", (req, res) => {
  const { deviceId } = req.params;
  const commandId = crypto.randomUUID();

  const command = {
    commandId,
    ...req.body,
    createdAt: Date.now(),
  };

  commands[commandId] = {
    ...command,
    deviceId,
    status: "sent",
  };

  const topic = `devices/${deviceId}/command`;

  mqttClient.publish(topic, JSON.stringify(command));

  io.emit("commandUpdate", commands[commandId]);

  addLog(`Command ${commandId} sent to ${deviceId}: ${JSON.stringify(req.body)}`);

  res.json({
    success: true,
    topic,
    command: commands[commandId],
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("Backend Gateway running on port 3001");
});
