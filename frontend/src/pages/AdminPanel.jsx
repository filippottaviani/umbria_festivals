import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import UmbriaLogo from '../components/UmbriaLogo';
import { fetchFestivals, getImageUrl } from '../services/api';
import PosterModal from '../components/PosterModal';
import { CATS, lookupLocationCoordinates } from '../constants';


const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:8000/api/v1/festivals`;
};

const API = getApiUrl();

const EMPTY_FORM = {
  name: '', city: '', province: 'PG', latitude: '', longitude: '',
  start_date: '', end_date: '', source_url: '', image_url: '',
  description: '', cultural_info: '', dish_info: '', menu_info: '', program_info: ''
};

const PROVINCE_CITIES = {
  PG: ['Perugia','Assisi','Gubbio','Foligno','Spoleto','Norcia','Colfiorito','Bevagna','Montefalco','Cannara',
       'Castiglione del Lago','Bettona','Sigillo','Fossato di Vico','Pietralunga','Balanzano','Pila','Pozzo',
       'Baiano','Cannaiola','Marsciano','Umbertide','Todi'],
  TR: ['Terni','Narni','Guardea','Montecastrilli','Orvieto','Amelia','Acquasparta','Massa Martana']
};

function FestivalFormModal({ festival, onClose, onSave }) {
  const [form, setForm] = useState(festival ? { ...festival, start_date: festival.start_date, end_date: festival.end_date } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      if (name === 'city' || name === 'description' || name === 'province') {
        const coords = lookupLocationCoordinates(next.city, next.description, next.province);
        if (coords) {
          next.latitude = coords.lat.toString();
          next.longitude = coords.lon.toString();
        }
      }
      return next;
    });
  };

  const handleGenerateAiDescription = async () => {
    setGeneratingAi(true);
    try {
      const res = await fetch(`${API}/generate-description-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, description: data.description }));
      }
    } catch {
      // quiet fallback
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      };
      const url = festival ? `${API}/${festival.id}` : `${API}/`;
      const method = festival ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Errore durante il salvataggio');
      }
      const saved = await res.json();
      onSave(saved, !!festival);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'name', label: 'Nome Evento', type: 'text', required: true, full: true },
    { key: 'city', label: 'Città / Borgo', type: 'text', required: true },
    { key: 'province', label: 'Provincia', type: 'select', options: ['PG','TR'], required: true },
    { key: 'latitude', label: 'Latitudine', type: 'number', step: '0.0001', required: true },
    { key: 'longitude', label: 'Longitudine', type: 'number', step: '0.0001', required: true },
    { key: 'start_date', label: 'Data Inizio', type: 'date', required: true },
    { key: 'end_date', label: 'Data Fine', type: 'date', required: true },
    { key: 'source_url', label: 'URL Sorgente', type: 'url', required: true, full: true },
    { key: 'image_url', label: 'URL Foto del Borgo', type: 'url', full: true },
    { key: 'description', label: 'Descrizione Evento (Testo Organico)', type: 'textarea', full: true, rows: 5 },
    { key: 'program_info', label: 'Programma & Concerti Giorno per Giorno', type: 'textarea', full: true, rows: 6 },
    { key: 'cultural_info', label: 'Storia e Cultura del Borgo', type: 'textarea', full: true, rows: 4 },
    { key: 'dish_info', label: 'Il Piatto Tipico', type: 'textarea', full: true, rows: 3 },
    { key: 'menu_info', label: 'Menù Gastronomico', type: 'textarea', full: true, rows: 6 },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel animate-fade-in">
        <div className="modal-header">
          <h2>{festival ? 'Modifica Sagra' : 'Nuova Sagra'}</h2>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <form onSubmit={handleSubmit} className="festival-form">
          <div className="form-grid">
            {fields.map(f => (
              <div key={f.key} className={`form-group ${f.full ? 'full' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <label style={{ margin: 0 }}>{f.label}{f.required && <span className="required">*</span>}</label>
                  {f.key === 'description' && (
                    <button
                      type="button"
                      className="btn-new"
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', gap: '4px', background: 'var(--cypress)', color: '#fff' }}
                      disabled={generatingAi}
                      onClick={handleGenerateAiDescription}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 14 }}>auto_awesome</span>
                      {generatingAi ? 'Generazione...' : 'Genera con AI'}
                    </button>
                  )}
                </div>
                {f.type === 'textarea' ? (
                  <textarea
                    name={f.key}
                    value={form[f.key] || ''}
                    onChange={handleChange}
                    rows={f.rows || 3}
                    placeholder={f.label}
                  />
                ) : f.type === 'select' ? (
                  <select name={f.key} value={form[f.key]} onChange={handleChange}>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    name={f.key}
                    value={form[f.key] || ''}
                    onChange={handleChange}
                    step={f.step}
                    required={f.required}
                    placeholder={f.label}
                  />
                )}
              </div>
            ))}
          </div>

          {form.image_url && (
            <div className="image-preview">
              <img src={form.image_url} alt="Anteprima" onError={e => e.target.style.display='none'} />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Annulla</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Salvataggio...' : festival ? 'Salva Modifiche' : 'Crea Sagra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ festival, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`${API}/${festival.id}`, { method: 'DELETE' });
      onConfirm(festival.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel modal-sm animate-fade-in">
        <div className="delete-modal-body">
          <div className="delete-icon">
            <span className="material-symbols-rounded" style={{ fontSize: '2rem', color: 'var(--sagrantino)' }}>warning</span>
          </div>
          <h3>Elimina Sagra</h3>
          <p>Stai per eliminare definitivamente <strong>{festival.name}</strong> a {festival.city}. Questa azione non è reversibile.</p>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Annulla</button>
            <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [festivals, setFestivals] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [pendingCities, setPendingCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sagre'); // 'sagre' | 'submissions' | 'borghi'
  const [search, setSearch] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'ongoing' | 'upcoming' | 'past'
  const [categoryFilter, setCategoryFilter] = useState('__all__');
  const [editTarget, setEditTarget] = useState(null);   // null=closed, 'new'=create, festival obj=edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [posterTarget, setPosterTarget] = useState(null);
  const [toast, setToast] = useState(null);


  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFestivals('');
      setFestivals(Array.isArray(data) ? data : []);
    } catch {
      showToast('Impossibile caricare le sagre', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch {
      // quiet fallback
    }
  }, []);

  const fetchPendingCities = useCallback(async () => {
    try {
      const res = await fetch(`${API}/festivals/cities/pending`);
      if (res.ok) {
        const data = await res.json();
        setPendingCities(data);
      }
    } catch {
      // quiet fallback
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchSubmissions();
    fetchPendingCities();
  }, [fetchAll, fetchSubmissions, fetchPendingCities]);

  const handleSave = (saved, isUpdate) => {
    if (isUpdate) {
      setFestivals(f => f.map(x => x.id === saved.id ? saved : x));
      showToast(`"${saved.name}" aggiornata con successo`);
    } else {
      setFestivals(f => [saved, ...f]);
      showToast(`"${saved.name}" creata con successo`);
    }
    setEditTarget(null);
  };

  const handleDelete = (id) => {
    setFestivals(f => f.filter(x => x.id !== id));
    setDeleteTarget(null);
    showToast('Sagra eliminata', 'error');
  };

  const handleImportSubmission = (sub) => {
    const coords = lookupLocationCoordinates(sub.city, sub.description || '', sub.province || 'PG');
    const draft = {
      name: sub.festival_name,
      city: sub.city,
      province: sub.province || 'PG',
      latitude: coords ? coords.lat.toString() : '43.1107',
      longitude: coords ? coords.lon.toString() : '12.3908',
      start_date: sub.start_date || '2026-08-01',
      end_date: sub.end_date || '2026-08-10',
      source_url: sub.official_link || `https://sagraumbra.it/eventi/${sub.festival_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      image_url: '',
      description: sub.description || '',
      cultural_info: '',
      dish_info: '',
      menu_info: sub.menu_info || '',
      program_info: sub.program_info || ''
    };
    setEditTarget(draft);
    setActiveTab('sagre');
    showToast(`Dati di "${sub.festival_name}" pronti per l'importazione`);
  };


  const inferCategory = (f) => {
    const h = `${f.name || ''} ${f.description || ''} ${f.menu_info || ''} ${f.city || ''}`.toLowerCase();
    if (/(tartufo|truffle)/.test(h)) return 'tartufo';
    if (/(pesce|baccalà|lago|giacchio)/.test(h)) return 'pesce';
    if (/(gnocchi|pasta|spaghetto|ciriola|umbrichell|tagliatella|ravioli|primi)/.test(h)) return 'pasta';
    if (/(porchetta|carne|griglia|salsiccia|prosciutto|salumi|arrosticini|maiale|oca|cinghiale)/.test(h)) return 'carne';
    if (/(salumi|norcina)/.test(h)) return 'salumi';
    if (/(orto|frutta|verdura|cipolla|patata|castagna|mela|asparagi|fungo|ortolano)/.test(h)) return 'orto';
    if (/(grano|pane|farro|focaccia|bruschetta|pizza|frittella|torta al testo)/.test(h)) return 'grano';
    if (/(storica|rievocazione|palio|medieval|gaite|duca|carbone)/.test(h)) return 'storica';
    return 'popolare';
  };

  const getStatus = (f) => {
    if (!f.start_date || !f.end_date) return 'upcoming';
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(f.start_date + 'T00:00:00');
    const end   = new Date(f.end_date + 'T23:59:59');
    if (start <= today && today <= end) return 'ongoing';
    if (today < start) return 'upcoming';
    return 'past';
  };

  const normalizedFestivals = festivals.map(f => ({
    ...f,
    cat: f.cat || inferCategory(f),
    status: getStatus(f)
  }));

  const filtered = normalizedFestivals.filter(f => {
    if (filterProvince && f.province?.toUpperCase() !== filterProvince.toUpperCase()) return false;
    if (categoryFilter !== '__all__' && f.cat !== categoryFilter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (search) {
      const hay = `${f.name || ''} ${f.city || ''}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const sortedFestivals = [...filtered].sort((a, b) => {
    const order = { ongoing: 1, upcoming: 2, past: 3 };
    if (order[a.status] !== order[b.status]) {
      return order[a.status] - order[b.status];
    }
    if (a.status === 'upcoming' || a.status === 'ongoing') {
      return new Date(a.start_date) - new Date(b.start_date);
    }
    return new Date(b.start_date) - new Date(a.start_date);
  });

  const counts = {
    all: festivals.length,
    ongoing: normalizedFestivals.filter(f => f.status === 'ongoing').length,
    upcoming: normalizedFestivals.filter(f => f.status === 'upcoming').length,
    past: normalizedFestivals.filter(f => f.status === 'past').length,
  };


  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric'}) : '—';

  const handleFixCoordinates = async () => {
    try {
      showToast('Allineamento coordinate sulla mappa in corso...');
      const res = await fetch(`${API}/fix-coordinates`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
        fetchAll();
      } else {
        showToast('Errore durante l\'allineamento delle coordinate', 'error');
      }
    } catch {
      showToast('Errore di connessione', 'error');
    }
  };

  const handleFixCovers = async () => {
    try {
      showToast('Scraping e miglioramento copertine in corso...');
      const res = await fetch(`${API}/fix-covers`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
        fetchAll();
      } else {
        showToast('Errore durante lo scraping delle copertine', 'error');
      }
    } catch {
      showToast('Errore di connessione', 'error');
    }
  };

  const handleResolveCity = async (cityName, wikiSummary, wikiUrl) => {
    try {
      const res = await fetch(`${API}/festivals/cities/${encodeURIComponent(cityName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wiki_summary: wikiSummary, wiki_url: wikiUrl })
      });
      if (res.ok) {
        showToast(`Borgo ${cityName} risolto!`);
        fetchPendingCities();
      } else {
        showToast('Errore nel risolvere il borgo', 'error');
      }
    } catch {
      showToast('Errore di connessione', 'error');
    }
  };
  return (
    <div className="admin-shell">
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>}

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <UmbriaLogo size={22} />
          <span>Sagra Umbra</span>
        </div>
        <nav className="admin-nav">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'sagre' ? 'active' : ''}`}
            onClick={() => setActiveTab('sagre')}
          >
            <span className="material-symbols-rounded">table_rows</span>
            Sagre ({festivals.length})
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'submissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('submissions')}
          >
            <span className="material-symbols-rounded">campaign</span>
            Segnalazioni ({submissions.length})
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'borghi' ? 'active' : ''}`}
            onClick={() => setActiveTab('borghi')}
          >
            <span className="material-symbols-rounded">location_city</span>
            Borghi ({pendingCities.length})
          </button>
          <Link to="/" className="admin-nav-item">
            <span className="material-symbols-rounded">grid_view</span>
            Sito Pubblico
          </Link>
          <Link to="/mappa" className="admin-nav-item">
            <span className="material-symbols-rounded">map</span>
            Mappa Sagre
          </Link>
          <Link to="/calendario" className="admin-nav-item">
            <span className="material-symbols-rounded">calendar_month</span>
            Calendario
          </Link>

        </nav>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-num">{festivals.length}</div>
            <div className="stat-label">Totale Sagre</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{submissions.length}</div>
            <div className="stat-label">Segnalazioni</div>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Bar for Admin */}
      <div className="admin-mobile-nav">
        <div className="admin-mobile-header">
          <div className="admin-brand">
            <UmbriaLogo size={20} />
            <span>Admin</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ThemeToggle />
            <Link to="/" className="btn-action" title="Torna al sito">
              <span className="material-symbols-rounded">arrow_back</span>
            </Link>
          </div>
        </div>
        <div className="admin-mobile-tabs">
          <button
            type="button"
            className={`admin-mobile-tab ${activeTab === 'sagre' ? 'active' : ''}`}
            onClick={() => setActiveTab('sagre')}
          >
            <span className="material-symbols-rounded">table_rows</span>
            Sagre ({festivals.length})
          </button>
          <button
            type="button"
            className={`admin-mobile-tab ${activeTab === 'submissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('submissions')}
          >
            <span className="material-symbols-rounded">campaign</span>
            Segnalazioni ({submissions.length})
          </button>
          <button
            type="button"
            className={`admin-mobile-tab ${activeTab === 'borghi' ? 'active' : ''}`}
            onClick={() => setActiveTab('borghi')}
          >
            <span className="material-symbols-rounded">location_city</span>
            Borghi ({pendingCities.length})
          </button>
        </div>
      </div>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1 className="admin-title">
              {activeTab === 'sagre' ? 'Gestione Sagre' : 'Segnalazioni Ricevute'}
            </h1>
            <p className="admin-subtitle">
              {activeTab === 'sagre'
                ? 'Visualizza, aggiungi, modifica ed elimina tutte le sagre'
                : 'Segnalazioni inviate da gestori ed utenti (notificate a sagraumbra@gmail.com)'}
            </p>
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-topbar-theme"><ThemeToggle /></div>
            {activeTab === 'sagre' && (
              <>
                <button
                  className="btn-new"
                  style={{ background: 'var(--travertino)', color: 'var(--antracite)', border: '1px solid var(--border-subtle)' }}
                  onClick={handleFixCovers}
                  title="Scrape e scarica locandine e copertine autentiche per le sagre"
                >
                  <span className="material-symbols-rounded" style={{ color: '#D97706' }}>image</span>
                  Scrape Copertine
                </button>
                <button
                  className="btn-new"
                  style={{ background: 'var(--travertino)', color: 'var(--antracite)', border: '1px solid var(--border-subtle)' }}
                  onClick={handleFixCoordinates}
                  title="Verifica ed allinea la posizione sulla mappa per tutte le sagre"
                >
                  <span className="material-symbols-rounded" style={{ color: 'var(--cypress)' }}>pin_drop</span>
                  Allinea Mappa
                </button>
              </>
            )}

            <button className="btn-new" onClick={() => setEditTarget('new')}>
              <span className="material-symbols-rounded">add</span>
              Nuova Sagra
            </button>
          </div>
        </div>

        {activeTab === 'submissions' ? (
          <div className="admin-table-wrap" style={{ padding: '1.5rem' }}>
            {submissions.length === 0 ? (
              <div className="empty-reviews-state">
                <span className="material-symbols-rounded" style={{ fontSize: 36, color: 'var(--antracite-3)' }}>campaign</span>
                <p>Ancora nessuna segnalazione ricevuta da gestori ed utenti.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {submissions.map(sub => (
                  <div key={sub.id} className="review-feed-item" style={{ background: 'var(--white)' }}>
                    <div className="review-feed-header">
                      <div className="author-info">
                        <span className="prov-badge" style={{ textTransform: 'uppercase', background: 'var(--cypress)', color: '#fff' }}>
                          {sub.submitter_role}
                        </span>
                        <div>
                          <div className="author-name" style={{ fontSize: '1.05rem' }}>{sub.festival_name}</div>
                          <div className="review-date">{sub.city} ({sub.province}) • Date: {sub.start_date || 'N/D'} - {sub.end_date || 'N/D'}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-new"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                        onClick={() => handleImportSubmission(sub)}
                      >
                        <span className="material-symbols-rounded">download</span>
                        Importa nei Dati Sagra
                      </button>
                    </div>

                    <div style={{ fontSize: '0.88rem', color: 'var(--antracite-2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                      <div>
                        <strong>Contatto Referente:</strong> {sub.contact_email} {sub.contact_phone ? `• Tel: ${sub.contact_phone}` : ''}
                      </div>
                      {sub.official_link && (
                        <div>
                          <strong>Link Ufficiale:</strong> <a href={sub.official_link} target="_blank" rel="noreferrer">{sub.official_link}</a>
                        </div>
                      )}
                    </div>

                    {sub.program_info && (
                      <div style={{ marginTop: '0.5rem', background: 'var(--travertino)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontWeight: 700, color: 'var(--cypress)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                          🎵 PROGRAMMA & CONCERTI GIORNO PER GIORNO:
                        </div>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '0.88rem' }}>{sub.program_info}</div>
                      </div>
                    )}

                    {sub.menu_info && (
                      <div style={{ marginTop: '0.5rem', background: 'var(--travertino)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontWeight: 700, color: 'var(--sagrantino)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                          🍴 MENÙ & GASTRONOMIA:
                        </div>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '0.88rem' }}>{sub.menu_info}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'borghi' ? (
          <div className="admin-table-wrap" style={{ padding: '1.5rem' }}>
            {pendingCities.length === 0 ? (
              <div className="empty-reviews-state">
                <span className="material-symbols-rounded" style={{ fontSize: 36, color: 'var(--cypress)' }}>check_circle</span>
                <p>Nessun borgo da revisionare. Tutte le informazioni da Wikipedia sono corrette!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p>I seguenti borghi non hanno trovato un riscontro esatto su Wikipedia o sono pagine di disambiguazione. Inserisci il link e un piccolo riassunto testuale per confermarli.</p>
                {pendingCities.map(city => (
                  <form 
                    key={city.name} 
                    className="review-feed-item" 
                    style={{ background: 'var(--white)' }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleResolveCity(city.name, e.target.wiki_summary.value, e.target.wiki_url.value);
                    }}
                  >
                    <div className="review-feed-header" style={{ marginBottom: '1rem' }}>
                      <div className="author-info">
                        <span className="prov-badge" style={{ background: 'var(--sagrantino)', color: '#fff' }}>
                          DA REVISIONARE
                        </span>
                        <div>
                          <div className="author-name" style={{ fontSize: '1.1rem' }}>{city.name}</div>
                          <div className="review-date">Provincia: {city.province} • Stato: {city.status}</div>
                        </div>
                      </div>
                      <button type="submit" className="btn-new" style={{ background: 'var(--cypress)', color: '#fff' }}>
                        <span className="material-symbols-rounded">save</span>
                        Salva e Risolvi
                      </button>
                    </div>
                    <div className="form-group">
                      <label>Link pagina Wikipedia (URL)</label>
                      <input name="wiki_url" type="url" placeholder="https://it.wikipedia.org/wiki/..." required defaultValue={city.wiki_url || ''} />
                    </div>
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label>Testo Riassuntivo (Summary)</label>
                      <textarea name="wiki_summary" rows="4" placeholder="Copia qui le prime due frasi della pagina Wikipedia..." required defaultValue={city.wiki_summary || ''}></textarea>
                    </div>
                  </form>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* STATUS AND CATEGORY FILTERS */}
            <div className="admin-filters-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`provincia-chip ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  Tutte ({counts.all})
                </button>
                <button
                  type="button"
                  className={`provincia-chip ${statusFilter === 'ongoing' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('ongoing')}
                  style={statusFilter === 'ongoing' ? { background: '#10B981', color: '#fff' } : {}}
                >
                  <span className="item-live-dot" style={{ display: 'inline-block', marginRight: '4px' }} />
                  In Corso ({counts.ongoing})
                </button>
                <button
                  type="button"
                  className={`provincia-chip ${statusFilter === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('upcoming')}
                >
                  Prossime ({counts.upcoming})
                </button>
                <button
                  type="button"
                  className={`provincia-chip ${statusFilter === 'past' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('past')}
                >
                  Passate ({counts.past})
                </button>
              </div>

              <div className="admin-filters">
                <input
                  className="admin-search"
                  type="text"
                  placeholder="Cerca per nome o borgo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="__all__">Tutte le Categorie</option>
                  {Object.entries(CATS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>

                <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)}>
                  <option value="">Tutte le Province</option>
                  <option value="PG">Perugia (PG)</option>
                  <option value="TR">Terni (TR)</option>
                </select>

                <span className="results-count">{sortedFestivals.length} risultati</span>
              </div>
            </div>

            {loading ? (
              <div className="admin-loading"><div className="spinner" /></div>
            ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Evento</th>
                  <th>Borgo</th>
                  <th>Prov.</th>
                  <th>Date</th>
                  <th>Info & Genere</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sortedFestivals.map(f => {
                  const ongoing = f.status === 'ongoing';
                  const past = f.status === 'past';
                  const catLabel = CATS[f.cat]?.label || 'Popolare';

                  return (
                    <tr key={f.id} className={past ? 'row-past' : ''}>
                      <td>
                        <div className="table-thumb">
                          {f.image_url
                            ? <img src={getImageUrl(f.image_url)} alt={f.city} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                            : null}
                          <div className="thumb-placeholder" style={{ display: f.image_url ? 'none' : 'flex' }}>
                            <span className="material-symbols-rounded">image</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-name">{f.name}</div>
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', alignItems: 'center' }}>
                          {ongoing && <span className="badge-ongoing">In corso</span>}
                          {past && <span className="badge-past">Passata</span>}
                          {!ongoing && !past && <span className="badge-ongoing" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#2563EB' }}>Prossimamente</span>}
                        </div>
                      </td>
                      <td className="table-city">{f.city}</td>
                      <td><span className="prov-badge">{f.province}</span></td>
                      <td className="table-dates">
                        {fmt(f.start_date)}<span className="date-sep">–</span>{fmt(f.end_date)}
                      </td>
                      <td>
                        <div className="info-pills">
                          <span className="info-pill" style={{ background: 'var(--travertino-2)', fontWeight: 700 }}>{catLabel}</span>
                          {f.description && <span className="info-pill">Desc</span>}
                          {f.menu_info && <span className="info-pill">Menù</span>}
                          {f.cultural_info && <span className="info-pill">Cultura</span>}
                          {f.image_url && <span className="info-pill">Foto</span>}
                        </div>
                      </td>
                      <td>
                        <div className="action-btns">
                          <Link to={`/festival/${f.id}`} target="_blank" className="btn-action btn-view" title="Visualizza">
                            <span className="material-symbols-rounded">open_in_new</span>
                          </Link>
                          <button className="btn-action btn-edit" onClick={() => setPosterTarget(f)} title="Carica / Modifica Locandina">
                            <span className="material-symbols-rounded" style={{ color: 'var(--primary, #059669)' }}>add_photo_alternate</span>
                          </button>
                          <button className="btn-action btn-edit" onClick={() => setEditTarget(f)} title="Modifica Dati">
                            <span className="material-symbols-rounded">edit</span>
                          </button>
                          <button className="btn-action btn-del" onClick={() => setDeleteTarget(f)} title="Elimina">
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedFestivals.length === 0 && (
                  <tr><td colSpan={7} className="empty-row">Nessuna sagra trovata con questi filtri.</td></tr>
                )}
              </tbody>

            </table>
          </div>
        )}
        </>
        )}
      </main>

      {/* Modals */}
      {editTarget && (
        <FestivalFormModal
          festival={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          festival={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
      {posterTarget && (
        <PosterModal
          festival={posterTarget}
          onClose={() => setPosterTarget(null)}
          onUpdated={(updated) => {
            setFestivals(prev => prev.map(item => item.id === updated.id ? updated : item));
            showToast('Locandina aggiornata con successo!', 'success');
          }}
        />
      )}
    </div>
  );
}
