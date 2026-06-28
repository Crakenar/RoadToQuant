/**
* 32 bc 0C => 32F
 * @param tempValue
 * @return float
 */
float celsiusToFahrenheit(const float tempValue)
{
    return tempValue * 9.0f / 5.0f + 32.0f;
}

float celsiusToKelvin(const float tempValue)
{
    return tempValue + 273.25f;
}

// Fahrenheit → Kelvin → Celsius
float fahrenheitToKelvin(float f) {
    return (f - 32.0f) * 5.0f / 9.0f + 273.15f;
}

float kelvinToCelsius(float k) {
    return k - 273.15f;
}

// Kelvin → Fahrenheit → Celsius
float kelvinToFahrenheit(float k) {
    return (k - 273.15f) * 9.0f / 5.0f + 32.0f;
}

float fahrenheitToCelsius(float f) {
    return (f - 32.0f) * 5.0f / 9.0f;
}
