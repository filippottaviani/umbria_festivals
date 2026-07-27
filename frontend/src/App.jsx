import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import FestivalDetails from './pages/FestivalDetails';
import AdminPanel from './pages/AdminPanel';
import './index.css';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/festival/:id" element={<FestivalDetails />} />
                <Route path="/admin" element={<AdminPanel />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;