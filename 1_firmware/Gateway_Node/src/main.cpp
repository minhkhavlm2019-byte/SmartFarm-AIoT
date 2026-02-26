#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h> 
#include "common.h"

// --- CẤU HÌNH NGƯỠNG TỰ ĐỘNG ---
const int SOIL_DRY_THRESHOLD = 30; // Nếu độ ẩm đất < 30% thì bơm
const int LIGHT_DARK_THRESHOLD = 40; // Nếu ánh sáng < 40% thì bật đèn

LiquidCrystal_I2C lcd(0x27, 20, 4);

// ESP-NOW Variables
uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
esp_now_peer_info_t peerInfo;
struct_message incomingData;
struct_message outgoingData;

// Trạng thái hiện tại
String stPump="OFF", stLight="OFF";

// --- GỬI LỆNH XUỐNG CONTROL NODE ---
void sendCommand(int command) {
  outgoingData.id = 3; 
  outgoingData.command = command;
  esp_err_t result = esp_now_send(broadcastAddress, (uint8_t *) &outgoingData, sizeof(outgoingData));
  
  if (result == ESP_OK) {
    Serial.printf(">> Đã gửi lệnh: %d\n", command);
  } else {
    Serial.println("!! Gửi lệnh thất bại");
  }
}

// --- CẬP NHẬT LCD ---
void updateLCD(float t, float h, int soil, int light) {
  lcd.setCursor(0, 0);
  lcd.printf("T:%.1f H:%.0f%% ", t, h); 
  lcd.setCursor(0, 1);
  lcd.printf("Dat:%d%% Sang:%d%% ", soil, light);
  
  // Dòng 3: Hiển thị trạng thái thiết bị
  lcd.setCursor(0, 3);
  lcd.printf("Bom:%s Den:%s   ", stPump.c_str(), stLight.c_str());
}

// --- XỬ LÝ DỮ LIỆU NHẬN ĐƯỢC ---
void OnDataRecv(const uint8_t * mac, const uint8_t *data, int len) {
  memcpy(&incomingData, data, sizeof(incomingData));

  // Chỉ xử lý tin từ Sensor (ID = 1)
  if (incomingData.id == 1) {
    Serial.println("\n--- NHẬN DỮ LIỆU SENSOR ---");
    Serial.printf("Nhiệt độ: %.1f, Đất: %d%%\n", incomingData.temp, incomingData.hum_soil);

    // 1. Xử lý Logic Tự Động (Automation)
    // -- Kiểm tra đất --
    if (incomingData.hum_soil < SOIL_DRY_THRESHOLD) {
      if (stPump == "OFF") { 
        sendCommand(CMD_PUMP_ON); 
        stPump = "ON"; 
        Serial.println("-> Đất khô quá: BẬT BƠM");
      }
    } else {
      if (stPump == "ON") { 
        sendCommand(CMD_PUMP_OFF); 
        stPump = "OFF"; 
        Serial.println("-> Đất ẩm rồi: TẮT BƠM");
      }
    }

    // -- Kiểm tra ánh sáng --
    if (incomingData.light < LIGHT_DARK_THRESHOLD) {
      if (stLight == "OFF") {
        sendCommand(CMD_LIGHT_ON);
        stLight = "ON";
        Serial.println("-> Trời tối: BẬT ĐÈN");
      }
    } else {
      if (stLight == "ON") {
        sendCommand(CMD_LIGHT_OFF);
        stLight = "OFF";
        Serial.println("-> Trời sáng: TẮT ĐÈN");
      }
    }

    // 2. Cập nhật màn hình sau khi xử lý xong
    updateLCD(incomingData.temp, incomingData.hum_air, incomingData.hum_soil, incomingData.light);
  }
}

void setup() {
  Serial.begin(115200);
  
  // Khởi tạo LCD
  Wire.begin(21, 22);
  lcd.init(); lcd.backlight();
  lcd.setCursor(0,0); lcd.print("Che Do LOCAL...");
  lcd.setCursor(0,1); lcd.print("Waiting Sensor...");

  // Khởi tạo WiFi Station (Bắt buộc cho ESP-NOW, nhưng ko cần connect Router)
  WiFi.mode(WIFI_STA);
  
  // Khởi tạo ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }

  // Đăng ký hàm nhận
  esp_now_register_recv_cb(OnDataRecv);

  // Đăng ký Peer (Để gửi lệnh đi)
  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;
  esp_now_add_peer(&peerInfo);
  
  Serial.println("GATEWAY LOCAL MODE STARTED!");
}

void loop() {
  // Gateway chỉ ngồi chờ nhận dữ liệu từ Sensor
  // Logic xử lý nằm hết trong OnDataRecv
  delay(100);
}