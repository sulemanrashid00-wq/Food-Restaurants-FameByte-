import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, Edit2, CheckCircle2, XCircle, Search, Loader2, X,
  UtensilsCrossed, Pizza, Coffee, Cake, Flame, Sparkles
} from 'lucide-react';

const CATEGORIES = [
  { id: 'All', name: 'All Items', icon: Sparkles },
  { id: 'Starters', name: 'Starters', icon: UtensilsCrossed },
  { id: 'Main Course', name: 'Main Course', icon: Pizza },
  { id: 'Beverages', name: 'Beverages', icon: Coffee },
  { id: 'Desserts', name: 'Desserts', icon: Cake }
];

const FORM_CATEGORIES = ['Starters', 'Main Course', 'Beverages', 'Desserts'];

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Main Course');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Fetch menu error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setCategory('Main Course');
    setImageUrl('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name || '');
    setPrice(item.price ? item.price.toString() : '');
    setCategory(item.category || 'Main Course');
    setImageUrl(item.image_url || '');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: name.trim(),
            price: parsedPrice,
            category,
            image_url: imageUrl.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert([{
            name: name.trim(),
            price: parsedPrice,
            category,
            image_url: imageUrl.trim() || null,
          }]);

        if (error) throw error;
      }

      setModalOpen(false);
      fetchMenuItems();
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          is_available: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_available: !currentStatus } : item
        )
      );
    } catch (err) {
      console.error('Status toggle failed:', err.message);
    }
  };

  const getCategoryCount = (catId) => {
    if (catId === 'All') return items.length;
    return items.filter(item => item.category === catId).length;
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">Menu Catalog</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Explore categories, pricing, and live inventory status.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-full text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent shadow-xs transition"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu</span>
          </button>
        </div>
      </div>

      {/* Modern Category Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          const count = getCategoryCount(cat.id);

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                isActive
                  ? 'bg-orange-50/80 border-orange-300 ring-2 ring-orange-400/20'
                  : 'bg-white border-neutral-100 hover:border-neutral-200 shadow-xs'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isActive ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${isActive ? 'text-orange-950' : 'text-neutral-800'}`}>
                  {cat.name}
                </p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  {count} {count === 1 ? 'item' : 'items'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Food Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-neutral-100 shadow-xs">
          <UtensilsCrossed className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-neutral-700">No dishes available</p>
          <p className="text-xs text-neutral-400 mt-0.5">Click "Add Menu" to create your first recipe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-3xl overflow-hidden border transition flex flex-col justify-between shadow-xs hover:shadow-lg ${
                item.is_available ? 'border-neutral-100' : 'border-neutral-200 opacity-60'
              }`}
            >
              {/* Card Image Area */}
              <div className="relative h-44 bg-neutral-100 overflow-hidden group">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 text-xs gap-1">
                    <UtensilsCrossed className="w-6 h-6 stroke-1" />
                    <span>No image</span>
                  </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-neutral-800 shadow-xs">
                  {item.category}
                </div>

                {/* Edit Action */}
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-neutral-600 hover:text-orange-600 hover:bg-white transition shadow-xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-800 line-clamp-1">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-neutral-400">
                    <span className="text-orange-500 font-semibold">★ 4.8</span>
                    <span>•</span>
                    <span>Order In-store</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
                  <span className="text-base font-extrabold text-neutral-900">
                    Rs. {Number(item.price).toFixed(2)}
                  </span>

                  <button
                    onClick={() => handleToggleAvailability(item.id, item.is_available)}
                    className={`text-[11px] px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      item.is_available
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {item.is_available ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Available
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                        Disabled
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-800">
                {editingItem ? 'Edit Dish Details' : 'Add New Dish'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Dish Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Peanut Butter Chicken Burger"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">
                    Price (PKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="220"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {FORM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Image URL (Unsplash food link)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingItem ? 'Save Updates' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}