import torch
import numpy as np

class StockDataset(torch.utils.data.Dataset):
    def __init__(self, data: np.ndarray, seq_len: int):
        self.data = torch.tensor(data, dtype=torch.float32)
        self.seq_len = seq_len

    def __len__(self):
        return len(self.data) - self.seq_len

    def __getitem__(self, idx):
        x = self.data[idx: idx + self.seq_len].unsqueeze(-1)  # [seq_len, 1]
        y = self.data[idx + self.seq_len].unsqueeze(-1)  # [1]
        return x, y