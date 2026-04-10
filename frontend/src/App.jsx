import React, { useState, useEffect } from 'react';
import DianChat from './components/DianChat';

function App() {
  const [data, setData] = useState({ summary: {}, resources: [] });
  const [filter, setFilter] = useState('All');
  const [resourceType, setResourceType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [backingUpId, setBackingUpId] = useState(null);
  const [activeJobResult, setActiveJobResult] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Database', env: 'Prod', criticality: 'High' });
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/scorecard');
      const json = await response.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSystem = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const resp = await fetch(`http://localhost:8000/api/systems?name=${form.name}&type=${form.type}&env=${form.env}&criticality=${form.criticality}`, {
        method: 'POST'
      });
      if (resp.status === 400) {
        const error = await resp.json();
        setFormError(error.detail);
        return;
      }
      setShowForm(false);
      setForm({ name: '', type: 'Database', env: 'Prod', criticality: 'High' });
      fetchData();
    } catch (err) {
      setFormError("Failed to connect to server");
    }
  };

  const handleAddBackup = async (id, status) => {
    await fetch(`http://localhost:8000/api/backups?system_id=${id}&status=${status}`, { method: 'POST' });
    fetchData();
  };

  const handleSimulatedBackup = (resource) => {
    setBackingUpId(resource.id);
    
    // Simulate backup duration (2 seconds)
    setTimeout(async () => {
      let successWeight = 0.75;
      if (resource.type === 'Database') successWeight = 0.7;
      if (resource.type === 'Compute') successWeight = 0.8;
      
      const status = Math.random() < successWeight ? 'Success' : 'Failed';
      const resp = await fetch(`http://localhost:8000/api/backups?system_id=${resource.id}&status=${status}`, { method: 'POST' });
      const jobData = await resp.json();
      
      setBackingUpId(null);
      setActiveJobResult(jobData);
      fetchData();
    }, 2000);
  };

  const handleDownload = () => {
    window.open(`http://localhost:8000/api/export?env=${filter}&type=${resourceType}`, '_blank');
  };

  const filteredResources = data.resources.filter(r => {
    const envMatch = filter === 'All' || r.env === filter;
    const typeMatch = resourceType === 'All' || r.type === resourceType;
    return envMatch && typeMatch;
  });

  if (loading) return <div style={{padding: '2rem'}}>Loading DataGuardian...</div>;

  return (
    <div className="dashboard">
      <header className="header">
        <div>
          <h1>DataGuardian</h1>
          <p style={{color: 'var(--text-muted)'}}>Infrastructure Resilience Scorecard</p>
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
          <button onClick={handleDownload} className="filter-btn" style={{borderColor: 'var(--success)', color: 'var(--success)'}}>
            📥 Download Report
          </button>
          <button onClick={() => setShowForm(!showForm)} className="filter-btn" style={{background: 'var(--primary)'}}>
            {showForm ? '✕ Close Form' : '＋ Add Resource'}
          </button>
          <button onClick={() => fetch('http://localhost:8000/api/seed', {method: 'POST'}).then(fetchData)} className="filter-btn">
            Seed Demo
          </button>
        </div>
      </header>

      {showForm && (
        <div style={{background: 'var(--card-bg)', padding: '2rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid var(--primary)'}}>
          <h3>Register New Instance</h3>
          <form onSubmit={handleCreateSystem} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem'}}>
            <div>
              <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>System Name</label>
              <input 
                className="filter-btn" style={{width: '100%', marginTop: '0.25rem', textAlign: 'left'}}
                required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            <div>
              <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Type</label>
              <select className="filter-btn" style={{width: '100%', marginTop: '0.25rem'}} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option>Database</option><option>Storage</option><option>Compute</option>
              </select>
            </div>
            <div>
              <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Environment</label>
              <select className="filter-btn" style={{width: '100%', marginTop: '0.25rem'}} value={form.env} onChange={e => setForm({...form, env: e.target.value})}>
                <option>Prod</option><option>Dev</option>
              </select>
            </div>
            <div>
              <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Criticality</label>
              <select className="filter-btn" style={{width: '100%', marginTop: '0.25rem'}} value={form.criticality} onChange={e => setForm({...form, criticality: e.target.value})}>
                <option>High</option><option>Med</option><option>Low</option>
              </select>
            </div>
            <div style={{display: 'flex', alignItems: 'flex-end'}}>
              <button type="submit" className="filter-btn" style={{width: '100%', background: 'var(--primary)'}}>Save System</button>
            </div>
          </form>
          {formError && <p style={{color: 'var(--danger)', marginTop: '1rem', fontSize: '0.9rem'}}>{formError}</p>}
        </div>
      )}

      <section className="kpi-container">
        <div className="kpi-card">
          <div className="label">Total Resources</div>
          <div className="value">{data.summary.total}</div>
        </div>
        <div className="kpi-card" style={{borderLeft: '4px solid var(--success)'}}>
          <div className="label">Ready</div>
          <div className="value">{data.summary.ready}</div>
        </div>
        <div className="kpi-card" style={{borderLeft: '4px solid var(--warning)'}}>
          <div className="label">At-Risk</div>
          <div className="value">{data.summary.at_risk}</div>
        </div>
        <div className="kpi-card" style={{borderLeft: '4px solid var(--danger)'}}>
          <div className="label">Critical</div>
          <div className="value">{data.summary.critical}</div>
        </div>
      </section>

      <div className="controls">
        <button onClick={() => setFilter('All')} className={`filter-btn ${filter === 'All' ? 'active' : ''}`}>All Environments</button>
        <button onClick={() => setFilter('Prod')} className={`filter-btn ${filter === 'Prod' ? 'active' : ''}`}>Production</button>
        <button onClick={() => setFilter('Dev')} className={`filter-btn ${filter === 'Dev' ? 'active' : ''}`}>Development</button>
        <span style={{margin: '0 1rem', borderLeft: '1px solid var(--glass-border)'}}></span>
        <select 
          onChange={(e) => setResourceType(e.target.value)}
          className="filter-btn"
          style={{background: 'var(--card-bg)'}}
        >
          <option value="All">All Types</option>
          <option value="Database">Databases</option>
          <option value="Storage">Storage</option>
          <option value="Compute">Compute</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Resource Name</th>
              <th>Environment</th>
              <th>Type</th>
              <th>Last Backup</th>
              <th>7d Success Rate</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResources.map(r => (
              <tr key={r.id}>
                <td style={{fontWeight: 600}}>{r.name}</td>
                <td>{r.env}</td>
                <td>{r.type}</td>
                <td>{r.last_backup}</td>
                <td>{r.success_rate}</td>
                <td>
                  <span className={`badge badge-${r.status.toLowerCase().replace(' ', '-')}`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button 
                      onClick={() => handleSimulatedBackup(r)} 
                      disabled={backingUpId === r.id}
                      className={`filter-btn backup-btn ${backingUpId === r.id ? 'active' : ''}`}
                      style={{padding: '0.25rem 0.5rem', fontSize: '0.7rem', width: '100%'}}
                    >
                      {backingUpId === r.id ? '⚡ Backing up...' : '🔄 Run Backup'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Job Result Modal */}
      {activeJobResult && (
        <div className="modal-overlay">
          <div className="modal-content log-modal">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h3>Job Result: {activeJobResult.resource_name}</h3>
              <button 
                onClick={() => setActiveJobResult(null)}
                className="filter-btn" style={{padding: '0.25rem 0.75rem'}}
              >✕</button>
            </div>
            
            <div className={`status-banner ${activeJobResult.status.toLowerCase()}`}>
              {activeJobResult.status === 'Success' ? '✓ Backup Successful' : '⚠ Backup Failed'}
            </div>

            <div className="terminal-logs">
              {activeJobResult.logs.map((log, i) => (
                <div key={i} className="log-line">{log}</div>
              ))}
            </div>

            <div style={{marginTop: '1.5rem', textAlign: 'right'}}>
              <button onClick={() => setActiveJobResult(null)} className="filter-btn" style={{background: 'var(--primary)'}}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <DianChat />
    </div>
  );
}

export default App;
