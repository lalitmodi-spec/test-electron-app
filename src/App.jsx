import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout';
import Dashboard from './components/Dashboard';
import Invoices from './components/Invoices';
import InvoiceForm from './components/InvoiceForm';
import Payments from './components/Payments';
import Customers from './components/Customers';
import Expenses from './components/Expenses';
import Products from './components/Products';
import Settings from './components/Settings';
import Reports from './components/Reports';
import CreditNotes from './components/CreditNotes';
import SplashScreen from './components/SplashScreen';
import { App as AntApp } from 'antd';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ready = () => setLoading(false);
    if (document.readyState === 'complete') {
      setTimeout(ready, 500);
    } else {
      window.addEventListener('load', () => setTimeout(ready, 500));
      return () => window.removeEventListener('load', ready);
    }
  }, []);

  return (
    <>
      {loading && <SplashScreen onFinish={() => setLoading(false)} />}
      <AntApp style={{ display: loading ? 'none' : 'block' }}>
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
              <Route path="/products" element={<Products />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/credit-notes" element={<CreditNotes />} />
            </Route>
          </Routes>
        </HashRouter>
      </AntApp>
    </>
  );
}
