import React from 'react';
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  Hash,
  User,
  DollarSign,
  Calendar,
  RefreshCw,
} from 'lucide-react';

/**
 * SlipOCRResult
 *
 * Displays the AI-extracted fields from a bank payment slip image.
 * Shows a progress bar while OCR is running, then the structured result.
 * Allows the user to trigger re-analysis with a refresh button.
 *
 * @param {object} ocrData        - Parsed OCR result from slipAnalyzer.js
 * @param {function} onReanalyze  - Callback to re-run OCR on the same image
 * @param {boolean} isAnalyzing   - Whether OCR is currently running
 * @param {number} analyzeProgress - Progress percentage (0-100)
 */
export default function SlipOCRResult({
  ocrData,
  onReanalyze,
  isAnalyzing,
  analyzeProgress,
}) {
  // ── Loading state ───────────────────────────────────────────────────────
  if (isAnalyzing) {
    return (
      <div className="ocr-analyzing-box">
        <Brain size={24} className="ocr-brain-icon spinning" />
        <div className="ocr-progress-wrap">
          <p className="ocr-analyzing-label">
            AI Reading Slip... {analyzeProgress}%
          </p>
          <div className="ocr-progress-bar">
            <div
              className="ocr-progress-fill"
              style={{ width: `${analyzeProgress}%` }}
            />
          </div>
          <small style={{ color: 'var(--palette-slate-gray)', fontSize: '0.75rem', marginTop: '6px', display: 'block' }}>
            This analysis may take up to a minute to verify. Please hold on...
          </small>
        </div>
      </div>
    );
  }

  // Hide the extracted data entirely once done
  return null;
}

