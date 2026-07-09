#include "opencv2/imgcodecs.hpp"
#include <opencv2/opencv.hpp>
#include "opencv2/dnn.hpp"
#include <vector>
#include <iostream>
#include <onnxruntime_cxx_api.h>
#include <opencv2/opencv.hpp>
#include <iostream>
#include <vector>
#include <algorithm>
#include "helper.h"

namespace Helper
{
    cv::Mat readAndOpenImageCustom(const std::string& path)
    {
        cv::Mat src = cv::imread(cv::samples::findFile(path));
        if (src.empty())
        {
            std::cout << "Could not open or find the image!\n" << std::endl;
            throw std::runtime_error("Could not open or find the image: " + path);
        }
        return src;
    }

    cv::dnn::Net readFromOnnx(const std::string& path)
    {
        cv::dnn::Net net = cv::dnn::readNetFromONNX(path);
        if (net.empty())
        {
            std::cout << "Could not open or find the Onnx!\n" << std::endl;
            throw std::runtime_error("Could not open or find the Onnx: " + path);
        }
        return net;
    }
}


namespace OnnxHelper
{
    cv::Mat preprocess(const cv::Mat& img, int inputSize, float& scale, int& padX, int& padY) {
        int w = img.cols, h = img.rows;
        scale = std::min((float)inputSize / w, (float)inputSize / h);
        int newW = static_cast<int>(w * scale);
        int newH = static_cast<int>(h * scale);

        cv::Mat resized;
        cv::resize(img, resized, cv::Size(newW, newH));

        padX = (inputSize - newW) / 2;
        padY = (inputSize - newH) / 2;

        cv::Mat padded(inputSize, inputSize, CV_8UC3, cv::Scalar(114, 114, 114));
        resized.copyTo(padded(cv::Rect(padX, padY, newW, newH)));

        return padded;
    }

    // Converts an OpenCV BGR image into the CHW float tensor ONNX Runtime expects
    std::vector<float> imageToTensor(const cv::Mat& img) {
        cv::Mat rgb;
        cv::cvtColor(img, rgb, cv::COLOR_BGR2RGB);
        rgb.convertTo(rgb, CV_32F, 1.0 / 255.0);

        int h = rgb.rows, w = rgb.cols;
        std::vector<float> tensor(3 * h * w);

        // HWC -> CHW
        std::vector<cv::Mat> channels(3);
        cv::split(rgb, channels);
        for (int c = 0; c < 3; ++c) {
            std::memcpy(tensor.data() + c * h * w, channels[c].ptr<float>(), h * w * sizeof(float));
        }
        return tensor;
    }

    std::vector<Detection> runInference(Ort::Session& session, const cv::Mat& img,
                                        int inputSize, int numClasses,
                                        float confThreshold, float nmsThreshold)
    {
        float scale;
        int padX, padY;
        cv::Mat padded = preprocess(img, inputSize, scale, padX, padY);
        std::vector<float> inputTensorValues = imageToTensor(padded);

        std::array<int64_t, 4> inputShape{1, 3, inputSize, inputSize};

        Ort::MemoryInfo memoryInfo = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
        Ort::Value inputTensor = Ort::Value::CreateTensor<float>(
            memoryInfo, inputTensorValues.data(), inputTensorValues.size(),
            inputShape.data(), inputShape.size());

        const char* inputNames[] = {"images"};
        const char* outputNames[] = {"output0"};

        auto outputTensors = session.Run(Ort::RunOptions{nullptr}, inputNames, &inputTensor, 1,
                                         outputNames, 1);

        float* outputData = outputTensors[0].GetTensorMutableData<float>();
        auto outputShape = outputTensors[0].GetTensorTypeAndShapeInfo().GetShape();
        // Expected shape: [1, 4+numClasses, N]
        int dims = static_cast<int>(outputShape[1]); // e.g. 34
        int numBoxes = static_cast<int>(outputShape[2]); // e.g. 3549

        std::vector<cv::Rect> boxes;
        std::vector<float> confidences;
        std::vector<int> classIds;

        for (int i = 0; i < numBoxes; ++i)
        {
            float maxScore = 0.0f;
            int maxClassId = -1;
            for (int c = 0; c < numClasses; ++c)
            {
                // Data layout is [dims, numBoxes] flattened row-major, matching output0's shape
                float score = outputData[(4 + c) * numBoxes + i];
                if (score > maxScore)
                {
                    maxScore = score;
                    maxClassId = c;
                }
            }

            if (maxScore < confThreshold) continue;

            float cx = outputData[0 * numBoxes + i];
            float cy = outputData[1 * numBoxes + i];
            float w = outputData[2 * numBoxes + i];
            float h = outputData[3 * numBoxes + i];

            float x1 = (cx - w / 2 - padX) / scale;
            float y1 = (cy - h / 2 - padY) / scale;
            float boxW = w / scale;
            float boxH = h / scale;

            boxes.emplace_back(cv::Rect(static_cast<int>(x1), static_cast<int>(y1),
                                        static_cast<int>(boxW), static_cast<int>(boxH)));
            confidences.push_back(maxScore);
            classIds.push_back(maxClassId);
        }

        std::vector<int> nmsIndices;
        cv::dnn::NMSBoxes(boxes, confidences, confThreshold, nmsThreshold, nmsIndices);

        std::vector<Detection> results;
        for (int idx : nmsIndices)
        {
            results.push_back({boxes[idx], confidences[idx], classIds[idx]});
        }
        return results;
    }
}
