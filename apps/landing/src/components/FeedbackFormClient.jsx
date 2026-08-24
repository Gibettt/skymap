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
    <main className="feedback-page">
      <section className="feedback-card" aria-labelledby="feedback-title">
        <header className="feedback-header" id="feedback-title">Guest Feedback</header>
        <div className="feedback-body">
          {loading && <p className="feedback-message">Loading...</p>}
          {!loading && message && !feedback && <p className="feedback-message">{message}</p>}
          {feedback && feedback.status === 'submitted' && (
            <p className="feedback-message">Thank you, you have already submitted your feedback.</p>
          )}
          {feedback && feedback.status !== 'submitted' && (
            <form onSubmit={submit} className="feedback-form">
              <div className="feedback-booking">
                <strong>{feedback.package_name}</strong>
                <span>Booking {feedback.booking_code} | {feedback.guest_name}</span>
              </div>
              <label className="feedback-field">
                <span>Rating</span>
                <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                </select>
              </label>
              <label className="feedback-field">
                <span>Comment</span>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
              <button className="feedback-submit" type="submit">Submit feedback</button>
              {message && <p className="feedback-message">{message}</p>}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
