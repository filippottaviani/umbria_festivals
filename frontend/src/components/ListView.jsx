import React from 'react';
import { CATS, MESI, MESI_LUNGHI } from '../constants';

const ListView = ({ festivals }) => {
    if (festivals.length === 0) {
        return <div className="empty">Nessuna sagra corrisponde ai filtri scelti.</div>;
    }

    // Ordina per data
    const sorted = [...festivals].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    
    let curMonth = -1;
    let curYear = -1;
    const elements = [];

    sorted.forEach(s => {
        const ds = new Date(s.start_date);
        const de = new Date(s.end_date);
        const cat = CATS[s.cat] || CATS['popolare'];

        if (ds.getMonth() !== curMonth || ds.getFullYear() !== curYear) {
            curMonth = ds.getMonth();
            curYear = ds.getFullYear();
            elements.push(
                <div key={`month-${curYear}-${curMonth}`} className="month-head">
                    {MESI_LUNGHI[curMonth]} {curYear}
                </div>
            );
        }

        elements.push(
            <div key={s.id} className="card">
                <div className="datecol">
                    <div className="d1">{ds.getDate()}</div>
                    <div className="m1">{MESI[ds.getMonth()]}</div>
                    {s.start_date !== s.end_date && (
                        <div className="span2">→ {de.getDate()} {MESI[de.getMonth()]}</div>
                    )}
                </div>
                <div className="catbar" style={{ background: cat.hex }}></div>
                <div className="cardbody">
                    <div className="cardtop">
                        <span className="cardtitle">{s.name}</span>
                        <span className="badge" style={{ background: cat.hex }}>{cat.label}</span>
                    </div>
                    <div className="place">{s.city} ({s.province})</div>
                    <div className="desc">{s.desc || "Maggiori dettagli sul sito ufficiale."}</div>
                </div>
            </div>
        );
    });

    return <div>{elements}</div>;
};

export default ListView;