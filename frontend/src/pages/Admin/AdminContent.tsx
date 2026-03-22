import './Admin.css';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, X, Save, FileText, Shield } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAdminToast } from './useAdminToast';
import { ADMIN_DICTIONARY } from './adminDictionary';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  type: 'faq' | 'policy';
  order: number;
}

const initialContent: ContentItem[] = [
  { id: '1', title: 'Làm sao để đặt hàng?', content: 'Bạn có thể đặt hàng trực tiếp trên website bằng cách chọn sản phẩm, chọn size/màu và thêm vào giỏ hàng.', type: 'faq', order: 1 },
  { id: '2', title: 'Thời gian giao hàng bao lâu?', content: 'Thời gian giao hàng từ 2-5 ngày tùy khu vực. Đơn hàng nội thành TP.HCM giao trong 2-3 ngày.', type: 'faq', order: 2 },
  { id: '3', title: 'Có thể đổi trả sản phẩm không?', content: 'Coolmate hỗ trợ đổi trả trong 60 ngày với bất kỳ lý do gì. Bạn chỉ cần mang sản phẩm đến cửa hàng hoặc liên hệ hotline.', type: 'faq', order: 3 },
  { id: '4', title: 'Chính sách bảo hành', content: 'Tất cả sản phẩm được bảo hành 12 tháng về chất lượng vải và đường may. Lỗi sản xuất được đổi mới miễn phí.', type: 'policy', order: 1 },
  { id: '5', title: 'Chính sách vận chuyển', content: 'Miễn phí vận chuyển cho đơn hàng từ 300.000đ. Giao hàng nhanh qua GHN, GHTK với mã theo dõi trực tiếp.', type: 'policy', order: 2 },
];

const AdminContent = () => {
  const t = ADMIN_DICTIONARY.content;
  const { pushToast } = useAdminToast();
  const [activeTab, setActiveTab] = useState<'faq' | 'policy'>('faq');
  const [items, setItems] = useState<ContentItem[]>(initialContent);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });

  const filteredItems = items.filter(
    (item) =>
      item.type === activeTab &&
      (item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.content.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      pushToast('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    if (editingItem) {
      setItems(items.map((item) =>
        item.id === editingItem.id ? { ...item, title: formData.title, content: formData.content } : item
      ));
      pushToast(t.messages.saved);
    } else {
      const newItem: ContentItem = {
        id: String(Date.now()),
        title: formData.title,
        content: formData.content,
        type: activeTab,
        order: items.filter((i) => i.type === activeTab).length + 1,
      };
      setItems([...items, newItem]);
      pushToast(t.messages.addSuccess);
    }
    setEditingItem(null);
    setIsCreating(false);
    setFormData({ title: '', content: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm(t.messages.deleteConfirm)) {
      setItems(items.filter((item) => item.id !== id));
      pushToast(t.messages.saved);
    }
  };

  const openEdit = (item: ContentItem) => {
    setEditingItem(item);
    setFormData({ title: item.title, content: item.content });
  };

  const closeForm = () => {
    setEditingItem(null);
    setIsCreating(false);
    setFormData({ title: '', content: '' });
  };

  const tabs = [
    { key: 'faq' as const, label: t.tabs.faq, icon: FileText },
    { key: 'policy' as const, label: t.tabs.policy, icon: Shield },
  ];

  return (
    <AdminLayout
      title={t.title}
      actions={
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder="Tìm nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="admin-primary-btn" onClick={() => setIsCreating(true)}>
            <Plus size={16} /> {t.form.addNew}
          </button>
        </>
      }
    >
      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-content-list">
        {filteredItems.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có nội dung nào</p>
            <button className="admin-primary-btn" onClick={() => setIsCreating(true)}>
              <Plus size={16} /> Thêm nội dung đầu tiên
            </button>
          </div>
        ) : (
          filteredItems.map((item) => (
            <motion.div
              key={item.id}
              className="admin-content-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="admin-content-card-body">
                <h4>{item.title}</h4>
                <p className="admin-muted">{item.content}</p>
              </div>
              <div className="admin-content-card-actions">
                <button
                  className="admin-icon-btn subtle"
                  title={ADMIN_DICTIONARY.actionTitles.edit}
                  onClick={() => openEdit(item)}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="admin-icon-btn subtle danger-icon"
                  title={ADMIN_DICTIONARY.actionTitles.delete}
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {(editingItem || isCreating) && (
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeForm}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(editingItem || isCreating) && (
          <motion.div
            className="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">{activeTab === 'faq' ? t.tabs.faq : t.tabs.policy}</p>
                <h3>{editingItem ? t.form.edit : t.form.addNew}</h3>
              </div>
              <button className="admin-icon-btn" onClick={closeForm}><X size={18} /></button>
            </div>
            <div className="drawer-body">
              <section className="drawer-section">
                <h4>{t.form.title}</h4>
                <input
                  type="text"
                  className="content-form-input"
                  placeholder={t.form.titlePlaceholder}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </section>
              <section className="drawer-section">
                <h4>{t.form.content}</h4>
                <textarea
                  className="content-form-textarea"
                  placeholder={t.form.contentPlaceholder}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                />
              </section>
              <button className="admin-primary-btn" onClick={handleSave}>
                <Save size={16} /> {t.form.save}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .admin-content-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 20px;
        }
        .admin-content-card {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px;
          background: white;
          border: 1px solid var(--co-gray-200);
          border-radius: 12px;
          gap: 16px;
        }
        .admin-content-card-body {
          flex: 1;
        }
        .admin-content-card-body h4 {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 600;
          color: var(--co-admin-text);
        }
        .admin-content-card-body p {
          margin: 0;
          font-size: 14px;
          color: var(--co-gray-600);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .admin-content-card-actions {
          display: flex;
          gap: 8px;
        }
        .content-form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--co-gray-200);
          border-radius: 12px;
          font-size: 14px;
        }
        .content-form-input:focus {
          outline: none;
          border-color: var(--co-admin-primary);
        }
        .content-form-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--co-gray-200);
          border-radius: 12px;
          font-size: 14px;
          resize: vertical;
          font-family: inherit;
        }
        .content-form-textarea:focus {
          outline: none;
          border-color: var(--co-admin-primary);
        }
        .admin-empty-state {
          text-align: center;
          padding: 40px;
          color: var(--co-gray-500);
        }
        .admin-empty-state p {
          margin-bottom: 16px;
        }
        .admin-tabs {
          display: flex;
          gap: 8px;
          margin-top: 20px;
        }
        .admin-tab {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminContent;