cmake_minimum_required(VERSION 3.28)
project(ReadGardenImages)

set(CMAKE_CXX_STANDARD 20)

# --- OpenCV (still used for image I/O and cropping) ---
set(OpenCV_DIR /usr/lib/x86_64-linux-gnu/cmake/opencv4)
find_package(OpenCV REQUIRED)
include_directories(${OpenCV_INCLUDE_DIRS})

# --- ONNX Runtime (used for model inference) ---
set(ONNXRUNTIME_ROOT "${CMAKE_SOURCE_DIR}/onnxruntime-linux-x64-1.17.1")
include_directories(${ONNXRUNTIME_ROOT}/include)
link_directories(${ONNXRUNTIME_ROOT}/lib)

add_executable(ReadGardenImages main.cpp
        helper.cpp
        helper.h)

target_link_libraries(ReadGardenImages
        ${OpenCV_LIBS}
        ${ONNXRUNTIME_ROOT}/lib/libonnxruntime.so
)