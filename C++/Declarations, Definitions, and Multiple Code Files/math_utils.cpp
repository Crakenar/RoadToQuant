#include "math_utils.h"

#include <cmath>
#include <stdexcept>

namespace MathUtils
{
    float add(const float a, const float b)
    {
        return a + b;
    }
    float sub(const float a, const float b)
    {
        return a - b;
    }
    float mul(const float a, const float b)
    {
        return a * b;
    }

    float divide(const float a, const float b)
    {
        if (b == 0)
            throw std::invalid_argument("Division by zero");
        return a / b;
    }

    int mod(const int a, const int b)
    {
        if (b == 0)
            throw std::invalid_argument("Modulo by zero");
        return a % b;
    }

    float square(const float a)
    {
        return std::sqrt(a);
    }
}

