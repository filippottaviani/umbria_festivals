import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitFestivalInfo } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const SUBMIT_BREADCRUMB_SCHEMA = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://sagraumbra.it/"
        },
        {
            "@type": "ListItem",
            "position": 2,
            "name": "Segnala Sagra",
            "item": "https://sagraumbra.it/segnala-sagra"
        }
    ]
};


export default function SubmitFestival() {
    const [role, setRole] = useState('gestore'); // 'gestore', 'pro_loco', 'utente'
    const [formData, setFormData] = useState({
        festival_name: '',
        city: '',
        province: 'PG',
        start_date: '',
        end_date: '',
        program_info: '',
        menu_info: '',
        description: '',
        contact_email: '',
        contact_phone: '',
        official_link: '',
        additional_notes: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.festival_name.trim() || !formData.city.trim() || !formData.contact_email.trim()) {
            setSubmitError('Compila tutti i campi obbligatori (*).');
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');
        try {
            await submitFestivalInfo({
                ...formData,
                submitter_role: role
            });
            setSubmitSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
            setSubmitError('Impossibile inviare la segnalazione via API. Puoi comunque inviarla direttamente alla nostra email usando il pulsante in basso.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getMailtoLink = () => {
        const subject = encodeURIComponent(`[Segnalazione Sagra] ${formData.festival_name || 'Nuova Sagra'} (${formData.city || 'Umbria'})`);
        const body = encodeURIComponent(
`Ruolo: ${role.toUpperCase()}
Nome Sagra: ${formData.festival_name}
Comune: ${formData.city} (${formData.province})
Date: ${formData.start_date} - ${formData.end_date}

PROGRAMMA & CONCERTI GIORNO PER GIORNO:
${formData.program_info}

MENÙ E GASTRONOMIA:
${formData.menu_info}

DESCRIZIONE ED EVENTI:
${formData.description}

CONTATTI REFERENTE:
Email: ${formData.contact_email}
Telefono: ${formData.contact_phone}
Sito/Social: ${formData.official_link}

NOTE / LOCANDINA:
${formData.additional_notes}`
        );
        return `mailto:sagraumbra@gmail.com?subject=${subject}&body=${body}`;
    };

    return (
        <div className="submit-festival-page animate-fade-in">
            <SEO
                title="Segnala una Sagra — Inserisci la tua Festa Popolare"
                description="Sei una Pro Loco o un comitato organizzatore? Segnala gratuitamente la tua sagra o festa nei borghi dell'Umbria: programma, menù e locandina."
                canonical="https://sagraumbra.it/segnala-sagra"
                schema={SUBMIT_BREADCRUMB_SCHEMA}
            />
            <Navbar />


            {/* ── HEADER ── */}
            <div className="submit-header">
                <div className="submit-header-inner">
                    <span className="material-symbols-rounded header-icon">campaign</span>
                    <h1>Segnala o Aggiorna una Sagra</h1>
                    <p>
                        Sei un gestore, una Pro Loco o un visitatore? Invia le informazioni, il menù e il programma con i concerti giorno per giorno. La tua segnalazione verrà inviata a <strong>sagraumbra@gmail.com</strong>.
                    </p>
                </div>
            </div>

            {/* ── MAIN CONTAINER ── */}
            <div className="submit-container">

                {submitSuccess ? (
                    <div className="submit-success-card">
                        <span className="material-symbols-rounded success-icon">check_circle</span>
                        <h2>Segnalazione Inviata con Successo!</h2>
                        <p>
                            Grazie per il tuo contributo. La tua segnalazione è stata registrata e notificata a <strong>sagraumbra@gmail.com</strong>.
                        </p>
                        <p style={{ fontSize: '0.88rem', color: 'var(--antracite-3)', marginTop: '0.5rem' }}>
                            I dettagli della tua sagra (menù e programma concerti) verranno verificati ed inseriti sul portale Sagra Umbra.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                            <button
                                type="button"
                                className="btn-secondary-action"
                                onClick={() => {
                                    setSubmitSuccess(false);
                                    setFormData({
                                        festival_name: '', city: '', province: 'PG', start_date: '', end_date: '',
                                        program_info: '', menu_info: '', description: '', contact_email: '',
                                        contact_phone: '', official_link: '', additional_notes: ''
                                    });
                                }}
                            >
                                Invia un'altra segnalazione
                            </button>
                            <Link to="/" className="btn-primary-action">
                                Torna alla lista sagre
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="submit-form-card">
                        
                        {/* Selector Ruolo */}
                        <div className="role-selector-box">
                            <label className="role-selector-label">Chi sta inviando le informazioni?</label>
                            <div className="role-buttons">
                                <button
                                    type="button"
                                    className={`role-btn ${role === 'gestore' ? 'active' : ''}`}
                                    onClick={() => setRole('gestore')}
                                >
                                    <span className="material-symbols-rounded">storefront</span>
                                    Gestore / Comitato Organizzatore
                                </button>
                                <button
                                    type="button"
                                    className={`role-btn ${role === 'pro_loco' ? 'active' : ''}`}
                                    onClick={() => setRole('pro_loco')}
                                >
                                    <span className="material-symbols-rounded">diversity_3</span>
                                    Pro Loco / Associazione
                                </button>
                                <button
                                    type="button"
                                    className={`role-btn ${role === 'utente' ? 'active' : ''}`}
                                    onClick={() => setRole('utente')}
                                >
                                    <span className="material-symbols-rounded">person</span>
                                    Visitatore / Utente
                                </button>
                            </div>
                        </div>

                        {submitError && (
                            <div className="alert-error-box">
                                <span className="material-symbols-rounded">error</span>
                                <div>
                                    <div>{submitError}</div>
                                    <a
                                        href={getMailtoLink()}
                                        className="btn-mailto-fallback"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontWeight: 700 }}
                                    >
                                        <span className="material-symbols-rounded">mail</span>
                                        Invia via Email Client a sagraumbra@gmail.com
                                    </a>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="submit-form">
                            
                            {/* Sezione 1: Dati Generali */}
                            <div className="form-section">
                                <div className="form-section-title">
                                    <span className="material-symbols-rounded">festival</span>
                                    <h3>1. Informazioni Generali Sagra</h3>
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group full">
                                        <label htmlFor="festival_name" className="form-label">Nome della Sagra / Evento *</label>
                                        <input
                                            id="festival_name"
                                            name="festival_name"
                                            type="text"
                                            className="form-input"
                                            placeholder="Es. Sagra del Tartufo e dei Prodotti Tipici"
                                            value={formData.festival_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="city" className="form-label">Comune / Località *</label>
                                        <input
                                            id="city"
                                            name="city"
                                            type="text"
                                            className="form-input"
                                            placeholder="Es. Spoleto (frazione Baiano)"
                                            value={formData.city}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="province" className="form-label">Provincia *</label>
                                        <select
                                            id="province"
                                            name="province"
                                            className="form-select"
                                            value={formData.province}
                                            onChange={handleChange}
                                        >
                                            <option value="PG">Perugia (PG)</option>
                                            <option value="TR">Terni (TR)</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="start_date" className="form-label">Data Inizio Sagra</label>
                                        <input
                                            id="start_date"
                                            name="start_date"
                                            type="date"
                                            className="form-input"
                                            value={formData.start_date}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="end_date" className="form-label">Data Fine Sagra</label>
                                        <input
                                            id="end_date"
                                            name="end_date"
                                            type="date"
                                            className="form-input"
                                            value={formData.end_date}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sezione 2: Programma & Concerti Giorno per Giorno */}
                            <div className="form-section">
                                <div className="form-section-title">
                                    <span className="material-symbols-rounded" style={{ color: 'var(--fork-active, #D97706)' }}>Music_Note</span>
                                    <h3>2. Programma & Concerti Giorno per Giorno</h3>
                                </div>
                                <p className="section-help-text">
                                    Indica gli eventi che si tengono ogni giorno della sagra (es. date, orchestra, concerti dal vivo, DJ set, spettacoli pirotecnici, giochi storici).
                                </p>

                                <div className="form-group full">
                                    <textarea
                                        id="program_info"
                                        name="program_info"
                                        className="form-textarea"
                                        rows={6}
                                        placeholder={`Esempio di compilazione programma:
• Venerdì 8 Agosto: Ore 21:00 Concerto dal vivo con la cover band Rock
• Sabato 9 Agosto: Ore 21:30 Spettacolo e serata danzante con l'Orchestra Italiana
• Domenica 10 Agosto: Ore 18:00 Corteo storico medievale, Ore 21:00 DJ Set sotto le stelle e Spettacolo Pirotecnico`}
                                        value={formData.program_info}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Sezione 3: Menù e Gastronomia */}
                            <div className="form-section">
                                <div className="form-section-title">
                                    <span className="material-symbols-rounded" style={{ color: 'var(--cypress)' }}>restaurant_menu</span>
                                    <h3>3. Menù e Gastronomia</h3>
                                </div>
                                <p className="section-help-text">
                                    Elenca i primi piatti tipici, i secondi alla griglia, i dolci e le specialità tradizionali offerte negli stand gastronomici.
                                </p>

                                <div className="form-group full">
                                    <textarea
                                        id="menu_info"
                                        name="menu_info"
                                        className="form-textarea"
                                        rows={6}
                                        placeholder={`Esempio di menù:
Primi Piatti:
- Strangozzi al Tartufo Nero di Norcia
- Penne alla Norcina con salsiccia e panna

Secondi Piatti & Grigliate:
- Salsicce ed arrosticini alla brace
- Agnello a scottadito con erbe aromatiche

Dolci e Vini:
- Torta al testo tradizionale con prosciutto e stracchino
- Rocciata di Assisi e Vino Sagrantino DOCG`}
                                        value={formData.menu_info}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Sezione 4: Descrizione Generale */}
                            <div className="form-section">
                                <div className="form-section-title">
                                    <span className="material-symbols-rounded">description</span>
                                    <h3>4. Descrizione dell'Evento</h3>
                                </div>

                                <div className="form-group full">
                                    <textarea
                                        id="description"
                                        name="description"
                                        className="form-textarea"
                                        rows={4}
                                        placeholder="Racconta la storia della sagra, l'atmosfera del borgo, la presenza di stand al coperto, parcheggi e servizi disponibili..."
                                        value={formData.description}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Sezione 5: Contatti del Referente */}
                            <div className="form-section">
                                <div className="form-section-title">
                                    <span className="material-symbols-rounded">contact_mail</span>
                                    <h3>5. Contatti del Referente & Link</h3>
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label htmlFor="contact_email" className="form-label">Email di Contatto *</label>
                                        <input
                                            id="contact_email"
                                            name="contact_email"
                                            type="email"
                                            className="form-input"
                                            placeholder="tua-email@esempio.it"
                                            value={formData.contact_email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="contact_phone" className="form-label">Numero di Telefono (opzionale)</label>
                                        <input
                                            id="contact_phone"
                                            name="contact_phone"
                                            type="tel"
                                            className="form-input"
                                            placeholder="Es. 339 1234567"
                                            value={formData.contact_phone}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="official_link" className="form-label">Sito Web o Pagina Facebook (opzionale)</label>
                                        <input
                                            id="official_link"
                                            name="official_link"
                                            type="url"
                                            className="form-input"
                                            placeholder="https://facebook.com/miasagra"
                                            value={formData.official_link}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="additional_notes" className="form-label">Link Locandina o Note Aggiuntive</label>
                                        <input
                                            id="additional_notes"
                                            name="additional_notes"
                                            type="text"
                                            className="form-input"
                                            placeholder="Link all'immagine della locandina o note per la redazione"
                                            value={formData.additional_notes}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit bar */}
                            <div className="submit-form-actions">
                                <a
                                    href={getMailtoLink()}
                                    className="btn-mailto-direct"
                                    title="Invia tramite la tua applicazione email predefinita"
                                >
                                    <span className="material-symbols-rounded">mail</span>
                                    Invia via email a sagraumbra@gmail.com
                                </a>

                                <button
                                    type="submit"
                                    className="btn-submit-main"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-sm" />
                                            Invio in corso...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-rounded">send</span>
                                            Invia Segnalazione Sagra
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
