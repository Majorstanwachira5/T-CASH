-- PostgreSQL CHECK constraints for financial and game integrity invariants
DO $$
BEGIN
  -- 1. WalletAccount balance cannot become negative
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_wallet_balance_non_negative') THEN
    ALTER TABLE "WalletAccount" ADD CONSTRAINT check_wallet_balance_non_negative CHECK ("balanceCents" >= 0);
  END IF;

  -- 2. PaymentTransaction amount must be strictly positive
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_payment_amount_positive') THEN
    ALTER TABLE "PaymentTransaction" ADD CONSTRAINT check_payment_amount_positive CHECK ("amountCents" > 0);
  END IF;

  -- 3. WalletLedgerEntry invariants
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_ledger_amount_non_negative') THEN
    ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT check_ledger_amount_non_negative CHECK ("amountCents" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_ledger_balance_before_non_negative') THEN
    ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT check_ledger_balance_before_non_negative CHECK ("balanceBeforeCents" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_ledger_balance_after_non_negative') THEN
    ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT check_ledger_balance_after_non_negative CHECK ("balanceAfterCents" >= 0);
  END IF;

  -- 4. PrizeClaim amount must be positive
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_prize_amount_positive') THEN
    ALTER TABLE "PrizeClaim" ADD CONSTRAINT check_prize_amount_positive CHECK ("amountCents" > 0);
  END IF;

  -- 5. GameConfig pricing sanity checks
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_game_entry_price_non_negative') THEN
    ALTER TABLE "GameConfig" ADD CONSTRAINT check_game_entry_price_non_negative CHECK ("entryPriceCents" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_game_repeat_credit_non_negative') THEN
    ALTER TABLE "GameConfig" ADD CONSTRAINT check_game_repeat_credit_non_negative CHECK ("repeatCreditCents" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_game_prize_amount_non_negative') THEN
    ALTER TABLE "GameConfig" ADD CONSTRAINT check_game_prize_amount_non_negative CHECK ("prizeAmountCents" >= 0);
  END IF;
END $$;
