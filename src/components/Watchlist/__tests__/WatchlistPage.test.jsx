import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import axios from 'axios';
import WatchlistPage from '../WatchlistPage';
import { AuthContext } from '../../../contexts/AuthContext';

// Mock axios
jest.mock('axios');

// Mock AuthContext
const mockAuthContext = {
  user: { 
    id: 'test-user-123', 
    username: 'testuser' 
  },
  token: 'fake-jwt-token'
};

describe('WatchlistPage Component', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset axios mocks
    axios.get.mockReset();
    axios.post.mockReset();
    axios.delete.mockReset();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthContext}>
          <WatchlistPage />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  test('renders watchlist page with empty state', async () => {
    // Mock empty watchlist response
    axios.get.mockResolvedValueOnce({
      data: {
        data: [],
        pagination: {
          totalItems: 0,
          currentPage: 1,
          totalPages: 1
        }
      }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/尚未新增任何關注清單/i)).toBeInTheDocument();
    });
  });

  test('renders watchlist items', async () => {
    // Mock watchlist with items
    const mockWatchlistItems = [
      { symbol: 'BTCUSDT', priority: 1, lastPrice: 50000 },
      { symbol: 'ETHUSDT', priority: 2, lastPrice: 3000 }
    ];

    axios.get.mockResolvedValueOnce({
      data: {
        data: mockWatchlistItems,
        pagination: {
          totalItems: 2,
          currentPage: 1,
          totalPages: 1
        }
      }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
      expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
    });
  });

  test('adds new watchlist item', async () => {
    // Mock initial empty watchlist
    axios.get.mockResolvedValueOnce({
      data: {
        data: [],
        pagination: {
          totalItems: 0,
          currentPage: 1,
          totalPages: 1
        }
      }
    });

    // Mock successful add
    axios.post.mockResolvedValueOnce({
      data: {
        data: { symbol: 'BTCUSDT', priority: 1 }
      },
      status: 201
    });

    renderComponent();

    // 等待初始渲染
    await waitFor(() => {
      expect(screen.getByText(/尚未新增任何關注清單/i)).toBeInTheDocument();
    });

    // 模擬新增交易對
    const symbolInput = screen.getByPlaceholderText(/輸入交易對/i);
    const addButton = screen.getByText(/新增/i);

    fireEvent.change(symbolInput, { target: { value: 'BTCUSDT' } });
    fireEvent.click(addButton);

    // 驗證 API 調用
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/watchlist', 
        { symbol: 'BTCUSDT', priority: 1 },
        expect.any(Object)
      );
    });
  });

  test('removes watchlist item', async () => {
    // Mock watchlist with items
    const mockWatchlistItems = [
      { symbol: 'BTCUSDT', priority: 1, lastPrice: 50000 }
    ];

    axios.get.mockResolvedValueOnce({
      data: {
        data: mockWatchlistItems,
        pagination: {
          totalItems: 1,
          currentPage: 1,
          totalPages: 1
        }
      }
    });

    // Mock delete operation
    axios.delete.mockResolvedValueOnce({
      data: { message: '已成功移除' }
    });

    renderComponent();

    // 等待渲染
    await waitFor(() => {
      expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    });

    // 模擬刪除操作
    const deleteButton = screen.getByLabelText(/移除 BTCUSDT/i);
    fireEvent.click(deleteButton);

    // 驗證 API 調用
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        '/api/watchlist/BTCUSDT',
        expect.any(Object)
      );
    });
  });

  test('handles watchlist limit', async () => {
    // Mock 30個已滿的關注清單
    const mockFullWatchlist = Array.from({ length: 30 }, (_, i) => ({
      symbol: `SYMBOL${i}USDT`,
      priority: 1
    }));

    axios.get.mockResolvedValueOnce({
      data: {
        data: mockFullWatchlist,
        pagination: {
          totalItems: 30,
          currentPage: 1,
          totalPages: 1
        }
      }
    });

    // Mock 新增失敗（超過限制）
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: '關注清單已達到上限',
          status: 400
        }
      }
    });

    renderComponent();

    // 等待渲染
    await waitFor(() => {
      expect(screen.getAllByTestId('watchlist-item')).toHaveLength(30);
    });

    // 模擬新增交易對
    const symbolInput = screen.getByPlaceholderText(/輸入交易對/i);
    const addButton = screen.getByText(/新增/i);

    fireEvent.change(symbolInput, { target: { value: 'NEWUSDT' } });
    fireEvent.click(addButton);

    // 驗證錯誤提示
    await waitFor(() => {
      expect(screen.getByText(/關注清單已達到上限/i)).toBeInTheDocument();
    });
  });
}); 