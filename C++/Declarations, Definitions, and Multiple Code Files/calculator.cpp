#include <cstdint>
#include <iostream>
#include "math_utils.cpp"
// **🧮 Project: Multi-file Calculator**
//     Build a calculator split across multiple files with a clean header API.
// **What to build:**
//     - `math_utils.h` + `math_utils.cpp`:
// functions for add, subtract, multiply, divide, power, modulo —
// all in a `MathUtils` namespace
// - `main.cpp`: reads two numbers and an operator from the user in a loop
// - Add a preprocessor guard (`#ifndef`) and a `#define DEBUG` flag that prints extra info
//     - Use lambda for input validation

enum OperationOperator: std::uint8_t
{
    Addition = 1,
    Subtraction = 2,
    Multiplication = 3,
    Division = 4,
    Square = 5,
    Modulo = 6
};

int main()
{
    float num1, num2;
    std::string operationOperator;

    std::cout << "Enter two numbers: " << std::endl;
    std::cin >> num1 >> num2;
    std::cout << "Enter the operator (1 to 6)" << std::endl;
    std::cin >> operationOperator;

    switch (std::stoi(operationOperator))
    {
    case Addition:
        std::cout << "Addition : " << add(num1, num2) << std::endl;
        break;
    case Subtraction:
        std::cout << "Subtraction : " << sub(num1, num2) << std::endl;
        break;
    case Multiplication:
        std::cout << "Multiplication : " << mul(num1, num2) << std::endl;
        break;
    case Division:
        std::cout << "Division : " << divide(num1, num2) << std::endl;
        break;
    case Square:
        std::cout << "Square : " << square(num1) << square(num2) << std::endl;
        break;
    case Modulo:
        std::cout << "Modulo : " << mod(static_cast<int>(num1), static_cast<int>(num2)) << std::endl;
        break;
    default: throw std::invalid_argument(
            "Operator does not exist, please enter a number between 1 to 6");
    }


    return 0;
}
