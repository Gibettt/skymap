'use client';

import { useEffect, useState } from 'react';

export default function FeedbackFormClient({ token }) {
  const [feedback, setFeedback] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/feedback/${token}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) setMessage(data.error || 'Feedback link tidak ditemukan.');
        else setFeedback(data.feedback);
      })
      .catch(() => setMessage('Feedback link tidak bisa dibuka.'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    const res = await fetch(`/api/feedback/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Feedback gagal dikirim.');
      return;
    }
    setMessage('Thank you, your feedback has been submitted.');
    setFeedback((current) => current ? { ...current, status: 'submitted' } : current);
  };

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#f2f1ed' }}>
      <div className="card" style={{ width: 'min(560px, 100%)' }}>
        <div className="card-header">
          <span className="card-title">Guest Feedback</span>
        </div>
        <div className="card-body">
          {loading && <p>Loading...</p>}
          {!loading && message && !feedback && <p>{message}</p>}
          {feedback && feedback.status === 'submitted' && (
            <p>Thank you, you have already submitted your feedback.</p>
          )}
          {feedback && feedback.status !== 'submitted' && (
            <form onSubmit={submit}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800 }}>{feedback.package_name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Booking {feedback.booking_code} · {feedback.guest_name}</div>
              </div>
              <label className="input-group" style={{ marginBottom: 16 }}>
                <span className="input-label">Rating</span>
                <select className="input" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                </select>
              </label>
              <label className="input-group" style={{ marginBottom: 16 }}>
                <span className="input-label">Comment</span>
                <textarea className="input" value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
              <button className="btn btn-primary" type="submit">Submit Feedback</button>
              {message && <p style={{ marginTop: 14, color: 'var(--emerald)' }}>{message}</p>}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
