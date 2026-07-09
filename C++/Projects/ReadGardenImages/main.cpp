#include "opencv2/imgcodecs.hpp"
#include "opencv2/highgui.hpp"
#include "opencv2/imgproc.hpp"
#include <opencv2/saliency.hpp>

#include <iostream>
#include "helper.h"

using namespace cv;
using namespace std;

Mat src_gray;
int DEFAULT_THRESH = 150;
RNG rng(12345);
constexpr bool DRAW = true;

void thresh_callback(int, void*);
void generate_histogram(cv::Mat&);
Mat autoCrop(const Mat& img, int padding = 15);

int main(int argc, char** argv)
{
    auto start = std::chrono::high_resolution_clock::now();
    cv::CommandLineParser parser(argc, argv, "{@input | fleur.jpg | input image}");
    cv::Mat src = Helper::readAndOpenImageCustom(parser.get<cv::String>("@input"));

    cout << "Width : " << src.size().width << endl;
    cout << "Height: " << src.size().height << endl;
    cout<<"Channels: :"<< src.channels() << endl;

    cvtColor(src, src_gray, COLOR_BGR2GRAY);
    blur(src_gray, src_gray, Size(3, 3));

    if (DRAW)
    {
        const char* source_window = "Source";
        namedWindow(source_window);
        imshow(source_window, src);
    }

    thresh_callback(0, nullptr);

    //Histogram
    // ::generate_histogram(src);


    auto stop = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(stop - start);
    cout << "Time taken: " << duration.count() << " microseconds" << endl;

    if (DRAW)
        waitKey();

    return 0;
}

void generate_histogram(cv::Mat& src)
{
    cvtColor(src, src, COLOR_RGBA2GRAY);

    Mat dst;
    equalizeHist(src, dst);

    imshow("Source image", src);
    imshow("Equalized Image", dst);
}

void thresh_callback(int, void*)
{
    Mat canny_output;
    Canny(src_gray, canny_output, DEFAULT_THRESH, DEFAULT_THRESH * 2);

    vector<vector<Point>> contours;
    vector<Vec4i> hierarchy;
    findContours(canny_output, contours, hierarchy, RETR_TREE, CHAIN_APPROX_SIMPLE);

    // std::cout << canny_output.size() << std::endl;
    auto contourSize = contours.size();
    std::cout << contourSize << std::endl;
    if (contourSize > 10)
    {
        std::cout << "Plante malade !" << std::endl;
    }
    else
    {
        std::cout << "Tout va bien frere !" << std::endl;
    }

    if (DRAW)
    {
        Mat drawing = Mat::zeros(canny_output.size(), CV_8UC3);
        for (size_t i = 0; i < contours.size(); i++)
        {
            // std::cout << contours[i] << std::endl;
            Scalar color = Scalar(rng.uniform(0, 256), rng.uniform(0, 256), rng.uniform(0, 256));
            drawContours(drawing, contours, static_cast<int>(i), color, 2, LINE_8, hierarchy, 0);
        }

        imshow("Contours", drawing);
    }
}

Mat autoCrop(const Mat& img, int padding) {
    Mat gray, blurred, edges;
    cvtColor(img, gray, COLOR_BGR2GRAY);
    GaussianBlur(gray, blurred, Size(5, 5), 0);

    // Canny works better than a fixed threshold for variable lighting
    Canny(blurred, edges, 50, 150);

    // Dilate to close gaps in the contour outline
    dilate(edges, edges, getStructuringElement(MORPH_RECT, Size(5, 5)));

    vector<vector<Point>> contours;
    findContours(edges, contours, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);

    if (contours.empty()) {
        return img; // nothing found, fall back to original
    }

    // Pick the largest contour by area
    auto largest = max_element(contours.begin(), contours.end(),
        [](const vector<Point>& a, const vector<Point>& b) {
            return contourArea(a) < contourArea(b);
        });

    Rect box = boundingRect(*largest);

    // Add padding, clamp to image bounds
    box.x = max(0, box.x - padding);
    box.y = max(0, box.y - padding);
    box.width = min(img.cols - box.x, box.width + 2 * padding);
    box.height = min(img.rows - box.y, box.height + 2 * padding);

    return img(box);
}

Rect saliencyCrop(const Mat& img, int padding = 15) {
    Ptr<cv::saliency::StaticSaliencyFineGrained> saliencyAlgo = cv::saliency::StaticSaliencyFineGrained::create();

    Mat saliencyMap;
    saliencyAlgo->computeSaliency(img, saliencyMap);

    Mat saliencyMap8U;
    saliencyMap.convertTo(saliencyMap8U, CV_8U, 255);

    Mat binaryMap;
    threshold(saliencyMap8U, binaryMap, 0, 255, THRESH_BINARY | THRESH_OTSU);

    // clean up small noise blobs
    morphologyEx(binaryMap, binaryMap, MORPH_OPEN, getStructuringElement(MORPH_ELLIPSE, Size(9, 9)));
    morphologyEx(binaryMap, binaryMap, MORPH_CLOSE, getStructuringElement(MORPH_ELLIPSE, Size(21, 21)));

    vector<vector<Point>> contours;
    findContours(binaryMap, contours, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);

    if (contours.empty()) return Rect(0, 0, img.cols, img.rows);

    auto largest = max_element(contours.begin(), contours.end(),
        [](const vector<Point>& a, const vector<Point>& b) {
            return contourArea(a) < contourArea(b);
        });

    Rect box = boundingRect(*largest);
    box.x = max(0, box.x - padding);
    box.y = max(0, box.y - padding);
    box.width = min(img.cols - box.x, box.width + 2 * padding);
    box.height = min(img.rows - box.y, box.height + 2 * padding);
    return box;
}
