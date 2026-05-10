const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://mosquitto:1883", {
  clientId: "light-1",
});

let state = "off";
let commandCounter = 0;

client.on("connect", () => {
  console.log("light-1 connected to MQTT broker");

  client.subscribe("devices/light-1/command");

  publishStatus();

  setInterval(() => {
    publishStatus();
  }, 5000);
});

client.on("message", (topic, message) => {
  const command = JSON.parse(message.toString());

  commandCounter += 1;

  console.log("Command received:", command);

  publishAck(command);

  setTimeout(() => {
    const shouldFail = commandCounter % 5 === 0;

    if (shouldFail) {
      publishError(command, "simulated_relay_failure");
      return;
    }

    if (command.action === "setState") {
      state = command.value === "on" ? "on" : "off";

      publishResult(command, "success");
      publishStatus();
    } else {
      publishError(command, "unknown_command");
    }
  }, 800);
});

function publishAck(command) {
  const payload = {
    deviceId: "light-1",
    commandId: command.commandId,
    received: true,
    timestamp: Date.now(),
  };

  client.publish("devices/light-1/ack", JSON.stringify(payload));

  console.log("ACK sent:", payload);
}

function publishResult(command, result) {
  const payload = {
    deviceId: "light-1",
    commandId: command.commandId,
    result,
    state,
    timestamp: Date.now(),
  };

  client.publish("devices/light-1/result", JSON.stringify(payload));

  console.log("Result sent:", payload);
}

function publishError(command, error) {
  const payload = {
    deviceId: "light-1",
    commandId: command.commandId,
    result: "error",
    error,
    state,
    timestamp: Date.now(),
  };

  client.publish("devices/light-1/error", JSON.stringify(payload));

  console.log("Error sent:", payload);
}

function publishStatus() {
  const payload = {
    deviceId: "light-1",
    type: "light",
    state,
    timestamp: Date.now(),
  };

  client.publish("devices/light-1/status", JSON.stringify(payload));

  console.log("Status sent:", payload);
}
