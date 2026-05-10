const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://mosquitto:1883");

client.on("connect", () => {
  console.log("Connected to MQTT broker");

  setInterval(() => {
    const payload = {
      deviceId: "temp-1",
      type: "temperature",
      value: (20 + Math.random() * 10).toFixed(2),
      unit: "C",
      timestamp: Date.now(),
    };

    client.publish(
      "devices/temp-1/telemetry",
      JSON.stringify(payload)
    );

    console.log("Telemetry sent:", payload);
  }, 2000);
});
