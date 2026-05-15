// app/login/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <form className="card login-panel" onSubmit={submit}>
        <div className="sidebar-mark" style={{ marginBottom: 14 }}>T</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Todo List</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 22 }}>
          ใส่ PIN เพื่อเข้าใช้งาน
        </p>

        <input
          className="input"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder="PIN"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          autoFocus
        />

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
        >
          {loading ? <><span className="spinner" /> กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </main>
  );
}
