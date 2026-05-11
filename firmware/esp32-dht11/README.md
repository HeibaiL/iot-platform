# ESP32 DHT11 Firmware

ESP32 firmware for publishing DHT11 temperature and humidity telemetry to the IoT Lab MQTT infrastructure.

## Hardware

- ESP32 Dev Module
- DHT11 sensor
- Breadboard
- Dupont wires

## Wiring

| DHT11 | ESP32 |
|---|---|
| S | GPIO4 |
| + | 3V3 |
| - | GND |

## Arduino Libraries

Install these libraries in Arduino IDE:

- DHT sensor library by Adafruit
- Adafruit Unified Sensor
- PubSubClient by Nick O'Leary

## Board Configuration

Arduino IDE:

- Board: `ESP32 Dev Module`
- Baud rate: `115200`

## MQTT Configuration

Broker:

```text
192.168.1.64:1883
