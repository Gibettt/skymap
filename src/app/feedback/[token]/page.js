import FeedbackFormClient from '@/components/FeedbackFormClient';

export default async function FeedbackPage({ params }) {
  const { token } = await params;
  return <FeedbackFormClient token={token} />;
}
