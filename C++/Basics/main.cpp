#include <iostream>
#include "calculus.cpp"

float function(float tempValue)
{
    return 0.0f;
}

void displayProgramIntro()
{
    std::cout << "Welcome to the first basic program, TemperatureConverter" <<
        std::endl;
    std::cout << "Enter what kind of conversion you want :" << std::endl;
    std::cout << "1 - From Celsius" << std::endl;
    std::cout << "2 - From Fahrenheit" << std::endl;
    std::cout << "3 - From Kelvin" << std::endl;
}

void DisplayValues(float callbackCelsius, float callbackF, float callbackK)
{
    std::cout << callbackCelsius << "C = " << callbackF << "F = " <<
        callbackK << "K" << std::endl;
}

enum ConvertType: int
{
    Celsius = 1,
    Fahrenheit = 2,
    Kelvin = 3
};

int main()
{
    //Because input is defined as string, the default initializer should put input as ''
    std::string inputType, inputTemp = {};
    float tempValue = {};

    displayProgramIntro();

    //Careful, std::cin allow string and unwanted values
    std::cin >> inputType;
    std::cout << "What is the temp you want to convert ?" << std::endl;
    std::cin >> inputTemp;

    try
    {
        tempValue = std::stof(inputTemp);
    }
    catch (const std::invalid_argument& e)
    {
        std::cout << "Not a valid number: " << e.what() << std::endl;
    }
    catch (const std::out_of_range& e)
    {
        std::cout << "Number out of range: " << e.what() << std::endl;
    }


    switch (std::stoi(inputType))
    {
    case Fahrenheit:
        std::cout << "Fahrenheit" << std::endl;
        DisplayValues(
            fahrenheitToCelsius(tempValue),
            tempValue,
            fahrenheitToKelvin(tempValue)
        );
        break;
    case Kelvin:
        std::cout << "Kelvin" << std::endl;
        DisplayValues(
            kelvinToCelsius(tempValue),
            kelvinToFahrenheit(tempValue),
            tempValue
        );
        break;
    case Celsius:
        std::cout << "Celsius" << std::endl;
        DisplayValues(
            tempValue,
            celsiusToFahrenheit(tempValue),
            celsiusToKelvin(tempValue)
        );
        break;
    default:
        throw std::invalid_argument(
            "Invalid input, should be of type ConvertType");
    }
    return 1;
}


// **🌡️ Project: Temperature Converter** Build a program that converts temperatures between Celsius, Fahrenheit, and Kelvin.
// **What to build:**
// - Declare named variables for each scale
// - Use arithmetic expressions to convert between all three - Format output neatly (e.g. "25.0°C = 77.0°F = 298.15K")
// - Add comments explaining the formulas
// - Explore what happens with uninitialized variables (undefined behavior!)
