import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PackagePlus, Edit, Trash2, Check, RefreshCw, Layers } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  priceInr: number;
  stock: number;
  active: boolean;
  imageUrl?: string | null;
}

export const MerchantProductsPage: React.FC = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('laptops');
  const [priceInr, setPriceInr] = useState('');
  const [stock, setStock] = useState('25');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/products?limit=50');
      const json = await res.json();
      if (res.ok && json.success) {
        setProducts(json.data.items);
      } else {
        setError(json.message || 'Failed to fetch products');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setSku(`SKU-${Date.now().toString().slice(-6)}`);
    setName('');
    setDescription('');
    setCategory('laptops');
    setPriceInr('49990');
    setStock('20');
    setImageUrl('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setSku(prod.sku);
    setName(prod.name);
    setDescription(prod.description);
    setCategory(prod.category);
    setPriceInr(prod.priceInr.toString());
    setStock(prod.stock.toString());
    setImageUrl(prod.imageUrl || '');
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const pricePaise = Math.round(parseFloat(priceInr) * 100);

    const payload = {
      sku,
      name,
      description,
      category,
      pricePaise,
      stock: parseInt(stock, 10),
      active: true,
      imageUrl: imageUrl.trim() || undefined,
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to save product');
      }

      setIsAddModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Save product failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to soft-delete this product?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-brand-400" />
              <h1 className="text-xl font-bold text-white">Merchant Catalog Studio</h1>
            </div>
            <p className="text-xs text-slate-400">Add, edit, or remove catalog items for AI recommendations</p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Product Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-400" />
            Loading catalog items...
          </div>
        ) : (
          <div className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-4">SKU / Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price (₹)</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white">{prod.name}</div>
                        <span className="text-[10px] font-mono text-slate-400">{prod.sku}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-brand-300 border border-white/10 text-[11px] font-medium">
                          {prod.category}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-400">
                        ₹{prod.priceInr.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${prod.stock > 5 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {prod.stock} in stock
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(prod)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Product Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/20 space-y-4 shadow-2xl relative">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <h3 className="text-base font-bold text-white">
                {editingProduct ? 'Edit Catalog Product' : 'Add New Catalog Product'}
              </h3>

              <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">SKU</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Product Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white"
                    >
                      <option value="laptops">Laptops</option>
                      <option value="monitors">Monitors</option>
                      <option value="keyboards">Keyboards</option>
                      <option value="headphones">Headphones</option>
                      <option value="accessories">Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={priceInr}
                      onChange={(e) => setPriceInr(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Stock Inventory</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Description</label>
                  <textarea
                    rows={2}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Image URL (Optional)</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Product</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
