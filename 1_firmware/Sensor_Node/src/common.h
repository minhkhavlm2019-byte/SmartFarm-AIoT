#ifndef COMMON_H
#define COMMON_H

typedef struct struct_message {
  int id;          // 1=Sensor, 2=Control, 3=Gateway
  float temp;      // Nhiệt độ
  float hum_air;   // Độ ẩm không khí
  int hum_soil;    // Độ ẩm đất
  int light;       // Ánh sáng
  int command;     // Lệnh điều khiển
} struct_message;

// Định nghĩa lệnh
#define CMD_NONE      0
#define CMD_PUMP_ON   1
#define CMD_PUMP_OFF  2
#define CMD_MIST_ON   3
#define CMD_MIST_OFF  4
#define CMD_LIGHT_ON  5
#define CMD_LIGHT_OFF 6

#endif