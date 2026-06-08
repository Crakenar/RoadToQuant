import torch
import numpy as np
import torch.nn as nn

def train(model, loader, epochs=30, lr=1e-3):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.MSELoss()

    # Learning rate scheduler: halve LR if loss doesn't improve for 2 epochs
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, patience=2, factor=0.5
    )

    model.train()
    for epoch in range(epochs):
        total_loss = 0.0
        for x_batch, y_batch in loader:
            x_batch = x_batch.to(device)
            y_batch = y_batch.to(device)

            optimizer.zero_grad()
            pred, _ = model(x_batch)
            loss = criterion(pred, y_batch)
            loss.backward()

            # Gradient clipping — same as the original tf.clip_by_global_norm(5.0)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)

            optimizer.step()
            total_loss += loss.item()

        avg_loss = total_loss / len(loader)
        scheduler.step(avg_loss)
        print(
            f'Epoch {epoch + 1:02d}/{epochs} — loss: {avg_loss:.6f}  lr: {optimizer.param_groups[0]["lr"]:.6f}')

    return model


def predict_n_steps(model, seed_seq: np.ndarray, n_steps: int, device):
    model.eval()
    preds = []

    # seed_seq: [seq_len] numpy array
    current = torch.tensor(seed_seq, dtype=torch.float32).unsqueeze(
        0).unsqueeze(-1).to(device)
    # current shape: [1, seq_len, 1]

    hidden = None
    with torch.no_grad():
        for _ in range(n_steps):
            pred, hidden = model(current, hidden)
            # pred: [1, 1]
            val = pred.item()
            preds.append(val)
            # Slide the window: drop oldest, append prediction
            new_step = torch.tensor([[[val]]], dtype=torch.float32).to(device)
            current = torch.cat([current[:, 1:, :], new_step], dim=1)

    return np.array(preds)