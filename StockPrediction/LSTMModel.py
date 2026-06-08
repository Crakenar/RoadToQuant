import torch.nn as nn

class LSTMModel(nn.Module):
    def __init__(self, input_size=1, hidden_sizes=[200, 200, 150], dropout=0.2):
        super().__init__()

        # nn.LSTM with num_layers stacks them automatically.
        # dropout applies between every layer EXCEPT the last one (PyTorch default).
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_sizes[0],
            # all layers share the same hidden size here;
            num_layers=len(hidden_sizes),
            # for variable sizes, use sequential LSTMCells
            batch_first=True,  # input shape: [batch, seq_len, features]
            dropout=dropout,
        )

        # Linear regression head: maps last hidden state → price prediction
        self.fc = nn.Linear(hidden_sizes[0], 1)

    def forward(self, x, hidden=None):
        # x: [batch, seq_len, 1]
        out, hidden = self.lstm(x, hidden)
        # out: [batch, seq_len, hidden_size]
        # We only want the LAST time step's output for prediction
        out = self.fc(out[:, -1, :])  # [batch, 1]
        return out, hidden