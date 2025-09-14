export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ padding: 8, border: '1px solid #fca5a5', borderRadius: 8, background: '#fef2f2', color: '#7f1d1d', fontFamily: 'system-ui' }}>
      {message}
    </div>
  );
}


