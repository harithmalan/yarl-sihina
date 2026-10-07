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
        </div>
      </div>
    );
  }

  if (!ocrData) return null;

  // ── Confidence colour coding ────────────────────────────────────────────
  const conf = ocrData.confidence ?? 0;
  const confidenceColor =
    conf >= 0.8 ? '#22c55e' : conf >= 0.5 ? '#f59e0b' : '#ef4444';
  const confidenceLabel =
    conf >= 0.8 ? 'High' : conf >= 0.5 ? 'Medium' : 'Low';

  return (
    <div className="ocr-result-box">
      {/* Header row: title + confidence badge + re-analyse button */}
      <div className="ocr-result-header">
        <Brain size={16} className="text-caramel" />
        <span>AI Extracted from Slip</span>
        <div
          className="ocr-confidence-badge"
          style={{ borderColor: confidenceColor, color: confidenceColor }}
        >
          Confidence: {confidenceLabel} ({Math.round(conf * 100)}%)
        </div>
        <button
          type="button"
          className="ocr-reanalyze-btn"
          onClick={onReanalyze}
          title="Re-analyse slip"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Extracted fields */}
      <div className="ocr-fields-grid">
        {/* Reference number — always show (even if null) */}
        <div className="ocr-field-item">
          <Hash size={14} className="ocr-field-icon" />
          <div>
            <label>Reference Number</label>
            <strong>
              {ocrData.ref_number ?? (
                <em style={{ color: '#8A9BA8', fontStyle: 'italic' }}>
                  Not detected
                </em>
              )}
            </strong>
          </div>
          {ocrData.ref_number && (
            <CheckCircle2 size={14} className="text-success" />
          )}
        </div>

        {/* Beneficiary name */}
        {ocrData.beneficiary_name && (
          <div className="ocr-field-item">
            <User size={14} className="ocr-field-icon" />
            <div>
              <label>Beneficiary Name</label>
              <strong>{ocrData.beneficiary_name}</strong>
            </div>
            <CheckCircle2 size={14} className="text-success" />
          </div>
        )}

        {/* Amount */}
        {ocrData.amount && (
          <div className="ocr-field-item">
            <DollarSign size={14} className="ocr-field-icon" />
            <div>
              <label>Amount on Slip</label>
              <strong>LKR {ocrData.amount}</strong>
            </div>
          </div>
        )}

        {/* Transaction date */}
        {ocrData.date && (
          <div className="ocr-field-item">
            <Calendar size={14} className="ocr-field-icon" />
            <div>
              <label>Transaction Date</label>
              <strong>{ocrData.date}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Alternative reference candidates (if multiple found) */}
      {ocrData.all_refs?.length > 1 && (
        <div className="ocr-alt-refs">
          <span>Other candidates: </span>
          {ocrData.all_refs.slice(1, 4).map((r) => (
            <code key={r} className="ocr-ref-chip">
              {r}
            </code>
          ))}
        </div>
      )}

      {/* Warning when ref could not be read */}
      {!ocrData.ref_number && (
        <div className="ocr-warning-note">
          <AlertCircle size={14} />
          <span>
            Could not auto-read reference number. Please enter it manually
            below.
          </span>
        </div>
      )}
    </div>
  );
}

