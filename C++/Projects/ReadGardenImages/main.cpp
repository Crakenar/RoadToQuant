#include <onnxruntime_cxx_api.h>
#include <opencv2/opencv.hpp>
#include <iostream>
#include <algorithm>
#include "helper.h"

int main() {
    const Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "crop_detector");
    const Ort::SessionOptions sessionOptions;
    Ort::Session session(env, "best.onnx", sessionOptions);

    const cv::Mat imgToCrop = cv::imread("test.jpg");
    if (imgToCrop.empty()) {
        std::cerr << "Failed to load image!" << std::endl;
        return -1;
    }

    constexpr int inputSize = 416;
    constexpr int numClasses = 30;
    constexpr float confThreshold = 0.25f; //completely random ty claude
    constexpr float nmsThreshold = 0.45f; //completely random ty claude

    auto detections = OnnxHelper::runInference(session, imgToCrop, inputSize, numClasses, confThreshold, nmsThreshold);

    if (detections.empty()) {
        std::cout << "No leaf detected." << std::endl;
        return 0;
    }

    const auto best = std::ranges::max_element(detections,
                                         [](const OnnxHelper::Detection& a, const OnnxHelper::Detection& b) { return a.confidence < b.confidence; });

    const cv::Rect box = best->box & cv::Rect(0, 0, imgToCrop.cols, imgToCrop.rows);
    const cv::Mat cropped = imgToCrop(box);
    cv::imwrite("cropped_leaf.jpg", cropped);

    std::cout << "Detected class " << best->classId << " with confidence "
              << best->confidence << ". Cropped image saved." << std::endl;

    return 0;
}