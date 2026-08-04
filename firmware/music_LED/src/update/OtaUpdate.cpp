#include "OtaUpdate.h"

#include <Arduino.h>
#include <ArduinoOTA.h>
#include <WiFi.h>

#include "../config/NetworkConfig.h"

namespace {
bool otaStarted = false;

void startOta() {
  ArduinoOTA.setHostname("music-led");
#if __has_include("../config/Secrets.h")
  ArduinoOTA.setPassword(MUSIC_LED_BRIDGE_KEY);
#endif
  ArduinoOTA.onStart([]() { Serial.println("OTA update started"); });
  ArduinoOTA.onEnd([]() { Serial.println("OTA update complete"); });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.print("OTA error: ");
    Serial.println(static_cast<unsigned int>(error));
  });
  ArduinoOTA.begin();
  otaStarted = true;
  Serial.println("OTA ready at music-led.local");
}
}  // namespace

void handleOtaUpdates() {
  if (!otaStarted && kNetworkConfigured && WiFi.status() == WL_CONNECTED) startOta();
  if (otaStarted) ArduinoOTA.handle();
}
