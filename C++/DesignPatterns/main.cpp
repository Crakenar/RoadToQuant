#include <iostream>
#include "CreationalPatterns/Singleton.cpp"

int main()
{
    const auto* obj = Singleton::GetInstance();
    return 0;
}