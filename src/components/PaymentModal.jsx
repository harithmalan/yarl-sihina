import React, { useState, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  UploadCloud,
  AlertCircle,
  Brain,
  XCircle,
} from 'lucide-react';
import { orderService } from '../lib/orderService';
import { analyzeSlipImage } from '../lib/slipAnalyzer';
import { analyzeSlipViaAPI, checkDuplicateRef } from '../lib/slipDuplicateService';
import SlipOCRResult from './SlipOCRResult';

/**
 * PaymentModal
 *
 * Handles bank slip upload with integrated AI OCR analysis:
 *  1. User uploads a slip image
 *  2. Image is automatically sent to the FastAPI OCR service (falls back to
 *     browser Tesseract.js if the service is unavailable)
 *  3. Extracted fields are shown for user review and confirmation
 *  4. Duplicate reference numbers are detected and submission is blocked
 *  5. On confirmation the order is created with OCR metadata saved
 */
export default function PaymentModal({ isOpen, onClose, orderData, onOrderCompleted }) {
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [bankName, setBankName] = useState('Commercial Bank');
  const [slipReference, setSlipReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // OCR state
  const [ocrData, setOcrData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [duplicateError, setDuplicateError] = useState(null);
  const [ocrConfirmed, setOcrConfirmed] = useState(false);

  // ── Run OCR analysis on the uploaded slip image ──────────────────────────
  // IMPORTANT: useCallback must be declared BEFORE any early returns (Rules of Hooks)
  const runAnalysis = useCallback(async (file, previewUrl) => {
    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    setDuplicateError(null);
    setOcrData(null);
    setOcrConfirmed(false);
    setUploadError('');

    let result = null;

    // Try FastAPI backend first (server-side pytesseract — more accurate)
    result = await analyzeSlipViaAPI(file, setAnalyzeProgress);

    // Fallback: browser Tesseract.js
    if (!result?.ocr) {
      try {
        const parsed = await analyzeSlipImage(previewUrl, setAnalyzeProgress);
        result = { ocr: parsed, duplicate: { is_duplicate: false } };

        // Run a separate duplicate check via Supabase / FastAPI
        if (parsed?.all_refs?.length > 0) {
          const dupCheck = await checkDuplicateRef(parsed.all_refs);
          result.duplicate = {
            is_duplicate: dupCheck.isDuplicate,
            existing_order_id: dupCheck.existingOrderId,
            existing_customer: dupCheck.existingCustomer,
            matched_ref: dupCheck.matchedRef,
          };
        }
      } catch (err) {
        console.warn('[PaymentModal] Browser OCR failed:', err);
        result = null;
      }
    }

    setIsAnalyzing(false);

    if (!result) {
      setUploadError('Could not analyse slip automatically. Please enter your reference number manually.');
      return;
    }

    setOcrData(result.ocr);

    // Auto-fill reference field when we have a confident match
    if (result.ocr?.ref_number && result.ocr.confidence >= 0.5) {
      setSlipReference(result.ocr.ref_number);
    }

    // Surface duplicate error immediately
    if (result.duplicate?.is_duplicate) {
      setDuplicateError({
        orderId: result.duplicate.existing_order_id,
        customer: result.duplicate.existing_customer,
        ref: result.duplicate.matched_ref,
      });
    }
  }, []);

  if (!isOpen || !orderData) return null;
  const { ref, customer, math, cartItems } = orderData;

  // ── File selection handler ───────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowed.includes(file.type)) {
      setUploadError('Please select a valid image file (JPG, PNG, WEBP, or HEIC).');
      return;
    }

    setUploadError('');
    setSlipFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const previewUrl = reader.result;
      setSlipPreview(previewUrl);
      runAnalysis(file, previewUrl);
    };
    reader.readAsDataURL(file);
  };

  // ── Form submission ──────────────────────────────────────────────────────
  const handleSubmitSlip = async (e) => {
    e.preventDefault();

    if (!slipPreview && !slipFile) {
      setUploadError('Please upload an image of your bank deposit or transfer slip.');
      return;
    }

    // Block if a duplicate was already detected
    if (duplicateError) {
      setUploadError(
        `This slip has already been submitted for Order #${duplicateError.orderId}. Duplicate slips are not accepted.`
      );
      return;
    }



    try {
      setIsSubmitting(true);
      setUploadError('');

      const finalRef =
        slipReference ||
        ocrData?.ref_number ||
        'REF-' + Date.now().toString().slice(-6);

      // Final duplicate guard — catches manually-typed refs not caught by OCR
      if (finalRef && !finalRef.startsWith('REF-')) {
        const finalDupCheck = await checkDuplicateRef([finalRef]);
        if (finalDupCheck.isDuplicate) {
          setDuplicateError({
            orderId: finalDupCheck.existingOrderId,
            customer: finalDupCheck.existingCustomer,
            ref: finalRef,
          });
          setUploadError(
            `Reference ${finalRef} is already linked to Order #${finalDupCheck.existingOrderId}.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      const orderPayload = {
        id: ref || 'YS-' + Math.floor(1000 + Math.random() * 9000),
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || '',
        customer_address: customer.address,
        customer_city: customer.city || 'Sri Lanka',
        notes: customer.notes || '',
        items: cartItems.map((item) => ({
          id: item.id,
          title: item.name || item.title,
          size: item.selectedSize || item.size,
          hisSize: item.hisSize || null,
          herSize: item.herSize || null,
          quantity: item.qty,
          price: item.price,
          image: item.image,
        })),
        total_amount: math.grandTotal,
        advance_required: math.requiredAdvance,
        balance_cod: math.remainingBalance,
        delivery_fee: math.deliveryFee,
        slip_url: slipPreview,
        slip_reference: finalRef,
        bank_name: bankName,
        deposit_date:
          ocrData?.date || new Date().toISOString().split('T')[0],
        // AI OCR metadata
        ocr_ref_number: ocrData?.ref_number || null,
        ocr_beneficiary_name: ocrData?.beneficiary_name || null,
        ocr_confidence: ocrData?.confidence || null,
        ocr_raw_text: ocrData?.raw_text || null,
      };

      const created = await orderService.createOrder(orderPayload, slipFile);
      setSubmittedOrder(created);
      if (onOrderCompleted) onOrderCompleted(created);
    } catch (err) {
      setUploadError('Failed to submit slip: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendToWhatsApp = () => {
    let msg = `*🎨 YARL SIHINA ORDER CONFIRMATION*%0A`;
    msg += `*Order Ref:* #${ref}%0A`;
    msg += `*Customer:* ${customer.name} (${customer.phone})%0A`;
    msg += `*Total:* LKR ${math.grandTotal.toLocaleString()}%0A`;
    msg += `*Advance Required:* LKR ${math.requiredAdvance.toLocaleString()}%0A`;
    msg += `Hello! I have placed order #${ref} on Yarl Sihina and am transferring the advance.`;
    window.open(`https://wa.me/94712599185?text=${msg}`, '_blank');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="payment-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="payment-modal-container slip-upload-modal-size"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-icon" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {!submittedOrder ? (
          <>
            {/* ── Modal Header ── */}
            <div className="modal-header-section">
              <div className="modal-icon-badge">
                <ShieldCheck size={28} />
              </div>
              <span className="modal-kicker">Order #{ref} · Advance Confirmation</span>
              <h2 className="modal-order-number">Upload Bank Payment Slip</h2>
              <p className="modal-subtitle-text">
                Transfer the advance of{' '}
                <strong>LKR {math.requiredAdvance.toLocaleString()}</strong> to
                reserve your Ceylon pieces.
              </p>
            </div>

            {/* ── Bank Accounts ── */}
            <div className="modal-bank-info-box">
              <span className="bank-info-label">Official Yarl Sihina Accounts:</span>
              <div className="bank-accounts-grid">
                <div className="bank-account-item">
                  <strong>Commercial Bank</strong>
                  <div className="acc-number">8820019283</div>
                  <small>Yarl Sihina Apparel · Jaffna Branch</small>
                </div>
                <div className="bank-account-item">
                  <strong>Bank of Ceylon (BOC)</strong>
                  <div className="acc-number">7710048291</div>
                  <small>Yarl Sihina Apparel · Nallur Branch</small>
                </div>
              </div>
            </div>

            {/* ── Duplicate Slip Error Banner ── */}
            {duplicateError && (
              <div className="slip-duplicate-banner">
                <XCircle size={20} />
                <div>
                  <strong>Duplicate Slip Detected!</strong>
                  <p>
                    This slip (Ref:{' '}
                    <code>{duplicateError.ref}</code>) was already submitted
                    for Order{' '}
                    <strong>#{duplicateError.orderId}</strong>
                    {duplicateError.customer
                      ? ` by ${duplicateError.customer}`
                      : ''}
                    . Please upload a different slip.
                  </p>
                </div>
              </div>
            )}

            {/* ── General Error Banner ── */}
            {uploadError && !duplicateError && (
              <div className="auth-error-banner" style={{ margin: '12px 0' }}>
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            {/* ── Slip Upload Form ── */}
            <form onSubmit={handleSubmitSlip} className="slip-upload-form">
              {/* Drop zone */}
              <div className="slip-dropzone-wrapper">
                <label className="slip-dropzone-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="slip-file-input"
                  />
                  {slipPreview ? (
                    <div className="slip-preview-container">
                      <img
                        src={slipPreview}
                        alt="Slip Preview"
                        className="slip-thumbnail"
                      />
                      <div className="slip-preview-overlay">
                        <span>Click to Change Slip</span>
                      </div>
                    </div>
                  ) : (
                    <div className="slip-placeholder-box">
                      <UploadCloud size={32} className="text-caramel" />
                      <strong>Tap or Click to Upload Payment Slip</strong>
                      <small>
                        Upload receipt from Commercial Bank, BOC, Frimi, or
                        online banking (JPG, PNG)
                      </small>
                      <small className="ocr-hint">
                        <Brain size={12} /> AI will auto-read your slip details
                      </small>
                    </div>
                  )}
                </label>
              </div>



              {/* AI OCR Result Panel (Only shows while analyzing) */}
              {isAnalyzing && (
                <SlipOCRResult
                  ocrData={ocrData}
                  isAnalyzing={isAnalyzing}
                  analyzeProgress={analyzeProgress}
                  onReanalyze={() =>
                    slipFile && runAnalysis(slipFile, slipPreview)
                  }
                />
              )}

              {/* Bank & Reference Row */}
              <div className="slip-meta-inputs-grid">
                <div className="slip-input-group">
                  <label>Deposit Bank</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="slip-form-select"
                  >
                    <option value="Commercial Bank">Commercial Bank</option>
                    <option value="Bank of Ceylon (BOC)">Bank of Ceylon (BOC)</option>
                    <option value="Hatton National Bank (HNB)">
                      Hatton National Bank
                    </option>
                    <option value="Frimi / Digital Bank">Frimi / Online App</option>
                  </select>
                </div>

                <div className="slip-input-group">
                  <label>
                    Transfer Reference / Slip No.{' '}
                    {ocrData?.ref_number && (
                      <span className="auto-filled-tag">AI Filled</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. COMM-88910"
                    value={slipReference}
                    onChange={(e) => {
                      setSlipReference(e.target.value);
                      setOcrConfirmed(false);
                      setDuplicateError(null);
                    }}
                    className={`slip-form-input ${
                      ocrData?.ref_number ? 'ocr-auto-filled' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Submit buttons */}
              <div className="modal-action-buttons">
                <button
                  type="submit"
                  className="btn-modal-submit-slip"
                  disabled={isSubmitting || !!duplicateError || isAnalyzing}
                >
                  <CheckCircle2 size={18} />
                  <span>
                    {isSubmitting
                      ? 'Uploading Slip...'
                      : 'Submit Slip for Admin Approval'}
                  </span>
                </button>

                <button
                  type="button"
                  className="btn-modal-whatsapp"
                  onClick={sendToWhatsApp}
                >
                  <MessageCircle size={18} />
                  <span>Send via WhatsApp Instead</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ── Order Submitted Confirmation Screen ── */
          <div className="slip-submitted-success">
            <div className="modal-icon-badge success-glow">
              <CheckCircle2 size={40} className="text-success" />
            </div>
            <h2 className="success-title">Payment Slip Received!</h2>
            <p className="success-order-id">
              Order Ref: <strong>#{submittedOrder.id}</strong>
            </p>
            <p className="success-desc">
              Your slip has been sent directly to the{' '}
              <strong>YARL SIHINA Admin Team</strong>. Once verified (usually
              within 15–30 minutes), your pieces will be tailored and
              dispatched.
            </p>

            <div className="success-action-box">
              <button
                className="btn-modal-submit-slip"
                onClick={() => {
                  const msg = `Hello YARL SIHINA! 🎨%0AMy order *#${submittedOrder.id}* slip has been uploaded. Please confirm receipt. Thank you!`;
                  window.open(`https://wa.me/94712599185?text=${msg}`, '_blank');
                }}
              >
                <MessageCircle size={16} />
                <span>Send WhatsApp Confirmation</span>
              </button>

              <button className="btn-modal-cancel" onClick={onClose}>
                Done &amp; Return to Store
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
