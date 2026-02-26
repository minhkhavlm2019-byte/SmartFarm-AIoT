#include <Arduino.h>
#include <esp_now.h>
#include <WiFi.h>
#include <DHT.h>
#include "common.h"

#define DHTPIN 4       // <-- DÙNG CHÂN 4 ĐỂ TRÁNH LỖI BOOT
#define DHTTYPE DHT22
#define SOIL_PIN 34
#define LDR_PIN 35

DHT dht(DHTPIN, DHTTYPE);
uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
struct_message myData;
esp_now_peer_info_t peerInfo;

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);

  WiFi.mode(WIFI_STA);
  if (esp_now_init() == ESP_OK) {
    memcpy(peerInfo.peer_addr, broadcastAddress, 6);
    peerInfo.channel = 0; peerInfo.encrypt = false;
    esp_now_add_peer(&peerInfo);
    Serial.println("Sensor Ready (GPIO 4)!");
  }
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  int soil = map(analogRead(SOIL_PIN), 0, 4095, 0, 100);
  int light = map(analogRead(LDR_PIN), 0, 4095, 0, 100);

  // In ra để debug
  Serial.printf("[Sensor] T:%.1f H:%.1f Soil:%d Light:%d\n", t, h, soil, light);

  if (!isnan(t) && !isnan(h)) {
    myData.id = 1;
    myData.temp = t;
    myData.hum_air = h;
    myData.hum_soil = soil;
    myData.light = light;
    esp_now_send(broadcastAddress, (uint8_t *) &myData, sizeof(myData));
  }
  delay(2000);
}