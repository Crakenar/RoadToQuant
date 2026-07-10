#include <onnxruntime_cxx_api.h>
#include <opencv2/opencv.hpp>
#include <iostream>
#include <algorithm>
#include <string>
#include <vector>
#include <regex>
#include "helper.h"

bool isHealthy(const std::string& className) {
    static const std::vector<std::string> healthySuffixFreeNames = {
        "Apple_leaf", "Bell_pepper_leaf", "Blueberry_leaf", "Cherry_leaf",
        "Peach_leaf", "Raspberry_leaf", "Soyabean_leaf", "Strawberry_leaf",
        "Tomato_leaf", "grape_leaf"
    };
    return std::ranges::find(healthySuffixFreeNames, className) != healthySuffixFreeNames.end();
}

std::vector<std::string> parseClassNames(const std::string& metadataStr)
{
    std::vector<std::string> names;

    // Matches: number: 'Name' — captures the quoted name only
    std::regex pattern(R"(\d+:\s*'([^']+)')");

    auto begin = std::sregex_iterator(metadataStr.begin(), metadataStr.end(), pattern);
    auto end = std::sregex_iterator();

    for (auto it = begin; it != end; ++it)
    {
        names.emplace_back((*it)[1].first, (*it)[1].second);
    }

    return names;
}

int main()
{
    const Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "plant_pipeline");
    const Ort::SessionOptions sessionOptions;

    Ort::Session cropSession(env, "best.onnx", sessionOptions);
    Ort::Session healthSession(env, "best_health.onnx", sessionOptions);

    const Ort::ModelMetadata metadata = healthSession.GetModelMetadata();
    const Ort::AllocatorWithDefaultOptions allocator;
    const auto namesStr = metadata.LookupCustomMetadataMapAllocated("names", allocator);

    std::vector<std::string> healthClasses;
    if (namesStr)
    {
        healthClasses = parseClassNames(namesStr.get());
    }

    std::cout << "Parsed " << healthClasses.size() << " class names." << std::endl;
    for (const auto& name : healthClasses)
    {
        std::cout << "  " << name << std::endl;
    }

    cv::Mat img = cv::imread("test.jpg");

    auto detections = OnnxHelper::runInference(cropSession, img, 416, 30, 0.25f, 0.45f);
    if (detections.empty())
    {
        std::cout << "No plant detected." << std::endl;
        return 0;
    }

    auto best = std::max_element(detections.begin(), detections.end(),
                                 [](const OnnxHelper::Detection& a, const OnnxHelper::Detection& b)
                                 {
                                     return a.confidence < b.confidence;
                                 });

    cv::Rect box = best->box & cv::Rect(0, 0, img.cols, img.rows);
    cv::Mat cropped = img(box);

    OnnxHelper::Health::HealthResult health = OnnxHelper::Health::classifyHealth(
        healthSession, cropped, healthClasses, 224);

    bool healthy = isHealthy(health.label);
    std::cout << "Diagnosis: " << health.label
              << " (" << (healthy ? "healthy" : "diseased") << ", "
              << "confidence " << health.confidence << ")" << std::endl;

    return 0;
}
