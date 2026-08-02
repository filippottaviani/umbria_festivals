import React, { useState } from 'react';
import { uploadFestivalPoster, updateFestival, getImageUrl } from '../services/api';

export default function PosterModal({ festival, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' or 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(festival.image_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Seleziona un file immagine valido (JPG, PNG, WEBP, SVG, GIF).');
        return;
      }
      setError(null);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let updatedData;
      if (activeTab === 'file') {
        if (!selectedFile) {
          setError('Seleziona un file prima di salvare.');
          setSaving(false);
          return;
        }
        updatedData = await uploadFestivalPoster(festival.id, selectedFile);
      } else {
        updatedData = await updateFestival(festival.id, { image_url: imageUrl.trim() });
      }
      onUpdated(updatedData);
      onClose();
    } catch (err) {
      console.error('Errore durante il salvataggio della locandina:', err);
      setError('Errore durante il salvataggio. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPoster = async () => {
    if (!window.confirm('Vuoi davvero ripristinare la locandina predefinita?')) return;
    setSaving(true);
    try {
      const updatedData = await updateFestival(festival.id, { image_url: null });
      onUpdated(updatedData);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Errore durante il ripristino.');
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = activeTab === 'file' ? filePreview : getImageUrl(imageUrl);

  return (
    <div className="modal-overlay animate-fade-in" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
    }}>
      <div className="modal-card" style={{
        background: 'var(--card-bg, #ffffff)', color: 'var(--text-main, #1e293b)',
        borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '1.75rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '1.25rem'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '0.85rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--primary, #059669)' }}>add_photo_alternate</span>
            Modifica Locandina
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub, #64748b)', padding: '4px' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-sub, #64748b)' }}>
          Carica una locandina ufficiale per <strong>{festival.name}</strong> ({festival.city}).
        </p>

        {/* Tab Selection */}
        <div style={{ display: 'flex', background: 'var(--bg-subtle, #f1f5f9)', borderRadius: '10px', padding: '4px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            style={{
              flex: 1, padding: '8px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              backgroundColor: activeTab === 'file' ? 'var(--card-bg, #ffffff)' : 'transparent',
              color: activeTab === 'file' ? 'var(--primary, #059669)' : 'var(--text-sub, #64748b)',
              boxShadow: activeTab === 'file' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>upload_file</span>
            Carica File dal PC
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            style={{
              flex: 1, padding: '8px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              backgroundColor: activeTab === 'url' ? 'var(--card-bg, #ffffff)' : 'transparent',
              color: activeTab === 'url' ? 'var(--primary, #059669)' : 'var(--text-sub, #64748b)',
              boxShadow: activeTab === 'url' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>link</span>
            Link URL Web
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.65rem 1rem', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.85rem', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {/* Input Controls */}
        {activeTab === 'file' ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Seleziona Immagine Locandina:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                display: 'block', width: '100%', padding: '0.5rem', borderRadius: '8px',
                border: '1px solid var(--border-subtle, #cbd5e1)', fontSize: '0.88rem', background: 'var(--bg-subtle, #f8fafc)'
              }}
            />
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Indirizzo URL dell'immagine locandina:
            </label>
            <input
              type="url"
              placeholder="https://esempio.it/locandina.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-subtle, #cbd5e1)',
                fontSize: '0.9rem', outline: 'none', background: 'var(--bg-subtle, #f8fafc)', color: 'inherit'
              }}
            />
          </div>
        )}

        {/* Live Preview */}
        {previewSrc && (
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-sub, #64748b)', marginBottom: '0.4rem' }}>
              Anteprima Locandina:
            </label>
            <div style={{
              width: '100%', maxHeight: '220px', borderRadius: '10px', overflow: 'hidden',
              background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border-subtle, #cbd5e1)'
            }}>
              <img
                src={previewSrc}
                alt="Anteprima locandina"
                style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle, #e2e8f0)' }}>
          <button
            type="button"
            onClick={handleResetPoster}
            disabled={saving}
            style={{
              padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'transparent',
              color: '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Ripristina Foto Borgo
          </button>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '0.6rem 1.1rem', borderRadius: '8px', border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'transparent', color: 'inherit', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '0.6rem 1.3rem', borderRadius: '8px', border: 'none',
                background: 'var(--primary, #059669)', color: '#ffffff', fontSize: '0.88rem', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>check</span>
                  Salva Locandina
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
