#include <iostream>
#include <vector>

int main()
{
    /**
     * 64 bytes system
    */
    std::cout << "Size of char : " << sizeof(char) << std::endl; // 1 byte
    std::cout << "Size of int : " << sizeof(int) << std::endl; // 4 bytes
    std::cout << "Size of double : " << sizeof(double) << std::endl; // 8
    std::cout << "Size of std::string : " << sizeof(std::string) << std::endl; // 32
    std::cout << "Size of std::nullptr_t : " << sizeof(std::nullptr_t) << std::endl; // 8
    std::cout << "Size of float : " << sizeof(float) << std::endl; // 4

    std::cout << "Size of std::vector int : " << sizeof(std::vector<int>) << std::endl; // 24
    std::cout << "Size of std::vector char : " << sizeof(std::vector<char>) << std::endl; // 24
    std::cout << "Size of std::vector double : " << sizeof(std::vector<double>) << std::endl; // 24
    std::cout << "Size of std::vector std::string : " << sizeof(std::vector<std::string>) << std::endl; // 24

    struct EmptyStruct {};
    std::cout << "Size of empty struct : " << sizeof(EmptyStruct) << std::endl; // 1

    struct StructOne
    {
        double x;
        std::vector<double> y;
    };
    std::cout << "Size of StructOne : " << sizeof(StructOne) << std::endl; // 8 + 24 => 32

    struct StructTwo
    {
        int x;
        std::vector<double> y;
    };
    std::cout << "Size of StructTwo : " << sizeof(StructTwo) << std::endl; // 8 + 24 => 32

    struct ExampleMemoryAlignment
    {
        char a;
        int b;
        char c;
        double d;
    };

    std::cout << "Size of ExampleMemoryAlignment : " << sizeof(ExampleMemoryAlignment) << std::endl; // 24

    struct ExampleCorrectMemoryAlignment
    {
        char a;
        char c;
        int b;
        double d;
    };

    std::cout << "Size of ExampleCorrectMemoryAlignment : " << sizeof(ExampleCorrectMemoryAlignment) << std::endl; // 16

    return 0;
}
