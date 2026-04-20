import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/messages — List conversations or messages within a conversation
 * Query: conversationId (get messages), or no param (list conversations)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { searchParams } = request.nextUrl;
  const conversationId = searchParams.get("conversationId");

  if (conversationId) {
    // Get messages for a conversation
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { data: messages, error, count } = await supabase
      .from("messages")
      .select(
        `
        id, content, message_type, metadata, is_read, is_edited, is_deleted,
        sender_user_id, sender_company_id, sender_name, sender_role,
        created_at,
        message_attachments ( id, file_name, file_url, file_type, file_size_bytes, thumbnail_url )
      `,
        { count: "exact" }
      )
      .eq("conversation_id", conversationId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark messages as read
    const { data: membership } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", profile.id)
      .limit(1)
      .single();

    if (membership) {
      await supabase.rpc("mark_messages_read", {
        p_conversation_id: conversationId,
        p_reader_company_id: membership.company_id,
      });
    }

    return NextResponse.json({ messages: messages || [], total: count || 0 });
  }

  // List conversations
  const { data: companies } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", profile.id);

  const companyIds = (companies || []).map((c) => c.company_id);

  if (companyIds.length === 0) {
    return NextResponse.json({ conversations: [], total: 0 });
  }

  const { data: conversations, error, count } = await supabase
    .from("conversations")
    .select(
      `
      id, context_type, context_title, last_message_text, last_message_at,
      buyer_unread_count, supplier_unread_count, is_active, created_at,
      buyer_company_id, supplier_company_id,
      buyer:companies!conversations_buyer_company_id_fkey ( id, name, country_code, logo_url ),
      supplier:companies!conversations_supplier_company_id_fkey ( id, name, country_code, logo_url )
    `,
      { count: "exact" }
    )
    .or(`buyer_company_id.in.(${companyIds.join(",")}),supplier_company_id.in.(${companyIds.join(",")})`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add "myRole" and "unreadCount" for the current user
  const enriched = (conversations || []).map((c) => {
    const isBuyer = companyIds.includes(c.buyer_company_id);
    return {
      ...c,
      myRole: isBuyer ? "buyer" : "supplier",
      unreadCount: isBuyer ? c.buyer_unread_count : c.supplier_unread_count,
      otherParty: isBuyer ? c.supplier : c.buyer,
    };
  });

  return NextResponse.json({ conversations: enriched, total: count || 0 });
}

/**
 * POST /api/messages — Send a message or start a new conversation
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await request.json();
  const {
    conversationId,
    content,
    messageType = "text",
    metadata,
    // For new conversation
    supplierCompanyId,
    buyerCompanyId,
    contextType,
    contextId,
    contextTitle,
  } = body;

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "You must belong to a company" }, { status: 400 });
  }

  let convId = conversationId;

  // Create new conversation if needed
  if (!convId) {
    if (!supplierCompanyId && !buyerCompanyId) {
      return NextResponse.json(
        { error: "conversationId or supplierCompanyId/buyerCompanyId required" },
        { status: 400 }
      );
    }

    // Determine roles
    const isBuyerSide = membership.role?.startsWith("buyer");
    const bCompanyId = isBuyerSide ? membership.company_id : (buyerCompanyId || membership.company_id);
    const sCompanyId = isBuyerSide ? (supplierCompanyId || membership.company_id) : membership.company_id;

    // Check if conversation already exists for this context
    let existing;
    if (contextType && contextId) {
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_company_id", bCompanyId)
        .eq("supplier_company_id", sCompanyId)
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .single();
      existing = data;
    }

    if (existing) {
      convId = existing.id;
    } else {
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({
          buyer_company_id: bCompanyId,
          supplier_company_id: sCompanyId,
          context_type: contextType || "general",
          context_id: contextId || null,
          context_title: contextTitle || null,
        })
        .select("id")
        .single();

      if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });
      convId = conv.id;
    }
  }

  // Determine sender role
  const { data: conv } = await supabase
    .from("conversations")
    .select("buyer_company_id, supplier_company_id")
    .eq("id", convId)
    .single();

  const senderRole = conv && membership.company_id === conv.buyer_company_id ? "buyer" : "supplier";

  // Send message
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: convId,
      sender_user_id: profile.id,
      sender_company_id: membership.company_id,
      sender_name: profile.full_name,
      sender_role: senderRole,
      content,
      message_type: messageType,
      metadata: metadata || {},
    })
    .select("id, content, message_type, sender_name, sender_role, created_at")
    .single();

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    conversationId: convId,
    message,
  });
}
