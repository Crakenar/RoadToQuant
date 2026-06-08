from RoadToQuant.StockPrediction import getData
from RoadToQuant.StockPrediction.LSTMModel import LSTMModel
from RoadToQuant.StockPrediction.StockDataset import StockDataset
from RoadToQuant.StockPrediction.AI import train, predict_n_steps
import torch
import matplotlib.pyplot as plt
import numpy as np

def main():
    # Hyperparameters
    SEQ_LEN = 50
    BATCH_SIZE = 500
    EPOCHS = 30
    HIDDEN_SIZES = [200, 200, 150]
    DROPOUT = 0.2
    N_PREDICT = 50  # steps to predict forward per test point

    train_data, test_data, all_mid_data = getData.get_train_data()

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'Using device: {device}')

    # Dataset + DataLoader
    dataset = StockDataset(train_data, SEQ_LEN)
    loader = torch.utils.data.DataLoader(dataset, batch_size=BATCH_SIZE,
                                         shuffle=True)

    # Model
    model = LSTMModel(input_size=1, hidden_sizes=HIDDEN_SIZES, dropout=DROPOUT)
    print(model)

    # Train
    model = train(model, loader, epochs=EPOCHS)

    # ── Evaluate on test points ──────────────────────────────
    test_points = np.arange(11000, 12000, 50).tolist()
    predictions_over_time = []

    for w_i in test_points:
        seed = all_mid_data[w_i - SEQ_LEN: w_i]
        preds = predict_n_steps(model, seed, N_PREDICT, device)
        predictions_over_time.append((w_i, preds))

    # ── Plot ─────────────────────────────────────────────────
    plt.figure(figsize=(18, 6))
    plt.plot(all_mid_data, color='steelblue', label='True price', linewidth=0.8)

    for w_i, preds in predictions_over_time:
        x_axis = list(range(w_i, w_i + N_PREDICT))
        plt.plot(x_axis, preds, color='tomato', alpha=0.6, linewidth=0.8)

    plt.title('LSTM predictions vs true mid price')
    plt.xlabel('Time step')
    plt.ylabel('Normalised price')
    plt.xlim(10800, 12200)
    plt.legend()
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    main()
