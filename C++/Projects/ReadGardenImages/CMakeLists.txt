cmake_minimum_required(VERSION 3.28)
project(ReadGardenImages)

set(CMAKE_CXX_STANDARD 20)

set(OpenCV_DIR /usr/lib/x86_64-linux-gnu/cmake/opencv4)
find_package(OpenCV REQUIRED)

include_directories(${OpenCV_INCLUDE_DIRS})

add_executable(ReadGardenImages main.cpp
        helper.cpp
        helper.h)
target_link_libraries(ReadGardenImages ${OpenCV_LIBS})