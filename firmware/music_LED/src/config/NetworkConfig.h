#pragma once

#if __has_include("Secrets.h")
#include "Secrets.h"
constexpr bool kNetworkConfigured = true;
#else
constexpr bool kNetworkConfigured = false;
#endif
