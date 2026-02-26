#include <Arduino.h>
#include <esp_now.h>
#include <WiFi.h>
#include "common.h"

// --- ĐỊNH NGHĨA CHÂN (Phải khớp 100% với diagram.json) ---
#define LED_PUMP  18   // Bơm nước (Blue LED)
#define LED_LIGHT 19   // Đèn chiếu sáng (Yellow LED)
#define LED_MIST  21   // Phun sương (Cyan LED)

// Biến chứa dữ liệu nhận được
struct_message incomingData;

// --- HÀM XỬ LÝ KHI NHẬN ĐƯỢC DỮ LIỆU ---
void OnDataRecv(const uint8_t * mac, const uint8_t *incomingDataPtr, int len) {
  memcpy(&incomingData, incomingDataPtr, sizeof(incomingData));
  
  // Chỉ xử lý nếu có lệnh điều khiển (Command khác 0)
  if (incomingData.command != CMD_NONE) {
    Serial.printf(">> [Control] Nhan lenh: %d -> ", incomingData.command);

    switch (incomingData.command) {
      case CMD_PUMP_ON:
        digitalWrite(LED_PUMP, HIGH);
        Serial.println("BOM: ON");
        break;
      case CMD_PUMP_OFF:
        digitalWrite(LED_PUMP, LOW);
        Serial.println("BOM: OFF");
        break;
        
      case CMD_LIGHT_ON:
        digitalWrite(LED_LIGHT, HIGH);
        Serial.println("DEN: ON");
        break;
      case CMD_LIGHT_OFF:
        digitalWrite(LED_LIGHT, LOW);
        Serial.println("DEN: OFF");
        break;

      case CMD_MIST_ON:
        digitalWrite(LED_MIST, HIGH);
        Serial.println("SUONG: ON");
        break;
      case CMD_MIST_OFF:
        digitalWrite(LED_MIST, LOW);
        Serial.println("SUONG: OFF");
        break;
        
      default:
        Serial.println("Lenh khong xac dinh");
        break;
    }
  }
}

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  Serial.println("--- CONTROL NODE KHOI DONG ---");

  // 1. Cấu hình chân Output
  pinMode(LED_PUMP, OUTPUT);
  pinMode(LED_LIGHT, OUTPUT);
  pinMode(LED_MIST, OUTPUT);

  // Đặt trạng thái ban đầu là TẮT
  digitalWrite(LED_PUMP, LOW);
  digitalWrite(LED_LIGHT, LOW);
  digitalWrite(LED_MIST, LOW);

  // 2. Khởi tạo WiFi Station (Bắt buộc cho ESP-NOW)
  WiFi.mode(WIFI_STA);

  // 3. Khởi tạo ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Lỗi khởi tạo ESP-NOW");
    return;
  }

  // 4. Đăng ký hàm nhận dữ liệu
  esp_now_register_recv_cb(OnDataRecv);
  
  Serial.println("Control Node da san sang nhan lenh!");
}

// --- LOOP ---
void loop() {
  // Control Node hoạt động hoàn toàn dựa trên ngắt (Callback)
  // nên Loop để trống hoặc delay nhẹ.
  delay(100);
}