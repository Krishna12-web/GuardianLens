import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';

interface CameraSettings {
  camera_source: string;
  ip_camera_url: string;
}

export default function CameraSettingsPage() {
  const [settings, setSettings] = useState<CameraSettings | null>(null);
  const [ipUrl, setIpUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getCameraSettings();
      setSettings(data);
      setIpUrl(data.ip_camera_url || '');
    } catch (error) {
      console.error('Failed to load camera settings:', error);
    }
  };

  const handleSave = async () => {
    if (settings?.camera_source === 'ip' && !ipUrl.trim()) {
      alert('Please enter an IP camera URL');
      return;
    }

    setIsLoading(true);
    try {
      await api.updateCameraSettings({
        camera_source: settings?.camera_source || 'default',
        ip_camera_url: ipUrl.trim()
      });
      alert('Camera settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save camera settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!ipUrl.trim()) {
      alert('Please enter an IP camera URL first');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing connection...');
    
    try {
      const result = await api.testIpCamera();
      if (result.status === 'success') {
        setTestStatus('success');
        setTestMessage('IP camera is accessible!');
      } else {
        setTestStatus('error');
        setTestMessage(result.message || 'Unable to connect to IP camera');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('Error testing connection');
    }
  };

  if (!settings) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading camera settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>📹 Camera Settings</h2>
        <p>Configure your camera source and IP webcam settings</p>
      </div>

      <div className="grid-2">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card-header">
            <span className="card-title">Camera Source</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-title">Camera Type</div>
                <div className="setting-desc">Choose between default camera or IP webcam</div>
              </div>
              <select
                value={settings.camera_source}
                onChange={(e) => setSettings({ ...settings, camera_source: e.target.value })}
                className="setting-input"
              >
                <option value="default">Default Camera</option>
                <option value="ip">IP Webcam</option>
              </select>
            </div>

            {settings.camera_source === 'ip' && (
              <>
                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-title">IP Camera URL</div>
                    <div className="setting-desc">Enter your phone's IP webcam address (e.g., http://192.168.1.100:8080/video)</div>
                  </div>
                  <input
                    type="text"
                    value={ipUrl}
                    onChange={(e) => setIpUrl(e.target.value)}
                    placeholder="http://192.168.1.100:8080/video"
                    className="setting-input"
                  />
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-title">Connection Test</div>
                    <div className="setting-desc">Test if your IP camera is accessible</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={handleTest}
                      disabled={isLoading}
                    >
                      🔍 Test Connection
                    </button>
                    {testStatus && (
                      <div className={`test-status ${testStatus}`}>
                        {testStatus === 'testing' && '🔄 Testing...'}
                        {testStatus === 'success' && '✅ ' + testMessage}
                        {testStatus === 'error' && '❌ ' + testMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="info-box">
                  <div className="info-icon">💡</div>
                  <div>
                    <strong>IP Webcam Setup:</strong>
                    <ol>
                      <li>Install "IP Webcam" app on your phone</li>
                      <li>Start the server and note the URL shown</li>
                      <li>Enter the URL in the format: http://[IP]:[PORT]/video</li>
                      <li>Make sure your phone and computer are on the same WiFi network</li>
                    </ol>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <span className="card-title">Quick Actions</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-title">Current Status</div>
                <div className="setting-desc">Your current camera configuration</div>
              </div>
              <span className={`badge ${settings.camera_source === 'default' ? 'badge-success' : 'badge-primary'}`}>
                {settings.camera_source === 'default' ? '📹 Default Camera' : '🌐 IP Webcam'}
              </span>
            </div>

            {settings.camera_source === 'ip' && settings.ip_camera_url && (
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-title">Configured URL</div>
                  <div className="setting-desc">Your IP camera address</div>
                </div>
                <span className="badge badge-info" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {settings.ip_camera_url}
                </span>
              </div>
            )}

            <div style={{ marginTop: 'auto' }}>
              <button 
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? '💾 Saving...' : '💾 Save Settings'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}