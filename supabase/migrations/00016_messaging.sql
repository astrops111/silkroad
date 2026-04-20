-- ============================================================
-- 00016_messaging.sql — Real-time buyer-supplier messaging
-- Uses Supabase Realtime for live updates
-- ============================================================

-- Conversation between two parties (buyer <-> supplier)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants
  buyer_company_id UUID NOT NULL REFERENCES companies(id),
  supplier_company_id UUID NOT NULL REFERENCES companies(id),

  -- Context (what started the conversation)
  context_type TEXT CHECK (context_type IN ('product_inquiry', 'rfq', 'order', 'general')),
  context_id UUID,           -- product_id, rfq_id, or order_id
  context_title TEXT,        -- "Re: Industrial Solar Panels" or "RFQ-20260417-ABCD"

  -- Last message preview (denormalized for list view)
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_by UUID REFERENCES user_profiles(id),

  -- Unread counts (denormalized, updated by trigger)
  buyer_unread_count INT DEFAULT 0,
  supplier_unread_count INT DEFAULT 0,

  -- Status
  is_archived_buyer BOOLEAN DEFAULT false,
  is_archived_supplier BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One conversation per buyer-supplier-context combo
  UNIQUE(buyer_company_id, supplier_company_id, context_type, context_id)
);

CREATE INDEX idx_conversations_buyer ON conversations(buyer_company_id, last_message_at DESC);
CREATE INDEX idx_conversations_supplier ON conversations(supplier_company_id, last_message_at DESC);
CREATE INDEX idx_conversations_context ON conversations(context_type, context_id);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC);

-- Messages within a conversation
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Sender
  sender_user_id UUID NOT NULL REFERENCES user_profiles(id),
  sender_company_id UUID REFERENCES companies(id),
  sender_name TEXT,
  sender_role TEXT,          -- 'buyer' or 'supplier'

  -- Content
  content TEXT,              -- message text (can be null if attachment-only)
  message_type TEXT DEFAULT 'text' CHECK (message_type IN (
    'text', 'image', 'file', 'quotation', 'order_update', 'system'
  )),

  -- Rich content (for quotation shares, order updates, etc.)
  metadata JSONB DEFAULT '{}',
  -- For quotation: { quotation_id, total_amount, currency }
  -- For order_update: { order_id, status, order_number }
  -- For system: { action, details }

  -- Read tracking
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Edit/delete
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_user_id);
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = false;

-- Message attachments (images, PDFs, specs)
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,            -- image/png, application/pdf, etc.
  file_size_bytes INT,
  thumbnail_url TEXT,        -- for images

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);

-- ============================================================
-- Trigger: update conversation preview + unread count on new message
-- ============================================================
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
BEGIN
  -- Get conversation to determine which side sent
  SELECT buyer_company_id, supplier_company_id
  INTO conv
  FROM conversations WHERE id = NEW.conversation_id;

  -- Update last message preview
  UPDATE conversations SET
    last_message_text = LEFT(NEW.content, 200),
    last_message_at = NEW.created_at,
    last_message_by = NEW.sender_user_id,
    updated_at = NEW.created_at,
    -- Increment unread for the OTHER side
    buyer_unread_count = CASE
      WHEN NEW.sender_company_id = conv.supplier_company_id
      THEN buyer_unread_count + 1
      ELSE buyer_unread_count
    END,
    supplier_unread_count = CASE
      WHEN NEW.sender_company_id = conv.buyer_company_id
      THEN supplier_unread_count + 1
      ELSE supplier_unread_count
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_inserted
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================
-- Function: mark messages as read (called from API)
-- ============================================================
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_conversation_id UUID,
  p_reader_company_id UUID
)
RETURNS void AS $$
DECLARE
  conv RECORD;
BEGIN
  SELECT buyer_company_id, supplier_company_id
  INTO conv
  FROM conversations WHERE id = p_conversation_id;

  -- Mark unread messages from the OTHER side as read
  UPDATE messages SET
    is_read = true,
    read_at = now()
  WHERE conversation_id = p_conversation_id
    AND is_read = false
    AND sender_company_id != p_reader_company_id;

  -- Reset unread count for the reader's side
  IF p_reader_company_id = conv.buyer_company_id THEN
    UPDATE conversations SET buyer_unread_count = 0 WHERE id = p_conversation_id;
  ELSIF p_reader_company_id = conv.supplier_company_id THEN
    UPDATE conversations SET supplier_unread_count = 0 WHERE id = p_conversation_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Conversations: participants can see their own
CREATE POLICY "Participants see own conversations" ON conversations
  FOR SELECT USING (
    buyer_company_id IN (SELECT unnest(get_user_companies()))
    OR supplier_company_id IN (SELECT unnest(get_user_companies()))
    OR is_admin()
  );

CREATE POLICY "Participants manage own conversations" ON conversations
  FOR ALL USING (
    buyer_company_id IN (SELECT unnest(get_user_companies()))
    OR supplier_company_id IN (SELECT unnest(get_user_companies()))
    OR is_admin()
  );

-- Messages: conversation participants can read/write
CREATE POLICY "Participants access messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE
        buyer_company_id IN (SELECT unnest(get_user_companies()))
        OR supplier_company_id IN (SELECT unnest(get_user_companies()))
    )
    OR is_admin()
  );

-- Attachments follow message access
CREATE POLICY "Message attachment access" ON message_attachments
  FOR ALL USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.buyer_company_id IN (SELECT unnest(get_user_companies()))
        OR c.supplier_company_id IN (SELECT unnest(get_user_companies()))
    )
    OR is_admin()
  );

-- ============================================================
-- Enable Realtime on messages table
-- This allows clients to subscribe to new messages via Supabase Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
