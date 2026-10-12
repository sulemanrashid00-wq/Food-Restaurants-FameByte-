import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Star, CheckCircle2, Utensils, Loader2 } from 'lucide-react';

export default function CustomerReviewPage() {
  const [customerName, setCustomerName] = useState('');
  const [dishName, setDishName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !comment.trim()) {
      return alert('Please fill in your name and feedback!');
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('customer_reviews').insert([
        {
          customer_name: customerName.trim(),
          dish_name: dishName.trim() || 'General Dining',
          rating: Number(rating),
          comment: comment.trim(),
        },
      ]);

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      alert('Error submitting review: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FDF7F2] flex items-center justify-center p-4">
        <div className="bg-white max-w-sm w-full p-8 rounded-3xl shadow-sm border border-orange-100 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-neutral-900">Thank You!</h2>
          <p className="text-xs text-neutral-500">
            Your review has been shared directly with our restaurant team.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setCustomerName('');
              setDishName('');
              setComment('');
              setRating(5);
            }}
            className="w-full py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
          >
            Submit Another Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF7F2] flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-3xl shadow-sm border border-orange-100 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold mx-auto mb-2 shadow-sm">
            <Utensils className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-neutral-900">Delicious Guest Review</h2>
          <p className="text-xs text-neutral-500">We value your feedback to serve you better!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1">Your Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Khan"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1">Favorite Dish Ordered</label>
            <input
              type="text"
              placeholder="e.g. Gourmet Beef Burger, Club Sandwich"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1.5">Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 rounded-lg focus:outline-none transition hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1">Your Feedback</label>
            <textarea
              required
              rows={3}
              placeholder="Tell us about the taste, service and experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Submit Feedback</span>
          </button>
        </form>
      </div>
    </div>
  );
}