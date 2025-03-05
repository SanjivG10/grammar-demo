// components/GrammarChecker.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { useAuth } from './AuthProvider';

export default function GrammarChecker() {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState([]);
  const [normalizedText, setNormalizedText] = useState('');
  const [highlightedText, setHighlightedText] = useState('');
  const [stats, setStats] = useState({ words: 0, chars: 0 });
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();

  // Update stats whenever the text changes.
  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    setStats({ words, chars });
  }, [text]);

  // Debounced function to call the grammar check endpoint.
  const checkGrammar = useCallback(
    debounce(async (inputText) => {
      // If there's no text, clear previous results.
      if (!inputText.trim()) {
        setErrors([]);
        setNormalizedText('');
        setHighlightedText('');
        return;
      }
      setChecking(true);
      setError('');
      try {
        const response = await fetch('/api/grammar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: inputText })
        });
        const data = await response.json();
        if (data.success) {
          // Set errors and normalized text from backend.
          setErrors(data.errors);
          setNormalizedText(data.normalizedText);
        } else {
          setError(data.message || 'Error checking grammar');
        }
      } catch (err) {
        console.error('Grammar check error:', err);
        setError('Error checking grammar');
      } finally {
        setChecking(false);
      }
    }, 500),
    []
  );

  // Trigger grammar check whenever text changes.
  useEffect(() => {
    checkGrammar(text);
  }, [text, checkGrammar]);

  useEffect(() => {
    if (!normalizedText) {
      setHighlightedText(text);
      return;
    }
    if (!errors || errors.length === 0) {
      setHighlightedText(normalizedText);
      return;
    }


    // Sort error objects by their start index.
    const sortedErrors = [...errors].sort((a, b) => a.start - b.start);
    let result = '';
    let lastIndex = 0;
    sortedErrors.forEach((err, index) => {
      // Add text from the last index to the start of the error.
      result += normalizedText.slice(lastIndex, err.start);
      // Wrap the erroneous part in a span with highlighting.
      result += `<span class="bg-red-100 underline decoration-wavy decoration-red-500" title="${err.suggestion}">${normalizedText.slice(err.start, err.end)}</span>`;
      lastIndex = err.end;
    });
    // Append any remaining text after the last error.
    result += normalizedText.slice(lastIndex);
    setHighlightedText(result);
  }, [normalizedText, errors, text]);

  // Handle input changes.
  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-5xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Grammar Checker</h1>
            <p className="text-gray-600 mt-1">Write with confidence</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Signed in as</p>
              <p className="font-medium text-gray-800">{user?.username}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-white hover:bg-gray-50 text-gray-700 rounded-md transition border border-gray-200 shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-800">Input</h2>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>Words: {stats.words}</span>
                    <span>Characters: {stats.chars}</span>
                  </div>
                </div>
                {checking && (
                  <span className="text-sm text-blue-600 animate-pulse">
                    Checking grammar...
                  </span>
                )}
              </div>
            </div>
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="Start typing or paste your text here..."
              className="w-full h-[calc(100vh-300px)] p-4 border-0 focus:outline-none focus:ring-0 resize-none font-sans text-gray-800"
            />
          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-medium text-gray-800">Live Preview</h2>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
            <div
              className="p-4 h-[calc(100vh-300px)] overflow-auto font-sans text-gray-800 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: highlightedText || 'Your text will appear here...'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
