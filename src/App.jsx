import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout';
import Dashboard from './components/Dashboard';
import Invoices from './components/Invoices';
import InvoiceForm from './components/InvoiceForm';
import Payments from './components/Payments';
import Customers from './components/Customers';
import Expenses from './components/Expenses';
import Purchases from './components/Purchases';
import Products from './components/Products';
import Vendors from './components/Vendors';
import Quotations from './components/Quotations';
import QuotationForm from './components/QuotationForm';
import ActivityLog from './components/ActivityLog';
import Settings from './components/Settings';
import Reports from './components/Reports';
import CreditNotes from './components/CreditNotes';
import About from './components/About';
import ContactSupport from './components/ContactSupport';
import SplashScreen from './components/SplashScreen';
import PinGate from './components/PinGate';
import { App as AntApp } from 'antd';
import { LanguageProvider } from './i18n/LanguageContext';
import db from './db';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [pinRequired, setPinRequired] = useState(null);

  useEffect(() => {
    const ready = () => setLoading(false);
    if (document.readyState === 'complete') {
      setTimeout(ready, 500);
    } else {
      window.addEventListener('load', () => setTimeout(ready, 500));
      return () => window.removeEventListener('load', ready);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      db.settings.get('appPin').then(s => {
        setPinRequired(s && s.value ? true : false);
      });
    }
  }, [loading]);

  return (
    <>
      <LanguageProvider>
        {loading && <SplashScreen onFinish={() => setLoading(false)} />}
        {!loading && pinRequired && <PinGate onUnlock={() => setPinRequired(false)} />}
        {!loading && !pinRequired && (
          <AntApp style={{ display: 'block' }}>
            <HashRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/invoice/new" element={<InvoiceForm />} />
                  <Route path="/invoice/edit/:id" element={<InvoiceForm />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/purchases" element={<Purchases />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/vendors" element={<Vendors />} />
                  <Route path="/quotations" element={<Quotations />} />
                  <Route path="/quotation/new" element={<QuotationForm />} />
                  <Route path="/quotation/edit/:id" element={<QuotationForm />} />
                  <Route path="/activity" element={<ActivityLog />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/credit-notes" element={<CreditNotes />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/support" element={<ContactSupport />} />
                </Route>
              </Routes>
            </HashRouter>
          </AntApp>
        )}
      </LanguageProvider>
    </>
  );
}
