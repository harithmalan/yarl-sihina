"""
duplicate_checker.py
Checks for duplicate payment slip reference numbers in the Supabase orders table.
"""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

_SUPABASE_URL = os.getenv("SUPABASE_URL", "")
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_supabase_client = None


def _get_client():
    """Lazy-initialise Supabase client."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    if not _SUPABASE_URL or not _SUPABASE_KEY:
        return None
    try:
        from supabase import create_client
        _supabase_client = create_client(_SUPABASE_URL, _SUPABASE_KEY)
        return _supabase_client
    except Exception as e:
        print(f"[duplicate_checker] Supabase init failed: {e}")
        return None


def check_duplicate(ref_numbers: list[str]) -> dict:
    """
    Check if any of the given reference numbers already exist in non-cancelled orders.

    Args:
        ref_numbers: List of candidate reference numbers extracted from OCR

    Returns:
        dict with keys:
            is_duplicate (bool)
            existing_order_id (str|None)
            existing_customer (str|None) 
            matched_ref (str|None)
    """
    empty_result = {
        "is_duplicate": False,
        "existing_order_id": None,
        "existing_customer": None,
        "matched_ref": None,
    }

    if not ref_numbers:
        return empty_result

    client = _get_client()
    if client is None:
        print("[duplicate_checker] Supabase not configured — skipping duplicate check")
        return empty_result

    try:
        # Normalise refs for comparison
        normalised = [r.strip().upper() for r in ref_numbers if r and len(r) >= 4]
        if not normalised:
            return empty_result

        response = (
            client.table("orders")
            .select("id, customer_name, slip_reference, status")
            .in_("slip_reference", normalised)
            .not_.in_("status", ["rejected", "cancelled"])
            .limit(1)
            .execute()
        )

        if response.data and len(response.data) > 0:
            match = response.data[0]
            return {
                "is_duplicate": True,
                "existing_order_id": match.get("id"),
                "existing_customer": match.get("customer_name"),
                "matched_ref": match.get("slip_reference"),
            }

        return empty_result

    except Exception as e:
        print(f"[duplicate_checker] Query error: {e}")
        return empty_result
