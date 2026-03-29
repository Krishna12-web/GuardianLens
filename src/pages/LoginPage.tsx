import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('gl_auth', 'demo');
      navigate('/dashboard');
    }, 800);
  };

  const handleNearLogin = () => {
    // For now, just use demo mode
    handleDemoLogin();
  };

  return (
    <div className="login-container">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.div
          className="login-logo"
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          🛡️
        </motion.div>
        <h1>GuardianLens</h1>
        <p>Privacy-first AI home companion for elder care.<br />Aging at home should feel safe, not surveilled.</p>

        <div className="login-actions">
          <motion.button
            className="btn btn-primary"
            onClick={handleNearLogin}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            🔗 Connect NEAR Wallet
          </motion.button>

          <motion.button
            className="btn btn-secondary"
            onClick={handleDemoLogin}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? '⏳ Entering...' : '🚀 Enter Demo Mode'}
          </motion.button>
        </div>

        <p style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 0 }}>
          No wallet required for Demo Mode
        </p>
      </motion.div>
    </div>
  );
}
