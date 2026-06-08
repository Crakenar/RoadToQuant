import numpy as np
import pandas as pd
import datetime as dt
import os
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler

def data_visualization(df: pd.DataFrame):
    plt.figure(figsize=(10, 9))
    plt.xlabel('Date', fontsize=18)
    plt.xticks(range(0, df.shape[0], 500), df['Date'].loc[::500], rotation=45)
    plt.ylabel('Mid Price', fontsize=18)
    plt.plot(range(df.shape[0]), (df['Low'] + df['High']) / 2.0)
    plt.show()


def get_train_data():
    df = pd.read_csv(os.path.join('Stocks', 'hpq.us.txt'), delimiter=',',
                     usecols=['Date', 'Open', 'High', 'Low', 'Close'])
    df = df.sort_values('Date')

    mid_prices = (df['High'].to_numpy() + df['Low'].to_numpy()) / 2.0

    train_data = mid_prices[:11000].reshape(-1, 1)
    test_data = mid_prices[11000:].reshape(-1, 1)

    # Fit scaler on windows of 2500, same as original
    scaler = MinMaxScaler()
    smoothing_window_size = 2500
    for di in range(0, 10000, smoothing_window_size):
        scaler.fit(train_data[di:di + smoothing_window_size])
        train_data[di:di + smoothing_window_size] = scaler.transform(
            train_data[di:di + smoothing_window_size])
    scaler.fit(train_data[di + smoothing_window_size:])
    train_data[di + smoothing_window_size:] = scaler.transform(
        train_data[di + smoothing_window_size:])

    train_data = train_data.reshape(-1)
    test_data = scaler.transform(test_data).reshape(-1)

    # Exponential moving average smoothing
    EMA, gamma = 0.0, 0.1
    for ti in range(11000):
        EMA = gamma * train_data[ti] + (1 - gamma) * EMA
        train_data[ti] = EMA

    all_mid_data = np.concatenate([train_data, test_data])
    return train_data, test_data, all_mid_data


def normal_averaging(train_data, df: pd.DataFrame, all_mid_data):
    window_size = 100
    N = train_data.size
    std_avg_predictions = []
    std_avg_x = []
    mse_errors = []

    for pred_idx in range(window_size, N):

        if pred_idx >= N:
            date = dt.datetime.strptime(k, '%Y-%m-%d').date() + dt.timedelta(
                days=1)
        else:
            date = df.loc[pred_idx, 'Date']

        std_avg_predictions.append(
            np.mean(train_data[pred_idx - window_size:pred_idx]))
        mse_errors.append((std_avg_predictions[-1] - train_data[pred_idx]) ** 2)
        std_avg_x.append(date)

    print(
        'MSE error for standard averaging: %.5f' % (0.5 * np.mean(mse_errors)))
    plt.figure(figsize=(18, 9))
    plt.plot(range(df.shape[0]), all_mid_data, color='b', label='True')
    plt.plot(range(window_size, N), std_avg_predictions, color='orange',
             label='Prediction')
    # plt.xticks(range(0,df.shape[0],50),df['Date'].loc[::50],rotation=45)
    plt.xlabel('Date')
    plt.ylabel('Mid Price')
    plt.legend(fontsize=18)
    plt.show()


def exponential_moving_average(train_data, df, all_mid_data):
    window_size = 100
    N = train_data.size
    std_avg_predictions = []
    std_avg_x = []
    run_avg_predictions = []
    run_avg_x = []

    mse_errors = []

    running_mean = 0.0
    run_avg_predictions.append(running_mean)

    decay = 0.5

    for pred_idx in range(window_size, N):

        if pred_idx >= N:
            date = dt.datetime.strptime(k, '%Y-%m-%d').date() + dt.timedelta(
                days=1)
        else:
            date = df.loc[pred_idx, 'Date']

        std_avg_predictions.append(
            np.mean(train_data[pred_idx - window_size:pred_idx]))
        mse_errors.append((std_avg_predictions[-1] - train_data[pred_idx]) ** 2)
        std_avg_x.append(date)

    for pred_idx in range(1, N):
        running_mean = running_mean * decay + (1.0 - decay) * train_data[
            pred_idx - 1]
        run_avg_predictions.append(running_mean)
        mse_errors.append((run_avg_predictions[-1] - train_data[pred_idx]) ** 2)
        run_avg_x.append(date)

    print('MSE error for EMA averaging: %.5f' % (0.5 * np.mean(mse_errors)))
    plt.figure(figsize=(18, 9))
    plt.plot(range(df.shape[0]), all_mid_data, color='b', label='True')
    plt.plot(range(0, N), run_avg_predictions, color='orange',
             label='Prediction')
    # plt.xticks(range(0,df.shape[0],50),df['Date'].loc[::50],rotation=45)
    plt.xlabel('Date')
    plt.ylabel('Mid Price')
    plt.legend(fontsize=18)
    plt.show()
