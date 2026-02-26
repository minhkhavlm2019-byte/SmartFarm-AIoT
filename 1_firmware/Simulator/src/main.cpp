#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>


// --- 1. CẤU HÌNH TỪ .ENV & CONFIG.PY ---
const char* ssid          = "Wokwi-GUEST";
const char* password      = "";
const char* mqtt_broker   = "broker.hivemq.com"; 
const int   mqtt_port     = 1883;                 

// TOPICS ĐỒNG BỘ VỚI BACKEND
const char* TOPIC_SENSOR  = "k19/doan_tot_nghiep/project_xalach/sensor";  
const char* TOPIC_CONTROL = "k19/doan_tot_nghiep/project_xalach/control"; 

// --- 2. CẤU HÌNH CHÂN (PHẦN CỨNG) ---
#define DHTPIN      4   // Dùng chân 4 để tránh lỗi Boot
#define DHTTYPE     DHT22
#define PIN_SOIL    34
#define PIN_LDR     35
#define PIN_PUMP    18
#define PIN_LIGHT   19
#define PIN_MIST    5

// --- 3. ĐỐI TƯỢNG & BIẾN TOÀN CỤC ---
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 20, 4);
WiFiClient espClient;
PubSubClient client(espClient);

// Cấu trúc dữ liệu dùng chung giữa các Task
struct SharedData {
  float temp;
  float hum_air;
  int hum_soil;
  int light;
  bool st_pump;
  bool st_light;
  bool st_mist;
} farmData;

SemaphoreHandle_t xMutex;

// --- 4. HÀM XỬ LÝ LỆNH MQTT (CALLBACK) ---
void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) return;

  // Khớp với Mapping của Backend: {"device": "PUMP", "status": "ON"}
  const char* device = doc["device"];
  const char* status = doc["status"];

  if (device && status) {
    bool state = (strcmp(status, "ON") == 0);
    
    if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
      if (strcmp(device, "PUMP") == 0) {
        farmData.st_pump = state;
        digitalWrite(PIN_PUMP, state ? HIGH : LOW);
      } 
      else if (strcmp(device, "LIGHT") == 0) {
        farmData.st_light = state;
        digitalWrite(PIN_LIGHT, state ? HIGH : LOW);
      }
      else if (strcmp(device, "MIST") == 0) {
        farmData.st_mist = state;
        digitalWrite(PIN_MIST, state ? HIGH : LOW);
      }
      xSemaphoreGive(xMutex);
      Serial.printf(">> [MQTT] Device %s -> %s\n", device, status);
    }
  }
}

// --- 5. TASK SENSOR: ĐỌC DỮ LIỆU & CẬP NHẬT LCD (Core 1) ---
void taskSensor(void *pvParameters) {
  for (;;) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    int s = map(analogRead(PIN_SOIL), 0, 4095, 0, 100);
    int l = map(analogRead(PIN_LDR), 0, 4095, 0, 100);

    if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
      farmData.temp = t;
      farmData.hum_air = h;
      farmData.hum_soil = s;
      farmData.light = l;
      
      // Hiển thị LCD
      lcd.setCursor(0, 0); lcd.printf("T:%.1f H:%.0f%% ", t, h);
      lcd.setCursor(0, 1); lcd.printf("Dat:%d%% Sng:%d%% ", s, l);
      lcd.setCursor(0, 3);
      lcd.printf("P:%s L:%s M:%s", 
        farmData.st_pump ? "ON " : "OFF", 
        farmData.st_light ? "ON " : "OFF", 
        farmData.st_mist ? "ON " : "OFF");
        
      xSemaphoreGive(xMutex);
    }
    vTaskDelay(pdMS_TO_TICKS(2000));
  }
}

// --- 6. TASK MQTT: KẾT NỐI & GỬI DỮ LIỆU (Core 0) ---
void taskMQTT(void *pvParameters) {
  for (;;) {
    if (!client.connected()) {
      Serial.print("Connecting to MQTT...");
      if (client.connect("ESP32_SmartFarm_K19")) {
        Serial.println("connected");
        client.subscribe(TOPIC_CONTROL); // Lắng nghe lệnh điều khiển
      } else {
        vTaskDelay(pdMS_TO_TICKS(5000));
        continue;
      }
    }
    client.loop();

    // Đóng gói JSON gửi lên: Khớp với logic backend
    StaticJsonDocument<512> outDoc;
    if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
      outDoc["device_id"] = "ESP32_WOKWI_01"; // Khớp với ID trong DB
      outDoc["temp"]      = farmData.temp;
      outDoc["hum_air"]   = farmData.hum_air; // Tên trường khớp API GET latest
      outDoc["hum_soil"]  = farmData.hum_soil;
      outDoc["light"]     = farmData.light;
      
      // 👇 [THÊM MỚI]: BÁO CÁO TRẠNG THÁI RƠ-LE ĐỂ BACKEND LÀM DIGITAL TWIN 👇
      outDoc["pump_state"]  = farmData.st_pump;
      outDoc["light_state"] = farmData.st_light;
      outDoc["mist_state"]  = farmData.st_mist;
      // ----------------------------------------------------------------------
      
      xSemaphoreGive(xMutex);
    }

    char buffer[512];
    serializeJson(outDoc, buffer);
    client.publish(TOPIC_SENSOR, buffer); 

    vTaskDelay(pdMS_TO_TICKS(5000)); // Gửi lên Server mỗi 5 giây
  }
}

// --- 7. TASK FAILSAFE: SINH TỒN KHI MẤT KẾT NỐI (Chạy ngầm liên tục) ---
void taskFailsafe(void *pvParameters) {
  int offlineCounter = 0; 
  const int OFFLINE_THRESHOLD = 60; // Ngưỡng chịu đựng: 60 giây mất mạng

  for (;;) {
    // 1. Kiểm tra xem mạch có đang bị rớt mạng hoặc rớt MQTT không
    if (WiFi.status() != WL_CONNECTED || !client.connected()) {
      offlineCounter++; // Đếm số giây bị mất mạng
    } else {
      offlineCounter = 0; // Nếu có mạng lại thì reset bộ đếm
    }

    // 2. Kích hoạt chế độ sinh tồn nếu mất mạng quá lâu
    if (offlineCounter > OFFLINE_THRESHOLD) {
      int current_soil = 0;

      // Lấy thông số độ ẩm đất mới nhất một cách an toàn
      if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
        current_soil = farmData.hum_soil;
        xSemaphoreGive(xMutex);
      }

      // 3. LOGIC CỨU CÂY: Nếu đất khô rát (dưới 35%) -> Tự động bật bơm
      if (current_soil < 35) {
        Serial.printf("🚨 [FAILSAFE] Đứt cáp! Đất quá khô (%d%%). TỰ ĐỘNG BẬT BƠM 30 GIÂY!\n", current_soil);
        
        // Bật máy bơm
        digitalWrite(PIN_PUMP, HIGH);
        if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
          farmData.st_pump = true; // Cập nhật trạng thái cho LCD hiển thị
          xSemaphoreGive(xMutex);
        }

        // Cho bơm chạy đúng 30 giây (để nước ngấm từ từ, tránh ngập úng)
        vTaskDelay(pdMS_TO_TICKS(30000)); 

        // Tắt máy bơm an toàn sau 30s
        Serial.println("🚨 [FAILSAFE] Đã tưới xong, tạm tắt bơm để chờ nước ngấm.");
        digitalWrite(PIN_PUMP, LOW);
        if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
          farmData.st_pump = false;
          xSemaphoreGive(xMutex);
        }
        
        // Nghỉ 5 phút (300 giây) trước khi kiểm tra lại độ ẩm để tránh tưới liên tục
        vTaskDelay(pdMS_TO_TICKS(300000)); 
      }
    }

    // Task này ngủ 1 giây rồi lặp lại kiểm tra mạng
    vTaskDelay(pdMS_TO_TICKS(1000)); 
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_PUMP, OUTPUT);
  pinMode(PIN_LIGHT, OUTPUT);
  pinMode(PIN_MIST, OUTPUT);
  
  dht.begin();
  lcd.init();
  lcd.backlight();

  // Kết nối WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");

  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);

  xMutex = xSemaphoreCreateMutex();

  // Tạo các Task chạy song song trên 2 nhân (Core)
  xTaskCreatePinnedToCore(taskSensor, "SensorTask", 4096, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(taskMQTT, "MQTTTask", 8192, NULL, 2, NULL, 0);
  xTaskCreatePinnedToCore(taskFailsafe, "FailsafeTask", 4096, NULL, 1, NULL, 1);
  
  Serial.println("--- SYSTEM READY ---");
}

void loop() {
  // FreeRTOS quản lý, loop để trống
  vTaskDelete(NULL);
}
// #include <Arduino.h>
// #include <WiFi.h>
// #include <PubSubClient.h>
// #include <ArduinoJson.h>
// #include <Wire.h>
// #include <LiquidCrystal_I2C.h>
// #include <DHT.h>


// // --- 1. CẤU HÌNH TỪ .ENV & CONFIG.PY ---
// const char* ssid          = "Wokwi-GUEST";
// const char* password      = "";
// const char* mqtt_broker   = "broker.hivemq.com"; // 
// const int   mqtt_port     = 1883;                 // 

// // TOPICS ĐỒNG BỘ VỚI BACKEND
// const char* TOPIC_SENSOR  = "k19/doan_tot_nghiep/project_xalach/sensor";  // 
// const char* TOPIC_CONTROL = "k19/doan_tot_nghiep/project_xalach/control"; // 

// // --- 2. CẤU HÌNH CHÂN (PHẦN CỨNG) ---
// #define DHTPIN      4   // Dùng chân 4 để tránh lỗi Boot
// #define DHTTYPE     DHT22
// #define PIN_SOIL    34
// #define PIN_LDR     35
// #define PIN_PUMP    18
// #define PIN_LIGHT   19
// #define PIN_MIST    5

// // --- 3. ĐỐI TƯỢNG & BIẾN TOÀN CỤC ---
// DHT dht(DHTPIN, DHTTYPE);
// LiquidCrystal_I2C lcd(0x27, 20, 4);
// WiFiClient espClient;
// PubSubClient client(espClient);

// // Cấu trúc dữ liệu dùng chung giữa các Task
// struct SharedData {
//   float temp;
//   float hum_air;
//   int hum_soil;
//   int light;
//   bool st_pump;
//   bool st_light;
//   bool st_mist;
// } farmData;

// SemaphoreHandle_t xMutex;

// // --- 4. HÀM XỬ LÝ LỆNH MQTT (CALLBACK) ---
// void callback(char* topic, byte* payload, unsigned int length) {
//   StaticJsonDocument<256> doc;
//   DeserializationError error = deserializeJson(doc, payload, length);

//   if (error) return;

//   // Khớp với Mapping của Backend: {"device": "PUMP", "status": "ON"}
//   const char* device = doc["device"];
//   const char* status = doc["status"];

//   if (device && status) {
//     bool state = (strcmp(status, "ON") == 0);
    
//     if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
//       if (strcmp(device, "PUMP") == 0) {
//         farmData.st_pump = state;
//         digitalWrite(PIN_PUMP, state ? HIGH : LOW);
//       } 
//       else if (strcmp(device, "LIGHT") == 0) {
//         farmData.st_light = state;
//         digitalWrite(PIN_LIGHT, state ? HIGH : LOW);
//       }
//       else if (strcmp(device, "MIST") == 0) {
//         farmData.st_mist = state;
//         digitalWrite(PIN_MIST, state ? HIGH : LOW);
//       }
//       xSemaphoreGive(xMutex);
//       Serial.printf(">> [MQTT] Device %s -> %s\n", device, status);
//     }
//   }
// }

// // --- 5. TASK SENSOR: ĐỌC DỮ LIỆU & CẬP NHẬT LCD (Core 1) ---
// void taskSensor(void *pvParameters) {
//   for (;;) {
//     float t = dht.readTemperature();
//     float h = dht.readHumidity();
//     int s = map(analogRead(PIN_SOIL), 0, 4095, 0, 100);
//     int l = map(analogRead(PIN_LDR), 0, 4095, 0, 100);

//     if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
//       farmData.temp = t;
//       farmData.hum_air = h;
//       farmData.hum_soil = s;
//       farmData.light = l;
      
//       // Hiển thị LCD
//       lcd.setCursor(0, 0); lcd.printf("T:%.1f H:%.0f%% ", t, h);
//       lcd.setCursor(0, 1); lcd.printf("Dat:%d%% Sng:%d%% ", s, l);
//       lcd.setCursor(0, 3);
//       lcd.printf("P:%s L:%s M:%s", 
//         farmData.st_pump ? "ON " : "OFF", 
//         farmData.st_light ? "ON " : "OFF", 
//         farmData.st_mist ? "ON " : "OFF");
        
//       xSemaphoreGive(xMutex);
//     }
//     vTaskDelay(pdMS_TO_TICKS(2000));
//   }
// }

// // --- 6. TASK MQTT: KẾT NỐI & GỬI DỮ LIỆU (Core 0) ---
// void taskMQTT(void *pvParameters) {
//   for (;;) {
//     if (!client.connected()) {
//       Serial.print("Connecting to MQTT...");
//       if (client.connect("ESP32_SmartFarm_K19")) {
//         Serial.println("connected");
//         client.subscribe(TOPIC_CONTROL); // 
//       } else {
//         vTaskDelay(pdMS_TO_TICKS(5000));
//         continue;
//       }
//     }
//     client.loop();

//     // Đóng gói JSON gửi lên: Khớp với logic backend
//     StaticJsonDocument<512> outDoc;
//     if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
//       outDoc["device_id"] = "ESP32_WOKWI_01"; // Khớp với ID trong DB
//       outDoc["temp"]      = farmData.temp;
//       outDoc["hum_air"]   = farmData.hum_air; // Tên trường khớp API GET latest
//       outDoc["hum_soil"]  = farmData.hum_soil;
//       outDoc["light"]     = farmData.light;
//       xSemaphoreGive(xMutex);
//     }

//     char buffer[512];
//     serializeJson(outDoc, buffer);
//     client.publish(TOPIC_SENSOR, buffer); // 

//     vTaskDelay(pdMS_TO_TICKS(5000)); // Gửi lên Server mỗi 5 giây
//   }
// }
// // --- 7. TASK FAILSAFE: SINH TỒN KHI MẤT KẾT NỐI (Chạy ngầm liên tục) ---
// void taskFailsafe(void *pvParameters) {
//   int offlineCounter = 0; 
//   const int OFFLINE_THRESHOLD = 60; // Ngưỡng chịu đựng: 60 giây mất mạng

//   for (;;) {
//     // 1. Kiểm tra xem mạch có đang bị rớt mạng hoặc rớt MQTT không
//     if (WiFi.status() != WL_CONNECTED || !client.connected()) {
//       offlineCounter++; // Đếm số giây bị mất mạng
//     } else {
//       offlineCounter = 0; // Nếu có mạng lại thì reset bộ đếm
//     }

//     // 2. Kích hoạt chế độ sinh tồn nếu mất mạng quá lâu
//     if (offlineCounter > OFFLINE_THRESHOLD) {
//       int current_soil = 0;

//       // Lấy thông số độ ẩm đất mới nhất một cách an toàn
//       if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
//         current_soil = farmData.hum_soil;
//         xSemaphoreGive(xMutex);
//       }

//       // 3. LOGIC CỨU CÂY: Nếu đất khô rát (dưới 35%) -> Tự động bật bơm
//       if (current_soil < 35) {
//         Serial.printf("🚨 [FAILSAFE] Đứt cáp! Đất quá khô (%d%%). TỰ ĐỘNG BẬT BƠM 30 GIÂY!\n", current_soil);
        
//         // Bật máy bơm
//         digitalWrite(PIN_PUMP, HIGH);
//         if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
//           farmData.st_pump = true; // Cập nhật trạng thái cho LCD hiển thị
//           xSemaphoreGive(xMutex);
//         }

//         // Cho bơm chạy đúng 30 giây (để nước ngấm từ từ, tránh ngập úng)
//         vTaskDelay(pdMS_TO_TICKS(30000)); 

//         // Tắt máy bơm an toàn sau 30s
//         Serial.println("🚨 [FAILSAFE] Đã tưới xong, tạm tắt bơm để chờ nước ngấm.");
//         digitalWrite(PIN_PUMP, LOW);
//         if (xSemaphoreTake(xMutex, portMAX_DELAY)) {
//           farmData.st_pump = false;
//           xSemaphoreGive(xMutex);
//         }
        
//         // Nghỉ 5 phút (300 giây) trước khi kiểm tra lại độ ẩm để tránh tưới liên tục
//         vTaskDelay(pdMS_TO_TICKS(300000)); 
//       }
//     }

//     // Task này ngủ 1 giây rồi lặp lại kiểm tra mạng
//     vTaskDelay(pdMS_TO_TICKS(1000)); 
//   }
// }

// void setup() {
//   Serial.begin(115200);
  
//   pinMode(PIN_PUMP, OUTPUT);
//   pinMode(PIN_LIGHT, OUTPUT);
//   pinMode(PIN_MIST, OUTPUT);
  
//   dht.begin();
//   lcd.init();
//   lcd.backlight();

//   // Kết nối WiFi
//   WiFi.begin(ssid, password);
//   while (WiFi.status() != WL_CONNECTED) {
//     delay(500);
//     Serial.print(".");
//   }
//   Serial.println("\nWiFi Connected");

//   client.setServer(mqtt_broker, mqtt_port);
//   client.setCallback(callback);

//   xMutex = xSemaphoreCreateMutex();

//   // Tạo các Task chạy song song trên 2 nhân (Core)
//   xTaskCreatePinnedToCore(taskSensor, "SensorTask", 4096, NULL, 1, NULL, 1);
//   xTaskCreatePinnedToCore(taskMQTT, "MQTTTask", 8192, NULL, 2, NULL, 0);
//   xTaskCreatePinnedToCore(taskFailsafe, "FailsafeTask", 4096, NULL, 1, NULL, 1);
  
//   Serial.println("--- SYSTEM READY ---");
// }

// void loop() {
//   // FreeRTOS quản lý, loop để trống
//   vTaskDelete(NULL);
// }