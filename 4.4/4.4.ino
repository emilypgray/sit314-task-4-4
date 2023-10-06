#include <SPI.h>
#include <WiFiS3.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include "RTC.h"
#include "network_credentials.h"

// sensor information
const int sensorPin = A0;
const int sensorID = 0;
const char* sensorName = "temperaturesensor";
const char* sensorAddress = "221 Burwood Hwy, Burwood VIC 3125"; 

// wifi credentials
const char ssid[] = SECRET_SSID;
const char pass[] = SECRET_PASS;    
int wifiStatus = WL_IDLE_STATUS;

WiFiClient client;
WiFiUDP Udp;
NTPClient timeClient(Udp);

// server information
const char* serverAddress = "192.168.1.102";
const int serverPort = 3000;

String formatTime(RTCTime t) {
  // format the time 
    char buffer[20];
    sprintf(buffer, "%04d-%02d-%02d %02d:%02d:%02d", t.getYear(), Month2int(t.getMonth()), t.getDayOfMonth(), t.getHour(), t.getMinutes(), t.getSeconds());
    return String(buffer);
}

void sendTemperatureData(float temperature, const String& formattedTime) {
  // ensure connection to server program and post the http data
      if (client.connect(serverAddress, serverPort)) {
        String payload = "id=" + String(sensorID) + "&name=" + sensorName + "&address=" + sensorAddress + "&temperature=" + String(temperature, 2) + "&time=" + formattedTime;
        
        client.println("POST /temperature HTTP/1.1");
        client.println("Host: " + String(serverAddress));
        client.println("Content-Type: application/x-www-form-urlencoded");
        client.print("Content-Length: ");
        client.println(payload.length());
        client.println();
        client.print(payload);
        client.stop();
    } else {
        Serial.println("Failed to connect to server");
    }
}

void connectToWifi(){
  // check for WiFi module
  if (WiFi.status() == WL_NO_MODULE) {
    Serial.println("Communication with WiFi module failed!");
    while (true);
  }
  while (wifiStatus != WL_CONNECTED) {
    Serial.print("Attempting to connect to SSID: ");
    Serial.println(ssid);
    wifiStatus = WiFi.begin(ssid, pass);
    delay(10000);
  }
  Serial.println("Connected to WiFi");
}


void setup() {
  Serial.begin(9600);
  while (!Serial) { 
  }

  connectToWifi();
  RTC.begin();
  timeClient.begin();
  timeClient.update();

  // Get the current date and time from NTP server and convert it to UTC+11 for Sydney timezone
  auto timeZoneOffsetHours = 11;
  auto unixTime = timeClient.getEpochTime() + (timeZoneOffsetHours * 3600);
  RTCTime timeToSet = RTCTime(unixTime);
  RTC.setTime(timeToSet);

  pinMode(sensorPin, OUTPUT);
}

void loop() {
  // get the time
  RTCTime currentTime;
  RTC.getTime(currentTime);

  // get the analog sensor reading and convert to temperature
  int sensorVal = analogRead(sensorPin);
  float voltage = (sensorVal/1024.0)*5.0;
  float temperature = (voltage - 0.5)*100;

  // format the current time
  String formattedTime = formatTime(currentTime);
  Serial.print(formattedTime);
  Serial.print(": ");
  Serial.println(temperature);

  // send the data to the server
  sendTemperatureData(temperature, formattedTime);

  delay(10000);
}
