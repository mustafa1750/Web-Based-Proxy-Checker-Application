import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import './App.css';

function App() {
  const [proxies, setProxies] = useState([]);
  const [results, setResults] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const inputRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const handleInputChange = (e) => {
    setProxies(e.target.value.split('\n').filter(proxy => proxy.trim() !== ''));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    Papa.parse(file, {
      complete: (result) => {
        const parsedProxies = result.data.map(row => row[0]).filter(proxy => proxy && typeof proxy === 'string');
        setProxies(parsedProxies);
      },
      header: false,
      error: (error) => {
        console.error("Error parsing CSV:", error);
        alert("Failed to parse CSV file. Please ensure it is properly formatted.");
      }
    });
  };

  const testProxy = async (proxy) => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
      const response = await fetch(`https://cors-anywhere.herokuapp.com/http://${proxy}`, {
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const endTime = Date.now();
        const latency = endTime - startTime;
        return { proxy, status: 'Online', latency };
      } else {
        return { proxy, status: 'Offline', latency: null };
      }
    } catch (error) {
      return { proxy, status: 'Offline', latency: null };
    }
  };

  const handleTestProxies = async () => {
    if (proxies.length === 0) {
      alert('Please enter or upload proxies to test.');
      return;
    }

    setIsTesting(true);
    setResults([]);
    setProgress(0);

    const testResults = [];
    let completed = 0;

    for (const proxy of proxies) {
      const result = await testProxy(proxy);
      testResults.push(result);
      setResults([...testResults]);

      completed++;
      setProgress((completed / proxies.length) * 100);
    }

    setIsTesting(false);
  };

  const handleSort = (column) => {
    if (column === sortColumn) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const sortedResults = React.useMemo(() => {
    if (!sortColumn) return results;

    return [...results].sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;

      if (sortColumn === 'latency') {
        const latencyA = a.latency === null ? Infinity : a.latency;
        const latencyB = b.latency === null ? Infinity : b.latency;
        return (latencyA - latencyB) * order;
      } else if (sortColumn === 'status') {
        return a.status.localeCompare(b.status) * order;
      }

      return 0;
    });
  }, [results, sortColumn, sortOrder]);

  const handleExport = (format) => {
    let dataStr;
    if (format === 'csv') {
      const header = "Proxy,Status,Latency";
      const rows = sortedResults.map(r => `${r.proxy},${r.status},${r.latency || ''}`).join('\n');
      dataStr = header + '\n' + rows;
    } else if (format === 'json') {
      dataStr = JSON.stringify(sortedResults, null, 2);
    } else {
      alert('Invalid format selected.');
      return;
    }

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `proxy_results.${format}`;
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <h1>Proxy Checker</h1>

      <div className="input-area">
        <textarea
          ref={inputRef}
          placeholder="Enter proxies (one per line)"
          onChange={handleInputChange}
          disabled={isTesting}
        />
        <div className="upload-area">
          <input
            type="file"
            accept=".csv, .txt"
            onChange={handleFileUpload}
            disabled={isTesting}
          />
        </div>
      </div>

      <div className="button-area">
        <button onClick={handleTestProxies} disabled={isTesting}>
          {isTesting ? 'Testing...' : 'Test Proxies'}
        </button>
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {isTesting && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}>
            {progress.toFixed(0)}%
          </div>
        </div>
      )}

      <div className="results-area">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('proxy')}>Proxy</th>
              <th onClick={() => handleSort('status')}>Status</th>
              <th onClick={() => handleSort('latency')}>Latency (ms)</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result, index) => (
              <tr key={index}>
                <td>{result.proxy}</td>
                <td className={result.status === 'Online' ? 'online' : 'offline'}>{result.status}</td>
                <td>{result.latency !== null ? result.latency : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {results.length > 0 && (
        <div className="export-area">
          <button onClick={() => handleExport('csv')}>Export as CSV</button>
          <button onClick={() => handleExport('json')}>Export as JSON</button>
        </div>
      )}
    </div>
  );
}

export default App;
