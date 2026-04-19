import './Admin.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, RefreshCcw, UploadCloud, MessageSquare, FileText, Plus, Trash2, Pencil } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAdminToast } from './useAdminToast';
import {
  adminBotScenarioService,
  type BotScenarioActionKey,
  type BotScenarioPayload,
  type BotScenarioSnapshot,
} from '../../services/adminBotScenarioService';
import { contentService, type ContentPage } from '../../services/contentService';

type FaqFormState = {
  id?: string;
  title: string;
  body: string;
  keywordsText: string;
};

const QUICK_ACTION_ORDER: BotScenarioActionKey[] = ['ORDER_LOOKUP', 'SIZE_ADVICE', 'PRODUCT_FAQ'];

const QUICK_ACTION_LABEL: Record<BotScenarioActionKey, string> = {
  ORDER_LOOKUP: 'Tra cuu don',
  SIZE_ADVICE: 'Tu van size',
  PRODUCT_FAQ: 'Hoi dap san pham',
};

const emptyFaqForm: FaqFormState = {
  title: '',
  body: '',
  keywordsText: '',
};

const parseKeywords = (input: string) =>
  input
    .split(/[,;\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatKeywords = (keywords?: string[]) => (keywords || []).join(', ');

const sortQuickActions = (payload: BotScenarioPayload): BotScenarioPayload => {
  const byKey = new Map(payload.quickActions.map((item) => [item.key, item]));
  return {
    ...payload,
    quickActions: QUICK_ACTION_ORDER.map((key) => byKey.get(key)).filter(Boolean) as BotScenarioPayload['quickActions'],
  };
};

const AdminBotAI = () => {
  const { pushToast } = useAdminToast();
  const [snapshot, setSnapshot] = useState<BotScenarioSnapshot | null>(null);
  const [draft, setDraft] = useState<BotScenarioPayload | null>(null);
  const [faqItems, setFaqItems] = useState<ContentPage[]>([]);
  const [faqForm, setFaqForm] = useState<FaqFormState>(emptyFaqForm);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingFaq, setSavingFaq] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [scenarioSnapshot, faqList] = await Promise.all([
        adminBotScenarioService.getSnapshot(),
        contentService.list('FAQ'),
      ]);
      setSnapshot(scenarioSnapshot);
      setDraft(sortQuickActions(scenarioSnapshot.draft));
      setFaqItems(faqList);
    } catch {
      pushToast('Khong the tai du lieu Bot/AI.');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasDraftChanged = useMemo(() => {
    if (!snapshot || !draft) return false;
    return JSON.stringify(sortQuickActions(snapshot.draft)) !== JSON.stringify(sortQuickActions(draft));
  }, [snapshot, draft]);

  const updateDraftField = <K extends keyof BotScenarioPayload>(field: K, value: BotScenarioPayload[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateQuickActionLabel = (key: BotScenarioActionKey, label: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        quickActions: current.quickActions.map((item) => (item.key === key ? { ...item, label } : item)),
      };
    });
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    try {
      setSavingDraft(true);
      const nextSnapshot = await adminBotScenarioService.saveDraft(sortQuickActions(draft));
      setSnapshot(nextSnapshot);
      setDraft(sortQuickActions(nextSnapshot.draft));
      pushToast('Da luu nhap kich ban bot.');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Khong the luu nhap.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      const nextSnapshot = await adminBotScenarioService.publishDraft();
      setSnapshot(nextSnapshot);
      setDraft(sortQuickActions(nextSnapshot.draft));
      pushToast('Da publish kich ban chatbot.');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Khong the publish.');
    } finally {
      setPublishing(false);
    }
  };

  const handleResetDraft = async () => {
    try {
      const nextSnapshot = await adminBotScenarioService.resetDraftFromPublished();
      setSnapshot(nextSnapshot);
      setDraft(sortQuickActions(nextSnapshot.draft));
      pushToast('Da khoi phuc draft theo ban published.');
    } catch {
      pushToast('Khong the khoi phuc draft.');
    }
  };

  const openFaqEditor = (item?: ContentPage) => {
    if (!item) {
      setFaqForm(emptyFaqForm);
      return;
    }
    setFaqForm({
      id: item.id,
      title: item.title,
      body: item.body,
      keywordsText: formatKeywords(item.keywords),
    });
  };

  const handleSaveFaq = async () => {
    if (!faqForm.title.trim() || !faqForm.body.trim()) {
      pushToast('FAQ can co title va noi dung.');
      return;
    }

    const payload = {
      title: faqForm.title.trim(),
      body: faqForm.body.trim(),
      type: 'FAQ' as const,
      displayOrder: faqForm.id ? faqItems.find((item) => item.id === faqForm.id)?.displayOrder : faqItems.length + 1,
      keywords: parseKeywords(faqForm.keywordsText),
    };

    try {
      setSavingFaq(true);
      if (faqForm.id) {
        const updated = await contentService.update(faqForm.id, payload);
        setFaqItems((prev) => prev.map((item) => (item.id === faqForm.id ? updated : item)));
        pushToast('Da cap nhat FAQ.');
      } else {
        const created = await contentService.create(payload);
        setFaqItems((prev) => [...prev, created]);
        pushToast('Da tao FAQ moi.');
      }
      setFaqForm(emptyFaqForm);
    } catch {
      pushToast('Khong the luu FAQ.');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Ban chac chan muon xoa FAQ nay?')) return;
    try {
      await contentService.remove(id);
      setFaqItems((prev) => prev.filter((item) => item.id !== id));
      if (faqForm.id === id) {
        setFaqForm(emptyFaqForm);
      }
      pushToast('Da xoa FAQ.');
    } catch {
      pushToast('Khong the xoa FAQ.');
    }
  };

  return (
    <AdminLayout title="Bot va AI" breadcrumbs={['Bot va AI', 'Quan ly kich ban chatbot']}>
      <div className="admin-panels single">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Cau hinh kich ban chatbot</h2>
              <p className="admin-muted">
                Draft se duoc chinh sua o day. Runtime chatbot chi dung ban Published.
              </p>
            </div>
            <div className="admin-topbar-actions">
              <button className="admin-icon-btn subtle" onClick={() => void loadData()} title="Tai lai du lieu">
                <RefreshCcw size={16} />
              </button>
              <button className="admin-primary-btn dark" onClick={handleResetDraft} disabled={loading || !snapshot}>
                <RefreshCcw size={16} /> Khoi phuc draft
              </button>
              <button className="admin-primary-btn" onClick={handleSaveDraft} disabled={loading || !draft || savingDraft || !hasDraftChanged}>
                <Save size={16} /> {savingDraft ? 'Dang luu...' : 'Luu nhap'}
              </button>
              <button className="admin-primary-btn" onClick={handlePublish} disabled={loading || publishing || !snapshot}>
                <UploadCloud size={16} /> {publishing ? 'Dang publish...' : 'Publish'}
              </button>
            </div>
          </div>

          {loading || !draft ? (
            <p className="admin-muted">Dang tai kich ban chatbot...</p>
          ) : (
            <div className="bot-ai-grid">
              <div className="bot-ai-editor">
                <div className="bot-ai-section">
                  <h3><MessageSquare size={16} /> Prompt chinh</h3>
                  <label>
                    Loi chao
                    <textarea
                      value={draft.welcomePrompt}
                      onChange={(e) => updateDraftField('welcomePrompt', e.target.value)}
                      rows={3}
                    />
                  </label>
                  <label>
                    Loi nhan khong hieu
                    <textarea
                      value={draft.unknownPrompt}
                      onChange={(e) => updateDraftField('unknownPrompt', e.target.value)}
                      rows={2}
                    />
                  </label>
                </div>

                <div className="bot-ai-section">
                  <h3>Quick actions</h3>
                  {QUICK_ACTION_ORDER.map((key) => (
                    <label key={key}>
                      {QUICK_ACTION_LABEL[key]}
                      <input
                        value={draft.quickActions.find((item) => item.key === key)?.label || ''}
                        onChange={(e) => updateQuickActionLabel(key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>

                <div className="bot-ai-section">
                  <h3>Flow prompts</h3>
                  <label>Yeu cau ma don<input value={draft.askOrderCodePrompt} onChange={(e) => updateDraftField('askOrderCodePrompt', e.target.value)} /></label>
                  <label>Yeu cau 4 so cuoi SDT<input value={draft.askOrderPhonePrompt} onChange={(e) => updateDraftField('askOrderPhonePrompt', e.target.value)} /></label>
                  <label>Sai 4 so SDT<input value={draft.orderPhoneInvalidPrompt} onChange={(e) => updateDraftField('orderPhoneInvalidPrompt', e.target.value)} /></label>
                  <label>Hoi tiep sau tra cuu don<input value={draft.orderLookupContinuePrompt} onChange={(e) => updateDraftField('orderLookupContinuePrompt', e.target.value)} /></label>
                  <label>Yeu cau chieu cao<input value={draft.askHeightPrompt} onChange={(e) => updateDraftField('askHeightPrompt', e.target.value)} /></label>
                  <label>Sai chieu cao<input value={draft.invalidHeightPrompt} onChange={(e) => updateDraftField('invalidHeightPrompt', e.target.value)} /></label>
                  <label>Yeu cau can nang<input value={draft.askWeightPrompt} onChange={(e) => updateDraftField('askWeightPrompt', e.target.value)} /></label>
                  <label>Sai can nang<input value={draft.invalidWeightPrompt} onChange={(e) => updateDraftField('invalidWeightPrompt', e.target.value)} /></label>
                  <label>Hoi tiep sau tu van size<input value={draft.sizeAdviceContinuePrompt} onChange={(e) => updateDraftField('sizeAdviceContinuePrompt', e.target.value)} /></label>
                  <label>Hoi tiep sau FAQ<input value={draft.productFaqContinuePrompt} onChange={(e) => updateDraftField('productFaqContinuePrompt', e.target.value)} /></label>
                </div>
              </div>

              <div className="bot-ai-preview">
                <h3>Preview (Published)</h3>
                <p className="admin-muted small">
                  Draft version: <strong>{snapshot?.draftMeta?.version || 0}</strong> |
                  Published version: <strong>{snapshot?.publishedMeta?.version || 0}</strong>
                </p>
                <div className="bot-ai-preview-card">
                  <p className="bot-ai-preview-title">Welcome</p>
                  <p>{snapshot?.published.welcomePrompt}</p>
                  <p className="bot-ai-preview-title">Quick actions</p>
                  <div className="bot-ai-keyword-wrap">
                    {snapshot?.published.quickActions.map((action) => (
                      <span key={action.key} className="admin-pill neutral">{action.label}</span>
                    ))}
                  </div>
                  <p className="bot-ai-preview-title">Unknown</p>
                  <p>{snapshot?.published.unknownPrompt}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>FAQ cho chatbot</h2>
              <p className="admin-muted">FAQ su dung module ContentPage. Match theo keywords da normalize.</p>
            </div>
            <button className="admin-primary-btn" onClick={() => openFaqEditor()}>
              <Plus size={16} /> Tao FAQ
            </button>
          </div>

          <div className="bot-ai-faq-layout">
            <div className="bot-ai-faq-list">
              {faqItems.length === 0 ? (
                <p className="admin-muted">Chua co FAQ.</p>
              ) : (
                faqItems.map((item) => (
                  <div key={item.id} className="bot-ai-faq-card">
                    <div className="bot-ai-faq-card-head">
                      <h4><FileText size={14} /> {item.title}</h4>
                      <div className="admin-actions">
                        <button className="admin-icon-btn subtle" onClick={() => openFaqEditor(item)} title="Sua FAQ">
                          <Pencil size={14} />
                        </button>
                        <button className="admin-icon-btn subtle danger-icon" onClick={() => void handleDeleteFaq(item.id)} title="Xoa FAQ">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="admin-muted">{item.body}</p>
                    <div className="bot-ai-keyword-wrap">
                      {(item.keywords || []).map((keyword) => (
                        <span key={`${item.id}-${keyword}`} className="admin-pill neutral">{keyword}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bot-ai-faq-editor">
              <h3>{faqForm.id ? 'Chinh sua FAQ' : 'FAQ moi'}</h3>
              <label>
                Tieu de
                <input
                  value={faqForm.title}
                  onChange={(e) => setFaqForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label>
                Noi dung tra loi
                <textarea
                  value={faqForm.body}
                  onChange={(e) => setFaqForm((prev) => ({ ...prev, body: e.target.value }))}
                  rows={6}
                />
              </label>
              <label>
                Keywords (tach boi dau phay hoac xuong dong)
                <textarea
                  value={faqForm.keywordsText}
                  onChange={(e) => setFaqForm((prev) => ({ ...prev, keywordsText: e.target.value }))}
                  rows={4}
                />
              </label>
              <div className="admin-topbar-actions">
                <button className="admin-primary-btn dark" onClick={() => setFaqForm(emptyFaqForm)}>
                  Lam moi form
                </button>
                <button className="admin-primary-btn" onClick={() => void handleSaveFaq()} disabled={savingFaq}>
                  <Save size={16} /> {savingFaq ? 'Dang luu...' : 'Luu FAQ'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminBotAI;

