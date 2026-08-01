import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import UmbriaLogo from '../components/UmbriaLogo';

const API = 'http://localhost:8000/api/v1/festivals';

const EMPTY_FORM = {
  name: '', city: '', province: 'PG', latitude: '', longitude: '',
  start_date: '', end_date: '', source_url: '', image_url: '',
  description: '', cultural_info: '', dish_info: '', menu_info: ''
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
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
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
    { key: 'description', label: 'Descrizione Evento', type: 'textarea', full: true, rows: 4 },
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
                <label>{f.label}{f.required && <span className="required">*</span>}</label>
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [editTarget, setEditTarget] = useState(null);   // null=closed, 'new'=create, festival obj=edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // fetch all: override the year filter by using a dedicated admin endpoint
      const res = await fetch(`${API}/?province=`);
      const data = await res.json();
      setFestivals(data);
    } catch {
      showToast('Impossibile caricare le sagre', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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

  const filtered = festivals.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.city.toLowerCase().includes(search.toLowerCase());
    const matchProv = !filterProvince || f.province === filterProvince;
    return matchSearch && matchProv;
  });

  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric'}) : '—';

  return (
    <div className="admin-shell">
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>}

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <UmbriaLogo size={22} />
          <span>Sagra Umbra</span>
        </div>
        <nav className="admin-nav">
          <a href="/admin" className="admin-nav-item active">
            <span className="material-symbols-rounded">table_rows</span>
            Sagre
          </a>
          <Link to="/" className="admin-nav-item">
            <span className="material-symbols-rounded">open_in_new</span>
            Sito Pubblico
          </Link>
        </nav>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-num">{festivals.length}</div>
            <div className="stat-label">Totale</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{festivals.filter(f => f.province === 'PG').length}</div>
            <div className="stat-label">Perugia</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{festivals.filter(f => f.province === 'TR').length}</div>
            <div className="stat-label">Terni</div>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1 className="admin-title">Gestione Sagre</h1>
            <p className="admin-subtitle">Visualizza, aggiungi, modifica ed elimina tutte le sagre</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ThemeToggle />
            <button className="btn-new" onClick={() => setEditTarget('new')}>
              <span className="material-symbols-rounded">add</span>
              Nuova Sagra
            </button>
          </div>
        </div>

        <div className="admin-filters">
          <input
            className="admin-search"
            type="text"
            placeholder="Cerca per nome o borgo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)}>
            <option value="">Tutte le Province</option>
            <option value="PG">Perugia (PG)</option>
            <option value="TR">Terni (TR)</option>
          </select>
          <span className="results-count">{filtered.length} risultati</span>
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
                  <th>Info</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const today = new Date();
                  const start = new Date(f.start_date + 'T00:00:00');
                  const end = new Date(f.end_date + 'T00:00:00');
                  const ongoing = today >= start && today <= end;
                  const past = today > end;

                  return (
                    <tr key={f.id} className={past ? 'row-past' : ''}>
                      <td>
                        <div className="table-thumb">
                          {f.image_url
                            ? <img src={f.image_url} alt={f.city} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                            : null}
                          <div className="thumb-placeholder" style={{ display: f.image_url ? 'none' : 'flex' }}>
                            <span className="material-symbols-rounded">image</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-name">{f.name}</div>
                        {ongoing && <span className="badge-ongoing">In corso</span>}
                        {past && <span className="badge-past">Passata</span>}
                      </td>
                      <td className="table-city">{f.city}</td>
                      <td><span className="prov-badge">{f.province}</span></td>
                      <td className="table-dates">
                        {fmt(f.start_date)}<span className="date-sep">–</span>{fmt(f.end_date)}
                      </td>
                      <td>
                        <div className="info-pills">
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
                          <button className="btn-action btn-edit" onClick={() => setEditTarget(f)} title="Modifica">
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
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="empty-row">Nessuna sagra trovata</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
