#pragma once
#include <string>
#include <opencv4/opencv2/core/types.hpp>
#include <opencv4/opencv2/core/mat.hpp>

#include "onnxruntime-linux-x64-1.17.1/include/onnxruntime_cxx_api.h"

namespace OnnxHelper
{
    struct Detection
    {
        cv::Rect box;
        float confidence;
        int classId;
    };
    cv::Mat preprocess(const cv::Mat& img, int inputSize, float& scale, int& padX, int& padY);

    std::vector<Detection> runInference(Ort::Session& session, const cv::Mat& img,
                                        int inputSize, int numClasses,
                                        float confThreshold, float nmsThreshold);
}
