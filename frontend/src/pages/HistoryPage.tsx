import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, deleteHistoryItem, type HistoryItem } from '../services/api';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'webcam'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchHistory = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await getHistory(activeTab);
      setHistoryList(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải lịch sử phân tích');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeTab]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
    try {
      await deleteHistoryItem(id);
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bản ghi.');
    }
  };

  const filteredList = historyList.filter((item) =>
    item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.quick_result.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0F254A' }}>
        Lịch sử phân tích
      </h1>

      {errorMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '14px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#EFF6FF', padding: '4px', borderRadius: '10px' }}>
          {(
            [
              { key: 'all', label: 'Tất cả' },
              { key: 'image', label: 'Hình ảnh' },
              { key: 'video', label: 'Video' },
              { key: 'webcam', label: 'WebCam' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab.key ? '#2563EB' : 'transparent',
                color: activeTab === tab.key ? '#FFFFFF' : '#64748B',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '14px 20px' }}>Thời gian</th>
              <th style={{ padding: '14px 20px' }}>Loại</th>
              <th style={{ padding: '14px 20px' }}>Tên file</th>
              <th style={{ padding: '14px 20px' }}>Kết quả nhanh</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                  Đang tải dữ liệu lịch sử...
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                  Chưa có bản ghi phân tích nào.
                </td>
              </tr>
            ) : (
              filteredList.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/history/${item.id}`)}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 20px', color: '#334155' }}>{item.created_at}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {item.type === 'image' ? '🖼️ Ảnh' : item.type === 'video' ? '🎥 Video' : '📹 WebCam'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 500, color: '#0F172A' }}>{item.filename}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: '#DCFCE7',
                        color: '#16A34A',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {item.quick_result}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => navigate(`/history/${item.id}`)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginRight: '8px',
                      }}
                    >
                      Xem
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
