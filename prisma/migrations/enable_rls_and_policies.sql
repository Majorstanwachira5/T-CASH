-- ====================================================================
-- T CPI MASTER SECURITY HARDENING: ROW LEVEL SECURITY & POLICY SUITE
-- ====================================================================

-- 1. ENABLE AND FORCE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" FORCE ROW LEVEL SECURITY;

ALTER TABLE "CommentReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommentReport" FORCE ROW LEVEL SECURITY;

ALTER TABLE "GameConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameConfig" FORCE ROW LEVEL SECURITY;

ALTER TABLE "GameEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameEntry" FORCE ROW LEVEL SECURITY;

ALTER TABLE "GameResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameResult" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PaymentTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentTransaction" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PaymentWebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentWebhookEvent" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PrizeClaim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrizeClaim" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" FORCE ROW LEVEL SECURITY;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WalletAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalletAccount" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WalletLedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalletLedgerEntry" FORCE ROW LEVEL SECURITY;

-- 2. REVOKE ALL PRIVILEGES ON SENSITIVE TABLES FROM PUBLIC / ANON / AUTHENTICATED
REVOKE ALL ON "User" FROM anon, authenticated, public;
REVOKE ALL ON "Session" FROM anon, authenticated, public;
REVOKE ALL ON "WalletAccount" FROM anon, authenticated, public;
REVOKE ALL ON "WalletLedgerEntry" FROM anon, authenticated, public;
REVOKE ALL ON "PaymentTransaction" FROM anon, authenticated, public;
REVOKE ALL ON "PaymentWebhookEvent" FROM anon, authenticated, public;
REVOKE ALL ON "PrizeClaim" FROM anon, authenticated, public;
REVOKE ALL ON "GameResult" FROM anon, authenticated, public;
REVOKE ALL ON "AdminAuditLog" FROM anon, authenticated, public;
REVOKE ALL ON "CommentReport" FROM anon, authenticated, public;
REVOKE ALL ON "Notification" FROM anon, authenticated, public;

-- Revoke mutation privileges from anon/authenticated on public-facing tables
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "GameConfig", "GameEntry", "Comment" FROM anon, authenticated, public;

-- 3. GRANT SERVICE_ROLE & POSTGRES FULL ACCESS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- 4. POLICIES FOR POSTGRES & SERVICE ROLE (FULL ACCESS)
DROP POLICY IF EXISTS "service_role_all_AdminAuditLog" ON "AdminAuditLog";
CREATE POLICY "service_role_all_AdminAuditLog" ON "AdminAuditLog" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_Comment" ON "Comment";
CREATE POLICY "service_role_all_Comment" ON "Comment" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_CommentReport" ON "CommentReport";
CREATE POLICY "service_role_all_CommentReport" ON "CommentReport" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_GameConfig" ON "GameConfig";
CREATE POLICY "service_role_all_GameConfig" ON "GameConfig" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_GameEntry" ON "GameEntry";
CREATE POLICY "service_role_all_GameEntry" ON "GameEntry" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_GameResult" ON "GameResult";
CREATE POLICY "service_role_all_GameResult" ON "GameResult" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_Notification" ON "Notification";
CREATE POLICY "service_role_all_Notification" ON "Notification" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_PaymentTransaction" ON "PaymentTransaction";
CREATE POLICY "service_role_all_PaymentTransaction" ON "PaymentTransaction" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_PaymentWebhookEvent" ON "PaymentWebhookEvent";
CREATE POLICY "service_role_all_PaymentWebhookEvent" ON "PaymentWebhookEvent" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_PrizeClaim" ON "PrizeClaim";
CREATE POLICY "service_role_all_PrizeClaim" ON "PrizeClaim" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_Session" ON "Session";
CREATE POLICY "service_role_all_Session" ON "Session" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_User" ON "User";
CREATE POLICY "service_role_all_User" ON "User" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_WalletAccount" ON "WalletAccount";
CREATE POLICY "service_role_all_WalletAccount" ON "WalletAccount" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_WalletLedgerEntry" ON "WalletLedgerEntry";
CREATE POLICY "service_role_all_WalletLedgerEntry" ON "WalletLedgerEntry" FOR ALL TO postgres, service_role USING (true) WITH CHECK (true);

-- 5. READ-ONLY POLICIES FOR PUBLIC CONSUMERS (ANON & AUTHENTICATED)
GRANT SELECT ON "GameConfig" TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_published_game_configs" ON "GameConfig";
CREATE POLICY "public_read_published_game_configs" ON "GameConfig"
  FOR SELECT TO anon, authenticated
  USING ("isPublished" = true);

GRANT SELECT ON "Comment" TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_active_comments" ON "Comment";
CREATE POLICY "public_read_active_comments" ON "Comment"
  FOR SELECT TO anon, authenticated
  USING ("status" = 'ACTIVE');

GRANT SELECT ON "GameEntry" TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_shared_game_entries" ON "GameEntry";
CREATE POLICY "public_read_shared_game_entries" ON "GameEntry"
  FOR SELECT TO anon, authenticated
  USING ("isPubliclyShared" = true AND "status" IN ('REVEALED', 'SETTLED'));
