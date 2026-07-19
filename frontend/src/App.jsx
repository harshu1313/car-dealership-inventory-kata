import React, { useState, useEffect } from 'react';

export default function App() {
  const [vehicles, setVehicles] = useState([]);
  // 3. User multi-parameter search state
  const [search, setSearch] = useState({ make: '', model: '', category: '', priceMax: '' });
  // 1. Change these at the top of your App component:
  const [token, setToken] = useState(sessionStorage.getItem('token') || '');
  const [role, setRole] = useState(sessionStorage.getItem('role') || '');
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  // Admin Form State
  const [vForm, setVForm] = useState({ make: '', model: '', category: '', price: '', quantity: '' });
  const [editingId, setEditingId] = useState(null);
  const [restockAmount, setRestockAmount] = useState({});

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const res = await fetch(`${BACKEND_URL}/api/vehicles`);
    // const res = await fetch('http://localhost:8000/api/vehicles');
    const data = await res.json();
    setVehicles(data);
  };

  // 3. Search vehicles dynamically via query parameters
  const handleSearch = async (e) => {
    e.preventDefault();
    const query = new URLSearchParams({
      make: search.make,
      model: search.model,
      category: search.category
    }).toString();

    const res = await fetch(`http://localhost:8000/api/vehicles/search?${query}`);
    let data = await res.json();

    // Client-side filter fallback for max price constraints
    if (search.priceMax) {
      data = data.filter(v => v.price <= parseFloat(search.priceMax));
    }
    setVehicles(data);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const url = authMode === 'login' ? 'login' : 'register';
    const res = await fetch(`http://localhost:8000/api/auth/${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (res.ok) {
      if (authMode === 'login') {
        // Use sessionStorage instead of localStorage
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('role', data.role);
        setToken(data.token);
        setRole(data.role);
      } else {
        alert("Registration complete! Please Log in.");
        setAuthMode('login');
      }
    } else {
      alert(data.detail || "Authentication Failed");
    }
  };

  // 2. Make purchase of vehicle, decreasing its quantity
  const handlePurchase = async (id) => {
    if (!token) {
      alert("Please log in or register to purchase a vehicle.");
      return;
    }
    const res = await fetch(`http://localhost:8000/api/vehicles/${id}/purchase`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchVehicles();
    } else {
      const d = await res.json();
      alert(d.detail || "Error completing purchase.");
    }
  };

  // Admin CRUD Functions
  const saveVehicle = async (e) => {
    e.preventDefault();
    // const url = editingId ? `http://localhost:8000/api/vehicles/${editingId}` : 'http://localhost:8000/api/vehicles';
    const url = editingId ? `http://localhost:8000/api/vehicles/${editingId}` : 'http://localhost:8000/api/vehicles';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        make: vForm.make, model: vForm.model, category: vForm.category,
        price: parseFloat(vForm.price), quantity: parseInt(vForm.quantity)
      })
    });
    if (res.ok) {
      fetchVehicles();
      setVForm({ make: '', model: '', category: '', price: '', quantity: '' });
      setEditingId(null);
    }
  };

  const startEdit = (vehicle) => {
    setEditingId(vehicle.id);
    setVForm({ make: vehicle.make, model: vehicle.model, category: vehicle.category, price: vehicle.price, quantity: vehicle.quantity });
  };

  const deleteVehicle = async (id) => {
    if (window.confirm("Are you sure?")) {
      await fetch(`http://localhost:8000/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchVehicles();
    }
  };

  const handleRestock = async (id) => {
    const amount = parseInt(restockAmount[id] || 0);
    if (amount <= 0) return alert("Enter a valid amount to restock");

    const res = await fetch(`http://localhost:8000/api/vehicles/${id}/restock?amount=${amount}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      setRestockAmount({ ...restockAmount, [id]: '' });
      fetchVehicles(); // Refresh the grid data
    } else {
      const errorData = await res.json();
      alert(errorData.detail || "Restock failed");
    }
  };

  const logout = () => {
    sessionStorage.clear(); // Clears token safely
    setToken('');
    setRole('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚗</span>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Car Dealership Inventory System
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {token && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-md uppercase ${role === 'admin' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20'}`}>
                {role} Panel
              </span>
            )}
            {token ? (
              <button onClick={logout} className="text-sm font-medium text-slate-600 hover:text-red-600 transition">Sign Out</button>
            ) : (
              <span className="text-sm text-slate-400 font-medium">Guest Account</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Unauthenticated Login Node */}
        {!token && (
          <div className="max-w-md mx-auto mt-12 bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2 capitalize">{authMode}</h2>
            <p className="text-sm text-slate-500 mb-6">Access the dealership inventory registry dashboard.</p>
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Username</label>
                  <input type="text" className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" onChange={e => setForm({ ...form, username: e.target.value })} required />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
                <input type="email" className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
                <input type="password" className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg font-medium shadow-sm transition">Continue</button>
            </form>
            <p className="text-xs text-center mt-4 text-blue-600 cursor-pointer hover:underline" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? "Need a buyer account? Register here" : "Have an account already? Sign in"}
            </p>
          </div>
        )}

        {/* Authenticated Application Environment */}
        {token && (
          <div>
            {role === 'admin' ? (
              /* ========================================== */
              /*                 ADMIN SIDE                 */
              /* ========================================== */
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-1">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">{editingId ? "✏️ Edit Vehicle" : "➕ Add Vehicle"}</h2>
                    <form onSubmit={saveVehicle} className="space-y-3.5">
                      <input type="text" value={vForm.make} placeholder="Brand" className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setVForm({ ...vForm, make: e.target.value })} required />
                      <input type="text" value={vForm.model} placeholder="Model" className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setVForm({ ...vForm, model: e.target.value })} required />
                      <input type="text" value={vForm.category} placeholder="Category" className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setVForm({ ...vForm, category: e.target.value })} required />
                      <input type="number" value={vForm.price} placeholder="Price (Rs)" className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setVForm({ ...vForm, price: e.target.value })} required />
                      <input type="number" value={vForm.quantity} placeholder="Stock Quantity" className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setVForm({ ...vForm, quantity: e.target.value })} required />
                      <button className={`w-full text-white p-2 rounded-lg text-sm font-medium transition ${editingId ? 'bg-amber-500' : 'bg-blue-600'}`}>Save Changes</button>
                    </form>
                  </div>
                </div>
                <div className="xl:col-span-3">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase">
                          <th className="px-6 py-3">Specs</th>
                          <th className="px-6 py-3">Category</th>
                          <th className="px-6 py-3">Price</th>
                          <th className="px-6 py-3">Units</th>
                          <th className="px-6 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {vehicles.map(v => (
                          <tr key={v.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-bold">{v.make} <span className="text-xs font-normal text-slate-400">{v.model}</span></td>
                            <td className="px-6 py-4">{v.category}</td>
                            <td className="px-6 py-4">Rs {v.price.toLocaleString()}</td>
                            <td className="px-6 py-4">{v.quantity} units</td>
                            <td className="px-6 py-4 flex justify-center gap-2">
                              <button onClick={() => handlePurchase(v.id)} disabled={v.quantity === 0} className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50">Sell</button>
                              <input type="number" placeholder="Qty" className="w-12 border text-center text-xs rounded" onChange={e => setRestockAmount({ ...restockAmount, [v.id]: e.target.value })} />
                              <button onClick={() => handleRestock(v.id)} className="px-2 py-1 text-xs bg-slate-900 text-white rounded">Restock</button>
                              <button onClick={() => startEdit(v)} className="text-amber-600 text-xs px-2">Edit</button>
                              <button onClick={() => deleteVehicle(v.id)} className="text-rose-600 text-xs">Drop</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================== */
              /*                 USER SIDE                  */
              /* ========================================== */
              <div className="space-y-8">
                {/* 3. Comprehensive Pipeline Filter Module (Brand/Make, Model, Category, Price) */}
                <form onSubmit={handleSearch} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand</label>
                    <input type="text" placeholder="e.g., 2022" className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={search.make} onChange={e => setSearch({ ...search, make: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model Variant</label>
                    <input type="text" placeholder="e.g., R8" className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={search.model} onChange={e => setSearch({ ...search, model: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                    <input type="text" placeholder="e.g., Coupe" className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={search.category} onChange={e => setSearch({ ...search, category: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (Rs)</label>
                    <input type="number" placeholder="e.g., Rs. 800000" className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={search.priceMax} onChange={e => setSearch({ ...search, priceMax: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition shadow-sm">
                      Apply Filters
                    </button>
                    <button type="button" className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 px-3 rounded-lg text-sm font-medium transition" onClick={() => { setSearch({ make: '', model: '', category: '', priceMax: '' }); fetchVehicles(); }}>
                      Reset
                    </button>
                  </div>
                </form>

                {/* 5. Central Available Showroom Dashboard Grid */}
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Available Showroom Catalog</h3>
                  {vehicles.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-medium shadow-sm">
                      No vehicles matching your current filters are available.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {vehicles.map(v => (
                        /* 1. See vehicle details embedded neatly within individual user display cards */
                        <div key={v.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                          <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 uppercase">
                                {v.category}
                              </span>
                              <span className="text-xs font-mono text-slate-400">ID: #{v.id}</span>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 tracking-tight">{v.make}</h4>
                            <p className="text-slate-500 text-sm mb-4">{v.model}</p>

                            <div className="border-t border-slate-100 pt-4 flex justify-between items-baseline">
                              <span className="text-xs font-medium text-slate-400 uppercase">Retail Valuation</span>
                              <span className="text-2xl font-extrabold text-slate-900">Rs{v.price.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between gap-4">
                            <div>
                              <p className={`text-xs font-bold uppercase ${v.quantity > 0 ? 'text-green-600' : 'text-rose-500'}`}>
                                {v.quantity > 0 ? 'In Stock' : 'Unavailable'}
                              </p>
                              <p className="text-xs text-slate-400">{v.quantity} units left</p>
                            </div>

                            {/* 2 & 4. Immediate single-unit purchase button disabled cleanly when quantity === 0 */}
                            <button
                              onClick={() => handlePurchase(v.id)}
                              disabled={v.quantity === 0}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-xl shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition"
                            >
                              {v.quantity > 0 ? '⚡ Place Order' : 'Sold Out'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}