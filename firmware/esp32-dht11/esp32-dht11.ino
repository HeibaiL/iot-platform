#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

#define DHT_PIN 4
#define DHT_TYPE DHT11

const char* WIFI_SSID = "WIFI_NAME";
const char* WIFI_PASSWORD = "WIFI_PASS";

const char* MQTT_HOST = "192.168.1.64";
const int MQTT_PORT = 1883;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
DHT dht(DHT_PIN, DHT_TYPE);

void connectToWifi() {
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected!");
}

void connectToMqtt() {
  while (!mqttClient.connected()) {
    Serial.println("Connecting to MQTT...");

    if (mqttClient.connect("esp32-dht-1")) {
      Serial.println("MQTT connected!");
    } else {
      Serial.print("MQTT failed: ");
      Serial.println(mqttClient.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  dht.begin();

  connectToWifi();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
}

void loop() {
  if (!mqttClient.connected()) {
    connectToMqtt();
  }

  mqttClient.loop();

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    delay(5000);
    return;
  }

  String payload = "{";
  payload += "\"deviceId\":\"esp32-dht-1\",";
  payload += "\"type\":\"temperature\",";
  payload += "\"value\":\"";
  payload += temperature;
  payload += "\",";
  payload += "\"humidity\":\"";
  payload += humidity;
  payload += "\",";
  payload += "\"unit\":\"C\"";
  payload += "}";

  mqttClient.publish("devices/esp32-dht-1/telemetry", payload.c_str());

  Serial.println("Telemetry sent:");
  Serial.println(payload);

  delay(5000);
}
