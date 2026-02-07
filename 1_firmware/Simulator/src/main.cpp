#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// --- CẤU HÌNH PHẦN CỨNG ---
#define DHTPIN 25
#define DHTTYPE DHT22
#define LDR_PIN 33      // Cảm biến ánh sáng
#define SOIL_PIN 32     // Biến trở giả lập độ ẩm đất
#define LED_PUMP 18     // Vàng
#define LED_MIST 5      // Xanh
#define LED_LIGHT 17    // Tím

// --- CẤU HÌNH WIFI & MQTT ---
const char* ssid = "Wokwi-GUEST";
const char* password = "";
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 8883;

// Topic gửi dữ liệu và Topic nhận lệnh điều khiển
const char* topic_sensor = "k19/doan_tot_nghiep/project_xalach/sensor";
const char* topic_control = "k19/smartfarm/control"; // Backend gửi lệnh vào đây

WiFiClientSecure espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);
unsigned long lastMsg = 0;

// --- HÀM XỬ LÝ KHI NHẬN LỆNH TỪ SERVER ---
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Nhận lệnh từ topic [");
  Serial.print(topic);
  Serial.print("]: ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Giải mã JSON lệnh (Ví dụ: {"device": "PUMP", "status": "ON"})
  StaticJsonDocument<200> doc;
  deserializeJson(doc, message);
  
  const char* device = doc["device"];
  const char* status = doc["status"];

  // Điều khiển LED
  if (strcmp(device, "PUMP") == 0) {
    digitalWrite(LED_PUMP, strcmp(status, "ON") == 0 ? HIGH : LOW);
  } else if (strcmp(device, "MIST") == 0) {
    digitalWrite(LED_MIST, strcmp(status, "ON") == 0 ? HIGH : LOW);
  } else if (strcmp(device, "LIGHT") == 0) {
    digitalWrite(LED_LIGHT, strcmp(status, "ON") == 0 ? HIGH : LOW);
  }
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32-Wokwi-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      // Đăng ký nhận lệnh
      client.subscribe(topic_control);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  // Cấu hình chân
  pinMode(LED_PUMP, OUTPUT);
  pinMode(LED_MIST, OUTPUT);
  pinMode(LED_LIGHT, OUTPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(SOIL_PIN, INPUT);
  
  dht.begin();
  setup_wifi();
  
  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback); // Đăng ký hàm callback nhận lệnh
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 5000) { // Gửi mỗi 5 giây
    lastMsg = now;

    // --- ĐỌC CẢM BIẾN THẬT TỪ WOKWI ---
    float temp = dht.readTemperature();
    float hum_air = dht.readHumidity();
    
    // Đọc Analog (0-4095) -> Map về % (0-100)
    int soil_val = analogRead(SOIL_PIN); 
    int hum_soil = map(soil_val, 0, 4095, 0, 100); 

    int ldr_val = analogRead(LDR_PIN);
    int light = map(ldr_val, 0, 4095, 0, 100); // 0: Tối, 100: Sáng

    // Kiểm tra lỗi DHT
    if (isnan(temp) || isnan(hum_air)) {
      Serial.println("Lỗi đọc DHT22!");
      return;
    }

    // --- ĐÓNG GÓI JSON ---
    StaticJsonDocument<300> doc;
    doc["temp"] = temp;
    doc["hum_air"] = hum_air;
    doc["hum_soil"] = hum_soil;
    doc["light"] = light; // Gửi thêm ánh sáng
    doc["ts"] = now / 1000;
    doc["device_id"] = "ESP32_WOKWI_01";

    char jsonBuffer[300];
    serializeJson(doc, jsonBuffer);

    Serial.print("Sending: ");
    Serial.println(jsonBuffer);
    client.publish(topic_sensor, jsonBuffer);
  }
}